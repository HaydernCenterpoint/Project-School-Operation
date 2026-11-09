"use client";

import type { AcademicSession, ApiClass, Assignment, Submission } from "@sao-do/contracts";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "./supabase-browser";

export type AccountRole = "teacher" | "club_leader" | "class_student";

export type AccountPermissions = {
  canManageClassRoster: boolean;
  canCreateAssignment: boolean;
  canGradeSubmissions: boolean;
  canPostClassNotice: boolean;
  canEditStudentNotes: boolean;
  canManageClubMembers: boolean;
  canScheduleClubEvents: boolean;
  canPostClubAnnouncement: boolean;
  canSubmitAssignments: boolean;
  canJoinClubs: boolean;
};

export type PortalAccount = {
  id: string;
  role: AccountRole;
  roleTitle: string;
  roleBadge: "GV" | "CLB" | "SV";
  code: string;
  displayName: string;
  email: string;
  department: string;
  cohortClass: string;
  advisorId: string;
  advisorName: string;
  managedClubId?: string;
  managedClubName?: string;
  positionLabel: string;
  bio: string;
  phone: string;
  permissions: AccountPermissions;
};

export type ClassStudentRosterItem = {
  accountId: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  cohortClass: string;
  roleInClass:
    | "Lớp trưởng"
    | "Lớp phó học tập"
    | "Bí thư Chi đoàn"
    | "Phó bí thư Chi đoàn"
    | "Ủy viên BCH lớp"
    | "Trưởng CLB Tin học"
    | "Thành viên lớp";
  attendancePct: number;
  gpa: number;
  status: "active" | "warning";
  teacherNote: string;
};

export type SharedSubmissionRecord = {
  id: string;
  assignmentId: string;
  studentAccountId: string;
  studentCode: string;
  studentName: string;
  content: string;
  submittedAt: string;
  status: "submitted" | "reviewed";
  score: number | null;
  feedback: string | null;
  feedbackAt: string | null;
  gradedBy: string | null;
};

export type ClassAnnouncement = {
  id: string;
  classId: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  pinned?: boolean;
};

export type ClubMemberRecord = {
  id: string;
  clubId: string;
  studentCode: string;
  fullName: string;
  cohortClass: string;
  memberRole: "Chủ nhiệm CLB" | "Phó chủ nhiệm" | "Trưởng ban Chuyên môn" | "Thành viên";
  status: "active" | "pending";
  joinedAt: string;
  note?: string;
};

export type ClubEventRecord = {
  id: string;
  clubId: string;
  title: string;
  time: string;
  place: string;
  summary: string;
  createdBy: string;
  createdAt: string;
};

export type AttendanceMarkStatus = "present" | "excused" | "unexcused";

export type TeacherSubjectClass = {
  id: string;
  classCode: string;
  courseCode: string;
  name: string;
  credits: number;
  cohortClass: string;
  schedule: string;
  room: string;
  semester: string;
  totalPeriods: number;
  completedPeriods: number;
  teacherId: string;
  teacherName: string;
};

export type TeacherAttendanceSessionRecord = {
  id: string;
  subjectClassId: string;
  date: string;
  periods: string;
  topic: string;
  marks: Record<string, AttendanceMarkStatus>;
  notes: Record<string, string>;
  createdAt: string;
};

export type SharedPortalState = {
  activeAccountId: string;
  roster: ClassStudentRosterItem[];
  subjectClasses: TeacherSubjectClass[];
  attendanceSessions: TeacherAttendanceSessionRecord[];
  customAssignments: Assignment[];
  submissions: SharedSubmissionRecord[];
  classAnnouncements: ClassAnnouncement[];
  clubMembers: ClubMemberRecord[];
  clubEvents: ClubEventRecord[];
};

export const ROLE_PERMISSION_LABELS: {
  key: keyof AccountPermissions;
  label: string;
  group: "Lớp học & Giảng dạy" | "Câu lạc bộ" | "Học tập";
}[] = [
  { key: "canManageClassRoster", label: "Quản lý danh sách sinh viên lớp phụ trách", group: "Lớp học & Giảng dạy" },
  { key: "canCreateAssignment", label: "Giao bài tập mới & đặt hạn nộp cho lớp", group: "Lớp học & Giảng dạy" },
  { key: "canGradeSubmissions", label: "Chấm điểm & gửi nhận xét bài làm sinh viên", group: "Lớp học & Giảng dạy" },
  { key: "canPostClassNotice", label: "Đăng thông báo học vụ tới toàn lớp", group: "Lớp học & Giảng dạy" },
  { key: "canEditStudentNotes", label: "Cập nhật ghi chú cố vấn học tập & chuyên cần", group: "Lớp học & Giảng dạy" },
  { key: "canManageClubMembers", label: "Duyệt đơn gia nhập & phân quyền thành viên CLB", group: "Câu lạc bộ" },
  { key: "canScheduleClubEvents", label: "Lên lịch sinh hoạt & sự kiện CLB", group: "Câu lạc bộ" },
  { key: "canPostClubAnnouncement", label: "Phát hành bản tin nội bộ CLB", group: "Câu lạc bộ" },
  { key: "canSubmitAssignments", label: "Nộp bài tập học phần & nhận phản hồi", group: "Học tập" },
  { key: "canJoinClubs", label: "Đăng ký tham gia CLB & hoạt động ngoại khóa", group: "Học tập" },
];

export const PORTAL_ACCOUNTS: PortalAccount[] = [
  {
    id: "acc-teacher-duc",
    role: "teacher",
    roleTitle: "Giảng viên · Cố vấn học tập",
    roleBadge: "GV",
    code: "GV.CNTT.018",
    displayName: "ThS. Trần Minh Đức",
    email: "ductm@saodo.edu.vn",
    department: "Khoa Công nghệ thông tin",
    cohortClass: "DK13-CNTT1",
    advisorId: "acc-teacher-duc",
    advisorName: "ThS. Trần Minh Đức",
    positionLabel: "Giảng viên phụ trách IT3040 & Cố vấn học tập lớp DK13-CNTT1",
    bio: "Phụ trách học phần Lập trình hướng đối tượng (IT3040), Kiểm thử phần mềm (IT3160) và cố vấn học tập lớp niên chế DK13-CNTT1.",
    phone: "0912845102",
    permissions: {
      canManageClassRoster: true,
      canCreateAssignment: true,
      canGradeSubmissions: true,
      canPostClassNotice: true,
      canEditStudentNotes: true,
      canManageClubMembers: false,
      canScheduleClubEvents: false,
      canPostClubAnnouncement: false,
      canSubmitAssignments: false,
      canJoinClubs: false,
    },
  },
  {
    id: "acc-leader-minh",
    role: "club_leader",
    roleTitle: "Trưởng CLB · Sinh viên lớp DK13-CNTT1",
    roleBadge: "CLB",
    code: "2200286",
    displayName: "Nguyễn Văn Đạt",
    email: "2200286@sv.saodo.edu.vn",
    department: "Khoa Công nghệ thông tin",
    cohortClass: "DK13-CNTT1",
    advisorId: "acc-teacher-duc",
    advisorName: "ThS. Trần Minh Đức",
    managedClubId: "club-it",
    managedClubName: "CLB Tin học Sao Đỏ",
    positionLabel: "Chủ nhiệm CLB Tin học Sao Đỏ · Sinh viên lớp DK13-CNTT1 (Chuyên ngành CNPM)",
    bio: "Sinh viên lớp DK13-CNTT1 (Chuyên ngành Công nghệ phần mềm · Khóa 2022–2026) do ThS. Trần Minh Đức cố vấn; Chủ nhiệm CLB Tin học Sao Đỏ · Tích lũy 143/163 TC (GPA 3.08/4.0 · Khá, Đợt 2 2025–2026 đạt 3.74/4.0 · Xuất sắc).",
    phone: "0936651618",
    permissions: {
      canManageClassRoster: false,
      canCreateAssignment: false,
      canGradeSubmissions: false,
      canPostClassNotice: false,
      canEditStudentNotes: false,
      canManageClubMembers: true,
      canScheduleClubEvents: true,
      canPostClubAnnouncement: true,
      canSubmitAssignments: true,
      canJoinClubs: true,
    },
  },
  {
    id: "acc-student-linh",
    role: "class_student",
    roleTitle: "Sinh viên · Lớp trưởng DK13-CNTT1",
    roleBadge: "SV",
    code: "2200287",
    displayName: "Phạm Khánh Linh",
    email: "2200287@sv.saodo.edu.vn",
    department: "Khoa Công nghệ thông tin",
    cohortClass: "DK13-CNTT1",
    advisorId: "acc-teacher-duc",
    advisorName: "ThS. Trần Minh Đức",
    positionLabel: "Lớp trưởng lớp DK13-CNTT1 (Cố vấn: ThS. Trần Minh Đức)",
    bio: "Lớp trưởng lớp niên chế DK13-CNTT1, học viên lớp Lập trình hướng đối tượng (IT3040) của ThS. Trần Minh Đức.",
    phone: "0974118209",
    permissions: {
      canManageClassRoster: false,
      canCreateAssignment: false,
      canGradeSubmissions: false,
      canPostClassNotice: false,
      canEditStudentNotes: false,
      canManageClubMembers: false,
      canScheduleClubEvents: false,
      canPostClubAnnouncement: false,
      canSubmitAssignments: true,
      canJoinClubs: true,
    },
  },
  {
    id: "acc-student-hoang",
    role: "class_student",
    roleTitle: "Sinh viên · Lớp DK13-CNTT1",
    roleBadge: "SV",
    code: "2200288",
    displayName: "Lê Việt Hoàng",
    email: "2200288@sv.saodo.edu.vn",
    department: "Khoa Công nghệ thông tin",
    cohortClass: "DK13-CNTT1",
    advisorId: "acc-teacher-duc",
    advisorName: "ThS. Trần Minh Đức",
    positionLabel: "Sinh viên lớp DK13-CNTT1 (Cố vấn: ThS. Trần Minh Đức)",
    bio: "Sinh viên chính quy lớp DK13-CNTT1, đang theo học các lớp học phần IT3040, IT3090, EN2130.",
    phone: "0963502914",
    permissions: {
      canManageClassRoster: false,
      canCreateAssignment: false,
      canGradeSubmissions: false,
      canPostClassNotice: false,
      canEditStudentNotes: false,
      canManageClubMembers: false,
      canScheduleClubEvents: false,
      canPostClubAnnouncement: false,
      canSubmitAssignments: true,
      canJoinClubs: true,
    },
  },
];

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_CLASSES: ApiClass[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "Lập trình hướng đối tượng (IT3040)",
    teacherId: "acc-teacher-duc",
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    name: "Cơ sở dữ liệu (IT3090)",
    teacherId: "acc-teacher-ha",
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    name: "Tiếng Anh chuyên ngành (EN2130)",
    teacherId: "acc-teacher-mai",
    createdAt: "2026-09-01T08:00:00.000Z",
  },
];

const ANCHOR_MS = Date.UTC(2026, 9, 31, 8, 0, 0);

const daysFromNow = (days: number, hour = 23, minute = 59) => {
  const date = new Date(ANCHOR_MS + days * 86_400_000);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    tenantId: TENANT_ID,
    classId: "11111111-1111-4111-8111-111111111101",
    createdBy: "acc-teacher-duc",
    title: "Bài thực hành 1: Kế thừa, đa hình và thiết kế giao diện lớp trừu tượng",
    instructions:
      "Xây dựng hệ thống quản lý mượn trả sách thư viện Đại học Sao Đỏ bằng C++ hoặc Java. Yêu cầu: tối thiểu 1 lớp trừu tượng (TaiLieu), 3 lớp dẫn xuất (SachGiaoTrinh, LuanVan, TapChi), nạp chồng toán tử hoặc phương thức tính phí quá hạn và viết hàm kiểm thử đầy đủ.",
    status: "published",
    dueAt: daysFromNow(2),
    createdAt: daysFromNow(-5, 8, 30),
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    tenantId: TENANT_ID,
    classId: "11111111-1111-4111-8111-111111111102",
    createdBy: "acc-teacher-ha",
    title: "Thiết kế lược đồ quan hệ 3NF cho phân hệ quản lý điểm rèn luyện",
    instructions:
      "Xác định thực thể, phụ thuộc hàm và chuẩn hóa lược đồ CSDL về dạng chuẩn 3NF. Nộp kèm câu lệnh DDL tạo bảng, ràng buộc khóa ngoại và 5 truy vấn thống kê theo lớp niên chế.",
    status: "published",
    dueAt: daysFromNow(5),
    createdAt: daysFromNow(-4, 9, 15),
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    tenantId: TENANT_ID,
    classId: "11111111-1111-4111-8111-111111111103",
    createdBy: "acc-teacher-mai",
    title: "Technical Cover Letter: Ứng tuyển vị trí thực tập sinh kỹ sư phần mềm",
    instructions:
      "Viết email và thư ứng tuyển (150–200 từ bằng tiếng Anh) giới thiệu dự án học phần tại Khoa CNTT Đại học Sao Đỏ và kỹ năng làm việc nhóm.",
    status: "published",
    dueAt: daysFromNow(8),
    createdAt: daysFromNow(-6, 14, 0),
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    tenantId: TENANT_ID,
    classId: "11111111-1111-4111-8111-111111111101",
    createdBy: "acc-teacher-duc",
    title: "Đồ án nhỏ: Xây dựng mô-đun phân quyền tài khoản Giảng viên – Trưởng CLB – Sinh viên",
    instructions:
      "Thiết kế kiến trúc phân quyền Role-Based Access Control (RBAC) cho cổng học tập. Trình bày sơ đồ lớp, bảng quyền hạn và kiểm thử luồng chấm bài của giảng viên và duyệt thành viên của Trưởng CLB.",
    status: "published",
    dueAt: daysFromNow(11),
    createdAt: daysFromNow(-2, 10, 0),
  },
];

const INITIAL_ROSTER: ClassStudentRosterItem[] = [
  {
    accountId: "acc-leader-minh",
    studentCode: "2200286",
    fullName: "Nguyễn Văn Đạt",
    email: "2200286@sv.saodo.edu.vn",
    phone: "0936651618",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Trưởng CLB Tin học",
    attendancePct: 100,
    gpa: 3.08,
    status: "active",
    teacherNote: "Chủ nhiệm CLB Tin học Sao Đỏ; Đợt 2 (2025-2026) đạt GPA 3.74/4.0 (Xuất sắc), Thực tập doanh nghiệp 10.0/10 (A+), tích lũy 143/163 tín chỉ.",
  },
  {
    accountId: "acc-student-linh",
    studentCode: "2200287",
    fullName: "Phạm Khánh Linh",
    email: "2200287@sv.saodo.edu.vn",
    phone: "0974118209",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Lớp trưởng",
    attendancePct: 100,
    gpa: 3.72,
    status: "active",
    teacherNote: "Lớp trưởng gương mẫu, tổng hợp sĩ số và bài nộp của lớp đúng hạn mọi tuần.",
  },
  {
    accountId: "acc-student-hoang",
    studentCode: "2200288",
    fullName: "Lê Việt Hoàng",
    email: "2200288@sv.saodo.edu.vn",
    phone: "0963502914",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Thành viên lớp",
    attendancePct: 92,
    gpa: 3.15,
    status: "active",
    teacherNote: "Tư duy thuật toán khá, cần chú ý tách giao diện header/implementation rõ hơn trong bài thực hành.",
  },
  {
    accountId: "acc-student-trang",
    studentCode: "2200289",
    fullName: "Đỗ Thu Trang",
    email: "2200289@sv.saodo.edu.vn",
    phone: "0936194820",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Bí thư Chi đoàn",
    attendancePct: 96,
    gpa: 3.54,
    status: "active",
    teacherNote: "Bí thư Chi đoàn năng nổ, hoàn thành tốt phần thiết kế lược đồ CSDL và báo cáo nhóm.",
  },
  {
    accountId: "acc-student-bao",
    studentCode: "2200290",
    fullName: "Vũ Quốc Bảo",
    email: "2200290@sv.saodo.edu.vn",
    phone: "0948220317",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Thành viên lớp",
    attendancePct: 84,
    gpa: 2.78,
    status: "warning",
    teacherNote: "Vắng 2 buổi thực hành tại phòng B1-203; đã nhắc bổ sung bài thực hành Kế thừa trước thứ Sáu.",
  },
  {
    accountId: "acc-student-tuan",
    studentCode: "2200291",
    fullName: "Hoàng Minh Tuấn",
    email: "2200291@sv.saodo.edu.vn",
    phone: "0919334781",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Thành viên lớp",
    attendancePct: 95,
    gpa: 3.32,
    status: "active",
    teacherNote: "Hoàn thành sớm các bài tập truy vấn SQL và tích cực đặt câu hỏi trên lớp.",
  },
  {
    accountId: "acc-student-anh",
    studentCode: "2200292",
    fullName: "Đỗ Thị Ngọc Ánh",
    email: "2200292@sv.saodo.edu.vn",
    phone: "0973519284",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Lớp phó học tập",
    attendancePct: 99,
    gpa: 3.61,
    status: "active",
    teacherNote: "Phụ trách nhóm ôn tập Toán rời rạc và Cơ sở dữ liệu của lớp DK13-CNTT1; đặc tả lược đồ 3NF rất chặt chẽ.",
  },
  {
    accountId: "acc-student-manh",
    studentCode: "2200293",
    fullName: "Vũ Đức Mạnh",
    email: "2200293@sv.saodo.edu.vn",
    phone: "0918472630",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Thành viên lớp",
    attendancePct: 91,
    gpa: 3.04,
    status: "active",
    teacherNote: "Kỹ năng cấu hình mạng và quản trị hệ thống Linux tốt, thực hành bấm cáp và định tuyến đạt điểm tối đa.",
  },
  {
    accountId: "acc-student-thao",
    studentCode: "2200294",
    fullName: "Bùi Phương Thảo",
    email: "2200294@sv.saodo.edu.vn",
    phone: "0989304172",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Phó bí thư Chi đoàn",
    attendancePct: 98,
    gpa: 3.52,
    status: "active",
    teacherNote: "Tích cực trong phong trào Sinh viên 5 Tốt, bài tập lớn môn OOP và Kiểm thử phần mềm hoàn thành vượt yêu cầu.",
  },
  {
    accountId: "acc-student-tung",
    studentCode: "2200295",
    fullName: "Ngô Thanh Tùng",
    email: "2200295@sv.saodo.edu.vn",
    phone: "0945718293",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Ủy viên BCH lớp",
    attendancePct: 94,
    gpa: 3.24,
    status: "active",
    teacherNote: "Thành viên Ban chuyên môn CLB Tin học Sao Đỏ, phụ trách kỹ thuật giao diện Web và kiểm thử tự động.",
  },
];

const INITIAL_SUBMISSIONS: SharedSubmissionRecord[] = [
  {
    id: "sub-minh-oop-1",
    assignmentId: "22222222-2222-4222-8222-222222222201",
    studentAccountId: "acc-leader-minh",
    studentCode: "2200286",
    studentName: "Nguyễn Văn Đạt",
    content:
      "Đã xây dựng lớp trừu tượng TaiLieu (maTaiLieu, tenNhaXuatBan, soBanPhatHanh) và phương thức thuần ảo tinhPhiQuaHan(int soNgay). Ba lớp kế thừa SachGiaoTrinh, LuanVan, TapChi áp dụng đa hình qua con trỏ thông minh std::unique_ptr<TaiLieu> và kiểm thử 12 ca biên.",
    submittedAt: daysFromNow(-1, 20, 15),
    status: "reviewed",
    score: 9.5,
    feedback:
      "Điểm 9.5/10 · Thiết kế phân cấp lớp rất chuẩn, dùng std::unique_ptr tránh rò rỉ bộ nhớ tốt. Có thể bổ sung thêm nạp chồng toán tử xuất luồng << cho báo cáo mượn trả.",
    feedbackAt: daysFromNow(0, 8, 40),
    gradedBy: "ThS. Trần Minh Đức",
  },
  {
    id: "sub-linh-oop-1",
    assignmentId: "22222222-2222-4222-8222-222222222201",
    studentAccountId: "acc-student-linh",
    studentCode: "2200287",
    studentName: "Phạm Khánh Linh",
    content:
      "Cài đặt bộ lớp quản lý thư viện bằng Java 21: abstract class Document, các lớp Textbook, Thesis, Journal thực thi interface Borrowable. Kèm bộ JUnit test kiểm tra tính đa hình khi tính phí trễ hạn.",
    submittedAt: daysFromNow(-1, 18, 5),
    status: "reviewed",
    score: 9.8,
    feedback:
      "Điểm 9.8/10 · Bài làm xuất sắc, tách interface Borrowable rõ ràng và bộ JUnit test bao phủ đầy đủ các trường hợp biên.",
    feedbackAt: daysFromNow(0, 9, 10),
    gradedBy: "ThS. Trần Minh Đức",
  },
  {
    id: "sub-hoang-oop-1",
    assignmentId: "22222222-2222-4222-8222-222222222201",
    studentAccountId: "acc-student-hoang",
    studentCode: "2200288",
    studentName: "Lê Việt Hoàng",
    content:
      "Em nộp mã nguồn C++ cài đặt lớp TaiLieu và 3 lớp con SachGiaoTrinh, LuanVan, TapChi. Đã viết hàm main nhập danh sách tài liệu và in tổng tiền phạt quá hạn theo từng loại.",
    submittedAt: daysFromNow(0, 7, 45),
    status: "submitted",
    score: null,
    feedback: null,
    feedbackAt: null,
    gradedBy: null,
  },
  {
    id: "sub-minh-db-1",
    assignmentId: "22222222-2222-4222-8222-222222222202",
    studentAccountId: "acc-leader-minh",
    studentCode: "2200286",
    studentName: "Nguyễn Văn Đạt",
    content:
      "Lược đồ 3NF gồm 5 bảng: SINH_VIEN, LOP_NIEN_CHE, HOAT_DONG, DANG_KY_HOAT_DONG, DIEM_REN_LUYEN_KY. Đã viết đầy đủ khóa ngoại ON DELETE CASCADE và 5 truy vấn tổng hợp theo khoa/lớp.",
    submittedAt: daysFromNow(-2, 21, 30),
    status: "submitted",
    score: null,
    feedback: null,
    feedbackAt: null,
    gradedBy: null,
  },
];

const INITIAL_CLASS_ANNOUNCEMENTS: ClassAnnouncement[] = [
  {
    id: "ann-1",
    classId: "11111111-1111-4111-8111-111111111101",
    title: "Lịch bảo vệ bài thực hành số 1 tại phòng B1-203",
    body: "Thứ Tư tuần này lớp DK13-CNTT1 mang theo mã nguồn trên máy cá nhân hoặc nạp sẵn lên kho lưu trữ để chấm vấn đáp trực tiếp tại phòng B1-203.",
    authorName: "ThS. Trần Minh Đức",
    createdAt: daysFromNow(-1, 11, 20),
    pinned: true,
  },
  {
    id: "ann-2",
    classId: "11111111-1111-4111-8111-111111111101",
    title: "Tài liệu mẫu về đa hình động và bảng phương thức ảo (vtable)",
    body: "Giảng viên đã cập nhật bộ slide minh họa cơ chế cấp phát vtable và destructor ảo. Các em đọc trước khi làm Đồ án nhỏ.",
    authorName: "ThS. Trần Minh Đức",
    createdAt: daysFromNow(-3, 16, 0),
  },
];

const INITIAL_CLUB_MEMBERS: ClubMemberRecord[] = [
  {
    id: "cm-1",
    clubId: "club-it",
    studentCode: "2200286",
    fullName: "Nguyễn Văn Đạt",
    cohortClass: "DK13-CNTT1",
    memberRole: "Chủ nhiệm CLB",
    status: "active",
    joinedAt: "2024-09-15",
    note: "Điều phối chung CLB Tin học Sao Đỏ & phụ trách đội tuyển Olympic Tin học.",
  },
  {
    id: "cm-2",
    clubId: "club-it",
    studentCode: "2200287",
    fullName: "Phạm Khánh Linh",
    cohortClass: "DK13-CNTT1",
    memberRole: "Phó chủ nhiệm",
    status: "active",
    joinedAt: "2024-10-02",
    note: "Phụ trách truyền thông sự kiện và kết nối sinh viên khóa mới.",
  },
  {
    id: "cm-3",
    clubId: "club-it",
    studentCode: "2200291",
    fullName: "Hoàng Minh Tuấn",
    cohortClass: "DK13-CNTT1",
    memberRole: "Trưởng ban Chuyên môn",
    status: "active",
    joinedAt: "2025-01-12",
    note: "Phụ trách nhóm Web & Cloud tại phòng Lab nhà B1.",
  },
  {
    id: "cm-4",
    clubId: "club-it",
    studentCode: "2200288",
    fullName: "Lê Việt Hoàng",
    cohortClass: "DK13-CNTT1",
    memberRole: "Thành viên",
    status: "pending",
    joinedAt: daysFromNow(-1, 15, 0).slice(0, 10),
    note: "Sinh viên lớp DK13-CNTT1 đăng ký tham gia nhóm Lập trình hướng đối tượng & Web.",
  },
  {
    id: "cm-5",
    clubId: "club-it",
    studentCode: "2200289",
    fullName: "Đỗ Thu Trang",
    cohortClass: "DK13-CNTT1",
    memberRole: "Thành viên",
    status: "pending",
    joinedAt: daysFromNow(0, 9, 30).slice(0, 10),
    note: "Mong muốn tham gia ban Thiết kế UI/UX và dự án cổng thông tin sinh viên.",
  },
];

const INITIAL_CLUB_EVENTS: ClubEventRecord[] = [
  {
    id: "ce-1",
    clubId: "club-it",
    title: "Workshop: Xây dựng AI Web Agent & Thực hành Git/GitHub cho sinh viên CNTT",
    time: "Thứ 5 · 18:00 – 20:00",
    place: "Phòng B1-202",
    summary: "Hướng dẫn quy trình làm việc nhóm với Pull Request, kiểm thử tự động và tích hợp AI Agent.",
    createdBy: "Nguyễn Văn Đạt (Trưởng CLB)",
    createdAt: daysFromNow(-1, 14, 0),
  },
  {
    id: "ce-2",
    clubId: "club-it",
    title: "Luyện tập giải đề Olympic Tin học & Cấu trúc dữ liệu tuần 9",
    time: "Chủ nhật · 08:30 – 11:00",
    place: "Phòng B1-203",
    summary: "Ôn tập quy hoạch động, đồ thị và tối ưu độ phức tạp thuật toán cho đội tuyển sinh viên.",
    createdBy: "Nguyễn Văn Đạt (Trưởng CLB)",
    createdAt: daysFromNow(-4, 19, 0),
  },
];

const INITIAL_SUBJECT_CLASSES: TeacherSubjectClass[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    classCode: "010110210101",
    courseCode: "IT3040",
    name: "Lập trình hướng đối tượng (IT3040)",
    credits: 3,
    cohortClass: "DK13-CNTT1",
    schedule: "Thứ 2 (Tiết 1–3) · Thứ 4 (Tiết 6–9)",
    room: "B1-201 / B1-203",
    semester: "HK1 2026-2027",
    totalPeriods: 60,
    completedPeriods: 36,
    teacherId: "acc-teacher-duc",
    teacherName: "ThS. Trần Minh Đức",
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    classCode: "010110230201",
    courseCode: "IT3160",
    name: "Kiểm thử và đảm bảo chất lượng phần mềm (IT3160)",
    credits: 3,
    cohortClass: "DK13-CNTT1",
    schedule: "Thứ 5 (Tiết 6–8) · Thứ 6 (Tiết 1–3)",
    room: "B1-202",
    semester: "HK1 2026-2027",
    totalPeriods: 45,
    completedPeriods: 27,
    teacherId: "acc-teacher-duc",
    teacherName: "ThS. Trần Minh Đức",
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    classCode: "010110210102",
    courseCode: "IT3040",
    name: "Lập trình hướng đối tượng · Nhóm 2 (IT3040)",
    credits: 3,
    cohortClass: "DK13-CNTT2",
    schedule: "Thứ 3 (Tiết 1–3) · Thứ 6 (Tiết 6–9)",
    room: "B1-202 / B1-203",
    semester: "HK1 2026-2027",
    totalPeriods: 60,
    completedPeriods: 32,
    teacherId: "acc-teacher-duc",
    teacherName: "ThS. Trần Minh Đức",
  },
];

const INITIAL_ATTENDANCE_SESSIONS: TeacherAttendanceSessionRecord[] = [
  {
    id: "att-it3040-w9",
    subjectClassId: "11111111-1111-4111-8111-111111111101",
    date: "28/10/2026",
    periods: "Tiết 6 - 9 (Thực hành B1-203)",
    topic: "Thực hành đa hình động, bảng phương thức ảo (vtable) & con trỏ thông minh",
    marks: {
      "2200286": "present",
      "2200287": "present",
      "2200288": "present",
      "2200289": "present",
      "2200290": "unexcused",
      "2200291": "present",
    },
    notes: {
      "2200290": "Vắng buổi thực hành B1-203 không báo trước",
    },
    createdAt: daysFromNow(-3, 16, 30),
  },
  {
    id: "att-it3040-w8",
    subjectClassId: "11111111-1111-4111-8111-111111111101",
    date: "21/10/2026",
    periods: "Tiết 1 - 3 (Lý thuyết B1-201)",
    topic: "Kế thừa đơn, kế thừa bội và lớp cơ sở trừu tượng trong C++/Java",
    marks: {
      "2200286": "excused",
      "2200287": "present",
      "2200288": "present",
      "2200289": "present",
      "2200290": "unexcused",
      "2200291": "present",
    },
    notes: {
      "2200286": "Có giấy triệu tập đội tuyển Olympic Tin học cấp trường",
      "2200290": "Nghỉ không phép",
    },
    createdAt: daysFromNow(-10, 10, 0),
  },
  {
    id: "att-it3160-w9",
    subjectClassId: "11111111-1111-4111-8111-111111111104",
    date: "29/10/2026",
    periods: "Tiết 6 - 8 (Thực hành B1-202)",
    topic: "Thiết kế ca kiểm thử hộp đen (Phân vùng tương đương & Giá trị biên)",
    marks: {
      "2200286": "present",
      "2200287": "present",
      "2200288": "excused",
      "2200289": "present",
      "2200290": "present",
      "2200291": "present",
    },
    notes: {
      "2200288": "Xin phép khám sức khỏe định kỳ (có đơn)",
    },
    createdAt: daysFromNow(-2, 17, 0),
  },
];

const STORAGE_KEY = "sao-do:multi-account-state:v2";
const SYNC_EVENT = "sao-do:accounts-sync";

function sanitizeRoomLabels(value: string): string {
  return value
    .replace(/A1-301\s*\/\s*B1-Lab\s*3/g, "B1-201 / B1-203")
    .replace(/A1-302\s*\/\s*B1-Lab\s*3/g, "B1-202 / B1-203")
    .replace(/B1-Lab\s*1/g, "B1-201")
    .replace(/B1-Lab\s*2/g, "B1-202")
    .replace(/B1-Lab\s*3/g, "B1-203")
    .replace(/B1-Lab\s*4/g, "B1-204")
    .replace(/Lab\s*3/g, "B1-203")
    .replace(/A1-301/g, "B1-201")
    .replace(/A1-302/g, "B1-202")
    .replace(/A1-305/g, "B1-205")
    .replace(/A1-402/g, "B1-301");
}

function normalizeStudent2200286State(state: SharedPortalState): SharedPortalState {
  return {
    ...state,
    roster: state.roster.map((r) => ({
      ...(r.studentCode === "2200286"
        ? {
            ...r,
            fullName: "Nguyễn Văn Đạt",
            phone: "0936651618",
            gpa: 3.08,
            attendancePct: 100,
          }
        : r),
      teacherNote: sanitizeRoomLabels(r.teacherNote),
    })),
    subjectClasses: state.subjectClasses.map((sc) => ({
      ...sc,
      room: sanitizeRoomLabels(sc.room),
    })),
    attendanceSessions: state.attendanceSessions.map((s) => ({
      ...s,
      periods: sanitizeRoomLabels(s.periods),
    })),
    classAnnouncements: state.classAnnouncements.map((a) => ({
      ...a,
      title: sanitizeRoomLabels(a.title),
      body: sanitizeRoomLabels(a.body),
    })),
    submissions: state.submissions.map((s) =>
      s.studentCode === "2200286" ? { ...s, studentName: "Nguyễn Văn Đạt" } : s,
    ),
    clubMembers: state.clubMembers.map((cm) =>
      cm.studentCode === "2200286" ? { ...cm, fullName: "Nguyễn Văn Đạt" } : cm,
    ),
    clubEvents: state.clubEvents.map((ce) => ({
      ...ce,
      place: sanitizeRoomLabels(ce.place),
      createdBy: ce.createdBy.replace(/Nguyễn Văn Minh/g, "Nguyễn Văn Đạt"),
    })),
  };
}

function buildDefaultState(): SharedPortalState {
  return {
    activeAccountId: "acc-leader-minh",
    roster: INITIAL_ROSTER,
    subjectClasses: INITIAL_SUBJECT_CLASSES,
    attendanceSessions: INITIAL_ATTENDANCE_SESSIONS,
    customAssignments: [],
    submissions: INITIAL_SUBMISSIONS,
    classAnnouncements: INITIAL_CLASS_ANNOUNCEMENTS,
    clubMembers: INITIAL_CLUB_MEMBERS,
    clubEvents: INITIAL_CLUB_EVENTS,
  };
}

export function readSharedPortalState(): SharedPortalState {
  if (typeof window === "undefined") return buildDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw) as Partial<SharedPortalState>;
    const defaults = buildDefaultState();
    return {
      activeAccountId: PORTAL_ACCOUNTS.some((item) => item.id === parsed.activeAccountId)
        ? parsed.activeAccountId!
        : defaults.activeAccountId,
      roster: Array.isArray(parsed.roster) && parsed.roster.length > 0 ? parsed.roster : defaults.roster,
      subjectClasses:
        Array.isArray(parsed.subjectClasses) && parsed.subjectClasses.length > 0
          ? parsed.subjectClasses
          : defaults.subjectClasses,
      attendanceSessions:
        Array.isArray(parsed.attendanceSessions) && parsed.attendanceSessions.length > 0
          ? parsed.attendanceSessions
          : defaults.attendanceSessions,
      customAssignments: Array.isArray(parsed.customAssignments)
        ? parsed.customAssignments
        : defaults.customAssignments,
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : defaults.submissions,
      classAnnouncements: Array.isArray(parsed.classAnnouncements)
        ? parsed.classAnnouncements
        : defaults.classAnnouncements,
      clubMembers: Array.isArray(parsed.clubMembers) ? parsed.clubMembers : defaults.clubMembers,
      clubEvents: Array.isArray(parsed.clubEvents) ? parsed.clubEvents : defaults.clubEvents,
    };
  } catch {
    return buildDefaultState();
  }
}

export function writeSharedPortalState(
  updater: (prev: SharedPortalState) => SharedPortalState,
): SharedPortalState {
  const current = readSharedPortalState();
  const next = updater(current);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    } catch {
      // Ignore quota errors in private browsing.
    }
  }
  return next;
}

export function getAccountById(accountId: string): PortalAccount {
  return PORTAL_ACCOUNTS.find((item) => item.id === accountId) ?? PORTAL_ACCOUNTS[1]!;
}

export function findAccountByLoginInput(input: string): PortalAccount | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;
  return (
    PORTAL_ACCOUNTS.find(
      (acc) =>
        acc.code.toLowerCase() === clean ||
        acc.email.toLowerCase() === clean ||
        `${acc.code.toLowerCase()}@sv.saodo.edu.vn` === clean,
    ) ?? null
  );
}

export function switchActiveAccount(accountId: string): PortalAccount {
  const target = getAccountById(accountId);
  writeSharedPortalState((prev) => ({
    ...prev,
    activeAccountId: target.id,
  }));
  return target;
}

/**
 * Builds the AcademicSession, Assignment[], and Submission[] view for the active account,
 * merging any live backend data with shared multi-role state.
 */
export function buildSessionForAccount(
  state: SharedPortalState,
  remote?: {
    session?: AcademicSession;
    assignments?: Assignment[];
    submissions?: Submission[];
  } | null,
): {
  session: AcademicSession;
  assignments: Assignment[];
  submissions: Submission[];
} {
  const account = getAccountById(state.activeAccountId);
  const seenClassIds = new Set<string>();
  const subjectApiClasses: ApiClass[] = (state.subjectClasses ?? INITIAL_SUBJECT_CLASSES).map((sc) => ({
    id: sc.id,
    name: sc.name,
    teacherId: sc.teacherId,
    createdAt: "2026-09-01T08:00:00.000Z",
  }));
  const classes = [...subjectApiClasses, ...DEFAULT_CLASSES, ...(remote?.session?.classes ?? [])].filter((item) => {
    if (seenClassIds.has(item.id)) return false;
    seenClassIds.add(item.id);
    return true;
  });

  const baseAssignments = [...DEFAULT_ASSIGNMENTS, ...(remote?.assignments ?? [])];
  const seenAssignmentIds = new Set<string>();
  const assignments: Assignment[] = [];
  for (const item of [...state.customAssignments, ...baseAssignments]) {
    if (seenAssignmentIds.has(item.id)) continue;
    seenAssignmentIds.add(item.id);
    assignments.push(item);
  }

  // Convert shared submissions to the contract Submission shape.
  // For a student / club_leader, `submissions` in StudentData holds their own submissions.
  // For a teacher, `submissions` holds all submissions in their classes so they can review & grade.
  const relevantShared =
    account.role === "teacher"
      ? state.submissions
      : state.submissions.filter((sub) => sub.studentCode === account.code || sub.studentAccountId === account.id);

  const mappedShared: Submission[] = relevantShared.map((item) => ({
    id: item.id,
    tenantId: TENANT_ID,
    assignmentId: item.assignmentId,
    studentId: item.studentAccountId,
    studentDisplayName: `${item.studentName} (${item.studentCode})`,
    content: item.content,
    idempotencyKey: item.id,
    status: item.status,
    submittedAt: item.submittedAt,
    feedback:
      item.score !== null && item.feedback && !item.feedback.startsWith("Điểm ")
        ? `Điểm ${item.score}/10 · ${item.feedback}`
        : item.feedback,
    feedbackAt: item.feedbackAt,
    feedbackBy: item.gradedBy,
  }));

  const session: AcademicSession = {
    role: account.role === "teacher" ? "teacher" : "student",
    tenant: remote?.session?.tenant ?? {
      id: TENANT_ID,
      name: "Trường Đại học Sao Đỏ",
    },
    user: {
      id: account.id,
      displayName: account.displayName,
      email: account.email,
    },
    classes,
    people: state.roster.map((member) => ({
      id: member.accountId,
      displayName: member.fullName,
      email: member.email,
      role: "student" as const,
    })),
  };

  const seenSubmissionKeys = new Set<string>();
  const submissions: Submission[] = [];
  for (const item of [...(remote?.submissions ?? []), ...mappedShared]) {
    const key = `${item.assignmentId}:${item.studentId}`;
    if (seenSubmissionKeys.has(item.id) || seenSubmissionKeys.has(key)) continue;
    seenSubmissionKeys.add(item.id);
    seenSubmissionKeys.add(key);
    submissions.push(item);
  }

  return {
    session,
    assignments,
    submissions,
  };
}

export function usePortalAccounts() {
  const [state, setState] = useState<SharedPortalState>(buildDefaultState);
  const [hydrated, setHydrated] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const pullFromSupabase = useCallback(async () => {
    if (!hasSupabaseEnvironment) return;
    try {
      const sb = getSupabaseBrowserClient();
      const [
        rosterRes,
        subjectsRes,
        attendanceRes,
        customAsgRes,
        submissionsRes,
        announcementsRes,
        clubMembersRes,
        clubEventsRes,
      ] = await Promise.all([
        sb.from("teacher_class_roster").select("*").order("student_code", { ascending: true }),
        sb.from("teacher_subject_classes").select("*").order("created_at", { ascending: true }),
        sb.from("teacher_attendance_sessions").select("*").order("created_at", { ascending: false }),
        sb.from("portal_custom_assignments").select("*").order("created_at", { ascending: false }),
        sb.from("portal_submissions").select("*").order("submitted_at", { ascending: false }),
        sb.from("class_announcements").select("*").order("created_at", { ascending: false }),
        sb.from("club_members").select("*").order("joined_at", { ascending: true }),
        sb.from("club_events").select("*").order("created_at", { ascending: false }),
      ]);

      if (rosterRes.error && subjectsRes.error) return;
      setSupabaseConnected(true);

      writeSharedPortalState((prev) => {
        const nextRoster: ClassStudentRosterItem[] =
          rosterRes.data && rosterRes.data.length > 0
            ? rosterRes.data.map((r) => ({
                accountId: String(r.account_id),
                studentCode: String(r.student_code),
                fullName: String(r.full_name),
                email: String(r.email),
                phone: String(r.phone),
                cohortClass: String(r.cohort_class),
                roleInClass: r.role_in_class as ClassStudentRosterItem["roleInClass"],
                attendancePct: Number(r.attendance_pct),
                gpa: Number(r.gpa),
                status: (r.status === "warning" ? "warning" : "active") as "active" | "warning",
                teacherNote: String(r.teacher_note ?? ""),
              }))
            : prev.roster;

        const nextSubjects: TeacherSubjectClass[] =
          subjectsRes.data && subjectsRes.data.length > 0
            ? subjectsRes.data.map((s) => ({
                id: String(s.id),
                classCode: String(s.class_code),
                courseCode: String(s.course_code),
                name: String(s.name),
                credits: Number(s.credits),
                cohortClass: String(s.cohort_class),
                schedule: String(s.schedule),
                room: String(s.room),
                semester: String(s.semester),
                totalPeriods: Number(s.total_periods),
                completedPeriods: Number(s.completed_periods),
                teacherId: String(s.teacher_id),
                teacherName: String(s.teacher_name),
              }))
            : prev.subjectClasses;

        const nextAttendance: TeacherAttendanceSessionRecord[] =
          attendanceRes.data && attendanceRes.data.length > 0
            ? attendanceRes.data.map((a) => ({
                id: String(a.id),
                subjectClassId: String(a.subject_class_id),
                date: String(a.date),
                periods: String(a.periods),
                topic: String(a.topic),
                marks: (a.marks ?? {}) as Record<string, AttendanceMarkStatus>,
                notes: (a.notes ?? {}) as Record<string, string>,
                createdAt: String(a.created_at),
              }))
            : prev.attendanceSessions;

        const nextCustomAssignments: Assignment[] =
          customAsgRes.data && customAsgRes.data.length > 0
            ? customAsgRes.data.map((asg) => ({
                id: String(asg.id),
                tenantId: String(asg.tenant_id),
                classId: String(asg.class_id),
                createdBy: String(asg.created_by),
                title: String(asg.title),
                instructions: String(asg.instructions),
                status: "published" as const,
                dueAt: asg.due_at ? String(asg.due_at) : null,
                createdAt: String(asg.created_at),
              }))
            : prev.customAssignments;

        const nextSubmissions: SharedSubmissionRecord[] =
          submissionsRes.data && submissionsRes.data.length > 0
            ? submissionsRes.data.map((sub) => ({
                id: String(sub.id),
                assignmentId: String(sub.assignment_id),
                studentAccountId: String(sub.student_account_id),
                studentCode: String(sub.student_code),
                studentName: String(sub.student_name),
                content: String(sub.content),
                submittedAt: String(sub.submitted_at),
                status: (sub.status === "reviewed" ? "reviewed" : "submitted") as "submitted" | "reviewed",
                score: sub.score !== null && sub.score !== undefined ? Number(sub.score) : null,
                feedback: sub.feedback ? String(sub.feedback) : null,
                feedbackAt: sub.feedback_at ? String(sub.feedback_at) : null,
                gradedBy: sub.graded_by ? String(sub.graded_by) : null,
              }))
            : prev.submissions;

        const nextAnnouncements: ClassAnnouncement[] =
          announcementsRes.data && announcementsRes.data.length > 0
            ? announcementsRes.data.map((ann) => ({
                id: String(ann.id),
                classId: String(ann.class_id),
                title: String(ann.title),
                body: String(ann.body),
                authorName: String(ann.author_name),
                pinned: Boolean(ann.pinned),
                createdAt: String(ann.created_at),
              }))
            : prev.classAnnouncements;

        const nextClubMembers: ClubMemberRecord[] =
          clubMembersRes.data && clubMembersRes.data.length > 0
            ? clubMembersRes.data.map((cm) => ({
                id: String(cm.id),
                clubId: String(cm.club_id),
                studentCode: String(cm.student_code),
                fullName: String(cm.full_name),
                cohortClass: String(cm.cohort_class),
                memberRole: cm.member_role as ClubMemberRecord["memberRole"],
                status: (cm.status === "active" ? "active" : "pending") as "active" | "pending",
                joinedAt: String(cm.joined_at),
                note: cm.note ? String(cm.note) : undefined,
              }))
            : prev.clubMembers;

        const nextClubEvents: ClubEventRecord[] =
          clubEventsRes.data && clubEventsRes.data.length > 0
            ? clubEventsRes.data.map((ce) => ({
                id: String(ce.id),
                clubId: String(ce.club_id),
                title: String(ce.title),
                time: String(ce.time),
                place: String(ce.place),
                summary: String(ce.summary),
                createdBy: String(ce.created_by),
                createdAt: String(ce.created_at),
              }))
            : prev.clubEvents;

        return normalizeStudent2200286State({
          ...prev,
          roster: nextRoster,
          subjectClasses: nextSubjects,
          attendanceSessions: nextAttendance,
          customAssignments: nextCustomAssignments,
          submissions: nextSubmissions,
          classAnnouncements: nextAnnouncements,
          clubMembers: nextClubMembers,
          clubEvents: nextClubEvents,
        });
      });
    } catch {
      // Keep local state if offline
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      setState(readSharedPortalState());
      setHydrated(true);
    };
    queueMicrotask(() => {
      sync();
      void pullFromSupabase();
    });
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);

    let cleanupRealtime: (() => void) | undefined;
    if (hasSupabaseEnvironment) {
      try {
        const sb = getSupabaseBrowserClient();
        const channel = sb
          .channel("sdu-portal-realtime-sync")
          .on("postgres_changes", { event: "*", schema: "public", table: "teacher_class_roster" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "teacher_subject_classes" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "teacher_attendance_sessions" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "portal_custom_assignments" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "portal_submissions" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "class_announcements" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "club_members" }, () => {
            void pullFromSupabase();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "club_events" }, () => {
            void pullFromSupabase();
          })
          .subscribe();
        cleanupRealtime = () => {
          void sb.removeChannel(channel);
        };
      } catch {
        // Ignore realtime errors if WebSocket is blocked
      }
    }

    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
      cleanupRealtime?.();
    };
  }, [pullFromSupabase]);

  const activeAccount = getAccountById(state.activeAccountId);

  const setActiveAccount = useCallback((accountId: string) => {
    switchActiveAccount(accountId);
  }, []);

  const updateStudentNote = useCallback(
    (
      studentCode: string,
      patch: { teacherNote?: string; attendancePct?: number; gpa?: number; status?: "active" | "warning" },
    ) => {
      writeSharedPortalState((prev) => ({
        ...prev,
        roster: prev.roster.map((student) =>
          student.studentCode === studentCode ? { ...student, ...patch } : student,
        ),
      }));
      if (hasSupabaseEnvironment) {
        const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.teacherNote !== undefined) dbPatch.teacher_note = patch.teacherNote;
        if (patch.attendancePct !== undefined) dbPatch.attendance_pct = patch.attendancePct;
        if (patch.gpa !== undefined) dbPatch.gpa = patch.gpa;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        void getSupabaseBrowserClient()
          .from("teacher_class_roster")
          .update(dbPatch)
          .eq("student_code", studentCode);
      }
    },
    [],
  );

  const addClassStudent = useCallback(
    (input: {
      studentCode: string;
      fullName: string;
      phone: string;
      roleInClass: ClassStudentRosterItem["roleInClass"];
    }) => {
      const code = input.studentCode.trim();
      const name = input.fullName.trim();
      if (!code || !name) return;
      const nextItem: ClassStudentRosterItem = {
        accountId: `acc-student-${code}`,
        studentCode: code,
        fullName: name,
        email: `${code}@sv.saodo.edu.vn`,
        phone: input.phone.trim() || "0980000000",
        cohortClass: "DK13-CNTT1",
        roleInClass: input.roleInClass,
        attendancePct: 100,
        gpa: 3.2,
        status: "active",
        teacherNote: "Sinh viên mới bổ sung vào danh sách lớp DK13-CNTT1.",
      };
      writeSharedPortalState((prev) => {
        if (prev.roster.some((item) => item.studentCode === code)) return prev;
        return {
          ...prev,
          roster: [...prev.roster, nextItem],
        };
      });
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient().from("teacher_class_roster").upsert({
          student_code: nextItem.studentCode,
          account_id: nextItem.accountId,
          full_name: nextItem.fullName,
          email: nextItem.email,
          phone: nextItem.phone,
          cohort_class: nextItem.cohortClass,
          role_in_class: nextItem.roleInClass,
          attendance_pct: nextItem.attendancePct,
          gpa: nextItem.gpa,
          status: nextItem.status,
          teacher_note: nextItem.teacherNote,
        });
      }
    },
    [],
  );

  const createAssignment = useCallback(
    (input: { classId: string; title: string; instructions: string; dueAt: string | null }) => {
      const newAssignment: Assignment = {
        id: `asg-custom-${Date.now()}`,
        tenantId: TENANT_ID,
        classId: input.classId,
        createdBy: activeAccount.id,
        title: input.title.trim(),
        instructions: input.instructions.trim(),
        status: "published",
        dueAt: input.dueAt,
        createdAt: new Date().toISOString(),
      };
      writeSharedPortalState((prev) => ({
        ...prev,
        customAssignments: [newAssignment, ...prev.customAssignments],
      }));
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient().from("portal_custom_assignments").upsert({
          id: newAssignment.id,
          tenant_id: newAssignment.tenantId,
          class_id: newAssignment.classId,
          created_by: newAssignment.createdBy,
          title: newAssignment.title,
          instructions: newAssignment.instructions,
          status: newAssignment.status,
          due_at: newAssignment.dueAt,
          created_at: newAssignment.createdAt,
        });
      }
      return newAssignment;
    },
    [activeAccount.id],
  );

  const submitStudentWork = useCallback(
    (input: { assignmentId: string; content: string; account?: PortalAccount }) => {
      const actor = input.account ?? activeAccount;
      let savedRecord: SharedSubmissionRecord | null = null;
      writeSharedPortalState((prev) => {
        const existingIndex = prev.submissions.findIndex(
          (item) => item.assignmentId === input.assignmentId && item.studentCode === actor.code,
        );
        const record: SharedSubmissionRecord = {
          id: existingIndex >= 0 ? prev.submissions[existingIndex]!.id : `sub-${actor.code}-${Date.now()}`,
          assignmentId: input.assignmentId,
          studentAccountId: actor.id,
          studentCode: actor.code,
          studentName: actor.displayName,
          content: input.content.trim(),
          submittedAt: new Date().toISOString(),
          status: "submitted",
          score: existingIndex >= 0 ? prev.submissions[existingIndex]!.score : null,
          feedback: existingIndex >= 0 ? prev.submissions[existingIndex]!.feedback : null,
          feedbackAt: existingIndex >= 0 ? prev.submissions[existingIndex]!.feedbackAt : null,
          gradedBy: existingIndex >= 0 ? prev.submissions[existingIndex]!.gradedBy : null,
        };
        savedRecord = record;
        const nextSubmissions =
          existingIndex >= 0
            ? prev.submissions.map((item, idx) => (idx === existingIndex ? record : item))
            : [record, ...prev.submissions];
        return {
          ...prev,
          submissions: nextSubmissions,
        };
      });
      if (hasSupabaseEnvironment && savedRecord) {
        const rec = savedRecord as SharedSubmissionRecord;
        void getSupabaseBrowserClient().from("portal_submissions").upsert({
          id: rec.id,
          assignment_id: rec.assignmentId,
          student_account_id: rec.studentAccountId,
          student_code: rec.studentCode,
          student_name: rec.studentName,
          content: rec.content,
          submitted_at: rec.submittedAt,
          status: rec.status,
          score: rec.score,
          feedback: rec.feedback,
          feedback_at: rec.feedbackAt,
          graded_by: rec.gradedBy,
        });
      }
    },
    [activeAccount],
  );

  const gradeSubmission = useCallback(
    (input: { submissionId: string; score: number; feedback: string; gradedBy?: string }) => {
      const normalizedScore = Math.max(0, Math.min(10, Math.round(input.score * 10) / 10));
      const cleanFeedback = input.feedback.trim();
      const formattedFeedback = cleanFeedback.startsWith("Điểm ")
        ? cleanFeedback
        : `Điểm ${normalizedScore}/10 · ${cleanFeedback}`;
      const nowIso = new Date().toISOString();
      const grader = input.gradedBy ?? activeAccount.displayName;
      writeSharedPortalState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((item) =>
          item.id === input.submissionId
            ? {
                ...item,
                status: "reviewed",
                score: normalizedScore,
                feedback: formattedFeedback,
                feedbackAt: nowIso,
                gradedBy: grader,
              }
            : item,
        ),
      }));
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient()
          .from("portal_submissions")
          .update({
            status: "reviewed",
            score: normalizedScore,
            feedback: formattedFeedback,
            feedback_at: nowIso,
            graded_by: grader,
          })
          .eq("id", input.submissionId);
      }
    },
    [activeAccount.displayName],
  );

  const postClassAnnouncement = useCallback(
    (input: { classId: string; title: string; body: string; pinned?: boolean }) => {
      const item: ClassAnnouncement = {
        id: `ann-${Date.now()}`,
        classId: input.classId,
        title: input.title.trim(),
        body: input.body.trim(),
        authorName: activeAccount.displayName,
        createdAt: new Date().toISOString(),
        pinned: input.pinned,
      };
      writeSharedPortalState((prev) => ({
        ...prev,
        classAnnouncements: [item, ...prev.classAnnouncements],
      }));
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient().from("class_announcements").upsert({
          id: item.id,
          class_id: item.classId,
          title: item.title,
          body: item.body,
          author_name: item.authorName,
          pinned: Boolean(item.pinned),
          created_at: item.createdAt,
        });
      }
    },
    [activeAccount.displayName],
  );

  const requestJoinClub = useCallback(
    (clubId: string, note?: string) => {
      let createdMember: ClubMemberRecord | null = null;
      writeSharedPortalState((prev) => {
        const exists = prev.clubMembers.find(
          (item) => item.clubId === clubId && item.studentCode === activeAccount.code,
        );
        if (exists) return prev;
        const nextMember: ClubMemberRecord = {
          id: `cm-${Date.now()}`,
          clubId,
          studentCode: activeAccount.code,
          fullName: activeAccount.displayName,
          cohortClass: activeAccount.cohortClass,
          memberRole: "Thành viên",
          status:
            activeAccount.permissions.canManageClubMembers && activeAccount.managedClubId === clubId
              ? "active"
              : "pending",
          joinedAt: new Date().toISOString().slice(0, 10),
          note: note?.trim() || `Sinh viên lớp ${activeAccount.cohortClass} đăng ký tham gia câu lạc bộ.`,
        };
        createdMember = nextMember;
        return {
          ...prev,
          clubMembers: [...prev.clubMembers, nextMember],
        };
      });
      if (hasSupabaseEnvironment && createdMember) {
        const cm = createdMember as ClubMemberRecord;
        void getSupabaseBrowserClient().from("club_members").upsert({
          id: cm.id,
          club_id: cm.clubId,
          student_code: cm.studentCode,
          full_name: cm.fullName,
          cohort_class: cm.cohortClass,
          member_role: cm.memberRole,
          status: cm.status,
          joined_at: cm.joinedAt,
          note: cm.note ?? null,
        });
      }
    },
    [activeAccount],
  );

  const approveClubMember = useCallback((memberId: string) => {
    writeSharedPortalState((prev) => ({
      ...prev,
      clubMembers: prev.clubMembers.map((item) =>
        item.id === memberId ? { ...item, status: "active" } : item,
      ),
    }));
    if (hasSupabaseEnvironment) {
      void getSupabaseBrowserClient()
        .from("club_members")
        .update({ status: "active" })
        .eq("id", memberId);
    }
  }, []);

  const updateClubMemberRole = useCallback(
    (memberId: string, memberRole: ClubMemberRecord["memberRole"]) => {
      writeSharedPortalState((prev) => ({
        ...prev,
        clubMembers: prev.clubMembers.map((item) =>
          item.id === memberId ? { ...item, memberRole } : item,
        ),
      }));
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient()
          .from("club_members")
          .update({ member_role: memberRole })
          .eq("id", memberId);
      }
    },
    [],
  );

  const removeClubMember = useCallback((memberId: string) => {
    writeSharedPortalState((prev) => ({
      ...prev,
      clubMembers: prev.clubMembers.filter((item) => item.id !== memberId),
    }));
    if (hasSupabaseEnvironment) {
      void getSupabaseBrowserClient()
        .from("club_members")
        .delete()
        .eq("id", memberId);
    }
  }, []);

  const createClubEvent = useCallback(
    (input: { clubId: string; title: string; time: string; place: string; summary: string }) => {
      const event: ClubEventRecord = {
        id: `ce-${Date.now()}`,
        clubId: input.clubId,
        title: input.title.trim(),
        time: input.time.trim(),
        place: input.place.trim(),
        summary: input.summary.trim(),
        createdBy: `${activeAccount.displayName} (${activeAccount.role === "club_leader" ? "Trưởng CLB" : activeAccount.roleTitle})`,
        createdAt: new Date().toISOString(),
      };
      writeSharedPortalState((prev) => ({
        ...prev,
        clubEvents: [event, ...prev.clubEvents],
      }));
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient().from("club_events").upsert({
          id: event.id,
          club_id: event.clubId,
          title: event.title,
          time: event.time,
          place: event.place,
          summary: event.summary,
          created_by: event.createdBy,
          created_at: event.createdAt,
        });
      }
    },
    [activeAccount],
  );

  const addSubjectClass = useCallback(
    (input: {
      classCode: string;
      courseCode: string;
      name: string;
      credits: number;
      cohortClass: string;
      schedule: string;
      room: string;
      totalPeriods: number;
    }) => {
      const created: TeacherSubjectClass = {
        id: `cls-subj-${Date.now()}`,
        classCode: input.classCode.trim() || `010110${String(Date.now()).slice(-6)}`,
        courseCode: input.courseCode.trim().toUpperCase() || "IT3040",
        name: input.name.trim(),
        credits: Math.max(1, Math.min(10, Number(input.credits) || 3)),
        cohortClass: input.cohortClass.trim() || "DK13-CNTT1",
        schedule: input.schedule.trim() || "Thứ 2 (Tiết 1–3)",
        room: input.room.trim() || "B1-201",
        semester: "HK1 2026-2027",
        totalPeriods: Math.max(15, Number(input.totalPeriods) || 45),
        completedPeriods: 0,
        teacherId: activeAccount.id,
        teacherName: activeAccount.displayName,
      };
      writeSharedPortalState((prev) => ({
        ...prev,
        subjectClasses: [created, ...prev.subjectClasses],
      }));
      if (hasSupabaseEnvironment) {
        void getSupabaseBrowserClient().from("teacher_subject_classes").upsert({
          id: created.id,
          class_code: created.classCode,
          course_code: created.courseCode,
          name: created.name,
          credits: created.credits,
          cohort_class: created.cohortClass,
          schedule: created.schedule,
          room: created.room,
          semester: created.semester,
          total_periods: created.totalPeriods,
          completed_periods: created.completedPeriods,
          teacher_id: created.teacherId,
          teacher_name: created.teacherName,
        });
      }
      return created;
    },
    [activeAccount.displayName, activeAccount.id],
  );

  const createAttendanceSession = useCallback(
    (input: {
      subjectClassId: string;
      date: string;
      periods: string;
      topic: string;
      marks: Record<string, AttendanceMarkStatus>;
      notes?: Record<string, string>;
    }) => {
      const sessionRecord: TeacherAttendanceSessionRecord = {
        id: `att-${Date.now()}`,
        subjectClassId: input.subjectClassId,
        date: input.date.trim(),
        periods: input.periods.trim(),
        topic: input.topic.trim(),
        marks: input.marks,
        notes: input.notes ?? {},
        createdAt: new Date().toISOString(),
      };
      let updatedRoster: ClassStudentRosterItem[] = [];
      writeSharedPortalState((prev) => {
        const nextSessions = [sessionRecord, ...prev.attendanceSessions];
        // Recompute student attendance percentages based on recorded sessions
        const nextRoster = prev.roster.map((student) => {
          const totalTracked = nextSessions.length;
          if (!totalTracked) return student;
          const missedUnexcused = nextSessions.filter(
            (s) => s.marks[student.studentCode] === "unexcused",
          ).length;
          const missedExcused = nextSessions.filter(
            (s) => s.marks[student.studentCode] === "excused",
          ).length;
          const computedPct = Math.max(
            50,
            Math.min(100, 100 - missedUnexcused * 6 - missedExcused * 2),
          );
          return {
            ...student,
            attendancePct: computedPct,
            status: (computedPct < 85 ? "warning" : "active") as "active" | "warning",
          };
        });
        updatedRoster = nextRoster;
        return {
          ...prev,
          attendanceSessions: nextSessions,
          roster: nextRoster,
        };
      });
      if (hasSupabaseEnvironment) {
        const sb = getSupabaseBrowserClient();
        void sb.from("teacher_attendance_sessions").upsert({
          id: sessionRecord.id,
          subject_class_id: sessionRecord.subjectClassId,
          date: sessionRecord.date,
          periods: sessionRecord.periods,
          topic: sessionRecord.topic,
          marks: sessionRecord.marks,
          notes: sessionRecord.notes,
          created_at: sessionRecord.createdAt,
        });
        for (const st of updatedRoster) {
          void sb
            .from("teacher_class_roster")
            .update({ attendance_pct: st.attendancePct, status: st.status })
            .eq("student_code", st.studentCode);
        }
      }
      return sessionRecord;
    },
    [],
  );

  const updateAttendanceSessionMark = useCallback(
    (
      sessionId: string,
      studentCode: string,
      mark: AttendanceMarkStatus,
      note?: string,
    ) => {
      let updatedSession: TeacherAttendanceSessionRecord | null = null;
      let updatedStudent: ClassStudentRosterItem | null = null;
      writeSharedPortalState((prev) => {
        const nextSessions = prev.attendanceSessions.map((session) => {
          if (session.id !== sessionId) return session;
          const nextNotes = { ...session.notes };
          if (note !== undefined) {
            if (note.trim()) nextNotes[studentCode] = note.trim();
            else delete nextNotes[studentCode];
          }
          const next = {
            ...session,
            marks: {
              ...session.marks,
              [studentCode]: mark,
            },
            notes: nextNotes,
          };
          updatedSession = next;
          return next;
        });
        const nextRoster = prev.roster.map((student) => {
          if (student.studentCode !== studentCode) return student;
          const missedUnexcused = nextSessions.filter(
            (s) => s.marks[student.studentCode] === "unexcused",
          ).length;
          const missedExcused = nextSessions.filter(
            (s) => s.marks[student.studentCode] === "excused",
          ).length;
          const computedPct = Math.max(
            50,
            Math.min(100, 100 - missedUnexcused * 6 - missedExcused * 2),
          );
          const nextSt = {
            ...student,
            attendancePct: computedPct,
            status: (computedPct < 85 ? "warning" : "active") as "active" | "warning",
          };
          updatedStudent = nextSt;
          return nextSt;
        });
        return {
          ...prev,
          attendanceSessions: nextSessions,
          roster: nextRoster,
        };
      });
      if (hasSupabaseEnvironment) {
        const sb = getSupabaseBrowserClient();
        if (updatedSession) {
          const sess = updatedSession as TeacherAttendanceSessionRecord;
          void sb
            .from("teacher_attendance_sessions")
            .update({ marks: sess.marks, notes: sess.notes })
            .eq("id", sess.id);
        }
        if (updatedStudent) {
          const st = updatedStudent as ClassStudentRosterItem;
          void sb
            .from("teacher_class_roster")
            .update({ attendance_pct: st.attendancePct, status: st.status })
            .eq("student_code", st.studentCode);
        }
      }
    },
    [],
  );

  return {
    state,
    hydrated,
    supabaseConnected,
    accounts: PORTAL_ACCOUNTS,
    activeAccount,
    setActiveAccount,
    roster: state.roster,
    subjectClasses: state.subjectClasses,
    attendanceSessions: state.attendanceSessions,
    customAssignments: state.customAssignments,
    submissions: state.submissions,
    classAnnouncements: state.classAnnouncements,
    clubMembers: state.clubMembers,
    clubEvents: state.clubEvents,
    updateStudentNote,
    addClassStudent,
    addSubjectClass,
    createAttendanceSession,
    updateAttendanceSessionMark,
    createAssignment,
    submitStudentWork,
    gradeSubmission,
    postClassAnnouncement,
    requestJoinClub,
    approveClubMember,
    updateClubMemberRole,
    removeClubMember,
    createClubEvent,
  };
}
