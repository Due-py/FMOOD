-- F-Mood Demo 2 bổ sung: LUYỆN KỸ NĂNG (kế hoạch Demo 3, Bước 1 và Bước 3)
--   bài luyện theo 4 kỹ năng K1–K4, chu trình Hiểu → Mẫu → Tự làm → Góp ý → Nhìn lại (H-M-T-G-N),
--   7 trạng thái do MÁY CHỦ quản lý (lib/practice/state.ts), bài làm lần 1 và lần 2, góp ý của trợ lý.
--
-- Bài luyện học sinh viết là RIÊNG TƯ: chỉ chủ bài đọc / xóa được (RLS); máy chủ ghi bằng quyền server.
-- Thầy cô chỉ thấy số liệu gộp; bảng đo (support_activity) chỉ ghi loại việc và mã kỹ năng, KHÔNG ghi nội dung.
--
-- File này chỉ THÊM bảng mới, thêm loại mới vào sổ hoạt động, và gắn kỹ năng cho việc nhỏ đã có mã HD
-- (không đổi chữ, không đổi trạng thái bật / tắt của mục nào). Bản đang chạy trên mạng không dùng tới
-- các bảng mới nên không bị ảnh hưởng. Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate.
-- An toàn để chạy nhiều lần.

-- ───────── 1. Một lần luyện ─────────
-- step: H = Hiểu · M = Mẫu · T = Tự làm · G = Góp ý · N = Nhìn lại
-- state: not_started = Chưa bắt đầu · in_progress = Đang làm · need_hint = Cần gợi ý thêm · completed = Hoàn thành
--        skipped = Bỏ qua · paused = Tạm dừng · safety = Chuyển an toàn
-- case_code: tình huống mẫu TL01–TL12; own_situation: tình huống học sinh tự kể (một trong hai, hoặc cả hai trống)
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill text not null check (skill in ('K1', 'K2', 'K3', 'K4')),
  case_code text check (case_code is null or case_code ~ '^TL[0-9]{2}$'),
  own_situation text check (own_situation is null or length(own_situation) between 2 and 300),
  step text not null default 'H' check (step in ('H', 'M', 'T', 'G', 'N')),
  state text not null default 'not_started'
    check (state in ('not_started', 'in_progress', 'need_hint', 'completed', 'skipped', 'paused', 'safety')),
  hint_count smallint not null default 0 check (hint_count between 0 and 10),
  feedback_count smallint not null default 0 check (feedback_count between 0 and 2),
  -- số lượt liền chưa tiến (2 lượt thì "Cần gợi ý thêm")
  stall_count smallint not null default 0 check (stall_count between 0 and 10),
  -- số lần đã gọi AI cho từng việc trong bài: {"bridge":1,"example":1,"roleplay":3,"reaction":1}
  ai_uses jsonb not null default '{}'::jsonb,
  -- câu nối kỹ năng với tình huống riêng (bước Hiểu), giữ lại để mở lại bài không phải gọi AI lần nữa
  bridge text check (bridge is null or length(bridge) between 1 and 400),
  -- bước Nhìn lại: một việc học sinh sẽ thử thật
  next_try text check (next_try is null or length(next_try) between 2 and 200),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practice_sessions_user_idx on public.practice_sessions (user_id, skill, created_at desc);
alter table public.practice_sessions enable row level security;
drop policy if exists "practice_sessions: xem của mình" on public.practice_sessions;
create policy "practice_sessions: xem của mình" on public.practice_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "practice_sessions: xóa của mình" on public.practice_sessions;
create policy "practice_sessions: xóa của mình" on public.practice_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── 2. Bài làm lần 1, lần 2 (giữ cả hai để học sinh tự so) ─────────
-- answers: khóa theo ô của mô-đun (lib/skills.ts), ví dụ K3: {"tasks": "...", "order": "...", "first": "...", "backup": "..."}
-- feedback: góp ý cho lần này, {"kind":"ai","good":"...","fix":"...","question":"..."} hoặc {"kind":"criteria","criteria":[...]}
-- roleplay (K4): các lượt tập nói với trợ lý đóng vai thầy cô, [{"role":"student"|"teacher","text":"..."}]
create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version smallint not null check (version in (1, 2)),
  answers jsonb not null default '{}'::jsonb,
  feedback jsonb,
  roleplay jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, version)
);
create index if not exists practice_attempts_session_idx on public.practice_attempts (session_id, version);
alter table public.practice_attempts enable row level security;
drop policy if exists "practice_attempts: xem của mình" on public.practice_attempts;
create policy "practice_attempts: xem của mình" on public.practice_attempts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "practice_attempts: xóa của mình" on public.practice_attempts;
create policy "practice_attempts: xóa của mình" on public.practice_attempts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── 3. Sổ hoạt động: thêm 4 loại để đo (không tính giọt nước, không có nội dung) ─────────
-- practice_done = lưu bài lần 1 · practice_feedback = nhờ góp ý · practice_revised = sửa lần 2 · practice_completed = hoàn thành
-- ref = mã kỹ năng (K1–K4). Giữ nguyên các loại đã có từ 0014.
alter table public.support_activity drop constraint if exists support_activity_kind_check;
alter table public.support_activity
  add constraint support_activity_kind_check
  check (kind in (
    'worry_saved', 'tiny_action_done', 'followup_answered', 'told', 'topic_guess_yes', 'topic_guess_no',
    'misunderstood', 'chat_skip', 'chat_stop', 'difficulty_confirmed', 'tiny_action_skipped', 'tiny_action_reflect',
    'practice_done', 'practice_feedback', 'practice_revised', 'practice_completed'
  ));

-- ───────── 4. Việc nhỏ: gắn kỹ năng theo bảng ở đầu kế hoạch (chỉ khi chưa gắn) ─────────
-- K1 ← HD01, HD02, HD13 · K2 ← HD07, HD09, HD04, HD22 · K3 ← HD03, HD11, HD12, HD27 · K4 ← HD05, HD28
update public.support_content set data = data || '{"skill":"K1"}'::jsonb
  where kind = 'tiny_action' and data->>'code' in ('HD01', 'HD02', 'HD13') and not (data ? 'skill');
update public.support_content set data = data || '{"skill":"K2"}'::jsonb
  where kind = 'tiny_action' and data->>'code' in ('HD07', 'HD09', 'HD04', 'HD22') and not (data ? 'skill');
update public.support_content set data = data || '{"skill":"K3"}'::jsonb
  where kind = 'tiny_action' and data->>'code' in ('HD03', 'HD11', 'HD12', 'HD27') and not (data ? 'skill');
update public.support_content set data = data || '{"skill":"K4"}'::jsonb
  where kind = 'tiny_action' and data->>'code' in ('HD05', 'HD28') and not (data ? 'skill');
