// CSV import helpers for student records. No runtime imports, so the logic runs under a plain
// `node --test` (tests/unit/student-csv.test.mts).
import type { StudentInput } from "./students";

export const genders = ["Nam", "Nữ", "Khác"] as const;

/** Column headers of the import template, in order, with the record field each fills. */
export const csvColumns = [
  ["ma_sv", "student_code"],
  ["ho_ten", "full_name"],
  ["ngay_sinh", "date_of_birth"],
  ["gioi_tinh", "gender"],
  ["lop", "class_name"],
  ["khoa", "faculty"],
  ["nganh", "major"],
  ["khoa_hoc", "cohort"],
  ["dien_thoai", "phone"],
  ["email", "personal_email"],
] as const;

/**
 * RFC 4180-style parser: quoted fields, doubled quotes, CRLF, a UTF-8 BOM, and either comma or
 * semicolon separators (Excel in Vietnamese locale saves with semicolons).
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === separator) { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

/** Quotes a cell only when needed, and guards against spreadsheet formula injection. */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

/** dd/mm/yyyy (what staff type) or yyyy-mm-dd → yyyy-mm-dd; null when it is not a real date. */
export function toIsoDate(value: string): string | null {
  const text = value.trim();
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = text.includes("-") && match[1]!.length === 4 ? [match[1], match[2], match[3]] : [match[3], match[2], match[1]];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCDate() === Number(day) && date.getUTCMonth() === Number(month) - 1 ? date.toISOString().slice(0, 10) : null;
}

/** Same rules as the database, checked early so staff see every problem before importing. */
export function validateStudent(input: StudentInput): string[] {
  const problems: string[] = [];
  if (!/^\d{5,12}$/.test(input.student_code)) problems.push("Mã sinh viên phải gồm 5–12 chữ số");
  if (input.full_name.trim().length < 2 || input.full_name.trim().length > 80) problems.push("Họ tên cần 2–80 ký tự");
  if (input.gender && !(genders as readonly string[]).includes(input.gender)) problems.push("Giới tính là Nam, Nữ hoặc Khác");
  if (input.phone && !/^\+?[0-9][0-9 .-]{7,14}$/.test(input.phone)) problems.push("Số điện thoại chưa đúng");
  if (input.personal_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.personal_email)) problems.push("Email chưa đúng");
  if (input.date_of_birth && new Date(input.date_of_birth) > new Date(Date.now() - 14 * 365.25 * 864e5)) problems.push("Ngày sinh chưa đúng");
  return problems;
}

export type ParsedRow = { line: number; input: StudentInput; problems: string[] };

/** CSV text → rows ready to import, each with its own list of problems. */
export function readStudentCsv(text: string): { rows: ParsedRow[]; error?: string } {
  const [header, ...body] = parseCsv(text);
  if (!header) return { rows: [], error: "Tệp trống." };
  const names = header.map((cell) => cell.trim().toLowerCase());
  const index = new Map(csvColumns.map(([column, field]) => [field, names.indexOf(column)]));
  if (index.get("student_code")! < 0 || index.get("full_name")! < 0) {
    return { rows: [], error: "Thiếu cột ma_sv hoặc ho_ten. Hãy dùng tệp mẫu." };
  }
  const seen = new Set<string>();
  const rows = body.map((cells, offset) => {
    const value = (field: string) => (index.get(field as never)! >= 0 ? (cells[index.get(field as never)!] ?? "").trim() : "");
    const birthText = value("date_of_birth");
    const birth = birthText ? toIsoDate(birthText) : null;
    const input: StudentInput = { student_code: value("student_code"), full_name: value("full_name").replace(/\s+/g, " ") };
    for (const field of ["gender", "class_name", "faculty", "major", "cohort", "phone", "personal_email"] as const) {
      if (value(field)) input[field] = value(field) as never;
    }
    if (birth) input.date_of_birth = birth;
    const problems = validateStudent(input);
    if (birthText && !birth) problems.push("Ngày sinh phải là dd/mm/yyyy");
    if (seen.has(input.student_code)) problems.push("Trùng mã với một dòng phía trên");
    seen.add(input.student_code);
    return { line: offset + 2, input, problems };
  });
  if (rows.length > 500) return { rows: [], error: "Mỗi lần nhập tối đa 500 sinh viên. Hãy chia nhỏ tệp." };
  return { rows };
}
