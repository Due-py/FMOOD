-- F-Mood: BỎ HẲN NHẬT KÝ HOẠT ĐỘNG HỌC SINH (Duy 04/11/2026)
--
-- Để giữ đúng cam kết với học sinh ("thầy cô không đọc được", bảng cam kết hiện khi đăng nhập), F-Mood không còn ghi
-- nhật ký việc làm của từng học sinh và không còn chỗ nào lưu lời học sinh viết vào nhật ký. Code đã bỏ mọi chỗ ghi
-- (lib/activity-log.ts), thẻ "Học sinh" ở trang Nhật ký hoạt động và cài đặt log.students.
-- File này xóa bảng student_activity_log (kể cả cột content của 0028) và cài đặt log.students cùng lịch sử của nó.
-- Nhật ký thầy cô (admin_audit) giữ nguyên.
--
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

drop table if exists public.student_activity_log;

delete from public.app_settings where key = 'log.students';
delete from public.app_settings_history where key = 'log.students';
