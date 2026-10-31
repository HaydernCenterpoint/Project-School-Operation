"use client";

import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { centerOf } from "@/components/landing/SceneTransition";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import { avatarPresets, cropAvatarFile } from "@/lib/avatar";
import { initials } from "@/lib/format";
import { courses, profile, semester, terms, type Field } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

/** Keeps the last 3 characters of a sensitive value visible, e.g. •••••••••642. */
const mask = (value: string) => `${"•".repeat(Math.max(0, value.length - 3))}${value.slice(-3)}`;

function DossierFields({ fields, reveal }: { fields: Field[]; reveal: boolean }) {
  return (
    <dl className="acc-fields">
      {fields.map((field) => {
        const isMasked = Boolean(field.value && field.sensitive && !reveal);
        const useMono = Boolean(field.mono || isMasked);
        return (
          <div key={field.label} className={field.wide ? "is-wide" : undefined}>
            <dt>
              <span>{field.label}</span>
              {field.sensitive && <small className="acc-field-badge">Bảo mật</small>}
            </dt>
            <dd className={`${field.value ? "" : "is-empty"}${useMono ? " is-mono" : ""}`}>
              {field.value ? (
                isMasked ? (
                  <span aria-label={`${field.label} đã ẩn`}>{mask(field.value)}</span>
                ) : (
                  field.value
                )
              ) : (
                "Chưa bổ sung"
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function AccountPage() {
  const { data, avatarUrl, setAvatarUrl, account, roster, signOut } = useStudent();
  const [leaving, setLeaving] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!data) return null;

  const { classes } = data.session;
  const pick = (label: string) => profile.education.find((field) => field.label === label)?.value;

  const completedCredits = terms
    .flatMap((term) => term.rows)
    .reduce((sum, row) => sum + row.credits, 0);
  const currentTermCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  const educationFields: Field[] =
    account.role === "teacher"
      ? [
          { label: "Trạng thái công tác", value: "Đang giảng dạy" },
          { label: "Mã giảng viên", value: account.code, mono: true },
          { label: "Học vị / Chức danh", value: "Thạc sĩ · Giảng viên chính" },
          { label: "Lớp cố vấn học tập", value: account.cohortClass, mono: true },
          { label: "Cơ sở công tác", value: "Cơ sở 1 · Chí Linh, Hải Dương" },
          { label: "Đơn vị quản lý", value: account.department },
          { label: "Học phần phụ trách", value: "IT3040 (Lập trình hướng đối tượng), IT3160 (Kiểm thử phần mềm)" },
          { label: "Sĩ số lớp chủ nhiệm", value: `${roster.length} sinh viên thuộc lớp ${account.cohortClass}`, mono: true },
        ]
      : profile.education.map((field) => {
          if (field.label === "Mã hồ sơ") return { ...field, value: `22SDU.CNTT.${account.code.slice(-4)}` };
          if (field.label === "Lớp niên chế") return { ...field, value: account.cohortClass };
          if (field.label === "Cố vấn học tập") return { ...field, value: account.advisorName };
          return field;
        });

  const personalFields: Field[] = profile.personal.map((field) => {
    if (field.label === "Điện thoại liên hệ") return { ...field, value: account.phone };
    return field;
  });

  const allFields = [
    ...educationFields,
    ...personalFields,
    ...profile.family.flatMap((person) => person.fields),
  ];
  const filledCount = allFields.filter((field) => Boolean(field.value)).length;
  const completionPct = Math.round((filledCount / allFields.length) * 100);

  async function onAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSavingAvatar(true);
    setAvatarError("");
    try {
      const cropped = await cropAvatarFile(file);
      await setAvatarUrl(cropped);
      setAvatarNotice("Đã lưu ảnh đại diện — đồng bộ trên toàn cổng");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Không thể cập nhật ảnh đại diện");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function selectPresetAvatar(dataUrl: string, label: string) {
    setSavingAvatar(true);
    setAvatarError("");
    try {
      await setAvatarUrl(dataUrl);
      setAvatarNotice(`Đã chọn mẫu "${label}" — đồng bộ trên toàn cổng`);
    } finally {
      setSavingAvatar(false);
    }
  }

  async function clearCustomAvatar() {
    setSavingAvatar(true);
    setAvatarError("");
    try {
      await setAvatarUrl(null);
      setAvatarNotice("Đã khôi phục chữ cái viết tắt mặc định");
    } finally {
      setSavingAvatar(false);
    }
  }

  const revealButton = (
    <button
      className="acc-reveal-btn"
      type="button"
      aria-pressed={reveal}
      onClick={() => setReveal((value) => !value)}
    >
      <Icon name={reveal ? "eyeOff" : "eye"} />
      <span>{reveal ? "Ẩn dữ liệu bảo mật" : "Hiện dữ liệu bảo mật"}</span>
    </button>
  );

  return (
    <>
      <DemoBanner />

      <PageTitle
        title={account.role === "teacher" ? "Hồ sơ giảng viên" : "Thông tin tài khoản"}
        lead={`${account.positionLabel} · Quản lý thông tin định danh, hồ sơ học vụ và liên hệ cá nhân`}
      >
        <div className="reg-window is-open" role="note">
          <span className="reg-window-dot" aria-hidden="true" />
          <span>
            Vai trò hiện tại · <strong>{account.roleTitle}</strong>
          </span>
        </div>
      </PageTitle>

      <div className="acc-overview">
        <article className="acc-id-card" aria-label="Thẻ định danh điện tử">
          <header className="acc-id-head">
            <div className="acc-id-school">
              <span className="acc-id-seal" aria-hidden="true">SDU</span>
              <div>
                <strong>Trường Đại học Sao Đỏ</strong>
                <span>
                  {account.role === "teacher"
                    ? "Thẻ giảng viên & cố vấn học tập"
                    : account.role === "club_leader"
                      ? "Thẻ sinh viên · Ban chủ nhiệm CLB"
                      : "Thẻ sinh viên điện tử · hệ chính quy"}
                </span>
              </div>
            </div>
            <span className="acc-id-status">
              <i aria-hidden="true" />
              {account.role === "teacher" ? "Giảng viên cơ hữu" : pick("Trạng thái học vụ") ?? "Đang học"}
            </span>
          </header>

          <div className="acc-id-body">
            <button
              type="button"
              className="acc-id-photo"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingAvatar}
              title="Nhấn để tải ảnh thẻ / ảnh đại diện mới"
              aria-label="Đổi ảnh đại diện từ máy tính"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={`Ảnh đại diện của ${account.displayName}`} className="acc-id-photo-img" />
              ) : (
                <span>{initials(account.displayName)}</span>
              )}
              <small>
                <Icon name="image" /> Đổi ảnh
              </small>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onAvatarFileChange}
            />

            <div className="acc-id-identity">
              <h3>{account.displayName}</h3>
              <p className="acc-id-email">{account.email}</p>
              <dl className="acc-id-grid">
                <div>
                  <dt>{account.role === "teacher" ? "Mã giảng viên" : "Mã sinh viên"}</dt>
                  <dd>{account.code}</dd>
                </div>
                <div>
                  <dt>{account.role === "teacher" ? "Lớp chủ nhiệm" : "Lớp niên chế"}</dt>
                  <dd>{account.cohortClass}</dd>
                </div>
                <div>
                  <dt>Vai trò</dt>
                  <dd className="is-sans">{account.roleTitle}</dd>
                </div>
                <div>
                  <dt>Cố vấn học tập</dt>
                  <dd className="is-sans">{account.advisorName}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="acc-avatar-bar" role="group" aria-label="Tuỳ chỉnh ảnh đại diện">
            <div className="acc-avatar-controls">
              <button
                type="button"
                className="acc-avatar-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingAvatar}
              >
                <Icon name="image" />
                <span>{savingAvatar ? "Đang xử lý…" : "Tải ảnh lên"}</span>
              </button>
              <div className="acc-avatar-presets" role="group" aria-label="Mẫu ảnh đại diện SDU">
                {avatarPresets.map((preset) => {
                  const active = avatarUrl === preset.dataUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`acc-preset-swatch${active ? " is-active" : ""}`}
                      onClick={() => void selectPresetAvatar(preset.dataUrl, preset.label)}
                      title={`Chọn mẫu: ${preset.label}`}
                      aria-label={`Chọn mẫu ${preset.label}`}
                      aria-pressed={active}
                    >
                      <img src={preset.dataUrl} alt="" />
                    </button>
                  );
                })}
              </div>
              {avatarUrl && (
                <button
                  type="button"
                  className="acc-avatar-reset"
                  onClick={() => void clearCustomAvatar()}
                  disabled={savingAvatar}
                >
                  Mặc định
                </button>
              )}
            </div>
            {(avatarError || avatarNotice) && (
              <p className={`acc-avatar-msg${avatarError ? " is-error" : ""}`} role="status">
                {avatarError || avatarNotice}
              </p>
            )}
          </div>

          <footer className="acc-id-foot">
            <span>
              Mã định danh: <code>{account.code}</code>
            </span>
            <span>{pick("Cơ sở đào tạo")}</span>
          </footer>
        </article>

        <section className="acc-summary-card" aria-label="Tổng quan hồ sơ và thao tác">
          <div className="reg-quota-head">
            <div>
              <span className="reg-label">Độ hoàn thiện hồ sơ điện tử</span>
              <p className="reg-figure">
                <strong>{filledCount}</strong>
                <span>/ {allFields.length} trường thông tin ({completionPct}%)</span>
              </p>
            </div>
            <span className="reg-standing good">{semester.short}</span>
          </div>

          <div
            className="reg-meter"
            role="img"
            aria-label={`Đã cập nhật ${filledCount} trên ${allFields.length} trường hồ sơ`}
          >
            <span className="reg-meter-current" style={{ width: `${completionPct}%` }} />
          </div>

          <dl className="acc-stat-strip">
            <div>
              <dt>{account.role === "teacher" ? "Lớp phụ trách" : "Lớp đang học"}</dt>
              <dd>{classes.length}</dd>
            </div>
            <div>
              <dt>{account.role === "teacher" ? "SV thuộc lớp" : "Tín chỉ kỳ này"}</dt>
              <dd>{account.role === "teacher" ? `${roster.length} SV` : `${currentTermCredits} TC`}</dd>
            </div>
            <div>
              <dt>{account.role === "club_leader" ? "CLB quản lý" : "Tín chỉ tích lũy"}</dt>
              <dd>{account.role === "club_leader" ? "CLB Tin học" : `${completedCredits} TC`}</dd>
            </div>
            <div>
              <dt>{account.role === "teacher" ? "Bài nộp của lớp" : "Bài tập đã nộp"}</dt>
              <dd>{data.submissions.length}</dd>
            </div>
          </dl>

          <div className="acc-summary-actions">
            {revealButton}
            <Link href={"/student/profile-update" as import("next").Route} className="acc-reveal-btn">
              <Icon name="pen" />
              <span>Đề xuất cập nhật thông tin</span>
            </Link>
            <Link href="/doi-mat-khau" className="acc-reveal-btn">
              <Icon name="shield" />
              <span>Đổi mật khẩu</span>
            </Link>
            <Link href={"/student/settings" as import("next").Route} className="acc-edit-link">
              <Icon name="sparkle" />
              <span>Cài đặt giao diện</span>
            </Link>
          </div>
        </section>
      </div>

      <Section
        title={account.role === "teacher" ? "Thông tin công tác & lớp chủ nhiệm" : "Thông tin học vấn"}
        action={<span className="reg-table-meta">{educationFields.length} mục</span>}
      >
        <DossierFields fields={educationFields} reveal />
      </Section>

      <Section title="Thông tin cá nhân" action={revealButton}>
        <DossierFields fields={personalFields} reveal={reveal} />
      </Section>

      {account.role !== "teacher" && (
        <Section
          title="Quan hệ gia đình"
          action={<span className="reg-table-meta">{profile.family.length} người thân</span>}
        >
          <div className="acc-family-ledger">
            {profile.family.map((person) => (
              <article key={person.relation} className="acc-family-col">
                <header className="acc-family-head">
                  <div className="acc-family-title">
                    <span className="acc-family-dot" aria-hidden="true" />
                    <strong>{person.relation}</strong>
                    <span className="acc-family-role">{person.role}</span>
                  </div>
                  <code className="acc-family-year">Sinh năm {person.birthYear}</code>
                </header>
                <DossierFields fields={person.fields} reveal={reveal} />
              </article>
            ))}
          </div>
        </Section>
      )}

      <section className="acc-security" aria-label="Bảo mật và phiên đăng nhập">
        <div className="acc-security-main">
          <div className="acc-security-head">
            <span className="acc-security-dot" aria-hidden="true" />
            <h3>Bảo mật & quyền riêng tư</h3>
          </div>
          <p>
            Số CCCD và điện thoại liên hệ được che mặc định trên màn hình; quyền thao tác trên lớp học và câu lạc bộ được kiểm soát theo vai trò <strong>{account.roleTitle}</strong>.
          </p>
          <ul className="acc-security-meta">
            <li>
              <span>Định danh</span>
              <code>{account.email}</code>
            </li>
            <li>
              <span>Chế độ hiển thị</span>
              <code>{reveal ? "Đang hiện số đầy đủ" : "Đang ẩn 9 ký tự đầu"}</code>
            </li>
          </ul>
        </div>
        <button
          className="button button-danger acc-signout-btn"
          type="button"
          aria-busy={leaving}
          disabled={leaving}
          onClick={(event) => {
            setLeaving(true);
            void signOut(centerOf(event.currentTarget));
          }}
        >
          <Icon name="logout" />
          <span>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</span>
        </button>
      </section>
    </>
  );
}
