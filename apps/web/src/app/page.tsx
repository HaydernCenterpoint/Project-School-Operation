"use client";

import { FormEvent, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase-browser";

export default function AccessPage() {
  const main = useRef<HTMLElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.registerPlugin(ScrollTrigger);
      gsap.from(".hero-copy > *", {
        y: 28,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
      });

      const words = gsap.utils.toArray<HTMLElement>(".reveal-word");
      gsap.fromTo(
        words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.06,
          scrollTrigger: {
            trigger: ".manifesto",
            start: "top 75%",
            end: "bottom 48%",
            scrub: true,
          },
        },
      );

      ScrollTrigger.create({
        trigger: ".pinned-story",
        start: "top 18%",
        end: "bottom 78%",
        pin: ".pinned-heading",
        pinSpacing: false,
      });
    },
    { scope: main },
  );

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnvironment) return;

    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");

    const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setLoading(false);
    if (authError) {
      setError("Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.");
      return;
    }
    router.push("/portal");
  }

  const revealCopy =
    "Một cổng truy cập rõ ràng giúp mỗi thành viên đăng nhập đúng vai trò, thuộc đúng cơ sở và nhìn thấy đúng lớp học được phép truy cập.";

  return (
    <main ref={main} className="access-page">
      <header className="access-nav">
        <Link href="/" className="brand-lockup" aria-label="Đại học Sao Đỏ">
          <Image src="/sao-do-logo.png" alt="" width={58} height={58} priority />
          <span>Đại học Sao Đỏ</span>
        </Link>
        <a href="#dang-nhap" className="text-link">
          Đăng nhập
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Không gian học tập số</p>
          <h1>Tri thức chuyển động, cộng đồng cùng tiến.</h1>
          <p className="hero-lead">
            Một lối vào duy nhất cho tài khoản, vai trò thành viên và lớp học
            tại Đại học Sao Đỏ.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#dang-nhap">
              Vào hệ thống
            </a>
            <a className="button button-quiet" href="#cach-van-hanh">
              Khám phá cách vận hành
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="orbit-dot dot-one" />
          <span className="orbit-dot dot-two" />
          <span className="orbit-dot dot-three" />
          <Image
            src="/sao-do-logo.png"
            alt=""
            width={360}
            height={360}
            className="hero-logo"
            priority
          />
        </div>
      </section>

      <section className="manifesto" aria-label="Tuyên ngôn sản phẩm">
        <p>
          {revealCopy.split(" ").map((word, index) => (
            <span className="reveal-word" key={`${word}-${index}`}>
              {word}{" "}
            </span>
          ))}
        </p>
      </section>

      <section id="cach-van-hanh" className="pinned-story">
        <div className="pinned-heading">
          <p className="eyebrow">Một cổng truy cập nhất quán</p>
          <h2>Từ đăng nhập đến lớp học, đúng người và đúng phạm vi.</h2>
        </div>
        <div className="story-list">
          <article>
            <h3>Đăng nhập an toàn</h3>
            <p>
              Tài khoản được xác thực trước khi portal tải bất kỳ dữ liệu lớp
              học nào.
            </p>
          </article>
          <article>
            <h3>Vai trò theo từng cơ sở</h3>
            <p>
              Quan hệ thành viên xác định bạn là quản trị viên, giảng viên hay
              sinh viên trong đúng đơn vị.
            </p>
          </article>
          <article>
            <h3>Danh sách lớp đúng quyền</h3>
            <p>
              Chính sách dữ liệu của hệ thống chỉ trả về những lớp tài khoản
              hiện tại được phép xem.
            </p>
          </article>
        </div>
      </section>

      <section id="dang-nhap" className="login-section">
        <div className="login-intro">
          <p className="eyebrow">Bắt đầu</p>
          <h2>Trở lại lớp học của bạn.</h2>
          <p>
            Dùng tài khoản do Đại học Sao Đỏ cấp để truy cập đúng vai trò và cơ
            sở.
          </p>
        </div>
        <form className="login-form" method="post" onSubmit={signIn}>
          {hasSupabaseEnvironment ? (
            <>
              <label>
                Email
                <input
                  aria-describedby={error ? "login-error" : undefined}
                  aria-invalid={Boolean(error)}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tenban@saodo.edu.vn"
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  aria-describedby={error ? "login-error" : undefined}
                  aria-invalid={Boolean(error)}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && (
                <p className="form-error" id="login-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-primary"
                aria-busy={loading}
                disabled={loading}
                type="submit"
              >
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </button>
            </>
          ) : (
            <>
              <div className="configuration-notice" role="alert">
                <strong>Hệ thống chưa sẵn sàng</strong>
                <p>
                  Chưa cấu hình dịch vụ xác thực. Liên hệ quản trị viên để được
                  hỗ trợ.
                </p>
              </div>
            </>
          )}
        </form>
      </section>

      <footer className="access-footer">
        <span>© 2026 Đại học Sao Đỏ</span>
        <span>Cơ sở Hải Dương</span>
      </footer>
    </main>
  );
}
