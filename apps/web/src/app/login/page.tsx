import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CampusArt } from "@/components/CampusArt";
import { FallingPetals } from "@/components/landing/FallingPetals";
import { phuongFonts } from "@/components/landing/fonts";
import { SceneArrival, SceneCurtain } from "@/components/landing/SceneTransition";
import { PhuongFlower } from "@/components/landing/Phuong";
import "../landing.css";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Đăng nhập · Đại học Sao Đỏ" };

export default function LoginPage() {
  return (
    <div className={`sd auth-page ${phuongFonts}`}>
      <SceneArrival />
      <SceneCurtain to="/" />
      <FallingPetals />
      <aside className="auth-art" aria-label="Giới thiệu Đại học Sao Đỏ">
        <Link href="/" className="brand-lockup" aria-label="Về trang chủ">
          <Image src="/sao-do-logo.png" alt="" width={48} height={51} priority />
          <span>
            <strong>Đại học Sao Đỏ</strong>
            <small>Cổng học tập sinh viên</small>
          </span>
        </Link>
        <CampusArt />
        <div>
          <p className="sd-eyebrow">
            <PhuongFlower size={16} /> Thành phố Hoa Phượng Đỏ
          </p>
          <h2>
            Chào mừng bạn trở lại <em>lớp học.</em>
          </h2>
          <p>Bài tập, phản hồi của giảng viên và trợ lý học tập, ngay sau khi đăng nhập.</p>
        </div>
      </aside>

      <main className="auth-panel" id="noi-dung">
        <div className="auth-card">
          <Link href="/" className="brand-lockup auth-mobile-brand" aria-label="Về trang chủ">
            <Image src="/sao-do-logo.png" alt="" width={40} height={43} />
            <span>
              <strong>Đại học Sao Đỏ</strong>
              <small>Cổng học tập sinh viên</small>
            </span>
          </Link>
          <header>
            <h1>Đăng nhập</h1>
            <p>Sinh viên dùng mã sinh viên; giảng viên dùng email do trường cấp.</p>
          </header>
          <LoginForm />
          <div className="divider">hoặc</div>
          <Link className="button button-quiet button-block" href="/guest">
            Tiếp tục với tư cách khách
          </Link>
          <p className="auth-back" style={{ margin: 0 }}>
            Quên mật khẩu? Liên hệ phòng Đào tạo hoặc quản trị viên của khoa để được cấp lại.
          </p>
        </div>
        <p className="auth-back">
          <Link href="/" className="mp-underline-link">← Về trang chủ</Link>
        </p>
      </main>
    </div>
  );
}
