import type { Metadata } from "next";
import Image from "next/image";
import { phuongFonts } from "@/components/landing/fonts";
import "../landing.css";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default function ChangePasswordPage() {
  return (
    <div className={`sd auth-page auth-single ${phuongFonts}`}>
      <main className="auth-panel" id="noi-dung">
        <div className="auth-card">
          <span className="brand-lockup">
            <Image src="/sao-do-logo.png" alt="" width={40} height={43} priority />
            <span><strong>Đại học Sao Đỏ</strong></span>
          </span>
          <header>
            <h1>Đặt mật khẩu mới</h1>
            <p>Tài khoản của bạn đang dùng mật khẩu tạm do nhà trường cấp. Hãy đặt mật khẩu riêng trước khi tiếp tục.</p>
          </header>
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}
