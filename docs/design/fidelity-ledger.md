# Sổ đối chiếu giao diện Ngày 1–7

## Bằng chứng

- Concept nguồn: `docs/design/web-classes-concept.png`
- Bản chạy desktop: `docs/design/qa-portal-1440.png`
- Bản chạy tablet: `docs/design/qa-portal-768.png`
- Bản chạy mobile web: `docs/design/qa-portal-412.png`
- Trang truy cập desktop: `docs/design/qa-landing-1440.png`
- Academic Alpha Admin: `docs/design/qa-academic-admin-1440.png`
- Academic Alpha Teacher: `docs/design/qa-academic-teacher-1440.png`
- Academic Alpha Admin mobile web: `docs/design/qa-academic-admin-412.png`

## Đối chiếu

| Hạng mục | Kết quả |
|---|---|
| Nhận diện | Giữ logo, nền xanh navy, xanh cobalt, đỏ CTA và quỹ đạo vàng từ biểu trưng. |
| Bố cục | Giữ rail trái, topbar, danh sách lớp và panel chi tiết; thêm form/panel học thuật theo cùng hệ hình mở. |
| Typography | Geist, tiêu đề đậm, nhãn nhỏ và mật độ dữ liệu tương đương concept. |
| Responsive | Không có tràn ngang ở viewport 1440, 768 và 412 px; tablet giữ nhãn điều hướng, mobile chuyển rail xuống đáy. |
| Khả dụng | Có focus rõ, nhãn truy cập, trạng thái tải/lỗi/trống, reduced-motion và mục tiêu chạm tối thiểu 44 px. |

## Sai khác có chủ đích

Academic Alpha hiện thực nút tạo lớp, chọn giảng viên/sinh viên, công bố bài, bài nộp và phản hồi bằng dữ liệu BFF/RLS thật. Bộ lọc nâng cao, sĩ số tổng hợp, dashboard, biểu đồ, upload và nút lưu nháp vẫn bị loại bỏ vì chưa có hợp đồng nghiệp vụ hoàn chỉnh. Student web chỉ đọc trạng thái; nộp bài thuộc bề mặt Expo. Khi thiếu cấu hình, portal không giả lập thao tác học thuật thật; mobile demo luôn có nhãn dữ liệu mẫu.
