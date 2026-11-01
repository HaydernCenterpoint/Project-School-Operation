import type { AiMode, AiReasoningEffort, AiStreamEvent } from "@sao-do/contracts";

const messages: Record<string, string> = {
  ai_disabled: "Trợ lý AI hiện chưa được bật.",
  ai_quota_exceeded: "Bạn đã dùng hết lượt hỏi AI hôm nay. Lượt mới được cấp lúc 0 giờ.",
  ai_busy: "Một câu trả lời khác đang được tạo. Đợi giây lát rồi thử lại.",
  duplicate_request: "Yêu cầu này đã được xử lý.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Tài khoản của bạn không có quyền dùng trợ lý AI.",
  membership_required: "Tài khoản của bạn không có quyền dùng trợ lý AI.",
  not_found: "Không tìm thấy nội dung hoặc bạn không có quyền truy cập.",
  invalid_body: "Nội dung chưa hợp lệ. Tin nhắn cần từ 1 đến 8.000 ký tự.",
  payload_too_large: "Nội dung quá dài. Hãy rút gọn rồi thử lại.",
  rate_limited: "Bạn thao tác quá nhanh. Thử lại sau ít phút.",
  provider_overloaded: "Máy chủ suy luận AI đang quá tải. Thử lại sau ít giây.",
  provider_error: "Kết nối tới máy chủ AI gặp sự cố. Thử lại sau ít giây.",
  provider_auth: "Khoá kết nối dịch vụ AI không hợp lệ hoặc đã hết hạn.",
  timeout: "Yêu cầu vượt quá thời gian chờ nên đã dừng.",
  cancelled: "Đã dừng suy luận.",
  network: "Mất kết nối mạng. Kiểm tra kết nối rồi thử lại.",
  unsupported_file: "Tệp chưa được hỗ trợ. Hỗ trợ ảnh, PDF, văn bản và mã nguồn.",
  attachment_too_large: "Tệp đính kèm vượt quá giới hạn 30 MB.",
  too_many_files: "Mỗi tin nhắn đính kèm tối đa 100 tệp.",
  text_too_long: "Nội dung các tệp văn bản quá dài. Hãy chọn bớt tệp.",
};

export function aiErrorMessage(code: string) {
  return messages[code] ?? "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

export class AiRequestError extends Error {
  constructor(public code: string) {
    super(aiErrorMessage(code));
  }
}

async function errorCode(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
  return response.status === 401 ? "unauthorized" : (body.error?.code ?? "unknown");
}

export async function aiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new AiRequestError("network");
  }
  if (!response.ok) throw new AiRequestError(await errorCode(response));
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export type StreamChatPayload = {
  conversationId: string | null;
  mode: AiMode;
  content: string;
  assignmentId: string | null;
  reasoningEffort?: AiReasoningEffort;
  history?: { role: "user" | "assistant"; content: string }[];
  studentContext?: string;
};

export async function streamChat(
  token: string,
  body: StreamChatPayload,
  requestId: string,
  onEvent: (event: AiStreamEvent) => void,
  signal: AbortSignal,
  files: { blob: Blob; name: string }[] = [],
) {
  const form = files.length ? new FormData() : null;
  if (form) {
    form.append("payload", JSON.stringify(body));
    for (const file of files) form.append("files", file.blob, file.name);
  }
  let response: Response;
  try {
    response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(form ? {} : { "Content-Type": "application/json" }),
        "Idempotency-Key": requestId,
      },
      body: form ?? JSON.stringify(body),
      signal,
    });
  } catch {
    throw new AiRequestError(signal.aborted ? "cancelled" : "network");
  }
  if (!response.ok || !response.body) throw new AiRequestError(await errorCode(response));

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as AiStreamEvent;
        if (event.type === "complete" || event.type === "error") finished = true;
        onEvent(event);
      }
    }
  } catch {
    if (!finished) onEvent({ type: "error", code: signal.aborted ? "cancelled" : "network" });
    return;
  }
  if (!finished) onEvent({ type: "error", code: "network" });
}
