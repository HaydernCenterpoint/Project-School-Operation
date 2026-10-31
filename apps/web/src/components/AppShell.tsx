"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { phuongFonts } from "./landing/fonts";
import { usePhuongTheme } from "@/lib/theme";
import { useSlider } from "@/lib/use-slider";
import "@/app/landing.css";
import "./app-phuong.css";
import "./portal.css";

export type NavItem = { href: Route; label: string; icon: IconName; exact?: boolean; short?: string; newTab?: boolean; /** Shown in the phone bottom bar; the rest sit under "Thêm". */ mobile?: boolean;
  /** Sibling pages shown as tabs above the content; the entry is current on any of them. */
  tabs?: { href: Route; label: string; exact?: boolean }[];
  /** Pulled out of the list into a highlighted button at the foot of the sidebar. */
  featured?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };
export type Notification = { id: string; title: string; text: string; href: Route };
export type SearchSuggestion = {
  id: string;
  label: string;
  detail?: string;
  category: string;
  href: Route;
  icon: IconName;
  keywords?: string;
  newTab?: boolean;
};

/** Ten entries, no group headings: related pages share one entry and switch with tabs (see `tabs`). */
export const studentNav: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/student", label: "Tổng quan", icon: "home", mobile: true, tabs: [{ href: "/student", label: "Tổng quan", exact: true }, { href: "/student/notices", label: "Thông báo" }] },
      { href: "/student/schedule", label: "Lịch", icon: "calendar", mobile: true, tabs: [{ href: "/student/schedule", label: "Lịch tuần" }, { href: "/student/schedule-progress" as Route, label: "Lịch theo tiến độ" }, { href: "/student/exams", label: "Lịch thi" }] },
      { href: "/student/assignments", label: "Học tập", icon: "book", mobile: true, tabs: [{ href: "/student/assignments", label: "Bài tập" }, { href: "/student/classes", label: "Lớp học" }, { href: "/student/grades", label: "Kết quả học tập" }, { href: "/student/attendance" as Route, label: "Thông tin điểm danh" }] },
      { href: "/student/registration", label: "Đăng ký học phần", short: "Đăng ký", icon: "clipboard", tabs: [{ href: "/student/registration", label: "Đăng ký học phần", exact: true }, { href: "/student/curriculum" as Route, label: "Chương trình khung" }] },
      { href: "/student/tuition", label: "Học phí", icon: "wallet", tabs: [{ href: "/student/tuition", label: "Tra cứu công nợ & Thanh toán", exact: true }, { href: "/student/receipts" as Route, label: "Phiếu thu trực tuyến & Tổng hợp" }] },
      { href: "/student/activities", label: "Hoạt động", icon: "flag", tabs: [{ href: "/student/activities", label: "Kết quả rèn luyện & Sự kiện" }, { href: "/student/clubs", label: "Câu lạc bộ" }] },
      { href: "/student/news", label: "Tin tức", icon: "news" },
      { href: "/student/community", label: "Cộng đồng", icon: "message" },
      { href: "/student/portfolio" as Route, label: "Hồ sơ của bạn", short: "Hồ sơ", icon: "briefcase" },
      { href: "/student/ai", label: "Trợ lý AI", short: "AI", icon: "sparkle", newTab: true, mobile: true, featured: true },
      { href: "/student/account", label: "Tài khoản", icon: "user", tabs: [{ href: "/student/account", label: "Thông tin sinh viên", exact: true }, { href: "/student/profile-update" as Route, label: "Đề xuất cập nhật thông tin" }, { href: "/student/services", label: "Thủ tục & góp ý" }, { href: "/student/settings" as Route, label: "Cài đặt & Đổi mật khẩu" }] },
    ],
  },
];

const collapseKey = "sao-do:sidebar-collapsed";
/** The AI workspace is a full-page tool; it opens beside the portal rather than replacing it. */
export const newTab = { target: "_blank", rel: "noopener" } as const;

const studentSearchCatalog: SearchSuggestion[] = [
  { id: "s-home", label: "Tổng quan", detail: "Bảng điều khiển học tập, tiến độ và lịch hôm nay", category: "Mục chính", href: "/student" as Route, icon: "home", keywords: "trang chu dashboard bang dieu khien hom nay" },
  { id: "s-notices", label: "Thông báo", detail: "Thông báo đào tạo, khảo thí, tài chính và công tác sinh viên", category: "Tổng quan", href: "/student/notices" as Route, icon: "bell", keywords: "thong bao tin nhan nhac nho phong dao tao" },
  { id: "s-schedule", label: "Lịch tuần (Thời khóa biểu)", detail: "Lịch học theo tuần, phòng học và tiết học", category: "Lịch", href: "/student/schedule" as Route, icon: "calendar", keywords: "lich hoc thoi khoa bieu tkb tuan phong hoc tiet" },
  { id: "s-schedule-progress", label: "Lịch theo tiến độ", detail: "Lịch học toàn kỳ theo tiến độ tuần bắt đầu và kết thúc", category: "Lịch", href: "/student/schedule-progress" as Route, icon: "calendar", keywords: "lich theo tien do toan ky tuan hoc" },
  { id: "s-exams", label: "Lịch thi", detail: "Lịch thi giữa kỳ, cuối kỳ, phòng thi và số báo danh", category: "Lịch", href: "/student/exams" as Route, icon: "clock", keywords: "lich thi phong thi sbd giua ky cuoi ky khao thi" },
  { id: "s-assignments", label: "Bài tập", detail: "Danh sách bài tập được giao, hạn nộp và phản hồi", category: "Học tập", href: "/student/assignments" as Route, icon: "assignment", keywords: "bai tap deadline han nop nop bai" },
  { id: "s-classes", label: "Lớp học", detail: "Các lớp học phần đang theo học và giảng viên phụ trách", category: "Học tập", href: "/student/classes" as Route, icon: "class", keywords: "lop hoc mon hoc hoc phan giang vien" },
  { id: "s-grades", label: "Kết quả học tập (Bảng điểm)", detail: "Điểm chuyên cần, giữa kỳ, cuối kỳ và GPA tích lũy", category: "Học tập", href: "/student/grades" as Route, icon: "award", keywords: "ket qua diem bang diem gpa xep loai hoc luc" },
  { id: "s-attendance", label: "Thông tin điểm danh", detail: "Tra cứu số tiết học, số tiết vắng có phép và không phép", category: "Học tập", href: "/student/attendance" as Route, icon: "checkCircle", keywords: "thong tin diem danh vang co phep khong phep chuyen can" },
  { id: "s-registration", label: "Đăng ký học phần", detail: "Đăng ký tín chỉ, tra cứu lớp học phần mở kỳ tới", category: "Đào tạo", href: "/student/registration" as Route, icon: "clipboard", keywords: "dang ky hoc phan dkhp tin chi mon hoc" },
  { id: "s-curriculum", label: "Chương trình khung", detail: "Khung chương trình đào tạo toàn khóa, môn bắt buộc và tự chọn", category: "Đào tạo", href: "/student/curriculum" as Route, icon: "book", keywords: "chuong trinh khung ctkt bat buoc tu chon tin chi" },
  { id: "s-tuition", label: "Học phí & Công nợ", detail: "Hóa đơn học phí, bảo hiểm y tế và lịch sử thanh toán", category: "Tài chính", href: "/student/tuition" as Route, icon: "wallet", keywords: "hoc phi cong no thanh toan tien hoc bhyt hoa don" },
  { id: "s-receipts", label: "Phiếu thu trực tuyến & Phiếu thu tổng hợp", detail: "Tra cứu và in biên lai thu học phí điện tử theo từng đợt", category: "Tài chính", href: "/student/receipts" as Route, icon: "file", keywords: "phieu thu truc tuyen phieu thu tong hop bien lai hoa don" },
  { id: "s-activities", label: "Sự kiện & Điểm rèn luyện", detail: "Hoạt động ngoại khóa, tình nguyện, hiến máu", category: "Hoạt động", href: "/student/activities" as Route, icon: "flag", keywords: "hoat dong su kien diem ren luyen tinh nguyen hien mau" },
  { id: "s-clubs", label: "Câu lạc bộ sinh viên", detail: "CLB Tin học Sao Đỏ, Tiếng Anh SEC, Tình nguyện Hoa Phượng", category: "Hoạt động", href: "/student/clubs" as Route, icon: "users", keywords: "cau lac bo clb doi nhom ngoai khoa" },
  { id: "s-news", label: "Tin tức nhà trường", detail: "Bản tin và hoạt động mới nhất của Đại học Sao Đỏ", category: "Tin tức", href: "/student/news" as Route, icon: "news", keywords: "tin tuc su kien truong dai hoc sao do" },
  { id: "s-community", label: "Cộng đồng sinh viên", detail: "Phòng trò chuyện, hỏi đáp và chia sẻ tài liệu", category: "Cộng đồng", href: "/student/community" as Route, icon: "message", keywords: "cong dong chat thao luan nhan tin" },
  { id: "s-ai", label: "Trợ lý AI học tập", detail: "Hỏi bài, giải thích thuật toán, ôn thi cùng AI", category: "Công cụ", href: "/student/ai" as Route, icon: "sparkle", newTab: true, keywords: "tro ly ai hoi bai on thi giai bai tap" },
  { id: "s-portfolio", label: "Hồ sơ của bạn (Hồ sơ năng lực mẫu)", detail: "Góc nhìn khách quan 360° về năng lực, học thuật, rèn luyện và xuất biểu mẫu chỉnh sửa", category: "Hồ sơ", href: "/student/portfolio" as Route, icon: "briefcase", keywords: "ho so cua ban ho so mau danh gia khach quan cv portfolio xuat form chinh sua" },
  { id: "s-account", label: "Thông tin sinh viên", detail: "Hồ sơ cá nhân, mã sinh viên, lớp niên chế", category: "Tài khoản", href: "/student/account" as Route, icon: "user", keywords: "tai khoan ho so ca nhan thong tin sinh vien" },
  { id: "s-profile-update", label: "Đề xuất cập nhật thông tin", detail: "Đề xuất chỉnh sửa hồ sơ cá nhân, tài khoản ngân hàng và BHYT", category: "Tài khoản", href: "/student/profile-update" as Route, icon: "pen", keywords: "de xuat cap nhat thong tin ngan hang bhyt ho so" },
  { id: "s-services", label: "Thủ tục & Góp ý (Một cửa)", detail: "Xin giấy xác nhận sinh viên, cấp bảng điểm, làm lại thẻ", category: "Tài khoản", href: "/student/services" as Route, icon: "file", keywords: "thu tuc mot cua giay xac nhan bang diem the sinh vien bao luu gop y" },
  { id: "s-settings", label: "Cài đặt giao diện & hệ thống", detail: "Điều chỉnh giao diện Sáng / Tối, đổi mật khẩu và lối tắt Quản lý", category: "Tài khoản", href: "/student/settings" as Route, icon: "sparkle", keywords: "cai dat giao dien sang toi dark mode light mode theme doi mat khau" },
  { id: "s-admin-dash", label: "Dashboard Quản lý tài khoản & phân quyền", detail: "Trang quản lý các loại tài khoản: Giảng viên, Trưởng CLB, Sinh viên thuộc lớp", category: "Quản lý", href: "/quan-tri/tai-khoan" as Route, icon: "shield", keywords: "dashboard quan ly tai khoan phan quyen giao vien truong clb" },
  { id: "c-it3040", label: "IT3040 · Lập trình hướng đối tượng", detail: "ThS. Trần Minh Đức · 3 tín chỉ · A1-301 / B1-Lab 3", category: "Học phần", href: "/student/schedule" as Route, icon: "code", keywords: "it3040 oop lap trinh huong doi tuong ke thua da hinh" },
  { id: "c-it3090", label: "IT3090 · Cơ sở dữ liệu", detail: "TS. Phạm Thu Hà · 3 tín chỉ · A1-402 / B1-Lab 1", category: "Học phần", href: "/student/schedule" as Route, icon: "book", keywords: "it3090 csdl co so du lieu sql truy van" },
  { id: "c-it3080", label: "IT3080 · Mạng máy tính", detail: "ThS. Lê Quang Vinh · 3 tín chỉ · A1-301 / B1-Lab 2", category: "Học phần", href: "/student/schedule" as Route, icon: "book", keywords: "it3080 mang may tinh network" },
  { id: "c-en2130", label: "EN2130 · Tiếng Anh chuyên ngành", detail: "ThS. Đỗ Thanh Mai · 2 tín chỉ · C1-104", category: "Học phần", href: "/student/schedule" as Route, icon: "language", keywords: "en2130 tieng anh chuyen nganh english" },
  { id: "c-mi1140", label: "MI1140 · Toán rời rạc", detail: "TS. Vũ Đình Khoa · 3 tín chỉ · A2-205", category: "Học phần", href: "/student/schedule" as Route, icon: "book", keywords: "mi1140 toan roi rac discrete math" },
];

const managementSearchCatalog: SearchSuggestion[] = [
  { id: "m-portal", label: "Lớp học & Bài tập", detail: "Quản lý lớp học phần, giao bài tập và chấm phản hồi", category: "Quản lý", href: "/portal" as Route, icon: "class", keywords: "lop hoc bai tap giao bai cham bai phan hoi" },
  { id: "m-students", label: "Danh sách sinh viên", detail: "Tra cứu hồ sơ, tìm kiếm và quản lý tài khoản sinh viên", category: "Quản lý", href: "/quan-tri" as Route, icon: "users", keywords: "sinh vien danh sach ho so tra cuu" },
  { id: "m-import", label: "Nhập sinh viên từ tệp CSV", detail: "Tải lên danh sách sinh viên hàng loạt từ bảng tính", category: "Quản lý", href: "/quan-tri/nhap" as Route, icon: "file", keywords: "nhap tu tep csv excel import" },
  { id: "m-news", label: "Quản trị tin tức", detail: "Đồng bộ và biên tập bản tin nhà trường", category: "Quản lý", href: "/quan-tri/tin-tuc" as Route, icon: "news", keywords: "tin tuc dong bo bai viet" },
  { id: "m-password", label: "Đổi mật khẩu", detail: "Cập nhật mật khẩu tài khoản cán bộ / giảng viên", category: "Tài khoản", href: "/doi-mat-khau" as Route, icon: "shield", keywords: "doi mat khau bao mat tai khoan" },
];

const guestSearchCatalog: SearchSuggestion[] = [
  { id: "g-dash", label: "Bảng điều khiển (Tổng quan)", detail: "Trang tổng quan học tập chế độ khách", category: "Tổng quan", href: "/guest" as Route, icon: "home", keywords: "bang dieu khien tong quan trang chu" },
  { id: "g-progress", label: "Tiến độ nộp bài", detail: "Biểu đồ số bài tập đến hạn trong 8 tuần tới", category: "Tổng quan", href: "/guest#tien-do" as Route, icon: "trend", keywords: "tien do nop bai bieu do thong ke tuan" },
  { id: "g-summary", label: "Tổng quan học tập & Lớp đang học", detail: "3 lớp học phần · 5 bài tập được giao · 1 phản hồi", category: "Tổng quan", href: "/guest#tong-quan-hoc-tap" as Route, icon: "book", keywords: "tong quan hoc tap lop dang hoc thong ke" },
  { id: "g-table", label: "Bài tập & Hạn nộp", detail: "Danh sách bài tập minh họa và trạng thái hạn nộp", category: "Học tập", href: "/guest#bang-bai-tap" as Route, icon: "list", keywords: "bai tap han nop danh sach deadline" },
  { id: "g-ai", label: "Trợ lý học tập AI", detail: "Minh họa hỏi bài và giải thích lập trình hướng đối tượng", category: "Công cụ", href: "/guest#ai-demo" as Route, icon: "sparkle", keywords: "tro ly ai hoi bai da hinh oop chat" },
  { id: "g-a1", label: "Bài thực hành: Kế thừa và đa hình", detail: "Lập trình hướng đối tượng · Sắp đến hạn", category: "Bài tập", href: "/guest#bang-bai-tap" as Route, icon: "assignment", keywords: "bai thuc hanh ke thua va da hinh oop" },
  { id: "g-a2", label: "Thiết kế lược đồ quan hệ cho thư viện", detail: "Cơ sở dữ liệu · Hạn nộp 5 ngày tới", category: "Bài tập", href: "/guest#bang-bai-tap" as Route, icon: "assignment", keywords: "thiet ke luoc do quan he thu vien csdl sql" },
  { id: "g-a3", label: "Viết email xin thực tập (150 từ)", detail: "Tiếng Anh chuyên ngành · Hạn nộp 9 ngày tới", category: "Bài tập", href: "/guest#bang-bai-tap" as Route, icon: "assignment", keywords: "viet email xin thuc tap tieng anh" },
  { id: "g-a4", label: "Truy vấn SQL cơ bản", detail: "Cơ sở dữ liệu · Đã có phản hồi giảng viên", category: "Bài tập", href: "/guest#bang-bai-tap" as Route, icon: "checkCircle", keywords: "truy van sql co ban join csdl phan hoi" },
  { id: "g-a5", label: "Thiết kế lớp cho hệ thống thư viện", detail: "Lập trình hướng đối tượng · Hạn nộp 13 ngày tới", category: "Bài tập", href: "/guest#bang-bai-tap" as Route, icon: "assignment", keywords: "thiet ke lop he thong thu vien oop" },
  { id: "g-c1", label: "Lập trình hướng đối tượng (IT3040)", detail: "Lớp học phần · 2 bài tập · ThS. Trần Minh Đức", category: "Lớp học", href: "/guest#tong-quan-hoc-tap" as Route, icon: "class", keywords: "lap trinh huong doi tuong it3040 oop" },
  { id: "g-c2", label: "Cơ sở dữ liệu (IT3090)", detail: "Lớp học phần · 2 bài tập · TS. Phạm Thu Hà", category: "Lớp học", href: "/guest#tong-quan-hoc-tap" as Route, icon: "class", keywords: "co so du lieu it3090 csdl sql" },
  { id: "g-c3", label: "Tiếng Anh chuyên ngành (EN2130)", detail: "Lớp học phần · 1 bài tập · ThS. Đỗ Thanh Mai", category: "Lớp học", href: "/guest#tong-quan-hoc-tap" as Route, icon: "language", keywords: "tieng anh chuyen nganh en2130 english" },
  { id: "g-schedule", label: "Lịch tuần (Thời khóa biểu)", detail: "Xem lịch học theo tuần, phòng học và tiết học", category: "Lịch", href: "/login" as Route, icon: "calendar", keywords: "lich hoc thoi khoa bieu tkb tuan" },
  { id: "g-exams", label: "Lịch thi học kỳ", detail: "Tra cứu lịch thi giữa kỳ, cuối kỳ, số báo danh", category: "Lịch", href: "/login" as Route, icon: "clock", keywords: "lich thi phong thi sbd khao thi" },
  { id: "g-grades", label: "Kết quả học tập & Bảng điểm", detail: "Điểm chuyên cần, giữa kỳ, cuối kỳ và GPA", category: "Học tập", href: "/login" as Route, icon: "award", keywords: "ket qua diem bang diem gpa" },
  { id: "g-registration", label: "Đăng ký học phần", detail: "Đăng ký tín chỉ và tra cứu lớp học phần mở", category: "Đào tạo", href: "/login" as Route, icon: "clipboard", keywords: "dang ky hoc phan dkhp tin chi" },
  { id: "g-tuition", label: "Học phí & Công nợ", detail: "Tra cứu hóa đơn học phí, bảo hiểm y tế", category: "Tài chính", href: "/login" as Route, icon: "wallet", keywords: "hoc phi cong no thanh toan tien hoc" },
  { id: "g-activities", label: "Sự kiện & Điểm rèn luyện", detail: "Hoạt động ngoại khóa, tình nguyện, hiến máu", category: "Hoạt động", href: "/login" as Route, icon: "flag", keywords: "hoat dong su kien diem ren luyen tinh nguyen" },
  { id: "g-clubs", label: "Câu lạc bộ sinh viên", detail: "CLB Tin học, Tiếng Anh SEC, Tình nguyện Hoa Phượng", category: "Hoạt động", href: "/login" as Route, icon: "users", keywords: "cau lac bo clb doi nhom" },
  { id: "g-news", label: "Tin tức nhà trường", detail: "Bản tin và sự kiện mới nhất của Đại học Sao Đỏ", category: "Tin tức", href: "/login" as Route, icon: "news", keywords: "tin tuc ban tin truong sao do" },
  { id: "g-community", label: "Cộng đồng sinh viên", detail: "Phòng trò chuyện, thảo luận và chia sẻ tài liệu", category: "Cộng đồng", href: "/login" as Route, icon: "message", keywords: "cong dong chat thao luan" },
  { id: "g-services", label: "Thủ tục & Góp ý (Một cửa)", detail: "Xin giấy xác nhận sinh viên, cấp bảng điểm, làm lại thẻ", category: "Tài khoản", href: "/login" as Route, icon: "file", keywords: "thu tuc mot cua giay xac nhan bang diem" },
  { id: "g-login", label: "Đăng nhập tài khoản", detail: "Đăng nhập bằng tài khoản sinh viên hoặc giảng viên", category: "Tài khoản", href: "/login" as Route, icon: "user", keywords: "dang nhap login tai khoan sinh vien giang vien" },
];

function foldVi(input: string): string {
  return input
    .normalize("NFC")
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

function initialsOf(folded: string): string {
  return folded
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
}

function renderHighlighted(text: string, rawQuery: string): React.ReactNode {
  const clean = rawQuery.trim();
  if (!clean) return text;
  const nfcText = text.normalize("NFC");
  const foldedText = foldVi(nfcText);
  const tokens = foldVi(clean).split(/\s+/).filter(Boolean);
  const token = tokens.find((part) => foldedText.includes(part));
  if (!token) return text;
  const idx = foldedText.indexOf(token);
  if (idx < 0) return text;
  return (
    <>
      {nfcText.slice(0, idx)}
      <mark className="top-search-mark">{nfcText.slice(idx, idx + token.length)}</mark>
      {nfcText.slice(idx + token.length)}
    </>
  );
}

export function AppShell({
  nav,
  user,
  sideCard,
  searchAction,
  notifications,
  profileHref,
  noticesHref,
  tag = "SV",
  searchLabel = "Tìm mục, học phần, bài tập",
  searchItems,
  headerActions,
  children,
}: {
  nav: NavGroup[];
  user: { name: string; role: string; initial: string; avatarUrl?: string | null } | null;
  sideCard?: React.ReactNode;
  /** Plain GET form target, so search works without JavaScript. */
  searchAction: Route;
  notifications: Notification[] | null;
  profileHref: Route;
  /** Page listing every notice, linked from the bell. */
  noticesHref?: Route;
  /** Short badge beside the logo naming the area (SV, QT…). */
  tag?: string;
  searchLabel?: string;
  /** Optional contextual items (assignments, classes, sections) for live autocomplete. */
  searchItems?: SearchSuggestion[];
  /** Optional role/account switcher rendered in the top bar. */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = usePhuongTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchWrapRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setCollapsed(localStorage.getItem(collapseKey) === "1");
      } catch {
        // Preference only.
      }
    });
  }, []);

  function toggle() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(collapseKey, value ? "0" : "1");
      } catch {
        // Preference only.
      }
      return !value;
    });
  }

  // The highlight moves on click, before the next route finishes loading; it falls back to the
  // real pathname as soon as that changes, so no reset effect is needed.
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  const here = pending && pending.from === pathname ? pending.to : pathname;
  const go = (href: string) => (event: React.MouseEvent) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setPending({ from: pathname, to: href });
  };
  const matches = (href: string, exact?: boolean) => (exact ? here === href : here === href || here.startsWith(`${href}/`));
  const isCurrent = (item: NavItem): boolean =>
    item.tabs ? item.tabs.some((tab) => matches(tab.href, tab.exact)) : matches(item.href, item.exact);
  const items = nav.flatMap((group) => group.items);
  const section = items.find(isCurrent);
  const title = section?.tabs?.find((tab) => matches(tab.href, tab.exact))?.label ?? section?.label ?? "";
  const { attach: navRef, style: navStyle, ready: navReady } = useSlider<HTMLElement>(`${here}|${collapsed}`);
  const { attach: tabRef, style: tabStyle, ready: tabReady } = useSlider<HTMLElement>(here);

  // Direction of travel for the content entrance: down/up between sidebar entries,
  // left/right between tabs of one entry. Derived during render from the previous route.
  const sectionIndex = section ? items.indexOf(section) : -1;
  const tabIndex = section?.tabs?.findIndex((tab) => matches(tab.href, tab.exact)) ?? 0;
  const [travel, setTravel] = useState({ path: pathname, section: sectionIndex, tab: tabIndex, dir: "none" });
  if (travel.path !== pathname) {
    const dir =
      travel.section === sectionIndex
        ? tabIndex > travel.tab ? "right" : "left"
        : sectionIndex > travel.section ? "down" : "up";
    setTravel({ path: pathname, section: sectionIndex, tab: tabIndex, dir });
  }

  const allSuggestions = useMemo(() => {
    const base =
      pathname.startsWith("/guest")
        ? guestSearchCatalog
        : tag === "QL"
          ? managementSearchCatalog
          : studentSearchCatalog;
    const fromNav: SearchSuggestion[] = [];
    for (const group of nav) {
      for (const item of group.items) {
        fromNav.push({
          id: `nav-${item.href}`,
          label: item.label,
          detail: item.tabs ? item.tabs.map((t) => t.label).join(" · ") : group.label || "Đi tới mục này",
          category: group.label || "Điều hướng",
          href: item.href,
          icon: item.icon,
          newTab: item.newTab,
        });
        if (item.tabs) {
          for (const tab of item.tabs) {
            fromNav.push({
              id: `tab-${tab.href}`,
              label: tab.label,
              detail: `Thuộc mục ${item.label}`,
              category: item.label,
              href: tab.href,
              icon: item.icon,
            });
          }
        }
      }
    }
    const merged: SearchSuggestion[] = [];
    const seen = new Set<string>();
    for (const entry of [...(searchItems ?? []), ...base, ...fromNav]) {
      const key = `${entry.label.toLocaleLowerCase("vi")}|${entry.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
    return merged;
  }, [nav, pathname, searchItems, tag]);

  const filteredSuggestions = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return allSuggestions.slice(0, 7);
    const qLower = raw.toLocaleLowerCase("vi");
    const qFolded = foldVi(raw);
    const tokens = qFolded.split(/\s+/).filter(Boolean);

    const scored: { item: SearchSuggestion; score: number }[] = [];
    for (const item of allSuggestions) {
      const labelLower = item.label.toLocaleLowerCase("vi");
      const labelFold = foldVi(item.label);
      const detailFold = foldVi(item.detail ?? "");
      const catFold = foldVi(item.category);
      const kwFold = foldVi(item.keywords ?? "");
      const labelInitials = initialsOf(labelFold);
      const fullText = `${labelFold} ${catFold} ${detailFold} ${kwFold} ${labelInitials}`;

      if (!tokens.every((token) => fullText.includes(token))) continue;

      let score = 10;
      if (labelLower === qLower || labelFold === qFolded) score += 120;
      else if (labelLower.startsWith(qLower)) score += 100;
      else if (labelFold.startsWith(qFolded)) score += 92;
      else if (labelFold.split(/[^a-z0-9]+/).some((w) => w.startsWith(qFolded))) score += 82;
      else if (labelFold.includes(qFolded)) score += 70;
      else if (labelInitials.startsWith(qFolded)) score += 65;

      for (const token of tokens) {
        if (labelFold.startsWith(token)) score += 18;
        else if (labelFold.includes(token)) score += 12;
        if (catFold.includes(token)) score += 6;
        if (detailFold.includes(token)) score += 4;
      }
      scored.push({ item, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => entry.item);
  }, [allSuggestions, searchQuery]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
        return;
      }
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || (event.target as HTMLElement | null)?.isContentEditable)
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function selectSuggestion(item: SearchSuggestion) {
    setSearchOpen(false);
    if (item.newTab) {
      window.open(item.href, "_blank", "noopener");
      return;
    }
    const hrefStr = String(item.href);
    const hashIdx = hrefStr.indexOf("#");
    if (hashIdx >= 0) {
      const basePath = hrefStr.slice(0, hashIdx) || pathname;
      const hashId = hrefStr.slice(hashIdx + 1);
      if (basePath === pathname) {
        const el = document.getElementById(hashId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", hrefStr);
          return;
        }
      }
    }
    setPending({ from: pathname, to: item.href });
    router.push(item.href);
  }
  const link = (item: NavItem, compact = false) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isCurrent(item) ? "page" : undefined}
      title={item.newTab ? `${item.label} (mở tab mới)` : item.label}
      {...(item.newTab ? newTab : { onClick: go(item.href) })}
    >
      <Icon name={item.icon} />
      <span>{compact ? (item.short ?? item.label) : item.label}</span>
    </Link>
  );

  return (
    <div className={`app-shell sd-app ${phuongFonts}${collapsed ? " is-collapsed" : ""}`} data-theme={theme}>
      <aside className="app-side">
        <div className="side-brand">
          <Link href="/" className="brand-lockup" aria-label="Đại học Sao Đỏ, trang chủ">
            <Image src="/sao-do-logo.png" alt="" width={36} height={38} priority />
            <span>
              <strong>Sao Đỏ</strong>
              <small>Cổng học tập</small>
            </span>
          </Link>
        </div>
        <nav className="app-nav" aria-label="Điều hướng chính" ref={navRef}>
          <span className={`nav-slider${navReady ? " is-ready" : ""}`} style={navStyle} aria-hidden="true" />
          {nav.map((group) => (
            <div key={group.label} className="nav-group">
              {group.label && <p>{group.label}</p>}
              {group.items.filter((item) => !item.featured).map((item) => link(item))}
            </div>
          ))}
        </nav>
        {items
          .filter((item) => item.featured)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="side-feature"
              title={`${item.label} (mở tab mới)`}
              {...(item.newTab ? newTab : {})}
              onClick={(event) => {
                // Launch flourish; the new tab opens immediately (a delay would get it blocked as a popup).
                const button = event.currentTarget;
                button.classList.remove("is-launching");
                void button.offsetWidth;
                button.classList.add("is-launching");
                window.setTimeout(() => button.classList.remove("is-launching"), 700);
              }}
            >
              <Icon name={item.icon} />
              <span>
                <strong>{item.label}</strong>
                <small>Hỏi bài, ôn thi</small>
              </span>
              <Icon name="arrow" />
            </Link>
          ))}
        {sideCard}
      </aside>

      <div className="app-main">
        <header className="app-top">
          <button className="icon-button side-toggle" type="button" onClick={toggle} aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"} aria-pressed={collapsed}>
            <Icon name="panel" />
          </button>
          <Link href="/" className="brand-lockup top-brand" aria-label="Về trang chủ">
            <Image src="/sao-do-logo.png" alt="" width={32} height={34} />
          </Link>
          <h1 className="sr-only">{title}</h1>
          <form
            ref={searchWrapRef}
            className={`top-search${searchOpen ? " is-open" : ""}`}
            action={searchAction}
            role="search"
            onSubmit={(event) => {
              const target = filteredSuggestions[activeIndex] ?? filteredSuggestions[0];
              if (target) {
                event.preventDefault();
                selectSuggestion(target);
              }
            }}
          >
            <Icon name="search" />
            <label className="sr-only" htmlFor="top-search">{searchLabel}</label>
            <input
              ref={searchInputRef}
              id="top-search"
              name="q"
              type="search"
              value={searchQuery}
              placeholder={`${searchLabel}…`}
              autoComplete="off"
              role="combobox"
              aria-expanded={searchOpen}
              aria-controls="top-search-listbox"
              aria-autocomplete="list"
              aria-activedescendant={searchOpen && filteredSuggestions[activeIndex] ? `search-opt-${filteredSuggestions[activeIndex].id}` : undefined}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setActiveIndex(0);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchOpen(true);
                  if (filteredSuggestions.length > 0) {
                    setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
                  }
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSearchOpen(true);
                  if (filteredSuggestions.length > 0) {
                    setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                  }
                } else if (event.key === "Escape") {
                  if (searchOpen) {
                    event.preventDefault();
                    setSearchOpen(false);
                  }
                }
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                className="top-search-clear"
                aria-label="Xóa nội dung tìm kiếm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveIndex(0);
                  searchInputRef.current?.focus();
                }}
              >
                <Icon name="close" />
              </button>
            ) : (
              <kbd className="top-search-kbd" aria-hidden="true">/</kbd>
            )}
            {searchOpen && (
              <div className="top-search-panel">
                <div className="top-search-head">
                  <span>{searchQuery.trim() ? `Gợi ý cho “${searchQuery.trim()}”` : "Gợi ý mục tìm kiếm"}</span>
                  <small>{filteredSuggestions.length} mục</small>
                </div>
                {filteredSuggestions.length > 0 ? (
                  <ul id="top-search-listbox" className="top-search-list" role="listbox" aria-label="Gợi ý tìm kiếm">
                    {filteredSuggestions.map((item, index) => {
                      const isActive = index === activeIndex;
                      return (
                        <li
                          key={item.id}
                          id={`search-opt-${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          className={`top-search-option${isActive ? " is-active" : ""}`}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <button
                            type="button"
                            onClick={() => selectSuggestion(item)}
                          >
                            <span className="top-search-icon">
                              <Icon name={item.icon} />
                            </span>
                            <span className="top-search-body">
                              <span className="top-search-row">
                                <strong>{renderHighlighted(item.label, searchQuery)}</strong>
                                <span className="top-search-badge">{item.category}</span>
                              </span>
                              {item.detail && <small>{renderHighlighted(item.detail, searchQuery)}</small>}
                            </span>
                            <span className="top-search-go" aria-hidden="true">
                              <Icon name={item.newTab ? "external" : "arrow"} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="top-search-empty">
                    <p>Không tìm thấy mục nào khớp với <strong>“{searchQuery.trim()}”</strong>.</p>
                    <small>Thử tìm theo tên mục (Lịch thi, Học phí, CLB, Bài tập, AI…)</small>
                  </div>
                )}
                <div className="top-search-foot">
                  <span><kbd>↑</kbd><kbd>↓</kbd> chọn mục</span>
                  <span><kbd>↵</kbd> đi tới</span>
                  <span><kbd>Esc</kbd> đóng</span>
                </div>
              </div>
            )}
          </form>
          <div className="top-actions">
            {headerActions}
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={(event) => toggleTheme(event)}
              aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button
              className="icon-button bell"
              type="button"
              popoverTarget="notifications"
              aria-label={notifications?.length ? `Thông báo, ${notifications.length} phản hồi mới` : "Thông báo"}
            >
              <Icon name="bell" />
              {Boolean(notifications?.length) && <span className="dot" aria-hidden="true" />}
            </button>
            <div id="notifications" popover="auto" className="popover-panel">
              <strong>Thông báo</strong>
              {notifications?.length ? (
                <ul>
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href}>
                        <span className="tile-icon green"><Icon name="message" /></span>
                        <span className="item-text">
                          <strong>{item.title}</strong>
                          <small>{item.text}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa có thông báo mới.</p>
              )}
              {noticesHref && (
                <Link className="popover-all" href={noticesHref} onClick={() => document.getElementById("notifications")?.hidePopover()}>
                  Xem tất cả thông báo <Icon name="arrow" />
                </Link>
              )}
            </div>
            <Link href={profileHref} className="avatar" aria-label={user ? `Tài khoản của ${user.name}` : "Tài khoản"}>
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="avatar-img" /> : (user?.initial ?? "")}
            </Link>
          </div>
        </header>
        <main className="app-content" id="noi-dung">
          {section?.tabs && (
            <nav className="section-tabs" aria-label={section.label} ref={tabRef}>
              <span className={`tab-slider${tabReady ? " is-ready" : ""}`} style={tabStyle} aria-hidden="true" />
              {section.tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} aria-current={matches(tab.href, tab.exact) ? "page" : undefined} onClick={go(tab.href)}>
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
          <div key={pathname} className="page-enter" data-dir={travel.dir}>
            {children}
          </div>
        </main>
        <footer className="app-footer">
          <span>© 2026 Đại học Sao Đỏ. Cổng học tập sinh viên</span>
          <span>{user ? `${user.name} · ${user.role}` : ""}</span>
        </footer>
      </div>

      <nav className="app-bottom" aria-label="Điều hướng nhanh">
        {(items.some((item) => item.mobile) ? items.filter((item) => item.mobile) : items).map((item) => link(item, true))}
        {items.some((item) => !item.mobile) && items.some((item) => item.mobile) && (
          <button type="button" popoverTarget="more-nav" aria-label="Tất cả chức năng">
            <Icon name="grid" />
            <span>Thêm</span>
          </button>
        )}
      </nav>
      <div id="more-nav" popover="auto" className="more-sheet">
        <strong>Tất cả chức năng</strong>
        {nav.map((group) => (
          <div key={group.label} className="more-group">
            {group.label && <p>{group.label}</p>}
            <div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(item) ? "page" : undefined}
                  onClick={() => document.getElementById("more-nav")?.hidePopover()}
                  {...(item.newTab ? newTab : {})}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
