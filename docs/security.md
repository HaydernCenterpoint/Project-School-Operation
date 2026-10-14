# Bảo mật, chống spam và DDoS

Hệ thống chặn lạm dụng theo từng lớp, lớp sau đỡ phần lớp trước bỏ lọt. Tài liệu này ghi lại mỗi lớp làm gì, số giới hạn nằm ở đâu và việc vận hành cần làm khi triển khai.

## Mô hình đe doạ

| Ranh giới | Rủi ro chính | Lớp chặn |
|---|---|---|
| Trình duyệt ghi thẳng vào Supabase (chat, nhóm, tin nhắn riêng, hồ sơ) | Spam tin nhắn, lặp nội dung, rải link, tạo nhóm hoặc DM hàng loạt | Trigger trong database (mục 1) |
| `/api/*` (Trợ lý AI, lớp học, bài tập, đồng bộ tin) | Dồn request từ một IP hoặc một tài khoản | Giới hạn theo IP và theo tài khoản ở Cloudflare (mục 2) |
| Đăng nhập (Supabase Auth) | Dò mật khẩu | Giới hạn của Supabase Auth, mật khẩu mạnh (mục 3) |
| Trang web | Clickjacking, chèn script, đánh hơi kiểu MIME | Header bảo mật và CSP (mục 4) |
| Toàn bộ tên miền | DDoS số lượng lớn | Cloudflare (mục 5) |
| Thao tác của cán bộ | Lạm dụng quyền, thao tác hàng loạt | Nhật ký `audit_logs` và giới hạn theo giờ (mục 1) |

## 1. Chống spam trong database

`supabase/migrations/202609300004_abuse_limits.sql`. Chạy trong database nên áp dụng dù yêu cầu đến từ web, ứng dụng di động hay một script dùng phiên đánh cắp. Bộ đếm theo từng tài khoản, lưu ở `private.academic_rate_limits`.

| Hành động | Giới hạn |
|---|---|
| Gửi tin nhắn | 12 / phút, 600 / ngày |
| Cùng nội dung, cùng phòng | Từ chối nếu lặp trong 30 giây |
| Liên kết trong một tin nhắn | Tối đa 3 |
| Một ký tự lặp liên tục | Từ chối từ 30 ký tự |
| Tạo nhóm | 5 / ngày |
| Mở tin nhắn riêng mới | 30 / ngày |
| Tham gia nhóm | 40 / giờ |
| Sửa hồ sơ | 20 / giờ |
| Ảnh, video trong chat | 4 tệp / tin nhắn, 25 MB / tệp, 100 tệp / ngày; chỉ PNG, JPG, GIF, WebP, MP4, WebM, MOV |
| Cán bộ: tạo, sửa, khoá sinh viên, cấp lại mật khẩu | 1000 / 300 / 200 / 60 mỗi giờ |
| Thêm nguồn tin, ẩn bài | 30 / ngày, 300 / giờ |
| Lớp, bài tập, bài nộp (có từ trước) | `202607280004_release_hardening.sql` |
| Trợ lý AI (có từ trước) | Hạn mức ngày trong `private.ai_limits` |

Lỗi trả về là `rate_limited`, `duplicate_message`, `too_many_links`, `spam_pattern`; giao diện đổi sang câu tiếng Việt. Kiểm thử: `supabase/tests/database/abuse_limits.test.sql`.

Ảnh và video chat nằm trong bucket riêng tư `community-media` (`202610030001_community_media.sql`), đường dẫn `<phòng>/<người gửi>/<uuid>.<đuôi>`. Chỉ thành viên phòng được tải lên, và chỉ vào thư mục của chính mình; ai đọc được phòng thì đọc được tệp qua link ký tên hết hạn sau 1 giờ. Tin nhắn chỉ gắn được tệp trong thư mục của người gửi ở đúng phòng đó. Kiểm thử: `supabase/tests/database/community_media.test.sql`.

## 2. Giới hạn API

`apps/web/src/lib/rate-limit.ts`, gọi trong `getAcademicContext` (mọi route có đăng nhập) và `/api/news/sync`.

- **Theo IP, 600 / phút**, kiểm trước khi xác thực, để một trận token rác không dội sang Supabase Auth. Rộng tay vì cả phòng máy dùng chung một IP của trường.
- **Theo tài khoản, 120 / phút** sau khi xác thực.
- Vượt giới hạn: `429` kèm `Retry-After: 60`.
- Trên Cloudflare dùng binding Workers Rate Limiting khai báo trong `apps/web/wrangler.jsonc`, đếm chung toàn mạng biên. Chạy local (`next dev`) dùng bộ đếm trong bộ nhớ. Đổi số thì sửa cả hai nơi.
- Binding lỗi thì cho qua, để sự cố của bộ đếm không làm sập cả API.

## 3. Đăng nhập

`supabase/config.toml` (local; bản Supabase trên cloud chỉnh cùng giá trị trong Dashboard > Authentication):

- Mật khẩu mới tối thiểu 8 ký tự, có cả chữ và số. Chỉ áp dụng khi đặt hoặc đổi mật khẩu.
- Xoay vòng refresh token: token bị đánh cắp mất hiệu lực khi phiên thật làm mới.
- Tối đa 120 lần đăng nhập mỗi 5 phút cho mỗi IP. Mức này rộng vì cả lớp đăng nhập cùng lúc từ một IP.
- Nếu thấy dò mật khẩu: bật CAPTCHA (Cloudflare Turnstile) trong `[auth.captcha]` và thêm widget vào `/login`. Ứng dụng di động cũng phải gửi token CAPTCHA.
- Local: các thay đổi trong `config.toml` chỉ có hiệu lực sau khi `supabase stop` rồi `supabase start`.

## 4. Header bảo mật

`apps/web/next.config.ts`, áp dụng cho mọi trang:

- `Content-Security-Policy`: chỉ tải script, style và font từ chính trang; chỉ kết nối tới trang và Supabase; không nhúng iframe, không plugin; cấm trang khác nhúng (`frame-ancestors 'none'`).
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (tắt camera, micro, vị trí, thanh toán, USB), `Cross-Origin-Opener-Policy`. Bỏ `X-Powered-By`.
- Còn hở: script cho phép `'unsafe-inline'` vì Next.js chèn script inline khi hydrate. Muốn bỏ thì chuyển sang nonce theo từng request (`proxy.ts`).
- `img-src` cho phép `http:` vì ảnh tin tức của các trang khoa chỉ có http.

Các lớp có từ trước: RLS trên mọi bảng, không render HTML thô từ người dùng hay từ AI, `global_fetch_strictly_public` trong `wrangler.jsonc` chặn server gọi vào địa chỉ nội bộ (chống SSRF, kể cả DNS rebinding), và kiểm tra địa chỉ nguồn tin trong `news-parse.ts`.

## 5. DDoS (Cloudflare)

Tấn công số lượng lớn phải chặn ở mạng biên, trước khi tới ứng dụng. Việc cần làm trong Cloudflare Dashboard khi đưa tên miền lên:

1. **DDoS managed rules:** bật sẵn trên mọi gói, giữ mặc định.
2. **Security > Bots:** bật Bot Fight Mode.
3. **Security > WAF > Rate limiting rules:** thêm luật cho `/api/*` (ví dụ 300 request / 10 giây / IP → Block 1 phút) và cho `/login` (ví dụ 20 / phút / IP → Managed Challenge).
4. **Security > Settings:** Security Level ở mức Medium. Khi đang bị tấn công, bật **Under Attack Mode** tạm thời.
5. **Caching:** tài nguyên tĩnh (`/_next/static/*`, ảnh) đã được cache ở biên nên gần như không tốn tài nguyên máy chủ.
6. **Supabase:** API của Supabase công khai (trình duyệt gọi thẳng). Bản cloud có giới hạn riêng theo gói. Nếu cần, đặt Supabase sau tên miền riêng có Cloudflare phía trước.

## Bí mật

Chỉ đặt ở biến môi trường của máy chủ, không bao giờ commit, không bao giờ đưa lên trình duyệt: `AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEWS_CRON_SECRET`, `FACEBOOK_PAGE_ACCESS_TOKEN`. Lộ một khoá thì thu hồi và tạo khoá mới trước, sau đó mới dọn lịch sử.

## Khi có sự cố

1. Bật Under Attack Mode hoặc siết luật WAF.
2. Tìm tài khoản gây ra trong `audit_logs` và `private.academic_rate_limits` (cột `actor_id`, `capability`).
3. Khoá tài khoản đó tại `/quan-tri` (trạng thái "Tạm khoá"), hoặc gỡ bài hoặc tin nhắn vi phạm.
4. Nếu lộ khoá: thu hồi và cấp khoá mới, rồi ghi lại sự việc.
