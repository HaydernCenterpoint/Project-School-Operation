"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { useStaff } from "@/components/admin/StaffContext";
import { Icon } from "@/components/Icon";
import { PageTitle, Section } from "@/components/portal/Parts";
import { csvColumns, readStudentCsv, students, toCsv, type ImportResult, type ParsedRow } from "@/lib/students";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

const template = toCsv([
  csvColumns.map(([column]) => column),
  ["2200401", "Nguyễn Văn An", "05/09/2006", "Nam", "DC.CNTT19.01", "Khoa Công nghệ thông tin", "Công nghệ thông tin", "K19", "0900000401", ""],
]);

export default function ImportStudents() {
  const { role } = useStaff();
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  if (role === "teacher") {
    return <p className="notice" role="status"><Icon name="info" /> Chỉ phòng ban và quản trị viên được nhập sinh viên.</p>;
  }

  const good = rows?.filter((row) => !row.problems.length) ?? [];
  const bad = rows?.filter((row) => row.problems.length) ?? [];

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    setResults(null);
    if (!chosen) return;
    if (chosen.size > 2_000_000) return setError("Tệp quá lớn (tối đa 2 MB).");
    const parsed = readStudentCsv(await chosen.text());
    setFile(chosen.name);
    setError(parsed.error ?? "");
    setRows(parsed.error ? null : parsed.rows);
  }

  async function run() {
    setBusy(true);
    try {
      const done = await students.import(good.map((row) => row.input));
      // Report against the file's own line numbers, not the position in the batch.
      setResults(done.map((item) => ({ ...item, row_no: good[item.row_no - 1]?.line ?? item.row_no })));
      setRows(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Không nhập được.");
    } finally {
      setBusy(false);
    }
  }

  const created = results?.filter((item) => item.ok) ?? [];
  return (
    <div className="ad-page">
      <PageTitle title="Nhập sinh viên từ tệp" lead="Dùng cho đầu khoá hoặc khi nhận danh sách từ phòng tuyển sinh. Mỗi lần tối đa 500 người.">
        <Link className="button button-quiet button-small" href="/quan-tri"><Icon name="back" /> Danh sách</Link>
      </PageTitle>

      <ol className="ad-steps">
        <li>
          <span className="ad-step-no" aria-hidden="true">1</span>
          <div>
            <strong>Tải tệp mẫu</strong>
            <p>Mở bằng Excel, điền mỗi sinh viên một dòng. Bắt buộc: <code>ma_sv</code>, <code>ho_ten</code>. Ngày sinh dạng dd/mm/yyyy.</p>
            <button className="button button-outline button-small" type="button" onClick={() => download("mau-nhap-sinh-vien.csv", template)}>
              <Icon name="file" /> Tải tệp mẫu (.csv)
            </button>
          </div>
        </li>
        <li>
          <span className="ad-step-no" aria-hidden="true">2</span>
          <div>
            <strong>Chọn tệp đã điền</strong>
            <p>Lưu dưới dạng CSV (UTF-8). Hệ thống kiểm tra từng dòng trước khi nhập.</p>
            <label className="button button-primary button-small ad-file">
              <Icon name="paperclip" /> Chọn tệp CSV
              <input type="file" accept=".csv,text/csv" onChange={(event) => void pick(event)} />
            </label>
            {file && <small className="ad-file-name">{file}</small>}
          </div>
        </li>
      </ol>

      {error && <p className="notice error" role="alert"><Icon name="alert" /> {error}</p>}

      {rows && (
        <Section title={`Xem trước: ${good.length} dòng hợp lệ, ${bad.length} dòng cần sửa`} icon="list"
          action={<button className="button button-primary button-small" type="button" disabled={!good.length || busy} onClick={() => void run()}>
            {busy ? "Đang tạo tài khoản…" : `Tạo ${good.length} tài khoản`}
          </button>}>
          {bad.length > 0 && <p className="pt-warn">Các dòng lỗi sẽ bị bỏ qua. Sửa trong tệp rồi chọn lại nếu cần.</p>}
          <div className="ad-table-wrap">
            <table className="ad-table ad-preview">
              <thead><tr><th scope="col">Dòng</th><th scope="col">MSSV</th><th scope="col">Họ tên</th><th scope="col">Lớp</th><th scope="col">Kiểm tra</th></tr></thead>
              <tbody>
                {[...bad, ...good].map((row, index) => (
                  <tr key={row.line} className={row.problems.length ? "is-bad" : undefined} style={{ "--i": Math.min(index, 20) } as React.CSSProperties}>
                    <td>{row.line}</td>
                    <td className="ad-code">{row.input.student_code || "—"}</td>
                    <td>{row.input.full_name || "—"}</td>
                    <td>{row.input.class_name ?? "—"}</td>
                    <td>{row.problems.length ? <span className="ad-bad">{row.problems.join(" · ")}</span> : <span className="chip success"><Icon name="check" /> Hợp lệ</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {results && (
        <Section title={`Kết quả: ${created.length} tài khoản mới, ${results.length - created.length} lỗi`} icon="checkCircle"
          action={created.length > 0 && (
            <button className="button button-primary button-small" type="button"
              onClick={() => download(`mat-khau-tam-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([["ma_sv", "mat_khau_tam"], ...created.map((item) => [item.student_code, item.temp_password])]))}>
              <Icon name="file" /> Tải danh sách mật khẩu tạm
            </button>
          )}>
          {created.length > 0 && (
            <p className="notice" role="status"><Icon name="shield" /> Mật khẩu tạm chỉ hiện trong phiên này. Hãy tải về, giao cho sinh viên rồi xoá tệp. Sinh viên phải đổi mật khẩu ở lần đăng nhập đầu.</p>
          )}
          <div className="ad-table-wrap">
            <table className="ad-table ad-preview">
              <thead><tr><th scope="col">Dòng</th><th scope="col">MSSV</th><th scope="col">Kết quả</th><th scope="col">Mật khẩu tạm</th></tr></thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={`${item.row_no}-${item.student_code}`} className={item.ok ? undefined : "is-bad"} style={{ "--i": Math.min(index, 20) } as React.CSSProperties}>
                    <td>{item.row_no}</td>
                    <td className="ad-code">{item.student_code}</td>
                    <td>{item.ok ? <span className="chip success">{item.message}</span> : <span className="ad-bad">{item.message}</span>}</td>
                    <td>{item.temp_password ? <code>{item.temp_password}</code> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
