-- F-Mood Demo 2.1: NHÓM TÂM TRẠNG 1–5 CỦA MỖI LẦN CHECK-IN (Duy chọn 01/11)
--
-- Mỗi cảm xúc thuộc sẵn một nhóm 1–5 (1 Rất tệ, 2 Tệ, 3 Bình thường, 4 Tốt, 5 Tuyệt vời; lib/emotions.ts).
-- Nhóm của một lần check-in = trung bình nhóm các cảm xúc đã chọn, làm tròn (lib/mood.ts); "Chưa rõ" thì không có nhóm.
-- Cột này chỉ lưu kèm cho tiện tra cứu: trang "Tâm trạng" luôn tính lại từ cảm xúc, nên check-in cũ cũng có nhóm đúng.
-- Chỉ THÊM một cột, không sửa dữ liệu đang có. Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.
-- Chưa chạy file này thì check-in vẫn lưu được (không có cột mood), trang Tâm trạng vẫn đúng.

alter table public.checkins add column if not exists mood smallint check (mood is null or mood between 1 and 5);
