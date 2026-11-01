"use client";

// Motion Prompt #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#085
// Motion Prompt #158 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#158
// Motion Prompt #159 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#159
// Motion Prompt #160 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#160

import type { AcademicSession } from "@sao-do/contracts";
import type { Session } from "@supabase/supabase-js";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { centerOf, closeCurtain } from "@/components/landing/SceneTransition";
import { academicRequest } from "@/lib/academic-client";
import {
  findAccountByLoginInput,
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

type ValidationState =
  | { status: "idle" }
  | { status: "valid-student"; resolvedEmail: string }
  | { status: "valid-email"; resolvedEmail: string };

function evaluateIdentityInput(raw: string): ValidationState {
  const clean = raw.trim();
  if (!clean) return { status: "idle" };
  if (/^\d{5,12}$/.test(clean)) {
    return {
      status: "valid-student",
      resolvedEmail: `${clean}@${STUDENT_EMAIL_DOMAIN}`,
    };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return {
      status: "valid-email",
      resolvedEmail: clean.toLowerCase(),
    };
  }
  return { status: "idle" };
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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

  const validation = useMemo(() => evaluateIdentityInput(emailInput), [emailInput]);

  // Motion Prompt #085: Spawn ink ripple from exact click coordinates
  function spawnButtonRipple(event: ReactMouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = button.getBoundingClientRect();
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    const maxRadius = Math.max(
      Math.hypot(x, y),
      Math.hypot(rect.width - x, y),
      Math.hypot(x, rect.height - y),
      Math.hypot(rect.width - x, rect.height - y),
    );
    const ripple = document.createElement("span");
    ripple.className = "mp-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${maxRadius * 2}px`;
    ripple.style.height = `${maxRadius * 2}px`;
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 820);
  }

  async function enterWithRoleAccount(account: PortalAccount, originEl: HTMLElement) {
    setLoading(true);
    setError("");
    switchActiveAccount(account.id);
    setSubmitDone(true);
    const origin = centerOf(originEl);
    const curtain = closeCurtain(
      origin.x,
      origin.y,
      `Đang vào cổng với quyền ${account.roleTitle}…`,
    );
    await curtain?.closed;
    const nextParam = new URLSearchParams(location.search).get("next");
    const defaultHome = account.role === "teacher" ? "/student/teacher-classes" : "/student";
    const target =
      account.role === "teacher"
        ? nextParam && nextParam.startsWith("/student/teacher-classes")
          ? nextParam
          : defaultHome
        : nextParam && nextParam.startsWith("/student") && !nextParam.startsWith("/student/teacher-classes")
          ? nextParam
          : defaultHome;
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
      setError("Mã sinh viên hoặc email chưa được đăng ký trên hệ thống.");
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
      setSubmitDone(false);
      setError(
        authError?.status === 429
          ? "Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại."
          : authError?.status && authError.status < 500
            ? "Mã sinh viên, email hoặc mật khẩu chưa đúng."
            : "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
      return;
    }

    setSubmitDone(true);
    const curtain = closeCurtain(origin.x, origin.y, "Đang vào cổng học tập…");
    try {
      const [target] = await Promise.all([destination(data.session), curtain?.closed]);
      router.push(target);
    } catch (requestError) {
      curtain?.cancel();
      setLoading(false);
      setSubmitDone(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể mở cổng học tập. Vui lòng thử lại.",
      );
    }
  }

  const describedBy = error ? "login-error" : undefined;
  const isValidIdentity =
    validation.status === "valid-student" || validation.status === "valid-email";

  return (
    <form className="login-form" method="post" onSubmit={signIn}>
      <label
        className={`field auth-field${emailFocused ? " is-focused" : ""}${emailInput ? " is-filled" : ""}${isValidIdentity ? " is-valid" : ""}`}
      >
        <span className="auth-field-head">
          <span>Mã sinh viên hoặc email</span>
          {validation.status === "valid-student" && (
            <span className="auth-field-resolved" aria-hidden="true">
              {validation.resolvedEmail}
            </span>
          )}
        </span>
        <div className="auth-input-wrap">
          <input
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            name="email"
            type="text"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              if (error) setError("");
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="Mã sinh viên hoặc email trường…"
            required
          />
          {isValidIdentity && (
            <span className="mp-valid-badge" aria-hidden="true">
              <Icon name="check" />
            </span>
          )}
        </div>
      </label>
      <div
        className={`field auth-field${passwordFocused ? " is-focused" : ""}${passwordInput ? " is-filled" : ""}`}
      >
        <label htmlFor="login-password">Mật khẩu</label>
        <div className="password-wrap">
          <input
            id="login-password"
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            name="password"
            type={showPassword ? "text" : "password"}
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              if (error) setError("");
            }}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu…"
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
        className={`button button-primary button-block mp-loading-btn${loading ? " is-loading" : ""}${submitDone ? " is-done" : ""}`}
        aria-busy={loading}
        disabled={loading}
        type="submit"
        onClick={spawnButtonRipple}
      >
        <span className="mp-btn-content">
          {loading && !submitDone && (
            <span className="mp-btn-spinner" aria-hidden="true" />
          )}
          {submitDone && (
            <span className="mp-btn-check" aria-hidden="true">
              <Icon name="check" />
            </span>
          )}
          <span>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</span>
        </span>
      </button>
    </form>
  );
}
