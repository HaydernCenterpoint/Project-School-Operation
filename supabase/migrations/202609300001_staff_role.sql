-- Department staff (Phòng Đào tạo, Công tác sinh viên…) manage student records and accounts.
-- Kept alone: a new enum value cannot be used in the transaction that adds it.
alter type public.member_role add value if not exists 'staff';
