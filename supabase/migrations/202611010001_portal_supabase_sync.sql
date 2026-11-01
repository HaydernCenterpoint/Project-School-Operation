-- Full Supabase persistence and real-time sync for Student Portal, Teacher Classroom Management,
-- Attendance Roll-Call, Assignments, Submissions, Announcements, and Clubs.

create table if not exists public.teacher_class_roster (
  student_code text primary key,
  account_id text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  cohort_class text not null default 'DK13-CNTT1',
  role_in_class text not null default 'Thành viên lớp',
  attendance_pct integer not null default 100 check (attendance_pct between 0 and 100),
  gpa numeric(4,2) not null default 3.20 check (gpa between 0 and 4.00),
  status text not null default 'active' check (status in ('active', 'warning')),
  teacher_note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_subject_classes (
  id text primary key,
  class_code text not null,
  course_code text not null,
  name text not null,
  credits integer not null default 3,
  cohort_class text not null default 'DK13-CNTT1',
  schedule text not null,
  room text not null,
  semester text not null default 'HK1 2026-2027',
  total_periods integer not null default 45,
  completed_periods integer not null default 0,
  teacher_id text not null default 'acc-teacher-duc',
  teacher_name text not null default 'ThS. Trần Minh Đức',
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_attendance_sessions (
  id text primary key,
  subject_class_id text not null,
  date text not null,
  periods text not null,
  topic text not null,
  marks jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_custom_assignments (
  id text primary key,
  tenant_id text not null default '00000000-0000-4000-8000-000000000001',
  class_id text not null,
  created_by text not null,
  title text not null,
  instructions text not null,
  status text not null default 'published',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_submissions (
  id text primary key,
  assignment_id text not null,
  student_account_id text not null,
  student_code text not null,
  student_name text not null,
  content text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  score numeric(4,2),
  feedback text,
  feedback_at timestamptz,
  graded_by text
);

create table if not exists public.class_announcements (
  id text primary key,
  class_id text not null,
  title text not null,
  body text not null,
  author_name text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  id text primary key,
  club_id text not null,
  student_code text not null,
  full_name text not null,
  cohort_class text not null default 'DK13-CNTT1',
  member_role text not null default 'Thành viên',
  status text not null default 'pending' check (status in ('active', 'pending')),
  joined_at text not null,
  note text
);

create table if not exists public.club_events (
  id text primary key,
  club_id text not null,
  title text not null,
  time text not null,
  place text not null,
  summary text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS and grant access to anon and authenticated roles so both Supabase Auth sessions
-- and multi-role workspace switches persist directly to Supabase Postgres.
alter table public.teacher_class_roster enable row level security;
alter table public.teacher_subject_classes enable row level security;
alter table public.teacher_attendance_sessions enable row level security;
alter table public.portal_custom_assignments enable row level security;
alter table public.portal_submissions enable row level security;
alter table public.class_announcements enable row level security;
alter table public.club_members enable row level security;
alter table public.club_events enable row level security;

drop policy if exists teacher_class_roster_all on public.teacher_class_roster;
create policy teacher_class_roster_all on public.teacher_class_roster
  for all to anon, authenticated using (true) with check (true);

drop policy if exists teacher_subject_classes_all on public.teacher_subject_classes;
create policy teacher_subject_classes_all on public.teacher_subject_classes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists teacher_attendance_sessions_all on public.teacher_attendance_sessions;
create policy teacher_attendance_sessions_all on public.teacher_attendance_sessions
  for all to anon, authenticated using (true) with check (true);

drop policy if exists portal_custom_assignments_all on public.portal_custom_assignments;
create policy portal_custom_assignments_all on public.portal_custom_assignments
  for all to anon, authenticated using (true) with check (true);

drop policy if exists portal_submissions_all on public.portal_submissions;
create policy portal_submissions_all on public.portal_submissions
  for all to anon, authenticated using (true) with check (true);

drop policy if exists class_announcements_all on public.class_announcements;
create policy class_announcements_all on public.class_announcements
  for all to anon, authenticated using (true) with check (true);

drop policy if exists club_members_all on public.club_members;
create policy club_members_all on public.club_members
  for all to anon, authenticated using (true) with check (true);

drop policy if exists club_events_all on public.club_events;
create policy club_events_all on public.club_events
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on
  public.teacher_class_roster,
  public.teacher_subject_classes,
  public.teacher_attendance_sessions,
  public.portal_custom_assignments,
  public.portal_submissions,
  public.class_announcements,
  public.club_members,
  public.club_events
to anon, authenticated;

-- Seed initial rows idempotently
insert into public.teacher_class_roster (
  student_code, account_id, full_name, email, phone, cohort_class, role_in_class, attendance_pct, gpa, status, teacher_note
) values
  ('2200286', 'acc-leader-minh', 'Nguyễn Văn Đạt', '2200286@sv.saodo.edu.vn', '0936651618', 'DK13-CNTT1', 'Trưởng CLB Tin học', 100, 3.08, 'active', 'Sinh viên lớp DK13-CNTT1 (Mã hồ sơ 221SDUOM.00028), đã tích lũy 143/163 tín chỉ (GPA HK8 đạt 3.74/4.0 Xuất sắc, Thực tập doanh nghiệp 10.0, Đồ án CNPM 9.2).'),
  ('2200287', 'acc-student-linh', 'Phạm Khánh Linh', '2200287@sv.saodo.edu.vn', '0974118209', 'DK13-CNTT1', 'Lớp trưởng', 100, 3.72, 'active', 'Lớp trưởng gương mẫu, tổng hợp sĩ số và bài nộp của lớp đúng hạn mọi tuần.'),
  ('2200288', 'acc-student-hoang', 'Lê Việt Hoàng', '2200288@sv.saodo.edu.vn', '0963502914', 'DK13-CNTT1', 'Thành viên lớp', 92, 3.15, 'active', 'Tư duy thuật toán khá, cần chú ý tách giao diện header/implementation rõ hơn trong bài thực hành.'),
  ('2200289', 'acc-student-trang', 'Đỗ Thu Trang', '2200289@sv.saodo.edu.vn', '0936194820', 'DK13-CNTT1', 'Bí thư Chi đoàn', 96, 3.54, 'active', 'Bí thư Chi đoàn năng nổ, hoàn thành tốt phần thiết kế lược đồ CSDL và báo cáo nhóm.'),
  ('2200290', 'acc-student-bao', 'Vũ Quốc Bảo', '2200290@sv.saodo.edu.vn', '0948220317', 'DK13-CNTT1', 'Thành viên lớp', 84, 2.78, 'warning', 'Vắng 2 buổi thực hành Lab 3; đã nhắc bổ sung bài thực hành Kế thừa trước thứ Sáu.'),
  ('2200291', 'acc-student-tuan', 'Hoàng Minh Tuấn', '2200291@sv.saodo.edu.vn', '0919334781', 'DK13-CNTT1', 'Thành viên lớp', 95, 3.32, 'active', 'Hoàn thành sớm các bài tập truy vấn SQL và tích cực đặt câu hỏi trên lớp.')
on conflict (student_code) do nothing;

insert into public.teacher_subject_classes (
  id, class_code, course_code, name, credits, cohort_class, schedule, room, semester, total_periods, completed_periods, teacher_id, teacher_name
) values
  ('11111111-1111-4111-8111-111111111101', '010110210101', 'IT3040', 'Lập trình hướng đối tượng (IT3040)', 3, 'DK13-CNTT1', 'Thứ 2 (Tiết 1–3) · Thứ 4 (Tiết 6–9)', 'A1-301 / B1-Lab 3', 'HK1 2026-2027', 60, 36, 'acc-teacher-duc', 'ThS. Trần Minh Đức'),
  ('11111111-1111-4111-8111-111111111104', '010110230201', 'IT3160', 'Kiểm thử và đảm bảo chất lượng phần mềm (IT3160)', 3, 'DK13-CNTT1', 'Thứ 5 (Tiết 6–8) · Thứ 6 (Tiết 1–3)', 'B1-Lab 2', 'HK1 2026-2027', 45, 27, 'acc-teacher-duc', 'ThS. Trần Minh Đức'),
  ('11111111-1111-4111-8111-111111111105', '010110210102', 'IT3040', 'Lập trình hướng đối tượng · Nhóm 2 (IT3040)', 3, 'DK13-CNTT2', 'Thứ 3 (Tiết 1–3) · Thứ 6 (Tiết 6–9)', 'A1-302 / B1-Lab 3', 'HK1 2026-2027', 60, 32, 'acc-teacher-duc', 'ThS. Trần Minh Đức')
on conflict (id) do nothing;

insert into public.teacher_attendance_sessions (
  id, subject_class_id, date, periods, topic, marks, notes, created_at
) values
  (
    'att-it3040-w9',
    '11111111-1111-4111-8111-111111111101',
    '28/10/2026',
    'Tiết 6 - 9 (Thực hành Lab 3)',
    'Thực hành đa hình động, bảng phương thức ảo (vtable) & con trỏ thông minh',
    '{"2200286":"present","2200287":"present","2200288":"present","2200289":"present","2200290":"unexcused","2200291":"present"}'::jsonb,
    '{"2200290":"Vắng buổi thực hành Lab 3 không báo trước"}'::jsonb,
    now() - interval '3 days'
  ),
  (
    'att-it3040-w8',
    '11111111-1111-4111-8111-111111111101',
    '21/10/2026',
    'Tiết 1 - 3 (Lý thuyết A1-301)',
    'Kế thừa đơn, kế thừa bội và lớp cơ sở trừu tượng trong C++/Java',
    '{"2200286":"excused","2200287":"present","2200288":"present","2200289":"present","2200290":"unexcused","2200291":"present"}'::jsonb,
    '{"2200286":"Có giấy triệu tập đội tuyển Olympic Tin học cấp trường","2200290":"Nghỉ không phép"}'::jsonb,
    now() - interval '10 days'
  ),
  (
    'att-it3160-w9',
    '11111111-1111-4111-8111-111111111104',
    '29/10/2026',
    'Tiết 6 - 8 (Thực hành B1-Lab 2)',
    'Thiết kế ca kiểm thử hộp đen (Phân vùng tương đương & Giá trị biên)',
    '{"2200286":"present","2200287":"present","2200288":"excused","2200289":"present","2200290":"present","2200291":"present"}'::jsonb,
    '{"2200288":"Xin phép khám sức khỏe định kỳ (có đơn)"}'::jsonb,
    now() - interval '2 days'
  )
on conflict (id) do nothing;

insert into public.portal_submissions (
  id, assignment_id, student_account_id, student_code, student_name, content, submitted_at, status, score, feedback, feedback_at, graded_by
) values
  (
    'sub-minh-oop-1',
    '22222222-2222-4222-8222-222222222201',
    'acc-leader-minh',
    '2200286',
    'Nguyễn Văn Đạt',
    'Đã xây dựng lớp trừu tượng TaiLieu (maTaiLieu, tenNhaXuatBan, soBanPhatHanh) và phương thức thuần ảo tinhPhiQuaHan(int soNgay). Ba lớp kế thừa SachGiaoTrinh, LuanVan, TapChi áp dụng đa hình qua con trỏ thông minh std::unique_ptr<TaiLieu> và kiểm thử 12 ca biên.',
    now() - interval '1 day',
    'reviewed',
    9.5,
    'Điểm 9.5/10 · Thiết kế phân cấp lớp rất chuẩn, dùng std::unique_ptr tránh rò rỉ bộ nhớ tốt. Có thể bổ sung thêm nạp chồng toán tử xuất luồng << cho báo cáo mượn trả.',
    now() - interval '4 hours',
    'ThS. Trần Minh Đức'
  ),
  (
    'sub-linh-oop-1',
    '22222222-2222-4222-8222-222222222201',
    'acc-student-linh',
    '2200287',
    'Phạm Khánh Linh',
    'Cài đặt bộ lớp quản lý thư viện bằng Java 21: abstract class Document, các lớp Textbook, Thesis, Journal thực thi interface Borrowable. Kèm bộ JUnit test kiểm tra tính đa hình khi tính phí trễ hạn.',
    now() - interval '1 day',
    'reviewed',
    9.8,
    'Điểm 9.8/10 · Bài làm xuất sắc, tách interface Borrowable rõ ràng và bộ JUnit test bao phủ đầy đủ các trường hợp biên.',
    now() - interval '3 hours',
    'ThS. Trần Minh Đức'
  ),
  (
    'sub-hoang-oop-1',
    '22222222-2222-4222-8222-222222222201',
    'acc-student-hoang',
    '2200288',
    'Lê Việt Hoàng',
    'Em nộp mã nguồn C++ cài đặt lớp TaiLieu và 3 lớp con SachGiaoTrinh, LuanVan, TapChi. Đã viết hàm main nhập danh sách tài liệu và in tổng tiền phạt quá hạn theo từng loại.',
    now() - interval '2 hours',
    'submitted',
    null,
    null,
    null,
    null
  ),
  (
    'sub-minh-db-1',
    '22222222-2222-4222-8222-222222222202',
    'acc-leader-minh',
    '2200286',
    'Nguyễn Văn Đạt',
    'Lược đồ 3NF gồm 5 bảng: SINH_VIEN, LOP_NIEN_CHE, HOAT_DONG, DANG_KY_HOAT_DONG, DIEM_REN_LUYEN_KY. Đã viết đầy đủ khóa ngoại ON DELETE CASCADE và 5 truy vấn tổng hợp theo khoa/lớp.',
    now() - interval '2 days',
    'submitted',
    null,
    null,
    null,
    null
  )
on conflict (id) do nothing;

insert into public.class_announcements (
  id, class_id, title, body, author_name, pinned, created_at
) values
  (
    'ann-1',
    '11111111-1111-4111-8111-111111111101',
    'Lịch bảo vệ bài thực hành số 1 tại phòng B1-Lab 3',
    'Thứ Tư tuần này lớp DK13-CNTT1 mang theo mã nguồn trên máy cá nhân hoặc nạp sẵn lên kho lưu trữ để chấm vấn đáp trực tiếp tại phòng B1-Lab 3.',
    'ThS. Trần Minh Đức',
    true,
    now() - interval '1 day'
  ),
  (
    'ann-2',
    '11111111-1111-4111-8111-111111111101',
    'Tài liệu mẫu về đa hình động và bảng phương thức ảo (vtable)',
    'Giảng viên đã cập nhật bộ slide minh họa cơ chế cấp phát vtable và destructor ảo. Các em đọc trước khi làm Đồ án nhỏ.',
    'ThS. Trần Minh Đức',
    false,
    now() - interval '3 days'
  )
on conflict (id) do nothing;

insert into public.club_members (
  id, club_id, student_code, full_name, cohort_class, member_role, status, joined_at, note
) values
  ('cm-1', 'club-it', '2200286', 'Nguyễn Văn Đạt', 'DK13-CNTT1', 'Chủ nhiệm CLB', 'active', '2024-09-15', 'Điều phối chung CLB Tin học Sao Đỏ & phụ trách nhóm phát triển phần mềm.'),
  ('cm-2', 'club-it', '2200287', 'Phạm Khánh Linh', 'DK13-CNTT1', 'Phó chủ nhiệm', 'active', '2024-10-02', 'Phụ trách truyền thông sự kiện và kết nối sinh viên khóa mới.'),
  ('cm-3', 'club-it', '2200291', 'Hoàng Minh Tuấn', 'DK13-CNTT1', 'Trưởng ban Chuyên môn', 'active', '2025-01-12', 'Phụ trách nhóm Web & Cloud tại phòng Lab nhà B1.'),
  ('cm-4', 'club-it', '2200288', 'Lê Việt Hoàng', 'DK13-CNTT1', 'Thành viên', 'pending', '2026-10-30', 'Sinh viên lớp DK13-CNTT1 đăng ký tham gia nhóm Lập trình hướng đối tượng & Web.'),
  ('cm-5', 'club-it', '2200289', 'Đỗ Thu Trang', 'DK13-CNTT1', 'Thành viên', 'pending', '2026-10-31', 'Mong muốn tham gia ban Thiết kế UI/UX và dự án cổng thông tin sinh viên.')
on conflict (id) do nothing;

insert into public.club_events (
  id, club_id, title, time, place, summary, created_by, created_at
) values
  ('ce-1', 'club-it', 'Workshop: Xây dựng AI Web Agent & Thực hành Git/GitHub cho sinh viên CNTT', 'Thứ 5 · 18:00 – 20:00', 'Phòng B1-Lab 2', 'Hướng dẫn quy trình làm việc nhóm với Pull Request, kiểm thử tự động và tích hợp AI Agent.', 'Nguyễn Văn Đạt (Trưởng CLB)', now() - interval '1 day'),
  ('ce-2', 'club-it', 'Luyện tập giải đề Olympic Tin học & Cấu trúc dữ liệu tuần 9', 'Chủ nhật · 08:30 – 11:00', 'Phòng B1-Lab 3', 'Ôn tập quy hoạch động, đồ thị và tối ưu độ phức tạp thuật toán cho đội tuyển sinh viên.', 'Nguyễn Văn Đạt (Trưởng CLB)', now() - interval '4 days')
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table
        public.teacher_class_roster,
        public.teacher_subject_classes,
        public.teacher_attendance_sessions,
        public.portal_custom_assignments,
        public.portal_submissions,
        public.class_announcements,
        public.club_members,
        public.club_events;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

