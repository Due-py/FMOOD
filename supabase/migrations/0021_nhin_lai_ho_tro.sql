-- F-Mood Demo 2.1: NHÌN LẠI VÀ VẬN DỤNG (kế hoạch Demo 3, Bước 4)
--   hỏi lại sau 1–3 ngày "Bạn đã dùng cách này thật chưa? Lần sau bạn sẽ chỉnh gì?"
--   cho cả chuyện bận lòng (worry_checks) và bài luyện kỹ năng đã hoàn thành (practice_sessions).
--
-- File này chỉ THÊM cột mới (không đổi dữ liệu, không đổi quyền đọc / xóa đã có). Bản đang chạy trên mạng
-- không dùng tới các cột mới nên không bị ảnh hưởng; mã mới chạy được cả khi CHƯA chạy file này
-- (chỉ thiếu phần "lần sau sẽ chỉnh gì" và thẻ hỏi lại bài luyện).
-- Chạy SAU 0017. Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.
--
-- Bước 5 (lời nhờ "Soạn để tự hỏi", nút "Nhờ thầy cô" trong bài tập, "Hỏi trợ lý" từ bài tập) KHÔNG cần đổi
-- cơ sở dữ liệu: lời tự hỏi không được lưu, không gửi, chỉ sao chép trên máy học sinh.

-- ───────── 1. Chuyện bận lòng: lần sau sẽ chỉnh gì ─────────
-- Học sinh trả lời (không bắt buộc) ngay sau lần hỏi thăm; gắn vào đúng lần hỏi lại đó. Chỉ chủ chuyện đọc được (RLS cũ).
alter table public.worry_checks add column if not exists next_time text
  check (next_time is null or length(next_time) between 2 and 200);

-- ───────── 2. Bài luyện: hỏi lại sau 1–3 ngày ─────────
-- followup_used: helped = dùng rồi, có ích · hard = dùng rồi, còn khó · not_yet = chưa có dịp · null = bỏ qua / chưa hỏi
-- next_time: lần sau sẽ chỉnh gì (chọn nhanh và / hoặc tự viết)
-- followup_at: lúc học sinh trả lời HOẶC bấm bỏ qua (có giá trị thì thôi hỏi bài này)
alter table public.practice_sessions add column if not exists followup_used text
  check (followup_used is null or followup_used in ('helped', 'hard', 'not_yet'));
alter table public.practice_sessions add column if not exists next_time text
  check (next_time is null or length(next_time) between 2 and 200);
alter table public.practice_sessions add column if not exists followup_at timestamptz;

-- Trang chủ tìm bài vừa hoàn thành chưa hỏi lại
create index if not exists practice_sessions_followup_idx on public.practice_sessions (user_id, completed_at)
  where state = 'completed' and followup_at is null;
