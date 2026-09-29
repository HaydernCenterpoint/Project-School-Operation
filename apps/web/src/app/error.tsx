"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <main className="route-loading" id="noi-dung">
      <div className="empty" role="alert" style={{ maxWidth: 440 }}>
        <Icon name="alert" />
        <strong>Không thể tải trang này</strong>
        <p>Kết nối có thể đang gián đoạn. Hãy thử lại hoặc quay về trang chủ.</p>
        <div className="hero-actions" style={{ marginTop: 12 }}>
          <button className="button button-primary" type="button" onClick={reset}>
            <Icon name="retry" /> Thử lại
          </button>
          <Link className="button button-quiet" href="/">
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
