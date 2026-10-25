-- F-Mood Demo 2: VÒNG HỖ TRỢ cho học sinh
--   nhận ra cảm xúc → nói ra chuyện bận lòng → thử việc nhỏ → được hỏi lại → thấy tiến bộ
-- Thiết kế: ho-so-du-thi/2-xay-dung/thiet-ke-2026-10-25-vong-ho-tro.md
--
-- File này chỉ THÊM bảng / cột mới, không sửa hay xóa dữ liệu đang có.
-- Bản đang chạy trên mạng không dùng tới các bảng này nên không bị ảnh hưởng.
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.
-- Sau khi chạy: `npm run vong:import` để nhập nội dung mẫu (tất cả ở trạng thái TẮT).

-- ───────── Lớp thử: chỉ lớp này thấy nội dung ở trạng thái "Chỉ lớp thử" ─────────
alter table public.classes add column if not exists is_test boolean not null default false;
update public.classes set is_test = true where code in ('TESTANH', 'THUVONG');

-- ───────── Nội dung mẫu (cô Thúy duyệt trong trang thầy cô) ─────────
-- status: off = tắt · test = chỉ lớp thử · on = bật cho mọi lớp
create table if not exists public.support_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (length(key) between 3 and 80),
  kind text not null check (kind in ('topic', 'ask', 'starter', 'fill_blank', 'tiny_action', 'opener', 'badge', 'may_line', 'crisis_draft')),
  topic text check (topic is null or length(topic) between 2 and 40),
  sort_order int not null default 0,
  data jsonb not null,
  status text not null default 'off' check (status in ('off', 'test', 'on')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists support_content_kind_idx on public.support_content (kind, topic, sort_order);
-- chỉ máy chủ đọc / ghi (không có policy cho học sinh)
alter table public.support_content enable row level security;

-- ───────── Chuyện bận lòng của học sinh ─────────
create table if not exists public.worries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null check (length(topic) between 2 and 40),
  note text check (note is null or length(note) between 1 and 200),
  level_start smallint not null check (level_start between 1 and 5),
  level_now smallint not null check (level_now between 1 and 5),
  status text not null default 'open' check (status in ('open', 'better', 'done', 'stale')),
  next_check_at timestamptz,
  checks_count smallint not null default 0,
  source text not null check (source in ('checkin', 'chat')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists worries_user_idx on public.worries (user_id, status, next_check_at);
alter table public.worries enable row level security;
drop policy if exists "worries: xem của mình" on public.worries;
create policy "worries: xem của mình" on public.worries
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "worries: xóa của mình" on public.worries;
create policy "worries: xóa của mình" on public.worries
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── Các lần được hỏi lại (dữ liệu đo hiệu quả) ─────────
create table if not exists public.worry_checks (
  id uuid primary key default gen_random_uuid(),
  worry_id uuid not null references public.worries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  feeling text not null check (feeling in ('better', 'same', 'worse', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists worry_checks_worry_idx on public.worry_checks (worry_id, created_at);
alter table public.worry_checks enable row level security;
drop policy if exists "worry_checks: xem của mình" on public.worry_checks;
create policy "worry_checks: xem của mình" on public.worry_checks
  for select to authenticated using (user_id = (select auth.uid()));

-- ───────── Sổ hoạt động (tính giọt nước, đếm "đã kể") ─────────
-- Xóa chuyện bận lòng không xóa dòng ở đây, nên không bao giờ mất giọt nước.
-- Giọt nước = số cặp (kind, day) khác nhau: mỗi loại tối đa 1 giọt mỗi ngày.
create table if not exists public.support_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('worry_saved', 'tiny_action_done', 'followup_answered', 'told')),
  ref text check (ref is null or length(ref) between 1 and 80),
  worry_id uuid references public.worries (id) on delete set null,
  day date not null,
  created_at timestamptz not null default now()
);
create index if not exists support_activity_user_idx on public.support_activity (user_id, kind, day);
alter table public.support_activity enable row level security;
drop policy if exists "support_activity: xem của mình" on public.support_activity;
create policy "support_activity: xem của mình" on public.support_activity
  for select to authenticated using (user_id = (select auth.uid()));

-- ───────── Huy hiệu dấu mốc (nhận một lần, không mất) ─────────
create table if not exists public.badges_earned (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_key text not null check (length(badge_key) between 2 and 40),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);
alter table public.badges_earned enable row level security;
drop policy if exists "badges_earned: xem của mình" on public.badges_earned;
create policy "badges_earned: xem của mình" on public.badges_earned
  for select to authenticated using (user_id = (select auth.uid()));
