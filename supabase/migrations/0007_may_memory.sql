-- F-Mood đợt 7: Mây ghi nhớ học sinh, danh sách điều bận lòng, độ dài trả lời
-- Chạy trong Supabase SQL Editor sau 0006_profile_avatar.sql, hoặc: npm run db:migrate

-- độ dài câu trả lời học sinh chọn trong khung chat
alter table public.profiles add column if not exists chat_length text not null default 'medium'
  check (chat_length in ('short', 'medium', 'long'));

-- thẻ đi kèm câu trả lời của Mây (đã ghi nhớ, điều bận lòng, bài tập gợi ý)
alter table public.messages add column if not exists attachments jsonb not null default '[]'::jsonb;

-- cuộc trò chuyện Mây chủ động mở sau một lần check-in (để không mở lại lần nữa)
alter table public.conversations add column if not exists checkin_id uuid
  references public.checkins (id) on delete set null;
create index if not exists conversations_checkin_idx on public.conversations (checkin_id) where checkin_id is not null;

-- ───────── Những điều Mây ghi nhớ về học sinh ─────────
create table if not exists public.student_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('address', 'interest', 'style', 'other')),
  content text not null check (length(content) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_memories_user_idx on public.student_memories (user_id, created_at);
alter table public.student_memories enable row level security;

-- học sinh xem / sửa / xóa của mình; Mây thêm mới qua server
drop policy if exists "student_memories: xem của mình" on public.student_memories;
create policy "student_memories: xem của mình" on public.student_memories
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "student_memories: sửa của mình" on public.student_memories;
create policy "student_memories: sửa của mình" on public.student_memories
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "student_memories: xóa của mình" on public.student_memories;
create policy "student_memories: xóa của mình" on public.student_memories
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── Danh sách điều bận lòng ─────────
create table if not exists public.student_concerns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  intensity smallint not null check (intensity between 1 and 10),
  status text not null default 'open' check (status in ('open', 'better', 'resolved')),
  next_check_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_concerns_user_idx on public.student_concerns (user_id, status, next_check_at);
alter table public.student_concerns enable row level security;

drop policy if exists "student_concerns: xem của mình" on public.student_concerns;
create policy "student_concerns: xem của mình" on public.student_concerns
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "student_concerns: sửa của mình" on public.student_concerns;
create policy "student_concerns: sửa của mình" on public.student_concerns
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "student_concerns: xóa của mình" on public.student_concerns;
create policy "student_concerns: xóa của mình" on public.student_concerns
  for delete to authenticated using (user_id = (select auth.uid()));
