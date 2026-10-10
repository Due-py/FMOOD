-- F-Mood đợt 4: gợi ý trả lời và phản hồi 👍/👎 để Mây hiểu từng học sinh hơn
-- Chạy trong Supabase SQL Editor sau 0003_admin.sql, hoặc: npm run db:migrate

-- gợi ý trả lời nhanh đi kèm mỗi câu trả lời của Mây
alter table public.messages add column if not exists suggestions text[] not null default '{}';

-- phản hồi của học sinh cho từng câu trả lời của Mây
create table if not exists public.message_feedback (
  message_id uuid primary key references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  reason text check (reason is null or reason in ('too_long', 'misunderstood', 'too_many_questions', 'not_helpful', 'tone')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists message_feedback_user_idx on public.message_feedback (user_id, updated_at desc);
alter table public.message_feedback enable row level security;

-- học sinh chỉ chấm câu trả lời trong cuộc trò chuyện của chính mình
drop policy if exists "message_feedback: của mình" on public.message_feedback;
create policy "message_feedback: của mình" on public.message_feedback
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id and m.role = 'assistant' and c.user_id = (select auth.uid())
    )
  );

-- nhật ký AI: thêm loại "gợi ý trả lời"
alter table public.ai_logs drop constraint if exists ai_logs_kind_check;
alter table public.ai_logs
  add constraint ai_logs_kind_check check (kind in ('chat', 'classifier', 'moderation', 'embedding', 'health', 'suggestions'));
