const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

export const hasAcademicApi = Boolean(apiUrl);

export function createIdempotencyKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = (Math.random() * 16) | 0;
      return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
    })
  );
}

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class AcademicApiError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);
    this.name = "AcademicApiError";
    this.status = status;
    this.code = code;
  }
}

function errorMessage(status: number, code?: string) {
  if (status === 401 || code === "unauthorized") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (status === 403 || code === "forbidden") {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (status === 404 || code === "not_found") {
    return "Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.";
  }
  if (status === 409 || code === "conflict") {
    return "Dữ liệu đã thay đổi hoặc thao tác này đã được thực hiện.";
  }
  if (status === 415) {
    return "Ứng dụng chỉ hỗ trợ dữ liệu JSON.";
  }
  if (status === 413 || code === "payload_too_large") {
    return "Dữ liệu gửi lên vượt quá giới hạn cho phép.";
  }
  if (code === "privacy_confirmation_required") {
    return "Tin nhắn có thể chứa thông tin riêng tư. Hãy kiểm tra nội dung, xác nhận rồi gửi lại.";
  }
  if (status === 422 || code === "unprocessable") {
    return "Không thể xử lý dữ liệu đã gửi.";
  }
  if (status === 429 || code === "rate_limited") {
    return "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.";
  }
  if (status >= 500) {
    return "Hệ thống đang gián đoạn. Vui lòng thử lại sau.";
  }
  return "Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại.";
}

export async function academicRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  if (!apiUrl) throw new Error("Ứng dụng chưa được cấu hình địa chỉ API.");

  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new AcademicApiError(
      errorMessage(response.status, body?.error?.code),
      response.status,
      body?.error?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
