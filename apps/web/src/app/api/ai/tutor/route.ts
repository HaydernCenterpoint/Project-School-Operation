import { createHash } from "node:crypto";
import type { AiTutorCitation, AiTutorResponse } from "@sao-do/contracts";
import {
  AiProviderError,
  aiTasks,
  callTutorProvider,
  getAiProviderConfiguration,
  type TutorChunk,
} from "@/lib/ai-gateway";
import {
  apiError,
  databaseError,
  getAcademicContext,
  hasExactKeys,
  isRecord,
  isUuid,
  json,
  mapAcademicRpcError,
  readJsonObject,
  singleRpcRow,
} from "@/lib/academic-api";

type Completion = {
  status: "answered" | "abstained" | "failed";
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string | null;
  outputHash?: string | null;
  retrievedChunkCount: number;
};

type TutorChunkRow = TutorChunk;

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTutorChunkRow(row: unknown): row is TutorChunkRow {
  return (
    isRecord(row) &&
    isUuid(row.chunkId) &&
    isUuid(row.documentId) &&
    isNonemptyString(row.title) &&
    isNonemptyString(row.sourceName) &&
    (row.pageNumber === null ||
      (typeof row.pageNumber === "number" &&
        Number.isInteger(row.pageNumber) &&
        row.pageNumber > 0)) &&
    isNonemptyString(row.content) &&
    typeof row.rank === "number" &&
    Number.isFinite(row.rank) &&
    row.rank > 0 &&
    row.rank <= 1_000_000
  );
}

function mapChunk(row: TutorChunkRow): TutorChunk {
  return {
    chunkId: row.chunkId,
    documentId: row.documentId,
    title: row.title,
    sourceName: row.sourceName,
    pageNumber: row.pageNumber,
    content: row.content,
    rank: row.rank,
  };
}

function aiRpcError(error: {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}) {
  const message = error.message?.trim().toLowerCase();
  if (message === "ai_consent_required") {
    return apiError(403, "consent_required", "AI Tutor consent is required.");
  }
  if (message === "ai_daily_quota_exceeded") {
    return apiError(429, "quota_exceeded", "AI Tutor daily quota is exhausted.");
  }
  if (message === "ai_tutor_disabled") {
    return apiError(503, "ai_unavailable", "AI Tutor is unavailable.");
  }
  if (message === "ai_class_not_available") {
    return apiError(404, "not_found", "Resource not found.");
  }
  if (message === "ai_duplicate_request") {
    return apiError(409, "conflict", "The request conflicts with existing data.");
  }
  return mapAcademicRpcError(error);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  if (auth.context.membership.role !== "student") {
    return apiError(403, "forbidden", "Student access is required.");
  }

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["requestId", "classId", "question"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const requestId = body.value.requestId;
  const classId = body.value.classId;
  const question =
    typeof body.value.question === "string" ? body.value.question.trim() : "";
  if (
    !isUuid(requestId) ||
    !isUuid(classId) ||
    question.length < aiTasks.tutor_chat.minQuestionChars ||
    question.length > aiTasks.tutor_chat.maxQuestionChars
  ) {
    return apiError(400, "invalid_body", "Tutor request is invalid.");
  }

  const providerConfig = getAiProviderConfiguration();
  if (providerConfig.error) {
    return apiError(503, "ai_unavailable", "AI Tutor is unavailable.");
  }

  const reserved = await auth.context.supabase.rpc("reserve_ai_tutor_request", {
    p_request_id: requestId,
    p_class_id: classId,
    p_input_chars: question.length,
  });
  if (reserved.error) return aiRpcError(reserved.error);
  const reservation = singleRpcRow(reserved.data);
  if (!reservation) return databaseError("AI Tutor reservation returned no record.");

  const finish = async (completion: Completion) => {
    const result = await auth.context.supabase.rpc("finish_ai_tutor_request", {
      p_request_id: requestId,
      p_status: completion.status,
      p_latency_ms: completion.latencyMs,
      p_input_tokens: completion.inputTokens ?? 0,
      p_output_tokens: completion.outputTokens ?? 0,
      p_error_code: completion.errorCode ?? null,
      p_output_hash: completion.outputHash ?? null,
      p_retrieved_chunk_count: completion.retrievedChunkCount,
    });
    return result.error;
  };

  const dailyRemaining = Number(reservation.dailyRemaining);
  if (
    reservation.provider !== providerConfig.configuration.provider ||
    reservation.model !== providerConfig.configuration.model ||
    !Number.isInteger(dailyRemaining) ||
    dailyRemaining < 0
  ) {
    const completionError = await finish({
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorCode: "PROVIDER_POLICY_MISMATCH",
      retrievedChunkCount: 0,
    });
    if (completionError) return databaseError("Unable to complete AI usage record.");
    return apiError(503, "ai_unavailable", "AI Tutor is unavailable.");
  }

  const retrieved = await auth.context.supabase.rpc("retrieve_tutor_chunks", {
    p_class_id: classId,
    p_query: question,
    p_limit: aiTasks.tutor_chat.maxRetrievedChunks,
  });
  if (retrieved.error) {
    const completionError = await finish({
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorCode: "RETRIEVAL_FAILED",
      retrievedChunkCount: 0,
    });
    if (completionError) return databaseError("Unable to complete AI usage record.");
    return aiRpcError(retrieved.error);
  }
  if (
    !Array.isArray(retrieved.data) ||
    retrieved.data.length > aiTasks.tutor_chat.maxRetrievedChunks ||
    !retrieved.data.every(isTutorChunkRow)
  ) {
    const completionError = await finish({
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorCode: "RETRIEVAL_CONTRACT_INVALID",
      retrievedChunkCount: 0,
    });
    if (completionError) return databaseError("Unable to complete AI usage record.");
    return databaseError("AI Tutor retrieval returned an invalid record.");
  }
  const chunks = retrieved.data.map(mapChunk);

  const abstain = async (
    retrievedChunkCount: number,
    errorCode: "INSUFFICIENT_EVIDENCE" | "INVALID_OR_INSUFFICIENT_CITATIONS",
    inputTokens = 0,
    outputTokens = 0,
  ) => {
    const completionError = await finish({
      status: "abstained",
      latencyMs: Date.now() - startedAt,
      inputTokens,
      outputTokens,
      errorCode,
      retrievedChunkCount,
    });
    if (completionError) return databaseError("Unable to complete AI usage record.");
    const response: AiTutorResponse = {
      status: "abstained",
      answer: null,
      citations: [],
      dailyRemaining,
    };
    return json(response);
  };

  if (chunks.length === 0) return abstain(0, "INSUFFICIENT_EVIDENCE");

  try {
    const generated = await callTutorProvider(
      providerConfig.configuration,
      question,
      chunks,
    );
    const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
    const citations = generated.citationIds.map((id) => chunksById.get(id));
    if (
      generated.answer.length === 0 ||
      citations.length === 0 ||
      citations.some((citation) => citation === undefined)
    ) {
      return abstain(
        chunks.length,
        "INVALID_OR_INSUFFICIENT_CITATIONS",
        generated.inputTokens,
        generated.outputTokens,
      );
    }

    const mappedCitations: AiTutorCitation[] = citations.map((citation) => ({
      id: citation!.chunkId,
      title: citation!.title,
      sourceName: citation!.sourceName,
      pageNumber: citation!.pageNumber,
    }));
    const completionError = await finish({
      status: "answered",
      latencyMs: Date.now() - startedAt,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      outputHash: createHash("sha256").update(generated.answer).digest("hex"),
      retrievedChunkCount: chunks.length,
    });
    if (completionError) return databaseError("Unable to complete AI usage record.");
    const response: AiTutorResponse = {
      status: "answered",
      answer: generated.answer,
      citations: mappedCitations,
      dailyRemaining,
    };
    return json(response);
  } catch (error) {
    const errorCode =
      error instanceof AiProviderError
        ? error.message.toUpperCase()
        : "PROVIDER_UNAVAILABLE";
    const completionError = await finish({
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorCode,
      retrievedChunkCount: chunks.length,
    });
    if (completionError) return databaseError("Unable to complete AI usage record.");
    return apiError(503, "provider_unavailable", "AI Tutor is temporarily unavailable.");
  }
}
