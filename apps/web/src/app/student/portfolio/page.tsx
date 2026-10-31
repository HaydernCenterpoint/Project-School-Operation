"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
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

type CvLayoutStyleId = "modern-split" | "harvard" | "impressive" | "minimal";

type CvLayoutStyle = {
  id: CvLayoutStyleId;
  name: string;
  tag: string;
  summary: string;
  accentColor: string;
};

const cvLayoutStyles: CvLayoutStyle[] = [
  {
    id: "modern-split",
    name: "Mẫu Chuyên nghiệp 2 Cột",
    tag: "Phổ biến nhất trên TopCV",
    summary: "Cột trái hiển thị liên hệ, kỹ năng, ngoại ngữ; cột phải trình bày mục tiêu nghề nghiệp, học vấn và dự án.",
    accentColor: "#c81d2e",
  },
  {
    id: "harvard",
    name: "Mẫu Harvard / Chuẩn ATS",
    tag: "Tối ưu lọc CV tự động",
    summary: "Bố cục 1 cột cổ điển, phân mục đường kẻ mảnh chuẩn quốc tế, dễ đọc với hệ thống ATS của tập đoàn & ngân hàng.",
    accentColor: "#1f2937",
  },
  {
    id: "impressive",
    name: "Mẫu Ấn tượng / Tech Portfolio",
    tag: "Nổi bật dự án & chỉ số",
    summary: "Header nhấn mạnh vị trí ứng tuyển, đóng khung các con số kết quả học thuật (GPA, truy vấn SQL, điểm Lab).",
    accentColor: "#0f4c81",
  },
  {
    id: "minimal",
    name: "Mẫu Đơn giản / Tinh gọn",
    tag: "Dành cho SV thực tập",
    summary: "Trình bày gọn gàng trên 1 trang A4, ưu tiên mục tiêu nghề nghiệp và các học phần cốt lõi đạt điểm A.",
    accentColor: "#2d6a4f",
  },
];

type JobRoleTrack = {
  id: string;
  sector: string;
  shortLabel: string;
  roleTitle: string;
  companyType: string;
  matchCount: string;
  defaultObjective: string;
  recruiterVerdict: string;
  checklist: {
    label: string;
    detail: string;
    status: "ready" | "missing" | "recommended";
    actionLabel?: string;
    templateId?: string;
  }[];
  cvSkills: {
    group: string;
    items: string[];
  }[];
};

const jobRoleTracks: JobRoleTrack[] = [
  {
    id: "role-fullstack",
    sector: "CNTT & Phần mềm",
    shortLabel: "Lập trình viên Backend / Web",
    roleTitle: "Thực tập sinh Lập trình viên Backend / Fullstack Web",
    companyType: "Công ty Sản phẩm công nghệ & Phần mềm",
    matchCount: "5/6 tiêu chí đạt",
    defaultObjective:
      "Sinh viên năm 3 chuyên ngành Công nghệ phần mềm tại Trường Đại học Sao Đỏ (GPA 3.22/4.0, thuộc Top 18% lớp DK13-CNTT1) ứng tuyển vị trí Thực tập sinh Lập trình viên Backend / Fullstack. Có nền tảng vững về Lập trình hướng đối tượng (IT3040 - 9.2/10), Cấu trúc dữ liệu & Giải thuật (Điểm A) và Thiết kế CSDL chuẩn 3NF (IT3090 - 9.0/10). Mong muốn vận dụng kỹ năng TypeScript, SQL và kiểm thử tự động vào dự án thực tế tại doanh nghiệp, hướng tới vị trí Kỹ sư phần mềm chính thức sau kỳ thực tập.",
    recruiterVerdict:
      "Hồ sơ vượt vòng lọc CV tự động nhờ GPA 3.22/4.0, điểm A môn Cấu trúc dữ liệu & Giải thuật (8.5) và 2 đồ án OOP/CSDL đạt 9.0+. Điểm thiếu duy nhất khi nộp CV là đường dẫn GitHub/Demo công khai của dự án.",
    checklist: [
      {
        label: "GPA tích lũy ≥ 3.0 & nắm vững Cấu trúc dữ liệu, OOP",
        detail: "Đạt 3.22/4.0 (Loại Giỏi) · IT2010 đạt 8.5 (A), IT3040 Lab đạt 8.8",
        status: "ready",
      },
      {
        label: "Thiết kế CSDL quan hệ chuẩn 3NF & truy vấn SQL",
        detail: "Đạt 9.0/10 bài thực hành CSDL (14 bảng, 25 truy vấn thống kê)",
        status: "ready",
      },
      {
        label: "Đọc hiểu tài liệu kỹ thuật tiếng Anh (Chuẩn B1)",
        detail: "Đã đạt chuẩn B1 · Tiếng Anh 1 (8.0) & Tiếng Anh 2 (8.9)",
        status: "ready",
      },
      {
        label: "Link mã nguồn GitHub & bản chạy thử (Live Demo) trong CV",
        detail: "Đồ án IT3040 & IT3090 mới lưu nội bộ, chưa điền link repo vào CV",
        status: "missing",
        actionLabel: "Điền link vào CV",
        templateId: "tpl-internship-cv",
      },
      {
        label: "Giấy giới thiệu thực tập & Bảng điểm xác nhận của Trường",
        detail: "Doanh nghiệp thường yêu cầu bản xác nhận sinh viên có dấu đỏ khi nhận việc",
        status: "recommended",
        actionLabel: "Tạo đơn Một cửa",
        templateId: "tpl-onestop-service",
      },
    ],
    cvSkills: [
      {
        group: "Ngôn ngữ & Nền tảng",
        items: ["TypeScript / JavaScript", "C++20", "SQL (PostgreSQL, SQLite)", "HTML5 / CSS3"],
      },
      {
        group: "Kiến trúc & Công cụ",
        items: ["OOP Design Patterns", "Thiết kế ERD 3NF", "Git / GitHub", "Unit Testing"],
      },
      {
        group: "Ngoại ngữ & Kỹ năng mềm",
        items: ["Tiếng Anh B1 (8.9/10)", "Làm việc nhóm Agile", "Báo cáo kỹ thuật"],
      },
    ],
  },
  {
    id: "role-qa",
    sector: "CNTT & Phần mềm",
    shortLabel: "Kiểm thử phần mềm (QA / Tester)",
    roleTitle: "Thực tập sinh Kiểm thử phần mềm (Manual & Automation QA/QC)",
    companyType: "Doanh nghiệp Outsourcing & Ngân hàng số",
    matchCount: "5/5 tiêu chí đạt",
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin tại Trường Đại học Sao Đỏ (GPA 3.22/4.0, tỷ lệ chuyên cần thực hành phòng Lab đạt 97.5%) ứng tuyển vị trí Thực tập sinh Kiểm thử phần mềm (QA/Tester). Thành thạo viết kịch bản kiểm thử biên, truy vấn SQL đối soát dữ liệu (đạt 9.0/10 học phần CSDL) và Unit Testing (đã kiểm thử 1.200 bản ghi không lỗi trong đồ án Quản lý Thư viện). Mong muốn đóng góp vào quy trình đảm bảo chất lượng phần mềm và phát triển lên Automation QA Engineer.",
    recruiterVerdict:
      "Rất phù hợp để ứng tuyển ngay. Tỷ lệ chuyên cần 97.5%, kỹ năng truy vấn SQL kiểm tra dữ liệu và kinh nghiệm viết Unit Test trong đồ án Quản lý Thư viện đáp ứng trực tiếp yêu cầu tuyển QA/QC thực tập.",
    checklist: [
      {
        label: "Nắm vững SQL để kiểm tra dữ liệu Backend (Database Testing)",
        detail: "Đạt 9.0/10 thực hành CSDL · Thành thạo JOIN, Stored Procedures, Indexing",
        status: "ready",
      },
      {
        label: "Kinh nghiệm viết kịch bản kiểm thử (Test Case / Unit Test)",
        detail: "Đã kiểm thử 1.200 bản ghi sách không lỗi trong đồ án IT3040",
        status: "ready",
      },
      {
        label: "Tính cẩn thận, đúng giờ và tuân thủ quy trình",
        detail: "Chuyên cần 97.5% · Điểm rèn luyện 82/100 (Xếp loại Tốt)",
        status: "ready",
      },
      {
        label: "Đọc hiểu tài liệu đặc tả yêu cầu (SRS) bằng tiếng Anh",
        detail: "Tiếng Anh 2 đạt 8.9/10 (Điểm A) · Đạt chuẩn ngoại ngữ B1",
        status: "ready",
      },
    ],
    cvSkills: [
      {
        group: "Kiểm thử & Đảm bảo chất lượng",
        items: ["Thiết kế Test Case", "Unit Testing", "SQL Data Verification", "Bug Tracking"],
      },
      {
        group: "Kiến thức kỹ thuật",
        items: ["OOP / TypeScript", "PostgreSQL / SQLite", "RESTful API", "Mạng máy tính"],
      },
      {
        group: "Ngoại ngữ & Quy trình",
        items: ["Đọc hiểu SRS Tiếng Anh (B1)", "Tài liệu hóa báo cáo lỗi"],
      },
    ],
  },
  {
    id: "role-ba",
    sector: "CNTT & Nghiệp vụ",
    shortLabel: "Business Analyst (BA Intern)",
    roleTitle: "Thực tập sinh Phân tích nghiệp vụ phần mềm (IT Business Analyst)",
    companyType: "Công ty Tư vấn chuyển đổi số & Phát triển sản phẩm",
    matchCount: "5/5 tiêu chí đạt",
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin — Trường Đại học Sao Đỏ (GPA 3.22/4.0, Tiếng Anh B1 đạt 8.9/10) ứng tuyển vị trí Thực tập sinh IT Business Analyst. Có kinh nghiệm khảo sát nghiệp vụ, thiết kế mô hình thực thể kết hợp (ERD 14 bảng chuẩn 3NF) và đặc tả phân hệ phần mềm trong đồ án Quản lý Thư viện & Quản lý Học vụ. Mong muốn làm cầu nối hiệu quả giữa khách hàng và đội ngũ phát triển sản phẩm.",
    recruiterVerdict:
      "Điểm Tiếng Anh 2 đạt 8.9 (A) kết hợp với điểm thực hành thiết kế CSDL 9.0/10 và vai trò Trưởng nhóm thiết kế Domain Model trong đồ án IT3040 là minh chứng rất thuyết phục cho vị trí BA thực tập.",
    checklist: [
      {
        label: "Thiết kế lược đồ CSDL (ERD) & mô hình hóa luồng nghiệp vụ",
        detail: "Trưởng nhóm thiết kế Domain Model (IT3040) & chuẩn hóa 14 bảng 3NF (IT3090)",
        status: "ready",
      },
      {
        label: "Ngoại ngữ giao tiếp & viết tài liệu đặc tả (SRS / Use Case)",
        detail: "Tiếng Anh 1 (8.0) & Tiếng Anh 2 (8.9 - Điểm A), chuẩn B1",
        status: "ready",
      },
      {
        label: "Kỹ năng làm việc nhóm & thuyết trình giải pháp",
        detail: "Thành viên Ban chuyên môn CLB Tin học Sao Đỏ · Điểm rèn luyện 82/100",
        status: "ready",
      },
      {
        label: "Đính kèm sơ đồ ERD & mẫu tài liệu đặc tả vào hồ sơ",
        detail: "Nên trích xuất tóm tắt đồ án IT3090 vào Mẫu 01-CVTT khi gửi nhà tuyển dụng",
        status: "recommended",
        actionLabel: "Cập nhật vào CV",
        templateId: "tpl-internship-cv",
      },
    ],
    cvSkills: [
      {
        group: "Phân tích & Thiết kế hệ thống",
        items: ["Mô hình hóa ERD / UML", "Phân tích yêu cầu (SRS)", "Thiết kế Domain Model", "SQL truy vấn báo cáo"],
      },
      {
        group: "Nền tảng công nghệ",
        items: ["Hiểu kiến trúc Web / OOP", "Cơ sở dữ liệu quan hệ 3NF", "Git & Quản lý tài liệu"],
      },
      {
        group: "Ngoại ngữ & Giao tiếp",
        items: ["Tiếng Anh B1 (8.9/10)", "Thuyết trình & Phản biện", "Điều phối nhóm đồ án"],
      },
    ],
  },
  {
    id: "role-data",
    sector: "Dữ liệu & AI",
    shortLabel: "Phân tích dữ liệu (Data / SQL)",
    roleTitle: "Thực tập sinh Phân tích & Kỹ thuật Dữ liệu (Data / SQL Analyst)",
    companyType: "Khối Phân tích dữ liệu, Thương mại điện tử & Fintech",
    matchCount: "4/5 tiêu chí đạt",
    defaultObjective:
      "Sinh viên năm 3 Khoa Công nghệ thông tin — Trường Đại học Sao Đỏ (GPA 3.22/4.0) ứng tuyển vị trí Thực tập sinh Phân tích & Kỹ thuật Dữ liệu (Data / SQL Intern). Nắm vững thiết kế lược đồ CSDL chuẩn 3NF, tối ưu hóa truy vấn SQL (25 truy vấn thống kê chạy dưới 8ms) và cấu trúc dữ liệu đồ thị (Điểm A). Mong muốn tham gia xây dựng pipeline dữ liệu, báo cáo BI và tối ưu truy vấn tại doanh nghiệp.",
    recruiterVerdict:
      "Thế mạnh lớn ở thiết kế lược đồ CSDL 3NF và tối ưu truy vấn SQL (< 8ms). Tuy nhiên nhà tuyển dụng Data thường soi kỹ điểm nhóm môn Toán nền tảng (Giải tích, Đại số tuyến tính, Toán rời rạc).",
    checklist: [
      {
        label: "Thiết kế mô hình dữ liệu (ERD) & tối ưu truy vấn SQL",
        detail: "Đạt 9.0/10 học phần Cơ sở dữ liệu (IT3090) · 25 truy vấn thống kê",
        status: "ready",
      },
      {
        label: "Lập trình xử lý cấu trúc dữ liệu & thuật toán",
        detail: "Đạt điểm A (8.5) môn Cấu trúc dữ liệu & Giải thuật (IT2010)",
        status: "ready",
      },
      {
        label: "Nền tảng Toán học (Giải tích, Đại số tuyến tính, Toán rời rạc)",
        detail: "Giải tích 1 (6.2 - C), Đại số (7.0 - B) đang thấp hơn mặt bằng lập trình (8.6)",
        status: "missing",
        actionLabel: "Lập kế hoạch cải thiện",
        templateId: "tpl-academic-plan",
      },
      {
        label: "Ngoại ngữ đọc tài liệu phân tích & báo cáo",
        detail: "Tiếng Anh 2 đạt 8.9/10 · Chuẩn B1",
        status: "ready",
      },
    ],
    cvSkills: [
      {
        group: "Cơ sở dữ liệu & Truy vấn",
        items: ["PostgreSQL", "SQLite", "Thiết kế chuẩn 3NF", "Tối ưu truy vấn & Indexing"],
      },
      {
        group: "Lập trình & Giải thuật",
        items: ["C++20", "TypeScript", "Đồ thị & Cây tìm kiếm", "Thống kê học vụ"],
      },
      {
        group: "Ngoại ngữ",
        items: ["Tiếng Anh B1 (8.9/10)", "Trình bày báo cáo số liệu"],
      },
    ],
  },
  {
    id: "role-network",
    sector: "Hạ tầng & Hệ thống",
    shortLabel: "Quản trị mạng / IT Helpdesk",
    roleTitle: "Thực tập sinh Quản trị hệ thống & Hỗ trợ kỹ thuật (IT Support / System)",
    companyType: "Doanh nghiệp sản xuất công nghiệp & Khu công nghiệp Hải Dương / Bắc Ninh",
    matchCount: "5/5 tiêu chí đạt",
    defaultObjective:
      "Sinh viên năm 3 Khoa Công nghệ thông tin — Trường Đại học Sao Đỏ (GPA 3.22/4.0, tỷ lệ chuyên cần 97.5%) ứng tuyển vị trí Thực tập sinh IT Support / Quản trị hệ thống. Có kiến thức vững về Kiến trúc máy tính (8.0), Mạng máy tính (TCP/IP, định tuyến, cấu hình dịch vụ), quản trị CSDL SQL và hỗ trợ kỹ thuật phần mềm. Sẵn sàng làm việc trực tiếp tại doanh nghiệp và hỗ trợ vận hành hạ tầng CNTT ổn định.",
    recruiterVerdict:
      "Phù hợp cao với các doanh nghiệp FDI và khu công nghiệp quanh Chí Linh, Hải Dương, Bắc Ninh nhờ kỷ luật chuyên cần 97.5%, nền tảng Kiến trúc máy tính (8.0) và Tiếng Anh B1.",
    checklist: [
      {
        label: "Kiến thức phần cứng, Kiến trúc máy tính & Hệ điều hành",
        detail: "Đạt 8.0 (B+) học phần Kiến trúc máy tính (IT2030)",
        status: "ready",
      },
      {
        label: "Cấu hình mạng TCP/IP & Quản trị CSDL nội bộ",
        detail: "Đang hoàn thành IT3080 (Mạng máy tính) & đạt 9.0 Lab CSDL",
        status: "ready",
      },
      {
        label: "Giao tiếp tiếng Anh cơ bản trong môi trường doanh nghiệp FDI",
        detail: "Đạt chuẩn B1 · Tiếng Anh 2 đạt 8.9/10",
        status: "ready",
      },
    ],
    cvSkills: [
      {
        group: "Hệ thống & Mạng",
        items: ["Kiến trúc máy tính", "Mạng TCP/IP & LAN/WAN", "Cài đặt & Xử lý sự cố phần mềm"],
      },
      {
        group: "Cơ sở dữ liệu & Bảo trì",
        items: ["Sao lưu & Phục hồi SQL", "Quản lý tài khoản nội bộ", "Hỗ trợ người dùng cuối"],
      },
      {
        group: "Ngoại ngữ & Tác phong",
        items: ["Tiếng Anh B1 (8.9/10)", "Kỷ luật giờ giấc (Chuyên cần 97.5%)"],
      },
    ],
  },
  {
    id: "role-sales-eng",
    sector: "Kinh doanh & Tư vấn",
    shortLabel: "Tư vấn giải pháp (Sales IT / EdTech)",
    roleTitle: "Thực tập sinh Tư vấn giải pháp Công nghệ (Sales Engineer / Tech Consultant)",
    companyType: "Doanh nghiệp Phần mềm quản trị (ERP/CRM), Viễn thông & EdTech",
    matchCount: "5/5 tiêu chí đạt",
    defaultObjective:
      "Sinh viên năm 3 ngành Công nghệ thông tin — Trường Đại học Sao Đỏ (GPA 3.22/4.0, Điểm rèn luyện 82/100) ứng tuyển vị trí Thực tập sinh Tư vấn giải pháp CNTT (Sales Engineer). Kết hợp kiến thức kỹ thuật thực tế về phần mềm, cơ sở dữ liệu với kỹ năng trình bày, hướng dẫn người dùng tích lũy từ hoạt động Ban chuyên môn CLB Tin học Sao Đỏ. Mong muốn tư vấn giải pháp công nghệ hiệu quả và mở rộng tập khách hàng doanh nghiệp.",
    recruiterVerdict:
      "Theo danh mục mẫu CV TopCV, vị trí Sales Engineer / Kinh doanh phần mềm rất chuộng sinh viên CNTT nắm rõ kỹ thuật sản phẩm và có kỹ năng giao tiếp, hoạt động CLB năng nổ.",
    checklist: [
      {
        label: "Hiểu rõ cấu trúc sản phẩm phần mềm, Web & Cơ sở dữ liệu",
        detail: "GPA 3.22/4.0 · Đã xây dựng hoàn chỉnh 3 đồ án phần mềm & CSDL",
        status: "ready",
      },
      {
        label: "Kỹ năng trình bày demo sản phẩm & hướng dẫn người dùng",
        detail: "Thành viên Ban chuyên môn CLB Tin học · Điểm rèn luyện 82/100",
        status: "ready",
      },
      {
        label: "Ngoại ngữ & Tin học văn phòng chuẩn bị hồ sơ thầu / báo giá",
        detail: "Tiếng Anh B1 (8.9/10) · Thành thạo soạn thảo tài liệu kỹ thuật",
        status: "ready",
      },
    ],
    cvSkills: [
      {
        group: "Tư vấn & Demo Giải pháp",
        items: ["Trình bày Demo phần mềm", "Khảo sát nhu cầu khách hàng", "Soạn thảo tài liệu giải pháp"],
      },
      {
        group: "Nền tảng kỹ thuật",
        items: ["Ứng dụng Web & CSDL SQL", "Quy trình vận hành phần mềm", "Xử lý thắc mắc kỹ thuật"],
      },
      {
        group: "Ngoại ngữ & Hoạt động",
        items: ["Tiếng Anh B1 (8.9/10)", "Ban chuyên môn CLB Tin học Sao Đỏ"],
      },
    ],
  },
];

type AiFocusStyle = "ats" | "project" | "intern" | "fresher";

const aiFocusOptions: { id: AiFocusStyle; label: string; promptHint: string }[] = [
  {
    id: "ats",
    label: "Chuẩn TopCV / ATS (Ngắn gọn, súc tích)",
    promptHint: "Viết theo chuẩn TopCV/ATS trong 3-4 câu ngắn gọn, có số liệu GPA, điểm môn cốt lõi và từ khóa kỹ năng của vị trí ứng tuyển.",
  },
  {
    id: "project",
    label: "Nhấn mạnh Đồ án & Kỹ năng thực hành",
    promptHint: "Tập trung làm nổi bật 3 đồ án thực hành phòng Lab (OOP 9.2, CSDL 3NF 9.0, CTDL-GT Điểm A) và khả năng bắt nhịp công việc ngay.",
  },
  {
    id: "intern",
    label: "Mục tiêu Thực tập sinh (Ham học hỏi, kỷ luật)",
    promptHint: "Nhấn mạnh tinh thần kỷ luật (chuyên cần 97.5%), nền tảng kiến thức vững và mục tiêu hoàn thành xuất sắc kỳ thực tập doanh nghiệp.",
  },
  {
    id: "fresher",
    label: "Mục tiêu gắn bó lâu dài (Fresher / Junior)",
    promptHint: "Chia rõ mục tiêu ngắn hạn (3-6 tháng nắm vững quy trình và đóng góp vào dự án) và mục tiêu dài hạn (1-2 năm trở thành nhân sự nòng cốt).",
  },
];

export default function StudentPortfolioPage() {
  const router = useRouter();
  const { data, avatarUrl, account, accounts } = useStudent();
  const formStudioRef = useRef<HTMLDivElement>(null);

  const studentIdentity = useMemo(() => {
    if (account.role !== "teacher") return account;
    return accounts.find((a) => a.role === "class_student") ?? account;
  }, [account, accounts]);

  const [cvStyleId, setCvStyleId] = useState<CvLayoutStyleId>("modern-split");
  const [roleTrackId, setRoleTrackId] = useState<string>("role-fullstack");
  const [aiFocus, setAiFocus] = useState<AiFocusStyle>("ats");
  const [customCompanyHint, setCustomCompanyHint] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  const [joinedClubs] = useDemoState("clubs", () => initialClubs);
  const [, setProposals] = useDemoState<ProfileUpdateProposal[]>(
    "profile-updates",
    () => initialProfileUpdates,
  );

  const selectedTrack =
    jobRoleTracks.find((r) => r.id === roleTrackId) ?? jobRoleTracks[0]!;
  const selectedLayout =
    cvLayoutStyles.find((s) => s.id === cvStyleId) ?? cvLayoutStyles[0]!;

  const allGradeRows = useMemo(() => terms.flatMap((term) => term.rows), []);
  const overallGpa = useMemo(() => gpa(allGradeRows), [allGradeRows]);
  const standingText = standing(overallGpa.value);
  const earnedCredits = useMemo(
    () => allGradeRows.filter((r) => total(r) >= 4).reduce((sum, r) => sum + r.credits, 0),
    [allGradeRows],
  );
  const currentCredits = useMemo(
    () => courses.reduce((sum, c) => sum + c.credits, 0),
    [],
  );

  const totalAttended = useMemo(
    () => attendanceRecords.reduce((sum, r) => sum + r.attendedPeriods, 0),
    [],
  );
  const totalPeriods = useMemo(
    () => attendanceRecords.reduce((sum, r) => sum + r.totalPeriods, 0),
    [],
  );
  const attendancePct = totalPeriods
    ? ((totalAttended / totalPeriods) * 100).toFixed(1)
    : "100.0";

  const topCourses = useMemo(
    () =>
      [...allGradeRows]
        .map((r) => ({ ...r, score10: total(r) }))
        .sort((a, b) => b.score10 - a.score10)
        .slice(0, 4),
    [allGradeRows],
  );

  const baseTemplates = useMemo(
    () =>
      buildEditableDossierTemplates({
        displayName: studentIdentity.displayName,
        code: studentIdentity.code,
        email: studentIdentity.email,
        phone: studentIdentity.phone,
        cohortClass: studentIdentity.cohortClass,
        department: studentIdentity.department,
        advisorName: studentIdentity.advisorName,
        gpaValue: overallGpa.value.toFixed(2),
        standingLabel: standingText,
        earnedCredits,
        requiredCredits: program.requiredCredits,
        conductScore: conduct.score,
        conductRank: conduct.rank,
        attendancePct,
      }),
    [
      attendancePct,
      earnedCredits,
      overallGpa.value,
      standingText,
      studentIdentity.advisorName,
      studentIdentity.code,
      studentIdentity.cohortClass,
      studentIdentity.department,
      studentIdentity.displayName,
      studentIdentity.email,
      studentIdentity.phone,
    ],
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-internship-cv");
  const [customOverrides, setCustomOverrides] = useDemoState<Record<string, Record<string, string>>>(
    "portfolio-form-drafts",
    () => ({}),
  );
  const [bannerNotice, setBannerNotice] = useState<string>("");

  if (!data) return null;

  const accessToken = data.session.accessToken;

  const activeTemplate: EditableDossierTemplate =
    baseTemplates.find((tpl) => tpl.id === selectedTemplateId) ?? baseTemplates[0]!;

  const activeDraftValues: Record<string, string> = {
    ...Object.fromEntries(activeTemplate.fields.map((f) => [f.key, f.value])),
    ...(customOverrides[activeTemplate.id] ?? {}),
  };

  // Current career objective displayed on the CV sheet and synchronized with Mẫu 01-CVTT
  const currentCareerObjective =
    customOverrides["tpl-internship-cv"]?.objectivePitch ?? selectedTrack.defaultObjective;

  function setCareerObjectiveText(nextText: string) {
    setCustomOverrides((prev) => ({
      ...prev,
      "tpl-internship-cv": {
        ...(prev["tpl-internship-cv"] ?? {}),
        targetRole: selectedTrack.roleTitle,
        objectivePitch: nextText,
      },
    }));
  }

  async function generateCareerObjectiveWithAi() {
    if (aiGenerating) return;
    setAiGenerating(true);
    setAiError("");

    const focusMeta = aiFocusOptions.find((f) => f.id === aiFocus) ?? aiFocusOptions[0]!;
    const prompt = [
      `Hãy viết mục "Mục tiêu nghề nghiệp" (Career Objective) cho CV xin việc/thực tập theo chuẩn TopCV Việt Nam.`,
      `- Họ tên ứng viên: ${studentIdentity.displayName} (Sinh viên năm 3, Lớp ${studentIdentity.cohortClass}, ${studentIdentity.department}, Trường Đại học Sao Đỏ).`,
      `- Vị trí ứng tuyển: ${selectedTrack.roleTitle} (${selectedTrack.companyType}).`,
      customCompanyHint.trim()
        ? `- Yêu cầu/Công ty mục tiêu cụ thể: ${customCompanyHint.trim()}.`
        : "",
      `- Dữ liệu học thuật khách quan: GPA ${overallGpa.value.toFixed(2)}/4.0 (Xếp loại ${standingText}, Top 18% lớp), tích lũy ${earnedCredits}/${program.requiredCredits} tín chỉ, chuyên cần phòng Lab ${attendancePct}%, điểm rèn luyện ${conduct.score}/100.`,
      `- Các học phần và dự án nổi bật: Lập trình hướng đối tượng (đồ án Quản lý Thư viện 9.2/10), Cơ sở dữ liệu (thiết kế 14 bảng 3NF, 25 truy vấn SQL < 8ms, 9.0/10), Cấu trúc dữ liệu & Giải thuật (8.5 - Điểm A), Tiếng Anh 2 (8.9 - Điểm A, chuẩn B1).`,
      `- Phong cách yêu cầu: ${focusMeta.promptHint}`,
      `Chỉ trả về đúng đoạn văn Mục tiêu nghề nghiệp hoàn chỉnh (khoảng 60-110 từ, không dùng markdown heading, không mở bài hay giải thích thêm) để đưa thẳng vào CV.`,
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
          } else if (event.type === "error") {
            setAiError("Không thể kết nối máy chủ AI, đã áp dụng mẫu mục tiêu nghề nghiệp tối ưu.");
          }
        },
        controller.signal,
      );
      if (streamed.trim()) {
        setCareerObjectiveText(streamed.trim().replace(/^["“]|["”]$/g, ""));
        setBannerNotice(
          `Trợ lý AI đã tạo Mục tiêu nghề nghiệp cho vị trí ${selectedTrack.shortLabel} và đồng bộ vào Mẫu 01-CVTT`,
        );
      }
    } catch {
      // Fallback synthesis if offline or quota reached
      const fallback = `${selectedTrack.defaultObjective}${
        customCompanyHint.trim()
          ? ` Định hướng đóng góp trực tiếp cho ${customCompanyHint.trim()} với cam kết kỷ luật và hiệu suất cao.`
          : ""
      }`;
      setCareerObjectiveText(fallback);
      setBannerNotice("Đã tạo Mục tiêu nghề nghiệp theo dữ liệu học thuật và vị trí ứng tuyển");
    } finally {
      setAiGenerating(false);
    }
  }

  function updateDraftField(key: string, nextValue: string) {
    setCustomOverrides((prev) => ({
      ...prev,
      [activeTemplate.id]: {
        ...(prev[activeTemplate.id] ?? {}),
        [key]: nextValue,
      },
    }));
  }

  function resetCurrentDraft() {
    setCustomOverrides((prev) => {
      const next = { ...prev };
      delete next[activeTemplate.id];
      return next;
    });
    setBannerNotice(`Đã khôi phục dữ liệu gốc từ hệ thống cho ${activeTemplate.code}`);
  }

  function openTemplateInStudio(templateId: string, customPatch?: Record<string, string>) {
    setSelectedTemplateId(templateId);
    if (customPatch) {
      setCustomOverrides((prev) => ({
        ...prev,
        [templateId]: {
          ...(prev[templateId] ?? {}),
          ...customPatch,
        },
      }));
    }
    setBannerNotice(
      `Đã nạp dữ liệu sang ${
        baseTemplates.find((t) => t.id === templateId)?.code ?? templateId
      } để chỉnh sửa`,
    );
    setTimeout(() => {
      formStudioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function handleSelectRoleTrack(track: JobRoleTrack) {
    setRoleTrackId(track.id);
    setCustomOverrides((prev) => ({
      ...prev,
      "tpl-internship-cv": {
        ...(prev["tpl-internship-cv"] ?? {}),
        targetRole: track.roleTitle,
        objectivePitch: track.defaultObjective,
        coreSkills: track.cvSkills.map((g) => `${g.group}: ${g.items.join(", ")}`).join(" · "),
      },
    }));
  }

  function handleSaveAndRoute(event: FormEvent) {
    event.preventDefault();

    if (activeTemplate.id === "tpl-profile-correction") {
      const cat = (activeDraftValues.category as ProfileUpdateProposal["category"]) || "Hồ sơ cá nhân";
      const fieldLabel = activeDraftValues.fieldLabel || "Thông tin hồ sơ sinh viên";
      const oldValue = activeDraftValues.oldValue || "Dữ liệu hiện tại";
      const newValue = activeDraftValues.newValue || "";
      const reason = activeDraftValues.reason || "Đề xuất cập nhật từ Hồ sơ của bạn";

      const newProposal: ProfileUpdateProposal = {
        id: `pup-${Date.now()}`,
        category: cat,
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
        category: cat,
        field: fieldLabel,
        old: oldValue,
        new: newValue,
        reason,
      });
      router.push(`/student/profile-update?${params.toString()}` as Route);
      return;
    }

    if (activeTemplate.id === "tpl-onestop-service") {
      const params = new URLSearchParams({
        from: "portfolio",
        type: activeDraftValues.serviceType || "svc-enrol",
        purpose: activeDraftValues.purpose || "",
      });
      router.push(`/student/services?${params.toString()}` as Route);
      return;
    }

    setBannerNotice(`Đã lưu bản chỉnh sửa ${activeTemplate.code} vào bộ nhớ trình duyệt`);
  }

  function exportFormAsWordDoc(templateOverride?: EditableDossierTemplate) {
    const targetTpl = templateOverride ?? activeTemplate;
    const values: Record<string, string> = {
      ...Object.fromEntries(targetTpl.fields.map((f) => [f.key, f.value])),
      ...(customOverrides[targetTpl.id] ?? {}),
    };

    const rowsHtml = targetTpl.fields
      .map(
        (field) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #ccc;font-weight:bold;width:32%;vertical-align:top;background:#f9f5f0;">${field.label}</td>
            <td style="padding:8px 12px;border:1px solid #ccc;white-space:pre-line;">${(
              values[field.key] ?? ""
            )
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</td>
          </tr>`,
      )
      .join("");

    const docHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${targetTpl.code} - ${studentIdentity.displayName}</title>
</head>
<body style="font-family:'Be Vietnam Pro',system-ui,sans-serif;font-size:12pt;line-height:1.5;color:#111;max-width:760px;margin:24px auto;">
  <div style="text-align:center;margin-bottom:18px;">
    <strong>TRƯỜNG ĐẠI HỌC SAO ĐỎ · CỔNG HỌC TẬP SINH VIÊN</strong><br/>
    <span>Mã biểu mẫu: ${targetTpl.code} · Mẫu thiết kế: ${selectedLayout.name}</span>
    <h2 style="margin:12px 0 4px;">${targetTpl.title}</h2>
    <p style="margin:0;">Kính gửi: ${targetTpl.recipient}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tbody>${rowsHtml}</tbody>
  </table>
  <p style="text-align:right;margin-top:28px;">
    Chí Linh, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}<br/>
    <strong>Người lập biểu mẫu</strong><br/><br/><br/>
    ${studentIdentity.displayName} (${studentIdentity.code})
  </p>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetTpl.code.toLowerCase().replace(/\s+/g, "-")}-${studentIdentity.code}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải tệp ${targetTpl.code}.doc (${selectedLayout.name})`);
  }

  function exportFormAsJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      cvLayoutStyle: selectedLayout.id,
      jobRoleTrack: selectedTrack.roleTitle,
      templateCode: activeTemplate.code,
      templateTitle: activeTemplate.title,
      recipient: activeTemplate.recipient,
      student: {
        code: studentIdentity.code,
        name: studentIdentity.displayName,
        cohortClass: studentIdentity.cohortClass,
        department: studentIdentity.department,
        gpa: overallGpa.value,
        standing: standingText,
        conductScore: conduct.score,
        attendancePct: Number(attendancePct),
      },
      formValues: activeDraftValues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ho-so-${studentIdentity.code}-${activeTemplate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải tệp JSON cho ${activeTemplate.code}`);
  }

  async function copyFormText() {
    const lines = [
      `${activeTemplate.code} — ${activeTemplate.title}`,
      `Kính gửi: ${activeTemplate.recipient}`,
      ...activeTemplate.fields.map(
        (field) => `${field.label}: ${activeDraftValues[field.key] ?? ""}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setBannerNotice("Đã sao chép nội dung biểu mẫu");
    } catch {
      setBannerNotice("Không thể truy cập bộ nhớ tạm trên trình duyệt này");
    }
  }

  const activeClubsList = clubs.filter((c) => joinedClubs.includes(c.id));
  const cvTemplate = baseTemplates[0]!;

  return (
    <>
      <DemoBanner />

      <PageTitle
        title="Hồ sơ của bạn"
        lead="Thư viện mẫu CV theo vị trí công việc (chuẩn TopCV), kết hợp Trợ lý AI viết mục tiêu nghề nghiệp từ dữ liệu học tập thực tế"
      >
        <div className="pf-top-actions">
          <button
            type="button"
            className="button button-primary button-sm"
            onClick={() => exportFormAsWordDoc(cvTemplate)}
          >
            <Icon name="file" /> Tải CV Word (.doc)
          </button>
          <button
            type="button"
            className="button button-outline button-sm"
            onClick={() => openTemplateInStudio("tpl-internship-cv")}
          >
            <Icon name="pen" /> Mở khung chỉnh sửa biểu mẫu
          </button>
          <button
            type="button"
            className="button button-outline button-sm"
            onClick={() => window.print()}
          >
            In / Lưu PDF A4
          </button>
        </div>
      </PageTitle>

      {bannerNotice && (
        <div className="notice ok" role="status">
          <Icon name="checkCircle" />
          <div>
            <strong>Đồng bộ hồ sơ & CV</strong>
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

      {/* Step 1: Choose CV Template Style & Job Position (Inspired by TopCV mau-cv-theo-vi-tri-cong-viec) */}
      <section className="pf-gallery-bar" aria-label="Chọn mẫu thiết kế CV và vị trí công việc">
        <div className="pf-gallery-row">
          <div className="pf-gallery-head">
            <span className="pf-section-eyebrow">1. Chọn kiểu bố cục CV (4 phong cách chuẩn TopCV)</span>
          </div>
          <div className="pf-style-grid" role="tablist" aria-label="Phong cách thiết kế CV">
            {cvLayoutStyles.map((style) => {
              const active = style.id === cvStyleId;
              return (
                <button
                  key={style.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`pf-style-card${active ? " is-active" : ""}`}
                  onClick={() => setCvStyleId(style.id)}
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

        <div className="pf-gallery-row">
          <div className="pf-gallery-head">
            <span className="pf-section-eyebrow">
              2. Chọn mẫu CV theo vị trí công việc ({jobRoleTracks.length} vị trí thực tập & fresher)
            </span>
          </div>
          <div className="pf-role-pills" role="tablist" aria-label="Mẫu CV theo vị trí công việc">
            {jobRoleTracks.map((track) => {
              const active = track.id === selectedTrack.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`pf-role-pill${active ? " is-active" : ""}`}
                  onClick={() => handleSelectRoleTrack(track)}
                >
                  <span className="pf-role-sector">{track.sector}</span>
                  <strong>{track.shortLabel}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Split: Live TopCV-Style Resume Preview (Left) + AI Career Objective & Job Readiness (Right) */}
      <div className="pf-cv-workspace">
        {/* Left: Printable, Recruiter-Ready Student CV Sheet */}
        <article
          className={`pf-cv-sheet is-layout-${cvStyleId}`}
          aria-label="Bản xem trước CV ứng tuyển theo vị trí công việc"
        >
          <header className="pf-cv-header">
            <div className="pf-dossier-identity">
              <div className="pf-dossier-avatar" aria-hidden="true">
                {avatarUrl && account.role !== "teacher" ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  <span>{initials(studentIdentity.displayName)}</span>
                )}
              </div>
              <div className="pf-dossier-meta">
                <span className="pf-record-id">
                  {selectedLayout.name} · Mã xác thực{" "}
                  <code>22SDU.CNTT.{studentIdentity.code.slice(-4)}</code>
                </span>
                <h2>{studentIdentity.displayName}</h2>
                <p className="pf-cv-role">{selectedTrack.roleTitle}</p>
              </div>
            </div>

            <div className="pf-score-stamp">
              <span className="pf-score-label">GPA tích lũy</span>
              <strong className="pf-score-value">
                {overallGpa.value.toFixed(2)}
                <small>/4.0</small>
              </strong>
              <span className="pf-score-delta">Xếp loại {standingText}</span>
            </div>
          </header>

          {/* Contact & Verification Bar */}
          <dl className="pf-cv-contact">
            <div>
              <dt>Email</dt>
              <dd>{studentIdentity.email}</dd>
            </div>
            <div>
              <dt>Điện thoại</dt>
              <dd>{studentIdentity.phone}</dd>
            </div>
            <div>
              <dt>Lớp & Khoa</dt>
              <dd>
                {studentIdentity.cohortClass} · {studentIdentity.department}
              </dd>
            </div>
            <div>
              <dt>Địa điểm</dt>
              <dd>Chí Linh, Hải Dương (Thực tập Hà Nội / Hải Dương / Bắc Ninh)</dd>
            </div>
          </dl>

          <div className="pf-cv-body-grid">
            {/* Sidebar column (used in 2-column Modern Split layout, flows naturally in 1-column layouts) */}
            <div className="pf-cv-side-col">
              <section className="pf-cv-block">
                <div className="pf-cv-block-head">
                  <h3>Kỹ năng chuyên môn</h3>
                  <span>{selectedTrack.shortLabel}</span>
                </div>
                <div className="pf-skill-groups">
                  {selectedTrack.cvSkills.map((grp) => (
                    <div key={grp.group} className="pf-skill-row">
                      <span className="pf-skill-label">{grp.group}</span>
                      <div className="pf-skill-items">
                        {grp.items.map((item) => (
                          <span key={item} className="pf-skill-chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pf-cv-block">
                <div className="pf-cv-block-head">
                  <h3>Chứng chỉ & Ngoại ngữ</h3>
                  <span>Đã xác thực</span>
                </div>
                <ul className="pf-cv-compact-list">
                  <li>
                    <strong>Chuẩn Ngoại ngữ B1</strong>
                    <span>Tiếng Anh 1 (8.0) · Tiếng Anh 2 (8.9 - Điểm A)</span>
                  </li>
                  <li>
                    <strong>Kỷ luật & Chuyên cần Lab</strong>
                    <span>{attendancePct}% tiết có mặt ({totalAttended}/{totalPeriods} tiết)</span>
                  </li>
                  <li>
                    <strong>Điểm rèn luyện học kỳ</strong>
                    <span>{conduct.score}/100 điểm · Xếp loại {conduct.rank}</span>
                  </li>
                </ul>
              </section>

              <section className="pf-cv-block">
                <div className="pf-cv-block-head">
                  <h3>Hoạt động & Giải thưởng</h3>
                  <span>{activeClubsList.length} CLB</span>
                </div>
                <ul className="pf-cv-compact-list">
                  <li>
                    <strong>Ban chuyên môn — CLB Tin học Sao Đỏ</strong>
                    <span>Phụ đạo Cấu trúc dữ liệu & xây dựng kho bài mẫu C++20</span>
                  </li>
                  <li>
                    <strong>Tình nguyện & Cộng đồng</strong>
                    <span>Hiến máu &ldquo;Giọt hồng Sao Đỏ&rdquo; · Chủ nhật xanh KTX</span>
                  </li>
                </ul>
              </section>
            </div>

            {/* Main column: Career Objective + Education + Verified Projects */}
            <div className="pf-cv-main-col">
              {/* Career Objective Section (with live AI rewrite) */}
              <section className="pf-cv-block">
                <div className="pf-cv-block-head">
                  <h3>Mục tiêu nghề nghiệp</h3>
                  <span>{aiGenerating ? "Trợ lý AI đang viết…" : "Có thể chỉnh sửa trực tiếp"}</span>
                </div>
                <textarea
                  className="pf-cv-objective-input"
                  rows={4}
                  value={currentCareerObjective}
                  onChange={(e) => setCareerObjectiveText(e.target.value)}
                  aria-label="Mục tiêu nghề nghiệp trên CV"
                />
              </section>

              {/* Education & Verified Academic Standing */}
              <section className="pf-cv-block">
                <div className="pf-cv-block-head">
                  <h3>Học vấn & Thành tích học thuật</h3>
                  <span>2022 – 2026</span>
                </div>
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
                  <span className="pf-cv-sublabel">Học phần cốt lõi đạt điểm cao:</span>
                  <div className="pf-course-pills">
                    {topCourses.map((c) => (
                      <span key={c.code} className="pf-course-tag">
                        <code>{c.code}</code> {c.name}: <strong>{c.score10.toFixed(1)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Verified Projects */}
              <section className="pf-cv-block">
                <div className="pf-cv-block-head">
                  <h3>Kinh nghiệm dự án & Đồ án thực hành</h3>
                  <span>Giảng viên bộ môn xác nhận</span>
                </div>
                <div className="pf-cv-projects">
                  {portfolioProjects.map((proj) => (
                    <div key={proj.id} className="pf-cv-project-item">
                      <div className="pf-cv-project-head">
                        <div>
                          <strong>{proj.title}</strong>
                          <span className="pf-cv-project-role">
                            {proj.role} · <code>{proj.courseCode}</code>
                          </span>
                        </div>
                        <code className="pf-cv-project-score">{proj.score}</code>
                      </div>
                      <p>{proj.highlight}</p>
                      <div className="pf-cv-project-meta">
                        <span>Công nghệ: {proj.stack.join(", ")}</span>
                        <span>Xác nhận: {proj.verifiedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <footer className="pf-quick-export-bar" aria-label="Chọn nhanh biểu mẫu cần xuất">
            <span className="pf-quick-export-label">Xuất hồ sơ sang form để sửa:</span>
            <div className="pf-export-links">
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-internship-cv")}
              >
                Mẫu 01 · CV Thực tập
              </button>
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-scholarship")}
              >
                Mẫu 02 · Xét Học bổng
              </button>
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-profile-correction")}
              >
                Mẫu 03 · Sửa hồ sơ gốc
              </button>
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-onestop-service")}
              >
                Mẫu 04 · Xin giấy xác nhận
              </button>
            </div>
          </footer>
        </article>

        {/* Right Column: AI Career Objective Generator + Job Readiness Checklist */}
        <aside className="pf-side-column" aria-label="Trợ lý AI viết Mục tiêu nghề nghiệp và kiểm tra CV">
          <section className="pf-ai-card">
            <div className="pf-radar-card-head">
              <div>
                <span className="pf-section-eyebrow">Tích hợp Trợ lý AI học tập SDU</span>
                <h3>AI viết Mục tiêu nghề nghiệp</h3>
              </div>
              <Link href="/student/ai" className="pf-rank-tag">
                Mở Trợ lý AI
              </Link>
            </div>

            <p className="pf-ai-desc">
              Sử dụng hệ thống AI sẵn có để tổng hợp GPA ({overallGpa.value.toFixed(2)}/4.0), đồ án
              phòng Lab và vị trí <strong>{selectedTrack.shortLabel}</strong> thành đoạn Mục tiêu
              nghề nghiệp chuẩn TopCV.
            </p>

            <div className="pf-ai-controls">
              <label className="field">
                <span>Phong cách viết Mục tiêu nghề nghiệp</span>
                <select
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value as AiFocusStyle)}
                >
                  {aiFocusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Công ty hoặc yêu cầu JD cụ thể (tùy chọn)</span>
                <input
                  type="text"
                  value={customCompanyHint}
                  onChange={(e) => setCustomCompanyHint(e.target.value)}
                  placeholder="Ví dụ: FPT Software, Viettel, yêu cầu biết SQL & Git…"
                />
              </label>

              <div className="pf-ai-btn-row">
                <button
                  type="button"
                  className="button button-primary button-sm"
                  disabled={aiGenerating}
                  onClick={() => void generateCareerObjectiveWithAi()}
                >
                  <Icon name="sparkle" />
                  <span>
                    {aiGenerating
                      ? "Đang viết mục tiêu nghề nghiệp…"
                      : "Dùng AI tạo Mục tiêu nghề nghiệp"}
                  </span>
                </button>
                <button
                  type="button"
                  className="button button-quiet button-xs"
                  onClick={() => setCareerObjectiveText(selectedTrack.defaultObjective)}
                >
                  Khôi phục mẫu chuẩn
                </button>
              </div>

              {aiError && <p className="pf-ai-note">{aiError}</p>}
            </div>
          </section>

          <section className="pf-readiness-card">
            <div className="pf-radar-card-head">
              <div>
                <span className="pf-section-eyebrow">Đối chiếu yêu cầu tuyển dụng</span>
                <h3>Checklist hồ sơ vị trí {selectedTrack.shortLabel}</h3>
              </div>
              <code className="pf-rank-tag">{selectedTrack.matchCount}</code>
            </div>

            <div className="pf-verdict-box">
              <strong>Nhận xét khách quan từ dữ liệu học tập</strong>
              <p>{selectedTrack.recruiterVerdict}</p>
            </div>

            <ul className="pf-checklist">
              {selectedTrack.checklist.map((item) => (
                <li key={item.label} className={`pf-check-item is-${item.status}`}>
                  <span className="pf-check-dot" aria-hidden="true" />
                  <div className="pf-check-body">
                    <div className="pf-check-head">
                      <strong>{item.label}</strong>
                      <span className="pf-check-status">
                        {item.status === "ready"
                          ? "Đã đạt"
                          : item.status === "missing"
                            ? "Cần bổ sung"
                            : "Khuyến nghị"}
                      </span>
                    </div>
                    <p>{item.detail}</p>
                    {item.templateId && item.actionLabel && (
                      <button
                        type="button"
                        className="pf-inline-link"
                        onClick={() => openTemplateInStudio(item.templateId!)}
                      >
                        {item.actionLabel} <Icon name="arrow" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="pf-readiness-card">
            <div className="pf-radar-card-head">
              <div>
                <span className="pf-section-eyebrow">Góc nhìn khách quan đa chiều</span>
                <h3>Điểm mạnh & điểm mù học thuật</h3>
              </div>
            </div>

            <div className="pf-obs-stack">
              {objectiveObservations.slice(0, 3).map((obs) => (
                <article key={obs.id} className={`pf-obs-card is-${obs.tone}`}>
                  <header className="pf-obs-head">
                    <span className="pf-obs-badge">{obs.badge}</span>
                    <code className="pf-obs-metric">{obs.metric}</code>
                  </header>
                  <h4>{obs.title}</h4>
                  <p>{obs.summary}</p>
                  <footer className="pf-obs-foot">
                    <span>Nguồn: {obs.evidenceRef}</span>
                    <button
                      type="button"
                      className="pf-inline-link"
                      onClick={() =>
                        openTemplateInStudio(
                          obs.suggestedFormId,
                          obs.suggestedField
                            ? {
                                category: obs.suggestedField.category,
                                fieldLabel: obs.suggestedField.fieldLabel,
                                oldValue: obs.suggestedField.oldValue,
                                newValue: obs.suggestedField.newValue,
                                reason: obs.suggestedField.reason,
                              }
                            : undefined,
                        )
                      }
                    >
                      Đưa vào form <Icon name="arrow" />
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Master-Detail Editable Form Studio */}
      <div ref={formStudioRef} id="xuat-bieu-mau">
        <Section
          title="Xuất hồ sơ sang biểu mẫu cần thiết để chỉnh sửa"
          action={
            <span className="reg-table-meta">
              Dữ liệu tự động điền từ hệ thống học vụ · Chỉnh sửa trực tiếp trước khi tải Word/JSON hoặc gửi duyệt
            </span>
          }
        >
          <div className="pf-studio-layout">
            <aside className="pf-template-rail" role="tablist" aria-label="Danh sách biểu mẫu">
              {baseTemplates.map((tpl) => {
                const active = tpl.id === activeTemplate.id;
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
                      <span>{tpl.category}</span>
                    </div>
                    <strong>{tpl.title}</strong>
                  </button>
                );
              })}
            </aside>

            <div className="pf-studio-shell">
              <header className="pf-studio-head">
                <div>
                  <div className="pf-studio-code-row">
                    <code>{activeTemplate.code}</code>
                    <span>· {activeTemplate.category}</span>
                    {customOverrides[activeTemplate.id] && (
                      <span className="pf-draft-indicator">Đã chỉnh sửa</span>
                    )}
                  </div>
                  <h3>{activeTemplate.title}</h3>
                  <p className="pt-muted">Nơi nhận: {activeTemplate.recipient}</p>
                </div>

                <div className="pf-studio-toolbar">
                  <button
                    type="button"
                    className="button button-outline button-xs"
                    onClick={() => exportFormAsWordDoc()}
                  >
                    <Icon name="file" /> Tải Word (.doc)
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-xs"
                    onClick={exportFormAsJson}
                  >
                    <Icon name="code" /> Tải JSON
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-xs"
                    onClick={() => void copyFormText()}
                  >
                    <Icon name="copy" /> Sao chép
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-xs"
                    onClick={resetCurrentDraft}
                  >
                    Khôi phục gốc
                  </button>
                </div>
              </header>

              <form className="pf-studio-form" onSubmit={handleSaveAndRoute}>
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
                            rows={4}
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

                <div className="pf-studio-actions">
                  <div className="pf-studio-primary-actions">
                    <button type="submit" className="button button-primary">
                      <span>
                        {activeTemplate.id === "tpl-profile-correction"
                          ? "Chuyển sang Form Đề xuất cập nhật hồ sơ"
                          : activeTemplate.id === "tpl-onestop-service"
                            ? "Chuyển sang Form Thủ tục Một cửa"
                            : "Lưu bản chỉnh sửa"}
                      </span>
                    </button>

                    <Link
                      href={
                        `/student/profile-update?from=portfolio&category=${encodeURIComponent(
                          activeDraftValues.category || "Hồ sơ cá nhân",
                        )}&field=${encodeURIComponent(
                          activeDraftValues.fieldLabel || activeTemplate.title,
                        )}&old=${encodeURIComponent(
                          activeDraftValues.oldValue ||
                            `GPA ${overallGpa.value.toFixed(2)} · ${studentIdentity.cohortClass}`,
                        )}&new=${encodeURIComponent(
                          activeDraftValues.newValue || activeDraftValues.objectivePitch || "",
                        )}&reason=${encodeURIComponent(
                          activeDraftValues.reason ||
                            `Trích xuất từ ${activeTemplate.code} (${activeTemplate.title})`,
                        )}` as Route
                      }
                      className="button button-outline"
                    >
                      Mở trong Phiếu đề xuất chỉnh sửa HSSV
                    </Link>

                    <Link
                      href={
                        `/student/services?from=portfolio&type=${encodeURIComponent(
                          activeDraftValues.serviceType || "svc-enrol",
                        )}&purpose=${encodeURIComponent(
                          activeDraftValues.purpose ||
                            `Xác nhận hồ sơ năng lực sinh viên (${activeTemplate.title}) - GPA ${overallGpa.value.toFixed(2)}`,
                        )}` as Route
                      }
                      className="button button-outline"
                    >
                      Mở trong Thủ tục Một cửa
                    </Link>
                  </div>

                  <Link href="/student/account" className="button button-quiet">
                    Xem hồ sơ gốc ({profile.education.length + profile.personal.length} mục)
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
