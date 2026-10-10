-- F-Mood đợt 5: bài tập trong bài học, nút "Mình cần giúp", cảnh báo khi luyện tập
-- Chạy trong Supabase SQL Editor sau 0004_chat_feedback.sql, hoặc: npm run db:migrate

-- bài tập của mỗi bài học:
-- [{ "id": "e1", "type": "text"|"choice"|"multi"|"scale", "prompt": "...", "options": [...],
--    "minLabel": "", "maxLabel": "", "hint": "...", "answer": ... }]
alter table public.lessons add column if not exists exercises jsonb not null default '[]';

-- câu trả lời bài tập: RIÊNG TƯ của học sinh (thầy cô không đọc được, trừ đoạn bị gắn cờ trong cảnh báo)
create table if not exists public.lesson_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  exercise_id text not null check (length(exercise_id) between 1 and 20),
  answer jsonb not null,
  -- chỉ server ghi cờ này (sau khi kiểm tra an toàn)
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id, exercise_id)
);
create index if not exists lesson_responses_user_idx on public.lesson_responses (user_id, updated_at desc);
alter table public.lesson_responses enable row level security;
-- học sinh chỉ XEM được câu trả lời của mình; ghi qua server để không tự sửa cờ an toàn
drop policy if exists "lesson_responses: xem của mình" on public.lesson_responses;
create policy "lesson_responses: xem của mình" on public.lesson_responses
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "lesson_responses: xóa của mình" on public.lesson_responses;
create policy "lesson_responses: xóa của mình" on public.lesson_responses
  for delete to authenticated using (user_id = (select auth.uid()));

-- cảnh báo: thêm loại "nguy hiểm khi làm bài tập" và "học sinh nhờ thầy cô giúp"
alter table public.alerts drop constraint if exists alerts_type_check;
alter table public.alerts
  add constraint alerts_type_check check (type in ('chat_risk', 'negative_streak', 'lesson_risk', 'help_request'));
