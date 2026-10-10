-- F-Mood đợt 2: thầy cô (GVCN, phòng tham vấn) và admin
-- Chạy trong Supabase SQL Editor sau 0001_init.sql, hoặc: npm run db:migrate

-- ───────────────────────── Hồ sơ ─────────────────────────
-- thêm vai trò admin
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher', 'counselor', 'admin'));

-- tên hiển thị của thầy cô có thể dài hơn biệt danh học sinh
alter table public.profiles drop constraint if exists profiles_nickname_check;
alter table public.profiles
  add constraint profiles_nickname_check check (length(nickname) between 2 and 60);

-- họ tên thật: học sinh nhập khi đăng ký, CHỈ thầy cô phụ trách và admin thấy
alter table public.profiles add column if not exists full_name text
  check (full_name is null or length(full_name) between 2 and 60);
-- email đăng nhập của thầy cô (học sinh không có email)
alter table public.profiles add column if not exists email text;
-- tài khoản bị admin khóa
alter table public.profiles add column if not exists locked_at timestamptz;

-- học sinh vẫn chỉ được tự sửa đúng cột onboarded_at (đã cấp ở 0001)

-- ───────────────────────── Lớp: giáo viên chủ nhiệm ─────────────────────────
alter table public.classes add column if not exists homeroom_teacher_id uuid
  references public.profiles (id) on delete set null;
create index if not exists classes_homeroom_idx on public.classes (homeroom_teacher_id);

-- ───────────────────────── Cảnh báo: xử lý ─────────────────────────
-- giữ họ tên tại thời điểm báo, để vẫn biết là ai nếu học sinh xóa tài khoản
alter table public.alerts add column if not exists full_name text;
alter table public.alerts add column if not exists handled_by uuid
  references public.profiles (id) on delete set null;
alter table public.alerts add column if not exists handled_by_name text;
alter table public.alerts add column if not exists handled_at timestamptz;
alter table public.alerts add column if not exists note text check (note is null or length(note) <= 2000);

-- Trang thầy cô/admin đọc dữ liệu qua server bằng quyền quản trị, sau khi kiểm tra
-- vai trò trong code (lib/staff.ts). Không mở thêm quyền RLS nào cho thầy cô, nên
-- thầy cô vẫn KHÔNG thể đọc check-in, trò chuyện hay thói quen của học sinh.
