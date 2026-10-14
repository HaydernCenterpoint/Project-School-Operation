"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useStaff } from "@/components/admin/StaffContext";
import { Icon } from "@/components/Icon";
import { Empty, PageTitle, StatTile } from "@/components/portal/Parts";
import { genders, statusLabels, students, teacherFields, validateStudent, type StudentInput, type StudentRecord, type StudentStatus } from "@/lib/students";

const statusTone: Record<StudentStatus, string> = { active: "success", suspended: "danger", graduated: "submitted", withdrawn: "warning" };
const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function Students() {
  const { role } = useStaff();
  const manage = role !== "teacher";
  const [list, setList] = useState<StudentRecord[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(useSearchParams().get("q") ?? "");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [editing, setEditing] = useState<StudentRecord | "new" | null>(null);
  const [secret, setSecret] = useState<{ name: string; code: string; password: string } | null>(null);
  const [announce, setAnnounce] = useState("");

  const load = useCallback(async () => {
    try {
      setList(await students.list());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được danh sách.");
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const q = query.trim().toLowerCase();
  const classes = [...new Set((list ?? []).map((item) => item.class_name).filter(Boolean) as string[])].sort();
  const visible = (list ?? []).filter((item) =>
    (!className || item.class_name === className)
    && (!status || item.status === status)
    && (!q || `${item.student_code} ${item.full_name} ${item.class_name ?? ""} ${item.phone ?? ""}`.toLowerCase().includes(q)));

  return (
    <div className="ad-page">
      <PageTitle
        title={manage ? "Sinh viên" : "Sinh viên lớp tôi"}
        lead={manage
          ? "Hồ sơ và tài khoản sinh viên. Tài khoản mới nhận mật khẩu tạm và phải đổi ở lần đăng nhập đầu."
          : "Sinh viên trong các lớp bạn dạy. Bạn có thể cập nhật số điện thoại, email và ghi chú."}
      >
        {manage && (
          <>
            <Link className="button button-outline button-small" href="/quan-tri/nhap"><Icon name="file" /> Nhập từ tệp</Link>
            <button className="button button-primary button-small" type="button" onClick={() => setEditing("new")}><Icon name="plus" /> Thêm sinh viên</button>
          </>
        )}
      </PageTitle>

      {list && (
        <div className="pt-stats ad-stats">
          <StatTile icon="users" label="Tổng số" value={list.length} />
          <StatTile icon="checkCircle" label="Đang học" value={list.filter((item) => item.status === "active").length} tone="good" />
          <StatTile icon="shield" label="Tạm khoá / thôi học" value={list.filter((item) => item.status === "suspended" || item.status === "withdrawn").length} tone="danger" />
          <StatTile icon="class" label="Lớp" value={classes.length} />
        </div>
      )}

      <div className="ad-toolbar">
        <label className="ad-search">
          <Icon name="search" />
          <span className="sr-only">Tìm theo mã, tên, lớp hoặc số điện thoại</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tên, lớp, số điện thoại…" />
        </label>
        <label className="ad-select">
          <span className="sr-only">Lọc theo lớp</span>
          <select value={className} onChange={(event) => setClassName(event.target.value)}>
            <option value="">Tất cả lớp</option>
            {classes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="ad-select">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StudentStatus | "")}>
            <option value="">Mọi trạng thái</option>
            {(Object.keys(statusLabels) as StudentStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <div><strong>Không tải được danh sách</strong><p>{error}</p></div>
          <button className="button button-outline button-xs" type="button" onClick={() => void load()}><Icon name="retry" /> Thử lại</button>
        </div>
      ) : !list ? (
        <div className="skeleton" style={{ height: 360 }} aria-busy="true"><span className="sr-only">Đang tải…</span></div>
      ) : visible.length === 0 ? (
        <Empty icon="users" title={list.length ? "Không có sinh viên khớp bộ lọc" : "Chưa có sinh viên"} text={list.length ? "Thử bỏ bớt bộ lọc." : manage ? "Thêm từng người hoặc nhập từ tệp CSV." : "Lớp của bạn chưa có sinh viên."} />
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <caption className="sr-only">Danh sách sinh viên, {visible.length} người</caption>
            <thead>
              <tr><th scope="col">MSSV</th><th scope="col">Họ tên</th><th scope="col">Lớp</th><th scope="col">Khoa</th><th scope="col">Điện thoại</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr>
            </thead>
            <tbody key={`${className}|${status}|${q}`}>
              {visible.map((item, index) => (
                <tr key={item.user_id} style={{ "--i": Math.min(index, 20) } as React.CSSProperties}>
                  <td className="ad-code">{item.student_code}</td>
                  <td className="ad-name">{item.full_name}{item.date_of_birth && <small>{dateFormat.format(new Date(item.date_of_birth))}</small>}</td>
                  <td>{item.class_name ?? "—"}</td>
                  <td className="ad-faculty">{item.faculty ?? "—"}</td>
                  <td>{item.phone ?? "—"}</td>
                  <td><span className={`chip ${statusTone[item.status]}`}>{statusLabels[item.status]}</span></td>
                  <td className="ad-actions">
                    <button className="button button-quiet button-xs" type="button" onClick={() => setEditing(item)} aria-label={`Xem và sửa ${item.full_name}`}>
                      <Icon name="pen" /> <span>Sửa</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentDialog
        key={`student-${editing === "new" ? "new" : (editing?.user_id ?? "none")}`}
        student={editing}
        manage={manage}
        onClose={() => setEditing(null)}
        onSaved={async (message, created) => {
          setEditing(null);
          setAnnounce(message);
          if (created) setSecret(created);
          await load();
        }}
      />
      <SecretDialog key={`secret-${secret?.password ?? "none"}`} secret={secret} onClose={() => setSecret(null)} />
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </div>
  );
}

const blank: StudentInput = { student_code: "", full_name: "" };

function StudentDialog({
  student, manage, onClose, onSaved,
}: {
  student: StudentRecord | "new" | null;
  manage: boolean;
  onClose: () => void;
  onSaved: (message: string, created?: { name: string; code: string; password: string }) => Promise<void>;
}) {
  // Keyed by student in the parent, so this state starts fresh for each one opened.
  const dialog = useRef<HTMLDialogElement>(null);
  const creating = student === "new";
  const record = student && student !== "new" ? student : null;
  const [form, setForm] = useState<StudentInput & { note?: string }>(() => record ? {
    student_code: record.student_code, full_name: record.full_name, date_of_birth: record.date_of_birth ?? "", gender: record.gender,
    class_name: record.class_name ?? "", faculty: record.faculty ?? "", major: record.major ?? "", cohort: record.cohort ?? "",
    phone: record.phone ?? "", personal_email: record.personal_email ?? "", note: record.note,
  } : blank);
  const [nextStatus, setNextStatus] = useState<StudentStatus>(record?.status ?? "active");
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student && !dialog.current?.open) dialog.current?.showModal();
  }, [student]);

  const locked = (field: keyof StudentInput | "note") => !manage && !(teacherFields as readonly string[]).includes(field);
  const set = (field: keyof StudentInput | "note") => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((value) => ({ ...value, [field]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as StudentInput & { note?: string };
    const found = validateStudent(clean);
    if (found.length) return setProblems(found);
    setBusy(true);
    try {
      if (creating) {
        const { temp_password } = await students.create(clean);
        await onSaved(`Đã tạo tài khoản cho ${clean.full_name}.`, { name: clean.full_name, code: clean.student_code, password: temp_password });
        return;
      }
      // Send only what changed, and only fields this role may touch.
      const before: Record<string, unknown> = { ...record, date_of_birth: record!.date_of_birth ?? "" };
      const patch = Object.fromEntries(Object.entries(clean).filter(([key, value]) =>
        key !== "student_code" && !locked(key as keyof StudentInput) && (value ?? "") !== (before[key] ?? "")));
      if (Object.keys(patch).length) await students.update(record!.user_id, patch);
      if (manage && nextStatus !== record!.status) await students.setStatus(record!.user_id, nextStatus);
      await onSaved(`Đã lưu hồ sơ ${clean.full_name}.`);
    } catch (saveError) {
      setProblems([saveError instanceof Error ? saveError.message : "Không lưu được."]);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!record || !window.confirm(`Cấp mật khẩu tạm mới cho ${record.full_name}? Mật khẩu cũ sẽ không dùng được nữa.`)) return;
    setBusy(true);
    try {
      const password = await students.resetPassword(record.user_id);
      await onSaved(`Đã cấp lại mật khẩu cho ${record.full_name}.`, { name: record.full_name, code: record.student_code, password });
    } catch (resetError) {
      setProblems([resetError instanceof Error ? resetError.message : "Không cấp lại được mật khẩu."]);
    } finally {
      setBusy(false);
    }
  }

  const field = (name: keyof StudentInput | "note", label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      {label}
      <input value={(form[name as keyof typeof form] as string) ?? ""} onChange={set(name)} disabled={locked(name) || (name === "student_code" && !creating)} {...props} />
    </label>
  );

  return (
    <dialog ref={dialog} className="ad-dialog" aria-labelledby="ad-student-title" onClose={onClose}>
      <form className="pt-form" onSubmit={submit} noValidate>
        <header className="ad-dialog-head">
          <h3 id="ad-student-title">{creating ? "Thêm sinh viên" : record?.full_name}</h3>
          <button className="icon-button" type="button" onClick={() => dialog.current?.close()} aria-label="Đóng"><Icon name="close" /></button>
        </header>
        {!manage && <p className="pt-muted">Giảng viên chỉ sửa được số điện thoại, email và ghi chú.</p>}
        <div className="ad-grid">
          {field("student_code", "Mã sinh viên", { required: true, inputMode: "numeric", pattern: "\\d{5,12}", autoComplete: "off" })}
          {field("full_name", "Họ và tên", { required: true, maxLength: 80, autoComplete: "off" })}
          {field("date_of_birth", "Ngày sinh", { type: "date" })}
          <label className="field">
            Giới tính
            <select value={form.gender ?? ""} onChange={set("gender")} disabled={locked("gender")}>
              <option value="">Chưa rõ</option>
              {genders.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          {field("class_name", "Lớp", { maxLength: 40, placeholder: "DC.CNTT17.10" })}
          {field("cohort", "Khoá", { maxLength: 10, placeholder: "K17" })}
          {field("faculty", "Khoa", { maxLength: 80 })}
          {field("major", "Ngành", { maxLength: 80 })}
          {field("phone", "Điện thoại", { type: "tel", maxLength: 16 })}
          {field("personal_email", "Email cá nhân", { type: "email", maxLength: 120 })}
        </div>
        {!creating && (
          <label className="field">
            Ghi chú nội bộ
            <textarea value={form.note ?? ""} onChange={set("note")} maxLength={500} rows={2} />
          </label>
        )}
        {manage && !creating && (
          <label className="field">
            Trạng thái
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as StudentStatus)}>
              {(Object.keys(statusLabels) as StudentStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
            </select>
            <small>Tạm khoá hoặc thôi học: sinh viên không đăng nhập được nữa.</small>
          </label>
        )}
        {problems.length > 0 && (
          <ul className="ad-problems" role="alert">{problems.map((item) => <li key={item}>{item}</li>)}</ul>
        )}
        <div className="pt-form-actions">
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Đang lưu…" : creating ? "Tạo tài khoản" : "Lưu"}</button>
          <button className="button button-quiet" type="button" onClick={() => dialog.current?.close()}>Huỷ</button>
          {manage && !creating && (
            <button className="button button-outline ad-push" type="button" onClick={() => void reset()} disabled={busy}>
              <Icon name="shield" /> Cấp lại mật khẩu
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

function SecretDialog({ secret, onClose }: { secret: { name: string; code: string; password: string } | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (secret && !dialog.current?.open) dialog.current?.showModal();
  }, [secret]);

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(`Mã sinh viên: ${secret.code}\nMật khẩu tạm: ${secret.password}`);
    setCopied(true);
  }

  return (
    <dialog ref={dialog} className="ad-dialog ad-secret" aria-labelledby="ad-secret-title" onClose={onClose}>
      {secret && (
        <>
          <span className="ad-secret-icon" aria-hidden="true"><Icon name="shield" /></span>
          <h3 id="ad-secret-title">Mật khẩu tạm của {secret.name}</h3>
          <p className="pt-muted">Chỉ hiện một lần. Hãy giao trực tiếp cho sinh viên; họ sẽ phải đổi mật khẩu khi đăng nhập lần đầu.</p>
          <dl className="ad-secret-box">
            <dt>Mã sinh viên</dt><dd>{secret.code}</dd>
            <dt>Mật khẩu tạm</dt><dd><code>{secret.password}</code></dd>
          </dl>
          <div className="pt-form-actions">
            <button className="button button-outline" type="button" onClick={() => void copy()}><Icon name={copied ? "check" : "copy"} /> {copied ? "Đã chép" : "Chép"}</button>
            <button className="button button-primary" type="button" onClick={() => dialog.current?.close()}>Đã ghi lại</button>
          </div>
        </>
      )}
    </dialog>
  );
}

export default function ManagementHome() {
  return (
    <Suspense>
      <Students />
    </Suspense>
  );
}
