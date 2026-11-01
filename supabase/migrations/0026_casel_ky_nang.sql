-- F-Mood Demo 2.2: KHUNG CASEL 5 CHO BÀI LUYỆN VÀ BÀI ĐỌC (Duy chốt 01/11/2026; kế hoạch V2 mục 3.2, 11)
--
-- 1. Bài luyện lưu theo KỸ NĂNG THÀNH PHẦN (lib/sel/casel.ts, SubskillId), không còn theo mã cũ K1–K4.
--    Thêm cột subskill, điền cho các phiên cũ từ cột skill (K1→recognize_feelings_thoughts, K2→calm_in_the_moment,
--    K3→plan_step_by_step, K4→ask_for_help; cùng bảng ở lib/sel/legacy.ts). Cột skill giữ nguyên dữ liệu cũ,
--    chỉ bỏ "not null" để bài luyện mới (không có mã cũ) lưu được. Không xóa, không đổi tên cột nào.
-- 2. Bài đọc (lessons) có năng lực CASEL chính, liên quan, mã kỹ năng thành phần 2020 và một mục tiêu học tập.
--    Chỉ thầy cô có quyền trang Duyệt bài ghi các cột này (server action, quyền máy chủ); học sinh chỉ đọc như 0023.
--
-- Chỉ THÊM, cho phép trống, điền có kiểm tra. Chạy TRƯỚC khi đẩy mã Demo 2.2. Chạy trong Supabase SQL Editor,
-- hoặc: npm run db:migrate. An toàn để chạy nhiều lần.
-- Kiểm tra sau khi chạy (phải ra 0 dòng):
--   select count(*) from public.practice_sessions where subskill is null;

-- ───────── 1. Phiên luyện: cột kỹ năng thành phần ─────────
alter table public.practice_sessions add column if not exists subskill text;

alter table public.practice_sessions drop constraint if exists practice_sessions_subskill_check;
alter table public.practice_sessions add constraint practice_sessions_subskill_check check (
  subskill is null or subskill in (
    'recognize_feelings_thoughts', 'calm_in_the_moment', 'plan_step_by_step', 'ask_for_help',
    'see_other_side', 'notice_peer_stress', 'listen_to_peer', 'resolve_group_conflict', 'say_no_to_pressure'
  )
);

update public.practice_sessions set subskill = case skill
    when 'K1' then 'recognize_feelings_thoughts'
    when 'K2' then 'calm_in_the_moment'
    when 'K3' then 'plan_step_by_step'
    when 'K4' then 'ask_for_help'
  end
  where subskill is null and skill in ('K1', 'K2', 'K3', 'K4');

alter table public.practice_sessions alter column skill drop not null;

-- mỗi phiên phải biết mình luyện kỹ năng nào
alter table public.practice_sessions drop constraint if exists practice_sessions_skill_or_subskill;
alter table public.practice_sessions add constraint practice_sessions_skill_or_subskill check (subskill is not null or skill is not null);

create index if not exists practice_sessions_user_subskill_idx on public.practice_sessions (user_id, subskill, created_at desc);

-- ───────── 2. Bài đọc: năng lực CASEL và mục tiêu học tập ─────────
alter table public.lessons add column if not exists casel_primary text;
alter table public.lessons add column if not exists casel_related text[] not null default '{}';
alter table public.lessons add column if not exists casel_items text[] not null default '{}';
alter table public.lessons add column if not exists subskill text;
alter table public.lessons add column if not exists learning_objective text;

alter table public.lessons drop constraint if exists lessons_casel_primary_check;
alter table public.lessons add constraint lessons_casel_primary_check check (
  casel_primary is null or casel_primary in ('self_awareness', 'self_management', 'social_awareness', 'relationship_skills', 'responsible_decision_making')
);
alter table public.lessons drop constraint if exists lessons_casel_related_check;
alter table public.lessons add constraint lessons_casel_related_check check (
  casel_related <@ array['self_awareness', 'self_management', 'social_awareness', 'relationship_skills', 'responsible_decision_making']::text[]
);
alter table public.lessons drop constraint if exists lessons_casel_items_check;
alter table public.lessons add constraint lessons_casel_items_check check (
  cardinality(casel_items) <= 12
  and array_to_string(casel_items, ',') ~ '^((SA|SM|SO|RS|RD)[1-9](,(SA|SM|SO|RS|RD)[1-9])*)?$'
);
alter table public.lessons drop constraint if exists lessons_subskill_check;
alter table public.lessons add constraint lessons_subskill_check check (
  subskill is null or subskill in (
    'recognize_feelings_thoughts', 'calm_in_the_moment', 'plan_step_by_step', 'ask_for_help',
    'see_other_side', 'notice_peer_stress', 'listen_to_peer', 'resolve_group_conflict', 'say_no_to_pressure'
  )
);
alter table public.lessons drop constraint if exists lessons_learning_objective_check;
alter table public.lessons add constraint lessons_learning_objective_check check (learning_objective is null or length(learning_objective) <= 300);
