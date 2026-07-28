# Hướng dẫn vận hành Academic Alpha

Hướng dẫn này dành cho demo cục bộ bằng dữ liệu tổng hợp. Đây không phải hướng dẫn vận hành staging hoặc production.

## Trước khi demo

- Khởi động và seed môi trường cục bộ theo `README.md`.
- Web cần cấu hình Supabase cho trình duyệt và BFF. Mobile cần đủ `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` và `EXPO_PUBLIC_API_URL`.
- Khi thiếu cấu hình, web hiển thị trạng thái chưa sẵn sàng và mobile chặn đăng nhập. Không bề mặt nào thay thế dữ liệu thật bằng dữ liệu mẫu.
- Chỉ dùng danh tính tổng hợp bên dưới. Không nhập dữ liệu thật hoặc dữ liệu của người chưa thành niên.

## Tài khoản tổng hợp

Dùng bộ Campus A cho một luồng xuyên suốt. Tất cả tài khoản dùng mật khẩu `Password123!`.

| Vai trò | Email | Bề mặt chính |
|---|---|---|
| School Admin | `admin.a@saodo.test` | Web |
| Moderator | `moderator.a@saodo.test` | Web |
| Teacher | `teacher.a@saodo.test` | Web |
| Student | `student.a@saodo.test` | Expo mobile |

Campus B có bộ tài khoản tương ứng tại `admin.b@saodo.test`, `moderator.b@saodo.test`, `teacher.b@saodo.test` và `student.b@saodo.test`; chỉ dùng bộ này khi kiểm tra cách ly tenant.

## Luồng cốt lõi

### 1. School Admin tạo lớp

1. Mở web, đăng nhập bằng School Admin.
2. Tại **Lớp học**, nhập tên lớp, chọn Teacher A và chọn Student A.
3. Chọn **Tạo lớp và phân công**.

Kết quả mong đợi: portal hiển thị vai trò **Quản trị viên**, thông báo **Đã tạo lớp và phân công thành viên**, và lớp mới xuất hiện trong danh sách. Admin không xem được nội dung bài nộp.

### 2. Teacher công bố bài và phản hồi

1. Mở một phiên trình duyệt tách biệt, đăng nhập bằng Teacher.
2. Chọn lớp vừa tạo, nhập tiêu đề, hạn nộp tùy chọn và yêu cầu, rồi chọn **Công bố bài tập**.
3. Sau khi Student nộp bài, mở lại bài tập, nhập phản hồi và chọn **Gửi phản hồi**.

Kết quả mong đợi: bài có trạng thái **Đã công bố**; bài nộp chuyển từ **Đã nộp** sang **Đã phản hồi** sau khi gửi phản hồi. Chỉ Teacher được phân công mới thấy và phản hồi bài nộp của lớp.

### 3. Student nộp bài trên mobile

1. Đăng nhập ứng dụng Expo bằng Student.
2. Từ **Hôm nay** hoặc **Lớp học**, mở lớp rồi mở bài đã công bố.
3. Nhập từ 1 đến 20.000 ký tự và chọn **Nộp bài**.
4. Sau khi Teacher phản hồi, quay lại danh sách rồi mở lại bài tập.

Kết quả mong đợi: ứng dụng hiển thị **Đã nộp**, sau đó **Đã nhận phản hồi** cùng nội dung phản hồi. Nếu gửi lỗi, nội dung vẫn được giữ để thử lại. Mỗi Student chỉ có một bài nộp cho một bài tập.

Student có thể đăng nhập web để đọc lớp, bài tập và trạng thái của mình, nhưng phải dùng mobile để nộp bài. Bài nộp chỉ hỗ trợ văn bản; file, URL và rich text không được hỗ trợ.

### 4. Student sử dụng cộng đồng an toàn

1. Trên mobile, mở tab **Cộng đồng**.
2. Mở kênh lớp hoặc câu lạc bộ, gửi tin nhắn văn bản, trả lời và chọn **Thích**.
3. Với tin nhắn của người khác, thử **Báo cáo** hoặc **Chặn**. Có thể tắt trạng thái chú ý bằng **Tắt thông báo** mà vẫn đọc được tin nhắn.
4. Kênh toàn trường là chỉ đọc đối với Student. Câu lạc bộ cho phép **Rời câu lạc bộ**; kênh trường và lớp không cho rời thủ công.

Kết quả mong đợi: chỉ các kênh đúng tenant và membership xuất hiện; tin nhắn mới cập nhật trực tiếp khi kết nối realtime hoạt động. Nếu nội dung có dấu hiệu chứa số điện thoại, địa chỉ, giấy tờ, tài khoản, OTP hoặc link, ứng dụng yêu cầu kiểm tra và xác nhận trước khi gửi lại. `@AI` bị chặn cục bộ vì AI đang tắt.

### 5. Moderator xử lý báo cáo

1. Mở phiên trình duyệt riêng, đăng nhập bằng Moderator.
2. Tại **Hàng đợi kiểm duyệt**, dùng **Nhịp đăng bài** để đặt khoảng nghỉ 0–300 giây cho từng kênh nếu cần giảm spam.
3. Mở báo cáo và xem bằng chứng.
4. Nhập ghi chú nếu cần rồi chọn **Bỏ qua báo cáo**, **Ẩn nội dung**, **Chuyển cấp xử lý** hoặc **Đánh dấu đã xử lý**.

Kết quả mong đợi: Moderator chỉ thấy kênh và báo cáo thuộc đúng tenant, không thấy lớp, bài tập hoặc bài nộp học thuật. Nhịp đăng mới được PostgreSQL áp dụng cho các lần gửi tiếp theo. Khi chọn **Ẩn nội dung**, tin nhắn biến mất khỏi lượt đọc thông thường nhưng vẫn được giữ làm bằng chứng kiểm duyệt. Audit chỉ chứa định danh và mã hành động, không chứa nội dung tin nhắn, chi tiết báo cáo hoặc ghi chú.

## Phiên đăng nhập

- Web lưu phiên Supabase trong hồ sơ trình duyệt và tự chuyển về `/#dang-nhap` khi không còn phiên. Portal hiện chưa có nút đăng xuất; dùng cửa sổ riêng tư hoặc hồ sơ trình duyệt tách biệt cho từng vai trò, rồi đóng cửa sổ riêng tư hoặc xóa dữ liệu site để kết thúc phiên. Không đổi vai trò bằng tab khác trong cùng hồ sơ.
- Mobile lưu và tự làm mới phiên trên thiết bị. Chọn **Tài khoản → Đăng xuất** để xóa phiên và trở về màn hình đăng nhập.
- Khi phiên hết hạn, thao tác học thuật phải dừng và yêu cầu đăng nhập lại; không tiếp tục demo trên dữ liệu đang hiển thị cũ.

## Ranh giới và cổng phát hành

- **AI OFF:** không có nhà cung cấp, khóa, retrieval hoặc runtime AI. Tên lớp seed `AI Foundations A/B` chỉ là dữ liệu tổng hợp, không biểu thị một tính năng AI.
- Chỉ mô tả bản hiện tại là **Academic Alpha / local hardening**. Chưa có deployment staging/production, UAT, giám sát vận hành hoặc phê duyệt privacy/safeguarding.
- Không tuyên bố staging cho đến khi có Git SHA bất biến với CI thành công, Supabase staging có tên, web/BFF HTTPS đã deploy, kiểm thử API/E2E mới và đủ chữ ký trong `docs/release-candidate.md`.
- EAS Preview phải có đủ ba biến mobile trỏ đến URL HTTPS có thể truy cập. Build EAS từ chối cấu hình thiếu và không chấp nhận `localhost`, `127.0.0.1` hoặc `10.0.2.2`.
- Không tuyên bố đạt cổng thiết bị cho đến khi APK Preview được cài mới trên thiết bị Android vật lý và hoàn tất critical flow, TalkBack, focus, trạng thái lỗi và kiểm tra text scaling 200%.
