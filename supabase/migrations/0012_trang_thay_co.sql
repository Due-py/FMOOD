-- F-Mood Demo 2: TRANG THẦY CÔ
-- Thiết kế: ho-so-du-thi/2-xay-dung/thiet-ke-2026-10-26-trang-thay-co.md
--
-- File này chỉ THÊM bảng / cột mới và thu hẹp quyền đọc bài học theo lớp
-- (mọi bài hiện có đều là bài chung nên học sinh vẫn thấy như cũ).
-- Bản đang chạy trên mạng không dùng tới các bảng này nên không bị ảnh hưởng.
-- Chạy trong Supabase SQL Editor TRƯỚC khi deploy. An toàn để chạy nhiều lần.

-- ───────── Lời nhờ giúp (không khẩn): học sinh hẹn nói chuyện với thầy cô ─────────
-- to_role: teacher = giáo viên chủ nhiệm lớp em · counselor = phòng tham vấn
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  nickname text not null,
  full_name text,
  to_role text not null check (to_role in ('teacher', 'counselor')),
  when_pref text not null check (when_pref in ('break', 'after_school', 'any')),
  note text check (note is null or length(note) between 1 and 300),
  status text not null default 'new' check (status in ('new', 'replied', 'done')),
  reply text check (reply is null or length(reply) between 1 and 300),
  replied_by uuid references public.profiles (id) on delete set null,
  replied_by_name text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists help_requests_inbox_idx on public.help_requests (to_role, class_id, status, created_at desc);
create index if not exists help_requests_student_idx on public.help_requests (student_id, created_at desc);
-- chỉ máy chủ ghi / đọc (học sinh đọc lời đáp qua máy chủ)
alter table public.help_requests enable row level security;

-- ───────── Thử thách của lớp (giáo viên gợi ý, học sinh tự tham gia) ─────────
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  title text not null check (length(title) between 3 and 60),
  icon text not null default '⭐',
  description text not null default '' check (length(description) <= 200),
  ends_on date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists challenges_class_idx on public.challenges (class_id, status, ends_on);
alter table public.challenges enable row level security; -- chỉ server

-- tham gia thử thách = thêm một thói quen gắn với thử thách
alter table public.habits add column if not exists challenge_id uuid references public.challenges (id) on delete set null;
create index if not exists habits_challenge_idx on public.habits (challenge_id) where challenge_id is not null;

-- ───────── Bài học và phiếu hỏi của từng giáo viên ─────────
-- class_id null = bài chung cho mọi lớp (bài admin soạn như trước)
alter table public.lessons add column if not exists class_id uuid references public.classes (id) on delete cascade;
alter table public.lessons add column if not exists author_id uuid references public.profiles (id) on delete set null;
alter table public.lessons add column if not exists author_name text;
create index if not exists lessons_class_idx on public.lessons (class_id) where class_id is not null;

drop policy if exists "lessons: học sinh đọc bài đã đăng" on public.lessons;
create policy "lessons: học sinh đọc bài đã đăng" on public.lessons
  for select to authenticated using (
    published and (
      class_id is null
      or class_id = (select p.class_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

alter table public.surveys add column if not exists author_id uuid references public.profiles (id) on delete set null;
alter table public.surveys add column if not exists author_name text;

-- ───────── Các bản trước của cài đặt Mây (để quay lại / hoàn tác) ─────────
create table if not exists public.app_settings_history (
  id bigint generated always as identity primary key,
  key text not null,
  value jsonb not null,
  saved_by_name text,
  saved_at timestamptz not null default now()
);
create index if not exists app_settings_history_key_idx on public.app_settings_history (key, saved_at desc);
alter table public.app_settings_history enable row level security; -- chỉ server
