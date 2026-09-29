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
| Teacher | `teacher.a@saodo.test` | Web |
| Student | `student.a@saodo.test` | Web `/student` hoặc Expo mobile |
| Student (mã sinh viên) | `2200286`, mật khẩu `1111` | Web `/student`; form tự đổi mã thành `2200286@sv.saodo.edu.vn` |
| Student (chat Cộng đồng) | `2200301` đến `2200310`, mật khẩu `1111` | Web `/student/community`; mở hai trình duyệt (hoặc một cửa sổ ẩn danh) để chat giữa hai tài khoản |
| Cán bộ phòng ban | `daotao.a@saodo.test`, mật khẩu `Password123!` | Web `/quan-tri`: thêm, sửa, khoá sinh viên, cấp lại mật khẩu, nhập CSV. Giảng viên mở `/quan-tri` để xem sinh viên lớp mình |

Campus B có bộ tài khoản tương ứng tại `admin.b@saodo.test`, `teacher.b@saodo.test` và `student.b@saodo.test`; chỉ dùng bộ này khi kiểm tra cách ly tenant.

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

### 4. Student dùng web

1. Mở `/login`, đăng nhập bằng Student; hệ thống chuyển tới `/student` (Tổng quan).
2. Mở **Bài tập** → chọn bài → nhập bài làm → **Nộp bài** → **Xác nhận nộp bài**.
3. Sau khi Teacher phản hồi, **Tổng quan** hiển thị mục **Phản hồi gần đây** và trang bài tập hiển thị **Phản hồi của giảng viên**.

Bản nháp được lưu trên trình duyệt đến khi nộp thành công. Mỗi lần nộp dùng một khóa idempotency cho đúng nội dung đó nên thử lại sau lỗi mạng không tạo bài nộp thứ hai. Bài nộp chỉ hỗ trợ văn bản và không sửa được sau khi nộp. Student mở `/portal` sẽ được chuyển về `/student`.

### Chế độ khách

`/guest` hiển thị bảng điều khiển và một đoạn hội thoại AI ghi sẵn, gắn nhãn **Chế độ khách** và **Nội dung minh họa**. Khách không có phiên nên mọi API học thuật và AI trả 401; khách không bao giờ gọi AI trả phí.

## Phiên đăng nhập

- Web lưu phiên Supabase trong hồ sơ trình duyệt và tự chuyển về `/login?next=…` khi không còn phiên. Đăng xuất: Student dùng **Tài khoản → Đăng xuất**; Admin/Teacher dùng nút **Đăng xuất** trên thanh trên của portal. Không đổi vai trò bằng tab khác trong cùng hồ sơ trình duyệt. Liên kết cũ `/#dang-nhap` vẫn dẫn tới khối đăng nhập trên trang chủ.
- Mobile lưu và tự làm mới phiên trên thiết bị. Chọn **Tài khoản → Đăng xuất** để xóa phiên và trở về màn hình đăng nhập.
- Khi phiên hết hạn, thao tác học thuật phải dừng và yêu cầu đăng nhập lại; không tiếp tục demo trên dữ liệu đang hiển thị cũ.

## Ranh giới và cổng phát hành

- **AI mặc định TẮT.** Chỉ bật sau khi hoàn tất mục “Trợ lý AI” bên dưới. Tên lớp seed `AI Foundations A/B` chỉ là dữ liệu tổng hợp.
- Chỉ mô tả bản hiện tại là **Academic Alpha / local hardening**. Chưa có deployment staging/production, UAT, giám sát vận hành hoặc phê duyệt privacy/safeguarding.
- Không tuyên bố staging cho đến khi có Git SHA bất biến với CI thành công, Supabase staging có tên, web/BFF HTTPS đã deploy, kiểm thử API/E2E mới và đủ chữ ký trong `docs/release-candidate.md`.
- EAS Preview phải có đủ ba biến mobile trỏ đến URL HTTPS có thể truy cập. Build EAS từ chối cấu hình thiếu và không chấp nhận `localhost`, `127.0.0.1` hoặc `10.0.2.2`.
- Không tuyên bố đạt cổng thiết bị cho đến khi APK Preview được cài mới trên thiết bị Android vật lý và hoàn tất critical flow, TalkBack, focus, trạng thái lỗi và kiểm tra text scaling 200%.

## Trợ lý AI

**Bật:** đặt trên máy chủ web (không bao giờ dùng tiền tố `NEXT_PUBLIC_`/`EXPO_PUBLIC_`): `AI_ENABLED=true`, `AI_PROVIDER=anthropic`, `AI_MODEL` (một trong `claude-sonnet-5`, `claude-haiku-4-5-20251001`, `claude-opus-5-5`), `AI_API_KEY`. Tùy chọn: `AI_MAX_OUTPUT_TOKENS` (256–4096, mặc định 1024) và `AI_API_BASE_URL` (gateway do vận hành chỉ định). Thiếu hoặc sai bất kỳ giá trị nào thì AI tự tắt, `/api/ai/chat` trả 503 `ai_disabled` và lớp học/bài tập vẫn hoạt động. Trang chủ đọc cấu hình lúc build, nên build lại sau khi bật/tắt.

**Trước khi bật cho sinh viên:** xác minh với nhà cung cấp về giá hiện hành, chính sách lưu giữ dữ liệu phía nhà cung cấp và điều khoản giáo dục; kiểm tra streaming và timeout (90 giây) trên hạ tầng triển khai thật; chạy `pnpm test:ai`.

**Giới hạn (thực thi trong Postgres, không phụ thuộc client):** mỗi sinh viên 30 lượt/ngày, mỗi cơ sở 1.000 lượt/ngày (theo ngày giờ Việt Nam), tối đa một câu trả lời đang tạo mỗi sinh viên, tin nhắn 1–8.000 ký tự. Đổi giới hạn cho một cơ sở:

```sql
insert into private.ai_limits (tenant_id, student_daily_requests, tenant_daily_requests)
values ('<tenant uuid>', 50, 2000)
on conflict (tenant_id) do update
  set student_daily_requests = excluded.student_daily_requests,
      tenant_daily_requests = excluded.tenant_daily_requests;
```

Lượt bị hủy hoặc lỗi vẫn được tính (thận trọng về chi phí). Một yêu cầu bị bỏ dở quá 2 phút tự chuyển sang `interrupted`.

**Quyền riêng tư:** cuộc trò chuyện chỉ chủ sở hữu đọc/xóa được (RLS). Sinh viên chỉ đính kèm được bài tập mà RLS cho phép đọc. Dữ liệu tự hết hạn sau 30 ngày không dùng; mỗi lần sinh viên gửi câu hỏi sẽ dọn dữ liệu hết hạn của chính họ. Để dọn cho toàn hệ thống, lên lịch hằng ngày (ví dụ pg_cron): `select private.purge_expired_ai_conversations();`. Máy chủ không ghi nội dung tin nhắn hay token vào log.

**Rollback:** đặt `AI_ENABLED=false` và triển khai lại web. Không cần xóa bảng; dữ liệu học thuật không bị ảnh hưởng.
