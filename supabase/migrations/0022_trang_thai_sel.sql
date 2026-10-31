-- F-Mood Demo 2.1: TRẠNG THÁI BỘ ĐIỀU PHỐI SEL TRONG TRÒ CHUYỆN (báo cáo đánh giá 31/10, mục F; lib/sel/engine.ts)
--
-- Mỗi cuộc trò chuyện giữ một trạng thái nhỏ: các bước SEL đã đi (mã), và điều HỌC SINH TỰ NÓI về cảm xúc,
-- cơ thể, suy nghĩ, sự việc (mỗi ý tối đa 80 ký tự), cách học sinh đã không muốn làm. KHÔNG lưu suy luận của AI.
-- Quyền đọc như cuộc trò chuyện (chỉ chủ tài khoản qua RLS sẵn có; máy chủ ghi bằng quyền quản trị).
-- Xóa cùng cuộc trò chuyện. Trang Tổng quan chỉ đếm mã bước, không đọc phần lời học sinh.
-- Chưa chạy file này thì trò chuyện vẫn chạy, chỉ là mỗi lượt bộ điều phối bắt đầu lại từ đầu.
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

alter table public.conversations add column if not exists sel_state jsonb
  check (sel_state is null or (jsonb_typeof(sel_state) = 'object' and octet_length(sel_state::text) <= 4000));

notify pgrst, 'reload schema';
