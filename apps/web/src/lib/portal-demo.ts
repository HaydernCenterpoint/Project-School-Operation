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

/** Monday 00:00 (local time) of the week containing `time`. */
export function weekStart(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime() - ((date.getDay() + 6) % 7) * day;
}

/** A date `offset` days from today at "HH:MM", as an ISO string. */
function fromToday(now: number, offset: number, time = "07:00") {
  const date = new Date(weekStart(now) + ((new Date(now).getDay() + 6) % 7) * day + offset * day);
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours!, minutes!, 0, 0);
  return date.toISOString();
}

/** Day index 0 (Mon) to 6 (Sun) of an ISO date. */
export function weekdayIndex(iso: string) {
  return (new Date(iso).getDay() + 6) % 7;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
export const longDay = (iso: string) => dateFormat.format(new Date(iso));
export const shortDay = (value: string | number) => shortDate.format(new Date(value));
export const clock = (iso: string) => timeFormat.format(new Date(iso));

export function money(amount: number) {
  return `${amount.toLocaleString("vi-VN")} đ`;
}

// ---------- Courses and timetable ----------

export type Course = { code: string; name: string; credits: number; lecturer: string; tone: number };

export const semester = { name: "Học kỳ 1, năm học 2026-2027", short: "HK1 2026-2027" };

export const courses: Course[] = [
  { code: "IT3040", name: "Lập trình hướng đối tượng", credits: 3, lecturer: "ThS. Trần Minh Đức", tone: 0 },
  { code: "IT3090", name: "Cơ sở dữ liệu", credits: 3, lecturer: "TS. Phạm Thu Hà", tone: 1 },
  { code: "IT3080", name: "Mạng máy tính", credits: 3, lecturer: "ThS. Lê Quang Vinh", tone: 2 },
  { code: "EN2130", name: "Tiếng Anh chuyên ngành", credits: 2, lecturer: "ThS. Đỗ Thanh Mai", tone: 3 },
  { code: "MI1140", name: "Toán rời rạc", credits: 3, lecturer: "TS. Vũ Đình Khoa", tone: 4 },
  { code: "PE1030", name: "Giáo dục thể chất 3", credits: 1, lecturer: "ThS. Hoàng Văn Tùng", tone: 5 },
];

export const courseByCode = new Map(courses.map((item) => [item.code, item]));

export type Session = { course: string; day: number; from: number; to: number; room: string; kind: "Lý thuyết" | "Thực hành" };

/** Weekly timetable. `day` is 0 (Mon) to 6 (Sun); `from`/`to` are 1-based periods. */
export const sessions: Session[] = [
  { course: "IT3040", day: 0, from: 1, to: 3, room: "A1-301", kind: "Lý thuyết" },
  { course: "MI1140", day: 0, from: 6, to: 8, room: "A2-205", kind: "Lý thuyết" },
  { course: "IT3090", day: 1, from: 1, to: 3, room: "A1-402", kind: "Lý thuyết" },
  { course: "EN2130", day: 1, from: 7, to: 8, room: "C1-104", kind: "Lý thuyết" },
  { course: "IT3040", day: 2, from: 6, to: 9, room: "B1-Lab 3", kind: "Thực hành" },
  { course: "IT3080", day: 3, from: 1, to: 3, room: "A1-301", kind: "Lý thuyết" },
  { course: "IT3090", day: 3, from: 7, to: 10, room: "B1-Lab 1", kind: "Thực hành" },
  { course: "IT3080", day: 4, from: 4, to: 5, room: "B1-Lab 2", kind: "Thực hành" },
  { course: "PE1030", day: 5, from: 1, to: 2, room: "Nhà thi đấu", kind: "Thực hành" },
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
    { course: "EN2130", at: fromToday(now, 3, "07:30"), minutes: 60, room: "C1-201", seat: "SBD 024", form: "Trắc nghiệm trên máy", round: "Giữa kỳ" },
    { course: "MI1140", at: fromToday(now, 9, "09:30"), minutes: 90, room: "A2-305", seat: "SBD 117", form: "Tự luận", round: "Giữa kỳ" },
    { course: "IT3040", at: fromToday(now, 38, "07:30"), minutes: 90, room: "B1-Lab 3", seat: "SBD 056", form: "Thực hành", round: "Cuối kỳ" },
    { course: "IT3090", at: fromToday(now, 41, "13:30"), minutes: 90, room: "A1-402", seat: "SBD 089", form: "Tự luận", round: "Cuối kỳ" },
    { course: "IT3080", at: fromToday(now, 44, "07:30"), minutes: 60, room: "C1-301", seat: "SBD 031", form: "Trắc nghiệm trên máy", round: "Cuối kỳ" },
    { course: "PE1030", at: fromToday(now, 46, "07:00"), minutes: 45, room: "Nhà thi đấu", seat: "SBD 012", form: "Thực hành", round: "Cuối kỳ" },
  ];
}

// ---------- Grades ----------

export type GradeRow = { code: string; name: string; credits: number; attendance: number; midterm: number; final: number };
export type Term = { name: string; rows: GradeRow[] };

/** Weighting used by most courses: 10% attendance, 30% midterm, 60% final. */
export function total(row: GradeRow) {
  return Math.round((row.attendance * 0.1 + row.midterm * 0.3 + row.final * 0.6) * 10) / 10;
}

const scale: [number, string, number][] = [
  [8.5, "A", 4], [8, "B+", 3.5], [7, "B", 3], [6.5, "C+", 2.5], [5.5, "C", 2], [5, "D+", 1.5], [4, "D", 1], [0, "F", 0],
];

export function letter(score: number) {
  const [, grade, point] = scale.find(([min]) => score >= min)!;
  return { grade, point };
}

export const terms: Term[] = [
  {
    name: "HK2 2025-2026",
    rows: [
      { code: "IT2010", name: "Cấu trúc dữ liệu và giải thuật", credits: 3, attendance: 10, midterm: 8.5, final: 8.5 },
      { code: "IT2030", name: "Kiến trúc máy tính", credits: 3, attendance: 9, midterm: 7.5, final: 7.5 },
      { code: "IT2050", name: "Nguyên lý hệ điều hành", credits: 3, attendance: 10, midterm: 8.0, final: 8.2 },
      { code: "IT2060", name: "Kỹ thuật số và vi xử lý", credits: 3, attendance: 9, midterm: 7.8, final: 8.0 },
      { code: "MI1120", name: "Xác suất thống kê", credits: 3, attendance: 10, midterm: 7.0, final: 7.2 },
      { code: "EN1120", name: "Tiếng Anh 2", credits: 3, attendance: 10, midterm: 8.5, final: 9.0 },
      { code: "PE1020", name: "Giáo dục thể chất 2", credits: 1, attendance: 10, midterm: 8.0, final: 8.2 },
    ],
  },
  {
    name: "HK1 2025-2026",
    rows: [
      { code: "IT1120", name: "Kỹ thuật lập trình C/C++", credits: 3, attendance: 10, midterm: 8.8, final: 8.6 },
      { code: "IT1130", name: "Lập trình Python cơ bản", credits: 3, attendance: 10, midterm: 8.5, final: 8.8 },
      { code: "MI1150", name: "Phương pháp tính", credits: 3, attendance: 9, midterm: 7.2, final: 7.5 },
      { code: "PH1120", name: "Vật lý đại cương 2", credits: 3, attendance: 9, midterm: 7.0, final: 7.2 },
      { code: "SS2020", name: "Kinh tế chính trị Mác - Lênin", credits: 2, attendance: 10, midterm: 7.8, final: 7.8 },
      { code: "SS2030", name: "Chủ nghĩa xã hội khoa học", credits: 2, attendance: 10, midterm: 8.0, final: 8.2 },
      { code: "LAW1010", name: "Pháp luật đại cương", credits: 2, attendance: 10, midterm: 8.2, final: 8.0 },
    ],
  },
  {
    name: "HK2 2024-2025",
    rows: [
      { code: "IT1110", name: "Nhập môn lập trình", credits: 3, attendance: 10, midterm: 9.0, final: 8.5 },
      { code: "IT1020", name: "Hệ thống máy tính & Linh kiện", credits: 3, attendance: 10, midterm: 8.2, final: 8.4 },
      { code: "MI1125", name: "Giải tích 2", credits: 3, attendance: 9, midterm: 6.8, final: 7.0 },
      { code: "PH1110", name: "Vật lý đại cương 1", credits: 3, attendance: 9, midterm: 7.2, final: 7.4 },
      { code: "EN1110", name: "Tiếng Anh 1", credits: 3, attendance: 10, midterm: 8.0, final: 8.0 },
      { code: "SK1010", name: "Kỹ năng giao tiếp và làm việc nhóm", credits: 2, attendance: 10, midterm: 8.5, final: 8.8 },
      { code: "GDQP102", name: "Giáo dục Quốc phòng - An ninh 2", credits: 2, attendance: 10, midterm: 8.5, final: 8.5 },
    ],
  },
  {
    name: "HK1 2024-2025",
    rows: [
      { code: "IT1010", name: "Tin học đại cương", credits: 3, attendance: 10, midterm: 8.5, final: 8.8 },
      { code: "IT1005", name: "Nhập môn ngành Công nghệ thông tin", credits: 2, attendance: 10, midterm: 8.8, final: 9.0 },
      { code: "MI1110", name: "Giải tích 1", credits: 3, attendance: 8, midterm: 6.0, final: 6.2 },
      { code: "MI1130", name: "Đại số tuyến tính", credits: 3, attendance: 9, midterm: 7.0, final: 7.0 },
      { code: "SS1010", name: "Triết học Mác - Lênin", credits: 3, attendance: 10, midterm: 7.5, final: 7.4 },
      { code: "PE1010", name: "Giáo dục thể chất 1", credits: 1, attendance: 10, midterm: 9.0, final: 8.5 },
      { code: "GDQP101", name: "Giáo dục Quốc phòng - An ninh 1", credits: 2, attendance: 10, midterm: 8.2, final: 8.4 },
    ],
  },
];

/** Credit-weighted GPA on the 4-point scale. Physical education (PE) is excluded, as is usual. */
export function gpa(rows: GradeRow[]) {
  const counted = rows.filter((row) => !row.code.startsWith("PE"));
  const credits = counted.reduce((sum, row) => sum + row.credits, 0);
  const points = counted.reduce((sum, row) => sum + letter(total(row)).point * row.credits, 0);
  return { credits, value: credits ? Math.round((points / credits) * 100) / 100 : 0 };
}

export function standing(value: number) {
  return value >= 3.6 ? "Xuất sắc" : value >= 3.2 ? "Giỏi" : value >= 2.5 ? "Khá" : value >= 2 ? "Trung bình" : "Yếu";
}

export const program = { name: "Công nghệ thông tin", requiredCredits: 150 };

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

export const conduct = { term: "HK2 2025-2026", score: 82, rank: "Tốt", current: 14 };

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

const perCredit = 450_000;

export function invoices(now: number): Invoice[] {
  const credits = courses.reduce((sum, item) => sum + item.credits, 0);
  return [
    {
      term: semester.short,
      items: [
        { label: `Học phí ${credits} tín chỉ × ${money(perCredit)}`, amount: credits * perCredit },
        { label: "Bảo hiểm y tế sinh viên", amount: 680_400 },
        { label: "Miễn giảm theo chính sách", amount: -1_000_000 },
      ],
      paid: 3_000_000,
      due: fromToday(now, 18, "17:00"),
    },
    {
      term: "HK2 2025-2026",
      items: [{ label: `Học phí 13 tín chỉ × ${money(perCredit)}`, amount: 13 * perCredit }],
      paid: 13 * perCredit,
      due: fromToday(now, -140, "17:00"),
    },
  ];
}

export function payments(now: number): Payment[] {
  return [
    { at: fromToday(now, -6, "10:24"), amount: 3_000_000, method: "Chuyển khoản", reference: "SDU2200286-0926" },
    { at: fromToday(now, -150, "09:02"), amount: 13 * perCredit, method: "Thanh toán tại quầy", reference: "SDU2200286-0426" },
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
  const storageKey = `sao-do:demo:${key}`;
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

// ---------- Student profile (hồ sơ sinh viên) ----------
// Same sections as the school's profile page. Every personal value below is FICTIONAL sample
// data; real records come from the school's student information system.

export type Field = { label: string; value: string | null; sensitive?: boolean; wide?: boolean; mono?: boolean };
export type Relative = { relation: string; role: string; birthYear: string; fields: Field[] };

export const profile: { education: Field[]; personal: Field[]; family: Relative[] } = {
  education: [
    { label: "Trạng thái học vụ", value: "Đang học" },
    { label: "Mã hồ sơ", value: "22SDU.CNTT.0286", mono: true },
    { label: "Ngày nhập học", value: "05/09/2022", mono: true },
    { label: "Lớp niên chế", value: "DK13-CNTT1", mono: true },
    { label: "Cơ sở đào tạo", value: "Cơ sở 1 · Chí Linh, Hải Dương" },
    { label: "Bậc đào tạo", value: "Đại học chính quy" },
    { label: "Khoa quản lý", value: "Khoa Công nghệ thông tin" },
    { label: "Ngành đào tạo", value: "Công nghệ thông tin" },
    { label: "Chuyên ngành", value: "Công nghệ phần mềm" },
    { label: "Niên khoá", value: "2022 – 2026", mono: true },
    { label: "Cố vấn học tập", value: "ThS. Trần Minh Đức" },
    { label: "Chuẩn đầu ra ngoại ngữ", value: "B1 · Đã hoàn thành EN2130" },
  ],
  personal: [
    { label: "Ngày sinh", value: "15/06/2004", mono: true },
    { label: "Giới tính", value: "Nam" },
    { label: "Dân tộc", value: "Kinh" },
    { label: "Tôn giáo", value: "Không" },
    { label: "Quốc tịch", value: "Việt Nam" },
    { label: "Khu vực tuyển sinh", value: "Khu vực 2NT" },
    { label: "Số CCCD", value: "030204008642", sensitive: true, mono: true },
    { label: "Ngày cấp CCCD", value: "18/04/2021", mono: true },
    { label: "Nơi cấp", value: "Cục Cảnh sát QLHC về TTXH" },
    { label: "Ngày vào Đoàn", value: "26/03/2019", mono: true },
    { label: "Điện thoại liên hệ", value: "0987654286", sensitive: true, mono: true },
    { label: "Nơi sinh", value: "TP. Chí Linh, Hải Dương" },
    { label: "Địa chỉ thường trú", value: "Số 24 Nguyễn Trãi, phường Sao Đỏ, TP. Chí Linh, tỉnh Hải Dương", wide: true },
    { label: "Địa chỉ liên hệ hiện tại", value: "Ký túc xá khu B, Trường Đại học Sao Đỏ, phường Sao Đỏ, TP. Chí Linh", wide: true },
  ],
  family: [
    {
      relation: "Cha",
      role: "Người giám hộ chính",
      birthYear: "1972",
      fields: [
        { label: "Họ và tên", value: "Nguyễn Văn Hùng" },
        { label: "Năm sinh", value: "1972", mono: true },
        { label: "Nghề nghiệp", value: "Kỹ sư cơ khí" },
        { label: "Số điện thoại", value: "0912408319", sensitive: true, mono: true },
        { label: "Đơn vị công tác", value: "Công ty CP Cơ khí Chí Linh" },
        { label: "Nơi cư trú", value: "Phường Sao Đỏ, TP. Chí Linh, Hải Dương" },
      ],
    },
    {
      relation: "Mẹ",
      role: "Liên hệ khẩn cấp",
      birthYear: "1976",
      fields: [
        { label: "Họ và tên", value: "Trần Thị Lan" },
        { label: "Năm sinh", value: "1976", mono: true },
        { label: "Nghề nghiệp", value: "Giáo viên THCS" },
        { label: "Số điện thoại", value: "0978315604", sensitive: true, mono: true },
        { label: "Đơn vị công tác", value: "Trường THCS Sao Đỏ" },
        { label: "Nơi cư trú", value: "Phường Sao Đỏ, TP. Chí Linh, Hải Dương" },
      ],
    },
  ],
};

// ---------- Curriculum (Chương trình khung) ----------

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
    termCode: "Đợt 1 (2024-2025)",
    courses: [
      { code: "SS1010", classCode: "010110010101", name: "Triết học Mác - Lênin", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 7.7, letterGrade: "B" },
      { code: "MI1110", classCode: "010110020101", name: "Giải tích 1", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 6.3, letterGrade: "C" },
      { code: "MI1130", classCode: "010110020201", name: "Đại số tuyến tính", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 7.2, letterGrade: "B" },
      { code: "IT1010", classCode: "010110100101", name: "Tin học đại cương", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "IT1005", classCode: "010110100201", name: "Nhập môn ngành Công nghệ thông tin", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 9.0, letterGrade: "A" },
      { code: "PE1010", classCode: "010110090101", name: "Giáo dục thể chất 1", credits: 1, theoryHours: 0, practiceHours: 30, required: true, status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "GDQP101", classCode: "010110080101", name: "Giáo dục Quốc phòng - An ninh 1", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 8.5, letterGrade: "A" },
    ],
  },
  {
    semester: 2,
    title: "Học kỳ 2 (Năm thứ nhất)",
    termCode: "Đợt 2 (2024-2025)",
    courses: [
      { code: "IT1110", classCode: "010110110101", name: "Nhập môn lập trình", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT1010", status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "IT1020", classCode: "010110110201", name: "Hệ thống máy tính & Linh kiện", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.5, letterGrade: "A" },
      { code: "MI1125", classCode: "010110020401", name: "Giải tích 2", credits: 3, theoryHours: 45, practiceHours: 0, required: true, prerequisite: "MI1110", status: "passed", score10: 7.1, letterGrade: "B" },
      { code: "PH1110", classCode: "010110030101", name: "Vật lý đại cương 1", credits: 3, theoryHours: 30, practiceHours: 15, required: true, status: "passed", score10: 7.5, letterGrade: "B" },
      { code: "EN1110", classCode: "010110050101", name: "Tiếng Anh 1", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "passed", score10: 8.2, letterGrade: "B+" },
      { code: "SK1010", classCode: "010110070101", name: "Kỹ năng giao tiếp và làm việc nhóm", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "GDQP102", classCode: "010110080201", name: "Giáo dục Quốc phòng - An ninh 2", credits: 2, theoryHours: 0, practiceHours: 60, required: true, prerequisite: "GDQP101", status: "passed", score10: 8.6, letterGrade: "A" },
    ],
  },
  {
    semester: 3,
    title: "Học kỳ 3 (Năm thứ hai)",
    termCode: "Đợt 1 (2025-2026)",
    courses: [
      { code: "IT1120", classCode: "010110110301", name: "Kỹ thuật lập trình C/C++", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT1110", status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "IT1130", classCode: "010110110401", name: "Lập trình Python cơ bản", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT1110", status: "passed", score10: 8.8, letterGrade: "A" },
      { code: "MI1150", classCode: "010110020501", name: "Phương pháp tính", credits: 3, theoryHours: 30, practiceHours: 15, required: true, prerequisite: "MI1130", status: "passed", score10: 7.6, letterGrade: "B" },
      { code: "PH1120", classCode: "010110030201", name: "Vật lý đại cương 2", credits: 3, theoryHours: 30, practiceHours: 15, required: true, prerequisite: "PH1110", status: "passed", score10: 7.3, letterGrade: "B" },
      { code: "SS2020", classCode: "010110010201", name: "Kinh tế chính trị Mác - Lênin", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "SS1010", status: "passed", score10: 8.0, letterGrade: "B+" },
      { code: "SS2030", classCode: "010110010301", name: "Chủ nghĩa xã hội khoa học", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "SS2020", status: "passed", score10: 8.3, letterGrade: "B+" },
      { code: "LAW1010", classCode: "010110060101", name: "Pháp luật đại cương", credits: 2, theoryHours: 30, practiceHours: 0, required: true, status: "passed", score10: 8.3, letterGrade: "B+" },
    ],
  },
  {
    semester: 4,
    title: "Học kỳ 4 (Năm thứ hai)",
    termCode: "Đợt 2 (2025-2026)",
    courses: [
      { code: "IT2010", classCode: "010110120101", name: "Cấu trúc dữ liệu và giải thuật", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT1120", status: "passed", score10: 8.7, letterGrade: "A" },
      { code: "IT2030", classCode: "010110120201", name: "Kiến trúc máy tính", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT1020", status: "passed", score10: 7.7, letterGrade: "B" },
      { code: "IT2050", classCode: "010110120301", name: "Nguyên lý hệ điều hành", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT2030", status: "passed", score10: 8.3, letterGrade: "B+" },
      { code: "IT2060", classCode: "010110120401", name: "Kỹ thuật số và vi xử lý", credits: 3, theoryHours: 30, practiceHours: 30, required: true, status: "passed", score10: 8.0, letterGrade: "B+" },
      { code: "MI1120", classCode: "010110020301", name: "Xác suất thống kê", credits: 3, theoryHours: 45, practiceHours: 0, required: true, prerequisite: "MI1125", status: "passed", score10: 7.4, letterGrade: "B" },
      { code: "EN1120", classCode: "010110050201", name: "Tiếng Anh 2", credits: 3, theoryHours: 45, practiceHours: 0, required: true, prerequisite: "EN1110", status: "passed", score10: 9.0, letterGrade: "A" },
      { code: "PE1020", classCode: "010110090201", name: "Giáo dục thể chất 2", credits: 1, theoryHours: 0, practiceHours: 30, required: true, prerequisite: "PE1010", status: "passed", score10: 8.3, letterGrade: "B+" },
    ],
  },
  {
    semester: 5,
    title: "Học kỳ 5 (Năm thứ ba · Hiện tại)",
    termCode: "Đợt 1 (2026-2027)",
    courses: [
      { code: "IT3040", classCode: "010110210101", name: "Lập trình hướng đối tượng", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT1120", status: "in_progress" },
      { code: "IT3090", classCode: "010110210201", name: "Cơ sở dữ liệu", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT2010", status: "in_progress" },
      { code: "IT3080", classCode: "010110210301", name: "Mạng máy tính", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT2030", status: "in_progress" },
      { code: "MI1140", classCode: "010110210401", name: "Toán rời rạc", credits: 3, theoryHours: 45, practiceHours: 0, required: true, status: "in_progress" },
      { code: "EN2130", classCode: "010110210501", name: "Tiếng Anh chuyên ngành", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "EN1120", status: "in_progress" },
      { code: "PE1030", classCode: "010110090301", name: "Giáo dục thể chất 3", credits: 1, theoryHours: 0, practiceHours: 30, required: false, status: "in_progress" },
    ],
  },
  {
    semester: 6,
    title: "Học kỳ 6 (Năm thứ ba)",
    termCode: "Đợt 2 (2026-2027)",
    courses: [
      { code: "IT3100", classCode: "010110220101", name: "Phát triển ứng dụng web", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3040", status: "upcoming" },
      { code: "IT3120", classCode: "010110220201", name: "Hệ quản trị Cơ sở dữ liệu", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3090", status: "upcoming" },
      { code: "IT3150", classCode: "010110230101", name: "Trí tuệ nhân tạo", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT2010", status: "upcoming" },
      { code: "IT3160", classCode: "010110230201", name: "Kiểm thử và đảm bảo chất lượng phần mềm", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3040", status: "upcoming" },
      { code: "IT3180", classCode: "010110230301", name: "Phân tích và thiết kế hệ thống thông tin", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3090", status: "upcoming" },
      { code: "IT3190", classCode: "010110230401", name: "Lập trình thiết bị di động", credits: 3, theoryHours: 30, practiceHours: 30, required: false, prerequisite: "IT3040", status: "upcoming" },
      { code: "SS3010", classCode: "010110010401", name: "Lịch sử Đảng Cộng sản Việt Nam", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "SS2030", status: "upcoming" },
    ],
  },
  {
    semester: 7,
    title: "Học kỳ 7 (Năm thứ tư · Chuyên sâu)",
    termCode: "Đợt 1 (2027-2028)",
    courses: [
      { code: "IT4010", classCode: "010110240101", name: "Công nghệ phần mềm nâng cao & DevOps", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3100", status: "upcoming" },
      { code: "IT4020", classCode: "010110240201", name: "An toàn và bảo mật thông tin", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3080", status: "upcoming" },
      { code: "IT4040", classCode: "010110240301", name: "Điện toán đám mây & Kiến trúc Microservices", credits: 3, theoryHours: 30, practiceHours: 30, required: true, prerequisite: "IT3080", status: "upcoming" },
      { code: "IT4060", classCode: "010110240401", name: "Học máy ứng dụng (Machine Learning)", credits: 3, theoryHours: 30, practiceHours: 30, required: false, prerequisite: "IT3150", status: "upcoming" },
      { code: "IT4080", classCode: "010110240501", name: "Quản lý dự án Công nghệ thông tin", credits: 3, theoryHours: 30, practiceHours: 15, required: true, status: "upcoming" },
      { code: "IT4100", classCode: "010110240601", name: "Đồ án chuyên ngành Kỹ thuật phần mềm", credits: 5, theoryHours: 0, practiceHours: 150, required: true, prerequisite: "IT3100", status: "upcoming" },
      { code: "SS3020", classCode: "010110010501", name: "Tư tưởng Hồ Chí Minh", credits: 2, theoryHours: 30, practiceHours: 0, required: true, prerequisite: "SS3010", status: "upcoming" },
    ],
  },
  {
    semester: 8,
    title: "Học kỳ 8 (Thực tập & Khóa luận Tốt nghiệp)",
    termCode: "Đợt 2 (2027-2028)",
    courses: [
      { code: "IT4910", classCode: "010110240001", name: "Thực tập tốt nghiệp doanh nghiệp", credits: 8, theoryHours: 0, practiceHours: 240, required: true, status: "upcoming" },
      { code: "IT4990", classCode: "010110356701", name: "Đồ án tốt nghiệp Kỹ sư Công nghệ thông tin", credits: 12, theoryHours: 0, practiceHours: 360, required: true, prerequisite: "IT4910", status: "upcoming" },
    ],
  },
];

// ---------- Schedule by Progress (Lịch theo tiến độ) ----------

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
  { id: "sp-1", classCode: "010110210101", courseCode: "IT3040", courseName: "Lập trình hướng đối tượng", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 2", periods: "Tiết 1 - 3", room: "A1-301", lecturer: "ThS. Trần Minh Đức", startDate: "07/09/2026", endDate: "14/12/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 8, totalWeeks: 15 },
  { id: "sp-2", classCode: "010110210101", courseCode: "IT3040", courseName: "Lập trình hướng đối tượng", credits: 3, group: "TH1", kind: "Thực hành", dayOfWeek: "Thứ 4", periods: "Tiết 6 - 9", room: "B1-Lab 3", lecturer: "ThS. Trần Minh Đức", startDate: "16/09/2026", endDate: "09/12/2026", weeksRange: "Tuần 2 - 14", completedWeeks: 7, totalWeeks: 13 },
  { id: "sp-3", classCode: "010110210201", courseCode: "IT3090", courseName: "Cơ sở dữ liệu", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 3", periods: "Tiết 1 - 3", room: "A1-402", lecturer: "TS. Phạm Thu Hà", startDate: "08/09/2026", endDate: "15/12/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 8, totalWeeks: 15 },
  { id: "sp-4", classCode: "010110210201", courseCode: "IT3090", courseName: "Cơ sở dữ liệu", credits: 3, group: "TH2", kind: "Thực hành", dayOfWeek: "Thứ 5", periods: "Tiết 7 - 10", room: "B1-Lab 1", lecturer: "TS. Phạm Thu Hà", startDate: "17/09/2026", endDate: "10/12/2026", weeksRange: "Tuần 2 - 14", completedWeeks: 7, totalWeeks: 13 },
  { id: "sp-5", classCode: "010110210301", courseCode: "IT3080", courseName: "Mạng máy tính", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 5", periods: "Tiết 1 - 3", room: "A1-301", lecturer: "ThS. Lê Quang Vinh", startDate: "10/09/2026", endDate: "17/12/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 8, totalWeeks: 15 },
  { id: "sp-6", classCode: "010110210301", courseCode: "IT3080", courseName: "Mạng máy tính", credits: 3, group: "TH1", kind: "Thực hành", dayOfWeek: "Thứ 6", periods: "Tiết 4 - 5", room: "B1-Lab 2", lecturer: "ThS. Lê Quang Vinh", startDate: "18/09/2026", endDate: "18/12/2026", weeksRange: "Tuần 2 - 15", completedWeeks: 7, totalWeeks: 14 },
  { id: "sp-7", classCode: "010110210401", courseCode: "MI1140", courseName: "Toán rời rạc", credits: 3, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 2", periods: "Tiết 6 - 8", room: "A2-205", lecturer: "TS. Vũ Đình Khoa", startDate: "07/09/2026", endDate: "14/12/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 8, totalWeeks: 15 },
  { id: "sp-8", classCode: "010110210501", courseCode: "EN2130", courseName: "Tiếng Anh chuyên ngành", credits: 2, group: "LT", kind: "Lý thuyết", dayOfWeek: "Thứ 3", periods: "Tiết 7 - 8", room: "C1-104", lecturer: "ThS. Đỗ Thanh Mai", startDate: "08/09/2026", endDate: "15/12/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 8, totalWeeks: 15 },
  { id: "sp-9", classCode: "010110090301", courseCode: "PE1030", courseName: "Giáo dục thể chất 3", credits: 1, group: "TH", kind: "Thực hành", dayOfWeek: "Thứ 7", periods: "Tiết 1 - 2", room: "Nhà thi đấu", lecturer: "ThS. Hoàng Văn Tùng", startDate: "12/09/2026", endDate: "19/12/2026", weeksRange: "Tuần 1 - 15", completedWeeks: 8, totalWeeks: 15 },
];

// ---------- Attendance (Thông tin điểm danh) ----------

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
    classCode: "010110210101",
    courseCode: "IT3040",
    courseName: "Lập trình hướng đối tượng",
    credits: 3,
    lecturer: "ThS. Trần Minh Đức",
    totalPeriods: 60,
    attendedPeriods: 57,
    excusedAbsences: 3,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 12,
    logs: [{ date: "14/10/2026", periods: "Tiết 6 - 8", type: "Có phép", note: "Tham gia đội tuyển Olympic Tin học cấp trường" }],
  },
  {
    classCode: "010110210201",
    courseCode: "IT3090",
    courseName: "Cơ sở dữ liệu",
    credits: 3,
    lecturer: "TS. Phạm Thu Hà",
    totalPeriods: 60,
    attendedPeriods: 60,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 12,
    logs: [],
  },
  {
    classCode: "010110210301",
    courseCode: "IT3080",
    courseName: "Mạng máy tính",
    credits: 3,
    lecturer: "ThS. Lê Quang Vinh",
    totalPeriods: 60,
    attendedPeriods: 58,
    excusedAbsences: 0,
    unexcusedAbsences: 2,
    maxAllowedAbsences: 12,
    logs: [{ date: "02/10/2026", periods: "Tiết 4 - 5", type: "Không phép", note: "Vắng buổi thực hành bấm cáp mạng" }],
  },
  {
    classCode: "010110210401",
    courseCode: "MI1140",
    courseName: "Toán rời rạc",
    credits: 3,
    lecturer: "TS. Vũ Đình Khoa",
    totalPeriods: 45,
    attendedPeriods: 45,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 9,
    logs: [],
  },
  {
    classCode: "010110210501",
    courseCode: "EN2130",
    courseName: "Tiếng Anh chuyên ngành",
    credits: 2,
    lecturer: "ThS. Đỗ Thanh Mai",
    totalPeriods: 30,
    attendedPeriods: 30,
    excusedAbsences: 0,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 6,
    logs: [],
  },
  {
    classCode: "010110090301",
    courseCode: "PE1030",
    courseName: "Giáo dục thể chất 3",
    credits: 1,
    lecturer: "ThS. Hoàng Văn Tùng",
    totalPeriods: 30,
    attendedPeriods: 28,
    excusedAbsences: 2,
    unexcusedAbsences: 0,
    maxAllowedAbsences: 6,
    logs: [{ date: "17/10/2026", periods: "Tiết 1 - 2", type: "Có phép", note: "Đơn xin nghỉ ốm có xác nhận trạm y tế" }],
  },
];

// ---------- Electronic Receipts (Phiếu thu trực tuyến & Phiếu thu tổng hợp) ----------

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
    id: "rcp-2026-01",
    receiptNo: "PT2026/004812",
    invoiceSymbol: "1C26TAA",
    term: "Đợt 1 (2026-2027)",
    kind: "Phiếu thu trực tuyến",
    collectedAt: "25/10/2026 10:24",
    cashier: "Cổng thanh toán tự động PMT-EMS",
    method: "VietQR trực tuyến",
    transactionRef: "SDU2200286-0926",
    status: "Đã gạch nợ",
    items: [
      { code: "010110210101", description: "Tạm thu học phí Lập trình hướng đối tượng", credits: 3, amount: 1_350_000 },
      { code: "010110210201", description: "Tạm thu học phí Cơ sở dữ liệu", credits: 3, amount: 1_350_000 },
      { code: "BHYT-2026", description: "Thu Bảo hiểm y tế sinh viên năm 2026", amount: 300_000 },
    ],
  },
  {
    id: "rcp-2026-02",
    receiptNo: "PT2026/001905",
    invoiceSymbol: "1C26TAB",
    term: "Đợt 2 (2025-2026)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "18/05/2026 09:02",
    cashier: "Phòng Tài chính - Kế toán (Nguyễn Thị Hạnh)",
    method: "Chuyển khoản ngân hàng",
    transactionRef: "SDU2200286-0426",
    status: "Đã phát hành biên lai",
    items: [
      { code: "010110120101", description: "Học phí Cấu trúc dữ liệu và giải thuật", credits: 3, amount: 1_350_000 },
      { code: "010110120201", description: "Học phí Kiến trúc máy tính", credits: 3, amount: 1_350_000 },
      { code: "010110020301", description: "Học phí Xác suất thống kê", credits: 3, amount: 1_350_000 },
      { code: "010110050201", description: "Học phí Tiếng Anh 2", credits: 3, amount: 1_350_000 },
      { code: "010110090201", description: "Học phí Giáo dục thể chất 2", credits: 1, amount: 450_000 },
    ],
  },
  {
    id: "rcp-2025-01",
    receiptNo: "PT2025/008341",
    invoiceSymbol: "1C25TAC",
    term: "Đợt 1 (2025-2026)",
    kind: "Phiếu thu tổng hợp",
    collectedAt: "12/10/2025 14:18",
    cashier: "Phòng Tài chính - Kế toán (Nguyễn Thị Hạnh)",
    method: "Thu tại quầy",
    transactionRef: "SDU2200286-1025",
    status: "Đã phát hành biên lai",
    items: [
      { code: "HP-HK1-2526", description: "Học phí tổng hợp Đợt 1 (2025-2026) (16 tín chỉ)", credits: 16, amount: 7_200_000 },
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
    category: "Bảo hiểm y tế",
    fieldLabel: "Mã số BHYT / Nơi ĐK khám chữa bệnh ban đầu",
    oldValue: "SV4303020400864 · Bệnh viện Đa khoa TP. Chí Linh",
    newValue: "SV4303020400864 · Trung tâm Y tế TP. Chí Linh",
    reason: "Cập nhật nơi đăng ký khám chữa bệnh ban đầu theo thông báo Đợt 1 (2026-2027)",
    submittedAt: "15/09/2026 08:40",
    status: "Đã duyệt",
  },
];

// ---------- Objective Student Portfolio / Dossier (Hồ sơ của bạn) ----------

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
    studentScore: 84,
    cohortAvg: 71,
    targetBenchmark: 80,
    evidence: "GPA tích lũy 3.25/4.0 (Top 18% lớp DK13-CNTT1), đạt điểm A các môn Lập trình & CTDL-GT",
    improvementHint: "Cần củng cố nhóm môn Toán nền tảng (Giải tích 1, Đại số tuyến tính đang ở mức C/B) để tối ưu tư duy thuật toán nâng cao.",
  },
  {
    id: "comp-code",
    label: "Kỹ năng Thực hành & Xây dựng phần mềm",
    shortLabel: "Thực hành",
    studentScore: 88,
    cohortAvg: 73,
    targetBenchmark: 85,
    evidence: "Điểm thực hành phòng Lab đạt 8.8/10; hoàn thành 100% bài tập lớn OOP (IT3040) và CSDL (IT3090)",
    improvementHint: "Bổ sung thêm dự án triển khai thực tế có CI/CD và kiểm thử tự động trước kỳ Thực tập doanh nghiệp.",
  },
  {
    id: "comp-attendance",
    label: "Kỷ luật & Chuyên cần học tập",
    shortLabel: "Chuyên cần",
    studentScore: 95,
    cohortAvg: 89,
    targetBenchmark: 90,
    evidence: "Tỷ lệ có mặt 278/285 tiết (97.5%); chỉ vắng 2 tiết không phép môn Mạng máy tính (IT3080)",
    improvementHint: "Duy trì kỷ luật giờ giấc ở các ca thực hành chiều Thứ 6 để đạt 100% điểm chuyên cần toàn kỳ.",
  },
  {
    id: "comp-conduct",
    label: "Điểm rèn luyện & Trách nhiệm cộng đồng",
    shortLabel: "Rèn luyện",
    studentScore: 82,
    cohortAvg: 76,
    targetBenchmark: 80,
    evidence: "Điểm rèn luyện 82/100 (Xếp loại Tốt); thành viên tích cực CLB Tin học Sao Đỏ & hiến máu tình nguyện",
    improvementHint: "Tham gia thêm 1 hoạt động nghiên cứu khoa học hoặc Olympic cấp trường (+5 điểm) để đạt mức Xuất sắc (≥90).",
  },
  {
    id: "comp-lang",
    label: "Ngoại ngữ & Hội nhập chuyên ngành",
    shortLabel: "Ngoại ngữ",
    studentScore: 86,
    cohortAvg: 68,
    targetBenchmark: 75,
    evidence: "Đạt chuẩn B1 khung tham chiếu; Tiếng Anh 1 (8.0), Tiếng Anh 2 (8.9), đang học Tiếng Anh chuyên ngành IT",
    improvementHint: "Luyện thêm kỹ năng viết tài liệu kỹ thuật (Technical Writing) và phỏng vấn tiếng Anh cho doanh nghiệp FDI.",
  },
  {
    id: "comp-career",
    label: "Mức độ sẵn sàng Thực tập & Nghề nghiệp",
    shortLabel: "Nghề nghiệp",
    studentScore: 79,
    cohortAvg: 65,
    targetBenchmark: 85,
    evidence: "Đã tích lũy 87% kỹ năng nền tảng chuyên ngành Công nghệ phần mềm; có hồ sơ dự án cá nhân",
    improvementHint: "Hoàn thiện CV chuẩn ATS và bổ sung chứng chỉ/minh chứng dự án thực tế vào biểu mẫu ứng tuyển thực tập.",
  },
];

export const objectiveObservations: ObjectiveObservation[] = [
  {
    id: "obs-1",
    perspective: "advisor",
    badge: "Hội đồng Học vụ & Cố vấn",
    tone: "good",
    title: "Năng lực lập trình cốt lõi vượt trội so với mặt bằng khóa",
    metric: "+0.42 GPA so với TB lớp",
    summary:
      "Dữ liệu đối sánh khách quan cho thấy bạn đạt điểm A ở cả Nhập môn lập trình (8.7) và Cấu trúc dữ liệu & Giải thuật (8.5), cao hơn 19% so với điểm trung bình lớp DK13-CNTT1. Đây là nền tảng rất vững để theo hướng Kỹ thuật phần mềm hoặc AI.",
    evidenceRef: "Bảng điểm HK1 & HK2 (IT1110, IT2010)",
    suggestedFormId: "tpl-scholarship",
  },
  {
    id: "obs-2",
    perspective: "self",
    badge: "Phân tích Điểm mù & Độ lệch",
    tone: "warn",
    title: "Độ lệch giữa môn Thực hành code và Toán lý thuyết",
    metric: "Chênh lệch 2.1 điểm (Hệ 10)",
    summary:
      "Trong khi nhóm môn lập trình và ngoại ngữ đạt trung bình 8.53/10, nhóm môn Toán nền tảng (Giải tích 1: 6.2, Đại số tuyến tính: 7.0) đang kéo GPA tích lũy xuống. Cần chú ý đặc biệt môn Toán rời rạc (MI1140) đang học kỳ này.",
    evidenceRef: "Đối sánh khối kiến thức đại cương vs chuyên ngành",
    suggestedFormId: "tpl-academic-plan",
  },
  {
    id: "obs-3",
    perspective: "employer",
    badge: "Góc nhìn Nhà tuyển dụng IT",
    tone: "good",
    title: "Hồ sơ thực tập sáng giá nhờ ngoại ngữ và kỷ luật phòng Lab",
    metric: "Top 15% chỉ số sẵn sàng",
    summary:
      "Nhà tuyển dụng đánh giá cao sinh viên có điểm Tiếng Anh 2 đạt 8.9 (A), tỷ lệ chuyên cần thực hành đạt 97.5% và tham gia CLB học thuật (CLB Tin học Sao Đỏ). Bạn đủ điều kiện ứng tuyển sớm các vị trí Intern Backend / Fullstack.",
    evidenceRef: "Hồ sơ CLB + Điểm danh Lab B1 + Chuẩn ngoại ngữ B1",
    suggestedFormId: "tpl-internship-cv",
  },
  {
    id: "obs-4",
    perspective: "advisor",
    badge: "Rà soát Hồ sơ hành chính",
    tone: "neutral",
    title: "Đồng bộ thông tin liên hệ, Ngân hàng & BHYT trước đợt xét học bổng",
    metric: "100% trường bắt buộc đã khai",
    summary:
      "Hồ sơ hành chính đã đầy đủ 38/38 mục. Tuy nhiên nếu có thay đổi địa chỉ nội trú KTX, số tài khoản BIDV nhận học bổng hoặc thông tin minh chứng ngoại khóa, bạn nên xuất sang biểu mẫu chuẩn để gửi Phòng CTSV.",
    evidenceRef: "Hồ sơ gốc 22SDU.CNTT.0286",
    suggestedFormId: "tpl-profile-correction",
    suggestedField: {
      category: "Hồ sơ cá nhân",
      fieldLabel: "Chứng chỉ & Thành tích học thuật bổ sung",
      oldValue: "B1 · Đã hoàn thành EN2130",
      newValue: "B1 Tiếng Anh + Thành viên Ban chuyên môn CLB Tin học Sao Đỏ (GPA 3.25)",
      reason: "Cập nhật hồ sơ năng lực phục vụ xét học bổng khuyến khích học tập và thực tập doanh nghiệp",
    },
  },
];

export const portfolioProjects: PortfolioProjectItem[] = [
  {
    id: "prj-1",
    title: "Hệ thống Quản lý Thư viện & Mượn trả sách thông minh",
    courseCode: "IT3040 · Lập trình hướng đối tượng",
    semester: "HK1 2026-2027",
    role: "Trưởng nhóm thiết kế hướng đối tượng (Backend & Domain Model)",
    stack: ["TypeScript", "OOP Design Patterns", "SQLite", "Unit Test"],
    score: "9.2 / 10 (Đánh giá sớm)",
    verifiedBy: "ThS. Trần Minh Đức",
    highlight: "Áp dụng chuẩn kế thừa, đa hình và tách tầng dịch vụ; xử lý 1.200 bản ghi sách thử nghiệm không lỗi.",
  },
  {
    id: "prj-2",
    title: "Thiết kế Cơ sở dữ liệu Quản lý Sinh viên & Học vụ chuẩn 3NF",
    courseCode: "IT3090 · Cơ sở dữ liệu",
    semester: "HK1 2026-2027",
    role: "Thiết kế lược đồ quan hệ & tối ưu truy vấn SQL",
    stack: ["PostgreSQL", "ERD 3NF", "Stored Procedures", "Indexing"],
    score: "9.0 / 10 (Thực hành Lab 1)",
    verifiedBy: "TS. Phạm Thu Hà",
    highlight: "Xây dựng 14 bảng chuẩn hóa 3NF, viết 25 truy vấn thống kê GPA và công nợ chạy dưới 8ms.",
  },
  {
    id: "prj-3",
    title: "Bộ công cụ mô phỏng cấu trúc dữ liệu Đồ thị & Cây tìm kiếm",
    courseCode: "IT2010 · Cấu trúc dữ liệu và giải thuật",
    semester: "HK2 2025-2026",
    role: "Lập trình viên chính (C++ / Giao diện trực quan)",
    stack: ["C++20", "AVL Tree", "Dijkstra / BFS", "Benchmark"],
    score: "8.5 / 10 (Điểm A)",
    verifiedBy: "Bộ môn Khoa học máy tính",
    highlight: "Đạt điểm A tổng kết học phần; được chọn làm bài mẫu minh họa tại CLB Tin học Sao Đỏ.",
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
      title: "Hồ sơ năng lực & CV ứng tuyển Thực tập Doanh nghiệp",
      recipient: "Phòng Nhân sự / Đơn vị tiếp nhận thực tập & Trung tâm Hỗ trợ sinh viên SDU",
      category: "Thực tập & Tuyển dụng",
      description:
        "Bản trích xuất khách quan năng lực học thuật, kỹ năng lập trình, dự án môn học đã kiểm chứng và điểm rèn luyện để gửi doanh nghiệp đối tác hoặc chỉnh sửa thành CV cá nhân.",
      fields: [
        { key: "fullName", label: "Họ và tên ứng viên", value: student.displayName },
        { key: "studentCode", label: "Mã sinh viên / Hồ sơ", value: `${student.code} · 22SDU.CNTT.${student.code.slice(-4)}` },
        { key: "classDept", label: "Lớp niên chế & Khoa", value: `${student.cohortClass} · ${student.department}` },
        { key: "contact", label: "Liên hệ (Email & SĐT)", value: `${student.email} · ${student.phone}` },
        { key: "targetRole", label: "Vị trí thực tập mục tiêu", value: "Thực tập sinh Kỹ thuật phần mềm (Backend / Fullstack Web Developer)" },
        { key: "gpaSummary", label: "Chỉ số học thuật khách quan", value: `GPA ${student.gpaValue}/4.0 (${student.standingLabel}) · Tích lũy ${student.earnedCredits}/${student.requiredCredits} tín chỉ · Chuyên cần ${student.attendancePct}%` },
        {
          key: "objectivePitch",
          label: "Tóm tắt năng lực khách quan (Objective Summary)",
          value: `Sinh viên năm 3 chuyên ngành Công nghệ phần mềm tại Trường Đại học Sao Đỏ với GPA ${student.gpaValue}/4.0 (Top 18% lớp ${student.cohortClass}). Đạt điểm A ở các học phần cốt lõi: Nhập môn lập trình (8.7), Cấu trúc dữ liệu & Giải thuật (8.5), Tiếng Anh 2 (8.9). Tỷ lệ chuyên cần thực hành phòng Lab đạt ${student.attendancePct}%, có kinh nghiệm thiết kế CSDL chuẩn 3NF và phát triển ứng dụng hướng đối tượng.`,
          wide: true,
          multiline: true,
        },
        {
          key: "coreSkills",
          label: "Kỹ năng chuyên môn & Công nghệ đã kiểm chứng",
          value: "Lập trình: TypeScript/JavaScript, C++20, SQL (PostgreSQL/SQLite), HTML/CSS · Kiến thức nền: OOP, Cấu trúc dữ liệu & Giải thuật, Thiết kế CSDL 3NF, Mạng máy tính · Ngoại ngữ: Tiếng Anh B1 (8.9/10)",
          wide: true,
          multiline: true,
        },
        {
          key: "projectsSummary",
          label: "Dự án học thuật & Thực hành nổi bật",
          value: "1) Hệ thống Quản lý Thư viện thông minh (IT3040 - 9.2/10): Thiết kế Domain Model OOP & Unit Test.\n2) CSDL Quản lý Sinh viên & Học vụ chuẩn 3NF (IT3090 - 9.0/10): 14 bảng, 25 truy vấn tối ưu < 8ms.\n3) Bộ công cụ mô phỏng Đồ thị & Cây tìm kiếm (IT2010 - Điểm A): C++20, minh họa tại CLB Tin học Sao Đỏ.",
          wide: true,
          multiline: true,
        },
        {
          key: "extracurricular",
          label: "Hoạt động ngoại khóa & Kỷ luật rèn luyện",
          value: `Điểm rèn luyện: ${student.conductScore}/100 (Xếp loại ${student.conductRank}) · Thành viên CLB Tin học Sao Đỏ · Tham gia Hiến máu tình nguyện "Giọt hồng Sao Đỏ" · Cố vấn học tập xác nhận: ${student.advisorName}.`,
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-scholarship",
      code: "MẪU 02-HBKK",
      title: "Biểu mẫu xét Học bổng Khuyến khích học tập & Sinh viên 5 Tốt",
      recipient: "Hội đồng xét cấp Học bổng & Phòng Công tác sinh viên - Trường Đại học Sao Đỏ",
      category: "Học bổng & Danh hiệu",
      description:
        "Tổng hợp khách quan 5 tiêu chí (Đạo đức tốt, Học tập tốt, Thể lực tốt, Tình nguyện tốt, Hội nhập tốt) kèm điểm trung bình tích lũy và điểm rèn luyện để nộp xét học bổng hoặc danh hiệu.",
      fields: [
        { key: "fullName", label: "Họ và tên sinh viên", value: student.displayName },
        { key: "studentCode", label: "Mã số sinh viên", value: student.code },
        { key: "cohortClass", label: "Lớp / Khoa", value: `${student.cohortClass} · ${student.department}` },
        { key: "termApplied", label: "Đợt xét duyệt", value: "Học kỳ 1, năm học 2026-2027" },
        { key: "gpaMetric", label: "Tiêu chí Học tập tốt (GPA & Tín chỉ)", value: `GPA tích lũy ${student.gpaValue}/4.0 · Xếp loại ${student.standingLabel} · Không có học phần nợ/học lại` },
        { key: "conductMetric", label: "Tiêu chí Đạo đức tốt (Điểm rèn luyện)", value: `${student.conductScore}/100 điểm · Xếp loại ${student.conductRank} · Chấp hành nghiêm nội quy nhà trường` },
        {
          key: "fiveGoodCriteria",
          label: "Minh chứng Thể lực tốt · Tình nguyện tốt · Hội nhập tốt",
          value: "- Thể lực tốt: Đạt điểm A (8.7) Giáo dục thể chất 1 và B+ (8.2) Giáo dục thể chất 2.\n- Tình nguyện tốt: Tham gia chương trình Hiến máu tình nguyện \"Giọt hồng Sao Đỏ\" (+5 ĐRL) và Chủ nhật xanh KTX.\n- Hội nhập tốt: Hoàn thành chuẩn ngoại ngữ B1, điểm Tiếng Anh 2 đạt 8.9 (A), sinh hoạt thường xuyên tại CLB Tin học Sao Đỏ.",
          wide: true,
          multiline: true,
        },
        {
          key: "studentCommitment",
          label: "Cam đoan của sinh viên & Đề xuất của Cố vấn học tập",
          value: `Tôi xin cam đoan các số liệu trích xuất từ Cổng học tập Đại học Sao Đỏ là hoàn toàn chính xác. Kính đề nghị Hội đồng xét duyệt và Cố vấn học tập (${student.advisorName}) xác nhận.`,
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-profile-correction",
      code: "MẪU 03-ĐXCN",
      title: "Phiếu đề xuất chỉnh sửa & bổ sung dữ liệu Hồ sơ gốc HSSV",
      recipient: "Phòng Công tác sinh viên & Phòng Đào tạo (Luân chuyển trực tiếp sang trang Đề xuất cập nhật)",
      category: "Điều chỉnh dữ liệu gốc",
      targetRoute: "/student/profile-update",
      description:
        "Dùng khi sinh viên đối chiếu Hồ sơ mẫu phát hiện thông tin cá nhân, CCCD, địa chỉ, tài khoản ngân hàng, BHYT hoặc thành tích cần điều chỉnh trên hệ thống gốc.",
      fields: [
        { key: "category", label: "Nhóm thông tin cần điều chỉnh", value: "Hồ sơ cá nhân" },
        { key: "fieldLabel", label: "Trường thông tin cần chỉnh sửa / bổ sung", value: "Địa chỉ liên hệ hiện tại & Hồ sơ năng lực học thuật" },
        { key: "oldValue", label: "Giá trị đang lưu trên hệ thống", value: "Ký túc xá khu B, Trường Đại học Sao Đỏ, phường Sao Đỏ, TP. Chí Linh" },
        { key: "newValue", label: "Giá trị mới đề xuất cập nhật", value: "Ký túc xá khu B (Phòng B204), Trường Đại học Sao Đỏ · Bổ sung chứng nhận CLB Tin học & Chuẩn B1" },
        {
          key: "reason",
          label: "Lý do cập nhật & căn cứ minh chứng đính kèm",
          value: "Đồng bộ thông tin nội trú thực tế HK1 2026-2027 và bổ sung minh chứng hồ sơ năng lực sinh viên phục vụ công tác cố vấn học tập.",
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-onestop-service",
      code: "MẪU 04-XNSV",
      title: "Đơn xin cấp Giấy xác nhận sinh viên & Bảng điểm trích lục",
      recipient: "Bộ phận Một cửa · Nhà A1 Cơ sở 1 (Luân chuyển trực tiếp sang trang Thủ tục & Góp ý)",
      category: "Hành chính - Học vụ",
      targetRoute: "/student/services",
      description:
        "Trích xuất sẵn thông tin học vụ, mã hồ sơ 22SDU, khóa học và GPA để gửi yêu cầu cấp Giấy xác nhận sinh viên hoặc Bảng điểm có dấu tại phòng Một cửa.",
      fields: [
        { key: "serviceType", label: "Loại thủ tục hành chính", value: "svc-enrol" },
        { key: "serviceName", label: "Tên giấy tờ yêu cầu", value: "Giấy xác nhận sinh viên & Trích lục kết quả học tập" },
        { key: "studentInfo", label: "Thông tin định danh trích xuất", value: `${student.displayName} · MSSV ${student.code} · Lớp ${student.cohortClass}` },
        { key: "academicStatus", label: "Tình trạng học vụ hiện tại", value: `Đang học chính quy (Niên khóa 2022–2026) · GPA ${student.gpaValue}/4.0` },
        {
          key: "purpose",
          label: "Mục đích sử dụng giấy tờ (chỉnh sửa trước khi gửi Một cửa)",
          value: `Bổ sung hồ sơ thực tập doanh nghiệp và hồ sơ xét học bổng học kỳ 1 năm học 2026-2027 (Kèm xác nhận GPA ${student.gpaValue} và ${student.earnedCredits} tín chỉ tích lũy).`,
          wide: true,
          multiline: true,
        },
      ],
    },
    {
      id: "tpl-academic-plan",
      code: "MẪU 05-KHHT",
      title: "Bản tự đánh giá khách quan & Kế hoạch cải thiện học tập cá nhân",
      recipient: `Cố vấn học tập lớp ${student.cohortClass} (${student.advisorName})`,
      category: "Hành chính - Học vụ",
      description:
        "Biểu mẫu giúp sinh viên tự nhìn nhận khách quan điểm mạnh, điểm yếu (độ lệch môn học, chuyên cần, ngoại khóa) và lập cam kết mục tiêu cho học kỳ tiếp theo.",
      fields: [
        { key: "studentName", label: "Sinh viên tự đánh giá", value: `${student.displayName} (${student.code})` },
        { key: "advisorName", label: "Cố vấn học tập đồng hành", value: student.advisorName },
        { key: "currentStanding", label: "Thực trạng học lực & Rèn luyện", value: `GPA: ${student.gpaValue}/4.0 (${student.standingLabel}) · ĐRL: ${student.conductScore}/100 (${student.conductRank}) · Chuyên cần: ${student.attendancePct}%` },
        { key: "nextTarget", label: "Mục tiêu định lượng cuối học kỳ", value: "Nâng GPA tích lũy lên ≥ 3.45/4.0 · Điểm rèn luyện ≥ 90/100 (Xuất sắc) · Không vắng tiết thực hành nào" },
        {
          key: "strengthsAnalysis",
          label: "Điểm mạnh khách quan (Dựa trên dữ liệu hệ thống)",
          value: "- Các môn lập trình cốt lõi và thực hành phòng Lab đạt kết quả cao (8.5 - 9.2/10).\n- Ngoại ngữ vượt chuẩn đầu ra (Tiếng Anh 1: 8.0, Tiếng Anh 2: 8.9).\n- Tỷ lệ chuyên cần 97.5%, hoàn thành đầy đủ bài tập được giao đúng hạn.",
          wide: true,
          multiline: true,
        },
        {
          key: "weaknessesAndPlan",
          label: "Điểm hạn chế cần khắc phục & Giải pháp cụ thể",
          value: "- Hạn chế: Nhóm môn Toán đại cương (Giải tích 1: 6.2, Đại số: 7.0) còn thấp hơn năng lực lập trình; còn 2 tiết vắng môn Mạng máy tính.\n- Giải pháp: Dành 4 giờ/tuần ôn tập Toán rời rạc (MI1140) cùng nhóm học tập CLB Tin học; hoàn thành đồ án môn OOP & CSDL đạt điểm A để kéo GPA tích lũy.",
          wide: true,
          multiline: true,
        },
      ],
    },
  ];
}



