-- F-Mood Demo 3: NHÂN VẬT VÀ TÙY CHỌN TRÒ CHUYỆN, THẺ GỢI Ý (kế hoạch Demo 3, Bước 9 và 10)
--   học sinh chọn nhân vật (Sóc, Cú, Kiến) và cách trò chuyện (độ dài, cách dẫn dắt, động lực) ·
--   lựa chọn lưu ở hồ sơ của chính học sinh (chỉ chủ tài khoản đọc, sửa) ·
--   đếm số lần đổi lựa chọn và số thẻ gợi ý (mục tiêu, kỹ năng, dừng) đã hiện / đã bấm, không ghi nội dung
--
-- File này chỉ THÊM cột và thêm loại việc vào sổ hoạt động, không đổi dữ liệu đang có. Bản đang chạy trên mạng
-- không dùng tới cột mới nên không bị ảnh hưởng; mã mới vẫn chạy được khi chưa chạy file này (học sinh dùng
-- nhân vật mặc định, chưa lưu được lựa chọn, chưa đếm được thẻ).
-- Câu chữ của nhân vật và các mức (admin sửa) nằm ở bảng app_settings có sẵn: không cần bảng mới.
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

-- ───────── 1. Lựa chọn trò chuyện của học sinh (9.1) ─────────
-- Dạng {"character":"soc","length":"vua","guidance":"thang","motivation":"tu_lo"}. Giá trị lạ thì máy chủ dùng mặc định.
-- Cột chat_length cũ (bỏ ở 0009) không dùng lại: thiết kế mới có giới hạn độ dài do máy chủ giữ.
alter table public.profiles add column if not exists chat_style jsonb
  check (chat_style is null or (jsonb_typeof(chat_style) = 'object' and octet_length(chat_style::text) <= 400));

-- Quyền: policy "profiles: xem của mình" và "profiles: sửa của mình" (0001) đã chỉ cho chủ tài khoản đọc và sửa
-- dòng của mình, nên học sinh khác không đọc được lựa chọn này. Học sinh chỉ được sửa một số cột (0001, 0003):
-- cho phép thêm đúng cột chat_style (lệnh grant chỉ cộng thêm, không bỏ quyền đã có).
grant update (chat_style) on public.profiles to authenticated;

-- ───────── 2. Sổ hoạt động: thêm 3 loại để đo (9.7, 10.4), không có nội dung ─────────
-- style_changed = học sinh lưu lựa chọn trò chuyện (ref = mã tổ hợp, ví dụ "cu|ngan|thang|tu_lo")
-- card_shown    = trợ lý đưa một thẻ gợi ý (ref = goal / skill / end; thẻ kỹ năng kèm mã: skill:K3)
-- card_clicked  = học sinh bấm nút trên thẻ (ref = goal:add, goal:later, skill:K3, end:stop, end:continue)
-- Giữ nguyên các loại đã có từ 0017.
alter table public.support_activity drop constraint if exists support_activity_kind_check;
alter table public.support_activity
  add constraint support_activity_kind_check
  check (kind in (
    'worry_saved', 'tiny_action_done', 'followup_answered', 'told', 'topic_guess_yes', 'topic_guess_no',
    'misunderstood', 'chat_skip', 'chat_stop', 'difficulty_confirmed', 'tiny_action_skipped', 'tiny_action_reflect',
    'practice_done', 'practice_feedback', 'practice_revised', 'practice_completed',
    'style_changed', 'card_shown', 'card_clicked'
  ));
