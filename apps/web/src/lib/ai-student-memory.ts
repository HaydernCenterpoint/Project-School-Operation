// Persistent AI Student Memory & Comprehensive Dossier Engine for Model SDU 1.3 (Qwen 3.8)
// Enables the AI to automatically remember, update, and recall every characteristic, academic
// record, personal profile, and conversational fact of each student in the portal.

import type {
  ClassAnnouncement,
  ClassStudentRosterItem,
  ClubEventRecord,
  ClubMemberRecord,
  PortalAccount,
  SharedSubmissionRecord,
  TeacherAttendanceSessionRecord,
  TeacherSubjectClass,
} from "./accounts";
import {
  activities,
  attendanceRecords,
  bank,
  clubs,
  conduct,
  courseByCode,
  curriculumSemesters,
  exams,
  gpa,
  initialProfileUpdates,
  invoices,
  letter,
  longDay,
  money,
  notices,
  offerings,
  payments,
  portfolioCompetencies,
  profile,
  program,
  receiptRecords,
  scheduleProgress,
  semester,
  serviceTypes,
  sessions,
  sessionTime,
  standing,
  terms,
  total,
  weekdays,
} from "./portal-demo";

export const SDU_AI_MODEL_ID = "sdu-1.3-qwen-3.8";
export const SDU_AI_MODEL_NAME = "Model SDU 1.3";
export const SDU_AI_MODEL_BADGE = "Model SDU 1.3 · Qwen 3.8";
export const SDU_AI_MODEL_DESC =
  "Model SDU 1.3 — Huấn luyện dữ liệu học thuật Đại học Sao Đỏ từ mô hình mở Qwen 3.8";

export type MemoryCategory =
  | "ca_nhan"
  | "hoc_tap"
  | "diem_manh"
  | "diem_yeu"
  | "muc_tieu"
  | "so_thich"
  | "ghi_chu";

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  ca_nhan: "Thông tin cá nhân",
  hoc_tap: "Đặc điểm học tập",
  diem_manh: "Điểm mạnh",
  diem_yeu: "Cần cải thiện",
  muc_tieu: "Mục tiêu & Định hướng",
  so_thich: "Sở thích & Thói quen",
  ghi_chu: "Ghi nhớ từ hội thoại",
};

export type StudentMemoryFact = {
  id: string;
  studentCode: string;
  category: MemoryCategory;
  fact: string;
  source: "system" | "chat_auto" | "manual";
  updatedAt: string;
};

export type DetailedStudentStaticProfile = {
  studentCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: "Nam" | "Nữ";
  hometown: string;
  permanentAddress: string;
  currentResidence: string;
  cccd: string;
  cccdIssuedDate: string;
  youthUnionDate: string;
  ethnicity: string;
  religion: string;
  admissionArea: string;
  faculty: string;
  major: string;
  specialization: string;
  cohort: string;
  cohortClass: string;
  advisorName: string;
  englishLevel: string;
  scholarshipStatus: string;
  conductScore: number;
  conductRank: string;
  bankAccount: string;
  bhytCode: string;
  familySummary: string;
  learningStyle: string;
  careerGoal: string;
  strengths: string[];
  weaknesses: string[];
  hobbies: string[];
};

export const STUDENT_DETAILED_PROFILES: Record<string, DetailedStudentStaticProfile> = {
  "2200286": {
    studentCode: "2200286",
    fullName: "Nguyễn Văn Đạt",
    dateOfBirth: "03/07/2004",
    gender: "Nam",
    hometown: "Huyện Phú Xuyên, Thành phố Hà Nội (Nơi sinh: Quảng Ninh)",
    permanentAddress: "Số nhà 471, Tổ 4, Khu Quang Trung, Phường Mạo Khê, Tỉnh Quảng Ninh",
    currentResidence: "471, Tổ 4, Khu Quang Trung, Mạo Khê, Đông Triều, Quảng Ninh",
    cccd: "022204004356",
    cccdIssuedDate: "26/09/2021",
    youthUnionDate: "26/03/2019",
    ethnicity: "Kinh",
    religion: "Không",
    admissionArea: "Khu vực 1",
    faculty: "Khoa Công nghệ thông tin",
    major: "Công nghệ thông tin",
    specialization: "Công nghệ phần mềm",
    cohort: "2022 – 2026 (Khóa 13)",
    cohortClass: "DK13-CNTT1",
    advisorName: "ThS. Trần Minh Đức",
    englishLevel: "Đạt chuẩn đầu ra Tiếng Anh (0101103871 · 99.9 điểm) · Tiếng Anh ngành CNTT đạt 9.0 (A+)",
    scholarshipStatus: "Sinh viên Xuất sắc HK8 Đợt 2 (2025-2026) với GPA học kỳ 3.74/4.0 (9.03/10) · GPA tích lũy 3.08/4.0 (143/163 TC)",
    conductScore: 89,
    conductRank: "Tốt",
    bankAccount: "BIDV Chi nhánh Chí Linh · Đã thanh toán học phí qua BIDV & Agribank",
    bhytCode: "Đã đóng BHYT năm 2026 (Phường Mạo Khê, Quảng Ninh / ĐH Sao Đỏ)",
    familySummary:
      "Cha: Nguyễn Văn Thành (sinh năm 1966, cư trú tại Khu Quang Trung, Phường Mạo Khê, Đông Triều, Quảng Ninh, SĐT 0904388848); Mẹ: Đặng Thị Tự (sinh năm 1972, cư trú tại Khu Quang Trung, Phường Mạo Khê, Đông Triều, Quảng Ninh, SĐT 0936792369).",
    learningStyle:
      "Năng lực thực hành phần mềm và dự án thực tế xuất sắc: đạt 10.0 Thực tập doanh nghiệp, 9.5 Tin sinh học, 9.3 SEO Master, 9.2 Đồ án CNPM, 9.0 Đồ án kiến thức ngành, 8.9 Phát triển ứng dụng di động, 8.7 Trí tuệ nhân tạo.",
    careerGoal: "Kỹ sư Phần mềm Full-stack / AI & Computer Vision Engineer.",
    strengths: [
      "Thực tập doanh nghiệp đạt 10.0/10 (A+), Đồ án Công nghệ phần mềm đạt 9.2/10 (A+), Đồ án kiến thức ngành đạt 9.0/10 (A+)",
      "GPA học kỳ Đợt 2 (2025-2026) đạt 3.74/4.0 (9.03/10 · Xuất sắc), tích lũy 143/163 tín chỉ, chuyên cần 100% (0 tiết vắng)",
      "Chủ nhiệm CLB Tin học Sao Đỏ, đang thực hiện Thực tập tốt nghiệp (8 TC) & Đồ án tốt nghiệp (12 TC) học kỳ Đợt 1 (2026-2027)",
    ],
    weaknesses: [
      "Một số học phần đại cương năm nhất/năm hai (Phương pháp tính 5.1, Lập trình Python 5.7, Giải tích 5.8) làm GPA tích lũy toàn khóa ở mức 3.08/4.0 dù năm cuối đạt 3.58–3.74",
      "Còn 2 khoản lệ phí xét tốt nghiệp (200.000 đ) và cấp giấy chứng nhận CĐR ngoại ngữ, tin học (30.000 đ) = 230.000 đ chưa gạch nợ",
    ],
    hobbies: [
      "Xây dựng ứng dụng Web Full-stack, AI Agent và Xử lý ảnh / Thị giác máy tính",
      "Điều hành CLB Tin học Sao Đỏ tại phòng B1-202",
      "Nghiên cứu kiến trúc phần mềm và phát triển ứng dụng di động",
    ],
  },
  "2200287": {
    studentCode: "2200287",
    fullName: "Phạm Khánh Linh",
    dateOfBirth: "22/09/2004",
    gender: "Nữ",
    hometown: "TP. Hải Dương, tỉnh Hải Dương",
    permanentAddress: "Số 118 Đại lộ Hồ Chí Minh, phường Nguyễn Trãi, TP. Hải Dương",
    currentResidence: "Ký túc xá khu A, Trường Đại học Sao Đỏ, phường Sao Đỏ, TP. Chí Linh",
    cccd: "030304004195",
    cccdIssuedDate: "10/05/2021",
    youthUnionDate: "26/03/2019",
    ethnicity: "Kinh",
    religion: "Không",
    admissionArea: "Khu vực 2",
    faculty: "Khoa Công nghệ thông tin",
    major: "Công nghệ thông tin",
    specialization: "Công nghệ phần mềm & Kiểm thử tự động",
    cohort: "2022 – 2026 (Khóa 13)",
    cohortClass: "DK13-CNTT1",
    advisorName: "ThS. Trần Minh Đức",
    englishLevel: "B2 tương đương (IELTS 6.5) · Đứng đầu lớp môn Tiếng Anh chuyên ngành",
    scholarshipStatus: "Đạt Học bổng Khuyến khích học tập loại Xuất sắc (GPA 3.72/4.0 - Top 1 lớp DK13-CNTT1)",
    conductScore: 94,
    conductRank: "Xuất sắc",
    bankAccount: "46110002878888 · BIDV Chi nhánh Chí Linh",
    bhytCode: "SV4303030400419 · Trung tâm Y tế TP. Chí Linh",
    familySummary:
      "Cha: Phạm Quốc Khánh (1970, Bác sĩ tại BV Đa khoa tỉnh Hải Dương, SĐT 0904215890); Mẹ: Nguyễn Thị Thu (1975, Kế toán trưởng, SĐT 0983214705).",
    learningStyle:
      "Cẩn thận, có tư duy hệ thống cao, luôn viết kiểm thử đơn vị (JUnit 5) và tài liệu đặc tả kỹ thuật trước khi cài đặt.",
    careerGoal: "Kỹ sư Đảm bảo chất lượng phần mềm (QA/SDET Lead) hoặc Business Analyst tại doanh nghiệp quốc tế.",
    strengths: [
      "GPA cao nhất lớp DK13-CNTT1 (3.72/4.0), chuyên cần tuyệt đối 100%",
      "Đạt 9.8/10 bài thực hành OOP số 1 với thiết kế Java 21 + bộ JUnit test bao phủ toàn bộ ca biên",
      "Lớp trưởng DK13-CNTT1 và Phó chủ nhiệm CLB Tin học Sao Đỏ, điều phối tiến độ lớp rất chuẩn",
    ],
    weaknesses: [
      "Đôi khi dành quá nhiều thời gian cầu toàn phần tài liệu hóa cho các bài lab nhỏ",
    ],
    hobbies: [
      "Tổ chức sự kiện truyền thông CLB Tin học",
      "Luyện nói tiếng Anh tại CLB SEC",
      "Đọc sách Clean Code & Software Architecture",
    ],
  },
  "2200288": {
    studentCode: "2200288",
    fullName: "Lê Việt Hoàng",
    dateOfBirth: "08/11/2004",
    gender: "Nam",
    hometown: "Thị xã Kinh Môn, Hải Dương",
    permanentAddress: "Khu dân cư Hiệp Sơn, thị xã Kinh Môn, tỉnh Hải Dương",
    currentResidence: "Nhà trọ sinh viên đường Hữu Nghị, phường Sao Đỏ, TP. Chí Linh",
    cccd: "030204005812",
    cccdIssuedDate: "22/06/2021",
    youthUnionDate: "19/05/2020",
    ethnicity: "Kinh",
    religion: "Không",
    admissionArea: "Khu vực 2NT",
    faculty: "Khoa Công nghệ thông tin",
    major: "Công nghệ thông tin",
    specialization: "Công nghệ phần mềm",
    cohort: "2022 – 2026 (Khóa 13)",
    cohortClass: "DK13-CNTT1",
    advisorName: "ThS. Trần Minh Đức",
    englishLevel: "Đang hoàn thiện chuẩn B1 (học phần EN2130)",
    scholarshipStatus: "Đủ điều kiện xét học bổng loại Khá (GPA 3.15/4.0)",
    conductScore: 80,
    conductRank: "Tốt",
    bankAccount: "46110002887777 · BIDV Chi nhánh Chí Linh",
    bhytCode: "SV4303020400581 · Trung tâm Y tế TP. Chí Linh",
    familySummary:
      "Cha: Lê Văn Hải (1971, Kinh doanh tự do, SĐT 0915623048); Mẹ: Vũ Thị Mai (1974, Nội trợ, SĐT 0972401836).",
    learningStyle:
      "Tư duy thuật toán và giải quyết vấn đề nhanh, thích viết code C++ trực diện nhưng hay gộp chung mã vào 1 file.",
    careerGoal: "Backend Developer (C++ / Golang / Node.js).",
    strengths: [
      "Tư duy logic và thuật toán C++ tốt, nộp bài thực hành đúng hạn",
      "Tích cực đăng ký tham gia nhóm Lập trình hướng đối tượng & Web của CLB Tin học",
    ],
    weaknesses: [
      "Cần tách giao diện header (.h) và implementation (.cpp) rõ ràng hơn theo nhận xét của ThS. Trần Minh Đức",
      "Kỹ năng viết tiếng Anh chuyên ngành (Technical Cover Letter) còn cần luyện thêm",
    ],
    hobbies: [
      "Đá bóng tại CLB Bóng đá sinh viên",
      "Giải bài tập thuật toán C++",
    ],
  },
  "2200289": {
    studentCode: "2200289",
    fullName: "Đỗ Thu Trang",
    dateOfBirth: "03/04/2004",
    gender: "Nữ",
    hometown: "Huyện Nam Sách, Hải Dương",
    permanentAddress: "Thôn Đông Lạc, xã Hồng Phong, huyện Nam Sách, tỉnh Hải Dương",
    currentResidence: "Ký túc xá khu A, Trường Đại học Sao Đỏ, phường Sao Đỏ, TP. Chí Linh",
    cccd: "030304006290",
    cccdIssuedDate: "14/05/2021",
    youthUnionDate: "26/03/2019",
    ethnicity: "Kinh",
    religion: "Không",
    admissionArea: "Khu vực 2NT",
    faculty: "Khoa Công nghệ thông tin",
    major: "Công nghệ thông tin",
    specialization: "Hệ thống thông tin & Thiết kế giao diện",
    cohort: "2022 – 2026 (Khóa 13)",
    cohortClass: "DK13-CNTT1",
    advisorName: "ThS. Trần Minh Đức",
    englishLevel: "Đạt chuẩn B1 · Giao tiếp tiếng Anh tốt",
    scholarshipStatus: "Ứng viên Học bổng Khuyến khích học tập loại Giỏi (GPA 3.54/4.0)",
    conductScore: 91,
    conductRank: "Xuất sắc",
    bankAccount: "46110002896666 · BIDV Chi nhánh Chí Linh",
    bhytCode: "SV4303030400629 · Trung tâm Y tế TP. Chí Linh",
    familySummary:
      "Cha: Đỗ Văn Bình (1973, Cán bộ xã, SĐT 0984112590); Mẹ: Phạm Thị Hường (1976, Giáo viên tiểu học, SĐT 0918304921).",
    learningStyle:
      "Học qua sơ đồ trực quan, giỏi phân tích thực thể - liên kết (ERD), chuẩn hóa CSDL 3NF và thiết kế UI/UX.",
    careerGoal: "Product Designer (UI/UX) kiêm Frontend Engineer.",
    strengths: [
      "GPA 3.54/4.0 (Xếp loại Giỏi), chuyên cần 96%",
      "Bí thư Chi đoàn DK13-CNTT1 năng nổ, hoàn thành xuất sắc thiết kế lược đồ CSDL và báo cáo nhóm",
      "Có thẩm mỹ thiết kế giao diện cổng thông tin sinh viên",
    ],
    weaknesses: [
      "Muốn rèn luyện sâu hơn về lập trình hệ thống cấp thấp và quản lý bộ nhớ C++",
    ],
    hobbies: [
      "Hoạt động Đoàn - Hội và CLB Tình nguyện Hoa Phượng",
      "Thiết kế giao diện Figma & Frontend",
    ],
  },
  "2200290": {
    studentCode: "2200290",
    fullName: "Vũ Quốc Bảo",
    dateOfBirth: "19/12/2004",
    gender: "Nam",
    hometown: "TP. Đông Triều, Quảng Ninh",
    permanentAddress: "Phường Mạo Khê, TP. Đông Triều, tỉnh Quảng Ninh",
    currentResidence: "Nhà trọ khu dân cư Thái Học, phường Sao Đỏ, TP. Chí Linh",
    cccd: "022204007318",
    cccdIssuedDate: "02/07/2021",
    youthUnionDate: "19/05/2020",
    ethnicity: "Kinh",
    religion: "Không",
    admissionArea: "Khu vực 2",
    faculty: "Khoa Công nghệ thông tin",
    major: "Công nghệ thông tin",
    specialization: "Mạng máy tính & Truyền thông dữ liệu",
    cohort: "2022 – 2026 (Khóa 13)",
    cohortClass: "DK13-CNTT1",
    advisorName: "ThS. Trần Minh Đức",
    englishLevel: "Đang học EN2130 (cần ôn tập thêm từ vựng chuyên ngành)",
    scholarshipStatus: "Không thuộc diện xét học bổng kỳ này (GPA 2.78/4.0 · Cảnh báo chuyên cần)",
    conductScore: 72,
    conductRank: "Khá",
    bankAccount: "46110002905555 · BIDV Chi nhánh Chí Linh",
    bhytCode: "SV4222040073180 · Trung tâm Y tế TP. Chí Linh",
    familySummary:
      "Cha: Vũ Quốc Tuấn (1969, Kỹ thuật viên mỏ, SĐT 0906338412); Mẹ: Nguyễn Thị Yến (1973, Kinh doanh, SĐT 0989712045).",
    learningStyle:
      "Thích thực hành phần cứng, bấm cáp và cấu hình mạng thực tế nhưng dễ mất tập trung ở các buổi lý thuyết trừu tượng.",
    careerGoal: "Kỹ sư Quản trị mạng & Hạ tầng hệ thống (Network / SysAdmin).",
    strengths: [
      "Thao tác thực hành cấu hình thiết bị mạng và lắp ráp phần cứng nhanh",
    ],
    weaknesses: [
      "Đang ở trạng thái Cảnh báo chuyên cần (84%): vắng 2 buổi không phép môn IT3040 (21/10/2026 và 28/10/2026)",
      "Chưa nộp Bài thực hành 1 môn Lập trình hướng đối tượng (Kế thừa & đa hình); GPA hiện tại 2.78/4.0",
    ],
    hobbies: [
      "Tìm hiểu thiết bị router/switch và phần cứng máy tính",
      "Chơi thể thao buổi chiều",
    ],
  },
  "2200291": {
    studentCode: "2200291",
    fullName: "Hoàng Minh Tuấn",
    dateOfBirth: "27/02/2004",
    gender: "Nam",
    hometown: "Huyện Lục Nam, Bắc Giang",
    permanentAddress: "Thị trấn Đồi Ngô, huyện Lục Nam, tỉnh Bắc Giang",
    currentResidence: "Ký túc xá khu B, Trường Đại học Sao Đỏ, phường Sao Đỏ, TP. Chí Linh",
    cccd: "024204003904",
    cccdIssuedDate: "19/04/2021",
    youthUnionDate: "26/03/2019",
    ethnicity: "Kinh",
    religion: "Không",
    admissionArea: "Khu vực 1",
    faculty: "Khoa Công nghệ thông tin",
    major: "Công nghệ thông tin",
    specialization: "Công nghệ phần mềm & Điện toán đám mây",
    cohort: "2022 – 2026 (Khóa 13)",
    cohortClass: "DK13-CNTT1",
    advisorName: "ThS. Trần Minh Đức",
    englishLevel: "Đạt chuẩn B1 · Đọc hiểu tài liệu kỹ thuật tiếng Anh tốt",
    scholarshipStatus: "Đủ điều kiện xét học bổng loại Giỏi (GPA 3.32/4.0)",
    conductScore: 86,
    conductRank: "Tốt",
    bankAccount: "46110002914444 · BIDV Chi nhánh Chí Linh",
    bhytCode: "SV4242040039041 · Trung tâm Y tế TP. Chí Linh",
    familySummary:
      "Cha: Hoàng Văn Sơn (1971, Nông nghiệp công nghệ cao, SĐT 0976509128); Mẹ: Lý Thị Hoa (1974, Giáo viên, SĐT 0982194037).",
    learningStyle:
      "Chủ động đặt câu hỏi trên lớp, hoàn thành sớm các bài tập truy vấn SQL và thích triển khai dự án Web/Cloud.",
    careerGoal: "Cloud / DevOps & Backend Engineer.",
    strengths: [
      "Trưởng ban Chuyên môn CLB Tin học Sao Đỏ, phụ trách nhóm Web & Cloud tại phòng Lab nhà B1",
      "Hoàn thành sớm các bài tập truy vấn SQL phức tạp (IT3090) và có GPA 3.32/4.0, chuyên cần 95%",
    ],
    weaknesses: [
      "Cần nâng điểm các môn lý thuyết đại cương để bứt phá lên mức Xuất sắc (≥3.6)",
    ],
    hobbies: [
      "Triển khai máy chủ Linux, Docker, Cloudflare Workers",
      "Hướng dẫn thành viên mới tại CLB Tin học Sao Đỏ",
    ],
  },
};

const MEMORY_STORAGE_KEY = "sao-do:ai-student-memory:v2";
const MEMORY_SYNC_EVENT = "sao-do:ai-memory-sync";

function buildDefaultMemories(): StudentMemoryFact[] {
  const list: StudentMemoryFact[] = [];
  const seedTime = "2026-10-30T08:00:00.000Z";
  for (const p of Object.values(STUDENT_DETAILED_PROFILES)) {
    list.push(
      {
        id: `seed-${p.studentCode}-style`,
        studentCode: p.studentCode,
        category: "hoc_tap",
        fact: p.learningStyle,
        source: "system",
        updatedAt: seedTime,
      },
      {
        id: `seed-${p.studentCode}-goal`,
        studentCode: p.studentCode,
        category: "muc_tieu",
        fact: `Định hướng nghề nghiệp: ${p.careerGoal}`,
        source: "system",
        updatedAt: seedTime,
      },
      ...p.strengths.map((s, idx) => ({
        id: `seed-${p.studentCode}-str-${idx}`,
        studentCode: p.studentCode,
        category: "diem_manh" as const,
        fact: s,
        source: "system" as const,
        updatedAt: seedTime,
      })),
      ...p.weaknesses.map((w, idx) => ({
        id: `seed-${p.studentCode}-weak-${idx}`,
        studentCode: p.studentCode,
        category: "diem_yeu" as const,
        fact: w,
        source: "system" as const,
        updatedAt: seedTime,
      })),
      ...p.hobbies.map((h, idx) => ({
        id: `seed-${p.studentCode}-hob-${idx}`,
        studentCode: p.studentCode,
        category: "so_thich" as const,
        fact: h,
        source: "system" as const,
        updatedAt: seedTime,
      })),
    );
  }
  return list;
}

export function readStudentMemories(): StudentMemoryFact[] {
  if (typeof window === "undefined") return buildDefaultMemories();
  try {
    const raw = window.localStorage.getItem(MEMORY_STORAGE_KEY);
    const defaults = buildDefaultMemories();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    const valid = parsed.filter(
      (item): item is StudentMemoryFact =>
        Boolean(
          item &&
            typeof item.id === "string" &&
            typeof item.studentCode === "string" &&
            typeof item.category === "string" &&
            typeof item.fact === "string" &&
            item.fact.trim().length > 0,
        ),
    );
    // Ensure default seed facts exist unless explicitly cleared
    const existingIds = new Set(valid.map((item) => item.id));
    const merged = [...valid];
    for (const seed of defaults) {
      if (!existingIds.has(seed.id)) {
        merged.push(seed);
      }
    }
    return merged;
  } catch {
    return buildDefaultMemories();
  }
}

export function writeStudentMemories(facts: StudentMemoryFact[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(facts.slice(0, 500)));
    window.dispatchEvent(new CustomEvent(MEMORY_SYNC_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function addStudentMemoryFact(input: {
  studentCode: string;
  category: MemoryCategory;
  fact: string;
  source?: "system" | "chat_auto" | "manual";
}): StudentMemoryFact | null {
  const cleanFact = input.fact.trim().replace(/\s+/g, " ");
  if (!cleanFact || cleanFact.length < 3) return null;
  const current = readStudentMemories();
  const duplicate = current.find(
    (item) =>
      item.studentCode === input.studentCode &&
      item.fact.toLowerCase() === cleanFact.toLowerCase(),
  );
  if (duplicate) return null;

  const created: StudentMemoryFact = {
    id: `mem-${input.studentCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentCode: input.studentCode,
    category: input.category,
    fact: cleanFact,
    source: input.source ?? "manual",
    updatedAt: new Date().toISOString(),
  };
  writeStudentMemories([created, ...current]);
  return created;
}

export function removeStudentMemoryFact(factId: string) {
  const current = readStudentMemories();
  writeStudentMemories(current.filter((item) => item.id !== factId));
}

export function resetStudentMemoriesForCode(studentCode: string) {
  const current = readStudentMemories().filter((item) => item.studentCode !== studentCode);
  const seeds = buildDefaultMemories().filter((item) => item.studentCode === studentCode);
  writeStudentMemories([...seeds, ...current]);
}

export function subscribeStudentMemories(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(MEMORY_SYNC_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MEMORY_SYNC_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Parses `<ghi_nho_sinh_vien code="..." category="...">...</ghi_nho_sinh_vien>` tags
 * emitted by the AI assistant, persists them, and returns the cleaned display text + saved facts.
 */
const AI_MEMORY_TAG_REGEX =
  /<ghi_nho_sinh_vien\s+code="([^"]+)"(?:\s+category="([^"]+)")?\s*>([\s\S]*?)<\/ghi_nho_sinh_vien>/gi;

export function extractAndSaveAiMemoryTags(
  rawText: string,
  fallbackStudentCode: string,
): { cleanedText: string; savedFacts: StudentMemoryFact[] } {
  const savedFacts: StudentMemoryFact[] = [];
  const validCategories = new Set<MemoryCategory>([
    "ca_nhan",
    "hoc_tap",
    "diem_manh",
    "diem_yeu",
    "muc_tieu",
    "so_thich",
    "ghi_chu",
  ]);

  const cleanedText = rawText
    .replace(AI_MEMORY_TAG_REGEX, (_match, rawCode: string, rawCategory: string, rawFact: string) => {
      const code = (rawCode || fallbackStudentCode).trim();
      const cat = validCategories.has(rawCategory as MemoryCategory)
        ? (rawCategory as MemoryCategory)
        : "ghi_chu";
      const added = addStudentMemoryFact({
        studentCode: code,
        category: cat,
        fact: rawFact,
        source: "chat_auto",
      });
      if (added) savedFacts.push(added);
      return "";
    })
    .trimEnd();

  return { cleanedText, savedFacts };
}

/**
 * Automatically detects self-reported student traits from the user's message
 * so the AI memory updates immediately even before/without tag parsing.
 */
export function autoLearnFromUserMessage(
  userMessage: string,
  activeStudentCode: string,
  roster: ClassStudentRosterItem[],
): StudentMemoryFact[] {
  const text = userMessage.trim();
  if (text.length < 8 || text.length > 600) return [];
  const saved: StudentMemoryFact[] = [];

  // Check if message mentions a specific student in roster by code or full name
  let targetCode = activeStudentCode;
  for (const stu of roster) {
    if (
      text.includes(stu.studentCode) ||
      text.toLowerCase().includes(stu.fullName.toLowerCase())
    ) {
      targetCode = stu.studentCode;
      break;
    }
  }

  const patterns: { regex: RegExp; category: MemoryCategory; prefix: string }[] = [
    {
      regex: /(?:hãy nhớ|ghi nhớ giúp|nhớ giúp mình|nhớ là)\s*[:,-]?\s*(.{6,220})/i,
      category: "ghi_chu",
      prefix: "Ghi nhớ theo yêu cầu: ",
    },
    {
      regex: /(?:mục tiêu của mình là|mình muốn trở thành|mình định hướng làm|ước mơ của mình là)\s+(.{4,180})/i,
      category: "muc_tieu",
      prefix: "Mục tiêu cá nhân chia sẻ trong hội thoại: ",
    },
    {
      regex: /(?:mình thích học|sở thích của mình là|mình đam mê|mình rất thích)\s+(.{4,180})/i,
      category: "so_thich",
      prefix: "Sở thích / đam mê: ",
    },
    {
      regex: /(?:mình yếu môn|mình đang gặp khó khăn ở|mình chưa hiểu kỹ|mình hay quên)\s+(.{4,180})/i,
      category: "diem_yeu",
      prefix: "Điểm cần hỗ trợ thêm: ",
    },
    {
      regex: /(?:mình mạnh về|thế mạnh của mình là|mình giỏi nhất là)\s+(.{4,180})/i,
      category: "diem_manh",
      prefix: "Thế mạnh tự nhận định: ",
    },
    {
      regex: /(?:quê mình ở|nhà mình ở|mình đang ở trọ tại|số điện thoại mới của mình là)\s+(.{4,180})/i,
      category: "ca_nhan",
      prefix: "Thông tin cá nhân bổ sung: ",
    },
  ];

  for (const rule of patterns) {
    const m = text.match(rule.regex);
    if (m && m[1]) {
      const factText = `${rule.prefix}${m[1].trim().replace(/[.!?]+$/, "")}`;
      const added = addStudentMemoryFact({
        studentCode: targetCode,
        category: rule.category,
        fact: factText,
        source: "chat_auto",
      });
      if (added) saved.push(added);
    }
  }

  return saved;
}

/**
 * Builds the exhaustive, structured knowledge dossier for the AI system prompt,
 * covering:
 * 1. Active user full profile (personal, family, education, bank, BHYT, conduct, portfolio).
 * 2. Complete individual dossiers & remembered characteristics for EVERY student in the class/system.
 * 3. Timetable, exams, grades across all semesters, attendance logs, tuition & receipts, clubs, assignments, and submissions.
 */
export function buildComprehensiveStudentMemoryContext(params: {
  account: PortalAccount;
  roster: ClassStudentRosterItem[];
  subjectClasses: TeacherSubjectClass[];
  attendanceSessions: TeacherAttendanceSessionRecord[];
  allSubmissions: SharedSubmissionRecord[];
  classAnnouncements: ClassAnnouncement[];
  clubMembers: ClubMemberRecord[];
  clubEvents: ClubEventRecord[];
  assignments: { id: string; title: string; instructions: string; dueAt: string | null }[];
  memories: StudentMemoryFact[];
  now: number;
}): string {
  const {
    account,
    roster,
    subjectClasses,
    attendanceSessions,
    allSubmissions,
    classAnnouncements,
    clubMembers,
    clubEvents,
    assignments,
    memories,
    now,
  } = params;

  const allGradeRows = terms.flatMap((term) => term.rows);
  const cumulativeGpa = gpa(allGradeRows);
  const currentInvoices = invoices(now);
  const activeInvoice = currentInvoices[0];
  const invoiceTotal = activeInvoice
    ? activeInvoice.items.reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const invoiceRemaining = activeInvoice ? Math.max(0, invoiceTotal - activeInvoice.paid) : 0;

  // 1. Detailed Per-Student Memory & Profile Directory (all students in roster)
  const studentDirectoryBlocks = roster.map((stu) => {
    const detail = STUDENT_DETAILED_PROFILES[stu.studentCode];
    const stuMemories = memories.filter((m) => m.studentCode === stu.studentCode);
    const stuSubmissions = allSubmissions.filter((s) => s.studentCode === stu.studentCode);
    const stuClubs = clubMembers.filter((c) => c.studentCode === stu.studentCode);

    // Attendance across teacher sessions
    const stuAttLogs = attendanceSessions
      .map((sess) => {
        const mark = sess.marks[stu.studentCode];
        const note = sess.notes[stu.studentCode];
        if (!mark) return null;
        const markLabel =
          mark === "present" ? "Có mặt" : mark === "excused" ? "Nghỉ có phép" : "Vắng không phép";
        return `${sess.date} (${sess.periods} - ${sess.topic}): ${markLabel}${note ? ` [${note}]` : ""}`;
      })
      .filter(Boolean);

    const memoryLines = stuMemories.map(
      (m) => `  + [${MEMORY_CATEGORY_LABELS[m.category]}] ${m.fact}`,
    );

    const subLines = stuSubmissions.map((sub) => {
      const asg = assignments.find((a) => a.id === sub.assignmentId);
      const snippet = sub.content.length > 400 ? `${sub.content.slice(0, 400)}…` : sub.content;
      return `  + Bài nộp "${asg?.title ?? sub.assignmentId}": Trạng thái ${sub.status === "reviewed" ? `Đã chấm (${sub.score ?? "?"}/10 - Nhận xét: ${sub.feedback ?? ""})` : "Đã nộp, chờ chấm"} · Nội dung: ${snippet}`;
    });

    return [
      `### SINH VIÊN: ${stu.fullName} (Mã SV: ${stu.studentCode})`,
      `- Lớp niên chế: ${stu.cohortClass} · Chức vụ lớp: ${stu.roleInClass} · Trạng thái: ${stu.status === "warning" ? "Cảnh báo học vụ/chuyên cần" : "Đang học bình thường"}`,
      `- Liên hệ: Email ${stu.email} · SĐT ${stu.phone}`,
      `- Kết quả tổng quát: GPA tích lũy ${stu.gpa}/4.0 (${standing(stu.gpa)}) · Tỷ lệ chuyên cần: ${stu.attendancePct}%`,
      `- Đánh giá của Cố vấn học tập (ThS. Trần Minh Đức): ${stu.teacherNote}`,
      detail
        ? [
            `- Ngày sinh: ${detail.dateOfBirth} · Giới tính: ${detail.gender} · Dân tộc: ${detail.ethnicity} · Tôn giáo: ${detail.religion} · Khu vực: ${detail.admissionArea}`,
            `- Số CCCD: ${detail.cccd} (Cấp ngày ${detail.cccdIssuedDate}) · Ngày vào Đoàn: ${detail.youthUnionDate}`,
            `- Quê quán / Nơi sinh: ${detail.hometown}`,
            `- Địa chỉ thường trú: ${detail.permanentAddress}`,
            `- Chỗ ở hiện nay: ${detail.currentResidence}`,
            `- Khoa: ${detail.faculty} · Ngành: ${detail.major} · Chuyên ngành: ${detail.specialization} · Niên khóa: ${detail.cohort}`,
            `- Ngoại ngữ: ${detail.englishLevel} · Điểm rèn luyện: ${detail.conductScore}/100 (${detail.conductRank}) · Học bổng: ${detail.scholarshipStatus}`,
            `- Ngân hàng & BHYT: TK ${detail.bankAccount} · Mã BHYT: ${detail.bhytCode}`,
            `- Gia đình: ${detail.familySummary}`,
          ].join("\n")
        : "",
      stuClubs.length
        ? `- Tham gia CLB: ${stuClubs.map((c) => `${c.memberRole} tại ${c.clubId === "club-it" ? "CLB Tin học Sao Đỏ" : c.clubId} (${c.status === "active" ? "Chính thức" : "Chờ duyệt"} · Ghi chú: ${c.note ?? ""})`).join("; ")}`
        : "- Tham gia CLB: Chưa đăng ký CLB",
      stuAttLogs.length
        ? `- Nhật ký điểm danh các buổi học gần đây:\n  + ${stuAttLogs.join("\n  + ")}`
        : "",
      subLines.length ? `- Bài tập đã nộp:\n${subLines.join("\n")}` : "- Bài tập đã nộp: Chưa có bài nộp nào trên hệ thống.",
      memoryLines.length
        ? `- Bộ nhớ AI ghi nhận về đặc điểm của ${stu.fullName}:\n${memoryLines.join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  // 2. Active user's detailed academic data (schedule, exams, full transcript, curriculum, tuition, receipts)
  const scheduleLines = sessions.map((s) => {
    const c = courseByCode.get(s.course);
    return `- ${weekdays[s.day]}: ${s.course} (${c?.name ?? s.course}) · Tiết ${s.from}-${s.to} (${sessionTime(s)}) · Phòng ${s.room} · ${s.kind} · GV: ${c?.lecturer ?? ""}`;
  });

  const progressLines = scheduleProgress.map(
    (sp) =>
      `- [${sp.classCode}] ${sp.courseCode} ${sp.courseName} (${sp.kind} - Nhóm ${sp.group}): ${sp.dayOfWeek}, ${sp.periods} tại ${sp.room} · GV: ${sp.lecturer} · Tiến độ: ${sp.completedWeeks}/${sp.totalWeeks} tuần (${sp.startDate} – ${sp.endDate})`,
  );

  const examLines = exams(now).map((ex) => {
    const c = courseByCode.get(ex.course);
    return `- ${ex.round} ${ex.course} (${c?.name ?? ex.course}): ${longDay(ex.at)} lúc ${new Date(ex.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · Phòng ${ex.room} · Số báo danh ${ex.seat} · Hình thức: ${ex.form} (${ex.minutes} phút)`;
  });

  const gradeLines = terms.map((term) => {
    const termGpa = gpa(term.rows);
    const rowDetails = term.rows
      .map((r) => {
        const score = total(r);
        const l = letter(score);
        return `${r.code} ${r.name} (${r.credits} TC · CC ${r.attendance}, GK ${r.midterm}, CK ${r.final} → TK ${score} / ${l.grade} / hệ 4: ${l.point})`;
      })
      .join("; ");
    return `- ${term.name} (GPA học kỳ ${termGpa.value}/4.0 · ${termGpa.credits} TC): ${rowDetails}`;
  });

  const attendanceCourseLines = attendanceRecords.map(
    (ar) =>
      `- ${ar.courseCode} ${ar.courseName} (Lớp HP ${ar.classCode} · GV ${ar.lecturer}): Có mặt ${ar.attendedPeriods}/${ar.totalPeriods} tiết · Nghỉ có phép ${ar.excusedAbsences} tiết · Không phép ${ar.unexcusedAbsences}/${ar.maxAllowedAbsences} tiết tối đa${ar.logs.length ? ` · Chi tiết nghỉ: ${ar.logs.map((l) => `${l.date} (${l.periods}, ${l.type}: ${l.note})`).join(", ")}` : ""}`,
  );

  const curriculumLines = curriculumSemesters.map(
    (sem) =>
      `- ${sem.title} (${sem.termCode}): ${sem.courses.map((c) => `${c.code} ${c.name} (${c.credits} TC, LT ${c.theoryHours}t/TH ${c.practiceHours}t, ${c.status === "passed" ? `Đã đạt ${c.score10} - ${c.letterGrade}` : c.status === "in_progress" ? "Đang học" : "Sắp học"}${c.prerequisite ? `, tiên quyết: ${c.prerequisite}` : ""})`).join("; ")}`,
  );

  const receiptLines = receiptRecords.map(
    (r) =>
      `- Số phiếu ${r.receiptNo} (Ký hiệu HĐ ${r.invoiceSymbol} · ${r.term} · ${r.kind}): Ngày thu ${r.collectedAt} · Phương thức ${r.method} · Mã GD ${r.transactionRef} · Thu ngân: ${r.cashier} · Tổng ${money(r.items.reduce((s, i) => s + i.amount, 0))}`,
  );

  const competencyLines = portfolioCompetencies.map(
    (comp) =>
      `- ${comp.label}: ${comp.studentScore}/100 (TB khóa: ${comp.cohortAvg}, Chuẩn mục tiêu: ${comp.targetBenchmark}) · Minh chứng: ${comp.evidence} · Gợi ý: ${comp.improvementHint}`,
  );

  const assignmentLines = assignments.map((a) => {
    const dueStr = a.dueAt ? new Date(a.dueAt).toLocaleDateString("vi-VN") : "Không giới hạn";
    return `- [${a.id}] ${a.title} (Hạn: ${dueStr}) · Yêu cầu: ${a.instructions}`;
  });

  const subjectClassLines = subjectClasses.map(
    (sc) =>
      `- Mã lớp HP ${sc.classCode}: ${sc.name} (${sc.credits} TC · Lớp ${sc.cohortClass}) · Lịch: ${sc.schedule} · Phòng ${sc.room} · GV: ${sc.teacherName} · Tiến độ giảng dạy: ${sc.completedPeriods}/${sc.totalPeriods} tiết`,
  );

  return [
    `=== NGƯỜI DÙNG ĐANG ĐĂNG NHẬP HIỆN TẠI ===`,
    `Họ và tên: ${account.displayName} · Mã định danh: ${account.code} · Vai trò: ${account.roleTitle} (${account.positionLabel})`,
    `Lớp niên chế: ${account.cohortClass} · Khoa: ${account.department} · Email: ${account.email} · SĐT: ${account.phone} · Cố vấn học tập: ${account.advisorName}`,
    `Giới thiệu: ${account.bio}`,
    ``,
    `=== HỆ THỐNG GHI NHỚ HỒ SƠ & ĐẶC ĐIỂM TỪNG SINH VIÊN (TRA CỨU ĐƯỢC MỌI SINH VIÊN) ===`,
    studentDirectoryBlocks.join("\n\n"),
    ``,
    `=== DỮ LIỆU HỌC TẬP, LỊCH HỌC, LỊCH THI, ĐIỂM SỐ & TÀI CHÍNH CHI TIẾT (${semester.name}) ===`,
    `Ngành đào tạo: ${program.name} (${program.requiredCredits} tín chỉ chuẩn đầu ra) · GPA tích lũy: ${cumulativeGpa.value}/4.0 (${standing(cumulativeGpa.value)}) · Đã tích lũy ${cumulativeGpa.credits}/${program.requiredCredits} tín chỉ`,
    `Điểm rèn luyện kỳ gần nhất (${conduct.term}): ${conduct.score}/100 (Xếp loại ${conduct.rank}) · Điểm cộng hoạt động kỳ này: ${conduct.current} điểm`,
    `Học phí kỳ ${semester.short}: Tổng phải đóng ${money(invoiceTotal)}, đã nộp ${money(activeInvoice?.paid ?? 0)}, còn thiếu ${money(invoiceRemaining)} (Hạn nộp: ${activeInvoice ? new Date(activeInvoice.due).toLocaleDateString("vi-VN") : "N/A"}) · Ngân hàng thụ hưởng: ${bank.name} - STK ${bank.account} (${bank.holder})`,
    `Lịch sử thanh toán & Biên lai điện tử:\n${receiptLines.join("\n")}\n- Các lần thanh toán: ${payments(now).map((p) => `${money(p.amount)} (${p.method}, mã tham chiếu ${p.reference})`).join("; ")}`,
    `Thời khóa biểu trong tuần:\n${scheduleLines.join("\n")}`,
    `Lịch học theo tiến độ chi tiết:\n${progressLines.join("\n")}`,
    `Danh sách lớp học phần do Giảng viên phụ trách:\n${subjectClassLines.join("\n")}`,
    `Lịch thi giữa kỳ & cuối kỳ:\n${examLines.join("\n")}`,
    `Chi tiết điểm danh theo từng học phần:\n${attendanceCourseLines.join("\n")}`,
    `Bảng điểm chi tiết các học kỳ trước:\n${gradeLines.join("\n")}`,
    `Chương trình khung toàn khóa (4 học kỳ):\n${curriculumLines.join("\n")}`,
    `Đánh giá 6 trục năng lực sinh viên:\n${competencyLines.join("\n")}`,
    `Danh sách học phần mở đăng ký kỳ tới:\n${offerings.map((o) => `- ${o.code} ${o.name} (${o.credits} TC · GV ${o.lecturer} · ${o.schedule} · Sĩ số ${o.enrolled}/${o.capacity}${o.prerequisite ? ` · Tiên quyết: ${o.prerequisite}` : ""})`).join("\n")}`,
    `Bài tập & Đồ án đang mở:\n${assignmentLines.join("\n")}`,
    `Thông báo lớp học phần:\n${classAnnouncements.map((ca) => `- ${ca.title} (${ca.authorName}): ${ca.body}`).join("\n")}`,
    `Câu lạc bộ & Sự kiện sinh viên:\n${clubs.map((cl) => `- ${cl.name} (${cl.category}): ${cl.about} · Sinh hoạt ${weekdays[cl.day]} lúc ${cl.time} tại ${cl.place} (${cl.members} thành viên)`).join("\n")}\n${clubEvents.map((ce) => `- Sự kiện CLB: ${ce.title} (${ce.time} tại ${ce.place}) — ${ce.summary}`).join("\n")}`,
    `Hoạt động ngoại khóa & Điểm rèn luyện:\n${activities(now).map((act) => `- ${act.title} (${act.organizer} · +${act.points} điểm RL · ${act.place})`).join("\n")}`,
    `Thông báo nhà trường:\n${notices(now).map((n) => `- [${n.category}] ${n.title} (${n.from}): ${n.body}`).join("\n")}`,
    `Dịch vụ Một cửa (Hành chính sinh viên):\n${serviceTypes.map((sv) => `- ${sv.name}: ${sv.about} (Thời gian xử lý ${sv.days} ngày, lệ phí ${money(sv.fee)})`).join("\n")}`,
    `Đề xuất cập nhật hồ sơ gần đây:\n${initialProfileUpdates.map((p) => `- [${p.category}] ${p.fieldLabel}: "${p.oldValue}" → "${p.newValue}" (${p.status})`).join("\n")}`,
    `Hồ sơ cá nhân gốc trên cổng (Nguyễn Văn Đạt - 2200286): ${[...profile.education, ...profile.personal].map((f) => `${f.label}: ${f.value}`).join(" | ")}`,
  ].join("\n\n");
}
