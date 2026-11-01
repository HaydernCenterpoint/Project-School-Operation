-- Canonical Sao Do University Dataset & KV State Sync
-- Adds portal_kv_store for student portal state persistence & expands DK13-CNTT1 cohort data

create table if not exists public.portal_kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.portal_kv_store enable row level security;

drop policy if exists "Allow public read portal_kv_store" on public.portal_kv_store;
create policy "Allow public read portal_kv_store" on public.portal_kv_store for select to anon, authenticated using (true);
drop policy if exists "Allow public write portal_kv_store" on public.portal_kv_store;
create policy "Allow public write portal_kv_store" on public.portal_kv_store for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.portal_kv_store to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.portal_kv_store;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- Expand DK13-CNTT1 cohort roster to 10 canonical students
insert into public.teacher_class_roster (
  student_code, account_id, full_name, email, phone, cohort_class, role_in_class, attendance_pct, gpa, status, teacher_note
) values
  ('2200286', 'acc-leader-minh', 'Nguyễn Văn Đạt', '2200286@sv.saodo.edu.vn', '0936651618', 'DK13-CNTT1', 'Trưởng CLB Tin học', 100, 3.08, 'active', 'Sinh viên lớp DK13-CNTT1 (Mã hồ sơ 221SDUOM.00028), đã tích lũy 143/163 tín chỉ (GPA HK8 đạt 3.74/4.0 Xuất sắc, Thực tập doanh nghiệp 10.0, Đồ án CNPM 9.2).'),
  ('2200287', 'acc-student-linh', 'Phạm Khánh Linh', '2200287@sv.saodo.edu.vn', '0974118209', 'DK13-CNTT1', 'Lớp trưởng', 100, 3.72, 'active', 'Lớp trưởng gương mẫu, tổng hợp sĩ số và bài nộp của lớp đúng hạn mọi tuần.'),
  ('2200288', 'acc-student-hoang', 'Lê Việt Hoàng', '2200288@sv.saodo.edu.vn', '0963502914', 'DK13-CNTT1', 'Thành viên lớp', 92, 3.15, 'active', 'Tư duy thuật toán khá, cần chú ý tách giao diện header/implementation rõ hơn trong bài thực hành.'),
  ('2200289', 'acc-student-trang', 'Đỗ Thu Trang', '2200289@sv.saodo.edu.vn', '0936194820', 'DK13-CNTT1', 'Bí thư Chi đoàn', 96, 3.54, 'active', 'Bí thư Chi đoàn năng nổ, hoàn thành tốt phần thiết kế lược đồ CSDL và báo cáo nhóm.'),
  ('2200290', 'acc-student-bao', 'Vũ Quốc Bảo', '2200290@sv.saodo.edu.vn', '0948220317', 'DK13-CNTT1', 'Thành viên lớp', 84, 2.78, 'warning', 'Vắng 2 buổi thực hành Lab 3; đã nhắc bổ sung bài thực hành Kế thừa trước thứ Sáu.'),
  ('2200291', 'acc-student-tuan', 'Hoàng Minh Tuấn', '2200291@sv.saodo.edu.vn', '0919334781', 'DK13-CNTT1', 'Thành viên lớp', 95, 3.32, 'active', 'Hoàn thành sớm các bài tập truy vấn SQL và tích cực đặt câu hỏi trên lớp.'),
  ('2200292', 'acc-student-anh', 'Đỗ Thị Ngọc Ánh', '2200292@sv.saodo.edu.vn', '0973519284', 'DK13-CNTT1', 'Lớp phó học tập', 99, 3.61, 'active', 'Phụ trách nhóm ôn tập Toán rời rạc và Cơ sở dữ liệu của lớp DK13-CNTT1; đặc tả lược đồ 3NF rất chặt chẽ.'),
  ('2200293', 'acc-student-manh', 'Vũ Đức Mạnh', '2200293@sv.saodo.edu.vn', '0918472630', 'DK13-CNTT1', 'Thành viên lớp', 91, 3.04, 'active', 'Kỹ năng cấu hình mạng và quản trị hệ thống Linux tốt, thực hành bấm cáp và định tuyến đạt điểm tối đa.'),
  ('2200294', 'acc-student-thao', 'Bùi Phương Thảo', '2200294@sv.saodo.edu.vn', '0989304172', 'DK13-CNTT1', 'Phó bí thư Chi đoàn', 98, 3.52, 'active', 'Tích cực trong phong trào Sinh viên 5 Tốt, bài tập lớn môn OOP và Kiểm thử phần mềm hoàn thành vượt yêu cầu.'),
  ('2200295', 'acc-student-tung', 'Ngô Thanh Tùng', '2200295@sv.saodo.edu.vn', '0945718293', 'DK13-CNTT1', 'Ủy viên BCH lớp', 94, 3.24, 'active', 'Thành viên Ban chuyên môn CLB Tin học Sao Đỏ, phụ trách kỹ thuật giao diện Web và kiểm thử tự động.')
on conflict (student_code) do update set
  full_name = excluded.full_name,
  role_in_class = excluded.role_in_class,
  attendance_pct = excluded.attendance_pct,
  gpa = excluded.gpa,
  status = excluded.status,
  teacher_note = excluded.teacher_note,
  updated_at = now();

-- Update attendance sessions to cover all 10 students in DK13-CNTT1
update public.teacher_attendance_sessions
set marks = '{"2200286":"present","2200287":"present","2200288":"present","2200289":"present","2200290":"unexcused","2200291":"present","2200292":"present","2200293":"present","2200294":"present","2200295":"present"}'::jsonb
where id = 'att-it3040-w9';

update public.teacher_attendance_sessions
set marks = '{"2200286":"excused","2200287":"present","2200288":"present","2200289":"present","2200290":"unexcused","2200291":"present","2200292":"present","2200293":"present","2200294":"present","2200295":"present"}'::jsonb
where id = 'att-it3040-w8';

update public.teacher_attendance_sessions
set marks = '{"2200286":"present","2200287":"present","2200288":"excused","2200289":"present","2200290":"present","2200291":"present","2200292":"present","2200293":"present","2200294":"present","2200295":"present"}'::jsonb
where id = 'att-it3160-w9';

-- Add canonical submissions for additional students
insert into public.portal_submissions (
  id, assignment_id, student_account_id, student_code, student_name, content, submitted_at, status, score, feedback, feedback_at, graded_by
) values
  (
    'sub-anh-oop-1',
    '22222222-2222-4222-8222-222222222201',
    'acc-student-anh',
    '2200292',
    'Đỗ Thị Ngọc Ánh',
    'Xây dựng phân cấp lớp TaiLieu -> SachGiaoTrinh, LuanVan, TapChi bằng C++20; áp dụng mẫu thiết kế Factory Method cho việc khởi tạo đối tượng từ tệp dữ liệu thư viện và viết 15 ca kiểm thử tự động.',
    now() - interval '20 hours',
    'reviewed',
    9.4,
    'Điểm 9.4/10 · Áp dụng Factory Method hợp lý, mã nguồn sạch và tuân thủ chuẩn đóng gói dữ liệu.',
    now() - interval '2 hours',
    'ThS. Trần Minh Đức'
  ),
  (
    'sub-thao-db-1',
    '22222222-2222-4222-8222-222222222202',
    'acc-student-thao',
    '2200294',
    'Bùi Phương Thảo',
    'Hoàn thành lược đồ ERD chuẩn 3NF gồm 12 thực thể quản lý mượn trả thư viện SDU; cài đặt đầy đủ khóa ngoại, trigger kiểm tra số lượng sách tồn và truy vấn thống kê độc giả quá hạn.',
    now() - interval '14 hours',
    'submitted',
    null,
    null,
    null,
    null
  )
on conflict (id) do nothing;

-- Expand club members with verified DK13-CNTT1 students
insert into public.club_members (
  id, club_id, student_code, full_name, cohort_class, member_role, status, joined_at, note
) values
  ('cm-5', 'club-it', '2200292', 'Đỗ Thị Ngọc Ánh', 'DK13-CNTT1', 'Trưởng nhóm Học thuật CSDL', 'active', '15/09/2025', 'Phụ trách biên soạn tài liệu SQL & chuẩn hóa lược đồ 3NF'),
  ('cm-6', 'club-it', '2200295', 'Ngô Thanh Tùng', 'DK13-CNTT1', 'Thành viên Ban Web & AI', 'active', '20/09/2025', 'Phát triển công cụ chấm bài tự động cho CLB')
on conflict (id) do nothing;
