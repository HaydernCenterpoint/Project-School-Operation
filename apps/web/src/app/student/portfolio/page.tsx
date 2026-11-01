"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner } from "@/components/portal/Parts";
import { streamChat } from "@/lib/ai-client";
import { initials } from "@/lib/format";
import {
  attendanceRecords,
  buildEditableDossierTemplates,
  clubs,
  conduct,
  gpa,
  initialClubs,
  initialProfileUpdates,
  objectiveObservations,
  portfolioCompetencies,
  portfolioProjects,
  profile,
  program,
  semester,
  standing,
  terms,
  total,
  useDemoState,
  type EditableDossierTemplate,
  type ProfileUpdateProposal,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

/* ==========================================================================
   CV Studio Types & Presets
   ========================================================================== */

type CvLayoutStyleId = "modern-split" | "harvard" | "impressive" | "minimal";

type CvLayoutStyle = {
  id: CvLayoutStyleId;
  name: string;
  shortName: string;
  tag: string;
  summary: string;
  defaultAccent: string;
};

const cvLayoutStyles: CvLayoutStyle[] = [
  {
    id: "modern-split",
    name: "Mẫu chuyên nghiệp 2 cột",
    shortName: "2 cột",
    tag: "2 cột cân đối",
    summary: "Cột trái trình bày kỹ năng, chứng chỉ, hoạt động; cột phải đặt mục tiêu, học vấn và đồ án.",
    defaultAccent: "#c81d2e",
  },
  {
    id: "harvard",
    name: "Mẫu Harvard chuẩn ATS",
    shortName: "Harvard ATS",
    tag: "Chuẩn lọc tự động",
    summary: "Bố cục 1 cột cổ điển, đường kẻ phân mục rõ ràng, tương thích hệ thống đọc hồ sơ tự động.",
    defaultAccent: "#1f2937",
  },
  {
    id: "impressive",
    name: "Mẫu hồ sơ kỹ thuật",
    shortName: "Kỹ thuật",
    tag: "Nổi bật chỉ số",
    summary: "Đóng khung chỉ số học thuật (GPA, truy vấn SQL, chuyên cần Lab) và làm rõ đồ án công nghệ.",
    defaultAccent: "#0f4c81",
  },
  {
    id: "minimal",
    name: "Mẫu tinh gọn A4",
    shortName: "Tinh gọn",
    tag: "1 trang A4",
    summary: "Khoảng trắng thoáng, ưu tiên mục tiêu nghề nghiệp và các học phần cốt lõi đạt điểm A.",
    defaultAccent: "#2d6a4f",
  },
];

type CvFontPairId = "sans" | "serif" | "mono-tech";
type CvAvatarShapeId = "rounded" | "circle" | "square" | "hidden";
type CvDensityId = "compact" | "normal" | "airy";
type CvSectionId = "objective" | "education" | "projects" | "skills" | "certs" | "activities";

type StudioLeftTabId = "collect" | "edit" | "sections" | "ai" | "forms";

type CvColorSwatch = {
  id: string;
  label: string;
  hex: string;
};

const cvColorSwatches: CvColorSwatch[] = [
  { id: "sdu-crimson", label: "Đỏ Sao Đỏ", hex: "#c81d2e" },
  { id: "navy-tech", label: "Xanh hải quân", hex: "#0f4c81" },
  { id: "forest-exec", label: "Xanh rừng", hex: "#2d6a4f" },
  { id: "slate-ats", label: "Than chì", hex: "#1f2937" },
  { id: "terracotta", label: "Nâu đất", hex: "#9a3412" },
];

type EditableCvProject = {
  id: string;
  title: string;
  courseCode: string;
  semester: string;
  role: string;
  score: string;
  summary: string;
  techStack: string;
  artifactUrl: string;
};

type EditableCvSkillGroup = {
  id: string;
  group: string;
  items: string;
};

type EditableCvCertItem = {
  id: string;
  title: string;
  detail: string;
};

type AiSuggestionItem = {
  id: string;
  category: "layout" | "objective" | "project" | "skill" | "missing";
  title: string;
  reason: string;
  actionLabel: string;
  applied?: boolean;
  payload: {
    newObjective?: string;
    newSectionOrder?: CvSectionId[];
    newLayout?: CvLayoutStyleId;
    addSkillGroup?: { group: string; items: string };
    updateProjectSummary?: { index: number; summary: string };
    fillGithubDemo?: string;
  };
};

type JobRoleTrack = {
  id: string;
  sector: string;
  shortLabel: string;
  roleTitle: string;
  companyType: string;
  recommendedLayout: CvLayoutStyleId;
  recommendedOrder: CvSectionId[];
  defaultObjective: string;
  recruiterVerdict: string;
  cvSkills: {
    group: string;
    items: string[];
  }[];
  aiSuggestions: AiSuggestionItem[];
};

const jobRoleTracks: JobRoleTrack[] = [
  {
    id: "role-fullstack",
    sector: "CNTT & Phần mềm",
    shortLabel: "Backend / Fullstack Web",
    roleTitle: "Thực tập sinh Lập trình viên Backend / Fullstack Web",
    companyType: "Công ty Sản phẩm công nghệ & Phần mềm",
    recommendedLayout: "modern-split",
    recommendedOrder: ["objective", "projects", "education", "skills", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 chuyên ngành Công nghệ phần mềm tại Trường Đại học Sao Đỏ (GPA 3.22/4.0, thuộc nhóm 18% dẫn đầu lớp DK13-CNTT1) ứng tuyển vị trí Thực tập sinh Lập trình viên Backend / Fullstack. Có nền tảng vững về Lập trình hướng đối tượng (IT3040 — 9.2/10), Cấu trúc dữ liệu & Giải thuật (Điểm A) và Thiết kế CSDL chuẩn 3NF (IT3090 — 9.0/10). Mong muốn vận dụng kỹ năng TypeScript, SQL và kiểm thử tự động vào dự án thực tế tại doanh nghiệp.",
    recruiterVerdict:
      "Hồ sơ đáp ứng tiêu chí lọc tự động nhờ GPA 3.22/4.0, điểm A môn Cấu trúc dữ liệu & Giải thuật (8.5) và 2 đồ án OOP/CSDL đạt 9.0+. Nên đặt mục Dự án thực tế ngay dưới Mục tiêu nghề nghiệp.",
    cvSkills: [
      { group: "Ngôn ngữ & Nền tảng", items: ["TypeScript / JavaScript", "C++20", "SQL (PostgreSQL, SQLite)", "HTML5 / CSS3"] },
      { group: "Kiến trúc & Công cụ", items: ["OOP Design Patterns", "Thiết kế ERD 3NF", "Git / GitHub", "RESTful API & Unit Test"] },
      { group: "Ngoại ngữ & Kỹ năng mềm", items: ["Tiếng Anh B1 (8.9/10)", "Làm việc nhóm Agile", "Tài liệu kỹ thuật SRS"] },
    ],
    aiSuggestions: [
      {
        id: "sug-fs-order",
        category: "layout",
        title: "Đưa mục Dự án & Đồ án lên trước Học vấn",
        reason: "Nhà tuyển dụng vị trí Backend/Web ưu tiên xem đồ án OOP (9.2) và CSDL 3NF (9.0) ngay sau Mục tiêu nghề nghiệp.",
        actionLabel: "Xếp lại bố cục",
        payload: {
          newSectionOrder: ["objective", "projects", "education", "skills", "certs", "activities"],
        },
      },
      {
        id: "sug-fs-star",
        category: "project",
        title: "Viết lại mô tả Đồ án theo cấu trúc định lượng STAR",
        reason: "Nêu rõ quy mô 2.400 đầu sách, 14 bảng chuẩn 3NF và độ trễ truy vấn dưới 8 ms.",
        actionLabel: "Áp dụng STAR",
        payload: {
          updateProjectSummary: {
            index: 0,
            summary:
              "Xây dựng phân hệ Quản lý Thư viện Số theo kiến trúc 3-Layer & OOP: thiết kế cơ chế phân quyền độc giả/thủ thư, tự động hóa quy trình mượn–trả cho 2.400 đầu sách và phủ 18 ca kiểm thử đơn vị (đạt 9.2/10).",
          },
        },
      },
      {
        id: "sug-fs-github",
        category: "missing",
        title: "Bổ sung liên kết kho mã nguồn GitHub",
        reason: "Hồ sơ có 2 đồ án đạt điểm A nhưng chưa gắn đường dẫn mã nguồn để kỹ sư phỏng vấn đối chiếu.",
        actionLabel: "Điền link GitHub",
        payload: {
          fillGithubDemo: "github.com/khanhlinh-sdu/sdu-digital-library",
        },
      },
    ],
  },
  {
    id: "role-qa",
    sector: "CNTT & Phần mềm",
    shortLabel: "QA / Tester",
    roleTitle: "Thực tập sinh Kiểm thử phần mềm (Manual / Automation QA)",
    companyType: "Doanh nghiệp Gia công & Phát triển Phần mềm",
    recommendedLayout: "harvard",
    recommendedOrder: ["objective", "education", "projects", "skills", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, tỷ lệ chuyên cần phòng Lab đạt 97.5%) ứng tuyển vị trí Thực tập sinh QA / Tester. Đã thực hành thiết kế 18 ca kiểm thử biên (Boundary Value Analysis), kiểm thử tích hợp và truy vấn SQL đối soát dữ liệu trên CSDL 14 bảng chuẩn 3NF. Mong muốn đóng góp tính cẩn thận, tư duy đối soát hệ thống và khả năng đọc tài liệu tiếng Anh (8.9/10) vào quy trình đảm bảo chất lượng phần mềm.",
    recruiterVerdict:
      "Tỷ lệ chuyên cần Lab 97.5% và kinh nghiệm viết 18 ca kiểm thử biên trong đồ án OOP là minh chứng rõ ràng cho vị trí QA/Tester.",
    cvSkills: [
      { group: "Kiểm thử & Đảm bảo chất lượng", items: ["Test Case Design (BVA, EP)", "Bug Life Cycle & Checklist", "Unit Test & Regression Test"] },
      { group: "Cơ sở dữ liệu & Kỹ thuật", items: ["SQL truy vấn đối soát dữ liệu", "Đọc hiểu ERD 3NF", "Kiểm thử API (Postman)", "Git cơ bản"] },
      { group: "Ngoại ngữ & Thái độ", items: ["Tiếng Anh đọc hiểu tài liệu (8.9/10)", "Chuyên cần Lab 97.5%", "Ghi nhận log chuẩn xác"] },
    ],
    aiSuggestions: [
      {
        id: "sug-qa-layout",
        category: "layout",
        title: "Chuyển sang Mẫu Harvard chuẩn ATS 1 cột",
        reason: "Các đơn vị kiểm thử phần mềm ưu tiên CV 1 cột chuẩn mực, trình bày rõ quy trình và độ chính xác.",
        actionLabel: "Dùng mẫu Harvard",
        payload: {
          newLayout: "harvard",
          newSectionOrder: ["objective", "education", "projects", "skills", "certs", "activities"],
        },
      },
      {
        id: "sug-qa-skill",
        category: "skill",
        title: "Thêm nhóm kỹ năng Thiết kế Test Case & Truy vấn SQL",
        reason: "Làm rõ 18 ca kiểm thử biên từ môn IT3040 và khả năng đối soát dữ liệu bằng SQL.",
        actionLabel: "Thêm kỹ năng",
        payload: {
          addSkillGroup: {
            group: "Công cụ & Phương pháp Kiểm thử",
            items: "Test Scenario / Test Case (Excel, Jira), Boundary Value Analysis, SQL Data Verification, Postman API Test",
          },
        },
      },
    ],
  },
  {
    id: "role-ba",
    sector: "CNTT & Nghiệp vụ",
    shortLabel: "Business Analyst (BA)",
    roleTitle: "Thực tập sinh Phân tích nghiệp vụ (IT Business Analyst)",
    companyType: "Khối Ngân hàng, Tài chính, ERP & Chuyển đổi số",
    recommendedLayout: "harvard",
    recommendedOrder: ["objective", "education", "projects", "activities", "skills", "certs"],
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, Tiếng Anh 2 đạt 8.9/10 — Điểm A) ứng tuyển vị trí IT Business Analyst Intern. Có kinh nghiệm khảo sát nghiệp vụ, chuẩn hóa lược đồ quan hệ 14 bảng đạt chuẩn 3NF (9.0/10) và điều phối hoạt động câu lạc bộ học thuật (Điểm rèn luyện 86/100). Mong muốn kết nối giữa yêu cầu người dùng và đội ngũ kỹ thuật thông qua tài liệu SRS, Use Case và mô hình hóa quy trình.",
    recruiterVerdict:
      "Phù hợp với vị trí BA nhờ điểm Tiếng Anh 2 đạt 8.9 (A), điểm CSDL 9.0 và kinh nghiệm điều phối hoạt động tại CLB Tin học.",
    cvSkills: [
      { group: "Phân tích & Thiết kế hệ thống", items: ["Mô hình hóa ERD & Chuẩn hóa 3NF", "Use Case & Activity Diagram", "Đặc tả yêu cầu phần mềm (SRS)"] },
      { group: "Truy vấn & Công cụ", items: ["SQL phân tích nghiệp vụ", "Figma / Draw.io Wireframe", "Quản lý tài liệu dự án"] },
      { group: "Ngoại ngữ & Giao tiếp", items: ["Tiếng Anh B1 (Điểm A — 8.9)", "Thuyết trình & Điều phối CLB", "Phỏng vấn yêu cầu người dùng"] },
    ],
    aiSuggestions: [
      {
        id: "sug-ba-order",
        category: "layout",
        title: "Đẩy mục Hoạt động CLB & Học vấn lên cao",
        reason: "Vị trí BA đánh giá cao khả năng giao tiếp, điều phối sự kiện CLB Tin học và điểm Tiếng Anh 8.9.",
        actionLabel: "Xếp lại bố cục",
        payload: {
          newSectionOrder: ["objective", "education", "projects", "activities", "skills", "certs"],
        },
      },
    ],
  },
  {
    id: "role-data",
    sector: "Dữ liệu & Phân tích",
    shortLabel: "Data / SQL Analyst",
    roleTitle: "Thực tập sinh Phân tích dữ liệu & Cơ sở dữ liệu (Data / SQL Intern)",
    companyType: "Doanh nghiệp Thương mại điện tử, Fintech & Dữ liệu",
    recommendedLayout: "impressive",
    recommendedOrder: ["objective", "projects", "skills", "education", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 chuyên ngành Công nghệ phần mềm Trường Đại học Sao Đỏ (GPA 3.22/4.0) ứng tuyển vị trí Thực tập sinh Phân tích dữ liệu (Data / SQL Intern). Đạt 9.0/10 đồ án Cơ sở dữ liệu với 25 truy vấn thống kê phức tạp, tối ưu chỉ mục B-Tree giúp giảm thời gian phản hồi xuống dưới 8 ms và đạt điểm A môn Cấu trúc dữ liệu & Giải thuật (8.5). Mong muốn phát triển kỹ năng xử lý dữ liệu, viết truy vấn SQL hiệu năng cao và xây dựng báo cáo trực quan.",
    recruiterVerdict:
      "Điểm nhấn chính là đồ án CSDL đạt 9.0/10 (25 truy vấn thống kê, tối ưu B-Tree dưới 8 ms) và môn Giải thuật đạt 8.5 (A).",
    cvSkills: [
      { group: "Cơ sở dữ liệu & Xử lý dữ liệu", items: ["SQL nâng cao (JOIN, Window, CTE)", "Tối ưu B-Tree Index (< 8 ms)", "Thiết kế kho dữ liệu 3NF (14 bảng)"] },
      { group: "Lập trình & Thuật toán", items: ["Cấu trúc dữ liệu & Giải thuật (8.5 — A)", "Python / C++ xử lý dữ liệu", "Thống kê & Đại số tuyến tính"] },
      { group: "Báo cáo & Ngoại ngữ", items: ["Trực quan hóa dữ liệu", "Tiếng Anh đọc tài liệu kỹ thuật (8.9)", "Báo cáo phân tích định lượng"] },
    ],
    aiSuggestions: [
      {
        id: "sug-data-layout",
        category: "layout",
        title: "Chọn Mẫu hồ sơ kỹ thuật để làm rõ chỉ số dưới 8 ms",
        reason: "Đơn vị tuyển dụng Data chú ý trực tiếp vào các chỉ số hiệu năng truy vấn SQL và điểm A Giải thuật.",
        actionLabel: "Dùng mẫu Kỹ thuật",
        payload: {
          newLayout: "impressive",
          newSectionOrder: ["objective", "projects", "skills", "education", "certs", "activities"],
        },
      },
    ],
  },
  {
    id: "role-network",
    sector: "Hạ tầng & Hệ thống",
    shortLabel: "Mạng & IT Helpdesk",
    roleTitle: "Thực tập sinh Quản trị mạng & Hệ thống (Network / System Admin)",
    companyType: "Khu công nghiệp, Nhà máy sản xuất & Viễn thông",
    recommendedLayout: "modern-split",
    recommendedOrder: ["objective", "skills", "education", "projects", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 Khoa Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, chuyên cần thực hành phòng máy 97.5%) ứng tuyển vị trí Thực tập sinh Quản trị mạng & Hệ thống IT. Nắm vững kiến trúc Mạng máy tính (TCP/IP, định tuyến VLAN, Wireshark), Hệ điều hành và Quản trị cơ sở dữ liệu. Sẵn sàng làm việc trực tiếp tại doanh nghiệp và nhà máy khu vực Hải Dương, Bắc Ninh, Hà Nội.",
    recruiterVerdict:
      "Phù hợp với các doanh nghiệp FDI và khu công nghiệp quanh Hải Dương – Bắc Ninh – Hà Nội nhờ tỷ lệ chuyên cần phòng Lab 97.5%.",
    cvSkills: [
      { group: "Hạ tầng mạng & Hệ thống", items: ["TCP/IP, Subnetting, VLAN, Routing", "Phân tích gói tin Wireshark", "Quản trị Windows Server & Linux"] },
      { group: "Vận hành & Bảo trì dữ liệu", items: ["Sao lưu & Phục hồi CSDL SQL", "Xử lý sự cố phần cứng / mạng LAN", "Bảo mật tài khoản nội bộ"] },
      { group: "Tác phong công nghiệp", items: ["Chuyên cần phòng Lab 97.5%", "Điểm rèn luyện 86/100 (Tốt)", "Tiếng Anh đọc tài liệu B1"] },
    ],
    aiSuggestions: [
      {
        id: "sug-net-order",
        category: "layout",
        title: "Đưa mục Kỹ năng hệ thống & Chuyên cần lên đầu",
        reason: "Khối nhà máy FDI và khu công nghiệp cần kiểm tra nhanh kỹ năng mạng LAN/VLAN và tính kỷ luật.",
        actionLabel: "Xếp lại bố cục",
        payload: {
          newSectionOrder: ["objective", "skills", "education", "projects", "certs", "activities"],
        },
      },
    ],
  },
  {
    id: "role-sales-eng",
    sector: "Kinh doanh & Tư vấn",
    shortLabel: "Technical Sales / EdTech",
    roleTitle: "Thực tập sinh Tư vấn giải pháp Công nghệ (Technical Sales / Solution)",
    companyType: "Công ty Giải pháp Phần mềm, EdTech & Dịch vụ CNTT",
    recommendedLayout: "modern-split",
    recommendedOrder: ["objective", "activities", "projects", "education", "skills", "certs"],
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, Tiếng Anh 8.9/10, Điểm rèn luyện 86/100) ứng tuyển vị trí Thực tập sinh Tư vấn giải pháp CNTT. Kết hợp kiến thức nền tảng về phần mềm và cơ sở dữ liệu với kỹ năng thuyết trình, tổ chức sự kiện và hỗ trợ sinh viên tại CLB Tin học để tư vấn, trình diễn sản phẩm và hỗ trợ khách hàng doanh nghiệp.",
    recruiterVerdict:
      "Lợi thế kết hợp giữa kiến thức phần mềm (GPA 3.22), điểm Tiếng Anh 8.9 và kinh nghiệm hoạt động CLB.",
    cvSkills: [
      { group: "Tư vấn & Trình diễn giải pháp", items: ["Trình diễn phần mềm Web/App", "Phân tích nhu cầu khách hàng", "Soạn thảo tài liệu giới thiệu giải pháp"] },
      { group: "Hiểu biết Kỹ thuật CNTT", items: ["Nền tảng Web, CSDL & Cloud cơ bản", "Phối hợp đội ngũ Dev/QA xử lý yêu cầu", "Hướng dẫn sử dụng phần mềm"] },
      { group: "Ngoại ngữ & Hoạt động", items: ["Tiếng Anh B1 (Điểm A — 8.9/10)", "Thành viên CLB Tin học", "Giao tiếp & thuyết trình"] },
    ],
    aiSuggestions: [
      {
        id: "sug-sales-order",
        category: "layout",
        title: "Đưa Hoạt động ngoại khóa & Dự án lên trước",
        reason: "Vị trí tư vấn giải pháp cần thấy ngay sự năng động, khả năng trình diễn sản phẩm và giao tiếp.",
        actionLabel: "Xếp lại bố cục",
        payload: {
          newSectionOrder: ["objective", "activities", "projects", "education", "skills", "certs"],
        },
      },
    ],
  },
];

const defaultSectionLabels: Record<CvSectionId, string> = {
  objective: "Mục tiêu nghề nghiệp",
  education: "Học vấn & Thành tích",
  projects: "Dự án & Đồ án thực tế",
  skills: "Kỹ năng chuyên môn",
  certs: "Chứng chỉ & Minh chứng",
  activities: "Hoạt động & Rèn luyện",
};

function findProfileField(
  list: { label: string; value: string | null }[],
  keyword: string,
  fallback: string,
): string {
  const found = list.find((item) => item.label.toLowerCase().includes(keyword.toLowerCase()));
  return found?.value ?? fallback;
}

export default function StudentPortfolioPage() {
  const { data, avatarUrl, account } = useStudent();
  const router = useRouter();

  const [, setProposals] = useDemoState<ProfileUpdateProposal[]>(
    "profile-updates",
    () => initialProfileUpdates,
  );
  const [joinedClubs] = useDemoState<string[]>("clubs", () => initialClubs);

  // Auto-harvest real student academic & personal metrics from portal
  const allRows = useMemo(() => terms.flatMap((t) => t.rows), []);
  const overallGpa = useMemo(() => gpa(allRows), [allRows]);
  const earnedCredits = useMemo(
    () => allRows.reduce((sum, r) => sum + r.credits, 0),
    [allRows],
  );
  const standingText = useMemo(() => standing(overallGpa.value), [overallGpa.value]);

  const totalSessions = useMemo(
    () => attendanceRecords.reduce((sum, r) => sum + r.totalPeriods, 0),
    [],
  );
  const attendedSessions = useMemo(
    () => attendanceRecords.reduce((sum, r) => sum + r.attendedPeriods, 0),
    [],
  );
  const attendancePct = totalSessions
    ? ((attendedSessions / totalSessions) * 100).toFixed(1)
    : "100.0";

  const harvestedPersonal = useMemo(() => {
    const dob = findProfileField(profile.personal, "Ngày sinh", "18/09/2004");
    const residence = findProfileField(
      profile.personal,
      "Nơi ở hiện tại",
      "Chí Linh, Hải Dương",
    );
    const hometown = findProfileField(profile.personal, "Quê quán", "Hải Dương");
    const specialization = findProfileField(
      profile.education,
      "Chuyên ngành",
      "Công nghệ phần mềm",
    );
    const studyYears = findProfileField(profile.education, "Niên khóa", "2022 – 2026");
    return { dob, residence, hometown, specialization, studyYears };
  }, []);

  const studentIdentity = useMemo(
    () => ({
      displayName: account.displayName,
      code: account.code,
      email: account.email,
      phone: account.phone,
      cohortClass: account.cohortClass,
      department: account.department,
      advisorName: account.advisorName,
      gpaValue: overallGpa.value.toFixed(2),
      standingLabel: standingText,
      earnedCredits,
      requiredCredits: program.requiredCredits,
      conductScore: conduct.score,
      conductRank: conduct.rank,
      attendancePct,
    }),
    [account, attendancePct, earnedCredits, overallGpa.value, standingText],
  );

  const baseTemplates = useMemo(
    () => buildEditableDossierTemplates(studentIdentity),
    [studentIdentity],
  );

  const allScoredCourses = useMemo(
    () =>
      terms
        .flatMap((t) =>
          t.rows.map((r) => ({
            ...r,
            termName: t.name,
            score10: total(r),
          })),
        )
        .filter((r): r is typeof r & { score10: number } => r.score10 !== null)
        .sort((a, b) => b.score10 - a.score10),
    [],
  );

  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>(() =>
    allScoredCourses.slice(0, 6).map((c) => c.code),
  );

  const displayedCourses = useMemo(
    () => allScoredCourses.filter((c) => selectedCourseCodes.includes(c.code)),
    [allScoredCourses, selectedCourseCodes],
  );

  const joinedClubObjects = useMemo(
    () => clubs.filter((c) => joinedClubs.includes(c.id)),
    [joinedClubs],
  );

  /* ---------- Studio Workspace State ---------- */
  const [leftTab, setLeftTab] = useState<StudioLeftTabId>("collect");
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [cvTitle, setCvTitle] = useState<string>(
    `CV_${account.displayName.replace(/\s+/g, "_")}_${account.code}`,
  );
  const [cvStyleId, setCvStyleId] = useState<CvLayoutStyleId>("modern-split");
  const [roleTrackId, setRoleTrackId] = useState<string>(jobRoleTracks[0]!.id);
  const [accentColor, setAccentColor] = useState<string>("#c81d2e");
  const [fontPair, setFontPair] = useState<CvFontPairId>("sans");
  const [avatarShape, setAvatarShape] = useState<CvAvatarShapeId>("rounded");
  const [density, setDensity] = useState<CvDensityId>("normal");
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [activeSectionFocus, setActiveSectionFocus] = useState<CvSectionId | "header">("objective");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("Đã đồng bộ");

  const selectedTrack =
    jobRoleTracks.find((t) => t.id === roleTrackId) ?? jobRoleTracks[0]!;

  // Ordered sections & visibility on the CV artboard
  const [sectionOrder, setSectionOrder] = useState<CvSectionId[]>([
    "objective",
    "education",
    "projects",
    "skills",
    "certs",
    "activities",
  ]);
  const [hiddenSections, setHiddenSections] = useState<Record<CvSectionId, boolean>>({
    objective: false,
    education: false,
    projects: false,
    skills: false,
    certs: false,
    activities: false,
  });
  const [sectionTitles, setSectionTitles] = useState<Record<CvSectionId, string>>(
    () => ({ ...defaultSectionLabels }),
  );

  // Editable CV Header & Contact fields auto-populated from Student Account + Profile
  const [headerFields, setHeaderFields] = useState(() => ({
    fullName: account.displayName,
    targetRole: jobRoleTracks[0]!.roleTitle,
    email: account.email,
    phone: account.phone,
    classAndDept: `${account.cohortClass} · ${account.department}`,
    location: harvestedPersonal.residence,
    githubPortfolio: `github.com/${account.code.toLowerCase()}-sdu/portfolio`,
    gpaBadge: `${overallGpa.value.toFixed(2)} / 4.0`,
    standingBadge: `Xếp loại ${standingText} · ${earnedCredits}/${program.requiredCredits} TC`,
  }));

  // Keep header synced if user switches account in sidebar
  useEffect(() => {
    queueMicrotask(() => {
      setHeaderFields((prev) => ({
        ...prev,
        fullName: account.displayName,
        email: account.email,
        phone: account.phone,
        classAndDept: `${account.cohortClass} · ${account.department}`,
        gpaBadge: `${overallGpa.value.toFixed(2)} / 4.0`,
        standingBadge: `Xếp loại ${standingText} · ${earnedCredits}/${program.requiredCredits} TC`,
      }));
      setCvTitle(`CV_${account.displayName.replace(/\s+/g, "_")}_${account.code}`);
    });
  }, [account.code, account.cohortClass, account.department, account.displayName, account.email, account.phone, earnedCredits, overallGpa.value, standingText]);

  // Editable Projects on the CV artboard (auto-collected from portfolioProjects)
  const [cvProjects, setCvProjects] = useState<EditableCvProject[]>(() =>
    portfolioProjects.map((p) => ({
      id: p.id,
      title: p.title,
      courseCode: p.courseCode,
      semester: p.semester,
      role: p.role,
      score: p.score,
      summary: p.highlight,
      techStack: p.stack.join(" · "),
      artifactUrl: `github.com/sdu-student/${p.id}`,
    })),
  );

  // Editable Skill groups on the CV artboard
  const [cvSkillGroups, setCvSkillGroups] = useState<EditableCvSkillGroup[]>(() =>
    jobRoleTracks[0]!.cvSkills.map((g, idx) => ({
      id: `sk-${idx}`,
      group: g.group,
      items: g.items.join(", "),
    })),
  );

  // Editable Certificates & Verified Academic Badges
  const [cvCerts, setCvCerts] = useState<EditableCvCertItem[]>(() => [
    {
      id: "cert-1",
      title: "Chuẩn ngoại ngữ Tiếng Anh B1",
      detail: "Tiếng Anh 1 (8.0) · Tiếng Anh 2 (8.9 — Điểm A)",
    },
    {
      id: "cert-2",
      title: `Chuyên cần thực hành Lab ${attendancePct}%`,
      detail: `Có mặt ${attendedSessions}/${totalSessions} tiết thực hành phòng máy`,
    },
    {
      id: "cert-3",
      title: `Năng lực Thực hành phần mềm (${portfolioCompetencies[1]?.studentScore ?? 88}/100)`,
      detail: "Hoàn thành 100% đồ án môn học OOP & Cơ sở dữ liệu chuẩn 3NF",
    },
  ]);

  // Editable Extracurriculars & Awards
  const [cvActivities, setCvActivities] = useState<EditableCvCertItem[]>(() => [
    ...(joinedClubObjects.length > 0
      ? joinedClubObjects.map((club, idx) => ({
          id: `act-club-${idx}`,
          title: club.name,
          detail: `${club.category} · ${club.place} (${club.time})`,
        }))
      : [
          {
            id: "act-club-default",
            title: "CLB Tin học & Lập trình SDU",
            detail: "Thành viên nhóm thuật toán & hỗ trợ kỹ thuật",
          },
        ]),
    {
      id: "act-conduct",
      title: `Điểm rèn luyện: ${conduct.score}/100 (${conduct.rank})`,
      detail: `Đủ điều kiện xét Học bổng Khuyến khích học tập ${semester.short}`,
    },
  ]);

  // Smart rewrite controls
  const [aiFocus, setAiFocus] = useState<"ats" | "project" | "intern" | "fresher">("ats");
  const [customCompanyHint, setCustomCompanyHint] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiSortingAndFilling, setAiSortingAndFilling] = useState<boolean>(false);
  const [aiStatusText, setAiStatusText] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionItem[]>(
    () => jobRoleTracks[0]!.aiSuggestions,
  );

  // Administrative Dossier Form state (in Tab 5 "forms")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(baseTemplates[0]!.id);
  const [customOverrides, setCustomOverrides] = useDemoState<
    Record<string, Record<string, string>>
  >("portfolio-form-drafts-v2", () => ({}));
  const [bannerNotice, setBannerNotice] = useState<string>("");

  const canvasViewportRef = useRef<HTMLDivElement>(null);

  const formattedDefaultObjective = useMemo(
    () =>
      selectedTrack.defaultObjective
        .replace(/3\.22/g, overallGpa.value.toFixed(2))
        .replace(/86\/100/g, `${conduct.score}/100`),
    [overallGpa.value, selectedTrack.defaultObjective],
  );

  const formattedRecruiterVerdict = useMemo(
    () =>
      selectedTrack.recruiterVerdict
        .replace(/3\.22/g, overallGpa.value.toFixed(2))
        .replace(/86\/100/g, `${conduct.score}/100`),
    [overallGpa.value, selectedTrack.recruiterVerdict],
  );

  if (!data) return null;

  const accessToken = data.token;

  const activeTemplate: EditableDossierTemplate =
    baseTemplates.find((tpl) => tpl.id === selectedTemplateId) ?? baseTemplates[0]!;

  const activeDraftValues: Record<string, string> = {
    ...Object.fromEntries(activeTemplate.fields.map((f) => [f.key, f.value])),
    ...(customOverrides[activeTemplate.id] ?? {}),
  };

  const currentCareerObjective =
    customOverrides["tpl-internship-cv"]?.objectivePitch ?? formattedDefaultObjective;

  function setCareerObjectiveText(nextText: string) {
    setCustomOverrides((prev) => ({
      ...prev,
      "tpl-internship-cv": {
        ...(prev["tpl-internship-cv"] ?? {}),
        targetRole: headerFields.targetRole,
        objectivePitch: nextText,
      },
    }));
  }

  /* ---------- Full Auto-Harvest from Student Portal Data ---------- */
  function syncAllStudentDataToCanvas() {
    setHeaderFields({
      fullName: account.displayName,
      targetRole: selectedTrack.roleTitle,
      email: account.email,
      phone: account.phone,
      classAndDept: `${account.cohortClass} · ${account.department}`,
      location: harvestedPersonal.residence,
      githubPortfolio: `github.com/${account.code.toLowerCase()}-sdu/portfolio`,
      gpaBadge: `${overallGpa.value.toFixed(2)} / 4.0`,
      standingBadge: `Xếp loại ${standingText} · ${earnedCredits}/${program.requiredCredits} TC`,
    });
    setSelectedCourseCodes(allScoredCourses.slice(0, 6).map((c) => c.code));
    setCvProjects(
      portfolioProjects.map((p) => ({
        id: p.id,
        title: p.title,
        courseCode: p.courseCode,
        semester: p.semester,
        role: p.role,
        score: p.score,
        summary: p.highlight,
        techStack: p.stack.join(" · "),
        artifactUrl: `github.com/sdu-student/${p.id}`,
      })),
    );
    setCvSkillGroups(
      selectedTrack.cvSkills.map((g, idx) => ({
        id: `sk-sync-${idx}`,
        group: g.group,
        items: g.items.join(", "),
      })),
    );
    setCvCerts([
      {
        id: "cert-1",
        title: "Chuẩn ngoại ngữ Tiếng Anh B1",
        detail: "Tiếng Anh 1 (8.0) · Tiếng Anh 2 (8.9 — Điểm A)",
      },
      {
        id: "cert-2",
        title: `Chuyên cần thực hành Lab ${attendancePct}%`,
        detail: `Có mặt ${attendedSessions}/${totalSessions} tiết thực hành phòng máy`,
      },
      {
        id: "cert-3",
        title: `Năng lực Thực hành phần mềm (${portfolioCompetencies[1]?.studentScore ?? 88}/100)`,
        detail: "Hoàn thành 100% đồ án môn học OOP & Cơ sở dữ liệu chuẩn 3NF",
      },
    ]);
    setCvActivities([
      ...(joinedClubObjects.length > 0
        ? joinedClubObjects.map((club, idx) => ({
            id: `act-club-${idx}`,
            title: club.name,
            detail: `${club.category} · ${club.place} (${club.time})`,
          }))
        : [
            {
              id: "act-club-default",
              title: "CLB Tin học & Lập trình SDU",
              detail: "Thành viên nhóm thuật toán & hỗ trợ kỹ thuật",
            },
          ]),
      {
        id: "act-conduct",
        title: `Điểm rèn luyện: ${conduct.score}/100 (${conduct.rank})`,
        detail: `Đủ điều kiện xét Học bổng Khuyến khích học tập ${semester.short}`,
      },
    ]);
    setHiddenSections({
      objective: false,
      education: false,
      projects: false,
      skills: false,
      certs: false,
      activities: false,
    });
    const nowStr = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setLastSyncedAt(`Đồng bộ lúc ${nowStr}`);
    setBannerNotice(
      `Đã đồng bộ hồ sơ của ${account.displayName} (GPA ${overallGpa.value.toFixed(2)}, ${earnedCredits} TC, ${portfolioProjects.length} đồ án, ${allScoredCourses.length} môn học) lên bản thảo A4`,
    );
  }

  function toggleCourseInCv(code: string) {
    setSelectedCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  /* ---------- Role / Template Switching ---------- */
  function selectJobRoleTrack(track: JobRoleTrack) {
    setRoleTrackId(track.id);
    setHeaderFields((prev) => ({
      ...prev,
      targetRole: track.roleTitle,
    }));
    setCvSkillGroups(
      track.cvSkills.map((g, idx) => ({
        id: `sk-${track.id}-${idx}`,
        group: g.group,
        items: g.items.join(", "),
      })),
    );
    setAiSuggestions(track.aiSuggestions);
  }

  function selectCvLayout(style: CvLayoutStyle) {
    setCvStyleId(style.id);
    setAccentColor(style.defaultAccent);
  }

  /* ---------- Section Order & Visibility Controls ---------- */
  function moveSection(sectionId: CvSectionId, direction: -1 | 1) {
    setSectionOrder((prev) => {
      const idx = prev.indexOf(sectionId);
      if (idx < 0) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item!);
      return copy;
    });
  }

  function toggleSectionVisibility(sectionId: CvSectionId) {
    setHiddenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }

  function focusSectionInEditor(sectionId: CvSectionId | "header") {
    setActiveSectionFocus(sectionId);
    if (leftCollapsed) setLeftCollapsed(false);
  }

  /* ---------- Apply Individual Suggestion ---------- */
  function applyAiSuggestion(sug: AiSuggestionItem) {
    const { payload } = sug;
    if (payload.newLayout) {
      const foundLayout = cvLayoutStyles.find((l) => l.id === payload.newLayout);
      if (foundLayout) selectCvLayout(foundLayout);
    }
    if (payload.newSectionOrder) {
      setSectionOrder(payload.newSectionOrder);
    }
    if (payload.newObjective) {
      setCareerObjectiveText(payload.newObjective);
    }
    if (payload.addSkillGroup) {
      const groupToAdd = payload.addSkillGroup;
      setCvSkillGroups((prev) => [
        ...prev,
        {
          id: `sk-ai-${Date.now()}`,
          group: groupToAdd.group,
          items: groupToAdd.items,
        },
      ]);
    }
    if (payload.updateProjectSummary) {
      const { index, summary } = payload.updateProjectSummary;
      setCvProjects((prev) =>
        prev.map((proj, idx) => (idx === index ? { ...proj, summary } : proj)),
      );
    }
    if (payload.fillGithubDemo) {
      const demoUrl = payload.fillGithubDemo;
      setHeaderFields((prev) => ({ ...prev, githubPortfolio: demoUrl }));
      setCvProjects((prev) =>
        prev.map((proj, idx) =>
          idx === 0 ? { ...proj, artifactUrl: `https://${demoUrl}` } : proj,
        ),
      );
    }

    setAiSuggestions((prev) =>
      prev.map((item) => (item.id === sug.id ? { ...item, applied: true } : item)),
    );
    setBannerNotice(`Đã áp dụng gợi ý: "${sug.title}"`);
  }

  /* ---------- Auto-Arrange & Auto-Fill Engine ---------- */
  async function runAiAutoArrangeAndFillAll() {
    if (aiSortingAndFilling) return;
    setAiSortingAndFilling(true);
    setAiStatusText("Đang tổng hợp bảng điểm, đồ án Lab và sắp xếp bố cục theo vị trí");

    setSectionOrder(selectedTrack.recommendedOrder);
    setHeaderFields((prev) => ({
      ...prev,
      targetRole: customCompanyHint.trim()
        ? `${selectedTrack.roleTitle} — ${customCompanyHint.trim()}`
        : selectedTrack.roleTitle,
    }));
    setCvSkillGroups(
      selectedTrack.cvSkills.map((g, idx) => ({
        id: `sk-auto-${idx}`,
        group: g.group,
        items: g.items.join(", "),
      })),
    );

    const prompt = [
      `Bạn là cố vấn hồ sơ nghề nghiệp đại học. Hãy đọc hồ sơ học tập thực tế của sinh viên dưới đây và viết đoạn "Mục tiêu nghề nghiệp" (65-100 từ) súc tích, giàu số liệu định lượng để điền trực tiếp vào CV:`,
      `- Ứng viên: ${studentIdentity.displayName} (${studentIdentity.cohortClass}, ${studentIdentity.department}, Trường Đại học Sao Đỏ).`,
      `- Vị trí ứng tuyển: ${selectedTrack.roleTitle} (${selectedTrack.companyType}).`,
      customCompanyHint.trim() ? `- Doanh nghiệp / JD mục tiêu: ${customCompanyHint.trim()}.` : "",
      `- Dữ liệu học tập thực tế: GPA ${overallGpa.value.toFixed(2)}/4.0 (${standingText}, nhóm 18% dẫn đầu), ${earnedCredits}/${program.requiredCredits} tín chỉ, chuyên cần Lab ${attendancePct}%, điểm rèn luyện ${conduct.score}/100.`,
      `- Học phần & Đồ án nổi bật: Lập trình hướng đối tượng (9.2/10 - Đồ án Quản lý Thư viện 2.400 đầu sách, 18 Unit Test), Cơ sở dữ liệu (9.0/10 - 14 bảng chuẩn 3NF, 25 truy vấn SQL < 8 ms), Cấu trúc dữ liệu & Giải thuật (8.5 - Điểm A), Tiếng Anh 2 (8.9 - Điểm A, chuẩn B1).`,
      `Chỉ trả về đúng 1 đoạn văn hoàn chỉnh (không tiêu đề, không gạch đầu dòng) để điền thẳng vào ô Mục tiêu nghề nghiệp trên CV.`,
    ]
      .filter(Boolean)
      .join("\n");

    const controller = new AbortController();
    let streamed = "";

    try {
      await streamChat(
        accessToken,
        {
          conversationId: null,
          mode: "summarize",
          content: prompt,
          assignmentId: null,
          reasoningEffort: "low",
        },
        crypto.randomUUID(),
        (event) => {
          if (event.type === "delta") {
            streamed += event.text;
            setCareerObjectiveText(streamed.trimStart());
          }
        },
        controller.signal,
      );
      if (streamed.trim()) {
        setCareerObjectiveText(streamed.trim().replace(/^["“]|["”]$/g, ""));
      } else {
        setCareerObjectiveText(selectedTrack.defaultObjective);
      }
    } catch {
      setCareerObjectiveText(selectedTrack.defaultObjective);
    } finally {
      setAiSortingAndFilling(false);
      setAiStatusText("");
      setBannerNotice(
        `Đã sắp xếp 6 mục CV theo chuẩn "${selectedTrack.shortLabel}" và cập nhật Mục tiêu nghề nghiệp`,
      );
    }
  }

  /* ---------- Single-Section Rewrite (Objective or Project) ---------- */
  async function rewriteObjectiveWithAi() {
    if (aiGenerating) return;
    setAiGenerating(true);
    setAiStatusText("Đang biên tập lại Mục tiêu nghề nghiệp");

    const styleHints: Record<typeof aiFocus, string> = {
      ats: "Ngắn gọn, súc tích, chứa từ khóa kỹ thuật chuẩn ATS (60-85 từ).",
      project: "Nhấn mạnh kết quả định lượng từ 2 đồ án thực tế (9.2/10 và 9.0/10) cùng hiệu năng truy vấn SQL dưới 8 ms.",
      intern: "Thái độ cầu thị, kỷ luật phòng Lab 97.5%, sẵn sàng học quy trình thực tế tại doanh nghiệp.",
      fresher: "Định hướng đóng góp lâu dài và phát triển lên Kỹ sư chính thức sau kỳ thực tập.",
    };

    const prompt = [
      `Viết đoạn "Mục tiêu nghề nghiệp" cho CV sinh viên ${studentIdentity.displayName} (GPA ${overallGpa.value.toFixed(2)}/4.0, Lớp ${studentIdentity.cohortClass}, ĐH Sao Đỏ) ứng tuyển vị trí "${headerFields.targetRole}".`,
      customCompanyHint.trim() ? `Công ty/JD mục tiêu: ${customCompanyHint.trim()}.` : "",
      `Phong cách: ${styleHints[aiFocus]}`,
      `Điểm mạnh thực tế: Đồ án OOP 9.2/10, Đồ án CSDL 14 bảng 3NF 9.0/10, Cấu trúc dữ liệu & Giải thuật 8.5 (A), Tiếng Anh B1 8.9 (A), chuyên cần Lab ${attendancePct}%.`,
      `Chỉ trả về đoạn văn hoàn chỉnh, không mở bài hay markdown heading.`,
    ]
      .filter(Boolean)
      .join("\n");

    const controller = new AbortController();
    let streamed = "";

    try {
      await streamChat(
        accessToken,
        {
          conversationId: null,
          mode: "summarize",
          content: prompt,
          assignmentId: null,
          reasoningEffort: "low",
        },
        crypto.randomUUID(),
        (event) => {
          if (event.type === "delta") {
            streamed += event.text;
            setCareerObjectiveText(streamed.trimStart());
          }
        },
        controller.signal,
      );
      if (streamed.trim()) {
        setCareerObjectiveText(streamed.trim().replace(/^["“]|["”]$/g, ""));
      }
    } catch {
      setCareerObjectiveText(selectedTrack.defaultObjective);
    } finally {
      setAiGenerating(false);
      setAiStatusText("");
    }
  }

  async function rewriteProjectWithAi(projectIdx: number) {
    const targetProj = cvProjects[projectIdx];
    if (!targetProj || aiGenerating) return;
    setAiGenerating(true);
    setAiStatusText(`Đang chuẩn hóa dự án "${targetProj.title}" theo cấu trúc STAR`);

    const prompt = [
      `Hãy viết lại mô tả dự án trong CV cho sinh viên CNTT theo mô hình STAR (Tình huống - Nhiệm vụ - Hành động - Kết quả định lượng) trong 45-65 từ:`,
      `- Tên dự án: ${targetProj.title} (${targetProj.courseCode})`,
      `- Vai trò: ${targetProj.role} · Điểm đánh giá: ${targetProj.score}`,
      `- Công nghệ: ${targetProj.techStack}`,
      `- Mô tả hiện tại: ${targetProj.summary}`,
      `- Vị trí đang ứng tuyển: ${headerFields.targetRole}`,
      `Chỉ trả về đúng 1 đoạn mô tả ngắn gọn, súc tích, không dùng gạch đầu dòng hay tiêu đề.`,
    ].join("\n");

    const controller = new AbortController();
    let streamed = "";

    try {
      await streamChat(
        accessToken,
        {
          conversationId: null,
          mode: "summarize",
          content: prompt,
          assignmentId: null,
          reasoningEffort: "low",
        },
        crypto.randomUUID(),
        (event) => {
          if (event.type === "delta") {
            streamed += event.text;
            const cleanText = streamed.trimStart();
            setCvProjects((prev) =>
              prev.map((item, idx) =>
                idx === projectIdx ? { ...item, summary: cleanText } : item,
              ),
            );
          }
        },
        controller.signal,
      );
    } catch {
      // Keep existing summary on network error
    } finally {
      setAiGenerating(false);
      setAiStatusText("");
    }
  }

  /* ---------- HTML Escape & Export Word (.doc) / PDF A4 ---------- */
  function escapeHtml(raw: string): string {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildWordSectionHtml(secId: CvSectionId): string {
    if (hiddenSections[secId]) return "";
    const title = escapeHtml(sectionTitles[secId]);

    if (secId === "objective") {
      return `
        <div class="cv-sec">
          <h2>${title}</h2>
          <p>${escapeHtml(currentCareerObjective).replace(/\n/g, "<br/>")}</p>
        </div>`;
    }

    if (secId === "education") {
      const courseListHtml = displayedCourses
        .map(
          (c) =>
            `<span class="course-pill"><b>${escapeHtml(c.code)}</b> ${escapeHtml(c.name)}: <b>${c.score10.toFixed(1)}</b></span>`,
        )
        .join(" · ");
      return `
        <div class="cv-sec">
          <h2>${title}</h2>
          <p><strong>Trường Đại học Sao Đỏ — Ngành Công nghệ thông tin</strong> (${escapeHtml(harvestedPersonal.studyYears)})</p>
          <p class="sub">Chuyên ngành ${escapeHtml(harvestedPersonal.specialization)} · Cố vấn học tập: ${escapeHtml(studentIdentity.advisorName)} · <strong>GPA ${escapeHtml(headerFields.gpaBadge)}</strong> (${escapeHtml(headerFields.standingBadge)})</p>
          <p class="sub"><strong>Học phần cốt lõi điểm cao:</strong> ${courseListHtml}</p>
        </div>`;
    }

    if (secId === "projects") {
      const projHtml = cvProjects
        .map(
          (p) => `
          <div class="proj-item">
            <p class="proj-title"><strong>${escapeHtml(p.title)}</strong> <span>(${escapeHtml(p.courseCode)} — <b>${escapeHtml(p.score)}</b>)</span> · <span>${escapeHtml(p.role)}</span></p>
            <p>${escapeHtml(p.summary).replace(/\n/g, "<br/>")}</p>
            <p class="proj-meta">Công nghệ: ${escapeHtml(p.techStack)}${p.artifactUrl ? ` · Liên kết: ${escapeHtml(p.artifactUrl)}` : ""}</p>
          </div>`,
        )
        .join("");
      return `
        <div class="cv-sec">
          <h2>${title}</h2>
          ${projHtml}
        </div>`;
    }

    if (secId === "skills") {
      const skillRows = cvSkillGroups
        .map(
          (g) =>
            `<tr><th>${escapeHtml(g.group)}</th><td>${escapeHtml(g.items)}</td></tr>`,
        )
        .join("");
      return `
        <div class="cv-sec">
          <h2>${title}</h2>
          <table class="skill-table"><tbody>${skillRows}</tbody></table>
        </div>`;
    }

    if (secId === "certs") {
      const items = cvCerts
        .map(
          (c) =>
            `<li><strong>${escapeHtml(c.title)}:</strong> ${escapeHtml(c.detail)}</li>`,
        )
        .join("");
      return `
        <div class="cv-sec">
          <h2>${title}</h2>
          <ul>${items}</ul>
        </div>`;
    }

    const actItems = cvActivities
      .map(
        (a) =>
          `<li><strong>${escapeHtml(a.title)}:</strong> ${escapeHtml(a.detail)}</li>`,
      )
      .join("");
    return `
      <div class="cv-sec">
        <h2>${title}</h2>
        <ul>${actItems}</ul>
      </div>`;
  }

  function exportLiveCvToWordDoc() {
    const wordFontFamily =
      fontPair === "serif"
        ? "Georgia, serif"
        : fontPair === "mono-tech"
          ? "'JetBrains Mono', monospace"
          : "'Plus Jakarta Sans', system-ui, sans-serif";

    const visibleOrdered = sectionOrder.filter((id) => !hiddenSections[id]);
    const sideIds: CvSectionId[] = ["skills", "certs", "activities"];

    const bodyLayoutHtml =
      cvStyleId === "modern-split"
        ? `<table class="layout-split" role="presentation">
            <tbody>
              <tr>
                <td class="col-side">
                  ${visibleOrdered
                    .filter((id) => sideIds.includes(id))
                    .map((id) => buildWordSectionHtml(id))
                    .join("")}
                </td>
                <td class="col-main">
                  ${visibleOrdered
                    .filter((id) => !sideIds.includes(id))
                    .map((id) => buildWordSectionHtml(id))
                    .join("")}
                </td>
              </tr>
            </tbody>
          </table>`
        : visibleOrdered.map((id) => buildWordSectionHtml(id)).join("");

    const safeFileTitle = (cvTitle || `CV_${studentIdentity.code}`).replace(/[\\/:*?"<>|]+/g, "_");

    const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${escapeHtml(safeFileTitle)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 21.0cm 29.7cm;
    margin: 1.4cm 1.5cm 1.4cm 1.5cm;
    mso-header-margin: 1.0cm;
    mso-footer-margin: 1.0cm;
  }
  div.Section1 { page: Section1; }
  body {
    font-family: ${wordFontFamily};
    font-size: 10.5pt;
    line-height: 1.42;
    color: #111827;
    margin: 0;
  }
  .cv-head-table { width: 100%; border-collapse: collapse; border-bottom: 2pt solid ${accentColor}; padding-bottom: 8pt; margin-bottom: 8pt; }
  .cv-head-table td { border: none; padding: 0 0 8pt 0; vertical-align: top; }
  .cv-meta-tag { font-size: 8.5pt; color: #6b7280; margin: 0 0 2pt 0; }
  h1 { font-size: 18pt; margin: 0 0 3pt 0; color: #0f172a; letter-spacing: -0.01em; }
  .cv-role { font-size: 11pt; font-weight: bold; color: ${accentColor}; margin: 0; }
  .gpa-box { text-align: right; background: #f8fafc; border: 1pt solid #cbd5e1; padding: 6pt 10pt; }
  .gpa-num { font-size: 13pt; font-weight: bold; color: ${accentColor}; margin: 2pt 0; }
  .contact-bar { width: 100%; border-collapse: collapse; background: #f8fafc; border: 1pt solid #e2e8f0; margin-bottom: 10pt; }
  .contact-bar td { width: 25%; border: 1pt solid #e2e8f0; padding: 5pt 7pt; font-size: 9pt; vertical-align: top; }
  .contact-bar b { display: block; font-size: 8pt; color: #64748b; }
  .cv-sec { margin-bottom: 10pt; }
  h2 { font-size: 11pt; color: ${accentColor}; border-bottom: 1pt solid ${accentColor}; padding-bottom: 2pt; margin: 10pt 0 5pt 0; }
  p { margin: 2.5pt 0; }
  .sub { font-size: 9.5pt; color: #334155; }
  .proj-item { margin-bottom: 7pt; padding-bottom: 5pt; border-bottom: 1pt solid #e2e8f0; }
  .proj-title { font-size: 10.5pt; margin-bottom: 2pt; }
  .proj-meta { font-size: 9pt; color: #475569; }
  .skill-table { width: 100%; border-collapse: collapse; margin-top: 4pt; }
  .skill-table th, .skill-table td { border: 1pt solid #cbd5e1; padding: 4.5pt 6pt; font-size: 9.5pt; text-align: left; vertical-align: top; }
  .skill-table th { width: 32%; background: #f1f5f9; font-weight: bold; color: #1e293b; }
  .layout-split { width: 100%; border-collapse: collapse; }
  .layout-split > tbody > tr > td { border: none; vertical-align: top; }
  .layout-split .col-side { width: 34%; padding-right: 10pt; border-right: 1pt solid #e2e8f0; }
  .layout-split .col-main { width: 66%; padding-left: 10pt; }
  ul { margin: 3pt 0 3pt 16pt; padding: 0; }
  li { margin-bottom: 3pt; font-size: 9.5pt; }
</style>
</head>
<body>
<div class="Section1">
  <table class="cv-head-table" role="presentation">
    <tbody>
      <tr>
        <td>
          <p class="cv-meta-tag">Hồ sơ xác thực ĐH Sao Đỏ · Mã 22SDU.CNTT.${escapeHtml(studentIdentity.code.slice(-4))}</p>
          <h1>${escapeHtml(headerFields.fullName)}</h1>
          <p class="cv-role">${escapeHtml(headerFields.targetRole)}</p>
        </td>
        <td style="width: 155pt;">
          <div class="gpa-box">
            <div style="font-size: 8pt; color: #64748b;">GPA tích lũy xác thực</div>
            <div class="gpa-num">${escapeHtml(headerFields.gpaBadge)}</div>
            <div style="font-size: 8.5pt; color: #059669; font-weight: bold;">${escapeHtml(headerFields.standingBadge)}</div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <table class="contact-bar" role="presentation">
    <tbody>
      <tr>
        <td><b>Email</b>${escapeHtml(headerFields.email)}</td>
        <td><b>Điện thoại</b>${escapeHtml(headerFields.phone)}</td>
        <td><b>Lớp &amp; Khoa</b>${escapeHtml(headerFields.classAndDept)}</td>
        <td><b>GitHub / Khu vực</b>${escapeHtml(headerFields.githubPortfolio)}</td>
      </tr>
    </tbody>
  </table>

  ${bodyLayoutHtml}
</div>
</body>
</html>`;

    const blob = new Blob(["﻿", htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileTitle}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải xuống "${safeFileTitle}.doc" khổ A4`);
  }

  function exportLiveCvToPdfA4() {
    const prevTitle = document.title;
    const safeFileTitle = (cvTitle || `CV_${studentIdentity.code}`).replace(/[\\/:*?"<>|]+/g, "_");
    document.title = safeFileTitle;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 600);
  }

  /* ---------- Administrative Form Studio Handlers ---------- */
  function updateDraftField(key: string, value: string) {
    setCustomOverrides((prev) => ({
      ...prev,
      [activeTemplate.id]: {
        ...(prev[activeTemplate.id] ?? {}),
        [key]: value,
      },
    }));
  }

  function resetTemplateDraft(templateId: string) {
    setCustomOverrides((prev) => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });
    setBannerNotice("Đã khôi phục dữ liệu trích xuất gốc từ hệ thống đào tạo");
  }

  function exportTemplateAsWordDoc(tpl: EditableDossierTemplate) {
    const values: Record<string, string> = {
      ...Object.fromEntries(tpl.fields.map((f) => [f.key, f.value])),
      ...(customOverrides[tpl.id] ?? {}),
    };
    const rowsHtml = tpl.fields
      .map(
        (field) => `
        <tr>
          <td style="width:34%;padding:8pt 10pt;border:1pt solid #cbd5e1;font-weight:bold;background:#f8fafc;">${escapeHtml(field.label)}</td>
          <td style="width:66%;padding:8pt 10pt;border:1pt solid #cbd5e1;">${escapeHtml(values[field.key] ?? "").replace(/\n/g, "<br/>")}</td>
        </tr>`,
      )
      .join("");

    const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${escapeHtml(tpl.code)} - ${escapeHtml(tpl.title)}</title>
<!--[if gte mso 9]>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
<![endif]-->
<style>
  @page Section1 { size: 21.0cm 29.7cm; margin: 2.0cm 2.0cm 2.0cm 2.0cm; }
  div.Section1 { page: Section1; }
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.45; color: #111; margin: 0; }
</style>
</head>
<body>
<div class="Section1">
  <p style="text-align:center;font-weight:bold;margin:0;">Trường Đại học Sao Đỏ · Mã biểu mẫu: ${escapeHtml(tpl.code)}</p>
  <p style="text-align:center;font-size:10.5pt;color:#475569;margin:2pt 0 12pt;">Nơi tiếp nhận: ${escapeHtml(tpl.recipient)} · Mã xác thực: 22SDU.CNTT.${escapeHtml(studentIdentity.code.slice(-4))}</p>
  <h2 style="text-align:center;font-size:15pt;margin:0 0 14pt;">${escapeHtml(tpl.title)}</h2>
  <table style="width:100%;border-collapse:collapse;"><tbody>${rowsHtml}</tbody></table>
</div>
</body></html>`;

    const blob = new Blob(["﻿", htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tpl.code}_${studentIdentity.code}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải xuống biểu mẫu "${tpl.code}" (.doc)`);
  }

  function dispatchFormSubmit(event: FormEvent) {
    event.preventDefault();

    if (activeTemplate.id === "tpl-profile-correction") {
      const category = (activeDraftValues.category ||
        "Hồ sơ cá nhân") as ProfileUpdateProposal["category"];
      const fieldLabel = activeDraftValues.fieldLabel || "Cập nhật hồ sơ học tập & kỹ năng";
      const oldValue = activeDraftValues.oldValue || "Chưa khai báo";
      const newValue = activeDraftValues.newValue || "";
      const reason = activeDraftValues.reason || "";

      const newProposal: ProfileUpdateProposal = {
        id: `pup-${Date.now()}`,
        category: [
          "Hồ sơ cá nhân",
          "Tài khoản ngân hàng",
          "Bảo hiểm y tế",
          "Thông tin gia đình",
        ].includes(category)
          ? category
          : "Hồ sơ cá nhân",
        fieldLabel,
        oldValue,
        newValue,
        reason,
        submittedAt: new Date().toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Đang chờ duyệt",
      };
      setProposals((prev) => [newProposal, ...prev]);

      const params = new URLSearchParams({
        from: "portfolio",
        category: newProposal.category,
        field: fieldLabel,
        old: oldValue,
        new: newValue,
        reason,
      });
      router.push(`/student/profile-update?${params.toString()}` as Route);
      return;
    }

    if (activeTemplate.id === "tpl-onestop-service") {
      const sType = activeDraftValues.serviceTypeId || "svc-1";
      const purpose = `${activeDraftValues.purpose || "Bổ sung hồ sơ thực tập"} — Cam kết: ${activeDraftValues.gpaConfirm || ""}`;
      const params = new URLSearchParams({
        from: "portfolio",
        type: sType,
        purpose,
      });
      router.push(`/student/services?${params.toString()}` as Route);
      return;
    }

    exportTemplateAsWordDoc(activeTemplate);
  }

  /* ---------- Render Helpers for Individual CV Sections on A4 Canvas ---------- */
  const leftSidebarSections: CvSectionId[] = ["skills", "certs", "activities"];

  function renderSectionToolbar(
    sectionId: CvSectionId,
    allowAiRewrite?: () => void,
    onAdd?: () => void,
  ) {
    const idx = sectionOrder.indexOf(sectionId);
    return (
      <div
        className="cv-block-floating-tools"
        role="toolbar"
        aria-label={`Công cụ mục ${sectionTitles[sectionId]}`}
      >
        <button
          type="button"
          className="cv-tool-mini"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSectionFocus(sectionId);
            setLeftTab("edit");
            setLeftCollapsed(false);
          }}
          title="Mở bảng chỉnh sửa chi tiết ở cột trái"
        >
          <Icon name="pen" />
          <span>Chi tiết</span>
        </button>
        <button
          type="button"
          className="cv-tool-mini"
          onClick={(e) => {
            e.stopPropagation();
            moveSection(sectionId, -1);
          }}
          disabled={idx <= 0}
          title="Đưa mục này lên trên"
        >
          <span>Lên</span>
        </button>
        <button
          type="button"
          className="cv-tool-mini"
          onClick={(e) => {
            e.stopPropagation();
            moveSection(sectionId, 1);
          }}
          disabled={idx < 0 || idx >= sectionOrder.length - 1}
          title="Đưa mục này xuống dưới"
        >
          <span>Xuống</span>
        </button>
        {allowAiRewrite && (
          <button
            type="button"
            className="cv-tool-mini"
            onClick={(e) => {
              e.stopPropagation();
              allowAiRewrite();
            }}
            disabled={aiGenerating || aiSortingAndFilling}
          >
            <Icon name="retry" />
            <span>Viết lại</span>
          </button>
        )}
        {onAdd && (
          <button
            type="button"
            className="cv-tool-mini"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Icon name="plus" />
            <span>Thêm dòng</span>
          </button>
        )}
        <button
          type="button"
          className="cv-tool-mini"
          onClick={(e) => {
            e.stopPropagation();
            toggleSectionVisibility(sectionId);
          }}
          title="Ẩn mục này khỏi CV"
        >
          <Icon name="eyeOff" />
          <span>Ẩn</span>
        </button>
      </div>
    );
  }

  function renderCvSectionBlock(sectionId: CvSectionId) {
    if (hiddenSections[sectionId]) return null;
    const isFocused = activeSectionFocus === sectionId;

    if (sectionId === "objective") {
      return (
        <section
          key="objective"
          className={`pf-cv-block cv-editable-block${isFocused ? " is-selected" : ""}`}
          onClick={() => focusSectionInEditor("objective")}
        >
          {renderSectionToolbar("objective", () => void rewriteObjectiveWithAi())}
          <header className="pf-cv-block-head">
            <input
              type="text"
              className="cv-section-title-input"
              value={sectionTitles.objective}
              onChange={(e) =>
                setSectionTitles((prev) => ({ ...prev, objective: e.target.value }))
              }
              aria-label="Tiêu đề mục Mục tiêu nghề nghiệp"
            />
            <span>Tổng hợp từ GPA {overallGpa.value.toFixed(2)} &amp; đồ án</span>
          </header>
          <textarea
            className="pf-cv-objective-input"
            rows={6}
            value={currentCareerObjective}
            onChange={(e) => setCareerObjectiveText(e.target.value)}
            aria-label="Nội dung mục tiêu nghề nghiệp trên CV"
          />
        </section>
      );
    }

    if (sectionId === "education") {
      return (
        <section
          key="education"
          className={`pf-cv-block cv-editable-block${isFocused ? " is-selected" : ""}`}
          onClick={() => focusSectionInEditor("education")}
        >
          {renderSectionToolbar("education")}
          <header className="pf-cv-block-head">
            <input
              type="text"
              className="cv-section-title-input"
              value={sectionTitles.education}
              onChange={(e) =>
                setSectionTitles((prev) => ({ ...prev, education: e.target.value }))
              }
              aria-label="Tiêu đề mục Học vấn"
            />
            <span>{harvestedPersonal.studyYears}</span>
          </header>
          <div className="pf-cv-edu-row">
            <div>
              <strong>Trường Đại học Sao Đỏ — {account.department}</strong>
              <p>
                Chuyên ngành {harvestedPersonal.specialization} · Lớp {account.cohortClass} · Cố vấn:{" "}
                {studentIdentity.advisorName}
              </p>
            </div>
            <code>
              GPA {overallGpa.value.toFixed(2)} / 4.0 · {earnedCredits}/{program.requiredCredits} TC
            </code>
          </div>
          <div className="pf-cv-top-courses">
            <span className="pf-cv-sublabel">
              Học phần cốt lõi trích xuất từ bảng điểm ({displayedCourses.length} môn)
            </span>
            <div className="pf-course-pills">
              {displayedCourses.map((course) => (
                <span key={course.code} className="pf-course-tag">
                  <code>{course.code}</code> {course.name}:{" "}
                  <strong>{course.score10.toFixed(1)}</strong>
                </span>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (sectionId === "projects") {
      return (
        <section
          key="projects"
          className={`pf-cv-block cv-editable-block${isFocused ? " is-selected" : ""}`}
          onClick={() => focusSectionInEditor("projects")}
        >
          {renderSectionToolbar(
            "projects",
            () => void rewriteProjectWithAi(0),
            () =>
              setCvProjects((prev) => [
                ...prev,
                {
                  id: `proj-custom-${Date.now()}`,
                  title: "Dự án cá nhân / Bài tập lớn mới",
                  courseCode: "SDU-PRJ",
                  semester: semester.short,
                  role: "Thành viên phát triển chính",
                  score: "9.0 / 10",
                  summary:
                    "Mô tả ngắn gọn bài toán, giải pháp kỹ thuật đã triển khai và kết quả đạt được",
                  techStack: "TypeScript · React · SQL",
                  artifactUrl: "",
                },
              ]),
          )}
          <header className="pf-cv-block-head">
            <input
              type="text"
              className="cv-section-title-input"
              value={sectionTitles.projects}
              onChange={(e) =>
                setSectionTitles((prev) => ({ ...prev, projects: e.target.value }))
              }
              aria-label="Tiêu đề mục Dự án"
            />
            <span>{cvProjects.length} đồ án xác thực</span>
          </header>
          <div className="pf-cv-projects">
            {cvProjects.map((proj, idx) => (
              <article key={proj.id} className="pf-cv-project-item">
                <div className="pf-cv-project-head">
                  <div className="cv-proj-title-wrap">
                    <input
                      type="text"
                      className="cv-inline-input is-strong"
                      value={proj.title}
                      onChange={(e) =>
                        setCvProjects((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, title: e.target.value } : item,
                          ),
                        )
                      }
                      aria-label={`Tên dự án ${idx + 1}`}
                    />
                    <div className="cv-proj-sub-inputs">
                      <input
                        type="text"
                        className="cv-inline-input is-sub"
                        value={proj.role}
                        onChange={(e) =>
                          setCvProjects((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, role: e.target.value } : item,
                            ),
                          )
                        }
                        aria-label={`Vai trò dự án ${idx + 1}`}
                      />
                      <span>·</span>
                      <code>{proj.courseCode}</code>
                    </div>
                  </div>
                  <div className="cv-proj-actions-right">
                    <input
                      type="text"
                      className="pf-cv-project-score cv-score-input"
                      value={proj.score}
                      onChange={(e) =>
                        setCvProjects((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, score: e.target.value } : item,
                          ),
                        )
                      }
                      aria-label={`Điểm dự án ${idx + 1}`}
                    />
                    <button
                      type="button"
                      className="cv-mini-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        void rewriteProjectWithAi(idx);
                      }}
                      disabled={aiGenerating}
                      title="Chuẩn hóa mô tả dự án theo cấu trúc STAR"
                    >
                      <Icon name="retry" />
                    </button>
                    {cvProjects.length > 1 && (
                      <button
                        type="button"
                        className="cv-mini-icon-btn is-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCvProjects((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        title="Xóa dự án này khỏi CV"
                      >
                        <Icon name="close" />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  className="cv-inline-textarea"
                  rows={2}
                  value={proj.summary}
                  onChange={(e) =>
                    setCvProjects((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, summary: e.target.value } : item,
                      ),
                    )
                  }
                  aria-label={`Mô tả dự án ${idx + 1}`}
                />
                <div className="pf-cv-project-meta">
                  <input
                    type="text"
                    className="cv-inline-input is-mono"
                    value={proj.techStack}
                    onChange={(e) =>
                      setCvProjects((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, techStack: e.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Công nghệ sử dụng"
                    aria-label={`Công nghệ dự án ${idx + 1}`}
                  />
                  <input
                    type="text"
                    className="cv-inline-input is-link"
                    value={proj.artifactUrl}
                    onChange={(e) =>
                      setCvProjects((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, artifactUrl: e.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Liên kết GitHub hoặc bản chạy thử"
                    aria-label={`Link demo dự án ${idx + 1}`}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (sectionId === "skills") {
      return (
        <section
          key="skills"
          className={`pf-cv-block cv-editable-block${isFocused ? " is-selected" : ""}`}
          onClick={() => focusSectionInEditor("skills")}
        >
          {renderSectionToolbar("skills", undefined, () =>
            setCvSkillGroups((prev) => [
              ...prev,
              {
                id: `sk-custom-${Date.now()}`,
                group: "Nhóm kỹ năng mới",
                items: "Kỹ năng 1, Kỹ năng 2",
              },
            ]),
          )}
          <header className="pf-cv-block-head">
            <input
              type="text"
              className="cv-section-title-input"
              value={sectionTitles.skills}
              onChange={(e) =>
                setSectionTitles((prev) => ({ ...prev, skills: e.target.value }))
              }
              aria-label="Tiêu đề mục Kỹ năng"
            />
          </header>
          <div className="pf-skill-groups">
            {cvSkillGroups.map((group, idx) => (
              <div key={group.id} className="pf-skill-row cv-editable-skill-row">
                <div className="cv-skill-row-head">
                  <input
                    type="text"
                    className="cv-inline-input is-label"
                    value={group.group}
                    onChange={(e) =>
                      setCvSkillGroups((prev) =>
                        prev.map((g, i) =>
                          i === idx ? { ...g, group: e.target.value } : g,
                        ),
                      )
                    }
                    aria-label={`Tên nhóm kỹ năng ${idx + 1}`}
                  />
                  {cvSkillGroups.length > 1 && (
                    <button
                      type="button"
                      className="cv-mini-icon-btn is-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCvSkillGroups((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      title="Xóa nhóm kỹ năng"
                    >
                      <Icon name="close" />
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  className="cv-inline-input is-skill-items"
                  value={group.items}
                  onChange={(e) =>
                    setCvSkillGroups((prev) =>
                      prev.map((g, i) =>
                        i === idx ? { ...g, items: e.target.value } : g,
                      ),
                    )
                  }
                  aria-label={`Danh sách kỹ năng ${idx + 1}`}
                />
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (sectionId === "certs") {
      return (
        <section
          key="certs"
          className={`pf-cv-block cv-editable-block${isFocused ? " is-selected" : ""}`}
          onClick={() => focusSectionInEditor("certs")}
        >
          {renderSectionToolbar("certs", undefined, () =>
            setCvCerts((prev) => [
              ...prev,
              {
                id: `cert-${Date.now()}`,
                title: "Chứng chỉ / Giải thưởng mới",
                detail: "Cơ quan cấp · Năm cấp",
              },
            ]),
          )}
          <header className="pf-cv-block-head">
            <input
              type="text"
              className="cv-section-title-input"
              value={sectionTitles.certs}
              onChange={(e) =>
                setSectionTitles((prev) => ({ ...prev, certs: e.target.value }))
              }
              aria-label="Tiêu đề mục Chứng chỉ"
            />
          </header>
          <ul className="pf-cv-compact-list">
            {cvCerts.map((cert, idx) => (
              <li key={cert.id} className="cv-editable-list-item">
                <div className="cv-list-item-head">
                  <input
                    type="text"
                    className="cv-inline-input is-strong"
                    value={cert.title}
                    onChange={(e) =>
                      setCvCerts((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, title: e.target.value } : c,
                        ),
                      )
                    }
                    aria-label={`Tên chứng chỉ ${idx + 1}`}
                  />
                  {cvCerts.length > 1 && (
                    <button
                      type="button"
                      className="cv-mini-icon-btn is-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCvCerts((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      title="Xóa chứng chỉ"
                    >
                      <Icon name="close" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="cv-inline-input is-sub"
                  value={cert.detail}
                  onChange={(e) =>
                    setCvCerts((prev) =>
                      prev.map((c, i) =>
                        i === idx ? { ...c, detail: e.target.value } : c,
                      ),
                    )
                  }
                  aria-label={`Chi tiết chứng chỉ ${idx + 1}`}
                />
              </li>
            ))}
          </ul>
        </section>
      );
    }

    return (
      <section
        key="activities"
        className={`pf-cv-block cv-editable-block${isFocused ? " is-selected" : ""}`}
        onClick={() => focusSectionInEditor("activities")}
      >
        {renderSectionToolbar("activities", undefined, () =>
          setCvActivities((prev) => [
            ...prev,
            {
              id: `act-${Date.now()}`,
              title: "Hoạt động tình nguyện / CLB",
              detail: "Vai trò · Kết quả đóng góp",
            },
          ]),
        )}
        <header className="pf-cv-block-head">
          <input
            type="text"
            className="cv-section-title-input"
            value={sectionTitles.activities}
            onChange={(e) =>
              setSectionTitles((prev) => ({ ...prev, activities: e.target.value }))
            }
            aria-label="Tiêu đề mục Hoạt động"
          />
        </header>
        <ul className="pf-cv-compact-list">
          {cvActivities.map((act, idx) => (
            <li key={act.id} className="cv-editable-list-item">
              <div className="cv-list-item-head">
                <input
                  type="text"
                  className="cv-inline-input is-strong"
                  value={act.title}
                  onChange={(e) =>
                    setCvActivities((prev) =>
                      prev.map((a, i) =>
                        i === idx ? { ...a, title: e.target.value } : a,
                      ),
                    )
                  }
                  aria-label={`Tên hoạt động ${idx + 1}`}
                />
                {cvActivities.length > 1 && (
                  <button
                    type="button"
                    className="cv-mini-icon-btn is-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCvActivities((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    title="Xóa hoạt động"
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
              <input
                type="text"
                className="cv-inline-input is-sub"
                value={act.detail}
                onChange={(e) =>
                  setCvActivities((prev) =>
                    prev.map((a, i) =>
                      i === idx ? { ...a, detail: e.target.value } : a,
                    ),
                  )
                }
                aria-label={`Chi tiết hoạt động ${idx + 1}`}
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function renderPrintSectionBlock(sectionId: CvSectionId) {
    if (hiddenSections[sectionId]) return null;

    if (sectionId === "objective") {
      return (
        <section key="print-objective" className="cv-print-block">
          <header className="cv-print-block-head">
            <h3>{sectionTitles.objective}</h3>
          </header>
          <p className="cv-print-text">{currentCareerObjective}</p>
        </section>
      );
    }

    if (sectionId === "education") {
      return (
        <section key="print-education" className="cv-print-block">
          <header className="cv-print-block-head">
            <h3>{sectionTitles.education}</h3>
            <span>{harvestedPersonal.studyYears}</span>
          </header>
          <div className="cv-print-edu-row">
            <div>
              <strong>Trường Đại học Sao Đỏ — {account.department}</strong>
              <p>
                Chuyên ngành {harvestedPersonal.specialization} · Cố vấn học tập: {studentIdentity.advisorName}
              </p>
            </div>
            <code>
              GPA {overallGpa.value.toFixed(2)} / 4.0 · {earnedCredits}/{program.requiredCredits} TC
            </code>
          </div>
          <div className="cv-print-courses">
            {displayedCourses.map((course) => (
              <span key={course.code} className="cv-print-course-pill">
                <b>{course.code}</b> {course.name}: <strong>{course.score10.toFixed(1)}</strong>
              </span>
            ))}
          </div>
        </section>
      );
    }

    if (sectionId === "projects") {
      return (
        <section key="print-projects" className="cv-print-block">
          <header className="cv-print-block-head">
            <h3>{sectionTitles.projects}</h3>
            <span>{cvProjects.length} dự án</span>
          </header>
          <div className="cv-print-projects">
            {cvProjects.map((proj) => (
              <article key={proj.id} className="cv-print-proj-item">
                <div className="cv-print-proj-head">
                  <div>
                    <strong>{proj.title}</strong>
                    <span>
                      {proj.role} · <code>{proj.courseCode}</code>
                    </span>
                  </div>
                  <code className="cv-print-proj-score">{proj.score}</code>
                </div>
                <p className="cv-print-text">{proj.summary}</p>
                <div className="cv-print-proj-meta">
                  <span>Công nghệ: {proj.techStack}</span>
                  {proj.artifactUrl && <span>{proj.artifactUrl}</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (sectionId === "skills") {
      return (
        <section key="print-skills" className="cv-print-block">
          <header className="cv-print-block-head">
            <h3>{sectionTitles.skills}</h3>
          </header>
          <div className="cv-print-skills">
            {cvSkillGroups.map((group) => (
              <div key={group.id} className="cv-print-skill-row">
                <strong>{group.group}</strong>
                <span>{group.items}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (sectionId === "certs") {
      return (
        <section key="print-certs" className="cv-print-block">
          <header className="cv-print-block-head">
            <h3>{sectionTitles.certs}</h3>
          </header>
          <ul className="cv-print-list">
            {cvCerts.map((cert) => (
              <li key={cert.id}>
                <strong>{cert.title}</strong>
                <span>{cert.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    return (
      <section key="print-activities" className="cv-print-block">
        <header className="cv-print-block-head">
          <h3>{sectionTitles.activities}</h3>
        </header>
        <ul className="cv-print-list">
          {cvActivities.map((act) => (
            <li key={act.id}>
              <strong>{act.title}</strong>
              <span>{act.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const artboardCssVars = {
    "--cv-accent": accentColor,
    transform: zoomPct === 100 ? undefined : `scale(${zoomPct / 100})`,
    transformOrigin: "top center",
  } as CSSProperties;

  return (
    <div className="cv-studio-page">
      <DemoBanner />

      {bannerNotice && (
        <div className="notice ok cv-studio-notice" role="status">
          <Icon name="checkCircle" />
          <div>
            <strong>Hồ sơ năng lực &amp; CV</strong>
            <p>{bannerNotice}</p>
          </div>
          <button
            className="button button-quiet button-xs"
            type="button"
            onClick={() => setBannerNotice("")}
          >
            Đóng
          </button>
        </div>
      )}

      {/* ====================================================================
          1. TOP EDITOR TOOLBAR
          ==================================================================== */}
      <header className="cv-studio-top-ribbon" role="toolbar" aria-label="Thanh công cụ thiết kế CV">
        <div className="cv-ribbon-row is-primary">
          <div className="cv-ribbon-brand">
            <span className="cv-topbar-badge">Hồ sơ A4</span>
            <input
              type="text"
              className="cv-doc-title-input"
              value={cvTitle}
              onChange={(e) => setCvTitle(e.target.value)}
              aria-label="Tên tệp CV"
            />
            <button
              type="button"
              className="cv-harvest-pill"
              onClick={syncAllStudentDataToCanvas}
              title="Đồng bộ lại thông tin cá nhân, GPA, bảng điểm, đồ án và rèn luyện từ hệ thống đào tạo"
            >
              <span className="cv-harvest-dot" aria-hidden="true" />
              <span>{lastSyncedAt}</span>
              <Icon name="retry" />
            </button>
          </div>

          <div className="cv-ribbon-actions">
            <button
              type="button"
              className="button button-primary button-sm"
              onClick={() => void runAiAutoArrangeAndFillAll()}
              disabled={aiSortingAndFilling || aiGenerating}
            >
              <span>{aiSortingAndFilling ? "Đang điền theo vị trí" : "Tự động điền theo vị trí"}</span>
            </button>
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={exportLiveCvToWordDoc}
            >
              <Icon name="file" />
              <span>Xuất Word (.doc)</span>
            </button>
            <button
              type="button"
              className="button button-quiet button-sm"
              onClick={exportLiveCvToPdfA4}
            >
              <span>In PDF A4</span>
            </button>
          </div>
        </div>

        <div className="cv-ribbon-row is-controls">
          <div className="cv-ribbon-group" role="group" aria-label="Bố cục trang A4">
            <span className="cv-ribbon-label">Bố cục</span>
            <div className="cv-ribbon-pills">
              {cvLayoutStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`cv-ribbon-pill${cvStyleId === style.id ? " is-active" : ""}`}
                  onClick={() => selectCvLayout(style)}
                  title={style.summary}
                >
                  {style.shortName}
                </button>
              ))}
            </div>
          </div>

          <span className="cv-ribbon-divider" aria-hidden="true" />

          <div className="cv-ribbon-group">
            <span className="cv-ribbon-label">Vị trí</span>
            <select
              className="cv-topbar-select"
              value={roleTrackId}
              onChange={(e) => {
                const found = jobRoleTracks.find((r) => r.id === e.target.value);
                if (found) selectJobRoleTrack(found);
              }}
              aria-label="Vị trí ứng tuyển mục tiêu"
            >
              {jobRoleTracks.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.shortLabel}
                </option>
              ))}
            </select>
          </div>

          <span className="cv-ribbon-divider" aria-hidden="true" />

          <div className="cv-swatch-bar" role="group" aria-label="Màu điểm nhấn trên CV">
            {cvColorSwatches.map((sw) => (
              <button
                key={sw.id}
                type="button"
                className={`cv-color-dot${accentColor.toLowerCase() === sw.hex.toLowerCase() ? " is-active" : ""}`}
                style={{ backgroundColor: sw.hex }}
                onClick={() => setAccentColor(sw.hex)}
                title={`Màu điểm nhấn: ${sw.label}`}
                aria-label={sw.label}
              />
            ))}
            <label className="cv-color-picker-label" title="Chọn mã màu tùy chỉnh">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                aria-label="Chọn màu tùy chỉnh"
              />
              <span>Màu</span>
            </label>
          </div>

          <select
            className="cv-topbar-select"
            value={fontPair}
            onChange={(e) => setFontPair(e.target.value as CvFontPairId)}
            aria-label="Phông chữ CV"
          >
            <option value="sans">Chữ không chân</option>
            <option value="serif">Chữ có chân</option>
            <option value="mono-tech">Chữ kỹ thuật</option>
          </select>

          <div className="cv-zoom-controls" role="group" aria-label="Thu phóng trang A4">
            <button
              type="button"
              onClick={() => setZoomPct((z) => Math.max(75, z - 10))}
              title="Thu nhỏ trang A4"
            >
              −
            </button>
            <button
              type="button"
              className="cv-zoom-reset"
              onClick={() => setZoomPct(100)}
              title="Đặt lại tỷ lệ 100%"
            >
              {zoomPct}%
            </button>
            <button
              type="button"
              onClick={() => setZoomPct((z) => Math.min(120, z + 10))}
              title="Phóng to trang A4"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          2. MAIN STUDIO WORKBENCH (LEFT INSPECTOR + RIGHT A4 SHEET)
          ==================================================================== */}
      <div className={`cv-studio-workbench${leftCollapsed ? " is-left-collapsed" : ""}`}>
        <aside className="cv-studio-left-sidebar" aria-label="Bảng biên tập hồ sơ bên trái">
          <nav className="cv-left-rail" aria-label="Các nhóm công cụ biên tập CV">
            {(
              [
                { id: "collect", icon: "award", label: "Hồ sơ gốc" },
                { id: "edit", icon: "pen", label: "Biên tập" },
                { id: "sections", icon: "list", label: "Bố cục" },
                { id: "ai", icon: "trend", label: "Gợi ý" },
                { id: "forms", icon: "clipboard", label: "Biểu mẫu" },
              ] as const
            ).map((tab) => {
              const active = !leftCollapsed && leftTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`cv-dock-btn${active ? " is-active" : ""}`}
                  onClick={() => {
                    if (leftTab === tab.id) {
                      setLeftCollapsed((c) => !c);
                    } else {
                      setLeftTab(tab.id);
                      setLeftCollapsed(false);
                    }
                  }}
                >
                  <Icon name={tab.icon} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {!leftCollapsed && (
            <div className="cv-left-inspector">
              {/* TAB 1: AUTO-COLLECTED STUDENT DATA FROM PORTAL */}
              {leftTab === "collect" && (
                <div className="cv-drawer-pane">
                  <header className="cv-drawer-head">
                    <div>
                      <span className="pf-section-eyebrow">Dữ liệu học vụ ĐH Sao Đỏ</span>
                      <h3>Hồ sơ sinh viên trích xuất</h3>
                    </div>
                    <button
                      type="button"
                      className="cv-tool-mini"
                      onClick={syncAllStudentDataToCanvas}
                    >
                      <Icon name="retry" />
                      <span>Đồng bộ</span>
                    </button>
                  </header>

                  <div className="cv-collector-summary-card">
                    <div className="cv-collector-student">
                      <strong>{account.displayName}</strong>
                      <code>{account.code} · {account.cohortClass}</code>
                    </div>
                    <div className="cv-collector-metrics">
                      <div>
                        <span>GPA tích lũy</span>
                        <strong>{overallGpa.value.toFixed(2)} / 4.0</strong>
                      </div>
                      <div>
                        <span>Tín chỉ</span>
                        <strong>{earnedCredits} / {program.requiredCredits}</strong>
                      </div>
                      <div>
                        <span>Chuyên cần Lab</span>
                        <strong>{attendancePct}%</strong>
                      </div>
                      <div>
                        <span>Rèn luyện</span>
                        <strong>{conduct.score} / 100</strong>
                      </div>
                    </div>
                  </div>

                  <div className="cv-drawer-group">
                    <div className="cv-subhead-row">
                      <span className="cv-group-label">Học phần điểm cao trên CV</span>
                      <span>{displayedCourses.length}/{allScoredCourses.length} môn</span>
                    </div>
                    <div className="cv-collected-course-list">
                      {allScoredCourses.slice(0, 10).map((course) => {
                        const checked = selectedCourseCodes.includes(course.code);
                        return (
                          <button
                            key={course.code}
                            type="button"
                            className={`cv-collected-course-chip${checked ? " is-selected" : ""}`}
                            onClick={() => toggleCourseInCv(course.code)}
                          >
                            <span className="cv-course-check" aria-hidden="true">
                              <Icon name={checked ? "check" : "plus"} />
                            </span>
                            <div className="cv-course-chip-body">
                              <strong>
                                <code>{course.code}</code> {course.name}
                              </strong>
                              <small>{course.termName} · {course.credits} TC</small>
                            </div>
                            <b className="cv-course-score-badge">{course.score10.toFixed(1)}</b>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cv-drawer-group">
                    <div className="cv-subhead-row">
                      <span className="cv-group-label">Đồ án &amp; bài tập lớn</span>
                      <span>{portfolioProjects.length} đồ án</span>
                    </div>
                    <div className="cv-data-snippets">
                      {portfolioProjects.map((proj) => {
                        const inCv = cvProjects.some((p) => p.title === proj.title);
                        return (
                          <article key={proj.id} className="cv-data-card">
                            <div className="pf-obs-head">
                              <strong>{proj.title}</strong>
                              <code className="pf-obs-metric">{proj.score}</code>
                            </div>
                            <p>{proj.highlight}</p>
                            <button
                              type="button"
                              className="pf-inline-link"
                              onClick={() => {
                                if (inCv) {
                                  setActiveSectionFocus("projects");
                                  setLeftTab("edit");
                                  return;
                                }
                                setCvProjects((prev) => [
                                  ...prev,
                                  {
                                    id: `proj-sync-${Date.now()}`,
                                    title: proj.title,
                                    courseCode: proj.courseCode,
                                    semester: proj.semester,
                                    role: proj.role,
                                    score: proj.score,
                                    summary: proj.highlight,
                                    techStack: proj.stack.join(" · "),
                                    artifactUrl: `github.com/sdu-student/${proj.id}`,
                                  },
                                ]);
                                setBannerNotice(`Đã đưa đồ án "${proj.title}" vào trang CV`);
                              }}
                            >
                              <span>{inCv ? "Đã có trên CV (Bấm để sửa)" : "Đưa vào CV"}</span>
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cv-drawer-group">
                    <span className="cv-group-label">Minh chứng &amp; nhận xét học vụ</span>
                    <div className="cv-data-snippets">
                      {objectiveObservations.map((obs) => (
                        <article key={obs.id} className="cv-data-card">
                          <div className="pf-obs-head">
                            <strong>{obs.title}</strong>
                            <code className="pf-obs-metric">{obs.metric}</code>
                          </div>
                          <p>{obs.summary}</p>
                          <button
                            type="button"
                            className="pf-inline-link"
                            onClick={() => {
                              setCvCerts((prev) => [
                                ...prev,
                                {
                                  id: `cert-obs-${Date.now()}`,
                                  title: `${obs.title} (${obs.metric})`,
                                  detail: obs.evidenceRef,
                                },
                              ]);
                              setBannerNotice(`Đã thêm minh chứng "${obs.title}" vào mục Chứng chỉ`);
                            }}
                          >
                            <span>Chèn vào mục Chứng chỉ</span>
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECT COMPONENT EDITOR FOR SELECTED SECTION */}
              {leftTab === "edit" && (
                <div className="cv-drawer-pane">
                  <header className="cv-drawer-head">
                    <div>
                      <span className="pf-section-eyebrow">Biên tập nội dung</span>
                      <h3>Chỉnh sửa từng mục</h3>
                    </div>
                  </header>

                  <div className="cv-edit-target-pills" role="tablist" aria-label="Chọn mục cần sửa">
                    {(
                      [
                        { id: "header", label: "Liên hệ" },
                        { id: "objective", label: "Mục tiêu" },
                        { id: "education", label: "Học vấn" },
                        { id: "projects", label: "Dự án" },
                        { id: "skills", label: "Kỹ năng" },
                        { id: "certs", label: "Chứng chỉ" },
                        { id: "activities", label: "Hoạt động" },
                      ] as const
                    ).map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        role="tab"
                        aria-selected={activeSectionFocus === sec.id}
                        className={`cv-target-pill${activeSectionFocus === sec.id ? " is-active" : ""}`}
                        onClick={() => setActiveSectionFocus(sec.id)}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>

                  {activeSectionFocus === "header" && (
                    <div className="pf-ai-controls">
                      <label className="field">
                        Họ và tên hiển thị trên CV
                        <input
                          type="text"
                          value={headerFields.fullName}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({ ...prev, fullName: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Vị trí ứng tuyển
                        <input
                          type="text"
                          value={headerFields.targetRole}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({ ...prev, targetRole: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Email liên hệ
                        <input
                          type="text"
                          value={headerFields.email}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Số điện thoại
                        <input
                          type="text"
                          value={headerFields.phone}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Lớp &amp; Khoa
                        <input
                          type="text"
                          value={headerFields.classAndDept}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({ ...prev, classAndDept: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        GitHub / Khu vực
                        <input
                          type="text"
                          value={headerFields.githubPortfolio}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({
                              ...prev,
                              githubPortfolio: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="field">
                        Chỉ số GPA góc phải
                        <input
                          type="text"
                          value={headerFields.gpaBadge}
                          onChange={(e) =>
                            setHeaderFields((prev) => ({ ...prev, gpaBadge: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                  )}

                  {activeSectionFocus === "objective" && (
                    <div className="pf-ai-controls">
                      <label className="field">
                        Tiêu đề mục
                        <input
                          type="text"
                          value={sectionTitles.objective}
                          onChange={(e) =>
                            setSectionTitles((prev) => ({ ...prev, objective: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Nội dung Mục tiêu nghề nghiệp
                        <textarea
                          rows={6}
                          value={currentCareerObjective}
                          onChange={(e) => setCareerObjectiveText(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="button button-primary button-sm cv-full-btn"
                        onClick={() => void rewriteObjectiveWithAi()}
                        disabled={aiGenerating}
                      >
                        <Icon name="retry" />
                        <span>{aiGenerating ? "Đang biên tập" : "Viết lại Mục tiêu nghề nghiệp"}</span>
                      </button>
                    </div>
                  )}

                  {activeSectionFocus === "education" && (
                    <div className="pf-ai-controls">
                      <label className="field">
                        Tiêu đề mục Học vấn
                        <input
                          type="text"
                          value={sectionTitles.education}
                          onChange={(e) =>
                            setSectionTitles((prev) => ({ ...prev, education: e.target.value }))
                          }
                        />
                      </label>
                      <p className="pf-ai-desc">
                        Chọn các học phần điểm cao từ bảng điểm SDU để hiển thị trong mục Học vấn
                      </p>
                      <div className="cv-collected-course-list">
                        {allScoredCourses.map((course) => {
                          const checked = selectedCourseCodes.includes(course.code);
                          return (
                            <button
                              key={course.code}
                              type="button"
                              className={`cv-collected-course-chip${checked ? " is-selected" : ""}`}
                              onClick={() => toggleCourseInCv(course.code)}
                            >
                              <span className="cv-course-check" aria-hidden="true">
                                <Icon name={checked ? "check" : "plus"} />
                              </span>
                              <div className="cv-course-chip-body">
                                <strong>
                                  <code>{course.code}</code> {course.name}
                                </strong>
                                <small>{course.termName}</small>
                              </div>
                              <b className="cv-course-score-badge">{course.score10.toFixed(1)}</b>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeSectionFocus === "projects" && (
                    <div className="pf-ai-controls">
                      <div className="cv-subhead-row">
                        <strong>Danh sách Dự án ({cvProjects.length})</strong>
                        <button
                          type="button"
                          className="cv-tool-mini"
                          onClick={() =>
                            setCvProjects((prev) => [
                              ...prev,
                              {
                                id: `proj-custom-${Date.now()}`,
                                title: "Dự án mới",
                                courseCode: "SDU-PRJ",
                                semester: semester.short,
                                role: "Fullstack Developer",
                                score: "9.0 / 10",
                                summary: "Mô tả giải pháp kỹ thuật và kết quả định lượng",
                                techStack: "TypeScript · React · PostgreSQL",
                                artifactUrl: "",
                              },
                            ])
                          }
                        >
                          <Icon name="plus" />
                          <span>Thêm dự án</span>
                        </button>
                      </div>
                      {cvProjects.map((proj, idx) => (
                        <div key={proj.id} className="cv-left-item-editor">
                          <div className="cv-subhead-row">
                            <code>Dự án #{idx + 1}</code>
                            <button
                              type="button"
                              className="cv-tool-mini"
                              onClick={() => void rewriteProjectWithAi(idx)}
                              disabled={aiGenerating}
                            >
                              <Icon name="retry" />
                              <span>Chuẩn hóa STAR</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) =>
                              setCvProjects((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, title: e.target.value } : p,
                                ),
                              )
                            }
                            placeholder="Tên dự án"
                          />
                          <input
                            type="text"
                            value={proj.role}
                            onChange={(e) =>
                              setCvProjects((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, role: e.target.value } : p,
                                ),
                              )
                            }
                            placeholder="Vai trò"
                          />
                          <textarea
                            rows={3}
                            value={proj.summary}
                            onChange={(e) =>
                              setCvProjects((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, summary: e.target.value } : p,
                                ),
                              )
                            }
                            placeholder="Mô tả dự án"
                          />
                          <input
                            type="text"
                            value={proj.techStack}
                            onChange={(e) =>
                              setCvProjects((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, techStack: e.target.value } : p,
                                ),
                              )
                            }
                            placeholder="Công nghệ"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSectionFocus === "skills" && (
                    <div className="pf-ai-controls">
                      <div className="cv-subhead-row">
                        <strong>Nhóm Kỹ năng ({cvSkillGroups.length})</strong>
                        <button
                          type="button"
                          className="cv-tool-mini"
                          onClick={() =>
                            setCvSkillGroups((prev) => [
                              ...prev,
                              {
                                id: `sk-${Date.now()}`,
                                group: "Nhóm kỹ năng mới",
                                items: "Kỹ năng A, Kỹ năng B",
                              },
                            ])
                          }
                        >
                          <Icon name="plus" />
                          <span>Thêm nhóm</span>
                        </button>
                      </div>
                      {cvSkillGroups.map((group, idx) => (
                        <div key={group.id} className="cv-left-item-editor">
                          <input
                            type="text"
                            value={group.group}
                            onChange={(e) =>
                              setCvSkillGroups((prev) =>
                                prev.map((g, i) =>
                                  i === idx ? { ...g, group: e.target.value } : g,
                                ),
                              )
                            }
                            placeholder="Tên nhóm kỹ năng"
                          />
                          <textarea
                            rows={2}
                            value={group.items}
                            onChange={(e) =>
                              setCvSkillGroups((prev) =>
                                prev.map((g, i) =>
                                  i === idx ? { ...g, items: e.target.value } : g,
                                ),
                              )
                            }
                            placeholder="Các kỹ năng (phân cách bằng dấu phẩy)"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSectionFocus === "certs" && (
                    <div className="pf-ai-controls">
                      <div className="cv-subhead-row">
                        <strong>Chứng chỉ &amp; Minh chứng ({cvCerts.length})</strong>
                        <button
                          type="button"
                          className="cv-tool-mini"
                          onClick={() =>
                            setCvCerts((prev) => [
                              ...prev,
                              {
                                id: `cert-${Date.now()}`,
                                title: "Chứng chỉ mới",
                                detail: "Chi tiết chứng chỉ",
                              },
                            ])
                          }
                        >
                          <Icon name="plus" />
                          <span>Thêm dòng</span>
                        </button>
                      </div>
                      {cvCerts.map((cert, idx) => (
                        <div key={cert.id} className="cv-left-item-editor">
                          <input
                            type="text"
                            value={cert.title}
                            onChange={(e) =>
                              setCvCerts((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, title: e.target.value } : c,
                                ),
                              )
                            }
                          />
                          <input
                            type="text"
                            value={cert.detail}
                            onChange={(e) =>
                              setCvCerts((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, detail: e.target.value } : c,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSectionFocus === "activities" && (
                    <div className="pf-ai-controls">
                      <div className="cv-subhead-row">
                        <strong>Hoạt động &amp; Rèn luyện ({cvActivities.length})</strong>
                        <button
                          type="button"
                          className="cv-tool-mini"
                          onClick={() =>
                            setCvActivities((prev) => [
                              ...prev,
                              {
                                id: `act-${Date.now()}`,
                                title: "Hoạt động mới",
                                detail: "Vai trò & Thời gian",
                              },
                            ])
                          }
                        >
                          <Icon name="plus" />
                          <span>Thêm dòng</span>
                        </button>
                      </div>
                      {cvActivities.map((act, idx) => (
                        <div key={act.id} className="cv-left-item-editor">
                          <input
                            type="text"
                            value={act.title}
                            onChange={(e) =>
                              setCvActivities((prev) =>
                                prev.map((a, i) =>
                                  i === idx ? { ...a, title: e.target.value } : a,
                                ),
                              )
                            }
                          />
                          <input
                            type="text"
                            value={act.detail}
                            onChange={(e) =>
                              setCvActivities((prev) =>
                                prev.map((a, i) =>
                                  i === idx ? { ...a, detail: e.target.value } : a,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SECTIONS ORDER & TEMPLATES */}
              {leftTab === "sections" && (
                <div className="cv-drawer-pane">
                  <header className="cv-drawer-head">
                    <div>
                      <span className="pf-section-eyebrow">Cấu trúc trang A4</span>
                      <h3>Thứ tự mục &amp; mẫu trình bày</h3>
                    </div>
                  </header>

                  <div className="cv-drawer-group">
                    <span className="cv-group-label">Thứ tự và hiển thị các mục trên CV</span>
                    <div className="cv-section-manager-list">
                      {sectionOrder.map((secId, idx) => {
                        const isHidden = hiddenSections[secId];
                        return (
                          <div
                            key={secId}
                            className={`cv-sec-row${isHidden ? " is-muted" : ""}`}
                          >
                            <div className="cv-sec-row-top">
                              <code>{idx + 1}</code>
                              <input
                                type="text"
                                value={sectionTitles[secId]}
                                onChange={(e) =>
                                  setSectionTitles((prev) => ({
                                    ...prev,
                                    [secId]: e.target.value,
                                  }))
                                }
                                aria-label={`Đổi tên mục ${secId}`}
                              />
                            </div>
                            <div className="cv-sec-row-actions">
                              <button
                                type="button"
                                className="cv-tool-mini"
                                onClick={() => moveSection(secId, -1)}
                                disabled={idx === 0}
                              >
                                <span>Lên</span>
                              </button>
                              <button
                                type="button"
                                className="cv-tool-mini"
                                onClick={() => moveSection(secId, 1)}
                                disabled={idx === sectionOrder.length - 1}
                              >
                                <span>Xuống</span>
                              </button>
                              <button
                                type="button"
                                className="cv-tool-mini"
                                onClick={() => toggleSectionVisibility(secId)}
                              >
                                <span>{isHidden ? "Hiện lại" : "Ẩn mục"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cv-drawer-group">
                    <span className="cv-group-label">Tùy chỉnh hiển thị trang giấy</span>
                    <div className="pf-ai-controls">
                      <label className="field">
                        Độ thoáng dòng
                        <select
                          value={density}
                          onChange={(e) => setDensity(e.target.value as CvDensityId)}
                        >
                          <option value="compact">Mật độ gọn</option>
                          <option value="normal">Mật độ chuẩn</option>
                          <option value="airy">Mật độ thoáng</option>
                        </select>
                      </label>
                      <label className="field">
                        Khung ảnh đại diện
                        <select
                          value={avatarShape}
                          onChange={(e) => setAvatarShape(e.target.value as CvAvatarShapeId)}
                        >
                          <option value="rounded">Ảnh bo góc</option>
                          <option value="circle">Ảnh tròn</option>
                          <option value="square">Ảnh vuông</option>
                          <option value="hidden">Ẩn ảnh (ATS)</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="cv-drawer-group">
                    <span className="cv-group-label">Mẫu bố cục trang A4</span>
                    <div className="cv-vertical-cards">
                      {cvLayoutStyles.map((style) => {
                        const active = cvStyleId === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            className={`pf-style-card${active ? " is-active" : ""}`}
                            onClick={() => selectCvLayout(style)}
                          >
                            <div className="pf-style-card-top">
                              <strong>{style.name}</strong>
                              <code>{style.tag}</code>
                            </div>
                            <p>{style.summary}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ROLE SUGGESTIONS & REWRITE */}
              {leftTab === "ai" && (
                <div className="cv-drawer-pane">
                  <header className="cv-drawer-head">
                    <div>
                      <span className="pf-section-eyebrow">Phân tích theo vị trí</span>
                      <h3>Gợi ý hoàn thiện hồ sơ</h3>
                    </div>
                    <Link href={"/student/ai" as Route} className="pf-rank-tag">
                      Hỏi cố vấn
                    </Link>
                  </header>

                  <div className="pf-ai-controls">
                    <label className="field">
                      Doanh nghiệp hoặc yêu cầu tuyển dụng cụ thể
                      <input
                        type="text"
                        value={customCompanyHint}
                        onChange={(e) => setCustomCompanyHint(e.target.value)}
                        placeholder="Ví dụ: FPT Software, Viettel"
                      />
                    </label>

                    <label className="field">
                      Trọng tâm đoạn Mục tiêu nghề nghiệp
                      <select
                        value={aiFocus}
                        onChange={(e) => setAiFocus(e.target.value as typeof aiFocus)}
                      >
                        <option value="ats">Chuẩn ATS (Ngắn gọn, súc tích)</option>
                        <option value="project">Nhấn mạnh đồ án &amp; chỉ số định lượng</option>
                        <option value="intern">Kỷ luật phòng Lab &amp; cam kết thực tập</option>
                        <option value="fresher">Định hướng phát triển Kỹ sư chính thức</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className="button button-primary button-sm cv-full-btn"
                      onClick={() => void runAiAutoArrangeAndFillAll()}
                      disabled={aiSortingAndFilling || aiGenerating}
                    >
                      <span>
                        {aiSortingAndFilling ? "Đang cập nhật hồ sơ" : "Tự động điền theo vị trí"}
                      </span>
                    </button>

                    {aiStatusText && <p className="pf-ai-note">{aiStatusText}</p>}
                  </div>

                  <div className="cv-ai-suggestions-box">
                    <div className="cv-subhead-row">
                      <strong>Khuyến nghị cho {selectedTrack.shortLabel}</strong>
                      <span>{aiSuggestions.length} mục</span>
                    </div>
                    <p className="cv-recruiter-note">{formattedRecruiterVerdict}</p>
                    <div className="cv-suggestion-list">
                      {aiSuggestions.map((sug) => (
                        <article
                          key={sug.id}
                          className={`cv-suggestion-card${sug.applied ? " is-applied" : ""}`}
                        >
                          <div className="cv-sug-top">
                            <strong>{sug.title}</strong>
                            <span className="cv-sug-badge">
                              {sug.applied ? "Đã áp dụng" : "Khuyến nghị"}
                            </span>
                          </div>
                          <p>{sug.reason}</p>
                          <button
                            type="button"
                            className="pf-inline-link"
                            onClick={() => applyAiSuggestion(sug)}
                          >
                            <span>{sug.applied ? "Áp dụng lại" : sug.actionLabel}</span>
                            <Icon name="arrow" />
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ADMINISTRATIVE SDU FORMS */}
              {leftTab === "forms" && (
                <div className="cv-drawer-pane">
                  <header className="cv-drawer-head">
                    <div>
                      <span className="pf-section-eyebrow">Biểu mẫu hành chính SDU</span>
                      <h3>Trích xuất hồ sơ trường</h3>
                    </div>
                  </header>

                  <div className="cv-vertical-cards">
                    {baseTemplates.map((tpl) => {
                      const active = tpl.id === activeTemplate.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          className={`pf-style-card${active ? " is-active" : ""}`}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                        >
                          <div className="pf-style-card-top">
                            <strong>{tpl.title}</strong>
                            <code>{tpl.code}</code>
                          </div>
                          <p>{tpl.recipient}</p>
                        </button>
                      );
                    })}
                  </div>

                  <form className="pf-ai-controls" onSubmit={dispatchFormSubmit}>
                    {activeTemplate.fields.map((field) => {
                      const val = activeDraftValues[field.key] ?? "";
                      return (
                        <label key={field.key} className="field">
                          <span>{field.label}</span>
                          {field.multiline ? (
                            <textarea
                              rows={3}
                              value={val}
                              onChange={(e) => updateDraftField(field.key, e.target.value)}
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => updateDraftField(field.key, e.target.value)}
                            />
                          )}
                        </label>
                      );
                    })}
                    <div className="cv-ai-quick-btns">
                      <button
                        type="button"
                        className="pf-export-btn"
                        onClick={() => resetTemplateDraft(activeTemplate.id)}
                      >
                        Khôi phục gốc
                      </button>
                      <button
                        type="button"
                        className="pf-export-btn"
                        onClick={() => exportTemplateAsWordDoc(activeTemplate)}
                      >
                        Xuất Word
                      </button>
                    </div>
                    <button type="submit" className="button button-primary button-sm cv-full-btn">
                      <Icon name="send" />
                      <span>Gửi biểu mẫu {activeTemplate.code}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* 2B. Large Interactive A4 Canvas Viewport */}
        <section
          ref={canvasViewportRef}
          className="cv-studio-canvas-viewport"
          aria-label="Bàn giấy biên tập CV khổ A4"
        >
          <div className="cv-canvas-hud">
            <div className="cv-canvas-hud-left">
              <button
                type="button"
                className="cv-hud-chip"
                onClick={() => setLeftCollapsed((c) => !c)}
                title="Đóng hoặc mở bảng công cụ bên trái"
              >
                <Icon name="panel" />
                <span>{leftCollapsed ? "Mở bảng biên tập" : "Thu gọn bảng trái"}</span>
              </button>
              <span className="cv-hud-meta">
                Khổ chuẩn <strong>A4 (210 × 297 mm)</strong> · Mã SV{" "}
                <code>{account.code}</code>
              </span>
            </div>
            <div className="cv-canvas-hud-right">
              <span className="cv-hud-hint">
                Nhấp trực tiếp vào từng mục trên trang giấy để chỉnh sửa
              </span>
            </div>
          </div>

          <div className="cv-canvas-stage-scroll">
            <article
              className={`pf-cv-sheet cv-sheet-a4 is-layout-${cvStyleId} is-font-${fontPair} is-density-${density}`}
              style={artboardCssVars}
              aria-label="Trang giấy CV A4 tương tác trực tiếp"
            >
              <header
                className={`pf-cv-header cv-editable-block${activeSectionFocus === "header" ? " is-selected" : ""}`}
                onClick={() => focusSectionInEditor("header")}
              >
                <div className="pf-dossier-identity">
                  {avatarShape !== "hidden" && (
                    <div className={`pf-dossier-avatar is-shape-${avatarShape}`}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={`Ảnh đại diện của ${headerFields.fullName}`}
                        />
                      ) : (
                        <span>{initials(headerFields.fullName)}</span>
                      )}
                    </div>
                  )}
                  <div className="pf-dossier-meta">
                    <span className="pf-record-id">
                      <span className="pf-seal-dot" aria-hidden="true" />
                      <span>Hồ sơ xác thực ĐH Sao Đỏ · Mã</span>{" "}
                      <code>22SDU.CNTT.{studentIdentity.code.slice(-4)}</code>
                    </span>
                    <input
                      type="text"
                      className="cv-header-name-input"
                      value={headerFields.fullName}
                      onChange={(e) =>
                        setHeaderFields((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      aria-label="Họ và tên trên CV"
                    />
                    <input
                      type="text"
                      className="cv-header-role-input"
                      value={headerFields.targetRole}
                      onChange={(e) =>
                        setHeaderFields((prev) => ({ ...prev, targetRole: e.target.value }))
                      }
                      aria-label="Vị trí ứng tuyển trên CV"
                    />
                  </div>
                </div>

                <div className="pf-score-stamp">
                  <span className="pf-score-label">GPA tích lũy xác thực</span>
                  <input
                    type="text"
                    className="cv-stamp-gpa-input"
                    value={headerFields.gpaBadge}
                    onChange={(e) =>
                      setHeaderFields((prev) => ({ ...prev, gpaBadge: e.target.value }))
                    }
                    aria-label="GPA hiển thị trên CV"
                  />
                  <span className="pf-score-delta">{headerFields.standingBadge}</span>
                </div>
              </header>

              <dl
                className="pf-cv-contact"
                onClick={() => focusSectionInEditor("header")}
              >
                <div>
                  <dt>Email</dt>
                  <dd>
                    <input
                      type="text"
                      className="cv-contact-input"
                      value={headerFields.email}
                      onChange={(e) =>
                        setHeaderFields((prev) => ({ ...prev, email: e.target.value }))
                      }
                      aria-label="Email liên hệ"
                    />
                  </dd>
                </div>
                <div>
                  <dt>Điện thoại</dt>
                  <dd>
                    <input
                      type="text"
                      className="cv-contact-input"
                      value={headerFields.phone}
                      onChange={(e) =>
                        setHeaderFields((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      aria-label="Số điện thoại"
                    />
                  </dd>
                </div>
                <div>
                  <dt>Lớp &amp; Khoa</dt>
                  <dd>
                    <input
                      type="text"
                      className="cv-contact-input"
                      value={headerFields.classAndDept}
                      onChange={(e) =>
                        setHeaderFields((prev) => ({
                          ...prev,
                          classAndDept: e.target.value,
                        }))
                      }
                      aria-label="Lớp và Khoa"
                    />
                  </dd>
                </div>
                <div>
                  <dt>GitHub / Khu vực</dt>
                  <dd>
                    <input
                      type="text"
                      className="cv-contact-input"
                      value={headerFields.githubPortfolio}
                      onChange={(e) =>
                        setHeaderFields((prev) => ({
                          ...prev,
                          githubPortfolio: e.target.value,
                        }))
                      }
                      aria-label="Link GitHub hoặc địa điểm"
                    />
                  </dd>
                </div>
              </dl>

              {cvStyleId === "modern-split" ? (
                <div className="pf-cv-body-grid">
                  <div className="pf-cv-side-col">
                    {sectionOrder
                      .filter((id) => leftSidebarSections.includes(id))
                      .map((id) => renderCvSectionBlock(id))}
                  </div>
                  <div className="pf-cv-main-col">
                    {sectionOrder
                      .filter((id) => !leftSidebarSections.includes(id))
                      .map((id) => renderCvSectionBlock(id))}
                  </div>
                </div>
              ) : (
                <div className="pf-cv-body-grid">
                  <div className="pf-cv-main-col">
                    {sectionOrder.map((id) => renderCvSectionBlock(id))}
                  </div>
                </div>
              )}

              <footer className="pf-quick-export-bar">
                <span className="pf-quick-export-label">
                  Dữ liệu đối chiếu từ Cổng đào tạo ĐH Sao Đỏ · Chuyên cần Lab {attendancePct}% · Điểm rèn luyện {conduct.score}/100
                </span>
                <div className="pf-export-links">
                  <button
                    type="button"
                    className="pf-export-btn"
                    onClick={syncAllStudentDataToCanvas}
                  >
                    Đồng bộ lại
                  </button>
                  <button
                    type="button"
                    className="pf-export-btn"
                    onClick={exportLiveCvToWordDoc}
                  >
                    Xuất Word
                  </button>
                  <button
                    type="button"
                    className="pf-export-btn"
                    onClick={exportLiveCvToPdfA4}
                  >
                    In PDF A4
                  </button>
                </div>
              </footer>
            </article>
          </div>
        </section>
      </div>

      {/* ====================================================================
          DEDICATED A4 PRINT / PDF SHEET (VISIBLE ONLY IN @media print)
          ==================================================================== */}
      <article
        className={`cv-print-only-sheet is-layout-${cvStyleId} is-font-${fontPair}`}
        style={{ "--cv-accent": accentColor } as CSSProperties}
        aria-hidden="true"
      >
        <header className="cv-print-header">
          <div className="cv-print-identity">
            {avatarShape !== "hidden" && (
              <div className={`pf-dossier-avatar is-shape-${avatarShape}`}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`Ảnh đại diện của ${headerFields.fullName}`}
                  />
                ) : (
                  <span>{initials(headerFields.fullName)}</span>
                )}
              </div>
            )}
            <div className="cv-print-title-block">
              <span className="cv-print-meta-code">
                Hồ sơ xác thực ĐH Sao Đỏ · Mã{" "}
                <code>22SDU.CNTT.{studentIdentity.code.slice(-4)}</code>
              </span>
              <h1>{headerFields.fullName}</h1>
              <p className="cv-print-role">{headerFields.targetRole}</p>
            </div>
          </div>
          <div className="cv-print-gpa-box">
            <span>GPA tích lũy xác thực</span>
            <strong>{headerFields.gpaBadge}</strong>
            <small>{headerFields.standingBadge}</small>
          </div>
        </header>

        <dl className="cv-print-contact-grid">
          <div>
            <dt>Email</dt>
            <dd>{headerFields.email}</dd>
          </div>
          <div>
            <dt>Điện thoại</dt>
            <dd>{headerFields.phone}</dd>
          </div>
          <div>
            <dt>Lớp &amp; Khoa</dt>
            <dd>{headerFields.classAndDept}</dd>
          </div>
          <div>
            <dt>GitHub / Khu vực</dt>
            <dd>{headerFields.githubPortfolio}</dd>
          </div>
        </dl>

        {cvStyleId === "modern-split" ? (
          <div className="cv-print-body-split">
            <div className="cv-print-col-side">
              {sectionOrder
                .filter((id) => leftSidebarSections.includes(id))
                .map((id) => renderPrintSectionBlock(id))}
            </div>
            <div className="cv-print-col-main">
              {sectionOrder
                .filter((id) => !leftSidebarSections.includes(id))
                .map((id) => renderPrintSectionBlock(id))}
            </div>
          </div>
        ) : (
          <div className="cv-print-body-single">
            {sectionOrder.map((id) => renderPrintSectionBlock(id))}
          </div>
        )}
      </article>
    </div>
  );
}
