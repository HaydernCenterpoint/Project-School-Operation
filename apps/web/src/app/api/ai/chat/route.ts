import { isAiMode, type AiStreamEvent } from "@sao-do/contracts";
import {
  apiError,
  databaseError,
  getAcademicContext,
  hasExactKeys,
  isUuid,
  mapAcademicRpcError,
  readJsonObject,
} from "@/lib/academic-api";
import {
  aiConfig,
  ProviderError,
  streamCompletion,
  systemPrompt,
  type ChatTurn,
} from "@/lib/ai-provider";
import { attachmentLimits, attachmentNote, attachmentNoteMarker, toAttachmentBlocks, type AttachmentBlock } from "@/lib/ai-attachments";

/** Recent context sent with each question; long-context models make a wider window cheap. */
const maxHistoryChars = 60_000;
const generationTimeoutMs = 90_000;
/** Multipart bodies carry up to 30 MB of files plus the JSON payload and form overhead. */
const maxMultipartBytes = attachmentLimits.maxUploadBytes + 1024 * 1024;

/**
 * Reads the chat request: plain JSON, or multipart/form-data with a `payload` JSON field and
 * up to `maxFiles` `files` parts (whose filenames carry folder-relative paths).
 */
async function readChatBody(request: Request): Promise<{ value: Record<string, unknown>; files: File[] } | { response: Response }> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    const body = await readJsonObject(request);
    return body.response ? { response: body.response } : { value: body.value, files: [] };
  }
  const declared = Number(request.headers.get("content-length") ?? "NaN");
  if (!Number.isFinite(declared) || declared > maxMultipartBytes) {
    return { response: apiError(413, "payload_too_large", "Attachments are too large.") };
  }
  try {
    const form = await request.formData();
    const payload = form.get("payload");
    const value: unknown = typeof payload === "string" ? JSON.parse(payload) : null;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { response: apiError(400, "invalid_body", "Body fields are invalid.") };
    }
    const files = form.getAll("files").filter((item): item is File => typeof item !== "string");
    return { value: value as Record<string, unknown>, files };
  } catch {
    return { response: apiError(400, "invalid_body", "Body could not be read.") };
  }
}

function toTurns(rows: { role: "user" | "assistant"; content: string }[]) {
  const turns: ChatTurn[] = [];
  let total = 0;
  // Newest first, so the budget keeps the most recent context.
  for (const row of rows) {
    total += row.content.length;
    if (total > maxHistoryChars && turns.length) break;
    // Failed answers leave two user turns adjacent; merge them.
    const oldest = turns[0];
    if (oldest?.role === row.role) oldest.content = `${row.content}\n\n${oldest.content}`;
    else turns.unshift({ role: row.role, content: row.content });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

/** Puts this turn's files before the question in the newest user turn (images/documents first reads best). */
function withAttachments(turns: ChatTurn[], blocks: AttachmentBlock[]): ChatTurn[] {
  const last = turns.at(-1);
  if (!blocks.length || last?.role !== "user" || typeof last.content !== "string") return turns;
  // The saved text ends with the attachment note; the model gets the files themselves instead.
  const note = last.content.lastIndexOf(attachmentNoteMarker);
  const text = note >= 0 ? last.content.slice(0, note) : last.content;
  return [...turns.slice(0, -1), { role: "user", content: [...blocks, { type: "text", text }] }];
}

export async function POST(request: Request) {
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  const { supabase, membership } = auth.context;
  if (membership.role !== "student") {
    return apiError(403, "forbidden", "Student access is required.");
  }

  const config = aiConfig();
  if (!config) return apiError(503, "ai_disabled", "AI is not available.");

  const body = await readChatBody(request);
  if ("response" in body) return body.response;
  if (!hasExactKeys(body.value, ["conversationId", "mode", "content", "assignmentId"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const { conversationId, mode, assignmentId } = body.value;
  const content = typeof body.value.content === "string" ? body.value.content.trim() : "";
  const requestId = request.headers.get("idempotency-key");
  if (
    !(conversationId === null || isUuid(conversationId)) ||
    !(assignmentId === null || isUuid(assignmentId)) ||
    !isAiMode(mode) ||
    !isUuid(requestId) ||
    content.length < 1 ||
    content.length > 8_000
  ) {
    return apiError(400, "invalid_body", "Chat request is invalid.");
  }

  // Files are read for this request only; the saved message lists their names.
  let attached: { blocks: AttachmentBlock[]; names: string[] } = { blocks: [], names: [] };
  if (body.files.length) {
    const converted = await toAttachmentBlocks(body.files);
    if ("error" in converted) {
      const status = converted.error.code === "unsupported_file" ? 415 : 413;
      return apiError(status, converted.error.code, converted.error.file ? `File rejected: ${converted.error.file}` : "Attachments rejected.");
    }
    attached = converted;
  }
  const saved = content + attachmentNote(attached.names, 8_000 - content.length);

  // RLS decides whether this student may read the attached assignment.
  let source: { title: string; instructions: string } | undefined;
  if (assignmentId) {
    const { data, error } = await supabase
      .from("assignments")
      .select("title,instructions")
      .eq("id", assignmentId)
      .eq("status", "published")
      .maybeSingle();
    if (error) return databaseError();
    if (!data) return apiError(404, "not_found", "Resource not found.");
    source = data;
  }

  const conversation = conversationId ?? crypto.randomUUID();
  const reserved = await supabase.rpc("ai_reserve", {
    p_request_id: requestId,
    p_conversation_id: conversation,
    p_title: content.replace(/\s+/g, " ").slice(0, 60),
    p_mode: mode,
    p_content: saved,
  });
  if (reserved.error) {
    const detail = `${reserved.error.message ?? ""}`;
    if (detail.includes("ai_busy")) {
      return apiError(409, "ai_busy", "Another answer is still being generated.");
    }
    if (detail.includes("ai_quota_exceeded")) {
      return apiError(429, "ai_quota_exceeded", "Daily AI allowance is used up.");
    }
    return mapAcademicRpcError(reserved.error);
  }
  if (reserved.data === "duplicate") {
    return apiError(409, "duplicate_request", "This request was already processed.");
  }

  const history = await supabase
    .from("ai_messages")
    .select("role,content")
    .eq("conversation_id", conversation)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    // A question and its answer share a timestamp; enum order is user < assistant.
    .order("role", { ascending: false })
    .limit(30);
  if (history.error) {
    await supabase.rpc("ai_finish", {
      p_request_id: requestId, p_content: "", p_status: "failed",
      p_input_tokens: 0, p_output_tokens: 0,
    });
    return databaseError();
  }

  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(generationTimeoutMs),
  ]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AiStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The browser went away; generation is aborted through `signal`.
        }
      };
      send({ type: "start", conversationId: conversation, requestId });

      let text = "";
      let status: "complete" | "interrupted" | "failed" = "complete";
      let usage = { inputTokens: 0, outputTokens: 0 };
      let errorCode = "";
      try {
        usage = await streamCompletion(
          config,
          systemPrompt(mode, source, attached.names.length > 0),
          withAttachments(toTurns(history.data), attached.blocks),
          (delta) => {
            text += delta;
            send({ type: "delta", text: delta });
          },
          signal,
        );
      } catch (error) {
        status = signal.aborted ? "interrupted" : "failed";
        errorCode =
          error instanceof ProviderError
            ? error.code
            : request.signal.aborted
              ? "cancelled"
              : signal.aborted
                ? "timeout"
                : "provider_error";
      }

      await supabase.rpc("ai_finish", {
        p_request_id: requestId,
        p_content: text,
        p_status: status,
        p_input_tokens: usage.inputTokens,
        p_output_tokens: usage.outputTokens,
      });
      send(status === "complete" ? { type: "complete" } : { type: "error", code: errorCode });
      try {
        controller.close();
      } catch {
        // Already closed by a disconnect.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
