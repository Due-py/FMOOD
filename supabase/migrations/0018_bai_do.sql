-- F-Mood Demo 2 bổ sung: BÀI ĐO KỸ NĂNG TRONG APP VÀ CHẤM MÙ (kế hoạch Demo 3, mục 6.1, 6.2, 6.7)
--
-- Bài đo dùng lại phiếu khảo sát: surveys.kind = 'test', có lần đo (1, 2) và đề (A, B).
-- Học sinh làm bài trong app; app tự giao đề (lib/bai-do.ts). Lớp "chỉ làm bài đo" (lớp so sánh 8A4)
-- chỉ thấy trang bài đo và không dùng được trợ lý.
-- Chấm mù trong app: mỗi bài nhận một mã ngẫu nhiên (B001…), người chấm chỉ thấy mã và 9 câu trả lời;
-- bảng ghép mã với tài khoản chỉ mở sau khi khóa điểm.
--
-- Quyền đọc: mọi bảng mới đều KHÔNG có policy, tức là học sinh, thầy cô, admin đều không đọc / ghi
-- trực tiếp được. Chỉ máy chủ (khóa bí mật) đọc, và tự kiểm tra quyền trước (lib/bai-do-server.ts).
-- survey_responses vẫn như cũ: không ai đọc qua RLS (học sinh không đọc được bài của bạn khác).
--
-- File này chỉ THÊM cột / bảng mới; phiếu khảo sát đang có giữ nguyên (kind mặc định 'survey').
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

-- ───────── 1. Phiếu: loại phiếu, lần đo, đề ─────────
alter table public.surveys add column if not exists kind text not null default 'survey'
  check (kind in ('survey', 'test'));
alter table public.surveys add column if not exists test_round smallint
  check (test_round is null or test_round in (1, 2));
alter table public.surveys add column if not exists test_form text
  check (test_form is null or test_form in ('A', 'B'));
create index if not exists surveys_kind_idx on public.surveys (kind, status);

-- ───────── 2. Bài làm: thông tin thêm (không chứa chữ học sinh viết) ─────────
-- { "started_at": "...", "duration_s": 840, "pasted_blocked": 0, "ai_use": "Không" }
alter table public.survey_responses add column if not exists meta jsonb not null default '{}';

-- ───────── 3. Lớp "chỉ làm bài đo" ─────────
alter table public.classes add column if not exists test_only boolean not null default false;

-- ───────── 4. Người chấm: người chấm 1 chấm mọi bài, người chấm 2 chấm lại 30 bài ─────────
create table if not exists public.test_raters (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  slot smallint not null unique check (slot in (1, 2)),
  created_at timestamptz not null default now()
);
alter table public.test_raters enable row level security; -- chỉ máy chủ

-- ───────── 5. Mã chấm: tạo khi mở chấm, thứ tự đã xáo ─────────
create table if not exists public.test_codes (
  response_id uuid primary key references public.survey_responses (id) on delete cascade,
  code text not null unique check (code ~ '^B[0-9]{3,4}$'),
  -- thuộc 30 bài người chấm 2 chấm lại (chọn ngẫu nhiên một lần, không đổi)
  in_sample boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.test_codes enable row level security; -- chỉ máy chủ

-- ───────── 6. Điểm: mỗi người chấm một dòng cho mỗi bài ─────────
create table if not exists public.test_scores (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  -- { "1.1": 0|1|2|"T"|"K", …, "4.3": … }
  cells jsonb not null default '{}',
  guess_class text check (guess_class is null or length(guess_class) <= 40),
  guess_round text check (guess_round is null or length(guess_round) <= 40),
  -- câu chưa có trong bảng mẫu; KHÔNG chép nội dung bài vào đây
  note text check (note is null or length(note) <= 300),
  -- người chấm thấy câu đáng lo và đã báo tư vấn viên
  referred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (response_id, rater_id)
);
create index if not exists test_scores_rater_idx on public.test_scores (rater_id);
alter table public.test_scores enable row level security; -- chỉ máy chủ

-- ───────── 7. Khóa điểm (một dòng duy nhất) ─────────
create table if not exists public.test_locks (
  id smallint primary key default 1 check (id = 1),
  opened_at timestamptz,
  opened_by uuid references public.profiles (id) on delete set null,
  locked_at timestamptz,
  locked_by uuid references public.profiles (id) on delete set null,
  locked_by_name text
);
alter table public.test_locks enable row level security; -- chỉ máy chủ

-- ───────── 8. Cảnh báo: thêm nguồn "trong phiếu khảo sát / bài đo" ─────────
-- Giữ mọi loại cảnh báo đang có (kể cả loại do migration khác thêm sau 0011), chỉ thêm 'survey_risk'.
do $$
declare
  current_def text;
  allowed text[] := array['chat_risk', 'negative_streak', 'lesson_risk', 'help_request', 'worry_worse'];
begin
  select pg_get_constraintdef(c.oid) into current_def
    from pg_constraint c
    where c.conrelid = 'public.alerts'::regclass and c.conname = 'alerts_type_check';
  if current_def is not null then
    allowed := allowed || array(select (regexp_matches(current_def, '''([a-z_]+)''', 'g'))[1]);
  end if;
  allowed := array(select distinct x from unnest(allowed || array['survey_risk']) as x order by x);
  alter table public.alerts drop constraint if exists alerts_type_check;
  execute format('alter table public.alerts add constraint alerts_type_check check (type = any (%L::text[]))', allowed);
end $$;
