"use client";

// Sample data for the student portal modules that are not wired to the school's systems yet
// (timetable, exams, grades, registration, activities, clubs, tuition, notices, services).
// Every page that reads from here shows the "Dữ liệu minh họa" banner. Dates are relative to
// the current week so the demo always looks current. Replace each export with an API call
// when the matching Supabase tables exist; the page components only depend on these types.

import { useCallback, useEffect, useState } from "react";

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
      { code: "IT2010", name: "Cấu trúc dữ liệu và giải thuật", credits: 3, attendance: 10, midterm: 8, final: 8.5 },
      { code: "IT2030", name: "Kiến trúc máy tính", credits: 3, attendance: 9, midterm: 7, final: 7.5 },
      { code: "MI1120", name: "Xác suất thống kê", credits: 3, attendance: 10, midterm: 6.5, final: 7 },
      { code: "EN1120", name: "Tiếng Anh 2", credits: 3, attendance: 10, midterm: 8.5, final: 9 },
      { code: "PE1020", name: "Giáo dục thể chất 2", credits: 1, attendance: 10, midterm: 8, final: 8 },
    ],
  },
  {
    name: "HK1 2025-2026",
    rows: [
      { code: "IT1110", name: "Nhập môn lập trình", credits: 3, attendance: 10, midterm: 9, final: 8.5 },
      { code: "MI1110", name: "Giải tích 1", credits: 3, attendance: 8, midterm: 6, final: 5.5 },
      { code: "MI1130", name: "Đại số tuyến tính", credits: 3, attendance: 9, midterm: 7, final: 6.5 },
      { code: "EN1110", name: "Tiếng Anh 1", credits: 3, attendance: 10, midterm: 8, final: 8 },
      { code: "SS1010", name: "Triết học Mác - Lênin", credits: 3, attendance: 10, midterm: 7.5, final: 7 },
      { code: "PE1010", name: "Giáo dục thể chất 1", credits: 1, attendance: 10, midterm: 9, final: 8.5 },
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

export const bank = { name: "Ngân hàng mẫu (demo)", account: "0000 0000 0000", holder: "TRUONG DAI HOC SAO DO" };

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

// ---------- Local demo state ----------

/** Choices made on demo pages (registrations, clubs joined, requests) are kept in this browser only. */
export function useDemoState<T>(key: string, initial: () => T) {
  const storageKey = `sao-do:demo:${key}`;
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setValue(JSON.parse(saved) as T);
      } catch {
        // Keep the initial demo value.
      }
    });
  }, [storageKey]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          // Demo state only.
        }
        return resolved;
      });
    },
    [storageKey],
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
