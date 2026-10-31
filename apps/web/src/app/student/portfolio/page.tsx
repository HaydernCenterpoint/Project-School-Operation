"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, FormEvent, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import { streamChat } from "@/lib/ai-client";
import { initials } from "@/lib/format";
import {
  attendanceRecords,
  buildEditableDossierTemplates,
  clubs,
  conduct,
  courses,
  gpa,
  initialClubs,
  initialProfileUpdates,
  objectiveObservations,
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
   Canva-style AI CV Studio Types & Presets
   ========================================================================== */

type CvLayoutStyleId = "modern-split" | "harvard" | "impressive" | "minimal";

type CvLayoutStyle = {
  id: CvLayoutStyleId;
  name: string;
  tag: string;
  summary: string;
  defaultAccent: string;
};

const cvLayoutStyles: CvLayoutStyle[] = [
  {
    id: "modern-split",
    name: "Mẫu Chuyên nghiệp 2 Cột",
    tag: "Chuẩn TopCV & Canva",
    summary: "Cột trái hiển thị kỹ năng, chứng chỉ, ngoại ngữ; cột phải trình bày mục tiêu, học vấn và dự án.",
    defaultAccent: "#c81d2e",
  },
  {
    id: "harvard",
    name: "Mẫu Harvard / Chuẩn ATS",
    tag: "Tối ưu lọc CV tự động",
    summary: "Bố cục 1 cột cổ điển, đường kẻ phân mục chuẩn quốc tế, dễ đọc với hệ thống ATS tập đoàn & ngân hàng.",
    defaultAccent: "#1f2937",
  },
  {
    id: "impressive",
    name: "Mẫu Ấn tượng / Tech Portfolio",
    tag: "Nổi bật dự án & chỉ số",
    summary: "Header đóng khung chỉ số học thuật (GPA, truy vấn SQL, điểm Lab), làm nổi bật dự án công nghệ.",
    defaultAccent: "#0f4c81",
  },
  {
    id: "minimal",
    name: "Mẫu Đơn giản / Tinh gọn",
    tag: "Gọn 1 trang A4",
    summary: "Thiết kế tối giản khoảng trắng thoáng, ưu tiên mục tiêu nghề nghiệp và học phần cốt lõi đạt điểm A.",
    defaultAccent: "#2d6a4f",
  },
];

type CvFontPairId = "sans" | "serif" | "mono-tech";
type CvAvatarShapeId = "rounded" | "circle" | "square" | "hidden";
type CvDensityId = "compact" | "normal" | "airy";
type CvSectionId = "objective" | "education" | "projects" | "skills" | "certs" | "activities";

type StudioDockTabId = "ai" | "templates" | "design" | "sections" | "data";

type CvColorSwatch = {
  id: string;
  label: string;
  hex: string;
};

const cvColorSwatches: CvColorSwatch[] = [
  { id: "sdu-crimson", label: "Đỏ Sao Đỏ", hex: "#c81d2e" },
  { id: "navy-tech", label: "Xanh Navy Tech", hex: "#0f4c81" },
  { id: "forest-exec", label: "Xanh Rừng Đậm", hex: "#2d6a4f" },
  { id: "slate-ats", label: "Than Chì ATS", hex: "#1f2937" },
  { id: "indigo-modern", label: "Tím Indigo", hex: "#4338ca" },
  { id: "terracotta", label: "Nâu Đồng", hex: "#9a3412" },
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
    shortLabel: "Lập trình viên Backend / Web",
    roleTitle: "Thực tập sinh Lập trình viên Backend / Fullstack Web",
    companyType: "Công ty Sản phẩm công nghệ & Phần mềm",
    recommendedLayout: "modern-split",
    recommendedOrder: ["objective", "projects", "education", "skills", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 chuyên ngành Công nghệ phần mềm tại Trường Đại học Sao Đỏ (GPA 3.22/4.0, thuộc Top 18% lớp DK13-CNTT1) ứng tuyển vị trí Thực tập sinh Lập trình viên Backend / Fullstack. Có nền tảng vững về Lập trình hướng đối tượng (IT3040 - 9.2/10), Cấu trúc dữ liệu & Giải thuật (Điểm A) và Thiết kế CSDL chuẩn 3NF (IT3090 - 9.0/10). Mong muốn vận dụng kỹ năng TypeScript, SQL và kiểm thử tự động vào dự án thực tế tại doanh nghiệp, hướng tới vị trí Kỹ sư phần mềm chính thức sau kỳ thực tập.",
    recruiterVerdict:
      "Hồ sơ vượt vòng lọc CV tự động nhờ GPA 3.22/4.0, điểm A môn Cấu trúc dữ liệu & Giải thuật (8.5) và 2 đồ án OOP/CSDL đạt 9.0+. AI khuyến nghị đẩy mục Dự án thực tế lên ngay dưới Mục tiêu nghề nghiệp.",
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
        actionLabel: "Tự động sắp xếp lại bố cục",
        payload: {
          newSectionOrder: ["objective", "projects", "education", "skills", "certs", "activities"],
        },
      },
      {
        id: "sug-fs-star",
        category: "project",
        title: "Viết lại mô tả Đồ án theo công thức định lượng STAR",
        reason: "Nhấn mạnh con số 2.400 đầu sách, 14 bảng chuẩn 3NF và thời gian phản hồi truy vấn < 8ms.",
        actionLabel: "Áp dụng mô tả chuẩn STAR",
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
        title: "Bổ sung liên kết GitHub & Live Demo công khai",
        reason: "Dữ liệu trường cho thấy 2 đồ án đạt điểm A nhưng trên CV chưa gắn đường dẫn mã nguồn để Tech Lead kiểm tra.",
        actionLabel: "Điền mẫu GitHub chuẩn SDU",
        payload: {
          fillGithubDemo: "github.com/khanhlinh-sdu/sdu-digital-library",
        },
      },
    ],
  },
  {
    id: "role-qa",
    sector: "CNTT & Phần mềm",
    shortLabel: "Kiểm thử phần mềm (QA / Tester)",
    roleTitle: "Thực tập sinh Kiểm thử phần mềm (Manual / Automation QA)",
    companyType: "Doanh nghiệp Gia công & Phát triển Phần mềm",
    recommendedLayout: "harvard",
    recommendedOrder: ["objective", "education", "projects", "skills", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, tỷ lệ chuyên cần phòng Lab đạt 97.5%) ứng tuyển vị trí Thực tập sinh QA / Tester. Đã thực hành thiết kế 18 ca kiểm thử biên (Boundary Value Analysis), kiểm thử tích hợp và truy vấn SQL đối soát dữ liệu trên CSDL 14 bảng chuẩn 3NF. Mong muốn đóng góp tính cẩn thận, tư duy bắt lỗi hệ thống và khả năng đọc tài liệu tiếng Anh (8.9/10) vào quy trình đảm bảo chất lượng phần mềm.",
    recruiterVerdict:
      "Tỷ lệ chuyên cần Lab 97.5% và kinh nghiệm viết 18 Unit/Boundary Test trong đồ án OOP là minh chứng rất thuyết phục cho vị trí QA/Tester.",
    cvSkills: [
      { group: "Kiểm thử & Đảm bảo chất lượng", items: ["Test Case Design (BVA, EP)", "Bug Life Cycle & Checklist", "Unit Test & Regression Test"] },
      { group: "Cơ sở dữ liệu & Kỹ thuật", items: ["SQL Truy vấn đối soát dữ liệu", "Đọc hiểu ERD 3NF", "Kiểm thử API (Postman)", "Git cơ bản"] },
      { group: "Ngoại ngữ & Thái độ", items: ["Tiếng Anh đọc hiểu tài liệu (8.9/10)", "Chuyên cần Lab 97.5%", "Tỉ mỉ, ghi nhận log chuẩn xác"] },
    ],
    aiSuggestions: [
      {
        id: "sug-qa-layout",
        category: "layout",
        title: "Chuyển sang Mẫu Harvard / Chuẩn ATS 1 cột",
        reason: "Các công ty Outsourcing/QA ưu tiên CV 1 cột chuẩn mực, trình bày rõ quy trình kiểm thử và độ chính xác.",
        actionLabel: "Áp dụng Mẫu Harvard ATS",
        payload: {
          newLayout: "harvard",
          newSectionOrder: ["objective", "education", "projects", "skills", "certs", "activities"],
        },
      },
      {
        id: "sug-qa-skill",
        category: "skill",
        title: "Thêm nhóm kỹ năng Thiết kế Test Case & Truy vấn SQL",
        reason: "Nổi bật hóa 18 test case biên từ môn IT3040 và khả năng kiểm tra dữ liệu bằng SQL.",
        actionLabel: "Thêm vào mục Kỹ năng",
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
    shortLabel: "Business Analyst (BA Intern)",
    roleTitle: "Thực tập sinh Phân tích nghiệp vụ (IT Business Analyst)",
    companyType: "Khối Ngân hàng, Tài chính, ERP & Chuyển đổi số",
    recommendedLayout: "harvard",
    recommendedOrder: ["objective", "education", "projects", "activities", "skills", "certs"],
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, Tiếng Anh 2 đạt 8.9/10 - Điểm A) ứng tuyển vị trí IT Business Analyst Intern. Có kinh nghiệm khảo sát nghiệp vụ, chuẩn hóa lược đồ quan hệ 14 bảng đạt chuẩn 3NF (9.0/10) và điều phối hoạt động câu lạc bộ học thuật (Điểm rèn luyện 86/100). Mong muốn kết nối giữa yêu cầu người dùng và đội ngũ kỹ thuật thông qua tài liệu SRS, Use Case và mô hình hóa quy trình.",
    recruiterVerdict:
      "Phù hợp cao với vị trí BA nhờ điểm Tiếng Anh 2 đạt 8.9 (A), điểm CSDL 9.0 và kỹ năng giao tiếp/tổ chức sự kiện tại CLB Tin học.",
    cvSkills: [
      { group: "Phân tích & Thiết kế hệ thống", items: ["Mô hình hóa ERD & Chuẩn hóa 3NF", "Use Case & Activity Diagram", "Đặc tả yêu cầu phần mềm (SRS)"] },
      { group: "Truy vấn & Công cụ", items: ["SQL phân tích nghiệp vụ", "Figma / Draw.io Wireframe", "Quản lý tài liệu dự án"] },
      { group: "Ngoại ngữ & Giao tiếp", items: ["Tiếng Anh B1 (Điểm A - 8.9)", "Thuyết trình & Điều phối CLB", "Phỏng vấn yêu cầu người dùng"] },
    ],
    aiSuggestions: [
      {
        id: "sug-ba-order",
        category: "layout",
        title: "Đẩy mục Hoạt động CLB & Học vấn lên cao",
        reason: "Vị trí BA đánh giá cao khả năng giao tiếp, điều phối sự kiện CLB Tin học và điểm Tiếng Anh 8.9.",
        actionLabel: "Sắp xếp bố cục chuẩn BA",
        payload: {
          newSectionOrder: ["objective", "education", "projects", "activities", "skills", "certs"],
        },
      },
    ],
  },
  {
    id: "role-data",
    sector: "Dữ liệu & AI",
    shortLabel: "Phân tích dữ liệu (Data / SQL)",
    roleTitle: "Thực tập sinh Phân tích dữ liệu & Cơ sở dữ liệu (Data / SQL Intern)",
    companyType: "Doanh nghiệp Thương mại điện tử, Fintech & AI",
    recommendedLayout: "impressive",
    recommendedOrder: ["objective", "projects", "skills", "education", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 chuyên ngành Công nghệ phần mềm Trường Đại học Sao Đỏ (GPA 3.22/4.0) ứng tuyển vị trí Thực tập sinh Phân tích dữ liệu (Data / SQL Intern). Đạt 9.0/10 đồ án Cơ sở dữ liệu với 25 truy vấn thống kê phức tạp, tối ưu chỉ mục B-Tree giúp giảm thời gian phản hồi xuống dưới 8ms và đạt điểm A môn Cấu trúc dữ liệu & Giải thuật (8.5). Mong muốn phát triển kỹ năng xử lý dữ liệu, viết truy vấn SQL hiệu năng cao và xây dựng báo cáo trực quan cho doanh nghiệp.",
    recruiterVerdict:
      "Điểm sáng lớn nhất là đồ án CSDL đạt 9.0/10 (25 truy vấn thống kê, tối ưu B-Tree < 8ms) và giải thuật đạt 8.5 (A).",
    cvSkills: [
      { group: "Cơ sở dữ liệu & Xử lý dữ liệu", items: ["SQL nâng cao (JOIN, Window, CTE)", "Tối ưu B-Tree Index (< 8ms)", "Thiết kế kho dữ liệu 3NF (14 bảng)"] },
      { group: "Lập trình & Thuật toán", items: ["Cấu trúc dữ liệu & Giải thuật (8.5 - A)", "Python / C++ xử lý dữ liệu", "Thống kê & Đại số tuyến tính"] },
      { group: "Báo cáo & Ngoại ngữ", items: ["Trực quan hóa dữ liệu", "Tiếng Anh đọc tài liệu kỹ thuật (8.9)", "Báo cáo phân tích định lượng"] },
    ],
    aiSuggestions: [
      {
        id: "sug-data-layout",
        category: "layout",
        title: "Chọn Mẫu Ấn tượng / Tech Portfolio để làm nổi bật con số < 8ms",
        reason: "Nhà tuyển dụng Data chú ý ngay vào các con số hiệu năng truy vấn SQL và điểm A Giải thuật.",
        actionLabel: "Đổi sang Mẫu Ấn tượng",
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
    shortLabel: "Quản trị mạng / IT Helpdesk",
    roleTitle: "Thực tập sinh Quản trị mạng & Hệ thống (Network / System Admin)",
    companyType: "Khu công nghiệp, Nhà máy sản xuất & Viễn thông",
    recommendedLayout: "modern-split",
    recommendedOrder: ["objective", "skills", "education", "projects", "certs", "activities"],
    defaultObjective:
      "Sinh viên năm 3 Khoa Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, chuyên cần thực hành phòng máy 97.5%) ứng tuyển vị trí Thực tập sinh Quản trị mạng & Hệ thống IT. Nắm vững kiến trúc Mạng máy tính (TCP/IP, định tuyến VLAN, Wireshark), Hệ điều hành và Quản trị cơ sở dữ liệu. Sẵn sàng làm việc trực tiếp tại doanh nghiệp/nhà máy khu vực Hải Dương, Bắc Ninh, Hà Nội với tinh thần trách nhiệm và kỷ luật cao.",
    recruiterVerdict:
      "Rất phù hợp với các doanh nghiệp FDI và khu công nghiệp quanh Hải Dương – Bắc Ninh – Hà Nội nhờ tính kỷ luật Lab (97.5%).",
    cvSkills: [
      { group: "Hạ tầng mạng & Hệ thống", items: ["TCP/IP, Subnetting, VLAN, Routing", "Phân tích gói tin Wireshark", "Quản trị Windows Server & Linux"] },
      { group: "Vận hành & Bảo trì dữ liệu", items: ["Sao lưu & Phục hồi CSDL SQL", "Xử lý sự cố phần cứng / mạng LAN", "Bảo mật tài khoản nội bộ"] },
      { group: "Tác phong công nghiệp", items: ["Chuyên cần phòng Lab 97.5%", "Điểm rèn luyện 86/100 (Tốt)", "Tiếng Anh giao tiếp & đọc tài liệu B1"] },
    ],
    aiSuggestions: [
      {
        id: "sug-net-order",
        category: "layout",
        title: "Đưa mục Kỹ năng hệ thống & Chuyên cần lên đầu",
        reason: "Khối nhà máy FDI/Khu công nghiệp cần kiểm tra nhanh kỹ năng mạng LAN/VLAN và tính kỷ luật.",
        actionLabel: "Tối ưu bố cục IT Helpdesk",
        payload: {
          newSectionOrder: ["objective", "skills", "education", "projects", "certs", "activities"],
        },
      },
    ],
  },
  {
    id: "role-sales-eng",
    sector: "Kinh doanh & Tư vấn",
    shortLabel: "Tư vấn giải pháp (Sales IT / EdTech)",
    roleTitle: "Thực tập sinh Tư vấn giải pháp Công nghệ (Technical Sales / Solution)",
    companyType: "Công ty Giải pháp Phần mềm, EdTech & Dịch vụ CNTT",
    recommendedLayout: "modern-split",
    recommendedOrder: ["objective", "activities", "projects", "education", "skills", "certs"],
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin Trường Đại học Sao Đỏ (GPA 3.22/4.0, Tiếng Anh 8.9/10, Điểm rèn luyện 86/100) ứng tuyển vị trí Thực tập sinh Tư vấn giải pháp CNTT. Kết hợp kiến thức nền tảng vững về phần mềm/cơ sở dữ liệu với kỹ năng thuyết trình, tổ chức sự kiện và hỗ trợ sinh viên tại CLB Tin học để tư vấn, demo sản phẩm và chăm sóc khách hàng doanh nghiệp hiệu quả.",
    recruiterVerdict:
      "Lợi thế kép vừa hiểu kỹ thuật phần mềm (GPA 3.22), vừa có điểm Tiếng Anh 8.9 và năng nổ hoạt động CLB.",
    cvSkills: [
      { group: "Tư vấn & Trình diễn giải pháp", items: ["Demo sản phẩm phần mềm Web/App", "Lắng nghe & Phân tích nhu cầu KH", "Soạn thảo tài liệu giới thiệu giải pháp"] },
      { group: "Hiểu biết Kỹ thuật CNTT", items: ["Nền tảng Web, CSDL & Cloud cơ bản", "Phối hợp đội ngũ Dev/QA xử lý yêu cầu", "Hướng dẫn sử dụng phần mềm"] },
      { group: "Ngoại ngữ & Hoạt động", items: ["Tiếng Anh B1 (Điểm A - 8.9/10)", "Thành viên tích cực CLB Tin học", "Giao tiếp & Đàm phán chuyên nghiệp"] },
    ],
    aiSuggestions: [
      {
        id: "sug-sales-order",
        category: "layout",
        title: "Đưa Hoạt động ngoại khóa & Dự án lên trước",
        reason: "Vị trí Sales IT / Solution cần thấy ngay sự năng động, khả năng demo sản phẩm và giao tiếp.",
        actionLabel: "Áp dụng bố cục Sales IT",
        payload: {
          newSectionOrder: ["objective", "activities", "projects", "education", "skills", "certs"],
        },
      },
    ],
  },
];

const defaultSectionLabels: Record<CvSectionId, string> = {
  objective: "Mục tiêu nghề nghiệp",
  education: "Học vấn & Thành tích học thuật",
  projects: "Dự án & Đồ án thực tế",
  skills: "Kỹ năng chuyên môn",
  certs: "Chứng chỉ & Ngoại ngữ",
  activities: "Hoạt động & Giải thưởng",
};

export default function StudentPortfolioPage() {
  const { data, avatarUrl, account } = useStudent();
  const router = useRouter();

  const [, setProposals] = useDemoState<ProfileUpdateProposal[]>(
    "profile-updates",
    () => initialProfileUpdates,
  );
  const [joinedClubs] = useDemoState<string[]>("clubs", () => initialClubs);

  // Compute real student stats
  const allRows = terms.flatMap((t) => t.rows);
  const overallGpa = gpa(allRows);
  const earnedCredits = allRows.reduce((sum, r) => sum + r.credits, 0);
  const standingText = standing(overallGpa.value);

  const totalSessions = attendanceRecords.reduce((sum, r) => sum + r.totalPeriods, 0);
  const attendedSessions = attendanceRecords.reduce((sum, r) => sum + r.attendedPeriods, 0);
  const attendancePct = totalSessions
    ? ((attendedSessions / totalSessions) * 100).toFixed(1)
    : "100.0";

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

  const topCourses = useMemo(
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
        .sort((a, b) => b.score10 - a.score10)
        .slice(0, 5),
    [],
  );

  const joinedClubObjects = clubs.filter((c) => joinedClubs.includes(c.id));

  /* ---------- Canva Studio State ---------- */
  const [dockTab, setDockTab] = useState<StudioDockTabId>("ai");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [cvTitle, setCvTitle] = useState<string>(
    `CV_${account.displayName.replace(/\s+/g, "_")}_Intern`,
  );
  const [cvStyleId, setCvStyleId] = useState<CvLayoutStyleId>("modern-split");
  const [roleTrackId, setRoleTrackId] = useState<string>(jobRoleTracks[0]!.id);
  const [accentColor, setAccentColor] = useState<string>("#c81d2e");
  const [fontPair, setFontPair] = useState<CvFontPairId>("sans");
  const [avatarShape, setAvatarShape] = useState<CvAvatarShapeId>("rounded");
  const [density, setDensity] = useState<CvDensityId>("normal");
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [activeSectionFocus, setActiveSectionFocus] = useState<CvSectionId | null>("objective");

  const selectedTrack =
    jobRoleTracks.find((t) => t.id === roleTrackId) ?? jobRoleTracks[0]!;
  const selectedLayout =
    cvLayoutStyles.find((s) => s.id === cvStyleId) ?? cvLayoutStyles[0]!;

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

  // Editable CV Header & Contact fields on the A4 canvas
  const [headerFields, setHeaderFields] = useState(() => ({
    fullName: account.displayName,
    targetRole: jobRoleTracks[0]!.roleTitle,
    email: account.email,
    phone: account.phone,
    classAndDept: `${account.cohortClass} · ${account.department}`,
    location: "Chí Linh, Hải Dương (Sẵn sàng thực tập Hà Nội / Hải Dương / Bắc Ninh)",
    githubPortfolio: "github.com/sv-saodo/portfolio",
    gpaBadge: `${overallGpa.value.toFixed(2)}/4.0`,
    standingBadge: `Xếp loại ${standingText}`,
  }));

  // Editable Projects on the CV artboard
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
      artifactUrl: "",
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

  // Editable Certificates & Languages
  const [cvCerts, setCvCerts] = useState<EditableCvCertItem[]>([
    {
      id: "cert-1",
      title: "Chuẩn ngoại ngữ Tiếng Anh B1",
      detail: "Tiếng Anh 1 (8.0) · Tiếng Anh 2 (8.9 - Điểm A)",
    },
    {
      id: "cert-2",
      title: `Chuyên cần thực hành Lab ${attendancePct}%`,
      detail: `Có mặt ${attendedSessions}/${totalSessions} buổi thực hành phòng máy`,
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

  // AI Studio controls
  const [aiFocus, setAiFocus] = useState<"ats" | "project" | "intern" | "fresher">("ats");
  const [customCompanyHint, setCustomCompanyHint] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiSortingAndFilling, setAiSortingAndFilling] = useState<boolean>(false);
  const [aiStatusText, setAiStatusText] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionItem[]>(
    () => jobRoleTracks[0]!.aiSuggestions,
  );

  // Bottom Administrative Dossier Form Studio state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(baseTemplates[0]!.id);
  const [customOverrides, setCustomOverrides] = useDemoState<
    Record<string, Record<string, string>>
  >("portfolio-form-drafts-v2", () => ({}));
  const [bannerNotice, setBannerNotice] = useState<string>("");

  const studioRef = useRef<HTMLElement>(null);

  if (!data) return null;

  const accessToken = data.token;

  const activeTemplate: EditableDossierTemplate =
    baseTemplates.find((tpl) => tpl.id === selectedTemplateId) ?? baseTemplates[0]!;

  const activeDraftValues: Record<string, string> = {
    ...Object.fromEntries(activeTemplate.fields.map((f) => [f.key, f.value])),
    ...(customOverrides[activeTemplate.id] ?? {}),
  };

  const currentCareerObjective =
    customOverrides["tpl-internship-cv"]?.objectivePitch ?? selectedTrack.defaultObjective;

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

  /* ---------- Apply Individual AI Suggestion ---------- */
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
    setBannerNotice(`Đã áp dụng đề xuất AI: "${sug.title}" lên trang thiết kế CV.`);
  }

  /* ---------- AI Full Auto-Read, Auto-Arrange & Auto-Fill Engine ---------- */
  async function runAiAutoArrangeAndFillAll() {
    if (aiSortingAndFilling) return;
    setAiSortingAndFilling(true);
    setAiStatusText("AI đang đọc bảng điểm, đồ án Lab, điểm rèn luyện và sắp xếp bố cục CV...");

    // Step 1: Automatically apply best section order & layout for the target role
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

    // Step 2: Stream tailored Career Objective from /api/ai/chat using real student record
    const prompt = [
      `Bạn là chuyên gia thiết kế CV chuẩn TopCV & Canva. Hãy đọc hồ sơ học tập thực tế của sinh viên dưới đây và viết đoạn "Mục tiêu nghề nghiệp" (65-100 từ) thật sắc bén, giàu số liệu định lượng để điền trực tiếp vào CV:`,
      `- Ứng viên: ${studentIdentity.displayName} (${studentIdentity.cohortClass}, ${studentIdentity.department}, Trường Đại học Sao Đỏ).`,
      `- Vị trí ứng tuyển: ${selectedTrack.roleTitle} (${selectedTrack.companyType}).`,
      customCompanyHint.trim() ? `- Doanh nghiệp / JD mục tiêu: ${customCompanyHint.trim()}.` : "",
      `- Dữ liệu học tập thực tế: GPA ${overallGpa.value.toFixed(2)}/4.0 (${standingText}, Top 18%), ${earnedCredits}/${program.requiredCredits} tín chỉ, chuyên cần Lab ${attendancePct}%, điểm rèn luyện ${conduct.score}/100.`,
      `- Học phần & Đồ án nổi bật: Lập trình hướng đối tượng (9.2/10 - Đồ án Quản lý Thư viện 2.400 đầu sách, 18 Unit Test), Cơ sở dữ liệu (9.0/10 - 14 bảng chuẩn 3NF, 25 truy vấn SQL < 8ms), Cấu trúc dữ liệu & Giải thuật (8.5 - Điểm A), Tiếng Anh 2 (8.9 - Điểm A, chuẩn B1).`,
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
        `AI đã đọc dữ liệu học tập của ${studentIdentity.displayName}, tự động sắp xếp 6 mục CV theo chuẩn "${selectedTrack.shortLabel}" và điền Mục tiêu nghề nghiệp.`,
      );
    }
  }

  /* ---------- AI Single-Section Rewrite (Objective or Project) ---------- */
  async function rewriteObjectiveWithAi() {
    if (aiGenerating) return;
    setAiGenerating(true);
    setAiStatusText("AI đang viết lại Mục tiêu nghề nghiệp...");

    const styleHints: Record<typeof aiFocus, string> = {
      ats: "Ngắn gọn, súc tích, chứa từ khóa kỹ thuật chuẩn ATS TopCV (60-85 từ).",
      project: "Nhấn mạnh kết quả định lượng từ 2 đồ án thực tế (9.2/10 và 9.0/10) cùng hiệu năng truy vấn SQL < 8ms.",
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
    setAiStatusText(`AI đang tối ưu mô tả dự án "${targetProj.title}" theo chuẩn STAR...`);

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

  /* ---------- Export Word (.doc) from Live Canva Artboard ---------- */
  function exportLiveCvToWordDoc() {
    const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${cvTitle}</title>
<style>
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.45; color: #111; margin: 2cm; }
  h1 { font-size: 18pt; margin: 0 0 4pt; text-transform: uppercase; color: ${accentColor}; }
  h2 { font-size: 12.5pt; margin: 14pt 0 6pt; text-transform: uppercase; border-bottom: 1.5pt solid ${accentColor}; padding-bottom: 2pt; color: ${accentColor}; }
  p { margin: 3pt 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6pt; }
  td, th { border: 1px solid #ccc; padding: 6pt 8pt; vertical-align: top; text-align: left; font-size: 11pt; }
  th { width: 30%; background: #f5f5f5; font-weight: bold; }
</style>
</head>
<body>
  <h1>${headerFields.fullName}</h1>
  <p><strong>${headerFields.targetRole}</strong></p>
  <p>Email: ${headerFields.email} | ĐT: ${headerFields.phone} | Lớp: ${headerFields.classAndDept}</p>
  <p>Địa chỉ: ${headerFields.location} | Portfolio: ${headerFields.githubPortfolio}</p>
  <h2>1. ${sectionTitles.objective}</h2>
  <p>${currentCareerObjective}</p>
  <h2>2. ${sectionTitles.education}</h2>
  <p><strong>Trường Đại học Sao Đỏ</strong> — ${headerFields.classAndDept} (${headerFields.gpaBadge} · ${headerFields.standingBadge})</p>
  <h2>3. ${sectionTitles.skills}</h2>
  <table>
    <tbody>
      ${cvSkillGroups
        .map((g) => `<tr><th>${g.group}</th><td>${g.items}</td></tr>`)
        .join("")}
    </tbody>
  </table>
  <h2>4. ${sectionTitles.projects}</h2>
  ${cvProjects
    .map(
      (p) =>
        `<p><strong>${p.title} (${p.courseCode} — ${p.score})</strong> · <em>${p.role}</em><br/>${p.summary}<br/><small>Công nghệ: ${p.techStack}${p.artifactUrl ? ` · Link: ${p.artifactUrl}` : ""}</small></p>`,
    )
    .join("")}
  <h2>5. ${sectionTitles.certs} & ${sectionTitles.activities}</h2>
  ${[...cvCerts, ...cvActivities]
    .map((c) => `<p>- <strong>${c.title}:</strong> ${c.detail}</p>`)
    .join("")}
</body>
</html>`;

    const blob = new Blob(["﻿", htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cvTitle || `CV_${studentIdentity.code}`}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải xuống "${cvTitle}.doc" theo đúng thiết kế trên khung CV.`);
  }

  /* ---------- Bottom Administrative Form Studio Handlers ---------- */
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
    setBannerNotice("Đã khôi phục dữ liệu trích xuất gốc từ hệ thống đào tạo.");
  }

  function focusStudioWithTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
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
          <td style="width:34%;padding:8px 10px;border:1px solid #d4c6b8;font-weight:bold;background:#faf6f0;">${field.label}</td>
          <td style="width:66%;padding:8px 10px;border:1px solid #d4c6b8;white-space:pre-line;">${(values[field.key] ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        </tr>`,
      )
      .join("");

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${tpl.code} - ${tpl.title}</title></head>
<body style="font-family:Georgia,serif;font-size:12pt;margin:2cm;">
  <h2 style="text-align:center;">TRƯỜNG ĐẠI HỌC SAO ĐỎ · ${tpl.code}</h2>
  <h3 style="text-align:center;">${tpl.title}</h3>
  <table style="width:100%;border-collapse:collapse;"><tbody>${rowsHtml}</tbody></table>
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
    setBannerNotice(`Đã tải xuống biểu mẫu "${tpl.code}" (.doc).`);
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

  function renderSectionToolbar(sectionId: CvSectionId, allowAiRewrite?: () => void, onAdd?: () => void) {
    const idx = sectionOrder.indexOf(sectionId);
    return (
      <div className="cv-block-floating-tools" role="toolbar" aria-label={`Công cụ mục ${sectionTitles[sectionId]}`}>
        <button
          type="button"
          className="cv-tool-mini"
          onClick={() => moveSection(sectionId, -1)}
          disabled={idx <= 0}
          title="Đưa mục này lên trên"
        >
          ↑ Lên
        </button>
        <button
          type="button"
          className="cv-tool-mini"
          onClick={() => moveSection(sectionId, 1)}
          disabled={idx < 0 || idx >= sectionOrder.length - 1}
          title="Đưa mục này xuống dưới"
        >
          ↓ Xuống
        </button>
        {allowAiRewrite && (
          <button
            type="button"
            className="cv-tool-mini is-ai"
            onClick={allowAiRewrite}
            disabled={aiGenerating || aiSortingAndFilling}
          >
            <Icon name="sparkle" /> AI viết lại
          </button>
        )}
        {onAdd && (
          <button type="button" className="cv-tool-mini" onClick={onAdd}>
            + Thêm dòng
          </button>
        )}
        <button
          type="button"
          className="cv-tool-mini"
          onClick={() => toggleSectionVisibility(sectionId)}
          title="Ẩn mục này khỏi CV"
        >
          Ẩn
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
          onClick={() => setActiveSectionFocus("objective")}
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
            <span>Click để sửa trực tiếp hoặc dùng AI</span>
          </header>
          <textarea
            className="pf-cv-objective-input"
            rows={4}
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
          onClick={() => setActiveSectionFocus("education")}
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
            <span>2022 – 2026</span>
          </header>
          <div className="pf-cv-edu-row">
            <div>
              <strong>Trường Đại học Sao Đỏ — Ngành Công nghệ thông tin</strong>
              <p>
                Chuyên ngành Công nghệ phần mềm · Cố vấn học tập: {studentIdentity.advisorName}
              </p>
            </div>
            <code>
              GPA {overallGpa.value.toFixed(2)}/4.0 · {earnedCredits}/{program.requiredCredits} TC
            </code>
          </div>
          <div className="pf-cv-top-courses">
            <span className="pf-cv-sublabel">Học phần cốt lõi đạt điểm cao (Xác thực từ SDU):</span>
            <div className="pf-course-pills">
              {topCourses.map((course) => (
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
          onClick={() => setActiveSectionFocus("projects")}
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
                    "Mô tả ngắn gọn bài toán, giải pháp kỹ thuật đã triển khai và kết quả đạt được.",
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
            <span>{cvProjects.length} dự án</span>
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
                      onClick={() => void rewriteProjectWithAi(idx)}
                      disabled={aiGenerating}
                      title="Dùng AI viết lại mô tả dự án này theo chuẩn STAR"
                    >
                      <Icon name="sparkle" />
                    </button>
                    {cvProjects.length > 1 && (
                      <button
                        type="button"
                        className="cv-mini-icon-btn is-danger"
                        onClick={() =>
                          setCvProjects((prev) => prev.filter((_, i) => i !== idx))
                        }
                        title="Xóa dự án này khỏi CV"
                      >
                        ×
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
                    placeholder="Công nghệ sử dụng..."
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
                    placeholder="+ Dán link GitHub / Demo..."
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
          onClick={() => setActiveSectionFocus("skills")}
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
            <span>{selectedTrack.shortLabel}</span>
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
                      onClick={() =>
                        setCvSkillGroups((prev) => prev.filter((_, i) => i !== idx))
                      }
                      title="Xóa nhóm kỹ năng"
                    >
                      ×
                    </button>
                  )}
                </div>
                <input
                  type="text"
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
          onClick={() => setActiveSectionFocus("certs")}
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
        onClick={() => setActiveSectionFocus("activities")}
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

  const artboardCssVars = {
    "--cv-accent": accentColor,
    transform: zoomPct === 100 ? undefined : `scale(${zoomPct / 100})`,
    transformOrigin: "top center",
  } as CSSProperties;

  return (
    <>
      <DemoBanner />

      <PageTitle
        title="Không gian thiết kế CV bằng AI"
        lead="Tùy chỉnh bố cục, màu sắc, thứ tự mục trực tiếp trên trang A4 như Canva — tích hợp AI đọc dữ liệu học tập để tự sắp xếp, điền CV và đề xuất nâng cấp"
      >
        <div className="pf-top-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => void runAiAutoArrangeAndFillAll()}
            disabled={aiSortingAndFilling || aiGenerating}
          >
            <Icon name="sparkle" />
            <span>
              {aiSortingAndFilling
                ? "AI đang sắp xếp & điền CV…"
                : "AI Tự đọc hồ sơ & Điền toàn bộ CV"}
            </span>
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={exportLiveCvToWordDoc}
          >
            <Icon name="file" />
            <span>Tải CV Word (.doc)</span>
          </button>
          <button
            type="button"
            className="button button-quiet"
            onClick={() => window.print()}
          >
            <span>In / Xuất PDF A4</span>
          </button>
        </div>
      </PageTitle>

      {bannerNotice && (
        <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Trợ lý Thiết kế CV AI</strong>
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
          CANVA-STYLE TOP TOOLBAR
          ==================================================================== */}
      <div className="cv-canva-topbar" role="toolbar" aria-label="Thanh công cụ thiết kế CV">
        <div className="cv-topbar-left">
          <span className="cv-topbar-badge">SDU CV Studio</span>
          <input
            type="text"
            className="cv-doc-title-input"
            value={cvTitle}
            onChange={(e) => setCvTitle(e.target.value)}
            aria-label="Tên file CV"
          />
          <span className="cv-autosave-pill">
            <i aria-hidden="true" /> Đã đồng bộ dữ liệu SDU
          </span>
        </div>

        <div className="cv-topbar-center">
          <div className="cv-swatch-bar" role="group" aria-label="Màu chủ đạo CV">
            {cvColorSwatches.map((sw) => (
              <button
                key={sw.id}
                type="button"
                className={`cv-color-dot${accentColor.toLowerCase() === sw.hex.toLowerCase() ? " is-active" : ""}`}
                style={{ backgroundColor: sw.hex }}
                onClick={() => setAccentColor(sw.hex)}
                title={`Màu chủ đạo: ${sw.label}`}
                aria-label={sw.label}
              />
            ))}
            <label className="cv-color-picker-label" title="Chọn mã màu tùy ý">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                aria-label="Chọn màu tùy chỉnh"
              />
              <span>Màu khác</span>
            </label>
          </div>

          <select
            className="cv-topbar-select"
            value={fontPair}
            onChange={(e) => setFontPair(e.target.value as CvFontPairId)}
            aria-label="Phông chữ CV"
          >
            <option value="sans">Font: Hiện đại (Plus Jakarta)</option>
            <option value="serif">Font: Cổ điển Harvard (Serif)</option>
            <option value="mono-tech">Font: Kỹ thuật số (Tech Mono)</option>
          </select>

          <select
            className="cv-topbar-select"
            value={density}
            onChange={(e) => setDensity(e.target.value as CvDensityId)}
            aria-label="Độ thoáng dòng"
          >
            <option value="compact">Khoảng cách: Thu gọn</option>
            <option value="normal">Khoảng cách: Chuẩn A4</option>
            <option value="airy">Khoảng cách: Thoáng rộng</option>
          </select>
        </div>

        <div className="cv-topbar-right">
          <div className="cv-zoom-controls" role="group" aria-label="Thu phóng trang A4">
            <button
              type="button"
              onClick={() => setZoomPct((z) => Math.max(80, z - 10))}
              title="Thu nhỏ"
            >
              −
            </button>
            <span>{zoomPct}%</span>
            <button
              type="button"
              onClick={() => setZoomPct((z) => Math.min(115, z + 10))}
              title="Phóng to"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="button button-quiet button-sm"
            onClick={() => focusStudioWithTemplate("tpl-onestop-service")}
          >
            Biểu mẫu Một cửa
          </button>
        </div>
      </div>

      {/* ====================================================================
          CANVA STUDIO MAIN WORKSPACE (LEFT DOCK + DRAWER + RIGHT A4 STAGE)
          ==================================================================== */}
      <div className={`cv-canva-workspace${drawerOpen ? "" : " is-drawer-collapsed"}`}>
        {/* 1. Left Icon Rail (Canva Dock) */}
        <nav className="cv-dock-rail" aria-label="Bảng công cụ thiết kế CV">
          {(
            [
              { id: "ai", icon: "sparkle", label: "Trợ lý AI" },
              { id: "templates", icon: "briefcase", label: "Mẫu CV" },
              { id: "design", icon: "image", label: "Giao diện" },
              { id: "sections", icon: "file", label: "Thứ tự mục" },
              { id: "data", icon: "award", label: "Dữ liệu SDU" },
            ] as const
          ).map((tab) => {
            const active = drawerOpen && dockTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`cv-dock-btn${active ? " is-active" : ""}`}
                onClick={() => {
                  if (dockTab === tab.id) {
                    setDrawerOpen((o) => !o);
                  } else {
                    setDockTab(tab.id);
                    setDrawerOpen(true);
                  }
                }}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 2. Left Contextual Drawer Panel */}
        {drawerOpen && (
          <aside className="cv-dock-drawer" aria-label="Khung tùy chỉnh chi tiết">
          {dockTab === "ai" && (
            <div className="cv-drawer-pane">
              <header className="cv-drawer-head">
                <div>
                  <span className="pf-section-eyebrow">Trợ lý AI & Đề xuất thông minh</span>
                  <h3>Tự động đọc hồ sơ & Sắp xếp CV</h3>
                </div>
                <Link href={"/student/ai" as Route} className="pf-rank-tag">
                  Chat AI
                </Link>
              </header>

              <p className="pf-ai-desc">
                AI phân tích bảng điểm (<code>GPA {overallGpa.value.toFixed(2)}</code>), 2 đồ án thực hành phòng Lab và vị trí bạn chọn để tự sắp xếp thứ tự mục, điền nội dung và gợi ý nâng cấp CV.
              </p>

              <div className="pf-ai-controls">
                <label className="field">
                  Vị trí công việc mục tiêu
                  <select
                    value={roleTrackId}
                    onChange={(e) => {
                      const found = jobRoleTracks.find((r) => r.id === e.target.value);
                      if (found) selectJobRoleTrack(found);
                    }}
                  >
                    {jobRoleTracks.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.sector} — {role.shortLabel}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  Công ty hoặc yêu cầu JD cụ thể (tùy chọn)
                  <input
                    type="text"
                    value={customCompanyHint}
                    onChange={(e) => setCustomCompanyHint(e.target.value)}
                    placeholder="Ví dụ: FPT Software, Viettel, yêu cầu SQL..."
                  />
                </label>

                <label className="field">
                  Giọng văn Mục tiêu nghề nghiệp
                  <select
                    value={aiFocus}
                    onChange={(e) => setAiFocus(e.target.value as typeof aiFocus)}
                  >
                    <option value="ats">Chuẩn TopCV / ATS (Ngắn gọn, súc tích)</option>
                    <option value="project">Nhấn mạnh Đồ án & Chỉ số định lượng</option>
                    <option value="intern">Cầu thị, kỷ luật Lab & cam kết thực tập</option>
                    <option value="fresher">Định hướng lên Kỹ sư Fresher chính thức</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="button button-primary cv-full-btn"
                  onClick={() => void runAiAutoArrangeAndFillAll()}
                  disabled={aiSortingAndFilling || aiGenerating}
                >
                  <Icon name="sparkle" />
                  <span>
                    {aiSortingAndFilling
                      ? "Đang phân tích & sắp xếp CV…"
                      : "AI Tự sắp xếp bố cục & Điền toàn bộ CV"}
                  </span>
                </button>

                <div className="cv-ai-quick-btns">
                  <button
                    type="button"
                    className="pf-export-btn"
                    onClick={() => void rewriteObjectiveWithAi()}
                    disabled={aiGenerating}
                  >
                    Viết lại Mục tiêu
                  </button>
                  <button
                    type="button"
                    className="pf-export-btn"
                    onClick={() => void rewriteProjectWithAi(0)}
                    disabled={aiGenerating}
                  >
                    Tối ưu Đồ án STAR
                  </button>
                </div>

                {aiStatusText && <p className="pf-ai-note">{aiStatusText}</p>}
              </div>

              <div className="cv-ai-suggestions-box">
                <div className="cv-subhead-row">
                  <strong>Đề xuất từ AI cho vị trí {selectedTrack.shortLabel}</strong>
                  <span>{aiSuggestions.length} gợi ý</span>
                </div>
                <p className="cv-recruiter-note">{selectedTrack.recruiterVerdict}</p>
                <div className="cv-suggestion-list">
                  {aiSuggestions.map((sug) => (
                    <article
                      key={sug.id}
                      className={`cv-suggestion-card${sug.applied ? " is-applied" : ""}`}
                    >
                      <div className="cv-sug-top">
                        <strong>{sug.title}</strong>
                        <span className="cv-sug-badge">
                          {sug.applied ? "Đã áp dụng" : "Đề xuất AI"}
                        </span>
                      </div>
                      <p>{sug.reason}</p>
                      <button
                        type="button"
                        className="pf-inline-link"
                        onClick={() => applyAiSuggestion(sug)}
                      >
                        <span>{sug.applied ? "Áp dụng lại" : sug.actionLabel}</span>
                        <Icon name="arrowRight" />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {dockTab === "templates" && (
            <div className="cv-drawer-pane">
              <header className="cv-drawer-head">
                <div>
                  <span className="pf-section-eyebrow">Thư viện Mẫu CV</span>
                  <h3>Chọn bố cục & Ngành nghề</h3>
                </div>
              </header>

              <div className="cv-drawer-group">
                <span className="cv-group-label">1. Kiểu bố cục trang A4 (4 mẫu)</span>
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

              <div className="cv-drawer-group">
                <span className="cv-group-label">2. Mẫu nội dung theo vị trí công việc (6 ngành)</span>
                <div className="cv-vertical-cards">
                  {jobRoleTracks.map((role) => {
                    const active = roleTrackId === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`pf-role-pill${active ? " is-active" : ""}`}
                        onClick={() => selectJobRoleTrack(role)}
                      >
                        <span className="pf-role-sector">{role.sector}</span>
                        <strong>{role.shortLabel}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {dockTab === "design" && (
            <div className="cv-drawer-pane">
              <header className="cv-drawer-head">
                <div>
                  <span className="pf-section-eyebrow">Cá nhân hóa như Canva</span>
                  <h3>Màu sắc, Phông chữ & Khung ảnh</h3>
                </div>
              </header>

              <div className="cv-drawer-group">
                <span className="cv-group-label">Bảng màu nhấn trên CV</span>
                <div className="cv-palette-grid">
                  {cvColorSwatches.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      className={`cv-palette-card${accentColor.toLowerCase() === sw.hex.toLowerCase() ? " is-active" : ""}`}
                      onClick={() => setAccentColor(sw.hex)}
                    >
                      <span className="cv-palette-swatch" style={{ backgroundColor: sw.hex }} />
                      <strong>{sw.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cv-drawer-group">
                <span className="cv-group-label">Kiểu hiển thị ảnh đại diện trên CV</span>
                <div className="cv-segmented-2x2">
                  {(
                    [
                      { id: "rounded", label: "Bo góc hiện đại" },
                      { id: "circle", label: "Hình tròn" },
                      { id: "square", label: "Vuông hồ sơ" },
                      { id: "hidden", label: "Ẩn ảnh (ATS)" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`pf-export-btn${avatarShape === opt.id ? " is-selected-pill" : ""}`}
                      onClick={() => setAvatarShape(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cv-drawer-group">
                <span className="cv-group-label">Cặp phông chữ trình bày</span>
                <div className="cv-vertical-cards">
                  {(
                    [
                      {
                        id: "sans",
                        name: "Plus Jakarta Sans",
                        desc: "Hiện đại, rõ ràng, phù hợp CV Công nghệ & Kỹ thuật",
                      },
                      {
                        id: "serif",
                        name: "Playfair & Serif cổ điển",
                        desc: "Trang trọng chuẩn Harvard, phù hợp BA, Ngân hàng, Học bổng",
                      },
                      {
                        id: "mono-tech",
                        name: "JetBrains Mono Tech",
                        desc: "Đậm chất Developer & Data Engineer",
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`pf-style-card${fontPair === f.id ? " is-active" : ""}`}
                      onClick={() => setFontPair(f.id)}
                    >
                      <strong>{f.name}</strong>
                      <p>{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {dockTab === "sections" && (
            <div className="cv-drawer-pane">
              <header className="cv-drawer-head">
                <div>
                  <span className="pf-section-eyebrow">Quản lý cấu trúc CV</span>
                  <h3>Sắp xếp thứ tự & Ẩn/Hiện mục</h3>
                </div>
              </header>
              <p className="pf-ai-desc">
                Đổi thứ tự ưu tiên hoặc đổi tên tiêu đề từng phần. Bạn cũng có thể bấm nút{" "}
                <strong>AI Tự sắp xếp</strong> để AI xếp theo vị trí ứng tuyển.
              </p>

              <div className="cv-section-manager-list">
                {sectionOrder.map((secId, idx) => {
                  const isHidden = hiddenSections[secId];
                  return (
                    <div
                      key={secId}
                      className={`cv-sec-row${isHidden ? " is-muted" : ""}`}
                    >
                      <div className="cv-sec-row-top">
                        <code>#{idx + 1}</code>
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
                          ↑
                        </button>
                        <button
                          type="button"
                          className="cv-tool-mini"
                          onClick={() => moveSection(secId, 1)}
                          disabled={idx === sectionOrder.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="cv-tool-mini"
                          onClick={() => toggleSectionVisibility(secId)}
                        >
                          {isHidden ? "Hiện lại" : "Ẩn mục"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dockTab === "data" && (
            <div className="cv-drawer-pane">
              <header className="cv-drawer-head">
                <div>
                  <span className="pf-section-eyebrow">Kho dữ liệu xác thực SDU</span>
                  <h3>Chèn nhanh dữ liệu học tập vào CV</h3>
                </div>
              </header>
              <p className="pf-ai-desc">
                Dữ liệu thật trích xuất từ Cổng đào tạo Đại học Sao Đỏ. Nhấp để chèn thêm vào CV của bạn:
              </p>

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
                        setBannerNotice(`Đã chèn minh chứng "${obs.title}" vào tờ CV.`);
                      }}
                    >
                      <span>+ Chèn minh chứng này vào CV</span>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
          </aside>
        )}

        {/* 3. Right Interactive A4 Artboard Stage */}
        <div className="cv-artboard-stage">
          <article
            className={`pf-cv-sheet cv-sheet-a4 is-layout-${cvStyleId} is-font-${fontPair} is-density-${density}`}
            style={artboardCssVars}
            aria-label="Trang giấy thiết kế CV A4 tương tác trực tiếp"
          >
            {/* CV Header with inline editable inputs */}
            <header className="pf-cv-header">
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
                    {selectedLayout.name} · Mã xác thực SDU{" "}
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

            {/* Editable Contact Strip */}
            <dl className="pf-cv-contact">
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
                <dt>Lớp & Khoa</dt>
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
                <dt>GitHub / Khu vực thực tập</dt>
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

            {/* Dynamic CV Body Grid (2-column split or 1-column ordered flow) */}
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

            {/* Quick Bottom Action Bar inside A4 Sheet */}
            <footer className="pf-quick-export-bar">
              <span className="pf-quick-export-label">
                Mẹo: Nhấp vào bất kỳ dòng chữ nào trên trang A4 để sửa trực tiếp, hoặc bấm nút AI ở góc từng mục.
              </span>
              <div className="pf-export-links">
                <button
                  type="button"
                  className="pf-export-btn"
                  onClick={() => void runAiAutoArrangeAndFillAll()}
                >
                  AI Tự sắp xếp & Điền lại
                </button>
                <button
                  type="button"
                  className="pf-export-btn"
                  onClick={exportLiveCvToWordDoc}
                >
                  Xuất file Word (.doc)
                </button>
              </div>
            </footer>
          </article>
        </div>
      </div>

      {/* ====================================================================
          ADMINISTRATIVE DOSSIER EXPORT STUDIO (MẪU 01-CVTT, 02-XNSV, 03-HBKK, 04-ĐXCN)
          ==================================================================== */}
      <section ref={studioRef} id="xuat-bieu-mau">
        <Section
          title="Trích xuất sang Biểu mẫu hành chính & Hồ sơ trường (.doc / Một cửa)"
          sub="Đồng bộ từ CV của bạn sang 4 biểu mẫu chuẩn của Trường Đại học Sao Đỏ để nộp phòng Một cửa hoặc Phòng Đào tạo"
        >
          <div className="pf-studio-layout">
            <div
              className="pf-template-rail"
              role="tablist"
              aria-label="Danh sách mẫu biểu mẫu trích xuất"
            >
              {baseTemplates.map((tpl) => {
                const active = tpl.id === activeTemplate.id;
                const hasEdits = Boolean(
                  customOverrides[tpl.id] &&
                    Object.keys(customOverrides[tpl.id]!).length > 0,
                );
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`pf-rail-item${active ? " is-active" : ""}`}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                  >
                    <div className="pf-rail-top">
                      <code>{tpl.code}</code>
                      <span>{hasEdits ? "Đã chỉnh sửa" : tpl.recipient}</span>
                    </div>
                    <strong>{tpl.title}</strong>
                  </button>
                );
              })}
            </div>

            <form className="pf-studio-shell" onSubmit={dispatchFormSubmit}>
              <header className="pf-studio-head">
                <div>
                  <div className="pf-studio-code-row">
                    <code>{activeTemplate.code}</code>
                    <span>Nơi tiếp nhận: {activeTemplate.recipient}</span>
                  </div>
                  <h3>{activeTemplate.title}</h3>
                  <p className="pt-muted">{activeTemplate.usageNote}</p>
                </div>

                <div className="pf-studio-toolbar">
                  <button
                    type="button"
                    className="button button-quiet button-sm"
                    onClick={() => resetTemplateDraft(activeTemplate.id)}
                  >
                    Khôi phục mặc định
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-sm"
                    onClick={() => exportTemplateAsWordDoc(activeTemplate)}
                  >
                    <Icon name="file" />
                    <span>Tải Word (.doc)</span>
                  </button>
                </div>
              </header>

              <div className="pf-studio-grid">
                {activeTemplate.fields.map((field) => {
                  const val = activeDraftValues[field.key] ?? "";
                  return (
                    <label
                      key={field.key}
                      className={`field${field.wide ? " is-wide" : ""}`}
                    >
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
              </div>

              <footer className="pf-studio-actions">
                <p className="pt-muted">
                  Mã hồ sơ trích xuất:{" "}
                  <code>22SDU.CNTT.{studentIdentity.code.slice(-4)}</code>
                </p>
                <div className="pf-studio-primary-actions">
                  <button type="submit" className="button button-primary">
                    <Icon name="send" />
                    <span>{activeTemplate.targetActionLabel}</span>
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </Section>
      </section>
    </>
  );
}
