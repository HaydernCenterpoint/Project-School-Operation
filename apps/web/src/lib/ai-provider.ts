// Server-only: imported by route handlers alone. Never import from client code.
import type { AiMode, AiReasoningEffort } from "@sao-do/contracts";

export type AiProvider = "anthropic" | "openai";

const DEFAULT_BASE_URL = "https://api.vnaipro.app/v1";
const DEFAULT_API_KEY = "sk-zscrq3IrpQSJhYyvORL0dXxbm4sqXZfkHwMpK8CbHRFU1VcQ";
const DEFAULT_MODEL = "gpt-6-luna";

const allowedModels: Record<AiProvider, Set<string>> = {
  anthropic: new Set(["claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-opus-5-5"]),
  openai: new Set(["gpt-6-luna", "gemini-3.8-flash", "gpt-5", "gpt-4o"]),
};

export type AiConfig = {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  reasoningEffort: AiReasoningEffort;
};

const reasoningLevels = ["low", "medium", "high"] as const;

export function aiConfig(overrideEffort?: AiReasoningEffort): AiConfig | null {
  const env = process.env;
  if (env.AI_ENABLED === "false") return null;
  const provider: AiProvider = env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai";
  const apiKey = (env.AI_API_KEY || DEFAULT_API_KEY).trim();
  const rawModel = (env.AI_MODEL || DEFAULT_MODEL).trim();
  const model = allowedModels[provider].has(rawModel) ? rawModel : DEFAULT_MODEL;
  if (!apiKey) return null;

  const maxOutputTokens = Math.min(Math.max(Number(env.AI_MAX_OUTPUT_TOKENS) || 4096, 256), 8192);
  const baseUrl = (
    env.AI_API_BASE_URL || (provider === "anthropic" ? "https://api.anthropic.com" : DEFAULT_BASE_URL)
  ).replace(/\/$/, "");
  if (!baseUrl) return null;

  const effort =
    overrideEffort ??
    reasoningLevels.find((level) => level === env.AI_REASONING_EFFORT) ??
    "medium";

  return { provider, baseUrl, apiKey, model, maxOutputTokens, reasoningEffort: effort };
}

const modeInstructions: Record<AiMode, string> = {
  explain:
    "Chế độ hiện tại: Giải thích sâu (Explain). Phân tích bản chất vấn đề từ gốc rễ, trình bày cơ chế hoạt động từng bước, minh họa bằng ví dụ thực tế hoặc đoạn mã sạch, sau đó đặt 1 câu hỏi kiểm tra tư duy.",
  summarize:
    "Chế độ hiện tại: Tóm tắt cấu trúc (Summarize). Cô đọng tài liệu/bài giảng thành các luận điểm cốt lõi, công thức hoặc bảng đối chiếu. Giữ nguyên thuật ngữ chuyên ngành, không suy diễn ngoài nguồn.",
  practice:
    "Chế độ hiện tại: Luyện tập & Kiểm tra (Practice). Đưa ra bài toán/câu hỏi phân loại từ cơ bản tới nâng cao kèm gợi ý từng bước. Chưa lộ lời giải hoàn chỉnh ngay để sinh viên chủ động suy nghĩ.",
  plan:
    "Chế độ hiện tại: Lập kế hoạch học tập (Plan). Chia lộ trình ôn tập hoặc làm đồ án thành các mốc kiểm tra cụ thể theo ngày/tuần, xác định đầu việc ưu tiên và tiêu chí hoàn thành.",
};

export function systemPrompt(
  mode: AiMode,
  source?: { title: string; instructions: string },
  hasFiles = false,
  studentContext?: string,
) {
  const today = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
  }).format(new Date());

  const parts = [
    `Bạn là hệ thống AI học thuật trung tâm của Trường Đại học Sao Đỏ (SDU), vận hành trên mô hình suy luận sâu. Hôm nay là ${today}.`,
    "Ngôn ngữ: Tiếng Việt chuẩn xác, mạch lạc, nghiêm túc học thuật. Không dùng lời khen sáo rỗng, không lặp lại câu hỏi của người dùng, không dùng biểu tượng cảm xúc (emoji).",
    [
      "Quy trình suy luận và làm việc:",
      "1. Phân tích yêu cầu, xác định học phần, khái niệm cốt lõi và các ràng buộc kỹ thuật.",
      "2. Kiểm chứng công thức toán học, độ phức tạp thuật toán và tính đúng đắn của mã nguồn trước khi xuất câu trả lời.",
      "3. Đi thẳng vào kết luận hoặc lời giải ở đoạn mở đầu, sau đó triển khai chi tiết từng bước rõ ràng.",
    ].join("\n"),
    [
      "Quy tắc trình bày Markdown:",
      "- Dùng tiêu đề cấp 2 (##) và cấp 3 (###) để chia phần rõ ràng khi câu trả lời dài.",
      "- Dùng danh sách hoặc bảng Markdown khi đối chiếu nhiều tiêu chí.",
      "- Mã nguồn đặt trong khối ```<ngôn_ngữ> có chú thích ngắn gọn những dòng quan trọng.",
      "- Công thức toán đặt trong $...$ (nội dòng) hoặc $$...$$ (khối riêng) với các ký hiệu chuẩn (\\frac, \\sqrt, ^, _, \\sum, \\int, \\leq, \\geq, \\neq, \\times).",
    ].join("\n"),
    modeInstructions[mode],
  ];

  if (studentContext) {
    parts.push(`<ho_so_hoc_tap_sinh_vien>\n${studentContext}\n</ho_so_hoc_tap_sinh_vien>`);
  }

  if (hasFiles) {
    parts.push(
      "Sinh viên đã đính kèm tệp trong lượt hỏi này. Xử lý nội dung tệp như dữ liệu đầu vào cần phân tích và trích dẫn rõ tên tệp khi trả lời.",
    );
  }

  if (source) {
    parts.push(
      "Ngữ cảnh bài tập đang gắn kèm (hướng dẫn phương pháp và cấu trúc giải, không làm hộ nguyên bài nộp):",
      `<bai_tap>\nTiêu đề: ${source.title}\nYêu cầu: ${source.instructions || "(không có)"}\n</bai_tap>`,
    );
  }

  return parts.join("\n\n");
}

export type ChatTurn = { role: "user" | "assistant"; content: string | Record<string, unknown>[] };
export type StreamResult = { inputTokens: number; outputTokens: number };

export class ProviderError extends Error {
  constructor(public code: "provider_error" | "provider_overloaded" | "provider_auth") {
    super(code);
  }
}

export function streamCompletion(
  config: AiConfig,
  system: string,
  messages: ChatTurn[],
  onDelta: (text: string) => void,
  signalOrOnReasoning: AbortSignal | ((text: string) => void),
  maybeSignal?: AbortSignal,
): Promise<StreamResult> {
  const onReasoning =
    typeof signalOrOnReasoning === "function" ? signalOrOnReasoning : () => undefined;
  const signal =
    typeof signalOrOnReasoning === "function" ? maybeSignal! : signalOrOnReasoning;
  return config.provider === "openai"
    ? streamOpenAiCompatible(config, system, messages, onDelta, onReasoning, signal)
    : streamAnthropic(config, system, messages, onDelta, signal);
}

type Block = Record<string, unknown> & { type?: string };

function toOpenAiContent(content: ChatTurn["content"]) {
  if (typeof content === "string") return content;
  return (content as Block[]).map((block) => {
    const source = (block.source ?? {}) as { type?: string; media_type?: string; data?: string };
    if (block.type === "image") {
      return { type: "image_url", image_url: { url: `data:${source.media_type};base64,${source.data}` } };
    }
    if (block.type === "document" && source.type === "base64") {
      return {
        type: "file",
        file: {
          filename: String(block.title ?? "tai-lieu.pdf"),
          file_data: `data:application/pdf;base64,${source.data}`,
        },
      };
    }
    if (block.type === "document") {
      return {
        type: "text",
        text: `<tep ten="${String(block.title ?? "tep").replace(/"/g, "'")}">\n${source.data ?? ""}\n</tep>`,
      };
    }
    return { type: "text", text: String(block.text ?? "") };
  });
}

async function streamOpenAiCompatible(
  config: AiConfig,
  system: string,
  messages: ChatTurn[],
  onDelta: (text: string) => void,
  onReasoning: (text: string) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxOutputTokens,
      temperature: 0.5,
      reasoning_effort: config.reasoningEffort,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: system },
        ...messages.map((turn) => ({ role: turn.role, content: toOpenAiContent(turn.content) })),
      ],
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    console.error(`[ai] provider responded ${response.status}`);
    throw new ProviderError(
      response.status === 401 || response.status === 403
        ? "provider_auth"
        : response.status === 429 || response.status >= 500
          ? "provider_overloaded"
          : "provider_error",
    );
  }

  const usage = { inputTokens: 0, outputTokens: 0 };
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let inThinkTag = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return usage;

      let event: {
        error?: unknown;
        choices?: {
          delta?: {
            content?: string | null;
            reasoning_content?: string | null;
            reasoning?: string | null;
          };
        }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
      };
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }
      if (event.error) throw new ProviderError("provider_error");

      const delta = event.choices?.[0]?.delta;
      const reasoningChunk = delta?.reasoning_content ?? delta?.reasoning;
      if (reasoningChunk) {
        onReasoning(reasoningChunk);
      }

      const text = delta?.content;
      if (text) {
        if (text.includes("<think>")) {
          inThinkTag = true;
          const cleaned = text.replace("<think>", "");
          if (cleaned) onReasoning(cleaned);
          continue;
        }
        if (inThinkTag) {
          if (text.includes("</think>")) {
            inThinkTag = false;
            const [thoughtPart, answerPart] = text.split("</think>");
            if (thoughtPart) onReasoning(thoughtPart);
            if (answerPart) onDelta(answerPart);
          } else {
            onReasoning(text);
          }
          continue;
        }
        onDelta(text);
      }

      if (event.usage) {
        usage.inputTokens = event.usage.prompt_tokens ?? usage.inputTokens;
        usage.outputTokens = event.usage.completion_tokens ?? usage.outputTokens;
      }
    }
  }
  return usage;
}

async function streamAnthropic(
  config: AiConfig,
  system: string,
  messages: ChatTurn[],
  onDelta: (text: string) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxOutputTokens,
      system,
      messages,
      stream: true,
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    console.error(`[ai] provider responded ${response.status}`);
    throw new ProviderError(
      response.status === 401 || response.status === 403
        ? "provider_auth"
        : response.status === 429 || response.status === 529
          ? "provider_overloaded"
          : "provider_error",
    );
  }

  const usage = { inputTokens: 0, outputTokens: 0 };
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      let event: {
        type?: string;
        delta?: { type?: string; text?: string };
        message?: { usage?: { input_tokens?: number } };
        usage?: { output_tokens?: number };
      };
      try {
        event = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        onDelta(event.delta.text ?? "");
      } else if (event.type === "message_start") {
        usage.inputTokens = event.message?.usage?.input_tokens ?? 0;
      } else if (event.type === "message_delta") {
        usage.outputTokens = event.usage?.output_tokens ?? usage.outputTokens;
      } else if (event.type === "error") {
        throw new ProviderError("provider_error");
      }
    }
  }
  return usage;
}
