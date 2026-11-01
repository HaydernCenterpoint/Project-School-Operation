import { isRecord, isUuid } from "@/lib/academic-api";

const maxProviderResponseBytes = 64 * 1_024;
const maxUsageTokens = 1_000_000;

export const aiTasks = {
  tutor_chat: {
    minQuestionChars: 1,
    maxQuestionChars: 2_000,
    maxRetrievedChunks: 5,
    maxOutputTokens: 600,
    timeoutMs: 8_000,
  },
} as const;

export type TutorChunk = {
  chunkId: string;
  documentId: string;
  title: string;
  sourceName: string;
  pageNumber: number | null;
  content: string;
  rank: number;
};

type ProviderResult = {
  answer: string;
  citationIds: string[];
  inputTokens: number;
  outputTokens: number;
};

type AiProviderConfiguration = {
  url: string;
  apiKey: string;
  provider: string;
  model: string;
  timeoutMs: number;
};

export class AiProviderError extends Error {}

function isLoopback(hostname: string) {
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

export function getAiProviderConfiguration():
  | { configuration: AiProviderConfiguration; error?: never }
  | { configuration?: never; error: "disabled" | "invalid" } {
  if (process.env.AI_TUTOR_ENABLED !== "true") return { error: "disabled" };

  const urlValue = process.env.AI_PROVIDER_URL;
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const provider = process.env.AI_PROVIDER_ID;
  const model = process.env.AI_PROVIDER_MODEL;
  if (!urlValue || !apiKey || !provider || !model) return { error: "invalid" };

  try {
    const url = new URL(urlValue);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && isLoopback(url.hostname)))
    ) {
      return { error: "invalid" };
    }
    const configuredTimeout = Number(process.env.AI_PROVIDER_TIMEOUT_MS);
    const timeoutMs =
      Number.isInteger(configuredTimeout) &&
      configuredTimeout > 0 &&
      configuredTimeout <= aiTasks.tutor_chat.timeoutMs
        ? configuredTimeout
        : aiTasks.tutor_chat.timeoutMs;
    return {
      configuration: {
        url: new URL("chat/completions", `${url.toString().replace(/\/$/, "")}/`)
          .toString(),
        apiKey,
        provider,
        model,
        timeoutMs,
      },
    };
  } catch {
    return { error: "invalid" };
  }
}

function providerContent(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.choices)) return null;
  const choice = value.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return null;
  return typeof choice.message.content === "string"
    ? choice.message.content
    : null;
}

function tokenCount(value: unknown, key: "prompt_tokens" | "completion_tokens") {
  if (!isRecord(value) || !isRecord(value.usage)) return 0;
  const count = value.usage[key];
  if (count === undefined) return 0;
  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > maxUsageTokens
  ) {
    throw new AiProviderError("invalid_provider_response");
  }
  return count;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    Number.isFinite(Number(declaredLength)) &&
    Number(declaredLength) > maxProviderResponseBytes
  ) {
    throw new AiProviderError("provider_response_too_large");
  }
  if (!response.body) throw new AiProviderError("invalid_provider_response");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxProviderResponseBytes) {
      await reader.cancel().catch(() => undefined);
      throw new AiProviderError("provider_response_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new AiProviderError("invalid_provider_response");
  }
}

export async function callTutorProvider(
  configuration: AiProviderConfiguration,
  question: string,
  chunks: TutorChunk[],
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), configuration.timeoutMs);
  try {
    const response = await fetch(configuration.url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: configuration.model,
        max_tokens: aiTasks.tutor_chat.maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Answer only from the supplied school sources. Return one JSON object with exactly answer and citationIds. citationIds must contain the IDs of every source used. If the sources do not answer the question, return an empty answer and citationIds.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question,
              sources: chunks.map((chunk) => ({
                id: chunk.chunkId,
                title: chunk.title,
                content: chunk.content,
              })),
            }),
          },
        ],
      }),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new AiProviderError("provider_unavailable");

    const raw = await readBoundedJson(response);
    const content = providerContent(raw);
    if (!content) throw new AiProviderError("invalid_provider_response");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiProviderError("invalid_provider_response");
    }
    if (
      !isRecord(parsed) ||
      Object.keys(parsed).sort().join(",") !== "answer,citationIds" ||
      typeof parsed.answer !== "string" ||
      parsed.answer.length > 4_000 ||
      !Array.isArray(parsed.citationIds) ||
      parsed.citationIds.length > aiTasks.tutor_chat.maxRetrievedChunks ||
      !parsed.citationIds.every((id) => isUuid(id))
    ) {
      throw new AiProviderError("invalid_provider_response");
    }
    return {
      answer: parsed.answer.trim(),
      citationIds: [...new Set(parsed.citationIds)],
      inputTokens: tokenCount(raw, "prompt_tokens"),
      outputTokens: tokenCount(raw, "completion_tokens"),
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError(
      error instanceof Error && error.name === "AbortError"
        ? "provider_timeout"
        : "provider_unavailable",
    );
  } finally {
    clearTimeout(timeout);
  }
}
