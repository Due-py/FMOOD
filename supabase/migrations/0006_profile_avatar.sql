-- F-Mood đợt 6: hồ sơ cá nhân: ảnh đại diện, đổi biệt danh / họ tên
-- Chạy trong Supabase SQL Editor sau 0005_lesson_exercises.sql, hoặc: npm run db:migrate

-- ảnh đại diện: "preset:<mã>" (ảnh có sẵn) hoặc "upload:<đường dẫn trong bucket avatars>"
alter table public.profiles add column if not exists avatar text
  check (avatar is null or avatar ~ '^(preset:[a-z0-9-]{1,40}|upload:[a-z0-9/._-]{1,120})$');
alter table public.profiles add column if not exists avatar_updated_at timestamptz;

-- Đổi biệt danh / họ tên / ảnh đi qua server (kiểm tra trùng biệt danh, độ dài, loại ảnh),
-- nên KHÔNG cấp thêm quyền sửa cột cho học sinh.

-- nơi lưu ảnh học sinh tự tải lên (riêng tư, tối đa 1MB, chỉ ảnh)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
