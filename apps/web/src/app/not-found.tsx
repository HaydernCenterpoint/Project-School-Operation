import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <main className="route-loading" id="noi-dung">
      <div className="empty" style={{ maxWidth: 440 }}>
        <Icon name="question" />
        <strong>Không tìm thấy trang</strong>
        <p>Đường dẫn có thể đã thay đổi hoặc bạn không có quyền truy cập.</p>
        <Link className="button button-primary" href="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
