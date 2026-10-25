-- F-Mood Demo 2: BỎ tính năng "Mây ghi nhớ" (đã thêm ở 0007_may_memory.sql, nhóm quyết định bỏ ngày 25/10/2026)
--
-- ⚠ CHỈ CHẠY SAU KHI ĐÃ DEPLOY CODE DEMO 2 LÊN VERCEL.
--   Code cũ (Demo 1) vẫn ghi vào các cột / bảng này; chạy trước khi deploy thì Mây
--   của bản cũ có thể không lưu được câu trả lời.
--
-- File này XÓA HẲN dữ liệu, không lấy lại được:
--   - những điều Mây ghi nhớ về học sinh (bảng student_memories)
--   - danh sách điều bận lòng (bảng student_concerns)
--   - độ dài trả lời học sinh chọn (cột profiles.chat_length)
--   - thẻ đính kèm trong câu trả lời cũ của Mây (cột messages.attachments); nội dung chữ của câu trả lời vẫn giữ
--   - liên kết cuộc trò chuyện với lần check-in (cột conversations.checkin_id); cuộc trò chuyện vẫn giữ
-- Không đụng tới tin nhắn, check-in, thói quen, cảnh báo hay tài khoản.
--
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

-- (tùy chọn) xem trước sẽ xóa bao nhiêu dòng:
--   select (select count(*) from public.student_memories) as ghi_nho,
--          (select count(*) from public.student_concerns) as dieu_ban_long;

begin;

drop table if exists public.student_memories;
drop table if exists public.student_concerns;

drop index if exists public.conversations_checkin_idx;
alter table public.conversations drop column if exists checkin_id;
alter table public.messages drop column if exists attachments;
alter table public.profiles drop column if exists chat_length;

commit;
