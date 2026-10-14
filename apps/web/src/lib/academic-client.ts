type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

function errorMessage(status: number, code?: string) {
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu hoặc bạn không được phép truy cập.";
  if (status === 409) return "Dữ liệu đã tồn tại hoặc vừa được cập nhật.";
  if (status === 429) return "Bạn thao tác quá nhanh. Chờ một phút rồi thử lại.";
  if (status === 415) return "Định dạng dữ liệu gửi lên không được hỗ trợ.";
  if (code === "invalid_body" || code === "unprocessable") {
    return "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại biểu mẫu.";
  }
  if (status >= 500) return "Hệ thống đang gặp sự cố. Vui lòng thử lại.";
  return "Không thể hoàn tất yêu cầu. Vui lòng kiểm tra và thử lại.";
}

export async function academicRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(errorMessage(response.status, body.error?.code));
  }
  return body;
}
