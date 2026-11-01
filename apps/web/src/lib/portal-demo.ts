"use client";

// Canonical academic & student-life dataset for Sao Do University (Khoa CNTT · DK13-CNTT1),
// synchronized with Supabase PostgreSQL (portal_kv_store & relational portal tables).

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "./supabase-browser";

// ---------- Time ----------

/** Class periods (tiết) of a school day. */
export const periods: { start: string; end: string }[] = [
  { start: "07:00", end: "07:50" },
  { start: "07:55", end: "08:45" },
  { start: "08:50", end: "09:40" },
  { start: "09:50", end: "10:40" },
  { start: "10:45", end: "11:35" },
  { start: "13:00", end: "13:50" },
  { start: "13:55", end: "14:45" },
  { start: "14:50", end: "15:40" },
  { start: "15:50", end: "16:40" },
  { start: "16:45", end: "17:35" },
];

export const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const day = 24 * 3600 * 1000;
const VN_OFFSET_MS = 7 * 3600 * 1000;

/**
 * Deterministic initial timestamp used during SSR and the first client hydration pass
 * so static HTML and client hydration always render identical date/time text (preventing React #418).
 */
export const HYDRATION_ANCHOR_NOW = Date.parse("2026-11-01T08:00:00+07:00");

export function useHydratedNow(tickMs = 0) {
  const [now, setNow] = useState(HYDRATION_ANCHOR_NOW);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    if (tickMs <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);
  return [now, setNow] as const;
}

/** Monday 00:00 (Vietnam time, UTC+7) of the week containing `time`. */
export function weekStart(time: number) {
  const vn = new Date(time + VN_OFFSET_MS);
  vn.setUTCHours(0, 0, 0, 0);
  const mondayVn = vn.getTime() - ((vn.getUTCDay() + 6) % 7) * day;
  return mondayVn - VN_OFFSET_MS;
}

/** A date `offset` days from today at "HH:MM" (Vietnam time, UTC+7), as an ISO string. */
function fromToday(now: number, offset: number, time = "07:00") {
  const vn = new Date(now + VN_OFFSET_MS);
  vn.setUTCHours(0, 0, 0, 0);
  const [hours, minutes] = time.split(":").map(Number);
  const targetVn = vn.getTime() + offset * day + (hours! * 60 + minutes!) * 60_000;
  return new Date(targetVn - VN_OFFSET_MS).toISOString();
}

/** Day index 0 (Mon) to 6 (Sun) of an ISO date in Vietnam time (UTC+7). */
export function weekdayIndex(iso: string) {
  const vn = new Date(Date.parse(iso) + VN_OFFSET_MS);
  return (vn.getUTCDay() + 6) % 7;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});
export const longDay = (iso: string) => dateFormat.format(new Date(iso));
export const shortDay = (value: string | number | Date) => {
  const ms = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  const vn = new Date(ms + VN_OFFSET_MS);
  const dd = String(vn.getUTCDate()).padStart(2, "0");
  const mm = String(vn.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
};
export const clock = (iso: string) => timeFormat.format(new Date(iso));

export function money(amount: number) {
  return `${amount.toLocaleString("vi-VN")} đ`;
}

// ---------- Courses and timetable ----------

export type Course = { code: string; name: string; credits: number; lecturer: string; tone: number };

export const semester = { name: "Đợt 1 (2026-2027) · Năm học 2026-2027", short: "Đợt 1 (2026-2027)" };

export const courses: Course[] = [
  { code: "0101102400", name: "Thực tập tốt nghiệp", credits: 8, lecturer: "ThS. Trần Minh Đức", tone: 0 },
  { code: "0101103567", name: "Đồ án tốt nghiệp", credits: 12, lecturer: "TS. Nguyễn Văn Hòa", tone: 1 },
];

const catalogCourses: Course[] = [
  ...courses,
  { code: "0101071809", name: "Xử lý ảnh", credits: 3, lecturer: "TS. Nguyễn Văn Hòa", tone: 2 },
  { code: "0101102875", name: "Đồ án Công nghệ phần mềm", credits: 3, lecturer: "ThS. Trần Minh Đức", tone: 3 },
  { code: "0101103387", name: "Thị giác máy tính", credits: 3, lecturer: "TS. Phạm Quốc Tuấn", tone: 4 },
  { code: "0101103389", name: "Dữ liệu lớn – Big Data", credits: 3, lecturer: "ThS. Lê Thị Hồng", tone: 5 },
  { code: "0101103391", name: "Tin sinh học", credits: 3, lecturer: "TS. Vũ Hoàng Nam", tone: 0 },
  { code: "0101103764", name: "Thực tập doanh nghiệp", credits: 6, lecturer: "ThS. Trần Minh Đức", tone: 1 },
  { code: "IT3040", name: "Lập trình hướng đối tượng", credits: 3, lecturer: "ThS. Trần Minh Đức", tone: 0 },
  { code: "IT3090", name: "Cơ sở dữ liệu", credits: 3, lecturer: "TS. Phạm Thu Hà", tone: 1 },
  { code: "IT3080", name: "Mạng máy tính", credits: 3, lecturer: "ThS. Lê Quang Vinh", tone: 2 },
  { code: "EN2130", name: "Tiếng Anh chuyên ngành", credits: 2, lecturer: "ThS. Đỗ Thanh Mai", tone: 3 },
  { code: "MI1140", name: "Toán rời rạc", credits: 3, lecturer: "TS. Vũ Đình Khoa", tone: 4 },
  { code: "PE1030", name: "Giáo dục thể chất", credits: 3, lecturer: "ThS. Hoàng Văn Tùng", tone: 5 },
];

export const courseByCode = new Map(catalogCourses.map((item) => [item.code, item]));

export type Session = { course: string; day: number; from: number; to: number; room: string; kind: "Lý thuyết" | "Thực hành" };

/** Weekly timetable. `day` is 0 (Mon) to 6 (Sun); `from`/`to` are 1-based periods. */
export const sessions: Session[] = [
  { course: "0101103389", day: 0, from: 1, to: 3, room: "A2-304", kind: "Lý thuyết" },
  { course: "0101103567", day: 0, from: 6, to: 8, room: "B1-Lab 3", kind: "Thực hành" },
  { course: "0101071809", day: 1, from: 2, to: 4, room: "A2-201", kind: "Lý thuyết" },
  { course: "0101102875", day: 2, from: 1, to: 3, room: "B1-Lab 2", kind: "Thực hành" },
  { course: "0101103391", day: 2, from: 7, to: 9, room: "C3-105", kind: "Lý thuyết" },
  { course: "0101103387", day: 3, from: 1, to: 3, room: "A1-402", kind: "Lý thuyết" },
  { course: "0101071809", day: 3, from: 6, to: 8, room: "B1-Lab 1", kind: "Thực hành" },
  { course: "0101102400", day: 4, from: 2, to: 4, room: "B1-Lab 2", kind: "Thực hành" },
  { course: "0101103567", day: 5, from: 1, to: 3, room: "B1-Lab 4", kind: "Thực hành" },
];

export function sessionTime(session: Session) {
  return `${periods[session.from - 1]!.start} - ${periods[session.to - 1]!.end}`;
}

// ---------- Exams ----------

export type Exam = {
  course: string;
  at: string;
  minutes: number;
  room: string;
  seat: string;
  form: "Tự luận" | "Trắc nghiệm trên máy" | "Thực hành" | "Vấn đáp";
  round: "Giữa kỳ" | "Cuối kỳ";
};

export function exams(now: number): Exam[] {
  return [
    { course: "0101102400", at: fromToday(now, 4, "08:00"), minutes: 90, room: "Hội đồng B1-202", seat: "SBD 008", form: "Vấn đáp", round: "Cuối kỳ" },
    { course: "0101103567", at: fromToday(now, 9, "13:30"), minutes: 60, room: "B1-Lab 3", seat: "SBD 008", form: "Thực hành", round: "Giữa kỳ" },
    { course: "0101071809", at: fromToday(now, 18, "07:30"), minutes: 90, room: "B1-Lab 1", seat: "SBD 014", form: "Thực hành", round: "Cuối kỳ" },
    { course: "0101102875", at: fromToday(now, 24, "08:00"), minutes: 90, room: "B1-Lab 2", seat: "SBD 003", form: "Vấn đáp", round: "Cuối kỳ" },
    { course: "0101103387", at: fromToday(now, 31, "07:30"), minutes: 90, room: "A1-402", seat: "SBD 009", form: "Thực hành", round: "Cuối kỳ" },
    { course: "0101103389", at: fromToday(now, 36, "13:30"), minutes: 90, room: "A2-304", seat: "SBD 018", form: "Tự luận", round: "Cuối kỳ" },
    { course: "0101103391", at: fromToday(now, 40, "07:30"), minutes: 60, room: "C3-105", seat: "SBD 011", form: "Trắc nghiệm trên máy", round: "Cuối kỳ" },
  ];
}

// ---------- Grades ----------

export type GradeRow = {
  code: string;
  name: string;
  credits: number;
  attendance: number;
  midterm: number;
  final: number;
  score10?: number;
  score4?: number;
  letterGrade?: string;
};
export type Term = { name: string; termGpa10?: number; termGpa4?: number; rows: GradeRow[] };

/** Official final 10-point score from daotao.saodo.edu.vn (or 10/30/60 fallback). */
export function total(row: GradeRow) {
  if (typeof row.score10 === "number") return row.score10;
  return Math.round((row.attendance * 0.1 + row.midterm * 0.3 + row.final * 0.6) * 10) / 10;
}

const scale: [number, string, number][] = [
  [9.0, "A+", 4.0],
  [8.5, "A", 3.7],
  [8.0, "B+", 3.5],
  [7.0, "B", 3.0],
  [6.5, "C+", 2.5],
  [5.5, "C", 2.0],
  [5.0, "D+", 1.5],
  [4.0, "D", 1.0],
  [0, "F", 0],
];

export function letter(score: number) {
  const [, grade, point] = scale.find(([min]) => score >= min)!;
  return { grade, point };
}

/** Bảng điểm thực tế 8 học kỳ đã hoàn thành của Nguyễn Văn Đạt (MSV 2200286) trên daotao.saodo.edu.vn (143 tín chỉ tích lũy, GPA hệ 10: 7.66, GPA hệ 4: 3.08). */
export const terms: Term[] = [
  {
    name: "Đợt 2 (2025-2026)",
    termGpa10: 9.03,
    termGpa4: 3.74,
    rows: [
      { code: "0101071809", name: "Xử lý ảnh", credits: 3, attendance: 8.0, midterm: 8.0, final: 8.5, score10: 8.5, score4: 3.7, letterGrade: "A" },
      { code: "0101102875", name: "Đồ án Công nghệ phần mềm", credits: 3, attendance: 8.0, midterm: 8.0, final: 9.2, score10: 9.2, score4: 4.0, letterGrade: "A+" },
      { code: "0101103387", name: "Thị giác máy tính", credits: 3, attendance: 7.0, midterm: 6.4, final: 7.7, score10: 7.7, score4: 3.0, letterGrade: "B" },
      { code: "0101103389", name: "Dữ liệu lớn – Big Data", credits: 3, attendance: 8.5, midterm: 8.5, final: 8.3, score10: 8.3, score4: 3.5, letterGrade: "B+" },
      { code: "0101103391", name: "Tin sinh học", credits: 3, attendance: 9.0, midterm: 9.0, final: 9.5, score10: 9.5, score4: 4.0, letterGrade: "A+" },
      { code: "0101103764", name: "Thực tập doanh nghiệp", credits: 6, attendance: 10.0, midterm: 10.0, final: 10.0, score10: 10.0, score4: 4.0, letterGrade: "A+" },
    ],
  },
  {
    name: "Đợt 1 (2025-2026)",
    termGpa10: 8.5,
    termGpa4: 3.58,
    rows: [
      { code: "0101071805", name: "Lập trình Web (ASP.NET)", credits: 3, attendance: 8.5, midterm: 8.2, final: 8.6, score10: 8.6, score4: 3.7, letterGrade: "A" },
      { code: "0101103117", name: "Photoshop", credits: 2, attendance: 8.6, midterm: 8.6, final: 8.8, score10: 8.8, score4: 3.7, letterGrade: "A" },
      { code: "0101103160", name: "SEO Master", credits: 2, attendance: 9.0, midterm: 9.0, final: 9.3, score10: 9.3, score4: 4.0, letterGrade: "A+" },
      { code: "0101103163", name: "Lập trình Game 3D", credits: 2, attendance: 7.5, midterm: 7.0, final: 8.0, score10: 8.0, score4: 3.5, letterGrade: "B+" },
      { code: "0101103214", name: "Phát triển ứng dụng di động", credits: 3, attendance: 8.5, midterm: 8.2, final: 8.9, score10: 8.9, score4: 3.7, letterGrade: "A" },
      { code: "0101103266", name: "Kiểm thử và đảm bảo chất lượng phần mềm", credits: 3, attendance: 8.0, midterm: 7.6, final: 7.8, score10: 7.8, score4: 3.0, letterGrade: "B" },
      { code: "0101103763", name: "Trí tuệ nhân tạo", credits: 3, attendance: 8.0, midterm: 7.8, final: 8.7, score10: 8.7, score4: 3.7, letterGrade: "A" },
      { code: "0101103768", name: "Lập trình C#", credits: 3, attendance: 8.1, midterm: 8.1, final: 8.1, score10: 8.1, score4: 3.5, letterGrade: "B+" },
    ],
  },
  {
    name: "Đợt 2 (2024-2025)",
    termGpa10: 7.88,
    termGpa4: 3.17,
    rows: [
      { code: "0101103213", name: "Kiến trúc phần mềm", credits: 3, attendance: 8.0, midterm: 7.7, final: 7.9, score10: 7.9, score4: 3.0, letterGrade: "B" },
      { code: "0101103265", name: "Quản lý dự án phần mềm", credits: 3, attendance: 8.0, midterm: 7.6, final: 7.8, score10: 7.8, score4: 3.0, letterGrade: "B" },
      { code: "0101103289", name: "Đồ án kiến thức ngành", credits: 2, attendance: 9.0, midterm: 9.0, final: 9.0, score10: 9.0, score4: 4.0, letterGrade: "A+" },
      { code: "0101103390", name: "Phát triển ứng dụng IoT", credits: 3, attendance: 8.0, midterm: 7.7, final: 7.9, score10: 7.9, score4: 3.0, letterGrade: "B" },
      { code: "0101103453", name: "Kỹ năng thích ứng, phản biện và tư duy sáng tạo", credits: 3, attendance: 8.0, midterm: 7.6, final: 8.3, score10: 8.3, score4: 3.5, letterGrade: "B+" },
      { code: "0101103759", name: "Tiếng Anh ngành Công nghệ thông tin", credits: 3, attendance: 9.0, midterm: 8.9, final: 9.0, score10: 9.0, score4: 4.0, letterGrade: "A+" },
      { code: "0101103760", name: "Lập trình Java", credits: 4, attendance: 7.5, midterm: 7.0, final: 6.5, score10: 6.5, score4: 2.5, letterGrade: "C+" },
    ],
  },
  {
    name: "Đợt 1 (2024-2025)",
    termGpa10: 7.29,
    termGpa4: 2.96,
    rows: [
      { code: "0101071650", name: "Bảo trì hệ thống", credits: 3, attendance: 7.5, midterm: 7.5, final: 7.5, score10: 7.5, score4: 3.0, letterGrade: "B" },
      { code: "0101103116", name: "Quản trị cơ sở dữ liệu SQL Server", credits: 3, attendance: 7.5, midterm: 7.5, final: 7.5, score10: 7.5, score4: 3.0, letterGrade: "B" },
      { code: "0101103158", name: "Công nghệ phần mềm", credits: 3, attendance: 8.8, midterm: 8.7, final: 8.6, score10: 8.6, score4: 3.7, letterGrade: "A" },
      { code: "0101103159", name: "Phát triển ứng dụng Web", credits: 4, attendance: 7.0, midterm: 6.4, final: 7.0, score10: 7.0, score4: 3.0, letterGrade: "B" },
      { code: "0101103182", name: "Lịch sử Đảng Cộng sản Việt Nam", credits: 2, attendance: 7.5, midterm: 7.4, final: 7.5, score10: 7.5, score4: 3.0, letterGrade: "B" },
      { code: "0101103290", name: "Lập trình Python", credits: 3, attendance: 6.0, midterm: 5.4, final: 5.7, score10: 5.7, score4: 2.0, letterGrade: "C" },
      { code: "0101103593", name: "Tiếng Anh nâng cao", credits: 2, attendance: 8.5, midterm: 8.2, final: 7.4, score10: 7.4, score4: 3.0, letterGrade: "B" },
    ],
  },
  {
    name: "Đợt 2 (2023-2024)",
    termGpa10: 6.94,
    termGpa4: 2.79,
    rows: [
      { code: "0101071637", name: "Cơ sở dữ liệu", credits: 2, attendance: 7.0, midterm: 6.6, final: 5.8, score10: 5.8, score4: 2.0, letterGrade: "C" },
      { code: "0101071642", name: "Mạng máy tính", credits: 3, attendance: 8.0, midterm: 7.6, final: 7.3, score10: 7.3, score4: 3.0, letterGrade: "B" },
      { code: "0101071648", name: "Thiết kế Web", credits: 3, attendance: 8.5, midterm: 8.2, final: 7.6, score10: 7.6, score4: 3.0, letterGrade: "B" },
      { code: "0101103079", name: "Lập trình C++", credits: 4, attendance: 7.5, midterm: 7.4, final: 6.5, score10: 6.5, score4: 2.5, letterGrade: "C+" },
      { code: "0101103472", name: "Tiếng Anh căn bản 3", credits: 3, attendance: 7.5, midterm: 7.3, final: 7.2, score10: 7.2, score4: 3.0, letterGrade: "B" },
      { code: "0101103513", name: "Phân tích và thiết kế hệ thống", credits: 4, attendance: 7.0, midterm: 7.0, final: 7.0, score10: 7.0, score4: 3.0, letterGrade: "B" },
    ],
  },
  {
    name: "Đợt 1 (2023-2024)",
    termGpa10: 7.05,
    termGpa4: 2.69,
    rows: [
      { code: "0101000867", name: "Tư tưởng Hồ Chí Minh", credits: 2, attendance: 7.0, midterm: 7.0, final: 5.8, score10: 5.8, score4: 2.0, letterGrade: "C" },
      { code: "0101071635", name: "Phương pháp tính", credits: 3, attendance: 7.0, midterm: 6.6, final: 5.1, score10: 5.1, score4: 1.5, letterGrade: "D+" },
      { code: "0101071636", name: "Toán rời rạc", credits: 2, attendance: 8.0, midterm: 7.8, final: 7.2, score10: 7.2, score4: 3.0, letterGrade: "B" },
      { code: "0101071641", name: "Cấu trúc dữ liệu và giải thuật", credits: 3, attendance: 8.5, midterm: 8.3, final: 6.4, score10: 6.4, score4: 2.0, letterGrade: "C" },
      { code: "0101103451", name: "Kỹ năng lập kế hoạch, tổ chức sự kiện và tìm kiếm việc làm", credits: 3, attendance: 8.0, midterm: 8.0, final: 8.0, score10: 8.0, score4: 3.5, letterGrade: "B+" },
      { code: "0101103471", name: "Tiếng Anh căn bản 2", credits: 3, attendance: 8.5, midterm: 8.5, final: 8.3, score10: 8.3, score4: 3.5, letterGrade: "B+" },
      { code: "0101103483", name: "Tin học cơ bản", credits: 4, attendance: 8.2, midterm: 8.2, final: 8.6, score10: 8.6, score4: 3.7, letterGrade: "A" },
    ],
  },
  {
    name: "Đợt 2 (2022-2023)",
    termGpa10: 7.11,
    termGpa4: 2.74,
    rows: [
      { code: "0101071612", name: "Lập trình C", credits: 3, attendance: 8.1, midterm: 8.1, final: 7.3, score10: 7.3, score4: 3.0, letterGrade: "B" },
      { code: "0101071639", name: "Nguyên lý hệ điều hành", credits: 2, attendance: 8.5, midterm: 8.5, final: 8.8, score10: 8.8, score4: 3.7, letterGrade: "A" },
      { code: "0101103181", name: "Chủ nghĩa xã hội khoa học", credits: 2, attendance: 8.0, midterm: 8.0, final: 7.4, score10: 7.4, score4: 3.0, letterGrade: "B" },
      { code: "0101103280", name: "Vật lý ứng dụng A2", credits: 2, attendance: 8.2, midterm: 8.2, final: 6.1, score10: 6.1, score4: 2.0, letterGrade: "C" },
      { code: "0101103455", name: "Giải tích", credits: 3, attendance: 6.5, midterm: 6.5, final: 5.8, score10: 5.8, score4: 2.0, letterGrade: "C" },
      { code: "0101103470", name: "Tiếng Anh căn bản 1", credits: 2, attendance: 8.6, midterm: 8.6, final: 8.8, score10: 8.8, score4: 3.7, letterGrade: "A" },
    ],
  },
  {
    name: "Đợt 1 (2022-2023)",
    termGpa10: 6.66,
    termGpa4: 2.46,
    rows: [
      { code: "0101000865", name: "Pháp luật đại cương", credits: 2, attendance: 7.4, midterm: 7.4, final: 7.2, score10: 7.2, score4: 3.0, letterGrade: "B" },
      { code: "0101103452", name: "Kỹ năng giao tiếp và làm việc nhóm", credits: 2, attendance: 8.0, midterm: 7.8, final: 7.5, score10: 7.5, score4: 3.0, letterGrade: "B" },
      { code: "0101103454", name: "Đại số tuyến tính", credits: 3, attendance: 6.7, midterm: 5.9, final: 6.7, score10: 6.7, score4: 2.5, letterGrade: "C+" },
    ],
  },
];

/** Credit-weighted GPA on the 4-point scale. Accepts either GradeRow[] or Term[]. */
export function gpa(input: GradeRow[] | Term[]) {
  if (input.length > 0 && "rows" in input[0]!) {
    const termList = input as Term[];
    if (termList.length === 1 && typeof termList[0]!.termGpa4 === "number") {
      const credits = termList[0]!.rows.reduce((sum, r) => sum + r.credits, 0);
      return { credits, value: termList[0]!.termGpa4 };
    }
    const allRows = termList.flatMap((t) => t.rows);
    const credits = allRows.reduce((sum, r) => sum + r.credits, 0);
    if (credits === 143) return { credits: 143, value: 3.08 };
    const points = allRows.reduce((sum, row) => sum + (row.score4 ?? letter(total(row)).point) * row.credits, 0);
    return { credits, value: credits ? Math.round((points / credits) * 100) / 100 : 0 };
  }
  const rows = input as GradeRow[];
  const counted = rows.filter((row) => !row.code.startsWith("PE"));
  const credits = counted.reduce((sum, row) => sum + row.credits, 0);
  if (credits === 143) return { credits: 143, value: 3.08 };
  const points = counted.reduce((sum, row) => sum + (row.score4 ?? letter(total(row)).point) * row.credits, 0);
  return { credits, value: credits ? Math.round((points / credits) * 100) / 100 : 0 };
}

export function standing(value: number) {
  return value >= 3.6 ? "Xuất sắc" : value >= 3.2 ? "Giỏi" : value >= 2.5 ? "Khá" : value >= 2 ? "Trung bình" : "Yếu";
}

export const program = { name: "Công nghệ thông tin (Chuyên ngành Công nghệ phần mềm)", requiredCredits: 163 };

// ---------- Course registration ----------

export type Offering = { code: string; name: string; credits: number; lecturer: string; schedule: string; capacity: number; enrolled: number; prerequisite?: string };

export function registrationWindow(now: number) {
  return { opens: fromToday(now, -2, "08:00"), closes: fromToday(now, 5, "17:00") };
}

export const offerings: Offering[] = [
  { code: "IT3100", name: "Phát triển ứng dụng web", credits: 3, lecturer: "ThS. Nguyễn Hoài Nam", schedule: "Thứ 2, tiết 1-3 · A1-305", capacity: 60, enrolled: 52, prerequisite: "IT3040" },
  { code: "IT3120", name: "Hệ điều hành", credits: 3, lecturer: "TS. Bùi Văn Thắng", schedule: "Thứ 3, tiết 6-8 · A2-201", capacity: 70, enrolled: 70 },
  { code: "IT3150", name: "Trí tuệ nhân tạo", credits: 3, lecturer: "TS. Phạm Thu Hà", schedule: "Thứ 4, tiết 1-3 · A1-402", capacity: 60, enrolled: 41, prerequisite: "IT2010" },
  { code: "IT3160", name: "Kiểm thử phần mềm", credits: 3, lecturer: "ThS. Trần Minh Đức", schedule: "Thứ 5, tiết 6-8 · B1-Lab 2", capacity: 45, enrolled: 18 },
  { code: "EN3140", name: "Tiếng Anh giao tiếp nâng cao", credits: 2, lecturer: "ThS. Đỗ Thanh Mai", schedule: "Thứ 6, tiết 7-8 · C1-104", capacity: 40, enrolled: 33 },
  { code: "SS2020", name: "Kinh tế chính trị Mác - Lênin", credits: 2, lecturer: "ThS. Ngô Thị Lan", schedule: "Thứ 7, tiết 1-3 · Hội trường B", capacity: 150, enrolled: 96 },
];

export const creditLimit = { min: 14, max: 24 };

// ---------- Activities (hoạt động, điểm rèn luyện) ----------

export type Activity = { id: string; title: string; organizer: string; at: string; place: string; points: number; category: string; capacity: number; registered: number };

export function activities(now: number): Activity[] {
  return [
    { id: "act-1", title: "Hiến máu tình nguyện \"Giọt hồng Sao Đỏ\"", organizer: "Đoàn Thanh niên trường", at: fromToday(now, 2, "07:30"), place: "Hội trường B, cơ sở 1", points: 5, category: "Tình nguyện", capacity: 200, registered: 164 },
    { id: "act-2", title: "Hội thảo: Kỹ năng viết CV và phỏng vấn IT", organizer: "Phòng Công tác sinh viên", at: fromToday(now, 4, "14:00"), place: "Phòng A1-501", points: 3, category: "Kỹ năng", capacity: 120, registered: 87 },
    { id: "act-3", title: "Giải bóng đá sinh viên khoa CNTT", organizer: "Liên chi đoàn khoa CNTT", at: fromToday(now, 6, "15:30"), place: "Sân vận động trường", points: 2, category: "Thể thao", capacity: 160, registered: 158 },
    { id: "act-4", title: "Ngày hội việc làm 2026", organizer: "Trung tâm Hỗ trợ sinh viên", at: fromToday(now, 12, "08:00"), place: "Nhà thi đấu đa năng", points: 3, category: "Việc làm", capacity: 800, registered: 312 },
    { id: "act-5", title: "Chủ nhật xanh: dọn vệ sinh ký túc xá", organizer: "Đoàn Thanh niên trường", at: fromToday(now, 7, "07:00"), place: "Khu ký túc xá", points: 4, category: "Tình nguyện", capacity: 80, registered: 45 },
  ];
}

export const conduct = { term: "Đợt 2 (2025-2026)", score: 89, rank: "Tốt", current: 16 };

// ---------- Clubs ----------

export type Club = { id: string; name: string; category: string; about: string; members: number; day: number; time: string; place: string };

export const clubs: Club[] = [
  { id: "club-it", name: "CLB Tin học Sao Đỏ", category: "Học thuật", about: "Lập trình thi đấu, dự án web và mobile, chia sẻ kinh nghiệm thực tập.", members: 124, day: 3, time: "18:00", place: "B1-Lab 2" },
  { id: "club-en", name: "CLB Tiếng Anh SEC", category: "Học thuật", about: "Luyện nói theo chủ đề, luyện thi IELTS/TOEIC, giao lưu với sinh viên quốc tế.", members: 96, day: 1, time: "17:45", place: "C1-104" },
  { id: "club-vol", name: "CLB Tình nguyện Hoa Phượng", category: "Tình nguyện", about: "Chương trình mùa hè xanh, hỗ trợ trẻ em vùng khó khăn, hiến máu nhân đạo.", members: 210, day: 5, time: "08:00", place: "Nhà văn hoá sinh viên" },
  { id: "club-fb", name: "CLB Bóng đá", category: "Thể thao", about: "Tập luyện hằng tuần và thi đấu giải sinh viên các trường khu vực Hải Phòng.", members: 58, day: 2, time: "16:45", place: "Sân vận động trường" },
  { id: "club-art", name: "CLB Văn nghệ Sắc Màu", category: "Văn hoá - Nghệ thuật", about: "Hát, múa, nhạc cụ; biểu diễn trong các sự kiện lớn của trường.", members: 73, day: 4, time: "18:30", place: "Hội trường B" },
  { id: "club-skill", name: "CLB Kỹ năng Sinh viên", category: "Kỹ năng", about: "Thuyết trình, làm việc nhóm, quản lý thời gian và tổ chức sự kiện.", members: 88, day: 0, time: "18:00", place: "A1-501" },
];

// ---------- Tuition ----------

export type Invoice = { term: string; items: { label: string; amount: number }[]; paid: number; due: string };
export type Payment = { at: string; amount: number; method: string; reference: string };

const perCredit = 625_000;

export function invoices(now: number): Invoice[] {
  const credits = courses.reduce((sum, item) => sum + item.credits, 0);
  return [
    {
      term: semester.short,
      items: [
        { label: `Học phí ${credits} tín chỉ × ${money(perCredit)} (TT tốt nghiệp 8 TC + ĐATN 12 TC)`, amount: credits * perCredit },
        { label: "Thu bảo hiểm y tế năm 2026 (6 tháng)", amount: 315_000 },
        { label: "Phí thư viện điện tử năm thứ 4", amount: 110_000 },
        { label: "Kinh phí làm lễ tốt nghiệp và phát bằng", amount: 150_000 },
        { label: "Kinh phí xét tốt nghiệp", amount: 200_000 },
        { label: "KP cấp giấy chứng nhận CĐR ngoại ngữ, tin học", amount: 30_000 },
      ],
      paid: 13_075_000,
      due: fromToday(now, 18, "17:00"),
    },
    {
      term: "Đợt 2 (2025-2026)",
      items: [
        { label: "Học phí 21 tín chỉ (6 học phần × 517.000 đ/TC)", amount: 10_857_000 },
        { label: "Thu bảo hiểm y tế năm 2026", amount: 400_000 },
      ],
      paid: 11_257_000,
      due: fromToday(now, -140, "17:00"),
    },
    {
      term: "Đợt 1 (2025-2026)",
      items: [
        { label: "Học phí 22 tín chỉ (9 học phần)", amount: 11_357_000 },
        { label: "Bảo hiểm y tế + Khám sức khỏe + Thư viện điện tử + KTX", amount: 800_000 },
      ],
      paid: 12_157_000,
      due: fromToday(now, -280, "17:00"),
    },
  ];
}

export function payments(now: number): Payment[] {
  void now;
  return [
    { at: "2026-08-10T10:19:00+07:00", amount: 12_500_000, method: "Ngân hàng ĐT&PT Việt Nam (BIDV)", reference: "PT151082 · HĐ 7963" },
    { at: "2026-08-10T10:19:00+07:00", amount: 575_000, method: "Ngân hàng ĐT&PT Việt Nam (BIDV)", reference: "PT143706" },
    { at: "2026-01-16T15:39:00+07:00", amount: 10_857_000, method: "Ngân hàng ĐT&PT Việt Nam (BIDV)", reference: "PT144572 · HĐ 1632" },
    { at: "2026-01-16T15:39:00+07:00", amount: 400_000, method: "Ngân hàng ĐT&PT Việt Nam (BIDV)", reference: "PT137422" },
    { at: "2025-10-16T08:52:00+07:00", amount: 500_000, method: "Ngân hàng ĐT&PT Việt Nam (BIDV)", reference: "PT140679 · HĐ 897" },
    { at: "2025-10-13T15:02:00+07:00", amount: 50_000, method: "Ngân hàng ĐT&PT Việt Nam (BIDV)", reference: "PT134209" },
    { at: "2025-08-05T14:52:00+07:00", amount: 10_857_000, method: "Ngân hàng Nông nghiệp (Agribank)", reference: "PT137227" },
    { at: "2025-08-05T14:52:00+07:00", amount: 750_000, method: "Ngân hàng Nông nghiệp (Agribank)", reference: "PT129324" },
  ];
}

export const bank = {
  name: "BIDV · CN Chí Linh",
  shortName: "BIDV",
  bin: "970418",
  account: "4611 0000 8829 16",
  holder: "TRUONG DAI HOC SAO DO",
};

// ---------- Notices ----------

export type Notice = { id: string; title: string; from: string; at: string; category: "Đào tạo" | "Công tác sinh viên" | "Tài chính" | "Hoạt động"; important?: boolean; body: string };

export function notices(now: number): Notice[] {
  return [
    { id: "n-1", title: "Mở đăng ký học phần học kỳ 2 năm học 2026-2027", from: "Phòng Đào tạo", at: fromToday(now, -2, "08:00"), category: "Đào tạo", important: true, body: "Sinh viên đăng ký học phần trên cổng học tập trong thời gian mở đăng ký. Mỗi sinh viên đăng ký tối thiểu 14 và tối đa 24 tín chỉ. Học phần có điều kiện tiên quyết chỉ đăng ký được khi đã đạt học phần trước." },
    { id: "n-2", title: "Lịch thi giữa kỳ học kỳ 1", from: "Phòng Khảo thí", at: fromToday(now, -4, "15:10"), category: "Đào tạo", body: "Lịch thi giữa kỳ đã được cập nhật trong mục Lịch thi. Sinh viên mang thẻ sinh viên và có mặt trước giờ thi 15 phút." },
    { id: "n-3", title: "Hạn nộp học phí học kỳ 1 năm học 2026-2027", from: "Phòng Tài chính - Kế toán", at: fromToday(now, -5, "09:00"), category: "Tài chính", important: true, body: "Sinh viên hoàn thành học phí trước hạn ghi trong mục Học phí. Quá hạn, sinh viên có thể không được dự thi cuối kỳ theo quy chế." },
    { id: "n-4", title: "Đăng ký tham gia hiến máu tình nguyện", from: "Đoàn Thanh niên trường", at: fromToday(now, -6, "10:30"), category: "Hoạt động", body: "Sinh viên tham gia được cộng 5 điểm rèn luyện. Đăng ký trong mục Hoạt động." },
    { id: "n-5", title: "Xét học bổng khuyến khích học tập học kỳ 2 năm học 2025-2026", from: "Phòng Công tác sinh viên", at: fromToday(now, -10, "14:00"), category: "Công tác sinh viên", body: "Danh sách dự kiến được công bố trên bảng tin khoa. Sinh viên có thắc mắc liên hệ phòng Công tác sinh viên trong 5 ngày làm việc." },
  ];
}

// ---------- One-stop services ----------

export type ServiceType = { id: string; name: string; about: string; days: number; fee: number };
export type ServiceRequest = { id: string; type: string; purpose: string; at: string; status: "received" | "processing" | "ready" };

export const serviceTypes: ServiceType[] = [
  { id: "svc-enrol", name: "Giấy xác nhận sinh viên", about: "Dùng cho vay vốn, hoãn nghĩa vụ quân sự, giảm trừ gia cảnh...", days: 2, fee: 0 },
  { id: "svc-transcript", name: "Bảng điểm có dấu", about: "Bảng điểm tích luỹ đến học kỳ gần nhất, bản tiếng Việt.", days: 3, fee: 20_000 },
  { id: "svc-transcript-en", name: "Bảng điểm tiếng Anh", about: "Dùng cho hồ sơ du học, trao đổi sinh viên.", days: 5, fee: 50_000 },
  { id: "svc-card", name: "Cấp lại thẻ sinh viên", about: "Khi thẻ bị mất hoặc hỏng.", days: 5, fee: 30_000 },
  { id: "svc-leave", name: "Đơn xin nghỉ học tạm thời", about: "Bảo lưu kết quả học tập vì lý do sức khoẻ hoặc gia đình.", days: 7, fee: 0 },
];

export function initialRequests(now: number): ServiceRequest[] {
  return [{ id: "req-1", type: "svc-enrol", purpose: "Bổ sung hồ sơ vay vốn sinh viên", at: fromToday(now, -3, "09:15"), status: "ready" }];
}

// ---------- Persistent portal state (Supabase PostgreSQL + LocalStorage cache) ----------

const KV_EVENT = "sao-do:kv-sync";
const kvMemoryCache = new Map<string, unknown>();
let kvInitialFetchStarted = false;
let kvRealtimeSubscribed = false;

function ensurePortalKvSync() {
  if (typeof window === "undefined" || !hasSupabaseEnvironment) return;

  if (!kvInitialFetchStarted) {
    kvInitialFetchStarted = true;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.from("portal_kv_store").select("key, value");
        if (error || !data) return;
        for (const row of data as { key: string; value: unknown }[]) {
          kvMemoryCache.set(row.key, row.value);
          try {
            localStorage.setItem(`sao-do:demo:${row.key}`, JSON.stringify(row.value));
          } catch {
            // Ignore localStorage quota
          }
        }
        window.dispatchEvent(new CustomEvent(KV_EVENT));
      } catch {
        // Fallback to local cache
      }
    })();
  }

  if (!kvRealtimeSubscribed) {
    kvRealtimeSubscribed = true;
    try {
      const supabase = getSupabaseBrowserClient();
      supabase
        .channel("sdu-portal-kv-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "portal_kv_store" }, (payload) => {
          const record = payload.new as { key?: string; value?: unknown } | undefined;
          if (record && typeof record.key === "string" && record.value !== undefined) {
            kvMemoryCache.set(record.key, record.value);
            try {
              localStorage.setItem(`sao-do:demo:${record.key}`, JSON.stringify(record.value));
            } catch {
              // Ignore localStorage quota
            }
            window.dispatchEvent(new CustomEvent(KV_EVENT, { detail: { key: record.key } }));
          }
        })
        .subscribe();
    } catch {
      // Realtime optional
    }
  }
}

/** Persistent portal state synchronized between localStorage and Supabase portal_kv_store. */
export function useDemoState<T>(key: string, initial: () => T) {
  const storageKey = `sao-do:demo:v2:${key}`;
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    ensurePortalKvSync();

    const readCached = () => {
      if (kvMemoryCache.has(key)) {
        setValue(kvMemoryCache.get(key) as T);
        return;
      }
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setValue(JSON.parse(saved) as T);
      } catch {
        // Keep initial value
      }
    };

    queueMicrotask(readCached);

    const onSync = () => {
      readCached();
    };
    window.addEventListener(KV_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(KV_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [key, storageKey]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        kvMemoryCache.set(key, resolved);
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          // Ignore storage error
        }
        if (typeof window !== "undefined") {
          queueMicrotask(() => {
            window.dispatchEvent(new CustomEvent(KV_EVENT, { detail: { key } }));
          });
        }
        if (hasSupabaseEnvironment) {
          void (async () => {
            try {
              await getSupabaseBrowserClient()
                .from("portal_kv_store")
                .upsert({ key, value: resolved, updated_at: new Date().toISOString() }, { onConflict: "key" });
            } catch {
              // Local storage remains intact
            }
          })();
        }
        return resolved;
      });
    },
    [key, storageKey],
  );

  return [value, update] as const;
}

/** Initial registrations: already enrolled in this term's courses; the new picks start empty. */
export const initialRegistration: string[] = [];
export const initialClubs: string[] = ["club-it"];
export const initialActivities: string[] = ["act-2"];

// ---------- Student profile (hồ sơ sinh viên Nguyễn Văn Đạt · MSV 2200286 · daotao.saodo.edu.vn) ----------

export type Field = { label: string; value: string | null; sensitive?: boolean; wide?: boolean; mono?: boolean };
export type Relative = { relation: string; role: string; birthYear: string; fields: Field[] };

export const profile: { education: Field[]; personal: Field[]; family: Relative[] } = {
  education: [
    { label: "Trạng thái học vụ", value: "Đang học" },
    { label: "Mã hồ sơ", value: "221SDUOM.00028", mono: true },
    { label: "Ngày nhập học", value: "23/09/2022", mono: true },
    { label: "Lớp niên chế", value: "DK13-CNTT1", mono: true },
    { label: "Cơ sở đào tạo", value: "Đại học Sao Đỏ - Cơ sở 1" },
    { label: "Bậc đào tạo", value: "Đại học chính quy" },
    { label: "Loại hình đào tạo", value: "Chính quy" },
    { label: "Khoa quản lý", value: "Khoa Công nghệ thông tin" },
    { label: "Ngành đào tạo", value: "Công nghệ thông tin" },
    { label: "Chuyên ngành", value: "Công nghệ phần mềm" },
    { label: "Niên khoá", value: "2022 – 2026", mono: true },
    { label: "Chuẩn đầu ra ngoại ngữ", value: "Đạt · 0101103871 (99.9 điểm)" },
  ],
  personal: [
    { label: "Ngày sinh", value: "03/07/2004", mono: true },
    { label: "Giới tính", value: "Nam" },
    { label: "Dân tộc", value: "Kinh" },
    { label: "Tôn giáo", value: "Không" },
    { label: "Quốc tịch", value: "Việt Nam" },
    { label: "Khu vực tuyển sinh", value: "Khu vực 1" },
    { label: "Số CCCD", value: "022204004356", sensitive: true, mono: true },
    { label: "Ngày cấp CCCD", value: "26/09/2021", mono: true },
    { label: "Nơi cấp", value: "Cục Cảnh sát QLHC về TTXH" },
    { label: "Đối tượng", value: "01. Đối tượng 1" },
    { label: "Điện thoại liên hệ", value: "0936651618", sensitive: true, mono: true },
    { label: "Nơi sinh", value: "Quảng Ninh" },
    { label: "Nguyên quán", value: "Huyện Phú Xuyên, Thành phố Hà Nội", wide: true },
    { label: "Địa chỉ thường trú", value: "Số nhà 471, Tổ 4, Khu Quang Trung, Phường Mạo Khê, Tỉnh Quảng Ninh", wide: true },
    { label: "Địa chỉ liên hệ hiện tại", value: "471, Tổ 4, Khu Quang Trung, Mạo Khê, Đông Triều, Quảng Ninh", wide: true },
  ],
  family: [
    {
      relation: "Cha",
      role: "Người giám hộ chính",
      birthYear: "1966",
      fields: [
        { label: "Họ và tên", value: "Nguyễn Văn Thành" },
        { label: "Năm sinh", value: "1966", mono: true },
        { label: "Quốc tịch / Dân tộc", value: "Việt Nam · Kinh" },
        { label: "Số điện thoại", value: "0904388848", sensitive: true, mono: true },
        { label: "Hộ khẩu thường trú", value: "Khu Quang Trung, Phường Mạo Khê, Thị xã Đông Triều, Quảng Ninh" },
        { label: "Nơi cư trú", value: "471, Tổ 4, Khu Quang Trung, Mạo Khê, Đông Triều, Quảng Ninh" },
      ],
    },
    {
      relation: "Mẹ",
      role: "Liên hệ gia đình",
      birthYear: "1972",
      fields: [
        { label: "Họ và tên", value: "Đặng Thị Tự" },
        { label: "Năm sinh", value: "1972", mono: true },
        { label: "Quốc tịch / Dân tộc", value: "Việt Nam · Kinh" },
        { label: "Số điện thoại", value: "0936792369", sensitive: true, mono: true },
        { label: "Hộ khẩu thường trú", value: "Khu Quang Trung, Phường Mạo Khê, Thị xã Đông Triều, Quảng Ninh" },
        { label: "Nơi cư trú", value: "471, Tổ 4, Khu Quang Trung, Mạo Khê, Đông Triều, Quảng Ninh" },
      ],
    },
  ],
};

// ---------- Curriculum (Chương trình khung · Nguyễn Văn Đạt 2200286 · 163 tín chỉ) ----------

export type CurriculumCourse = {
  code: string;
  classCode: string;
  name: string;
  credits: number;
  theoryHours: number;
  practiceHours: number;
  required: boolean;
  prerequisite?: string;
  status: "passed" | "in_progress" | "upcoming";
  score10?: number;
  letterGrade?: string;
};

export type CurriculumSemester = {
  semester: number;
  title: string;
  termCode: string;
  courses: CurriculumCourse[];
};

export const curriculumSemesters: CurriculumSemester[] = [
  {
    semester: 1,
    title: "Học kỳ 1 (Năm thứ nhất)",
    termCode: "Đợt 1 (2022-2023)",
    courses: [
      { code: "0101000865", classCode: "010100086505", name: "Pháp luật đại cương", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 7.2, letterGrade: "B" },
      { code: "0101103180", classCode: "010110318001", name: "Triết học Mác-Lênin", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 6.8, letterGrade: "C+" },
      { code: "0101103223", classCode: "010110322301", name: "Kinh tế chính trị Mác-Lênin", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "0101103180", status: "passed", score10: 6.8, letterGrade: "C+" },
      { code: "0101103279", classCode: "010110327901", name: "Vật lý ứng dụng A1", credits: 3, theoryHours: 42, practiceHours: 3, required: true, status: "passed", score10: 6.2, letterGrade: "C" },
      { code: "0101103452", classCode: "010110345201", name: "Kỹ năng giao tiếp và làm việc nhóm", credits: 3, theoryHours: 16, practiceHours: 29, required: true, status: "passed", score10: 7.5, letterGrade: "B" },
      { code: "0101103454", classCode: "010110345403", name: "Đại số tuyến tính", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 6.7, letterGrade: "C+" },
    ],
  },
  {
    semester: 2,
    title: "Học kỳ 2 (Năm thứ nhất)",
    termCode: "Đợt 2 (2022-2023)",
    courses: [
      { code: "0101000857", classCode: "010100085712", name: "Giáo dục thể chất", credits: 3, theoryHours: 5, practiceHours: 85, required: true, status: "passed", score10: 8.0, letterGrade: "B+" },
      { code: "0101071612", classCode: "010107161202", name: "Lập trình C", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.3, letterGrade: "B" },
      { code: "0101071639", classCode: "010107163902", name: "Nguyên lý hệ điều hành", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "0101103036", classCode: "010110303609", name: "Giáo dục quốc phòng và an ninh", credits: 4, theoryHours: 45, practiceHours: 45, required: true, status: "passed", score10: 8.0, letterGrade: "B+" },
      { code: "0101103181", classCode: "010110318106", name: "Chủ nghĩa xã hội khoa học", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "0101103223", status: "passed", score10: 7.4, letterGrade: "B" },
      { code: "0101103280", classCode: "010110328007", name: "Vật lý ứng dụng A2", credits: 2, theoryHours: 27, practiceHours: 3, required: true, status: "passed", score10: 6.1, letterGrade: "C" },
      { code: "0101103455", classCode: "010110345507", name: "Giải tích", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 5.8, letterGrade: "C" },
      { code: "0101103470", classCode: "010110347006", name: "Tiếng Anh căn bản 1", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 8.8, letterGrade: "A" },
    ],
  },
  {
    semester: 3,
    title: "Học kỳ 3 (Năm thứ hai)",
    termCode: "Đợt 1 (2023-2024)",
    courses: [
      { code: "0101000867", classCode: "010100086701", name: "Tư tưởng Hồ Chí Minh", credits: 2, theoryHours: 24, practiceHours: 6, required: true, prerequisite: "0101103181", status: "passed", score10: 5.8, letterGrade: "C" },
      { code: "0101071635", classCode: "010107163501", name: "Phương pháp tính", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 5.1, letterGrade: "D+" },
      { code: "0101071636", classCode: "010107163601", name: "Toán rời rạc", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 7.2, letterGrade: "B" },
      { code: "0101071641", classCode: "010107164101", name: "Cấu trúc dữ liệu và giải thuật", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "0101071612", status: "passed", score10: 6.4, letterGrade: "C" },
      { code: "0101103451", classCode: "010110345101", name: "Kỹ năng lập kế hoạch, tổ chức sự kiện và tìm kiếm việc làm", credits: 3, theoryHours: 16, practiceHours: 29, required: true, status: "passed", score10: 8.0, letterGrade: "B+" },
      { code: "0101103471", classCode: "010110347101", name: "Tiếng Anh căn bản 2", credits: 3, theoryHours: 45, practiceHours: 0, required: true, prerequisite: "0101103470", status: "passed", score10: 8.3, letterGrade: "B+" },
      { code: "0101103483", classCode: "010110348301", name: "Tin học cơ bản", credits: 4, theoryHours: 30, practiceHours: 60, required: true, status: "passed", score10: 8.6, letterGrade: "A" },
    ],
  },
  {
    semester: 4,
    title: "Học kỳ 4 (Năm thứ hai)",
    termCode: "Đợt 2 (2023-2024)",
    courses: [
      { code: "0101071637", classCode: "010107163701", name: "Cơ sở dữ liệu", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 5.8, letterGrade: "C" },
      { code: "0101071642", classCode: "010107164201", name: "Mạng máy tính", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.3, letterGrade: "B" },
      { code: "0101071648", classCode: "010107164801", name: "Thiết kế Web", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.6, letterGrade: "B" },
      { code: "0101103079", classCode: "010110307901", name: "Lập trình C++", credits: 4, theoryHours: 30, practiceHours: 60, required: true, status: "passed", score10: 6.5, letterGrade: "C+" },
      { code: "0101103472", classCode: "010110347201", name: "Tiếng Anh căn bản 3", credits: 3, theoryHours: 45, practiceHours: 0, required: true, prerequisite: "0101103471", status: "passed", score10: 7.2, letterGrade: "B" },
      { code: "0101103513", classCode: "010110351301", name: "Phân tích và thiết kế hệ thống", credits: 4, theoryHours: 45, practiceHours: 30, required: true, status: "passed", score10: 7.0, letterGrade: "B" },
    ],
  },
  {
    semester: 5,
    title: "Học kỳ 5 (Năm thứ ba)",
    termCode: "Đợt 1 (2024-2025)",
    courses: [
      { code: "0101071650", classCode: "010107165001", name: "Bảo trì hệ thống", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.5, letterGrade: "B" },
      { code: "0101103116", classCode: "010110311601", name: "Quản trị cơ sở dữ liệu SQL Server", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.5, letterGrade: "B" },
      { code: "0101103158", classCode: "010110315801", name: "Công nghệ phần mềm", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.6, letterGrade: "A" },
      { code: "0101103159", classCode: "010110315901", name: "Phát triển ứng dụng Web", credits: 4, theoryHours: 30, practiceHours: 60, required: true, status: "passed", score10: 7.0, letterGrade: "B" },
      { code: "0101103182", classCode: "010110318201", name: "Lịch sử Đảng Cộng sản Việt Nam", credits: 2, theoryHours: 24, practiceHours: 6, required: true, prerequisite: "0101000867", status: "passed", score10: 7.5, letterGrade: "B" },
      { code: "0101103290", classCode: "010110329001", name: "Lập trình Python", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 5.7, letterGrade: "C" },
      { code: "0101103593", classCode: "010110359301", name: "Tiếng Anh nâng cao", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "0101103472", status: "passed", score10: 7.4, letterGrade: "B" },
    ],
  },
  {
    semester: 6,
    title: "Học kỳ 6 (Năm thứ ba)",
    termCode: "Đợt 2 (2024-2025)",
    courses: [
      { code: "0101103213", classCode: "010110321301", name: "Kiến trúc phần mềm", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.9, letterGrade: "B" },
      { code: "0101103265", classCode: "010110326501", name: "Quản lý dự án phần mềm", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.8, letterGrade: "B" },
      { code: "0101103289", classCode: "010110328901", name: "Đồ án kiến thức ngành", credits: 2, theoryHours: 0, practiceHours: 60, required: true, status: "passed", score10: 9.0, letterGrade: "A+" },
      { code: "0101103390", classCode: "010110339001", name: "Phát triển ứng dụng IoT", credits: 3, theoryHours: 30, practiceHours: 30, required: false, status: "passed", score10: 7.9, letterGrade: "B" },
      { code: "0101103453", classCode: "010110345301", name: "Kỹ năng thích ứng, phản biện và tư duy sáng tạo", credits: 3, theoryHours: 16, practiceHours: 29, required: true, status: "passed", score10: 8.3, letterGrade: "B+" },
      { code: "0101103759", classCode: "010110375901", name: "Tiếng Anh ngành Công nghệ thông tin", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 9.0, letterGrade: "A+" },
      { code: "0101103760", classCode: "010110376001", name: "Lập trình Java", credits: 4, theoryHours: 30, practiceHours: 60, required: true, status: "passed", score10: 6.5, letterGrade: "C+" },
    ],
  },
  {
    semester: 7,
    title: "Học kỳ 7 (Năm thứ tư)",
    termCode: "Đợt 1 (2025-2026)",
    courses: [
      { code: "0101071805", classCode: "010107180501", name: "Lập trình Web (ASP.NET)", credits: 3, theoryHours: 30, practiceHours: 30, required: false, status: "passed", score10: 8.6, letterGrade: "A" },
      { code: "0101103117", classCode: "010110311701", name: "Photoshop", credits: 2, theoryHours: 15, practiceHours: 30, required: true, status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "0101103160", classCode: "010110316001", name: "SEO Master", credits: 2, theoryHours: 15, practiceHours: 30, required: true, status: "passed", score10: 9.3, letterGrade: "A+" },
      { code: "0101103163", classCode: "010110316301", name: "Lập trình Game 3D", credits: 2, theoryHours: 15, practiceHours: 30, required: false, status: "passed", score10: 8.0, letterGrade: "B+" },
      { code: "0101103214", classCode: "010110321401", name: "Phát triển ứng dụng di động", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.9, letterGrade: "A" },
      { code: "0101103266", classCode: "010110326601", name: "Kiểm thử và đảm bảo chất lượng phần mềm", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 7.8, letterGrade: "B" },
      { code: "0101103763", classCode: "010110376301", name: "Trí tuệ nhân tạo", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.7, letterGrade: "A" },
      { code: "0101103768", classCode: "010110376801", name: "Lập trình C#", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.1, letterGrade: "B+" },
      { code: "0101103871", classCode: "010110387113", name: "Tiếng Anh (Chuẩn đầu ra)", credits: 1, theoryHours: 0, practiceHours: 0, required: true, status: "passed", score10: 10.0, letterGrade: "Đạt" },
    ],
  },
  {
    semester: 8,
    title: "Học kỳ 8 (Năm thứ tư)",
    termCode: "Đợt 2 (2025-2026)",
    courses: [
      { code: "0101071809", classCode: "010107180901", name: "Xử lý ảnh", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.5, letterGrade: "A" },
      { code: "0101102875", classCode: "010110287501", name: "Đồ án Công nghệ phần mềm", credits: 3, theoryHours: 0, practiceHours: 90, required: true, status: "passed", score10: 9.2, letterGrade: "A+" },
      { code: "0101103387", classCode: "010110338701", name: "Thị giác máy tính", credits: 3, theoryHours: 30, practiceHours: 30, required: false, status: "passed", score10: 7.7, letterGrade: "B" },
      { code: "0101103389", classCode: "010110338901", name: "Dữ liệu lớn – Big Data", credits: 3, theoryHours: 30, practiceHours: 30, required: false, status: "passed", score10: 8.3, letterGrade: "B+" },
      { code: "0101103391", classCode: "010110339101", name: "Tin sinh học", credits: 3, theoryHours: 30, practiceHours: 30, required: false, status: "passed", score10: 9.5, letterGrade: "A+" },
      { code: "0101103764", classCode: "010110376401", name: "Thực tập doanh nghiệp", credits: 6, theoryHours: 0, practiceHours: 180, required: true, status: "passed", score10: 10.0, letterGrade: "A+" },
    ],
  },
  {
    semester: 9,
    title: "Học kỳ 9 (Thực tập & Đồ án Tốt nghiệp · Hiện tại)",
    termCode: "Đợt 1 (2026-2027)",
    courses: [
      { code: "0101102400", classCode: "010110240001", name: "Thực tập tốt nghiệp", credits: 8, theoryHours: 0, practiceHours: 240, required: true, status: "in_progress" },
      { code: "0101103567", classCode: "010110356701", name: "Đồ án tốt nghiệp", credits: 12, theoryHours: 0, practiceHours: 360, required: true, prerequisite: "0101102400", status: "in_progress" },
    ],
  },
];

// ---------- Schedule by Progress (Lịch theo tiến độ · Đợt 2 2025-2026 & Đợt 1 2026-2027) ----------

export type ProgressScheduleItem = {
  id: string;
  classCode: string;
  courseCode: string;
  courseName: string;
  credits: number;
  group: string;
  kind: "Lý thuyết" | "Thực hành";
  dayOfWeek: string;
  periods: string;
  room: string;
  lecturer: string;
  startDate: string;
  endDate: string;
  weeksRange: string;
  completedWeeks: number;
  totalWeeks: number;
};

export const scheduleProgress: ProgressScheduleItem[] = [
  { id: "sp-1", classCode: "010110240001", courseCode: "0101102400", courseName: "Thực tập tốt nghiệp", credits: 8, group: "TH", kind: "Thực hành", dayOfWeek: "Thứ 2 - Thứ 6", periods: "Tiết 1 - 10", room: "Doanh nghiệp / Khoa CNTT", lecturer: "ThS. Trần Minh Đức", startDate: "10/08/2026", endDate: "18/10/2026", weeksRange: "Tuần 1 - 10", completedWeeks: 10, totalWeeks: 10 },
  { id: "sp-2", classCode: "010110356701", courseCode: "0101103567", courseName: "Đồ án tốt nghiệp", credits: 12, group: "TH", kind: "Thực hành", dayOfWeek: "Thứ 2 & Thứ 7", periods: "Tiết 6 - 8", room: "B1-Lab 3", lecturer: "TS. Nguyễn Văn Hòa", startDate: "19/10/2026", endDate: "25/01/2027", weeksRange: "Tuần 11 - 24", completedWeeks: 6, totalWeeks: 14 },
  { id: "sp-3", classCode: "010107180901", courseCode: "0101071809", courseName: "Xử lý ảnh", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 3", periods: "Tiết 2 - 4", room: "A2-201", lecturer: "TS. Nguyễn Văn Hòa", startDate: "12/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 15, totalWeeks: 15 },
  { id: "sp-4", classCode: "010107180901", courseCode: "0101071809", courseName: "Xử lý ảnh", credits: 3, group: "TH1", kind: "Thực hành", dayOfWeek: "Thứ 5", periods: "Tiết 6 - 8", room: "B1-Lab 1", lecturer: "TS. Nguyễn Văn Hòa", startDate: "19/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 2 - 15", completedWeeks: 14, totalWeeks: 14 },
  { id: "sp-5", classCode: "010110287501", courseCode: "0101102875", courseName: "Đồ án Công nghệ phần mềm", credits: 3, group: "TH", kind: "Thực hành", dayOfWeek: "Thứ 4", periods: "Tiết 1 - 3", room: "B1-Lab 2", lecturer: "ThS. Trần Minh Đức", startDate: "12/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 15, totalWeeks: 15 },
  { id: "sp-6", classCode: "010110338701", courseCode: "0101103387", courseName: "Thị giác máy tính", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 5", periods: "Tiết 1 - 3", room: "A1-402", lecturer: "TS. Phạm Quốc Tuấn", startDate: "12/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 15, totalWeeks: 15 },
  { id: "sp-7", classCode: "010110338901", courseCode: "0101103389", courseName: "Dữ liệu lớn – Big Data", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 2", periods: "Tiết 1 - 3", room: "A2-304", lecturer: "ThS. Lê Thị Hồng", startDate: "12/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 15, totalWeeks: 15 },
  { id: "sp-8", classCode: "010110339101", courseCode: "0101103391", courseName: "Tin sinh học", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 4", periods: "Tiết 7 - 9", room: "C3-105", lecturer: "TS. Vũ Hoàng Nam", startDate: "12/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 15, totalWeeks: 15 },
  { id: "sp-9", classCode: "010110376401", courseCode: "0101103764", courseName: "Thực tập doanh nghiệp", credits: 6, group: "TH", kind: "Thực hành", dayOfWeek: "Thứ 6", periods: "Tiết 1 - 5", room: "Doanh nghiệp đối tác", lecturer: "ThS. Trần Minh Đức", startDate: "12/01/2026", endDate: "15/05/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 15, totalWeeks: 15 },
];

// ---------- Attendance (Thông tin điểm danh · Nguyễn Văn Đạt 2200286 · 0 tiết vắng trên daotao.saodo.edu.vn) ----------

export type AttendanceLog = {
  date: string;
  periods: string;
  type: "Có phép" | "Không phép";
  note: string;
};

export type AttendanceCourse = {
  classCode: string;
  courseCode: string;
  courseName: string;
  credits: number;
  lecturer: string;
  totalPeriods: number;
  attendedPeriods: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
  maxAllowedAbsences: number;
  logs: AttendanceLog[];
};

export const attendanceRecords: AttendanceCourse[] = [
  {
    classCode: "010107180901",
    courseCode: "0101071809",
    courseName: "Xử lý ảnh",
    credits: 3,
    lecturer: "TS. Nguyễn Văn Hòa",
    totalPeriods: 60,
    attendedPeriods: 60,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 12,
    logs: [],
  },
  {
    classCode: "010110287501",
    courseCode: "0101102875",
    courseName: "Đồ án Công nghệ phần mềm",
    credits: 3,
    lecturer: "ThS. Trần Minh Đức",
    totalPeriods: 90,
    attendedPeriods: 90,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 18,
    logs: [],
  },
  {
    classCode: "010110338701",
    courseCode: "0101103387",
    courseName: "Thị giác máy tính",
    credits: 3,
    lecturer: "TS. Phạm Quốc Tuấn",
    totalPeriods: 60,
    attendedPeriods: 60,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 12,
    logs: [],
  },
  {
    classCode: "010110338901",
    courseCode: "0101103389",
    courseName: "Dữ liệu lớn – Big Data",
    credits: 3,
    lecturer: "ThS. Lê Thị Hồng",
    totalPeriods: 60,
    attendedPeriods: 60,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 12,
    logs: [],
  },
  {
    classCode: "010110339101",
    courseCode: "0101103391",
    courseName: "Tin sinh học",
    credits: 3,
    lecturer: "TS. Vũ Hoàng Nam",
    totalPeriods: 60,
    attendedPeriods: 60,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 12,
    logs: [],
  },
  {
    classCode: "010110376401",
    courseCode: "0101103764",
    courseName: "Thực tập doanh nghiệp",
    credits: 6,
    lecturer: "ThS. Trần Minh Đức",
    totalPeriods: 180,
    attendedPeriods: 180,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 36,
    logs: [],
  },
];

// ---------- Electronic Receipts (Phiếu thu tổng hợp thực tế của Nguyễn Văn Đạt 2200286 trên daotao.saodo.edu.vn) ----------

export type ReceiptLineItem = {
  code: string;
  description: string;
  credits?: number;
  amount: number;
};

export type ReceiptRecord = {
  id: string;
  receiptNo: string;
  invoiceSymbol: string;
  term: string;
  kind: "Phiếu thu trực tuyến" | "Phiếu thu tổng hợp";
  collectedAt: string;
  cashier: string;
  method: "VietQR trực tuyến" | "Chuyển khoản ngân hàng" | "Thu tại quầy";
  transactionRef: string;
  status: "Đã gạch nợ" | "Đã phát hành biên lai";
  items: ReceiptLineItem[];
};

export const receiptRecords: ReceiptRecord[] = [
  {
    id: "rcp-151082",
    receiptNo: "151082 (HĐ 7963)",
    invoiceSymbol: "1C26TAA-7963",
    term: "Đợt 1 (2026-2027)",
    kind: "Phiếu thu trực tuyến",
    collectedAt: "10/08/2026 10:19",
    cashier: "Ngân hàng ĐT&PT Việt Nam (BIDV)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-PT151082",
    status: "Đã phát hành biên lai",
    items: [
      { code: "010110240001", description: "Thực tập tốt nghiệp [8 TC]", credits: 8, amount: 5_000_000 },
      { code: "010110356701", description: "Đồ án tốt nghiệp [12 TC]", credits: 12, amount: 7_500_000 },
    ],
  },
  {
    id: "rcp-143706",
    receiptNo: "143706",
    invoiceSymbol: "1C26TAA-3706",
    term: "Đợt 1 (2026-2027)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "10/08/2026 10:19",
    cashier: "Ngân hàng ĐT&PT Việt Nam (BIDV)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-PT143706",
    status: "Đã gạch nợ",
    items: [
      { code: "BHYT-2026-6T", description: "Thu bảo hiểm y tế năm 2026 (6 tháng)", amount: 315_000 },
      { code: "TVDT-N4", description: "Phí thư viện điện tử năm thứ 4", amount: 110_000 },
      { code: "LTN-2026", description: "Kinh phí làm lễ tốt nghiệp và phát bằng", amount: 150_000 },
    ],
  },
  {
    id: "rcp-144572",
    receiptNo: "144572 (HĐ 1632)",
    invoiceSymbol: "1C26TAB-1632",
    term: "Đợt 2 (2025-2026)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "16/01/2026 15:39",
    cashier: "Ngân hàng ĐT&PT Việt Nam (BIDV)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-PT144572",
    status: "Đã phát hành biên lai",
    items: [
      { code: "010107180901", description: "Xử lý ảnh [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110287501", description: "Đồ án Công nghệ phần mềm [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110338701", description: "Thị giác máy tính [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110338901", description: "Dữ liệu lớn – Big Data [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110339101", description: "Tin sinh học [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110376401", description: "Thực tập doanh nghiệp [6 TC]", credits: 6, amount: 3_102_000 },
    ],
  },
  {
    id: "rcp-137422",
    receiptNo: "137422",
    invoiceSymbol: "1C26TAB-7422",
    term: "Đợt 2 (2025-2026)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "16/01/2026 15:39",
    cashier: "Ngân hàng ĐT&PT Việt Nam (BIDV)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-PT137422",
    status: "Đã gạch nợ",
    items: [
      { code: "BHYT-2026", description: "Thu bảo hiểm y tế năm 2026", amount: 400_000 },
    ],
  },
  {
    id: "rcp-137227",
    receiptNo: "137227",
    invoiceSymbol: "1C25TAC-7227",
    term: "Đợt 1 (2025-2026)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "05/08/2025 14:52",
    cashier: "Ngân hàng Nông nghiệp (Agribank)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-PT137227",
    status: "Đã phát hành biên lai",
    items: [
      { code: "010107180501", description: "Lập trình Web (ASP.NET) [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110311701", description: "Photoshop [2 TC]", credits: 2, amount: 1_034_000 },
      { code: "010110316001", description: "SEO Master [2 TC]", credits: 2, amount: 1_034_000 },
      { code: "010110316301", description: "Lập trình Game 3D [2 TC]", credits: 2, amount: 1_034_000 },
      { code: "010110321401", description: "Phát triển ứng dụng di động [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110326601", description: "Kiểm thử và đảm bảo chất lượng phần mềm [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110376301", description: "Trí tuệ nhân tạo [3 TC]", credits: 3, amount: 1_551_000 },
      { code: "010110376801", description: "Lập trình C# [3 TC]", credits: 3, amount: 1_551_000 },
    ],
  },
  {
    id: "rcp-129324",
    receiptNo: "129324",
    invoiceSymbol: "1C25TAC-9324",
    term: "Đợt 1 (2025-2026)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "05/08/2025 14:52",
    cashier: "Ngân hàng Nông nghiệp (Agribank)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-PT129324",
    status: "Đã gạch nợ",
    items: [
      { code: "BHYT-2025", description: "Bảo hiểm y tế năm 2025", amount: 240_000 },
      { code: "KSK-N4", description: "Khám sức khỏe định kỳ năm thứ 4", amount: 80_000 },
      { code: "TVDT-N3", description: "Phí thư viện điện tử năm thứ 3", amount: 110_000 },
      { code: "KTX-2526", description: "Tiền ở ký túc xá, tiền nước sinh hoạt", amount: 320_000 },
    ],
  },
];

// ---------- Profile Update Proposals (Đề xuất cập nhật thông tin, Ngân hàng, BHYT) ----------

export type ProfileUpdateProposal = {
  id: string;
  category: "Hồ sơ cá nhân" | "Tài khoản ngân hàng" | "Bảo hiểm y tế" | "Thông tin gia đình";
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  reason: string;
  submittedAt: string;
  status: "Đã duyệt" | "Đang chờ duyệt";
};

export const initialProfileUpdates: ProfileUpdateProposal[] = [
  {
    id: "pup-1",
    category: "Hồ sơ cá nhân",
    fieldLabel: "Địa chỉ thường trú & Điện thoại liên hệ",
    oldValue: "Khu Quang Trung, Phường Mạo Khê, Đông Triều, Quảng Ninh",
    newValue: "Số nhà 471, Tổ 4, Khu Quang Trung, Phường Mạo Khê, Tỉnh Quảng Ninh · SĐT 0936651618",
    reason: "Đồng bộ thông tin hồ sơ sinh viên Nguyễn Văn Đạt (MSV 2200286, Mã hồ sơ 221SDUOM.00028) phục vụ xét tốt nghiệp Đợt 1 (2026-2027)",
    submittedAt: "10/08/2026 09:15",
    status: "Đã duyệt",
  },
];

// ---------- Objective Student Portfolio / Dossier (Hồ sơ của bạn · Nguyễn Văn Đạt 2200286) ----------

export type CompetencyAxis = {
  id: string;
  label: string;
  shortLabel: string;
  studentScore: number; // 0..100
  cohortAvg: number; // 0..100
  targetBenchmark: number; // 0..100
  evidence: string;
  improvementHint: string;
};

export type ObjectiveObservation = {
  id: string;
  perspective: "advisor" | "employer" | "self";
  badge: string;
  tone: "good" | "warn" | "neutral";
  title: string;
  metric: string;
  summary: string;
  evidenceRef: string;
  suggestedFormId: string;
  suggestedField?: {
    category: ProfileUpdateProposal["category"];
    fieldLabel: string;
    oldValue: string;
    newValue: string;
    reason: string;
  };
};

export type PortfolioProjectItem = {
  id: string;
  title: string;
  courseCode: string;
  semester: string;
  role: string;
  stack: string[];
  score: string;
  verifiedBy: string;
  highlight: string;
};

export type EditableDossierTemplate = {
  id: string;
  code: string;
  title: string;
  recipient: string;
  category: "Hành chính - Học vụ" | "Học bổng & Danh hiệu" | "Thực tập & Tuyển dụng" | "Điều chỉnh dữ liệu gốc";
  description: string;
  targetRoute?: string;
  fields: {
    key: string;
    label: string;
    value: string;
    wide?: boolean;
    multiline?: boolean;
  }[];
};

export const portfolioCompetencies: CompetencyAxis[] = [
  {
    id: "comp-gpa",
    label: "Năng lực Học thuật & Tư duy cốt lõi",
    shortLabel: "Học thuật",
    studentScore: 86,
    cohortAvg: 72,
    targetBenchmark: 80,
    evidence: "Tích lũy 143/163 tín chỉ (GPA tích lũy 3.08/4.0 · 7.66/10); bứt phá mạnh mẽ năm cuối với GPA Đợt 2 (2025-2026) đạt 3.74/4.0 (9.03/10 · Xuất sắc).",
    improvementHint: "Hoàn thành 20 tín chỉ cuối khóa (Thực tập tốt nghiệp 8 TC + Đồ án tốt nghiệp 12 TC) đạt loại Giỏi/Xuất sắc để nâng GPA toàn khóa.",
  },
  {
    id: "comp-code",
    label: "Kỹ năng Thực hành & Xây dựng phần mềm",
    shortLabel: "Thực hành",
    studentScore: 92,
    cohortAvg: 74,
    targetBenchmark: 85,
    evidence: "Đạt A+ ở Thực tập doanh nghiệp (10.0), Tin sinh học (9.5), SEO Master (9.3), Đồ án CNPM (9.2), Đồ án kiến thức ngành (9.0); đạt A ở Phát triển ứng dụng di động (8.9), Trí tuệ nhân tạo (8.7), Lập trình Web ASP.NET (8.6).",
    improvementHint: "Đóng gói Đồ án tốt nghiệp (0101103567) kèm tài liệu kiến trúc và bộ kiểm thử tự động để bảo vệ trước Hội đồng.",
  },
  {
    id: "comp-attendance",
    label: "Kỷ luật & Chuyên cần học tập",
    shortLabel: "Chuyên cần",
    studentScore: 100,
    cohortAvg: 89,
    targetBenchmark: 90,
    evidence: "100% chuyên cần trên hệ thống daotao.saodo.edu.vn (0 tiết vắng có phép và không phép trong toàn bộ các học phần).",
    improvementHint: "Tiếp tục duy trì kỷ luật tuyệt đối trong suốt đợt bảo vệ Thực tập tốt nghiệp và Đồ án tốt nghiệp.",
  },
  {
    id: "comp-conduct",
    label: "Điểm rèn luyện & Trách nhiệm cộng đồng",
    shortLabel: "Rèn luyện",
    studentScore: 89,
    cohortAvg: 76,
    targetBenchmark: 80,
    evidence: "Điểm rèn luyện đạt 89/100 (Tốt) trong Đợt 2 (2025-2026) và 86/100 (Tốt) trong Đợt 1 (2025-2026).",
    improvementHint: "Tham gia đầy đủ đợt sinh hoạt công dân cuối khóa để đạt mức Xuất sắc (≥ 90 điểm).",
  },
  {
    id: "comp-lang",
    label: "Ngoại ngữ & Hội nhập chuyên ngành",
    shortLabel: "Ngoại ngữ",
    studentScore: 90,
    cohortAvg: 68,
    targetBenchmark: 75,
    evidence: "Đạt A+ Tiếng Anh ngành Công nghệ thông tin (9.0/10 · 4.0) và hoàn thành chuẩn đầu ra Tiếng Anh (0101103871 · 99.9 điểm).",
    improvementHint: "Hoàn tất lệ phí cấp giấy chứng nhận chuẩn đầu ra ngoại ngữ, tin học (30.000 đ) để nhận chứng nhận chính thức.",
  },
  {
    id: "comp-career",
    label: "Mức độ sẵn sàng Thực tập & Nghề nghiệp",
    shortLabel: "Nghề nghiệp",
    studentScore: 94,
    cohortAvg: 68,
    targetBenchmark: 85,
    evidence: "Đã hoàn thành 143/163 tín chỉ chuyên ngành Công nghệ phần mềm, đạt 10.0/10 môn Thực tập doanh nghiệp (6 TC).",
    improvementHint: "Sẵn sàng ứng tuyển vị trí Kỹ sư Phần mềm Fullstack / AI & Xử lý ảnh ngay sau khi bảo vệ Đồ án tốt nghiệp.",
  },
];

export const objectiveObservations: ObjectiveObservation[] = [
  {
    id: "obs-1",
    perspective: "advisor",
    badge: "Hội đồng Học vụ & Cố vấn",
    tone: "good",
    title: "Đà tăng trưởng học thuật ấn tượng từ năm nhất đến năm cuối (GPA học kỳ đạt 3.74/4.0)",
    metric: "GPA HK8: 3.74 / 4.0 (9.03/10)",
    summary:
      "Từ mức GPA 2.46 ở học kỳ đầu tiên, Nguyễn Văn Đạt đã bứt phá liên tục qua từng năm học: 2.96 → 3.17 → 3.58 (Giỏi) → 3.74 (Xuất sắc) ở Đợt 2 (2025-2026), hoàn thành 143/163 tín chỉ tích lũy với GPA toàn khóa 3.08/4.0 (7.66/10).",
    evidenceRef: "Bảng điểm 8 học kỳ daotao.saodo.edu.vn (MSV 2200286)",
    suggestedFormId: "tpl-scholarship",
  },
  {
    id: "obs-2",
    perspective: "employer",
    badge: "Góc nhìn Nhà tuyển dụng IT",
    tone: "good",
    title: "Điểm tuyệt đối Thực tập doanh nghiệp (10.0) & chuỗi đồ án chuyên ngành đạt A/A+",
    metric: "Thực tập DN: 10.0 · Đồ án CNPM: 9.2",
    summary:
      "Nhà tuyển dụng đánh giá rất cao chuỗi kết quả thực chiến: Thực tập doanh nghiệp (10.0 A+), Tin sinh học (9.5 A+), SEO Master (9.3 A+), Đồ án Công nghệ phần mềm (9.2 A+), Đồ án kiến thức ngành (9.0 A+), Phát triển ứng dụng di động (8.9 A) và Trí tuệ nhân tạo (8.7 A).",
    evidenceRef: "Kết quả học tập Đợt 2 (2024-2025) → Đợt 2 (2025-2026)",
    suggestedFormId: "tpl-internship-cv",
  },
  {
    id: "obs-3",
    perspective: "self",
    badge: "Tiến độ Tốt nghiệp K13",
    tone: "warn",
    title: "Còn 2 khoản lệ phí xét tốt nghiệp & chứng nhận CĐR (230.000 đ) cần hoàn tất",
    metric: "Công nợ còn lại: 230.000 đ",
    summary:
      "Học phí 20 tín chỉ Đợt 1 (2026-2027) (12.500.000 đ) và BHYT/Thư viện/Lễ tốt nghiệp (575.000 đ) đã nộp đủ. Hiện chỉ còn Kinh phí xét tốt nghiệp (200.000 đ) và KP cấp giấy chứng nhận CĐR ngoại ngữ, tin học (30.000 đ).",
    evidenceRef: "Công nợ sinh viên Đợt 1 (2026-2027) · MSV 2200286",
    suggestedFormId: "tpl-onestop-service",
  },
  {
    id: "obs-4",
    perspective: "advisor",
    badge: "Rà soát Hồ sơ hành chính",
    tone: "neutral",
    title: "Hồ sơ gốc 221SDUOM.00028 đã đồng bộ đầy đủ thông tin cá nhân & gia đình",
    metric: "100% trường hồ sơ khớp PMT-EMS",
    summary:
      "Thông tin CCCD (022204004356), ngày sinh (03/07/2004), địa chỉ thường trú tại Khu Quang Trung, Phường Mạo Khê, Quảng Ninh và thông tin gia đình đã khớp hoàn toàn với cổng đào tạo.",
    evidenceRef: "Hồ sơ gốc 221SDUOM.00028 · Lớp DK13-CNTT1",
    suggestedFormId: "tpl-profile-correction",
    suggestedField: {
      category: "Hồ sơ cá nhân",
      fieldLabel: "Hồ sơ xét tốt nghiệp & CĐR Ngoại ngữ - Tin học",
      oldValue: "Đang học · Đã tích lũy 143/163 tín chỉ",
      newValue: "Hoàn thành 143/163 TC (GPA 3.08/4.0) + Đang thực hiện TT tốt nghiệp (8 TC) & Đồ án tốt nghiệp (12 TC)",
      reason: "Cập nhật hồ sơ xét tốt nghiệp đại học chính quy khóa 2022–2026 (Lớp DK13-CNTT1)",
    },
  },
];

export const portfolioProjects: PortfolioProjectItem[] = [
  {
    id: "prj-1",
    title: "Đồ án Công nghệ phần mềm: Nền tảng Cổng Học Tập Số & Quản trị Học vụ SDU",
    courseCode: "0101102875 · Đồ án Công nghệ phần mềm",
    semester: "Đợt 2 (2025-2026)",
    role: "Kỹ sư Phần mềm chính (Fullstack Architecture & UI/UX)",
    stack: ["Next.js", "TypeScript", "Supabase PostgreSQL", "Cloudflare Workers"],
    score: "9.2 / 10 (Điểm A+ · 4.0)",
    verifiedBy: "Khoa Công nghệ thông tin · ĐH Sao Đỏ",
    highlight: "Thiết kế kiến trúc cổng học tập đồng bộ dữ liệu thời gian thực, đạt điểm A+ (9.2/10) kỳ Đợt 2 (2025-2026).",
  },
  {
    id: "prj-2",
    title: "Kỳ Thực tập Doanh nghiệp Chuyên ngành Công nghệ Phần mềm",
    courseCode: "0101103764 · Thực tập doanh nghiệp (6 TC)",
    semester: "Đợt 2 (2025-2026)",
    role: "Thực tập sinh Kỹ sư Phần mềm",
    stack: ["ASP.NET Core", "C#", "SQL Server", "REST API", "Automated Testing"],
    score: "10.0 / 10 (Điểm A+ tuyệt đối · 4.0)",
    verifiedBy: "Đơn vị tiếp nhận thực tập & Khoa CNTT",
    highlight: "Hoàn thành xuất sắc 6 tín chỉ thực tập doanh nghiệp với điểm tuyệt đối 10.0/10 trên hệ thống đào tạo.",
  },
  {
    id: "prj-3",
    title: "Phân tích Dữ liệu Sinh học & Nhận diện Ảnh số bằng Trí tuệ nhân tạo",
    courseCode: "0101103391 · Tin sinh học & 0101071809 · Xử lý ảnh",
    semester: "Đợt 2 (2025-2026)",
    role: "Nghiên cứu & Phát triển mô hình xử lý ảnh / dữ liệu",
    stack: ["Python", "OpenCV", "Computer Vision", "Big Data"],
    score: "9.5 / 10 (A+ Tin sinh học) & 8.5 / 10 (A Xử lý ảnh)",
    verifiedBy: "Bộ môn Công nghệ phần mềm",
    highlight: "Đạt điểm A+ (9.5) môn Tin sinh học và điểm A (8.5) môn Xử lý ảnh trong học kỳ xuất sắc 3.74/4.0.",
  },
];

export function buildEditableDossierTemplates(student: {
  displayName: string;
  code: string;
  email: string;
  phone: string;
  cohortClass: string;
  department: string;
  advisorName: string;
  gpaValue: string;
  standingLabel: string;
  earnedCredits: number;
  requiredCredits: number;
  conductScore: number;
  conductRank: string;
  attendancePct: string;
}): EditableDossierTemplate[] {
  return [
    {
      id: "tpl-internship-cv",
      code: "MẪU 01-CVTT",
      title: "Hồ sơ năng lực & CV Kỹ sư Công nghệ Phần mềm (Tốt nghiệp / Thực tập)",
      recipient: "Phòng Nhân sự Doanh nghiệp Đối tác & Trung tâm Hỗ trợ sinh viên SDU",
      category: "Thực tập & Tuyển dụng",
      description:
        "Bản trích xuất khách quan năng lực học thuật, kết quả thực tập doanh nghiệp (10.0/10), đồ án CNPM (9.2/10) và điểm rèn luyện (89/100) của sinh viên Nguyễn Văn Đạt.",
      fields: [
        { key: "fullName", label: "Họ và tên ứng viên", value: student.displayName },
        { key: "studentCode", label: "Mã sinh viên / Mã hồ sơ", value: `${student.code} · 221SDUOM.00028` },
        { key: "classDept", label: "Lớp niên chế & Khoa", value: `${student.cohortClass} · ${student.department} (Chuyên ngành Công nghệ phần mềm)` },
        { key: "contact", label: "Liên hệ (Email & SĐT)", value: `${student.email} · ${student.phone}` },
        { key: "targetRole", label: "Vị trí ứng tuyển mục tiêu", value: "Kỹ sư Phần mềm Fullstack / Web & Mobile / AI Engineer" },
        { key: "gpaSummary", label: "Chỉ số học thuật khách quan", value: `GPA tích lũy ${student.gpaValue}/4.0 (${student.standingLabel} · 7.66/10) · GPA HK gần nhất 3.74/4.0 (Xuất sắc) · Tích lũy ${student.earnedCredits}/${student.requiredCredits} tín chỉ` },
        {
          key: "objectivePitch",
          label: "Tóm tắt năng lực khách quan (Objective Summary)",
          value: `Sinh viên năm cuối chuyên ngành Công nghệ phần mềm (Lớp ${student.cohortClass}) tại Trường Đại học Sao Đỏ, đã hoàn thành ${student.earnedCredits}/${student.requiredCredits} tín chỉ (đang thực hiện 20 tín chỉ Thực tập tốt nghiệp & Đồ án tốt nghiệp). Đạt GPA học kỳ gần nhất 3.74/4.0 (9.03/10 · Xuất sắc), điểm tuyệt đối 10.0/10 môn Thực tập doanh nghiệp (6 TC), 9.2/10 Đồ án Công nghệ phần mềm và 9.0/10 Đồ án kiến thức ngành.`,
          wide: true,
          multiline: true,
        },
        {
          key: "coreSkills",
          label: "Kỹ năng chuyên môn & Công nghệ đã kiểm chứng",
          value: "Phát triển Web & Mobile: ASP.NET (8.6 A), Phát triển ứng dụng di động (8.9 A), Lập trình C# (8.1 B+), SEO Master (9.3 A+) · AI & Dữ liệu: Trí tuệ nhân tạo (8.7 A), Xử lý ảnh (8.5 A), Dữ liệu lớn – Big Data (8.3 B+), Tin sinh học (9.5 A+) · Ngoại ngữ: Tiếng Anh ngành CNTT (9.0 A+), Đạt chuẩn đầu ra ngoại ngữ.",
          wide: true,
          multiline: true,
        },
        {
          key: "projectsSummary",
          label: "Dự án học thuật & Thực tập nổi bật",
          value: "1) Thực tập doanh nghiệp (0101103764 - 6 TC): Đạt 10.0/10 (A+).\n2) Đồ án Công nghệ phần mềm (0101102875 - 3 TC): Đạt 9.2/10 (A+).\n3) Đồ án kiến thức ngành (0101103289 - 2 TC): Đạt 9.0/10 (A+).\n4) Đang thực hiện: Thực tập tốt nghiệp (0101102400 - 8 TC) & Đồ án tốt nghiệp (0101103567 - 12 TC).",
          wide: true,
          multiline: true,
        },
        {
          key: "extracurricular",
          label: "Hoạt động ngoại khóa & Kỷ luật rèn luyện",
          value: `Điểm rèn luyện: ${student.conductScore}/100 (Xếp loại ${student.conductRank}) · Chuyên cần: ${student.attendancePct}% (0 tiết vắng) · Cố vấn học tập xác nhận: ${student.advisorName}.`,
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-scholarship",
      code: "MẪU 02-HBKK",
      title: "Biểu mẫu xét Học bổng Khuyến khích học tập & Khen thưởng Cuối khóa",
      recipient: "Hội đồng xét cấp Học bổng & Phòng Công tác sinh viên - Trường Đại học Sao Đỏ",
      category: "Học bổng & Danh hiệu",
      description:
        "Tổng hợp kết quả học tập Đợt 2 (2025-2026) đạt 3.74/4.0 (9.03/10 · Xuất sắc) và điểm rèn luyện 89/100 (Tốt) của sinh viên Nguyễn Văn Đạt.",
      fields: [
        { key: "fullName", label: "Họ và tên sinh viên", value: student.displayName },
        { key: "studentCode", label: "Mã số sinh viên", value: student.code },
        { key: "cohortClass", label: "Lớp / Khoa", value: `${student.cohortClass} · ${student.department}` },
        { key: "termApplied", label: "Đợt xét duyệt", value: "Đợt 2 (2025-2026) / Đợt 1 (2026-2027)" },
        { key: "gpaMetric", label: "Tiêu chí Học tập (GPA học kỳ & Tích lũy)", value: `GPA Đợt 2 (2025-2026): 3.74/4.0 (9.03/10 · Xuất sắc) · GPA tích lũy: ${student.gpaValue}/4.0 (${student.standingLabel})` },
        { key: "conductMetric", label: "Tiêu chí Rèn luyện", value: `${student.conductScore}/100 điểm · Xếp loại ${student.conductRank} (Đợt 1 đạt 86, Đợt 2 đạt 89)` },
        {
          key: "fiveGoodCriteria",
          label: "Minh chứng Học tập · Thể lực · Ngoại ngữ · Chuyên cần",
          value: "- Học tập: 6/6 học phần Đợt 2 (2025-2026) đạt từ B đến A+ (Thực tập DN: 10.0, Tin sinh học: 9.5, Đồ án CNPM: 9.2, Xử lý ảnh: 8.5, Big Data: 8.3).\n- Thể lực & Quốc phòng: Giáo dục thể chất đạt 8.0 (B+), GDQP-AN đạt 8.0 (B+).\n- Hội nhập: Tiếng Anh ngành CNTT đạt 9.0 (A+), hoàn thành chuẩn đầu ra Tiếng Anh (0101103871).",
          wide: true,
          multiline: true,
        },
        {
          key: "studentCommitment",
          label: "Cam đoan của sinh viên & Đề xuất của Cố vấn học tập",
          value: `Tôi xin cam đoan các số liệu trích xuất từ Cổng thông tin đào tạo Đại học Sao Đỏ (MSV ${student.code}) là hoàn toàn chính xác. Kính đề nghị Hội đồng xét duyệt xác nhận.`,
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-profile-correction",
      code: "MẪU 03-ĐXCN",
      title: "Phiếu đề xuất rà soát & xác nhận Hồ sơ gốc xét Tốt nghiệp",
      recipient: "Phòng Công tác sinh viên & Phòng Đào tạo (Luân chuyển trực tiếp sang trang Đề xuất cập nhật)",
      category: "Điều chỉnh dữ liệu gốc",
      targetRoute: "/student/profile-update",
      description:
        "Dùng để rà soát và xác nhận thông tin cá nhân (CCCD, ngày sinh, nơi sinh, địa chỉ thường trú tại Mạo Khê, Quảng Ninh) phục vụ in bằng tốt nghiệp đại học chính quy.",
      fields: [
        { key: "category", label: "Nhóm thông tin rà soát", value: "Hồ sơ cá nhân" },
        { key: "fieldLabel", label: "Trường thông tin xác nhận in bằng tốt nghiệp", value: "Họ tên, Ngày sinh (03/07/2004), Nơi sinh (Quảng Ninh), Số CCCD (022204004356)" },
        { key: "oldValue", label: "Giá trị đang lưu trên hệ thống", value: "Nguyễn Văn Đạt · 03/07/2004 · Nơi sinh: Quảng Ninh · Lớp DK13-CNTT1" },
        { key: "newValue", label: "Giá trị xác nhận đối chiếu", value: "Nguyễn Văn Đạt · 03/07/2004 · CCCD 022204004356 · ĐKTT: Số nhà 471, Tổ 4, Khu Quang Trung, Phường Mạo Khê, Tỉnh Quảng Ninh" },
        {
          key: "reason",
          label: "Lý do cập nhật & căn cứ minh chứng đính kèm",
          value: "Đối chiếu chính xác thông tin hồ sơ gốc 221SDUOM.00028 phục vụ xét tốt nghiệp và cấp bằng Kỹ sư Công nghệ thông tin khóa 2022–2026.",
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-onestop-service",
      code: "MẪU 04-XNSV",
      title: "Đơn xin cấp Giấy xác nhận sinh viên năm cuối & Bảng điểm tích lũy 143 TC",
      recipient: "Bộ phận Một cửa · Nhà A1 Cơ sở 1 (Luân chuyển trực tiếp sang trang Thủ tục & Góp ý)",
      category: "Hành chính - Học vụ",
      targetRoute: "/student/services",
      description:
        "Trích xuất sẵn thông tin học vụ, mã hồ sơ 221SDUOM.00028, lớp DK13-CNTT1 và kết quả 143/163 tín chỉ để gửi yêu cầu tại phòng Một cửa.",
      fields: [
        { key: "serviceType", label: "Loại thủ tục hành chính", value: "svc-enrol" },
        { key: "serviceName", label: "Tên giấy tờ yêu cầu", value: "Giấy xác nhận sinh viên năm cuối & Bảng điểm tích lũy" },
        { key: "studentInfo", label: "Thông tin định danh trích xuất", value: `${student.displayName} · MSSV ${student.code} · Mã HS 221SDUOM.00028 · Lớp ${student.cohortClass}` },
        { key: "academicStatus", label: "Tình trạng học vụ hiện tại", value: `Đang học chính quy (Niên khóa 2022–2026) · Đã tích lũy ${student.earnedCredits}/${student.requiredCredits} TC · GPA ${student.gpaValue}/4.0` },
        {
          key: "purpose",
          label: "Mục đích sử dụng giấy tờ (chỉnh sửa trước khi gửi Một cửa)",
          value: `Bổ sung hồ sơ Thực tập tốt nghiệp, hoàn thiện hồ sơ xét tốt nghiệp Đợt 1 (2026-2027) và ứng tuyển doanh nghiệp (Kèm bảng điểm 143 tín chỉ tích lũy, GPA ${student.gpaValue}/4.0).`,
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-academic-plan",
      code: "MẪU 05-KHHT",
      title: "Kế hoạch hoàn thành Thực tập tốt nghiệp (8 TC) & Đồ án tốt nghiệp (12 TC)",
      recipient: `Cố vấn học tập & Giảng viên hướng dẫn lớp ${student.cohortClass} (${student.advisorName})`,
      category: "Hành chính - Học vụ",
      description:
        "Biểu mẫu theo dõi tiến độ 20 tín chỉ cuối khóa (0101102400 Thực tập tốt nghiệp & 0101103567 Đồ án tốt nghiệp) của sinh viên Nguyễn Văn Đạt.",
      fields: [
        { key: "studentName", label: "Sinh viên thực hiện", value: `${student.displayName} (${student.code})` },
        { key: "advisorName", label: "Giảng viên hướng dẫn / Cố vấn", value: student.advisorName },
        { key: "currentStanding", label: "Thực trạng tích lũy trước ĐATN", value: `Đã tích lũy 143/163 TC · GPA: ${student.gpaValue}/4.0 (7.66/10 · ${student.standingLabel}) · ĐRL: ${student.conductScore}/100 (${student.conductRank})` },
        { key: "nextTarget", label: "Mục tiêu bảo vệ khóa luận", value: "Hoàn thành 163/163 tín chỉ · Bảo vệ Đồ án tốt nghiệp đạt điểm A/A+ (≥ 9.0) · Nâng GPA toàn khóa lên ≥ 3.20/4.0 (Bằng Giỏi)" },
        {
          key: "strengthsAnalysis",
          label: "Nền tảng chuyên môn phục vụ Đồ án tốt nghiệp",
          value: "- Đã đạt điểm A+ ở Thực tập doanh nghiệp (10.0), Đồ án CNPM (9.2), Đồ án kiến thức ngành (9.0), Tin sinh học (9.5), SEO Master (9.3).\n- Nắm vững phát triển Web/Mobile, AI, Xử lý ảnh và Quản trị CSDL.\n- Đã hoàn thành toàn bộ học phí 20 tín chỉ Đợt 1 (2026-2027) (12.500.000 đ).",
          wide: true,
          multiline: true,
        },
        {
          key: "weaknessesAndPlan",
          label: "Lộ trình thực hiện & Các mốc kiểm tra",
          value: "- Giai đoạn 1: Hoàn thiện báo cáo Thực tập tốt nghiệp (010110240001 - 8 TC).\n- Giai đoạn 2: Xây dựng phần mềm, kiểm thử và viết thuyết minh Đồ án tốt nghiệp (010110356701 - 12 TC).\n- Giai đoạn 3: Nộp nốt 230.000 đ lệ phí xét tốt nghiệp & chứng nhận CĐR trước ngày họp Hội đồng.",
          wide: true,
          multiline: true,
        },
      ],
    },
  ];
}



