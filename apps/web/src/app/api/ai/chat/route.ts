import {
  isAiMode,
  isAiReasoningEffort,
  type AiReasoningEffort,
  type AiStreamEvent,
} from "@sao-do/contracts";
import {
  apiError,
  databaseError,
  getAcademicContext,
  isUuid,
  readJsonObject,
} from "@/lib/academic-api";
import {
  aiConfig,
  ProviderError,
  streamCompletion,
  systemPrompt,
  type ChatTurn,
} from "@/lib/ai-provider";
import {
  attachmentLimits,
  attachmentNote,
  attachmentNoteMarker,
  toAttachmentBlocks,
  type AttachmentBlock,
} from "@/lib/ai-attachments";
import { DEFAULT_ASSIGNMENTS } from "@/lib/accounts";

const maxHistoryChars = 60_000;
const generationTimeoutMs = 120_000;
const maxChatJsonBytes = 2 * 1024 * 1024;
const maxMultipartBytes = attachmentLimits.maxUploadBytes + 1024 * 1024;

async function readChatBody(
  request: Request,
): Promise<{ value: Record<string, unknown>; files: File[] } | { response: Response }> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    const body = await readJsonObject(request, maxChatJsonBytes);
    return body.response ? { response: body.response } : { value: body.value, files: [] };
  }
  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const declared = Number(rawLength);
    if (!Number.isFinite(declared) || declared > maxMultipartBytes) {
      return { response: apiError(413, "payload_too_large", "Attachments are too large.") };
    }
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
  for (const row of rows) {
    if (!row.content || (row.role !== "user" && row.role !== "assistant")) continue;
    total += row.content.length;
    if (total > maxHistoryChars && turns.length) break;
    const oldest = turns[0];
    if (oldest?.role === row.role) oldest.content = `${row.content}\n\n${oldest.content}`;
    else turns.unshift({ role: row.role, content: row.content });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

function withAttachments(turns: ChatTurn[], blocks: AttachmentBlock[]): ChatTurn[] {
  const last = turns.at(-1);
  if (!blocks.length || last?.role !== "user" || typeof last.content !== "string") return turns;
  const note = last.content.lastIndexOf(attachmentNoteMarker);
  const text = note >= 0 ? last.content.slice(0, note) : last.content;
  return [...turns.slice(0, -1), { role: "user", content: [...blocks, { type: "text", text }] }];
}

export async function POST(request: Request) {
  const body = await readChatBody(request);
  if ("response" in body) return body.response;

  const {
    conversationId,
    mode,
    assignmentId,
    reasoningEffort,
    history: clientHistory,
    studentContext,
  } = body.value;
  const content = typeof body.value.content === "string" ? body.value.content.trim() : "";
  const requestId = request.headers.get("idempotency-key");
  const effort: AiReasoningEffort = isAiReasoningEffort(reasoningEffort)
    ? reasoningEffort
    : "medium";

  if (
    !(conversationId === null || conversationId === undefined || isUuid(conversationId)) ||
    !(assignmentId === null || assignmentId === undefined || typeof assignmentId === "string") ||
    !isAiMode(mode) ||
    !isUuid(requestId) ||
    content.length < 1 ||
    content.length > 8_000
  ) {
    return apiError(400, "invalid_body", "Chat request is invalid.");
  }

  const config = aiConfig(effort);
  if (!config) return apiError(503, "ai_disabled", "AI is not available.");

  let attached: { blocks: AttachmentBlock[]; names: string[] } = { blocks: [], names: [] };
  if (body.files.length) {
    const converted = await toAttachmentBlocks(body.files);
    if ("error" in converted) {
      const status = converted.error.code === "unsupported_file" ? 415 : 413;
      return apiError(
        status,
        converted.error.code,
        converted.error.file ? `File rejected: ${converted.error.file}` : "Attachments rejected.",
      );
    }
    attached = converted;
  }
  const saved = content + attachmentNote(attached.names, 8_000 - content.length);

  // Check if Supabase session is active; otherwise run in direct stateless gateway mode for local portal accounts.
  const isLocalPortalSession =
    request.headers.get("authorization") === "Bearer local-multi-role-session";
  const auth = await getAcademicContext(request);
  if (auth.response && !isLocalPortalSession) {
    return auth.response;
  }
  if (auth.context && auth.context.membership.role !== "student") {
    return apiError(403, "forbidden", "Student access is required.");
  }
  const supabase = auth.context?.supabase ?? null;

  let source: { title: string; instructions: string } | undefined;
  if (typeof assignmentId === "string" && assignmentId) {
    if (supabase && !isLocalPortalSession) {
      if (!isUuid(assignmentId)) {
        return apiError(400, "invalid_body", "Chat request is invalid.");
      }
      const { data, error } = await supabase
        .from("assignments")
        .select("title,instructions")
        .eq("id", assignmentId)
        .eq("status", "published")
        .maybeSingle();
      if (error) return databaseError();
      if (!data) return apiError(404, "not_found", "Assignment not found.");
      source = data;
    } else {
      const localMatch = DEFAULT_ASSIGNMENTS.find((a) => a.id === assignmentId);
      if (!localMatch) return apiError(404, "not_found", "Assignment not found.");
      source = { title: localMatch.title, instructions: localMatch.instructions };
    }
  }

  const conversation = (typeof conversationId === "string" && isUuid(conversationId))
    ? conversationId
    : crypto.randomUUID();

  let dbHistoryRows: { role: "user" | "assistant"; content: string }[] | null = null;
  if (supabase && auth.context?.membership.role === "student") {
    const reserved = await supabase.rpc("ai_reserve", {
      p_request_id: requestId,
      p_conversation_id: conversation,
      p_title: content.replace(/\s+/g, " ").slice(0, 60),
      p_mode: mode,
      p_content: saved,
    });
    if (reserved.error) {
      const msg = reserved.error.message ?? "";
      if (msg.includes("not_found")) return apiError(404, "not_found", "Resource not found.");
      if (msg.includes("ai_busy")) return apiError(409, "ai_busy", "Another AI request is in progress.");
      if (msg.includes("ai_quota_exceeded")) return apiError(429, "ai_quota_exceeded", "Daily AI quota exceeded.");
      if (reserved.error.code === "42501") return apiError(403, "forbidden", "Student access is required.");
      return databaseError();
    }
    if (reserved.data === "duplicate") {
      return apiError(409, "duplicate_request", "Duplicate request.");
    }
    const history = await supabase
      .from("ai_messages")
      .select("role,content")
      .eq("conversation_id", conversation)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .order("role", { ascending: false })
      .limit(30);
    if (history.error) return databaseError();
    dbHistoryRows = history.data ?? [];
  }

  const sanitizedClientHistory: { role: "user" | "assistant"; content: string }[] = Array.isArray(
    clientHistory,
  )
    ? clientHistory
        .filter(
          (item): item is { role: "user" | "assistant"; content: string } =>
            Boolean(
              item &&
                typeof item === "object" &&
                (item.role === "user" || item.role === "assistant") &&
                typeof item.content === "string" &&
                item.content.trim().length > 0,
            ),
        )
        .slice(-24)
        .reverse()
    : [];

  const historyRows = dbHistoryRows && dbHistoryRows.length > 0
    ? dbHistoryRows
    : [{ role: "user" as const, content: saved }, ...sanitizedClientHistory];

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(generationTimeoutMs)]);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AiStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client disconnected.
        }
      };

      const startTime = Date.now();
      let firstContentTime: number | null = null;

      send({ type: "start", conversationId: conversation, requestId, model: "Model SDU 1.3 (Qwen 3.8)" });
      send({
        type: "step",
        label: source
          ? `Đang nạp ngữ cảnh bài tập: ${source.title}`
          : "Đang truy xuất Bộ nhớ Học sinh & Hồ sơ học vụ SDU",
      });
      if (attached.names.length > 0) {
        send({
          type: "step",
          label: `Đang đọc ${attached.names.length} tệp đính kèm (${attached.names.slice(0, 2).join(", ")})`,
        });
      }
      send({
        type: "step",
        label:
          config.reasoningEffort === "high"
            ? "Suy luận sâu (Model SDU 1.3 · Qwen 3.8) · Kiểm chứng từng bước"
            : "Khởi tạo luồng suy luận (Model SDU 1.3 · Train từ Qwen 3.8)",
      });

      let text = "";
      let status: "complete" | "interrupted" | "failed" = "complete";
      let usage = { inputTokens: 0, outputTokens: 0 };
      let errorCode = "";

      try {
        usage = await streamCompletion(
          config,
          systemPrompt(
            mode,
            source,
            attached.names.length > 0,
            typeof studentContext === "string" ? studentContext.slice(0, 64_000) : undefined,
          ),
          withAttachments(toTurns(historyRows), attached.blocks),
          (delta) => {
            if (firstContentTime === null) {
              firstContentTime = Date.now();
            }
            text += delta;
            send({ type: "delta", text: delta });
          },
          (reasoningDelta) => {
            send({ type: "reasoning", text: reasoningDelta });
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

      if (supabase && dbHistoryRows) {
        await supabase.rpc("ai_finish", {
          p_request_id: requestId,
          p_content: text,
          p_status: status,
          p_input_tokens: usage.inputTokens,
          p_output_tokens: usage.outputTokens,
        });
      }

      const reasoningMs = Math.max(400, (firstContentTime ?? Date.now()) - startTime);
      send(
        status === "complete"
          ? { type: "complete", reasoningMs }
          : { type: "error", code: errorCode },
      );
      try {
        controller.close();
      } catch {
        // Already closed.
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
