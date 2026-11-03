-- F-Mood: GHI LỜI HỌC SINH VIẾT VÀO NHẬT KÝ HOẠT ĐỘNG KHI ADMIN BẬT (Duy 03/11/2026)
--
-- Thêm cột content vào student_activity_log. Máy chủ chỉ điền cột này khi công tắc "Ghi cả lời học sinh viết và
-- tâm trạng" (cài đặt log.students, trường text) đang bật; mặc định tắt. Duy chỉ bật khi tự thử chức năng.
-- Nội dung: tin nhắn, cảm xúc và mức tâm trạng khi ghi tâm trạng, bài luyện, tình huống tự kể, nhật ký, câu "lần sau".
-- Nút "Xóa toàn bộ" ở trang Nhật ký hoạt động xóa cả cột này (xóa cả dòng).
--
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

alter table public.student_activity_log add column if not exists content text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_activity_log_content_len') then
    alter table public.student_activity_log
      add constraint student_activity_log_content_len check (content is null or length(content) <= 4000);
  end if;
end $$;
