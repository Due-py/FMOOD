-- F-Mood Demo 2.1: MỨC TÂM TRẠNG 1–5 KHI CHECK-IN (Duy chọn 01/11)
--
-- Mỗi lần check-in có thêm một mức tâm trạng 1–5 (1 Rất tệ … 3 Bình thường … 5 Rất tốt), chọn trước khi gọi tên cảm xúc.
-- Trang "Tâm trạng" của học sinh vẽ biểu đồ đường và heatmap theo mức này (7 ngày, tháng, năm).
-- Check-in cũ (trước file này) không có mức: biểu đồ ước tính từ nhóm cảm xúc và ghi rõ là ước tính.
-- Chỉ THÊM một cột, không sửa dữ liệu đang có. Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.
-- Chưa chạy file này thì check-in vẫn lưu được (không có mức), biểu đồ dùng ước tính.

alter table public.checkins add column if not exists mood smallint check (mood is null or mood between 1 and 5);
