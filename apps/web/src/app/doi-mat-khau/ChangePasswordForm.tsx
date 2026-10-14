"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "@/lib/supabase-browser";

/** Same-site paths only; anything else goes to the home page, which routes by role. */
function nextPath() {
  const value = new URLSearchParams(location.search).get("next");
  return (value && /^\/[\w\-/]*$/.test(value) ? value : "/login") as Route;
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  // Only signed-in users with a temporary password belong here.
  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    void getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else if (!data.session.user.app_metadata.must_change_password) router.replace(nextPath());
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      return setError("Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.");
    }
    if (password !== String(form.get("confirm"))) return setError("Hai lần nhập chưa khớp.");
    if (/^sd-/.test(password)) return setError("Hãy chọn mật khẩu khác mật khẩu tạm.");
    setBusy(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      return setError(updateError.status === 422 ? "Mật khẩu này chưa đủ mạnh hoặc trùng mật khẩu cũ." : "Không đổi được mật khẩu. Vui lòng thử lại.");
    }
    // Clear the flag, then refresh the token so the new claims apply straight away.
    await supabase.rpc("account_password_changed");
    await supabase.auth.refreshSession();
    router.replace(nextPath());
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="new-password">Mật khẩu mới</label>
        <div className="password-wrap">
          <input id="new-password" name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required aria-describedby="password-rule" />
          <button className="icon-button" type="button" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={show} onClick={() => setShow((value) => !value)}>
            <Icon name={show ? "eyeOff" : "eye"} />
          </button>
        </div>
        <small id="password-rule">Ít nhất 8 ký tự, có cả chữ và số.</small>
      </div>
      <label className="field">
        Nhập lại mật khẩu mới
        <input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" required />
      </label>
      <div aria-live="polite">{error && <p className="form-error" role="alert">{error}</p>}</div>
      <button className="button button-primary button-block" type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Đang lưu…" : "Lưu và tiếp tục"}
      </button>
    </form>
  );
}
