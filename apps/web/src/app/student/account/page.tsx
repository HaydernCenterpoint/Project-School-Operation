"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { centerOf } from "@/components/landing/SceneTransition";
import { DemoBanner, Section } from "@/components/portal/Parts";
import { initials } from "@/lib/format";
import { profile, type Field } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

/** Keeps the last 3 characters of a sensitive value visible, e.g. ••••••••678. */
const mask = (value: string) => `${"•".repeat(Math.max(0, value.length - 3))}${value.slice(-3)}`;

function Fields({ fields, reveal }: { fields: Field[]; reveal: boolean }) {
  return (
    <dl className="pt-fields">
      {fields.map((field) => (
        <div key={field.label} className={field.wide ? "is-wide" : undefined}>
          <dt>{field.label}</dt>
          <dd className={field.value ? undefined : "is-empty"}>
            {field.value ? (field.sensitive && !reveal ? <span aria-label={`${field.label} đã ẩn`}>{mask(field.value)}</span> : field.value) : "Chưa cập nhật"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AccountPage() {
  const { data, signOut } = useStudent();
  const [leaving, setLeaving] = useState(false);
  const [reveal, setReveal] = useState(false);
  if (!data) return null;
  const { user, classes } = data.session;
  const studentId = user.email?.split("@")[0] ?? "";
  const pick = (label: string) => profile.education.find((field) => field.label === label)?.value;

  const revealButton = (
    <button className="button button-outline button-small" type="button" aria-pressed={reveal} onClick={() => setReveal((value) => !value)}>
      <Icon name={reveal ? "eyeOff" : "eye"} /> {reveal ? "Ẩn thông tin nhạy cảm" : "Hiện thông tin nhạy cảm"}
    </button>
  );

  return (
    <>
      <DemoBanner />

      <section className="pt-profile">
        <span className="avatar pt-profile-avatar" aria-hidden="true">{initials(user.displayName)}</span>
        <div className="pt-profile-main">
          <h2>{user.displayName}</h2>
          <p className="pt-profile-id">
            MSSV <strong>{studentId}</strong> · {user.email}
          </p>
          <ul className="pt-profile-tags">
            <li className="is-live">{pick("Trạng thái")}</li>
            <li>{pick("Lớp")}</li>
            <li>{pick("Ngành")}</li>
            <li>Khoá {pick("Khoá học")}</li>
          </ul>
        </div>
        <div className="pt-profile-stats">
          <div><strong>{classes.length}</strong><span>Lớp đang học</span></div>
          <div><strong>{data.submissions.length}</strong><span>Bài đã nộp</span></div>
        </div>
        <Link href="/student/services" className="button button-primary button-small pt-profile-edit">
          <Icon name="pen" /> Đề xuất cập nhật
        </Link>
      </section>

      <Section title="Thông tin học vấn" icon="class">
        <Fields fields={profile.education} reveal />
      </Section>

      <Section title="Thông tin cá nhân" icon="user" action={revealButton}>
        <Fields fields={profile.personal} reveal={reveal} />
      </Section>

      <Section title="Quan hệ gia đình" icon="users">
        <div className="pt-family">
          {profile.family.map((person) => (
            <article key={person.relation}>
              <h4>{person.relation}</h4>
              <Fields fields={person.fields} reveal={reveal} />
            </article>
          ))}
        </div>
      </Section>

      <section className="pt-security">
        <span className="tile-icon"><Icon name="shield" /></span>
        <div>
          <h3>Bảo mật & quyền riêng tư</h3>
          <p>Thông tin nhạy cảm được ẩn mặc định. Cuộc trò chuyện với trợ lý AI chỉ bạn xem được và tự xoá sau 30 ngày không dùng.</p>
        </div>
        <button
          className="button button-danger"
          type="button"
          aria-busy={leaving}
          disabled={leaving}
          onClick={(event) => {
            setLeaving(true);
            void signOut(centerOf(event.currentTarget));
          }}
        >
          <Icon name="logout" /> {leaving ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
      </section>
    </>
  );
}
