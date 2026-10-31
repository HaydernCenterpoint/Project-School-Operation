"use client";

import type { AcademicSession, ApiClass, Assignment, Submission } from "@sao-do/contracts";
import { useCallback, useEffect, useState } from "react";

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
  roleInClass: "Lớp trưởng" | "Bí thư Chi đoàn" | "Trưởng CLB Tin học" | "Thành viên lớp";
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

export type SharedPortalState = {
  activeAccountId: string;
  roster: ClassStudentRosterItem[];
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
    displayName: "Nguyễn Văn Minh",
    email: "2200286@sv.saodo.edu.vn",
    department: "Khoa Công nghệ thông tin",
    cohortClass: "DK13-CNTT1",
    advisorId: "acc-teacher-duc",
    advisorName: "ThS. Trần Minh Đức",
    managedClubId: "club-it",
    managedClubName: "CLB Tin học Sao Đỏ",
    positionLabel: "Chủ nhiệm CLB Tin học Sao Đỏ · Sinh viên lớp DK13-CNTT1",
    bio: "Sinh viên lớp DK13-CNTT1 do ThS. Trần Minh Đức cố vấn; đồng thời giữ vai trò Chủ nhiệm CLB Tin học Sao Đỏ.",
    phone: "0987654286",
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
    fullName: "Nguyễn Văn Minh",
    email: "2200286@sv.saodo.edu.vn",
    phone: "0987654286",
    cohortClass: "DK13-CNTT1",
    roleInClass: "Trưởng CLB Tin học",
    attendancePct: 98,
    gpa: 3.48,
    status: "active",
    teacherNote: "Chủ nhiệm CLB Tin học Sao Đỏ, nắm vững kiến trúc OOP và hỗ trợ các nhóm thực hành tại phòng B1-Lab 3.",
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
    teacherNote: "Vắng 2 buổi thực hành Lab 3; đã nhắc bổ sung bài thực hành Kế thừa trước thứ Sáu.",
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
];

const INITIAL_SUBMISSIONS: SharedSubmissionRecord[] = [
  {
    id: "sub-minh-oop-1",
    assignmentId: "22222222-2222-4222-8222-222222222201",
    studentAccountId: "acc-leader-minh",
    studentCode: "2200286",
    studentName: "Nguyễn Văn Minh",
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
    studentName: "Nguyễn Văn Minh",
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
    title: "Lịch bảo vệ bài thực hành số 1 tại phòng B1-Lab 3",
    body: "Thứ Tư tuần này lớp DK13-CNTT1 mang theo mã nguồn trên máy cá nhân hoặc nạp sẵn lên kho lưu trữ để chấm vấn đáp trực tiếp tại phòng B1-Lab 3.",
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
    fullName: "Nguyễn Văn Minh",
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
    place: "Phòng B1-Lab 2",
    summary: "Hướng dẫn quy trình làm việc nhóm với Pull Request, kiểm thử tự động và tích hợp AI Agent.",
    createdBy: "Nguyễn Văn Minh (Trưởng CLB)",
    createdAt: daysFromNow(-1, 14, 0),
  },
  {
    id: "ce-2",
    clubId: "club-it",
    title: "Luyện tập giải đề Olympic Tin học & Cấu trúc dữ liệu tuần 9",
    time: "Chủ nhật · 08:30 – 11:00",
    place: "Phòng B1-Lab 3",
    summary: "Ôn tập quy hoạch động, đồ thị và tối ưu độ phức tạp thuật toán cho đội tuyển sinh viên.",
    createdBy: "Nguyễn Văn Minh (Trưởng CLB)",
    createdAt: daysFromNow(-4, 19, 0),
  },
];

const STORAGE_KEY = "sao-do:multi-account-state:v1";
const SYNC_EVENT = "sao-do:accounts-sync";

function buildDefaultState(): SharedPortalState {
  return {
    activeAccountId: "acc-leader-minh",
    roster: INITIAL_ROSTER,
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
  const classes = [...DEFAULT_CLASSES, ...(remote?.session?.classes ?? [])].filter((item) => {
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

  return {
    session,
    assignments,
    submissions: mappedShared,
  };
}

export function usePortalAccounts() {
  const [state, setState] = useState<SharedPortalState>(buildDefaultState);

  useEffect(() => {
    const sync = () => setState(readSharedPortalState());
    queueMicrotask(sync);
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
      writeSharedPortalState((prev) => {
        if (prev.roster.some((item) => item.studentCode === code)) return prev;
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
        return {
          ...prev,
          roster: [...prev.roster, nextItem],
        };
      });
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
      return newAssignment;
    },
    [activeAccount.id],
  );

  const submitStudentWork = useCallback(
    (input: { assignmentId: string; content: string; account?: PortalAccount }) => {
      const actor = input.account ?? activeAccount;
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
        const nextSubmissions =
          existingIndex >= 0
            ? prev.submissions.map((item, idx) => (idx === existingIndex ? record : item))
            : [record, ...prev.submissions];
        return {
          ...prev,
          submissions: nextSubmissions,
        };
      });
    },
    [activeAccount],
  );

  const gradeSubmission = useCallback(
    (input: { submissionId: string; score: number; feedback: string; gradedBy?: string }) => {
      const normalizedScore = Math.max(0, Math.min(10, Math.round(input.score * 10) / 10));
      const cleanFeedback = input.feedback.trim();
      writeSharedPortalState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((item) =>
          item.id === input.submissionId
            ? {
                ...item,
                status: "reviewed",
                score: normalizedScore,
                feedback: cleanFeedback.startsWith("Điểm ")
                  ? cleanFeedback
                  : `Điểm ${normalizedScore}/10 · ${cleanFeedback}`,
                feedbackAt: new Date().toISOString(),
                gradedBy: input.gradedBy ?? activeAccount.displayName,
              }
            : item,
        ),
      }));
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
    },
    [activeAccount.displayName],
  );

  const requestJoinClub = useCallback(
    (clubId: string, note?: string) => {
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
        return {
          ...prev,
          clubMembers: [...prev.clubMembers, nextMember],
        };
      });
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
  }, []);

  const updateClubMemberRole = useCallback(
    (memberId: string, memberRole: ClubMemberRecord["memberRole"]) => {
      writeSharedPortalState((prev) => ({
        ...prev,
        clubMembers: prev.clubMembers.map((item) =>
          item.id === memberId ? { ...item, memberRole } : item,
        ),
      }));
    },
    [],
  );

  const removeClubMember = useCallback((memberId: string) => {
    writeSharedPortalState((prev) => ({
      ...prev,
      clubMembers: prev.clubMembers.filter((item) => item.id !== memberId),
    }));
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
    },
    [activeAccount],
  );

  return {
    state,
    accounts: PORTAL_ACCOUNTS,
    activeAccount,
    setActiveAccount,
    roster: state.roster,
    customAssignments: state.customAssignments,
    submissions: state.submissions,
    classAnnouncements: state.classAnnouncements,
    clubMembers: state.clubMembers,
    clubEvents: state.clubEvents,
    updateStudentNote,
    addClassStudent,
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
