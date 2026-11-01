-- 0027: 7 bài luyện đợt 2 (01/11/2026, Duy: mỗi nhóm năng lực CASEL 5 có 3–4 bài).
-- Mở rộng danh sách kỹ năng thành phần được phép lưu ở phiên luyện và bài đọc (0026 chỉ có 9).
-- Chạy được nhiều lần. Chưa chạy thì học sinh mở 7 bài mới sẽ không lưu được phiên luyện.
-- Kiểm tra sau khi chạy:
--   select conname from pg_constraint where conname in ('practice_sessions_subskill_check', 'lessons_subskill_check');

alter table public.practice_sessions drop constraint if exists practice_sessions_subskill_check;
alter table public.practice_sessions add constraint practice_sessions_subskill_check check (
  subskill is null or subskill in (
    'recognize_feelings_thoughts', 'calm_in_the_moment', 'plan_step_by_step', 'ask_for_help',
    'see_other_side', 'notice_peer_stress', 'listen_to_peer', 'resolve_group_conflict', 'say_no_to_pressure',
    'know_my_strengths', 'growth_mindset', 'set_small_goal', 'start_when_reluctant',
    'weigh_consequences', 'check_information', 'show_gratitude'
  )
);

alter table public.lessons drop constraint if exists lessons_subskill_check;
alter table public.lessons add constraint lessons_subskill_check check (
  subskill is null or subskill in (
    'recognize_feelings_thoughts', 'calm_in_the_moment', 'plan_step_by_step', 'ask_for_help',
    'see_other_side', 'notice_peer_stress', 'listen_to_peer', 'resolve_group_conflict', 'say_no_to_pressure',
    'know_my_strengths', 'growth_mindset', 'set_small_goal', 'start_when_reluctant',
    'weigh_consequences', 'check_information', 'show_gratitude'
  )
);
