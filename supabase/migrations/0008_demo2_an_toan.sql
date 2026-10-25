-- F-Mood Demo 2: siết quyền ghi trực tiếp của học sinh
-- Chạy trong Supabase SQL Editor (sau khi đã deploy code Demo 2), hoặc: npm run db:migrate
--
-- Vì sao: trước đây học sinh có quyền "for all" (thêm/sửa/xóa) trên 3 bảng dưới đây,
-- nên có thể dùng khóa đăng nhập của chính mình gọi thẳng API Supabase để:
--   - ghi câu trả lời suy ngẫm mà KHÔNG qua bước kiểm tra an toàn,
--   - chèn check-in / thói quen với ngày giả (lấy điểm khu vườn, làm sai số liệu).
-- Từ Demo 2, các việc ghi này đều đi qua máy chủ (app/actions/*), nên học sinh
-- chỉ cần quyền XEM và XÓA dữ liệu của chính mình.
--
-- An toàn để chạy nhiều lần. Không xóa hay sửa dữ liệu nào, chỉ đổi quyền.

-- Câu trả lời suy ngẫm
drop policy if exists "reflection_answers: của mình" on public.reflection_answers;
drop policy if exists "reflection_answers: xem của mình" on public.reflection_answers;
create policy "reflection_answers: xem của mình" on public.reflection_answers
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "reflection_answers: xóa của mình" on public.reflection_answers;
create policy "reflection_answers: xóa của mình" on public.reflection_answers
  for delete to authenticated using (user_id = (select auth.uid()));

-- Check-in cảm xúc
drop policy if exists "checkins: của mình" on public.checkins;
drop policy if exists "checkins: xem của mình" on public.checkins;
create policy "checkins: xem của mình" on public.checkins
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "checkins: xóa của mình" on public.checkins;
create policy "checkins: xóa của mình" on public.checkins
  for delete to authenticated using (user_id = (select auth.uid()));

-- Đánh dấu thói quen theo ngày
drop policy if exists "habit_logs: của mình" on public.habit_logs;
drop policy if exists "habit_logs: xem của mình" on public.habit_logs;
create policy "habit_logs: xem của mình" on public.habit_logs
  for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
drop policy if exists "habit_logs: xóa của mình" on public.habit_logs;
create policy "habit_logs: xóa của mình" on public.habit_logs
  for delete to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
