"use client";

import type { AcademicSession } from "@sao-do/contracts";
import type { Session } from "@supabase/supabase-js";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { centerOf, closeCurtain } from "@/components/landing/SceneTransition";
import { academicRequest } from "@/lib/academic-client";
import {
  findAccountByLoginInput,
  PORTAL_ACCOUNTS,
  switchActiveAccount,
  type PortalAccount,
} from "@/lib/accounts";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase-browser";

/** Only same-site paths inside the signed-in area are accepted as return URLs. */
export function safeReturnPath(value: string | null, role: AcademicSession["role"]) {
  const home = role === "student" ? "/student" : role === "staff" ? "/quan-tri" : "/portal";
  const inside = value === home || value?.startsWith(`${home}/`);
  return inside && /^\/[\w\-/]*$/.test(value!) ? value! : home;
}

// Students sign in with their student code; it maps to the school-issued address.
const STUDENT_EMAIL_DOMAIN = "sv.saodo.edu.vn";

/** A bare student code (digits only) becomes its email; anything else is used as typed. */
export function loginEmail(value: string) {
  const id = value.trim();
  return /^\d{5,12}$/.test(id) ? `${id}@${STUDENT_EMAIL_DOMAIN}` : id;
}

/** Accounts made by staff carry a temporary password that must be replaced before anything else. */
async function destination({ access_token, user }: Session) {
  const session = await academicRequest<AcademicSession>("/api/classes", access_token);
  const target = safeReturnPath(new URLSearchParams(location.search).get("next"), session.role);
  return (user.app_metadata.must_change_password ? `/doi-mat-khau?next=${encodeURIComponent(target)}` : target) as Route;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    void getSupabaseBrowserClient()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!data.session) return;
        try {
          router.replace(await destination(data.session));
        } catch {
          // Stay on the form; the user can sign in again.
        }
      });
  }, [router]);

  async function enterWithRoleAccount(account: PortalAccount, originEl: HTMLElement) {
    setLoading(true);
    setError("");
    switchActiveAccount(account.id);
    const origin = centerOf(originEl);
    const curtain = closeCurtain(
      origin.x,
      origin.y,
      `Đang vào cổng với quyền ${account.roleTitle}…`,
    );
    await curtain?.closed;
    const nextParam = new URLSearchParams(location.search).get("next");
    const target = nextParam && nextParam.startsWith("/student") ? nextParam : "/student";
    router.push(target as Route);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = new FormData(event.currentTarget);
    const rawUser = String(form.get("email") ?? "").trim();

    // Check if the input matches one of the configured multi-role accounts first
    const matchedRoleAccount = findAccountByLoginInput(rawUser);
    if (matchedRoleAccount) {
      const btn =
        (event.currentTarget.querySelector('button[type="submit"]') as HTMLElement | null) ??
        event.currentTarget;
      await enterWithRoleAccount(matchedRoleAccount, btn);
      return;
    }

    if (!hasSupabaseEnvironment) {
      setError("Nhập mã tài khoản hợp lệ (2200286, 2200287, 2200288, ductm@saodo.edu.vn) hoặc chọn nhanh bên dưới.");
      return;
    }

    const origin = centerOf(event.currentTarget.querySelector('button[type="submit"]') ?? event.currentTarget);
    setLoading(true);
    setError("");

    const { data, error: authError } =
      await getSupabaseBrowserClient().auth.signInWithPassword({
        email: loginEmail(rawUser),
        password: String(form.get("password")),
      });

    if (authError || !data.session) {
      setLoading(false);
      setError(
        authError?.status === 429
          ? "Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại."
          : authError?.status && authError.status < 500
            ? "Mã sinh viên, email hoặc mật khẩu chưa đúng. Hoặc chọn nhanh một tài khoản phân quyền bên dưới."
            : "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
      return;
    }

    const curtain = closeCurtain(origin.x, origin.y, "Đang vào cổng học tập…");
    try {
      const [target] = await Promise.all([destination(data.session), curtain?.closed]);
      router.push(target);
    } catch (requestError) {
      curtain?.cancel();
      setLoading(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể mở cổng học tập. Vui lòng thử lại.",
      );
    }
  }

  const describedBy = error ? "login-error" : undefined;
  return (
    <>
      <form className="login-form" method="post" onSubmit={signIn}>
        <label className="field">
          Mã sinh viên, mã giảng viên hoặc email
          <input
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            name="email"
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="2200286, 2200287, ductm@saodo.edu.vn…"
            required
          />
        </label>
        <div className="field">
          <label htmlFor="login-password">Mật khẩu</label>
          <div className="password-wrap">
            <input
              id="login-password"
              aria-describedby={describedBy}
              aria-invalid={Boolean(error)}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              defaultValue="saodo2026"
              required
            />
            <button
              className="icon-button"
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
        </div>
        <div aria-live="polite">
          {error && (
            <p className="form-error" id="login-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          className="button button-primary button-block"
          aria-busy={loading}
          disabled={loading}
          type="submit"
        >
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>

      <section className="auth-role-Section" aria-label="Chọn nhanh tài khoản theo phân quyền">
        <div className="auth-role-head">
          <strong>Đăng nhập nhanh theo vai trò & quyền hạn</strong>
          <small>Chuyển đổi tức thì giữa Giảng viên, Trưởng CLB và các Sinh viên thuộc lớp DK13-CNTT1</small>
        </div>
        <div className="auth-role-grid">
          {PORTAL_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              type="button"
              className={`auth-role-card is-${acc.role}`}
              disabled={loading}
              onClick={(event) => void enterWithRoleAccount(acc, event.currentTarget)}
            >
              <span className={`role-badge is-${acc.role}`}>{acc.roleBadge}</span>
              <span className="auth-role-body">
                <strong>{acc.displayName}</strong>
                <span>{acc.roleTitle}</span>
                <code>{acc.code} · {acc.email}</code>
              </span>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
