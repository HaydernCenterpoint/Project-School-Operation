-- Community chat fixtures (local only). Ten extra students of Campus A sign in with their
-- student code and password 1111, like 2200286. Every name, class and message is fictional.
-- Idempotent, so it can also be applied to a running database without a reset.

create temporary table seed_student(code text primary key, name text, class_name text, faculty text, bio text);
insert into seed_student values
  ('2200286', 'Sinh viên 2200286', 'DC.CNTT17.10', 'Khoa Công nghệ thông tin', ''),
  ('2200301', 'Nguyễn Minh Anh', 'DC.CNTT17.10', 'Khoa Công nghệ thông tin', 'Lớp trưởng CNTT17.10. Thích React và cà phê sữa đá.'),
  ('2200302', 'Trần Đức Huy', 'DC.CNTT17.10', 'Khoa Công nghệ thông tin', 'Backend, Node.js. Hỏi gì về SQL cứ ping mình.'),
  ('2200303', 'Lê Thu Trang', 'DC.KT17.02', 'Khoa Kinh tế', 'Kế toán năm 3, đang tìm chỗ thực tập.'),
  ('2200304', 'Phạm Quốc Bảo', 'DC.CK17.05', 'Khoa Cơ khí', 'Đội trưởng đội bóng khoa Cơ khí.'),
  ('2200305', 'Hoàng Ngọc Linh', 'DC.NNA17.01', 'Khoa Ngoại ngữ', 'IELTS 7.5. Chủ nhiệm Góc tiếng Anh, mọi người vào luyện nói nhé!'),
  ('2200306', 'Vũ Thành Đạt', 'DC.CNTT16.08', 'Khoa Công nghệ thông tin', 'Năm cuối, đang thực tập Frontend ở Hải Dương.'),
  ('2200307', 'Đặng Khánh Vy', 'DC.KT18.03', 'Khoa Kinh tế', 'Tân sinh viên K18, ở KTX khu B.'),
  ('2200308', 'Bùi Gia Khánh', 'DC.DT17.04', 'Khoa Điện', 'Mê Arduino và robot. Phó chủ nhiệm CLB Tin học.'),
  ('2200309', 'Đỗ Phương Thảo', 'DC.CNTT18.02', 'Khoa Công nghệ thông tin', 'Đang học Python, hay chia sẻ tài liệu.'),
  ('2200310', 'Ngô Hải Nam', 'DC.OTO17.01', 'Khoa Công nghệ ô tô', 'Thích bóng đá và xe cộ.');

-- 2200286 already exists in seed.sql; conflicts leave it untouched.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', ('10000000-0000-0000-0000-00000' || code)::uuid,
       'authenticated', 'authenticated', code || '@sv.saodo.edu.vn', crypt('1111', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', name), now(), now(), '', '', '', ''
from seed_student
on conflict (id) do nothing;

insert into public.memberships (tenant_id, user_id, role, display_name, email)
select 'a0000000-0000-0000-0000-000000000001', ('10000000-0000-0000-0000-00000' || code)::uuid,
       'student', name, code || '@sv.saodo.edu.vn'
from seed_student
on conflict do nothing;

insert into public.community_profiles (user_id, tenant_id, display_name, student_code, class_name, faculty, bio)
select ('10000000-0000-0000-0000-00000' || code)::uuid, 'a0000000-0000-0000-0000-000000000001', name, code, class_name, faculty, bio
from seed_student
on conflict (user_id) do nothing;

-- u(N) is the seeded student with code 22003NN; 286 is the original local student.
create temporary table seed_user(n int primary key, id uuid);
insert into seed_user
select n, ('10000000-0000-0000-0000-00000' || (2200000 + n))::text::uuid
from unnest(array[286, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310]) n;

insert into public.community_rooms (id, tenant_id, kind, name, about, topic, icon, created_by, created_at)
select r.id::uuid, 'a0000000-0000-0000-0000-000000000001', 'group', r.name, r.about, r.topic, r.icon,
       (select id from seed_user where n = r.owner), now() - interval '30 days'
from (values
  ('e0000000-0000-0000-0000-000000000001', 'Ôn thi Lập trình Web', 'Hỏi đáp bài tập, chia sẻ đề cũ và mẹo ôn thi môn Lập trình Web.', 'Học tập', 'code', 302),
  ('e0000000-0000-0000-0000-000000000002', 'CLB Tin học Sao Đỏ', 'Sinh hoạt CLB, cuộc thi lập trình, workshop cuối tuần.', 'Câu lạc bộ', 'sparkle', 308),
  ('e0000000-0000-0000-0000-000000000003', 'Việc làm & thực tập', 'Tin tuyển thực tập, part-time, review CV cho sinh viên.', 'Việc làm', 'briefcase', 306),
  ('e0000000-0000-0000-0000-000000000004', 'Ký túc xá khu B', 'Đồ thất lạc, ship đồ ăn, lịch dọn vệ sinh KTX khu B.', 'Tự do', 'home', 307),
  ('e0000000-0000-0000-0000-000000000005', 'Góc tiếng Anh', 'Luyện nói, chia sẻ tài liệu IELTS/TOEIC, tìm bạn học cùng.', 'Học tập', 'language', 305),
  ('e0000000-0000-0000-0000-000000000006', 'Bóng đá Sao Đỏ', 'Rủ đá bóng chiều, lịch giải khoa, cổ vũ đội trường.', 'Thể thao', 'ball', 304),
  ('e0000000-0000-0000-0000-000000000007', 'Chia sẻ tài liệu', 'Slide, giáo trình, đề thi các môn đại cương và chuyên ngành.', 'Học tập', 'book', 309)
) as r(id, name, about, topic, icon, owner)
on conflict (id) do nothing;

insert into public.community_members (room_id, user_id, joined_at, last_read_at)
select m.room::uuid, u.id, now() - interval '20 days', now() - interval '20 days'
from (values
  ('e0000000-0000-0000-0000-000000000001', array[286, 301, 302, 306, 309]),
  ('e0000000-0000-0000-0000-000000000002', array[286, 301, 302, 308, 309]),
  ('e0000000-0000-0000-0000-000000000003', array[301, 303, 306, 307]),
  ('e0000000-0000-0000-0000-000000000004', array[303, 307, 310]),
  ('e0000000-0000-0000-0000-000000000005', array[286, 303, 305, 307]),
  ('e0000000-0000-0000-0000-000000000006', array[302, 304, 310]),
  ('e0000000-0000-0000-0000-000000000007', array[301, 305, 309])
) as m(room, people)
cross join lateral unnest(m.people) as p(n)
join seed_user u on u.n = p.n
on conflict do nothing;

-- One direct conversation, so the "Tin nhắn riêng" list is not empty.
insert into public.community_rooms (id, tenant_id, kind, created_by, dm_key, created_at)
select 'e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'dm', a.id,
       least(a.id::text, b.id::text) || ':' || greatest(a.id::text, b.id::text), now() - interval '2 days'
from seed_user a, seed_user b where a.n = 301 and b.n = 286
on conflict do nothing;
insert into public.community_members (room_id, user_id, joined_at, last_read_at)
select 'e0000000-0000-0000-0000-000000000008', id, now() - interval '2 days', now() - interval '2 days'
from seed_user where n in (286, 301)
on conflict do nothing;

insert into public.community_messages (id, room_id, author_id, body, reply_to, mentions, created_at)
select m.id::uuid, m.room::uuid, a.id, m.body, m.reply::uuid,
       coalesce((select array_agg(s.id) from seed_user s where s.n = any(m.pings)), '{}'),
       now() - make_interval(mins => m.ago)
from (values
  ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 302, 'Đề giữa kỳ năm ngoái có 1 câu Flexbox và 1 câu fetch API, mọi người ôn kỹ phần này nhé.', null, '{}'::int[], 1500),
  ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 309, 'useEffect chạy 2 lần trong dev là do StrictMode đúng không mọi người?', null, '{}', 95),
  ('e1000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 302, 'Đúng rồi, chỉ ở dev thôi, build production thì chạy 1 lần.', 'e1000000-0000-0000-0000-000000000002', '{}', 90),
  ('e1000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 306, '@Sinh viên 2200286 hôm trước bạn hỏi về CSS Grid, mình gửi link bài hướng dẫn trong kênh Chia sẻ tài liệu rồi nhé.', null, '{286}', 40),
  ('e1000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 301, 'Tối nay 8h ai vào call ôn bài cùng không?', null, '{}', 12),
  ('e1000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 308, 'Workshop Git cơ bản 14h thứ 7 này tại phòng B1-Lab 3. Nhớ mang laptop nhé!', null, '{}', 300),
  ('e1000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', 301, 'Có cần cài sẵn gì không anh?', 'e1000000-0000-0000-0000-000000000006', '{}', 280),
  ('e1000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000002', 308, '@Nguyễn Minh Anh cài Git và VS Code là đủ em ạ.', 'e1000000-0000-0000-0000-000000000007', '{301}', 270),
  ('e1000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000003', 306, 'Công ty phần mềm ở Hải Dương tuyển 5 thực tập sinh Frontend, hạn nộp CV cuối tháng.', null, '{}', 600),
  ('e1000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', 303, 'Có chỗ nào tuyển thực tập kế toán không mọi người?', null, '{}', 200),
  ('e1000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000004', 307, 'Ai đánh rơi thẻ sinh viên ở nhà ăn thì qua phòng B204 nhận nha.', null, '{}', 30),
  ('e1000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000005', 305, 'Thứ 5 này Góc tiếng Anh có buổi speaking chủ đề "Job interview". Ai tham gia thì báo mình nhé.', null, '{}', 180),
  ('e1000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000005', 307, 'Em đăng ký ạ! @Hoàng Ngọc Linh có cần chuẩn bị trước không chị?', 'e1000000-0000-0000-0000-000000000012', '{305}', 150),
  ('e1000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000006', 304, 'Chiều nay 5h sân trường, thiếu 2 người, ai đá không?', null, '{}', 60),
  ('e1000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000006', 310, 'Mình với @Trần Đức Huy nhé!', 'e1000000-0000-0000-0000-000000000014', '{302}', 55),
  ('e1000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000007', 309, 'Tổng hợp slide Cấu trúc dữ liệu và giải thuật chương 1-5, link trong mô tả kênh.', null, '{}', 720),
  ('e1000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000008', 301, 'Chào bạn, mai bạn có đi học nhóm môn Lập trình Web không?', null, '{}', 25)
) as m(id, room, author, body, reply, pings, ago)
join seed_user a on a.n = m.author
order by m.ago desc
on conflict (id) do nothing;

drop table seed_student, seed_user;
