-- News sources for Campus A: the school's real public feeds (NukeViet RSS at /vi/news/rss/),
-- checked 2026-09-30, plus the official Facebook page (needs FACEBOOK_PAGE_ACCESS_TOKEN).
-- The main site's all-news feed is left out: every item is already in a category feed below.
-- Idempotent, so it can also be applied to a running database without a reset.

do $news$
begin
if to_regclass('public.news_sources') is null then
  return;
end if;

insert into public.news_sources (tenant_id, kind, name, url, category)
values
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Trường ĐH Sao Đỏ · Tin tức & sự kiện', 'https://saodo.edu.vn/vi/news/rss/tin-tuc-su-kien/', 'Sự kiện'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Trường ĐH Sao Đỏ · Thông báo', 'https://saodo.edu.vn/vi/news/rss/thong-bao/', 'Thông báo'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Trường ĐH Sao Đỏ · Sinh viên', 'https://saodo.edu.vn/vi/news/rss/sinh-vien/', 'Sinh viên'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Trường ĐH Sao Đỏ · Tuyển sinh', 'https://saodo.edu.vn/vi/news/rss/tin-tuyen-sinh/', 'Tuyển sinh'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Trường ĐH Sao Đỏ · Đào tạo', 'https://saodo.edu.vn/vi/news/rss/hoat-dong-dao-tao/', 'Đào tạo'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Trường ĐH Sao Đỏ · Khoa học & hợp tác', 'https://saodo.edu.vn/vi/news/rss/nghien-cuu-kh-hop-tac-qt/', 'Khoa học & hợp tác'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Điện', 'http://dien.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Cơ khí', 'http://cokhi.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Kinh tế', 'http://kinhte.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Công nghệ ô tô', 'http://oto.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Công nghệ thông tin', 'http://cntt.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa May & Thời trang', 'http://maythoitrang.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Du lịch & Ngoại ngữ', 'http://ftf.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'rss', 'Khoa Luật & Khoa học cơ bản', 'http://luat.saodo.edu.vn/vi/news/rss/', 'Tin khoa'),
  ('a0000000-0000-0000-0000-000000000001', 'facebook', 'Fanpage Trường ĐH Sao Đỏ', 'TruongDHSaoDo', 'Facebook')
on conflict (tenant_id, url) do nothing;

end
$news$;
