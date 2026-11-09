// Catalog of SDU sample course materials (Syllabi, Textbooks, Lecture Slides, Exercises)
// used for both Student Class pages and AI Study Assistant RAG / attachment demos.

export type MaterialCategory = "syllabus" | "textbook" | "slide" | "exercise";

export type CourseMaterial = {
  id: string;
  courseCode: string;
  courseName: string;
  classId?: string;
  credits: number;
  lecturer: string;
  room: string;
  semester: string;
  category: MaterialCategory;
  title: string;
  fileName: string;
  /** Static public path under apps/web/public/hoc-lieu/ (or blob/data URL for custom uploads). */
  publicUrl: string;
  pageCount: number;
  updatedAt: string;
  summary: string;
  samplePrompt: string;
  keywords: string[];
  /** Structured full academic text indexed for grounded AI answers and PDF generation. */
  content: string;
  isCustom?: boolean;
};

export const MATERIAL_CATEGORY_META: Record<
  MaterialCategory,
  { label: string; shortLabel: string; badgeTone: string }
> = {
  syllabus: { label: "Đề cương học phần", shortLabel: "Đề cương", badgeTone: "indigo" },
  textbook: { label: "Giáo trình môn học", shortLabel: "Giáo trình", badgeTone: "crimson" },
  slide: { label: "Slide bài giảng", shortLabel: "Slide", badgeTone: "amber" },
  exercise: { label: "Bài tập & Thực hành", shortLabel: "Bài tập", badgeTone: "emerald" },
};

export const COURSE_MATERIAL_GROUPS: {
  courseCode: string;
  courseName: string;
  classId?: string;
  lecturer: string;
  room: string;
  credits: number;
}[] = [
  {
    courseCode: "IT3040",
    courseName: "Lập trình hướng đối tượng",
    classId: "11111111-1111-4111-8111-111111111101",
    lecturer: "ThS. Trần Minh Đức",
    room: "B1-201 / B1-203",
    credits: 3,
  },
  {
    courseCode: "IT3090",
    courseName: "Cơ sở dữ liệu",
    classId: "11111111-1111-4111-8111-111111111102",
    lecturer: "TS. Phạm Thu Hà",
    room: "B1-204 / B1-201",
    credits: 3,
  },
  {
    courseCode: "0101071809",
    courseName: "Xử lý ảnh",
    lecturer: "TS. Nguyễn Văn Hòa",
    room: "B1-202 / B1-201",
    credits: 3,
  },
  {
    courseCode: "0101103389",
    courseName: "Dữ liệu lớn - Big Data",
    lecturer: "ThS. Lê Thị Hồng",
    room: "B1-302 / B1-204",
    credits: 3,
  },
  {
    courseCode: "EN2130",
    courseName: "Tiếng Anh chuyên ngành CNTT",
    classId: "11111111-1111-4111-8111-111111111103",
    lecturer: "ThS. Đỗ Thanh Mai",
    room: "B1-104",
    credits: 2,
  },
];

export const BUILTIN_COURSE_MATERIALS: CourseMaterial[] = [
  // ==================== 1. IT3040 - LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG ====================
  {
    id: "it3040-syllabus",
    courseCode: "IT3040",
    courseName: "Lập trình hướng đối tượng",
    classId: "11111111-1111-4111-8111-111111111101",
    credits: 3,
    lecturer: "ThS. Trần Minh Đức",
    room: "B1-201 / B1-203",
    semester: "HK1 2026-2027",
    category: "syllabus",
    title: "Đề cương chi tiết học phần Lập trình hướng đối tượng (IT3040)",
    fileName: "IT3040-De-cuong-Lap-trinh-huong-doi-tuong.pdf",
    publicUrl: "/hoc-lieu/IT3040-De-cuong-Lap-trinh-huong-doi-tuong.pdf",
    pageCount: 4,
    updatedAt: "2026-09-05",
    summary: "Chuẩn đầu ra CLO1-CLO4, phân bổ 60 tiết (30 LT phòng B1-201, 30 TH phòng B1-203), trọng số điểm 10/30/60 và lịch trình 15 tuần.",
    samplePrompt: "Tóm tắt chuẩn đầu ra, cách tính điểm và kế hoạch 15 tuần trong đề cương môn Lập trình hướng đối tượng (IT3040).",
    keywords: ["it3040", "oop", "lập trình hướng đối tượng", "đề cương", "chuẩn đầu ra", "clo", "trọng số điểm"],
    content: `TRƯỜNG ĐẠI HỌC SAO ĐỎ - KHOA CÔNG NGHỆ THÔNG TIN
ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN: LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (Mã HP: IT3040)

1. THÔNG TIN CHUNG
- Mã học phần: IT3040 | Số tín chỉ: 3 (2 LT + 1 TH, tổng 60 tiết: 30 tiết lý thuyết tại B1-201, 30 tiết thực hành tại B1-203).
- Giảng viên phụ trách: ThS. Trần Minh Đức - Bộ môn Công nghệ phần mềm.
- Học phần tiên quyết: Tin học đại cương / Kỹ thuật lập trình C.

2. CHUẨN ĐẦU RA HỌC PHẦN (CLO)
- CLO1: Phân tích và áp dụng đúng 4 trụ cột hướng đối tượng: Đóng gói (Encapsulation), Kế thừa (Inheritance), Đa hình (Polymorphism) và Trừu tượng hóa (Abstraction).
- CLO2: Thiết kế sơ đồ lớp UML (Class Diagram), quan hệ Association, Aggregation, Composition và cài đặt hoàn chỉnh bằng C++17 hoặc Java 21.
- CLO3: Vận dụng cơ chế liên kết động (dynamic dispatch), bảng phương thức ảo (vtable), hàm hủy ảo (virtual destructor), quản lý tài nguyên RAII, ngoại lệ và lập trình tổng quát (Template/Generics).
- CLO4: Tổ chức dự án phần mềm nhiều tệp (.h/.cpp hoặc package Java), áp dụng nguyên lý SOLID và viết kiểm thử đơn vị (Unit Test).

3. PHƯƠNG PHÁP ĐÁNH GIÁ & TRỌNG SỐ ĐIỂM
- Điểm chuyên cần (10%): Đi học đầy đủ các buổi lý thuyết tại B1-201 và thực hành tại B1-203 (vắng quá 20% số tiết không được dự thi kết thúc học phần).
- Điểm kiểm tra giữa kỳ & thực hành (30%): Trung bình 2 bài kiểm tra phòng máy tại B1-203 (Tuần 6 và Tuần 11) + bảo vệ bài tập lớn nhóm 2-3 sinh viên.
- Điểm thi kết thúc học phần (60%): Thi thực hành lập trình trên máy 90 phút tại phòng B1-203 (cài đặt sơ đồ lớp, kế thừa - đa hình và xử lý tệp).

4. KẾ HOẠCH GIẢNG DẠY 15 TUẦN
- Tuần 1-2: Tổng quan lập trình hướng đối tượng, lớp (class), đối tượng (object), phạm vi truy cập private/protected/public.
- Tuần 3-4: Hàm tạo (Constructor), hàm tạo sao chép (Copy Constructor), hàm hủy (Destructor), con trỏ this và thành viên tĩnh (static).
- Tuần 5-6: Nạp chồng toán tử (Operator Overloading) trong C++ và kiểm tra thực hành số 1 tại phòng B1-203.
- Tuần 7-8: Kế thừa đơn, kế thừa bội, thứ tự gọi hàm tạo/hàm hủy và vấn đề hình thoi (diamond problem - virtual inheritance).
- Tuần 9-10: Đa hình động, phương thức ảo (virtual), lớp cơ sở trừu tượng (pure virtual), cơ chế vptr/vtable và ép kiểu an toàn dynamic_cast.
- Tuần 11-12: Khuôn mẫu hàm/lớp (Templates/STL, Java Generics & Collections) + kiểm tra thực hành số 2.
- Tuần 13-14: Xử lý ngoại lệ, đọc/ghi luồng tệp và các mẫu thiết kế cơ bản (Factory Method, Strategy, Observer).
- Tuần 15: Bảo vệ bài tập lớn quản lý nghiệp vụ và tổng kết học phần.`,
  },
  {
    id: "it3040-textbook",
    courseCode: "IT3040",
    courseName: "Lập trình hướng đối tượng",
    classId: "11111111-1111-4111-8111-111111111101",
    credits: 3,
    lecturer: "ThS. Trần Minh Đức",
    room: "B1-201 / B1-203",
    semester: "HK1 2026-2027",
    category: "textbook",
    title: "Giáo trình Lập trình hướng đối tượng với C++17 & Java 21",
    fileName: "IT3040-Giao-trinh-Lap-trinh-huong-doi-tuong.pdf",
    publicUrl: "/hoc-lieu/IT3040-Giao-trinh-Lap-trinh-huong-doi-tuong.pdf",
    pageCount: 6,
    updatedAt: "2026-09-10",
    summary: "Giáo trình nội bộ Khoa CNTT trình bày sâu về đóng gói, Rule of Five, đa hình động vptr/vtable, hàm hủy ảo và con trỏ thông minh.",
    samplePrompt: "Dựa vào giáo trình IT3040, hãy giải thích cơ chế vptr/vtable khi gọi phương thức ảo và tại sao lớp cơ sở phải có hàm hủy ảo.",
    keywords: ["it3040", "giáo trình", "vtable", "vptr", "đa hình", "rule of five", "virtual destructor", "unique_ptr"],
    content: `GIÁO TRÌNH LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG VỚI C++17 & JAVA 21 (KHOA CNTT - ĐH SAO ĐỎ)

CHƯƠNG 1. ĐÓNG GÓI DỮ LIỆU VÀ QUẢN LÝ VÒNG ĐỜI ĐỐI TƯỢNG
1.1. Nguyên lý che giấu thông tin (Information Hiding)
Mọi thuộc tính biểu diễn trạng thái bên trong lớp phải khai báo ở phạm vi private để bảo vệ bất biến lớp (class invariant). Ví dụ trong lớp SinhVienSDU, điểm trung bình gpa chỉ được cập nhật qua phương thức capNhatDiem(double diem) có kiểm tra miền hợp lệ [0.0, 10.0].

1.2. Quy tắc Rule of Three / Rule of Five trong C++17
Khi lớp trực tiếp quản lý tài nguyên vùng nhớ động (heap), lập trình viên phải định nghĩa tường minh 5 thành phần: Destructor (~T), Copy Constructor (T(const T&)), Copy Assignment (operator=), Move Constructor (T(T&&) noexcept) và Move Assignment. Trong thực hành hiện đại, ưu tiên dùng std::string, std::vector và std::unique_ptr (Rule of Zero) để tự động giải phóng tài nguyên theo nguyên lý RAII.

CHƯƠNG 2. KẾ THỪA VÀ ĐA HÌNH ĐỘNG (DYNAMIC POLYMORPHISM)
2.1. Liên kết tĩnh (Early Binding) và Liên kết động (Late Binding)
- Nếu phương thức ở lớp cơ sở không có từ khóa virtual (trong C++), trình biên dịch quyết định hàm được gọi ngay lúc biên dịch dựa theo kiểu của con trỏ/tham chiếu, dẫn đến hiện tượng che khuất hàm (method hiding) thay vì đa hình.
- Khi khai báo virtual (hoặc mặc định với các phương thức non-static, non-final trong Java), lời gọi hàm được phân giải tại thời điểm chạy dựa theo kiểu thực tế của đối tượng trên bộ nhớ Heap.

2.2. Cấu trúc bộ nhớ vptr và Bảng phương thức ảo (vtable)
- Mỗi lớp có ít nhất một phương thức ảo sẽ được trình biên dịch sinh ra một bảng tĩnh duy nhất gọi là vtable (mảng các con trỏ hàm trỏ tới bản cài đặt thực thi tương ứng của lớp đó).
- Mỗi thể hiện (object) của lớp đó chứa thêm một con trỏ ẩn vptr (8 byte trên kiến trúc 64-bit) đặt ở đầu đối tượng, được hàm tạo gán trỏ tới vtable của đúng lớp đang khởi tạo.
- Khi thực thi pCanBo->tinhLuong(), CPU thực hiện tra cứu gián tiếp qua *(pCanBo->vptr + slot_index) với chi phí thời gian hằng số O(1) (chỉ tốn thêm 1 lần đọc bộ nhớ so với lời gọi tĩnh).

2.3. Tại sao lớp cơ sở đa hình bắt buộc phải có Hàm hủy ảo (virtual ~Base())
Khi xóa một đối tượng lớp dẫn xuất thông qua con trỏ lớp cơ sở (delete pBase;), nếu ~Base() không phải là virtual, trình biên dịch chỉ gọi ~Base() mà bỏ qua ~Derived(), gây rò rỉ toàn bộ tài nguyên do lớp dẫn xuất cấp phát (hành vi bất định - Undefined Behavior theo chuẩn ISO C++). Khai báo virtual ~CanBo() = default; đảm bảo chuỗi hủy chạy đúng thứ tự từ lớp con ngược lên lớp cha.

CHƯƠNG 3. LỚP TRỪU TƯỢNG, GIAO DIỆN VÀ NGUYÊN LÝ SOLID
- Lớp trừu tượng (Abstract Class) chứa ít nhất một phương thức thuần ảo (virtual double tinhHocBong() const = 0;), không thể khởi tạo trực tiếp mà đóng vai trò hợp đồng khung cho các lớp dẫn xuất.
- Áp dụng Dependency Inversion Principle (DIP): Mô-đun nghiệp vụ cấp cao (QuanLyDaoTao) chỉ phụ thuộc vào giao diện trừu tượng (IRepository), giúp dễ dàng hoán đổi lưu trữ tệp, SQLite hoặc mock khi chạy kiểm thử JUnit/GoogleTest.`,
  },
  {
    id: "it3040-slide",
    courseCode: "IT3040",
    courseName: "Lập trình hướng đối tượng",
    classId: "11111111-1111-4111-8111-111111111101",
    credits: 3,
    lecturer: "ThS. Trần Minh Đức",
    room: "B1-201 / B1-203",
    semester: "HK1 2026-2027",
    category: "slide",
    title: "Slide bài giảng Chương 4: Kế thừa, Đa hình động & Bảng vtable",
    fileName: "IT3040-Slide-Ke-thua-Da-hinh-va-Bang-vtable.pdf",
    publicUrl: "/hoc-lieu/IT3040-Slide-Ke-thua-Da-hinh-va-Bang-vtable.pdf",
    pageCount: 5,
    updatedAt: "2026-10-12",
    summary: "Bộ slide bài giảng tóm tắt so sánh Overloading vs Overriding, sơ đồ vptr/vtable, lỗi Object Slicing và mẫu Strategy.",
    samplePrompt: "Tóm tắt nội dung chính trong slide Chương 4 môn IT3040, đặc biệt là sự khác nhau giữa Overloading, Overriding và lỗi Object Slicing.",
    keywords: ["it3040", "slide", "overloading", "overriding", "object slicing", "strategy", "đa hình"],
    content: `SLIDE BÀI GIẢNG IT3040 - CHƯƠNG 4: KẾ THỪA, ĐA HÌNH ĐỘNG & BẢNG VTABLE
Giảng viên: ThS. Trần Minh Đức | Phòng học: B1-201 (LT) - B1-203 (TH)

[Slide 1-4] Phân biệt Nạp chồng (Overloading) và Ghi đè (Overriding)
- Overloading (Đa hình tĩnh / Compile-time): Cùng tên hàm trong cùng phạm vi, khác danh sách tham số (số lượng hoặc kiểu); kiểu trả về một mình không đủ phân biệt.
- Overriding (Đa hình động / Runtime): Định nghĩa lại phương thức virtual của lớp cha ở lớp con với chữ ký hàm giống hệt; luôn gắn từ khóa override (C++11+) hoặc @Override (Java) để trình biên dịch bắt lỗi gõ sai chữ ký.

[Slide 5-9] Sơ đồ cấp phát bộ nhớ của đối tượng đa hình (x86_64)
- Lớp SinhVien { vptr (8B) | maSV | hoTen } -> vtable_SinhVien: [0: ~SinhVien, 1: diemTongKet(), 2: xepLoai()].
- Lớp SinhVienCLC : public SinhVien { vptr (8B) | maSV | hoTen | diemTiengAnh } -> vtable_SinhVienCLC: [0: ~SinhVienCLC, 1: SinhVienCLC::diemTongKet(), 2: SinhVien::xepLoai()].
- Nhận xét: Phương thức nào lớp con ghi đè thì ô trong vtable trỏ tới hàm lớp con; phương thức không ghi đè vẫn trỏ lại hàm của lớp cha.

[Slide 10-14] Lỗi cắt lát đối tượng (Object Slicing) và cách phòng tránh
- Khi truyền đối tượng lớp con theo giá trị vào tham số lớp cha: void inThongTin(SinhVien sv), phần dữ liệu mở rộng của SinhVienCLC bị cắt bỏ và vptr bị ép về vtable_SinhVien!
- Quy tắc bắt buộc: Luôn truyền đối tượng đa hình qua tham chiếu hằng (const SinhVien& sv) hoặc con trỏ thông minh (std::unique_ptr<SinhVien>, std::shared_ptr<SinhVien>).

[Slide 15-18] Ứng dụng Mẫu thiết kế Strategy trong tính học phí SDU
- Tách chiến lược tính học phí thành giao diện IHocPhiStrategy với các lớp thực thi: HocPhiTinChiChuan, HocPhiMienGiamChinhSach, HocPhiChatLuongCao, loại bỏ hoàn toàn cấu trúc if-else/switch-case cứng nhắc.`,
  },
  {
    id: "it3040-exercise",
    courseCode: "IT3040",
    courseName: "Lập trình hướng đối tượng",
    classId: "11111111-1111-4111-8111-111111111101",
    credits: 3,
    lecturer: "ThS. Trần Minh Đức",
    room: "B1-201 / B1-203",
    semester: "HK1 2026-2027",
    category: "exercise",
    title: "Bài tập thực hành IT3040: Kế thừa, Đa hình & Hệ thống Quản lý Học vụ",
    fileName: "IT3040-Bai-tap-Thuc-hanh-He-thong-quan-ly-hoc-vu.pdf",
    publicUrl: "/hoc-lieu/IT3040-Bai-tap-Thuc-hanh-He-thong-quan-ly-hoc-vu.pdf",
    pageCount: 4,
    updatedAt: "2026-10-20",
    summary: "Đề bài thực hành phòng B1-203 gồm 3 bài toán phân cấp: phân cấp Hình học, Quản lý nhân sự - giảng viên SDU và Hệ thống mượn trả thư viện kèm thang điểm chấm.",
    samplePrompt: "Hướng dẫn mình thiết kế các lớp và phương thức ảo cho Bài 2 (Quản lý Giảng viên & Chuyên viên SDU) trong tờ bài tập thực hành môn IT3040.",
    keywords: ["it3040", "bài tập", "thực hành", "quản lý giảng viên", "mượn trả thư viện", "rubric"],
    content: `PHIẾU BÀI TẬP THỰC HÀNH HỌC PHẦN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (IT3040)
Địa điểm bảo vệ: Phòng máy B1-203 | Giảng viên: ThS. Trần Minh Đức

BÀI 1 (3.0 điểm) - Đa hình cơ bản với hệ phân cấp Hình học 2D/3D
Xây dựng lớp cơ sở trừu tượng HinhHoc có phương thức thuần ảo tinhDienTich(), tinhChuVi() và inThongTin(). Cài đặt 3 lớp dẫn xuất HinhTron(r), HinhChuNhat(dai, rong), TamGiac(a, b, c - kiểm tra bất đẳng thức tam giác, ném std::invalid_argument nếu vi phạm). Quản lý danh sách bằng std::vector<std::unique_ptr<HinhHoc>> và sắp xếp giảm dần theo diện tích.

BÀI 2 (4.0 điểm) - Hệ thống Quản lý Giảng viên và Chuyên viên Trường Đại học Sao Đỏ
Thiết kế lớp trừu tượng VienChuc (maVC, hoTen, donVi, heSoLuong, luongCoBan = 2.340.000 VNĐ) với phương thức thuần ảo tinhThuNhapThang() và xepLoaiThiDua():
1. Lớp GiangVien kế thừa VienChuc, bổ sung hocVi ("ThS" phụ cấp 1.15, "TS" phụ cấp 1.35), soTietGiangDay và soGioNghienCuu:
   - Định mức chuẩn: 270 tiết/năm. Nếu soTietGiangDay > 270, mỗi tiết vượt giờ được cộng 95.000 VNĐ.
   - Thu nhập tháng = heSoLuong * luongCoBan * phuCapHocVi + tienVuotGio / 12.
   - Xếp loại "Hoàn thành xuất sắc" nếu soTietGiangDay >= 270 và soGioNghienCuu >= 120.
2. Lớp ChuyenVienPhongBan kế thừa VienChuc, bổ sung phuCapTrachNhiem và soNgayCong:
   - Thu nhập tháng = heSoLuong * luongCoBan + phuCapTrachNhiem + max(0, soNgayCong - 22) * 180.000 VNĐ.
Yêu cầu: Đọc danh sách từ tệp dữ liệu, tính tổng quỹ lương từng khoa/phòng, lọc danh sách viên chức đạt danh hiệu xuất sắc và đảm bảo không rò rỉ bộ nhớ.

BÀI 3 (3.0 điểm) - Thiết kế mô-đun Mượn - Trả Thư viện số SDU
Áp dụng quan hệ Composition và Association giữa các lớp TaiLieu (SachGiaoTrinh, LuanVanTotNghiep), DocGia và PhieuMuon. Tính tiền phạt quá hạn: Sách giáo trình 3.000 VNĐ/ngày, Luận văn tốt nghiệp 5.000 VNĐ/ngày, tối đa không vượt quá giá bìa tài liệu.

TIÊU CHÍ CHẤM ĐIỂM (RUBRIC)
- Đóng gói đúng private + kiểm tra dữ liệu đầu vào: 2.0 điểm.
- Đa hình động đúng chuẩn (virtual/override + virtual destructor + không Object Slicing): 3.5 điểm.
- Tách tệp header/implementation hoặc package sạch, biên dịch không cảnh báo (-Wall -Wextra): 2.5 điểm.
- Bộ ca kiểm thử biên (dữ liệu rỗng, tiết vượt giờ = 0, ngày quá hạn âm): 2.0 điểm.`,
  },

  // ==================== 2. IT3090 - CƠ SỞ DỮ LIỆU ====================
  {
    id: "it3090-syllabus",
    courseCode: "IT3090",
    courseName: "Cơ sở dữ liệu",
    classId: "11111111-1111-4111-8111-111111111102",
    credits: 3,
    lecturer: "TS. Phạm Thu Hà",
    room: "B1-204 / B1-201",
    semester: "HK1 2026-2027",
    category: "syllabus",
    title: "Đề cương chi tiết học phần Cơ sở dữ liệu (IT3090)",
    fileName: "IT3090-De-cuong-Co-so-du-lieu.pdf",
    publicUrl: "/hoc-lieu/IT3090-De-cuong-Co-so-du-lieu.pdf",
    pageCount: 4,
    updatedAt: "2026-09-06",
    summary: "Mục tiêu, chuẩn đầu ra CLO1-CLO4, nội dung 6 chương (ER, Đại số quan hệ, SQL, Phụ thuộc hàm & 3NF/BCNF, Giao dịch ACID) và lịch thực hành PostgreSQL tại B1-201.",
    samplePrompt: "Cho mình biết nội dung các chương, hệ quản trị thực hành và hình thức thi trong đề cương môn Cơ sở dữ liệu (IT3090).",
    keywords: ["it3090", "cơ sở dữ liệu", "csdl", "đề cương", "sql", "postgresql", "acid"],
    content: `TRƯỜNG ĐẠI HỌC SAO ĐỎ - KHOA CÔNG NGHỆ THÔNG TIN
ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN: CƠ SỞ DỮ LIỆU (Mã HP: IT3090)

1. THÔNG TIN CHUNG
- Mã học phần: IT3090 | Số tín chỉ: 3 (30 tiết LT tại phòng B1-204, 30 tiết TH tại phòng máy B1-201).
- Giảng viên phụ trách: TS. Phạm Thu Hà.
- Công cụ thực hành: PostgreSQL 16 & SQL Server, công cụ vẽ lược đồ ERDPlus / Draw.io.

2. CHUẨN ĐẦU RA HỌC PHẦN (CLO)
- CLO1: Thiết kế lược đồ thực thể - liên kết (ERD) và ánh xạ chính xác sang mô hình cơ sở dữ liệu quan hệ không dư thừa.
- CLO2: Biểu diễn thành thạo các phép toán Đại số quan hệ (Chọn σ, Chiếu π, Kết nối tự nhiên ⋈, Phép chia ÷) và viết câu lệnh truy vấn SQL chuẩn ANSI.
- CLO3: Xác định phụ thuộc hàm, tính bao đóng thuộc tính X+, tìm khóa tối thiểu và chuẩn hóa lược đồ đạt dạng chuẩn 3NF / BCNF.
- CLO4: Hiểu nguyên lý chỉ mục B+Tree, tối ưu truy vấn cơ bản và tính chất ACID của giao dịch (Transaction).

3. NỘI DUNG 6 CHƯƠNG TRỌNG TÂM
- Chương 1 (6 tiết): Tổng quan hệ cơ sở dữ liệu và kiến trúc 3 mức ANSI-SPARC.
- Chương 2 (9 tiết): Mô hình Thực thể - Liên kết mở rộng (EER) và quy tắc chuyển đổi 7 bước sang lược đồ quan hệ.
- Chương 3 (9 tiết): Mô hình dữ liệu quan hệ và Đại số quan hệ.
- Chương 4 (18 tiết): Ngôn ngữ SQL (DDL, DML, Subquery, CTE, Window Functions, View, Trigger, Stored Procedure).
- Chương 5 (12 tiết): Lý thuyết thiết kế CSDL - Phụ thuộc hàm, Bao đóng và Chuẩn hóa 1NF, 2NF, 3NF, BCNF.
- Chương 6 (6 tiết): Quản lý giao dịch, khóa đồng thời (2PL) và phục hồi sự cố.

4. ĐÁNH GIÁ HỌC PHẦN
- Chuyên cần: 10% | Giữa kỳ (Kiểm tra SQL phòng B1-201 + Thiết kế CSDL nhóm): 30% | Cuối kỳ (Tự luận + SQL 90 phút): 60%.`,
  },
  {
    id: "it3090-textbook",
    courseCode: "IT3090",
    courseName: "Cơ sở dữ liệu",
    classId: "11111111-1111-4111-8111-111111111102",
    credits: 3,
    lecturer: "TS. Phạm Thu Hà",
    room: "B1-204 / B1-201",
    semester: "HK1 2026-2027",
    category: "textbook",
    title: "Giáo trình Đại số quan hệ, SQL nâng cao & Chuẩn hóa 3NF/BCNF",
    fileName: "IT3090-Giao-trinh-Dai-so-quan-he-SQL-va-Chuan-hoa-3NF.pdf",
    publicUrl: "/hoc-lieu/IT3090-Giao-trinh-Dai-so-quan-he-SQL-va-Chuan-hoa-3NF.pdf",
    pageCount: 6,
    updatedAt: "2026-09-12",
    summary: "Giáo trình chi tiết về phép chia đại số quan hệ, truy vấn lồng tương quan, thuật toán tìm bao đóng X+, phủ tối tiểu và chuẩn hóa 3NF/BCNF.",
    samplePrompt: "Giải thích thuật toán tìm bao đóng X+, phủ tối tiểu và quy trình tách lược đồ đạt chuẩn 3NF bảo toàn phụ thuộc hàm theo giáo trình IT3090.",
    keywords: ["it3090", "giáo trình", "bao đóng", "phủ tối tiểu", "3nf", "bcnf", "đại số quan hệ", "phép chia"],
    content: `GIÁO TRÌNH CƠ SỞ DỮ LIỆU QUAN HỆ & CHUẨN HÓA LƯỢC ĐỒ (KHOA CNTT - ĐH SAO ĐỎ)

PHẦN 1. ĐẠI SỐ QUAN HỆ VÀ ÁNH XẠ SANG SQL
1.1. Thứ tự thực thi logic của câu truy vấn SELECT
Khác với thứ tự viết câu lệnh, bộ máy thực thi SQL xử lý theo trình tự: FROM / JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT (Window Functions chạy tại đây) -> DISTINCT -> ORDER BY -> LIMIT/OFFSET. Do đó bí danh cột đặt trong SELECT không thể dùng trực tiếp ở mệnh đề WHERE.

1.2. Biểu diễn Phép chia quan hệ R(A, B) ÷ S(B) trong SQL
Bài toán điển hình: "Tìm mã sinh viên đã đăng ký TẤT CẢ các học phần bắt buộc của ngành Công nghệ phần mềm". Trong SQL chuẩn, phép chia được cài đặt bằng phủ định kép NOT EXISTS ... NOT EXISTS hoặc gom nhóm HAVING COUNT(DISTINCT ma_hp) = (SELECT COUNT(*) FROM hoc_phan_bat_buoc).

PHẦN 2. PHỤ THUỘC HÀM VÀ THUẬT TOÁN BAO ĐÓNG
2.1. Hệ tiên đề Armstrong
- Phản xạ: Nếu Y ⊆ X thì X -> Y.
- Gia tăng: Nếu X -> Y thì XZ -> YZ.
- Bắc cầu: Nếu X -> Y và Y -> Z thì X -> Z.

2.2. Thuật toán tính bao đóng thuộc tính X+ đối với tập phụ thuộc hàm F (Độ phức tạp O(|F| * |U|))
- Bước 1: Khởi tạo KQ := X.
- Bước 2: Lặp qua mọi phụ thuộc hàm A -> B ∈ F: nếu A ⊆ KQ và B ⊈ KQ thì cập nhật KQ := KQ ∪ B.
- Bước 3: Lặp lại Bước 2 cho đến khi KQ không thay đổi trong suốt một vòng quét. Nếu X+ = U (toàn bộ tập thuộc tính) thì X là một siêu khóa (superkey).

PHẦN 3. CÁC DẠNG CHUẨN VÀ THUẬT TOÁN TỔNG HỢP 3NF (BERNSTEIN)
- 1NF: Mọi miền giá trị thuộc tính đều là nguyên tố (không chứa tập lặp hay bảng lồng).
- 2NF: Đạt 1NF và mọi thuộc tính không khóa đều phụ thuộc hàm đầy đủ vào mọi khóa dự tuyển (loại bỏ phụ thuộc bộ phận).
- 3NF: Đạt 2NF và không tồn tại phụ thuộc bắc cầu của thuộc tính không khóa vào khóa (với mọi X -> A không tầm thường: X là siêu khóa HOẶC A là thuộc tính khóa).
- BCNF: Nghiêm ngặt hơn 3NF - với mọi X -> A không tầm thường thì X bắt buộc phải là siêu khóa.
- Thuật toán tổng hợp 3NF bảo toàn thông tin & bảo toàn phụ thuộc hàm:
  (1) Tìm phủ tối tiểu Fc của F (vế phải 1 thuộc tính, loại thuộc tính dư ở vế trái, loại phụ thuộc hàm dư).
  (2) Với mỗi nhóm phụ thuộc hàm cùng vế trái X -> A1, X -> A2... trong Fc, tạo một quan hệ con R_i(X ∪ A1 ∪ A2...).
  (3) Nếu chưa có quan hệ con nào chứa một khóa dự tuyển K của lược đồ gốc R, bổ sung thêm quan hệ R_key(K) để đảm bảo kết nối không mất thông tin (lossless-join).`,
  },
  {
    id: "it3090-slide",
    courseCode: "IT3090",
    courseName: "Cơ sở dữ liệu",
    classId: "11111111-1111-4111-8111-111111111102",
    credits: 3,
    lecturer: "TS. Phạm Thu Hà",
    room: "B1-204 / B1-201",
    semester: "HK1 2026-2027",
    category: "slide",
    title: "Slide bài giảng Chương 5: Phụ thuộc hàm, Khóa tối thiểu & Tách bảng 3NF",
    fileName: "IT3090-Slide-Phu-thuoc-ham-Bao-dong-va-Chuan-hoa-3NF.pdf",
    publicUrl: "/hoc-lieu/IT3090-Slide-Phu-thuoc-ham-Bao-dong-va-Chuan-hoa-3NF.pdf",
    pageCount: 5,
    updatedAt: "2026-10-15",
    summary: "Slide hướng dẫn mẹo phân loại thuộc tính Nguồn (L) - Trung gian (M) - Đích (R) để tìm nhanh mọi khóa dự tuyển và ví dụ chuẩn hóa bảng Đăng ký học phần.",
    samplePrompt: "Hướng dẫn mẹo tìm khóa dự tuyển bằng cách chia tập thuộc tính Nguồn - Trung gian - Đích như trong slide Chương 5 môn IT3090.",
    keywords: ["it3090", "slide", "khóa dự tuyển", "tách bảng", "dị thường", "3nf"],
    content: `SLIDE BÀI GIẢNG IT3090 - CHƯƠNG 5: MẸO TÌM KHÓA TỐI THIỂU & CHUẨN HÓA 3NF
Giảng viên: TS. Phạm Thu Hà | Phòng học: B1-204

[Slide 1-4] Ba dị thường dữ liệu (Data Anomalies) khi bảng chưa chuẩn hóa
Xét bảng chưa chuẩn DangKy(MaSV, HoTen, MaLop, MaHP, TenHP, SoTC, MaGV, TenGV, Diem):
1. Dị thường chèn (Insertion Anomaly): Không thể thêm học phần mới nếu chưa có sinh viên đăng ký.
2. Dị thường xóa (Deletion Anomaly): Xóa sinh viên cuối cùng của lớp làm mất luôn thông tin học phần và giảng viên.
3. Dị thường cập nhật (Update Anomaly): Đổi tên giảng viên phải sửa hàng trăm dòng, dễ gây mâu thuẫn dữ liệu.

[Slide 5-8] Phương pháp phân hoạch thuộc tính L - M - R để tìm mọi Khóa dự tuyển
Cho lược đồ R(U, F):
- Tập Nguồn (TN): Các thuộc tính chỉ xuất hiện ở vế trái (hoặc không xuất hiện trong F) -> BẮT BUỘC phải có mặt trong MỌI khóa dự tuyển!
- Tập Đích (TD): Các thuộc tính chỉ xuất hiện ở vế phải -> KHÔNG BAO GIỜ nằm trong khóa tối thiểu.
- Tập Trung gian (TTG): Xuất hiện ở cả vế trái và vế phải.
Quy trình: Tính TN+. Nếu TN+ = U thì TN là khóa duy nhất! Nếu TN+ ≠ U, lần lượt ghép thêm tập con nhỏ nhất của TTG vào TN cho tới khi bao đóng phủ kín U.

[Slide 9-12] Ví dụ mẫu hoàn chỉnh trên lớp
Cho R(A, B, C, D, E, G) và F = { AB -> C, C -> A, BC -> D, ACD -> B, D -> EG, BE -> C, CG -> BD, CE -> AG }.
- Tập nguồn TN = ∅ (vì mọi thuộc tính đều xuất hiện ở vế phải ít nhất một lần).
- Tập đích TD = ∅. Kiểm tra bao đóng các cặp 2 thuộc tính: (AB)+ = ABCDEG = U; (BC)+ = U; (BD)+ = U; (BE)+ = U; (CD)+ = U; (CE)+ = U; (CG)+ = U.`,
  },
  {
    id: "it3090-exercise",
    courseCode: "IT3090",
    courseName: "Cơ sở dữ liệu",
    classId: "11111111-1111-4111-8111-111111111102",
    credits: 3,
    lecturer: "TS. Phạm Thu Hà",
    room: "B1-204 / B1-201",
    semester: "HK1 2026-2027",
    category: "exercise",
    title: "Bài tập Truy vấn SQL & Chuẩn hóa lược đồ CSDL Thư viện - Đào tạo",
    fileName: "IT3090-Bai-tap-Truy-van-SQL-va-Chuan-hoa-luoc-do.pdf",
    publicUrl: "/hoc-lieu/IT3090-Bai-tap-Truy-van-SQL-va-Chuan-hoa-luoc-do.pdf",
    pageCount: 4,
    updatedAt: "2026-10-22",
    summary: "Bộ bài tập thực hành tại phòng B1-201 gồm 8 câu SQL trên lược đồ Thư viện SDU và 2 bài toán kiểm tra bảo toàn thông tin, chuẩn hóa 3NF/BCNF.",
    samplePrompt: "Gợi ý cách giải Bài tập 1 (các câu truy vấn SQL 1c, 1d dùng Window Function và phép chia) trong phiếu bài tập môn Cơ sở dữ liệu IT3090.",
    keywords: ["it3090", "bài tập", "truy vấn sql", "thư viện", "window function", "bảo toàn thông tin"],
    content: `PHIẾU BÀI TẬP THỰC HÀNH CƠ SỞ DỮ LIỆU (IT3090) - PHÒNG MÁY B1-201
Giảng viên: TS. Phạm Thu Hà

BÀI TẬP 1 (5.0 điểm) - Truy vấn SQL trên CSDL Thư viện số Đại học Sao Đỏ
Cho lược đồ 4 bảng:
- DOC_GIA(ma_dg PRIMARY KEY, ho_ten, lop_nien_che, khoa, han_the)
- DAU_SACH(ma_sach PRIMARY KEY, nhan_de, tac_gia, nam_xb, the_loai, gia_bia)
- BAN_SAO(ma_vach PRIMARY KEY, ma_sach REFERENCES DAU_SACH, tinh_trang, ke_sach)
- PHIEU_MUON(ma_phieu PRIMARY KEY, ma_dg REFERENCES DOC_GIA, ma_vach REFERENCES BAN_SAO, ngay_muon, han_tra, ngay_tra_thuc)

Yêu cầu viết câu lệnh PostgreSQL cho các truy vấn sau:
1a. Liệt kê các phiếu mượn đang quá hạn chưa trả (ngay_tra_thuc IS NULL và han_tra < CURRENT_DATE), kèm số ngày trễ và tiền phạt dự kiến (3.000 đ/ngày).
1b. Thống kê Top 5 đầu sách được mượn nhiều nhất trong học kỳ hiện tại, bao gồm cả số bản sao hiện còn rảnh trên kệ.
1c. Dùng hàm cửa sổ RANK() OVER (PARTITION BY khoa ORDER BY COUNT(*) DESC) để tìm sinh viên mượn sách tích cực nhất của mỗi khoa.
1d. Tìm các độc giả lớp DK13-CNTT1 đã từng mượn TẤT CẢ các đầu sách thuộc thể loại 'Cơ sở dữ liệu' của tác giả 'TS. Phạm Thu Hà'.

BÀI TẬP 2 (5.0 điểm) - Thiết kế & Chuẩn hóa lược đồ Quản lý Đồ án tốt nghiệp
Cho quan hệ QuanLyDoAn(MaSV, TenSV, MaLop, TenKhoa, MaDeTai, TenDeTai, MaGVHD, TenGVHD, BoMonGV, DiemHD, DiemPB) với tập phụ thuộc hàm:
F = { MaSV -> TenSV, MaLop, MaDeTai, DiemHD, DiemPB; MaLop -> TenKhoa; MaDeTai -> TenDeTai, MaGVHD; MaGVHD -> TenGVHD, BoMonGV }.
2a. Xác định khóa dự tuyển duy nhất của QuanLyDoAn và chỉ rõ dạng chuẩn cao nhất hiện tại (1NF, 2NF hay 3NF?). Giải thích cụ thể phụ thuộc bắc cầu gây vi phạm.
2b. Áp dụng thuật toán tách thành các lược đồ con đạt chuẩn 3NF/BCNF, chỉ rõ khóa chính (PK) và khóa ngoại (FK) của từng bảng sau khi tách.`,
  },

  // ==================== 3. 0101071809 - XỬ LÝ ẢNH ====================
  {
    id: "xla-syllabus",
    courseCode: "0101071809",
    courseName: "Xử lý ảnh",
    credits: 3,
    lecturer: "TS. Nguyễn Văn Hòa",
    room: "B1-202 / B1-201",
    semester: "HK2 2025-2026",
    category: "syllabus",
    title: "Đề cương chi tiết học phần Xử lý ảnh số (0101071809)",
    fileName: "XLA-De-cuong-Xu-ly-anh-so.pdf",
    publicUrl: "/hoc-lieu/XLA-De-cuong-Xu-ly-anh-so.pdf",
    pageCount: 4,
    updatedAt: "2026-01-10",
    summary: "Đề cương học phần Xử lý ảnh 3 tín chỉ (TS. Nguyễn Văn Hòa): biến đổi cường độ sáng, lọc không gian & Fourier, phát hiện biên Canny, hình thái học và phân vùng Otsu.",
    samplePrompt: "Tóm tắt đề cương học phần Xử lý ảnh (0101071809): các chủ đề chính, công cụ Python/OpenCV sử dụng và cấu trúc bài thi thực hành.",
    keywords: ["0101071809", "xử lý ảnh", "image processing", "đề cương", "opencv", "canny", "otsu"],
    content: `TRƯỜNG ĐẠI HỌC SAO ĐỎ - KHOA CÔNG NGHỆ THÔNG TIN
ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN: XỬ LÝ ẢNH (Mã HP: 0101071809)

1. THÔNG TIN HỌC PHẦN
- Số tín chỉ: 3 (30 tiết Lý thuyết tại phòng B1-202, 30 tiết Thực hành tại phòng B1-201).
- Giảng viên giảng dạy: TS. Nguyễn Văn Hòa.
- Môi trường thực hành: Python 3.11+, OpenCV (cv2), NumPy, Matplotlib.

2. CHUẨN ĐẦU RA (CLO)
- CLO1: Biểu diễn ma trận ảnh số đa kênh (RGB, HSV, Grayscale), tính toán lược đồ xám (Histogram) và cân bằng sáng thích nghi (CLAHE).
- CLO2: Cài đặt phép tích chập 2D (2D Convolution), lọc làm trơn Gaussian, lọc trung vị (Median Filter khử nhiễu muối tiêu) và làm sắc nét Laplacian.
- CLO3: Áp dụng đạo hàm bậc nhất (Sobel, Prewitt, Scharr), thuật toán phát hiện biên Canny 4 giai đoạn và biến đổi Hough phát hiện đường thẳng/đường tròn.
- CLO4: Vận dụng các phép toán hình thái học (Erosion, Dilation, Opening, Closing) và phân ngưỡng tự động Otsu để xây dựng ứng dụng kiểm tra ngoại quan / nhận dạng biển số.

3. ĐÁNH GIÁ KẾT QUẢ
- Điểm chuyên cần: 10% | Bài tập thực hành phòng B1-201 & Tiểu luận nhóm: 30% | Thi thực hành lập trình xử lý ảnh cuối kỳ (90 phút): 60%.`,
  },
  {
    id: "xla-textbook",
    courseCode: "0101071809",
    courseName: "Xử lý ảnh",
    credits: 3,
    lecturer: "TS. Nguyễn Văn Hòa",
    room: "B1-202 / B1-201",
    semester: "HK2 2025-2026",
    category: "textbook",
    title: "Giáo trình Xử lý ảnh số: Lọc không gian, Biên Canny & Phân ngưỡng Otsu",
    fileName: "XLA-Giao-trinh-Xu-ly-anh-so-va-Thi-giac-may-tinh.pdf",
    publicUrl: "/hoc-lieu/XLA-Giao-trinh-Xu-ly-anh-so-va-Thi-giac-may-tinh.pdf",
    pageCount: 6,
    updatedAt: "2026-01-18",
    summary: "Trình bày công thức toán học đầy đủ của tích chập 2D, bộ lọc trung vị khử nhiễu xung, 4 bước thuật toán Canny và cực đại phương sai liên lớp Otsu.",
    samplePrompt: "Trình bày chi tiết 4 bước của thuật toán phát hiện biên Canny và công thức tối ưu phương sai giữa hai lớp của thuật toán Otsu theo giáo trình Xử lý ảnh.",
    keywords: ["0101071809", "xử lý ảnh", "giáo trình", "tích chập", "gaussian", "sobel", "canny", "otsu", "psnr"],
    content: `GIÁO TRÌNH XỬ LÝ ẢNH SỐ (KHOA CNTT - TRƯỜNG ĐẠI HỌC SAO ĐỎ)

CHƯƠNG 1. LỌC KHÔNG GIAN VÀ KHỬ NHIỄU (SPATIAL FILTERING)
1.1. Tích chập rời rạc hai chiều (2D Discrete Convolution)
Cho ảnh đầu vào I(x, y) và nhân lọc (kernel) K kích thước (2a+1) × (2b+1), giá trị điểm ảnh đầu ra G(x, y) = ∑_{s=-a..a} ∑_{t=-b..b} K(s, t) · I(x - s, y - t).
- Lọc Gaussian: G_σ(u, v) = (1 / (2πσ²)) · exp(-(u² + v²) / (2σ²)) giúp làm mượt nhiễu Gauss đồng thời hạn chế hiện tượng rung viền (ringing) trên miền tần số.
- Lọc trung vị (Median Filter): Thay điểm ảnh tâm bằng trung vị của lân cận sắp thứ tự; cực kỳ hiệu quả với nhiễu muối tiêu (salt-and-pepper) mà vẫn giữ sắc cạnh biên.
- Chỉ số chất lượng ảnh khôi phục: MSE = (1 / MN) ∑ [I(i,j) - K(i,j)]² và PSNR = 10 · log10(255² / MSE) (đơn vị dB; thông thường PSNR >= 30 dB đạt chất lượng tốt).

CHƯƠNG 2. THUẬT TOÁN PHÁT HIỆN BIÊN CANNY (4 GIAI ĐOẠN CHUẨN)
Bước 1 - Khử nhiễu bằng bộ lọc Gaussian 5×5 để tránh đạo hàm nhạy cảm với nhiễu tần số cao.
Bước 2 - Tính biên độ và hướng Gradient bằng mặt nạ Sobel Gx, Gy:
  G = sqrt(Gx² + Gy²), góc hướng biên θ = atan2(Gy, Gx) được lượng tử hóa về 4 hướng chuẩn: 0°, 45°, 90°, 135°.
Bước 3 - Triệt tiêu cực đại cục bộ (Non-Maximum Suppression - NMS): Tại mỗi điểm ảnh, so sánh G(x, y) với 2 điểm lân cận dọc theo phương pháp tuyến θ; nếu không đạt cực đại cục bộ thì gán bằng 0 để làm mảnh biên về bề dày 1 pixel.
Bước 4 - Phân ngưỡng trễ kép (Hysteresis Thresholding) với T_low và T_high (thường chọn tỷ lệ T_high / T_low ≈ 2:1 đến 3:1):
  - G >= T_high: Biên mạnh (chắc chắn giữ lại).
  - G < T_low: Loại bỏ hoàn toàn.
  - T_low <= G < T_high: Biên yếu - chỉ giữ lại nếu liên thông 8 láng giềng với ít nhất một điểm biên mạnh.

CHƯƠNG 3. THUẬT TOÁN PHÂN NGƯỠNG TỰ ĐỘNG OTSU
Giả sử lược đồ xám chuẩn hóa p_i = n_i / N với mức xám i ∈ [0, L-1]. Khi chọn ngưỡng k chia ảnh thành nền C0 [0..k] và vật thể C1 [k+1..L-1]:
- Xác suất tích lũy lớp nền: ω0(k) = ∑_{i=0..k} p_i; lớp vật thể: ω1(k) = 1 - ω0(k).
- Kỳ vọng tích lũy: μ(k) = ∑_{i=0..k} i·p_i; kỳ vọng toàn ảnh: μ_T = ∑_{i=0..L-1} i·p_i.
- Phương sai giữa hai lớp (Between-class variance): σ_B²(k) = [μ_T · ω0(k) - μ(k)]² / [ω0(k) · (1 - ω0(k))].
Ngưỡng tối ưu k* là giá trị cực đại hóa σ_B²(k) với k chạy từ 0 đến 255 (độ phức tạp O(L) = 256 bước tính cực nhanh).`,
  },
  {
    id: "xla-slide",
    courseCode: "0101071809",
    courseName: "Xử lý ảnh",
    credits: 3,
    lecturer: "TS. Nguyễn Văn Hòa",
    room: "B1-202 / B1-201",
    semester: "HK2 2025-2026",
    category: "slide",
    title: "Slide bài giảng: Cân bằng Histogram, Hình thái học & OpenCV Pipeline",
    fileName: "XLA-Slide-Khong-gian-mau-Histogram-Sobel-Canny-Otsu.pdf",
    publicUrl: "/hoc-lieu/XLA-Slide-Khong-gian-mau-Histogram-Sobel-Canny-Otsu.pdf",
    pageCount: 5,
    updatedAt: "2026-03-02",
    summary: "Tóm tắt công thức cân bằng Histogram toàn cục vs CLAHE, 4 phép toán hình thái học (Co, Giãn, Mở, Đóng) và bảng hàm OpenCV hay dùng.",
    samplePrompt: "So sánh cân bằng Histogram toàn cục với CLAHE và phân biệt phép Mở (Opening) với phép Đóng (Closing) trong slide môn Xử lý ảnh.",
    keywords: ["0101071809", "slide", "histogram", "clahe", "opening", "closing", "erosion", "dilation"],
    content: `SLIDE BÀI GIẢNG XỬ LÝ ẢNH (0101071809) - KHOA CNTT ĐH SAO ĐỎ
Giảng viên: TS. Nguyễn Văn Hòa | Phòng học: B1-202

[Slide 1-4] Cân bằng lược đồ xám (Histogram Equalization) vs CLAHE
- Cân bằng toàn cục: s_k = round((L - 1) · ∑_{j=0..k} p_r(r_j)) giúp trải rộng dải tương phản nhưng dễ khuếch đại nhiễu ở vùng nền đồng nhất.
- CLAHE (Contrast Limited Adaptive Histogram Equalization): Chia ảnh thành lưới ô cục bộ (ví dụ tileGridSize=(8,8)) và giới hạn biên độ cắt clipLimit=2.0, đặc biệt hiệu quả với ảnh chụp ngược sáng hoặc ảnh X-quang y tế.
- Lưu ý với ảnh màu: Chuyển từ BGR sang không gian HSV hoặc LAB, chỉ áp dụng CLAHE lên kênh độ sáng V (hoặc L) để không làm sai lệch màu sắc gốc!

[Slide 5-9] Bốn phép toán Hình thái học nhị phân (Morphological Operations) với phần tử cấu trúc B
1. Phép Co (Erosion: A ⊖ B): Thu hẹp biên vật thể, loại bỏ các đốm nhiễu trắng nhỏ hơn kích thước B và tách hai vật thể dính nhẹ.
2. Phép Giãn (Dilation: A ⊕ B): Mở rộng biên vật thể, hàn gắn các nét đứt và lấp đầy lỗ thủng nhỏ.
3. Phép Mở (Opening: A ○ B = (A ⊖ B) ⊕ B): Co trước - Giãn sau -> Khử nhiễu hạt trắng ngoài nền mà vẫn bảo toàn diện tích xấp xỉ của vật thể chính.
4. Phép Đóng (Closing: A ● B = (A ⊕ B) ⊖ B): Giãn trước - Co sau -> Lấp các lỗ đen nhỏ bên trong vật thể và nối liền các khe hẹp.`,
  },
  {
    id: "xla-exercise",
    courseCode: "0101071809",
    courseName: "Xử lý ảnh",
    credits: 3,
    lecturer: "TS. Nguyễn Văn Hòa",
    room: "B1-202 / B1-201",
    semester: "HK2 2025-2026",
    category: "exercise",
    title: "Bài tập thực hành OpenCV: Tiền xử lý ảnh & Khoanh vùng biển số xe",
    fileName: "XLA-Bai-tap-Thuc-hanh-OpenCV-Python-Nhan-dang-bien-so.pdf",
    publicUrl: "/hoc-lieu/XLA-Bai-tap-Thuc-hanh-OpenCV-Python-Nhan-dang-bien-so.pdf",
    pageCount: 4,
    updatedAt: "2026-03-18",
    summary: "Bài thực hành phòng máy B1-201 xây dựng pipeline Python + OpenCV 5 bước phát hiện vùng biển số và tách ký tự kèm công thức tính IoU.",
    samplePrompt: "Viết đoạn mã Python OpenCV hoàn chỉnh giải Bài tập thực hành khoanh vùng biển số xe 5 bước trong học liệu môn Xử lý ảnh.",
    keywords: ["0101071809", "bài tập", "opencv", "biển số xe", "contour", "iou", "python"],
    content: `PHIẾU BÀI TẬP THỰC HÀNH XỬ LÝ ẢNH VỚI PYTHON & OPENCV
Phòng thực hành: B1-201 | Giảng viên: TS. Nguyễn Văn Hòa

ĐỀ BÀI: Xây dựng pipeline phát hiện vùng biển số xe máy/ô tô chụp tại cổng Trường Đại học Sao Đỏ và tách rời từng ký tự:
- Yêu cầu kỹ thuật 5 bước:
  Bước 1: Đọc ảnh BGR, chuẩn hóa chiều rộng về 800 px giữ nguyên tỷ lệ khung hình, chuyển sang ảnh đa cấp xám và tăng tương phản cục bộ bằng CLAHE (clipLimit=2.0, tileGridSize=(8,8)).
  Bước 2: Lọc song phương cv2.bilateralFilter(gray, 11, 17, 17) để làm mịn nhiễu mặt đường nhưng giữ nguyên cạnh sắc của khung biển số.
  Bước 3: Phát hiện biên bằng cv2.Canny(filtered, 50, 150) kết hợp phép Đóng hình thái học (kernel chữ nhật 5×3) để nối kín viền khung.
  Bước 4: Tìm đường bao cv2.findContours, xấp xỉ đa giác cv2.approxPolyDP với epsilon = 0.02 * chu_vi; lọc ứng viên tứ giác (4 đỉnh) có tỷ lệ khung hình w/h nằm trong [1.2, 4.8] và diện tích >= 1.5% diện tích ảnh.
  Bước 5: Biến đổi phối cảnh 4 điểm (Perspective Transform) đưa biển số về mặt phẳng chuẩn 320×100 px, phân ngưỡng nhị phân thích nghi Otsu đảo và lọc các thành phần liên thông theo chiều cao ký tự (40% - 85% chiều cao biển).
- Đánh giá độ chính xác khoanh vùng bằng chỉ số IoU (Intersection over Union) so với hộp nhãn chuẩn Ground Truth: IoU = Area(B_pred ∩ B_gt) / Area(B_pred ∪ B_gt) >= 0.75.`,
  },

  // ==================== 4. 0101103389 - DỮ LIỆU LỚN - BIG DATA ====================
  {
    id: "bigdata-syllabus",
    courseCode: "0101103389",
    courseName: "Dữ liệu lớn - Big Data",
    credits: 3,
    lecturer: "ThS. Lê Thị Hồng",
    room: "B1-302 / B1-204",
    semester: "HK2 2025-2026",
    category: "syllabus",
    title: "Đề cương chi tiết học phần Dữ liệu lớn - Big Data (0101103389)",
    fileName: "BIGDATA-De-cuong-Du-lieu-lon-Big-Data.pdf",
    publicUrl: "/hoc-lieu/BIGDATA-De-cuong-Du-lieu-lon-Big-Data.pdf",
    pageCount: 4,
    updatedAt: "2026-01-12",
    summary: "Đề cương 3 tín chỉ (ThS. Lê Thị Hồng, phòng B1-302 / B1-204): đặc trưng 5V, kiến trúc HDFS, MapReduce, Apache Spark SQL/Streaming và định dạng Parquet.",
    samplePrompt: "Tóm tắt nội dung học phần, chuẩn đầu ra và môi trường thực hành PySpark trong đề cương môn Dữ liệu lớn - Big Data (0101103389).",
    keywords: ["0101103389", "big data", "dữ liệu lớn", "đề cương", "hdfs", "mapreduce", "spark", "parquet"],
    content: `TRƯỜNG ĐẠI HỌC SAO ĐỎ - KHOA CÔNG NGHỆ THÔNG TIN
ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN: DỮ LIỆU LỚN - BIG DATA (Mã HP: 0101103389)

1. THÔNG TIN CHUNG
- Mã học phần: 0101103389 | Số tín chỉ: 3 (Lý thuyết tại B1-302, Thực hành cụm Docker/Spark tại phòng B1-204).
- Giảng viên phụ trách: ThS. Lê Thị Hồng.

2. CHUẨN ĐẦU RA (CLO)
- CLO1: Phân tích 5 đặc trưng cốt lõi của Dữ liệu lớn (Volume, Velocity, Variety, Veracity, Value) và lựa chọn kiến trúc Lambda / Lakehouse phù hợp.
- CLO2: Vận hành hệ thống tệp phân tán HDFS (NameNode, DataNode, cơ chế chia khối 128 MB, hệ số nhân bản mặc định replication factor = 3) và định dạng lưu trữ cột Apache Parquet.
- CLO3: Thiết kế thuật toán theo mô hình Map - Combine - Shuffle & Sort - Reduce và chuyển đổi sang xử lý trên bộ nhớ với Apache Spark (RDD, DataFrame, Spark SQL).
- CLO4: Nhận diện điểm nghẽn hiệu năng phân tán (Shuffle chi phí cao, Data Skew, Out-of-Memory) và tối ưu hóa bằng Broadcast Join, Partitioning, Caching.

3. ĐÁNH GIÁ HỌC PHẦN
- Chuyên cần: 10% | Bài tập thực hành PySpark tại phòng B1-204 & Báo cáo nhóm: 30% | Thi tự luận kết thúc học phần (90 phút tại B1-302): 60%.`,
  },
  {
    id: "bigdata-textbook",
    courseCode: "0101103389",
    courseName: "Dữ liệu lớn - Big Data",
    credits: 3,
    lecturer: "ThS. Lê Thị Hồng",
    room: "B1-302 / B1-204",
    semester: "HK2 2025-2026",
    category: "textbook",
    title: "Giáo trình Hệ sinh thái HDFS, MapReduce & Xử lý phân tán Apache Spark",
    fileName: "BIGDATA-Giao-trinh-HDFS-MapReduce-va-Apache-Spark.pdf",
    publicUrl: "/hoc-lieu/BIGDATA-Giao-trinh-HDFS-MapReduce-va-Apache-Spark.pdf",
    pageCount: 6,
    updatedAt: "2026-01-20",
    summary: "Giáo trình phân tích kiến trúc đọc/ghi HDFS chịu lỗi, luồng MapReduce, cơ chế Lazy Evaluation, DAG Stage và bộ tối ưu Catalyst trong Apache Spark.",
    samplePrompt: "Theo giáo trình Big Data, tại sao Apache Spark nhanh hơn Hadoop MapReduce trên các thuật toán lặp và sự khác biệt giữa Narrow vs Wide Transformation là gì?",
    keywords: ["0101103389", "big data", "giáo trình", "namenode", "datanode", "dag", "narrow", "wide transformation", "catalyst"],
    content: `GIÁO TRÌNH DỮ LIỆU LỚN - BIG DATA (KHOA CNTT - TRƯỜNG ĐẠI HỌC SAO ĐỎ)

CHƯƠNG 1. HỆ THỐNG TỆP PHÂN TÁN HADOOP HDFS
- Kiến trúc Master/Worker: NameNode quản lý siêu dữ liệu không gian tên (cây thư mục, bảng ánh xạ tệp -> danh sách khối trong RAM + EditLog/FsImage); các DataNode lưu trữ trực tiếp các khối dữ liệu vật lý và gửi nhịp tim (Heartbeat) mỗi 3 giây.
- Kích thước khối mặc định (Block Size): 128 MB giúp giảm tỷ lệ thời gian tìm kiếm đầu đọc (seek time) so với thời gian truyền tuần tự. Ví dụ: một tệp nhật ký 500 MB được cắt thành 4 khối (3 khối 128 MB và 1 khối cuối 116 MB, không chiếm nguyên 128 MB đĩa cứng).
- Chiến lược đặt bản sao chịu lỗi (Rack-aware Replication = 3): Bản sao 1 đặt trên nút cục bộ (hoặc ngẫu nhiên), bản sao 2 đặt trên một tủ rack khác, bản sao 3 đặt trên một nút khác cùng tủ rack thứ hai -> chịu được lỗi hỏng toàn bộ một rack mà vẫn tối ưu băng thông ghi.

CHƯƠNG 2. MÔ HÌNH MAPREDUCE VÀ HẠN CHẾ I/O ĐĨA CỨNG
- Pha Map đọc từng phân mảnh (InputSplit), phát ra cặp trung gian (k1, v1) -> list(k2, v2). Combiner hoạt động như bộ "mini-reducer" cục bộ ngay tại nút Map để giảm lưu lượng mạng trước khi Shuffle (chỉ áp dụng cho phép toán có tính giao hoán và kết hợp như SUM, COUNT, MAX; không áp dụng trực tiếp cho trung bình cộng nếu không tách tổng và số đếm).
- Hạn chế: Giữa hai công việc MapReduce liên tiếp (ví dụ thuật toán lặp PageRank hay K-Means), kết quả trung gian bắt buộc phải ghi xuống HDFS rồi đọc lại từ đĩa, gây nghẽn I/O nghiêm trọng.

CHƯƠNG 3. KIẾN TRÚC APACHE SPARK & TỐI ƯU CATALYST
- Đánh giá lười (Lazy Evaluation): Các phép biến đổi (Transformations như map, filter, join, groupBy) chỉ ghi nhận vào đồ thị có hướng không chu trình (DAG). Spark chỉ thực sự khởi chạy công việc khi gặp một Hành động (Action như count, collect, write).
- Phân ranh giới Stage bằng Narrow vs Wide Transformation:
  + Biến đổi hẹp (Narrow: map, filter, union): Mỗi phân vùng cha chỉ đóng góp vào tối đa 1 phân vùng con -> Gộp chung vào một Stage và thực thi pipeline ngay trong bộ nhớ RAM mà không cần truyền mạng.
  + Biến đổi rộng (Wide: groupByKey, reduceByKey, join, distinct, repartition): Dữ liệu cùng khóa nằm rải rác trên nhiều nút phải trao đổi qua mạng (Shuffle) -> Tạo ranh giới tách Stage mới!
- DataFrame & Spark SQL vượt trội hơn RDD thuần nhờ bộ tối ưu truy vấn Catalyst (đẩy điều kiện lọc xuống sớm - Predicate Pushdown, cắt tỉa cột thừa - Column Pruning trên tệp Parquet) và bộ quản lý bộ nhớ nhị phân ngoài heap Tungsten.`,
  },
  {
    id: "bigdata-slide",
    courseCode: "0101103389",
    courseName: "Dữ liệu lớn - Big Data",
    credits: 3,
    lecturer: "ThS. Lê Thị Hồng",
    room: "B1-302 / B1-204",
    semester: "HK2 2025-2026",
    category: "slide",
    title: "Slide bài giảng: RDD vs DataFrame, Broadcast Join & Xử lý lệch dữ liệu",
    fileName: "BIGDATA-Slide-Spark-RDD-DataFrame-va-Toi-uu-Shuffle.pdf",
    publicUrl: "/hoc-lieu/BIGDATA-Slide-Spark-RDD-DataFrame-va-Toi-uu-Shuffle.pdf",
    pageCount: 5,
    updatedAt: "2026-03-08",
    summary: "Slide tổng hợp 5 kỹ thuật tối ưu hóa hiệu năng Spark thực chiến: thay groupByKey bằng reduceByKey, Broadcast Hash Join, Salting chống Data Skew và chọn coalesce vs repartition.",
    samplePrompt: "Giải thích 4 kỹ thuật giảm Shuffle và xử lý Data Skew (Broadcast Join, reduceByKey, Salting, coalesce vs repartition) trong slide môn Big Data.",
    keywords: ["0101103389", "slide", "broadcast join", "reducebykey", "groupbykey", "data skew", "salting", "coalesce"],
    content: `SLIDE BÀI GIẢNG BIG DATA (0101103389): TỐI ƯU SHUFFLE & XỬ LÝ DATA SKEW TRÊN SPARK
Giảng viên: ThS. Lê Thị Hồng | Phòng học: B1-302

[Slide 1-3] Tại sao luôn ưu tiên reduceByKey / aggregateByKey thay vì groupByKey?
- groupByKey kéo TOÀN BỘ bản ghi cùng khóa qua mạng về một Executor rồi mới gộp -> Rất dễ tràn RAM (OOM) khi một khóa có hàng triệu dòng.
- reduceByKey gộp cục bộ (map-side combine) ngay trên từng phân vùng trước khi Shuffle, giảm 70% - 95% dung lượng dữ liệu truyền qua mạng.

[Slide 4-6] Broadcast Hash Join khi kết nối bảng lớn (Fact) với bảng danh mục nhỏ (Dimension)
- Khi bảng danh mục (ví dụ danh sách 450 học phần hoặc 63 tỉnh thành, kích thước < 10 MB mặc định spark.sql.autoBroadcastJoinThreshold) kết nối với bảng log 200 triệu dòng: dùng broadcast(dim_df) để phát bản sao bảng nhỏ tới mọi Executor, triệt tiêu hoàn toàn bước Shuffle của bảng lớn!

[Slide 7-10] Xử lý lệch dữ liệu (Data Skew) và phân biệt repartition(n) vs coalesce(n)
- Triệu chứng Data Skew: 199/200 task hoàn thành trong 5 giây nhưng 1 task cuối treo 15 phút do một khóa "nóng" (hot key) chiếm 60% dữ liệu. Giải pháp: Bật Adaptive Query Execution (spark.sql.adaptive.skewJoin.enabled = true) hoặc gắn tiền tố muối ngẫu nhiên (Key Salting: key_0 .. key_7) ở pha tổng hợp hai bước.
- repartition(n): Thực hiện Full Shuffle để cân bằng đều kích thước phân vùng (tăng hoặc giảm số phân vùng).
- coalesce(n): Chỉ gộp các phân vùng sẵn có trên cùng nút để GIẢM số phân vùng trước khi ghi tệp ra đĩa mà không gây Full Shuffle.`,
  },
  {
    id: "bigdata-exercise",
    courseCode: "0101103389",
    courseName: "Dữ liệu lớn - Big Data",
    credits: 3,
    lecturer: "ThS. Lê Thị Hồng",
    room: "B1-302 / B1-204",
    semester: "HK2 2025-2026",
    category: "exercise",
    title: "Bài tập thực hành PySpark: Phân tích nhật ký học tập & Cảnh báo học vụ",
    fileName: "BIGDATA-Bai-tap-Phan-tich-log-hoc-tap-voi-PySpark.pdf",
    publicUrl: "/hoc-lieu/BIGDATA-Bai-tap-Phan-tich-log-hoc-tap-voi-PySpark.pdf",
    pageCount: 4,
    updatedAt: "2026-03-25",
    summary: "Bài tập thực hành phòng B1-204 viết pipeline PySpark phân tích 10 triệu bản ghi nhật ký LMS, Broadcast Join với danh mục học phần và xuất báo cáo Parquet phân vùng.",
    samplePrompt: "Hướng dẫn viết mã PySpark giải Bài tập phân tích log học tập (Broadcast Join + Window Function + lưu Parquet) trong học liệu môn Big Data.",
    keywords: ["0101103389", "bài tập", "pyspark", "nhật ký học tập", "parquet", "cảnh báo học vụ"],
    content: `PHIẾU BÀI TẬP THỰC HÀNH DỮ LIỆU LỚN VỚI PYSPARK (Mã HP: 0101103389)
Phòng thực hành: B1-204 | Giảng viên: ThS. Lê Thị Hồng

BÀI TOÁN: Cho hai tập dữ liệu trên kho lưu trữ phân tán của cổng đào tạo số:
1. learning_events.parquet (~12 triệu dòng): (event_id, student_code, course_code, event_type, duration_sec, submitted_late, event_ts)
2. courses_catalog.csv (420 dòng): (course_code, course_name, faculty, credits)

YÊU CẦU CÀI ĐẶT PYSPARK:
Câu 1 (2.5 điểm) - Đọc dữ liệu với lược đồ tường minh (StructType), lọc bỏ bản ghi lỗi (student_code IS NULL hoặc duration_sec < 0) và chuẩn hóa cột ngày event_date = to_date(event_ts).
Câu 2 (2.5 điểm) - Thực hiện kết nối tối ưu giữa learning_events và courses_catalog bằng F.broadcast(courses_df); giải thích kế hoạch thực thi vật lý thông qua df.explain(True) (xác nhận xuất hiện BroadcastHashJoin thay vì SortMergeJoin).
Câu 3 (3.0 điểm) - Tính tổng số giờ tự học trực tuyến, tỷ lệ nộp bài trễ hạn của từng sinh viên theo từng khoa; dùng Window.partitionBy("faculty").orderBy(F.desc("total_hours")) để xếp hạng sinh viên và gắn nhãn cảnh báo sớm "CAN_HO_TRO" cho các sinh viên có thời lượng học < 2.0 giờ/tuần và tỷ lệ trễ hạn > 40%.
Câu 4 (2.0 điểm) - Gộp phân vùng hợp lý bằng coalesce(4) và ghi kết quả ra định dạng nén Snappy Parquet phân vùng theo cột faculty (partitionBy("faculty")).`,
  },

  // ==================== 5. EN2130 - TIẾNG ANH CHUYÊN NGÀNH CNTT ====================
  {
    id: "en2130-syllabus",
    courseCode: "EN2130",
    courseName: "Tiếng Anh chuyên ngành CNTT",
    classId: "11111111-1111-4111-8111-111111111103",
    credits: 2,
    lecturer: "ThS. Đỗ Thanh Mai",
    room: "B1-104",
    semester: "HK1 2026-2027",
    category: "syllabus",
    title: "Đề cương chi tiết học phần Tiếng Anh chuyên ngành CNTT (EN2130)",
    fileName: "EN2130-De-cuong-Tieng-Anh-chuyen-nganh-CNTT.pdf",
    publicUrl: "/hoc-lieu/EN2130-De-cuong-Tieng-Anh-chuyen-nganh-CNTT.pdf",
    pageCount: 3,
    updatedAt: "2026-09-07",
    summary: "Đề cương 2 tín chỉ (ThS. Đỗ Thanh Mai, phòng B1-104): đọc hiểu tài liệu API/RFC, viết email xin thực tập, viết CV kỹ thuật và thuyết trình kiến trúc phần mềm.",
    samplePrompt: "Tóm tắt chuẩn đầu ra và các chủ đề học tập trong đề cương môn Tiếng Anh chuyên ngành CNTT (EN2130).",
    keywords: ["en2130", "tiếng anh chuyên ngành", "english", "đề cương", "cover letter", "cv"],
    content: `TRƯỜNG ĐẠI HỌC SAO ĐỎ - KHOA DU LỊCH & NGOẠI NGỮ / KHOA CNTT
ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN: TIẾNG ANH CHUYÊN NGÀNH CNTT (Mã HP: EN2130)

1. THÔNG TIN CHUNG
- Số tín chỉ: 2 (30 tiết tại phòng B1-104) | Giảng viên: ThS. Đỗ Thanh Mai.
- Chuẩn đầu ra: Đọc hiểu tài liệu kỹ thuật phần mềm (API Docs, Architecture ADR), nắm vững 400 thuật ngữ CNTT cốt lõi, viết chuẩn Email xin thực tập / Technical Resume và trình bày sản phẩm phần mềm 5 phút bằng tiếng Anh.
- Trọng số đánh giá: Chuyên cần 10% | Bài viết Email + Thuyết trình nhóm giữa kỳ 30% | Thi viết & đọc hiểu cuối kỳ 60%.`,
  },
  {
    id: "en2130-textbook",
    courseCode: "EN2130",
    courseName: "Tiếng Anh chuyên ngành CNTT",
    classId: "11111111-1111-4111-8111-111111111103",
    credits: 2,
    lecturer: "ThS. Đỗ Thanh Mai",
    room: "B1-104",
    semester: "HK1 2026-2027",
    category: "textbook",
    title: "Giáo trình English for Software Engineering & Technical Communication",
    fileName: "EN2130-Giao-trinh-English-for-Software-Engineering.pdf",
    publicUrl: "/hoc-lieu/EN2130-Giao-trinh-English-for-Software-Engineering.pdf",
    pageCount: 4,
    updatedAt: "2026-09-14",
    summary: "Từ vựng chuyên ngành kiến trúc Web/Database/Cloud, cấu trúc ngữ pháp mô tả luồng hệ thống và khung viết Technical Cover Letter chuẩn doanh nghiệp.",
    samplePrompt: "Tổng hợp cấu trúc viết Email xin thực tập ngành phần mềm và các cụm động từ mô tả dự án trong giáo trình môn EN2130.",
    keywords: ["en2130", "giáo trình", "technical communication", "internship email", "action verbs"],
    content: `GIÁO TRÌNH TIẾNG ANH CHUYÊN NGÀNH CÔNG NGHỆ THÔNG TIN (EN2130)

UNIT 1. DESCRIBING SOFTWARE ARCHITECTURE & DATA FLOWS
- Useful collocations: decouple microservices, enforce role-based access control (RBAC), reduce query latency, normalize relational schemas, containerize stateless workloads, handle graceful degradation.
- Passive & Cause-Effect patterns in technical specs: "Incoming multipart payloads are validated at the edge gateway before being forwarded to the inference worker, thereby preventing malformed requests from consuming quota."

UNIT 2. WRITING AN INTERNSHIP APPLICATION EMAIL & TECHNICAL RESUME
- 4-Part Email Structure (140 - 170 words):
  1. Clear Subject Line: [Application - Software Engineering Intern] Full Name - Sao Do University.
  2. Opening Hook: State exact position, current academic standing (final-year Software Engineering student at Sao Do University), and availability window.
  3. Evidence Paragraph (STAR / XYZ formula): Accomplished [X] as measured by [Y], by implementing [Z] (e.g., Built a full-stack academic portal with Next.js and PostgreSQL serving 6 role workflows).
  4. Polite Call-to-Action & Sign-off: Reference attached CV/GitHub portfolio and express readiness for a technical interview.`,
  },
  {
    id: "en2130-slide",
    courseCode: "EN2130",
    courseName: "Tiếng Anh chuyên ngành CNTT",
    classId: "11111111-1111-4111-8111-111111111103",
    credits: 2,
    lecturer: "ThS. Đỗ Thanh Mai",
    room: "B1-104",
    semester: "HK1 2026-2027",
    category: "slide",
    title: "Slide bài giảng: Software Interview Q&A & Bug Report Writing",
    fileName: "EN2130-Slide-Software-Interview-va-Bug-Report.pdf",
    publicUrl: "/hoc-lieu/EN2130-Slide-Software-Interview-va-Bug-Report.pdf",
    pageCount: 4,
    updatedAt: "2026-10-08",
    summary: "Slide mẫu viết Bug Report chuẩn (Steps to Reproduce, Expected vs Actual Result) và cách trả lời phỏng vấn kỹ thuật theo mô hình STAR.",
    samplePrompt: "Tóm tắt cấu trúc viết Bug Report bằng tiếng Anh và khung trả lời phỏng vấn STAR trong slide môn EN2130.",
    keywords: ["en2130", "slide", "bug report", "star method", "phỏng vấn"],
    content: `SLIDE BÀI GIẢNG EN2130 - BUG REPORT WRITING & TECHNICAL INTERVIEWING
Giảng viên: ThS. Đỗ Thanh Mai | Phòng học: B1-104

[Slide 1-3] Standard Bug Report Template
- Title: Concise [Component] Defect summary (e.g., [Attendance Export] CSV omits UTF-8 BOM on Windows Excel).
- Environment: Browser, OS, Commit SHA, Role.
- Steps to Reproduce: Numbered, deterministic actions.
- Expected Result vs Actual Result: Concrete observable behavior, HTTP status code, or log snippet.

[Slide 4-6] Answering Behavioral & Project Questions with the STAR Framework
- Situation (15%): Context of the course project or internship team.
- Task (15%): Specific engineering bottleneck or deadline constraint.
- Action (45%): Technical decisions YOU made ("I refactored...", "I indexed...").
- Result (25%): Quantifiable outcome (response time, test coverage, user adoption).`,
  },
  {
    id: "en2130-exercise",
    courseCode: "EN2130",
    courseName: "Tiếng Anh chuyên ngành CNTT",
    classId: "11111111-1111-4111-8111-111111111103",
    credits: 2,
    lecturer: "ThS. Đỗ Thanh Mai",
    room: "B1-104",
    semester: "HK1 2026-2027",
    category: "exercise",
    title: "Bài tập EN2130: Dịch thuật tài liệu API & Viết Email xin thực tập 150 từ",
    fileName: "EN2130-Bai-tap-Dich-tai-lieu-API-va-Email-thuc-tap.pdf",
    publicUrl: "/hoc-lieu/EN2130-Bai-tap-Dich-tai-lieu-API-va-Email-thuc-tap.pdf",
    pageCount: 3,
    updatedAt: "2026-10-19",
    summary: "Phiếu bài tập dịch đoạn đặc tả RESTful API Authentication và viết email ứng tuyển thực tập sinh lập trình Web 150 từ kèm tiêu chí chấm.",
    samplePrompt: "Hướng dẫn dàn ý và từ vựng học thuật để làm Bài 2 (viết email 150 từ ứng tuyển thực tập sinh Backend/Full-stack) trong bài tập môn EN2130.",
    keywords: ["en2130", "bài tập", "email xin thực tập", "150 từ", "dịch tài liệu api"],
    content: `PHIẾU BÀI TẬP HỌC PHẦN TIẾNG ANH CHUYÊN NGÀNH CNTT (EN2130)
Phòng học: B1-104 | Giảng viên: ThS. Đỗ Thanh Mai

Task 1 (4.0 pts) - Technical Reading & Translation
Translate the following REST API specification excerpt into accurate Vietnamese terminology (keep standard tokens such as JWT, idempotency key, rate limiting in parentheses):
"All state-mutating POST requests require an Idempotency-Key header formatted as a version-4 UUID. When a client retries a timed-out request with the same key, the gateway replays the original status code without re-executing the database transaction."

Task 2 (6.0 pts) - Internship Application Email (140 - 160 words)
Write a formal email to the Engineering Hiring Manager at a partner software company applying for a Full-stack / Backend Intern role. Mention your major at Sao Do University, two core technical skills (e.g., C++/Java OOP, SQL database design, or Next.js/Python), one concrete academic project, and your attached CV. Avoid contractions and informal slang.`,
  },
];

const CUSTOM_MATERIALS_KEY = "sao-do:custom-course-materials:v1";
const CUSTOM_MATERIALS_EVENT = "sao-do:course-materials-sync";

export function readCustomCourseMaterials(): CourseMaterial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_MATERIALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CourseMaterial[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomCourseMaterial(item: CourseMaterial): CourseMaterial[] {
  const current = readCustomCourseMaterials();
  const next = [item, ...current.filter((m) => m.id !== item.id)].slice(0, 40);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CUSTOM_MATERIALS_EVENT));
    } catch {
      // Ignore quota errors.
    }
  }
  return next;
}

export function removeCustomCourseMaterial(id: string): CourseMaterial[] {
  const next = readCustomCourseMaterials().filter((m) => m.id !== id);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CUSTOM_MATERIALS_EVENT));
    } catch {
      // Ignore storage errors.
    }
  }
  return next;
}

export function subscribeCustomCourseMaterials(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CUSTOM_MATERIALS_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CUSTOM_MATERIALS_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function foldVietnamese(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

export function findMaterialByFileName(
  fileName: string,
  extraMaterials: CourseMaterial[] = [],
): CourseMaterial | undefined {
  const base = fileName.replace(/\\/g, "/").split("/").at(-1)?.trim().toLowerCase() ?? "";
  if (!base) return undefined;
  const all = [...extraMaterials, ...BUILTIN_COURSE_MATERIALS];
  return all.find((item) => item.fileName.toLowerCase() === base);
}

export function getMaterialsForClass(
  classIdOrCourseCode: string,
  extraMaterials: CourseMaterial[] = [],
): CourseMaterial[] {
  const key = classIdOrCourseCode.trim().toLowerCase();
  const all = [...extraMaterials, ...BUILTIN_COURSE_MATERIALS];
  return all.filter(
    (m) =>
      m.classId?.toLowerCase() === key ||
      m.courseCode.toLowerCase() === key ||
      key.includes(m.courseCode.toLowerCase()),
  );
}

/**
 * Deterministic keyword + course + category RAG retriever so any question about
 * syllabi, textbooks, lecture slides, or exercises grounds on exact SDU course documents.
 */
export function retrieveRelevantMaterials(
  query: string,
  options: {
    attachedFileNames?: string[];
    courseCode?: string;
    extraMaterials?: CourseMaterial[];
    limit?: number;
  } = {},
): CourseMaterial[] {
  const all = [...(options.extraMaterials ?? []), ...BUILTIN_COURSE_MATERIALS];
  const limit = options.limit ?? 5;
  const foldedQuery = foldVietnamese(query);
  const queryTokens = foldedQuery
    .split(/[^a-z0-9+]+/)
    .filter((tok) => tok.length >= 2);

  const attachedSet = new Set(
    (options.attachedFileNames ?? []).map(
      (name) => name.replace(/\\/g, "/").split("/").at(-1)?.toLowerCase() ?? "",
    ),
  );

  const wantsSyllabus = /de cuong|chuan dau ra|clo|trong so|lich trinh|so tin chi/.test(foldedQuery);
  const wantsTextbook = /giao trinh|ly thuyet|cong thuc| co che |nguyen ly| dinh nghia /.test(` ${foldedQuery} `);
  const wantsSlide = /slide|bai giang|chuong |so sanh|meo /.test(` ${foldedQuery} `);
  const wantsExercise = /bai tap|thuc hanh|de bai|huong dan giai|rubric|code mau/.test(foldedQuery);

  const scored = all.map((doc) => {
    let score = 0;
    if (attachedSet.has(doc.fileName.toLowerCase())) {
      score += 1000;
    }
    if (options.courseCode && doc.courseCode.toLowerCase() === options.courseCode.toLowerCase()) {
      score += 30;
    }
    const foldedCode = foldVietnamese(doc.courseCode);
    const foldedCourse = foldVietnamese(doc.courseName);
    const foldedTitle = foldVietnamese(doc.title);
    const foldedContent = foldVietnamese(`${doc.summary} ${doc.content}`);

    if (foldedQuery.includes(foldedCode)) score += 45;
    if (foldedQuery.includes(foldedCourse)) score += 38;

    for (const kw of doc.keywords) {
      const fkw = foldVietnamese(kw);
      if (fkw && foldedQuery.includes(fkw)) score += 22;
    }

    for (const tok of queryTokens) {
      if (foldedTitle.includes(tok)) score += 7;
      else if (foldedContent.includes(tok)) score += 3;
    }

    if (wantsSyllabus && doc.category === "syllabus") score += 14;
    if (wantsTextbook && doc.category === "textbook") score += 14;
    if (wantsSlide && doc.category === "slide") score += 14;
    if (wantsExercise && doc.category === "exercise") score += 14;

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((item) => item.score >= 12).slice(0, limit).map((item) => item.doc);
  if (matched.length > 0) return matched;

  // Provide a concise overview index when the prompt is general so the assistant knows all 20 materials exist.
  return [];
}

export function formatCourseMaterialsContext(
  matched: CourseMaterial[],
  extraMaterials: CourseMaterial[] = [],
): string {
  const all = [...extraMaterials, ...BUILTIN_COURSE_MATERIALS];
  const catalogLines = COURSE_MATERIAL_GROUPS.map((grp) => {
    const docs = all.filter((m) => m.courseCode === grp.courseCode);
    const names = docs
      .map((d) => `[${MATERIAL_CATEGORY_META[d.category].shortLabel}] ${d.title} (${d.fileName})`)
      .join("; ");
    return `- ${grp.courseCode} (${grp.courseName} - ${grp.lecturer} - Phòng ${grp.room}): ${names}`;
  }).join("\n");

  if (!matched.length) {
    return `DANH MỤC HỌC LIỆU MÔN HỌC ĐÃ NẠP TRÊN HỆ THỐNG SDU (${all.length} tài liệu gồm Đề cương, Giáo trình, Slide, Bài tập):\n${catalogLines}`;
  }

  const detailed = matched
    .map(
      (m, idx) =>
        `--- TÀI LIỆU #${idx + 1}: [${MATERIAL_CATEGORY_META[m.category].label}] ${m.title} ---\n` +
        `Học phần: ${m.courseName} (${m.courseCode}) | Giảng viên: ${m.lecturer} | Phòng học: ${m.room} | Tệp gốc: ${m.fileName}\n` +
        `${m.content}`,
    )
    .join("\n\n");

  return (
    `DANH MỤC HỌC LIỆU MÔN HỌC TRÊN HỆ THỐNG SDU:\n${catalogLines}\n\n` +
    `NỘI DUNG CHI TIẾT CÁC HỌC LIỆU LIÊN QUAN TRỰC TIẾP ĐẾN CÂU HỎI (Hãy bám sát số liệu, công thức, quy định trong học liệu dưới đây và trích dẫn rõ tên tệp/loại học liệu):\n\n${detailed}`
  );
}
