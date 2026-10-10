-- F-Mood: cấu trúc dữ liệu ban đầu (đợt 1: phía học sinh)
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate

create extension if not exists pgcrypto;

-- ───────────────────────── Lớp học ─────────────────────────
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 4 and 12),
  name text not null,
  grade smallint check (grade between 6 and 12),
  -- số ngày cảm xúc tiêu cực liên tiếp thì báo thầy cô
  negative_streak_days smallint not null default 5 check (negative_streak_days between 2 and 30),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Hồ sơ ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  nickname text not null check (length(nickname) between 2 and 24),
  role text not null default 'student' check (role in ('student', 'teacher', 'counselor')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);
-- biệt danh không trùng trong cùng một lớp (không phân biệt hoa thường)
create unique index if not exists profiles_class_nickname_key
  on public.profiles (class_id, lower(nickname));

-- ───────────────────────── Check-in cảm xúc ─────────────────────────
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  emotions text[] not null check (cardinality(emotions) between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists checkins_user_time_idx on public.checkins (user_id, created_at desc);

-- ───────────────────────── Trò chuyện với AI ─────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Cuộc trò chuyện mới',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_idx on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- tin nhắn có dấu hiệu nguy hiểm (chỉ server ghi)
  flagged boolean not null default false,
  -- câu trả lời soạn sẵn khi có dấu hiệu nguy hiểm (không phải AI tự viết)
  is_crisis_response boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ───────────────────────── Thói quen ─────────────────────────
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(title) between 1 and 60),
  icon text not null default '⭐',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

create table if not exists public.habit_logs (
  habit_id uuid not null references public.habits (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, day)
);

-- ───────────────────────── Cảnh báo cho thầy cô ─────────────────────────
-- Chỉ server (service role) được ghi. Học sinh không đọc được.
-- Khi học sinh xóa tài khoản, cảnh báo an toàn vẫn được giữ (student_id = null)
-- để thầy cô không mất dấu một trường hợp đang cần hỗ trợ.
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  nickname text not null,
  type text not null check (type in ('chat_risk', 'negative_streak')),
  severity text not null check (severity in ('watch', 'urgent')),
  -- chỉ đoạn bị gắn cờ, không phải toàn bộ cuộc trò chuyện
  excerpt text,
  reasons text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'seen', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists alerts_class_idx on public.alerts (class_id, status, created_at desc);
create index if not exists alerts_student_idx on public.alerts (student_id, type, created_at desc);

-- ───────────────────────── Bảo mật theo dòng (RLS) ─────────────────────────
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.alerts enable row level security;

-- Lớp: học sinh chỉ xem lớp của mình
drop policy if exists "classes: xem lớp của mình" on public.classes;
create policy "classes: xem lớp của mình" on public.classes
  for select to authenticated
  using (id = (select class_id from public.profiles where id = (select auth.uid())));

-- Hồ sơ: chỉ xem và cập nhật của mình
drop policy if exists "profiles: xem của mình" on public.profiles;
create policy "profiles: xem của mình" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles: sửa của mình" on public.profiles;
create policy "profiles: sửa của mình" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- học sinh chỉ được đổi đúng cột onboarded_at, không tự đổi lớp hay vai trò
revoke update on public.profiles from authenticated, anon;
grant update (onboarded_at) on public.profiles to authenticated;

-- Check-in: của ai người nấy xem, thêm, xóa
drop policy if exists "checkins: của mình" on public.checkins;
create policy "checkins: của mình" on public.checkins
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.checkins from authenticated, anon;

-- Cuộc trò chuyện: xem, đổi tên, xóa của mình (server tạo mới)
drop policy if exists "conversations: xem của mình" on public.conversations;
create policy "conversations: xem của mình" on public.conversations
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "conversations: xóa của mình" on public.conversations;
create policy "conversations: xóa của mình" on public.conversations
  for delete to authenticated using (user_id = (select auth.uid()));

-- Tin nhắn: xem của mình. Chỉ server ghi (để học sinh không tự sửa cờ an toàn).
drop policy if exists "messages: xem của mình" on public.messages;
create policy "messages: xem của mình" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));

-- Thói quen
drop policy if exists "habits: của mình" on public.habits;
create policy "habits: của mình" on public.habits
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "habit_logs: của mình" on public.habit_logs;
create policy "habit_logs: của mình" on public.habit_logs
  for all to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));

-- alerts: không có policy cho authenticated/anon, nghĩa là chỉ service role truy cập được.
-- Chính sách cho thầy cô sẽ thêm ở đợt làm trang quản lý.
