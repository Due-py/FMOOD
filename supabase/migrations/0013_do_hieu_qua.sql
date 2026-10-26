-- F-Mood Demo 2: ĐO HIỆU QUẢ
-- Thiết kế: ho-so-du-thi/2-xay-dung/thiet-ke-2026-10-26-do-hieu-qua.md
--
-- Chỉ THÊM, không sửa hay xóa dữ liệu đang có. Chạy được trước khi deploy (chạy lại nhiều lần không sao).
--  1. Ghi học sinh bấm "Đúng rồi" / "Không phải" khi Mây đoán chủ đề (chỉ ghi chủ đề, không ghi tin nhắn),
--     để đo "Mây có đoán đúng chuyện bạn đang lo không".
--  2. Ghi thời điểm thầy cô bấm nhận cảnh báo LẦN ĐẦU, để đo "thầy cô có nhận kịp trong 24 giờ không".
--     Cảnh báo cũ không có giá trị này: trang Kết quả dùng tạm thời điểm cập nhật cuối (handled_at).

alter table public.support_activity drop constraint if exists support_activity_kind_check;
alter table public.support_activity
  add constraint support_activity_kind_check
  check (kind in ('worry_saved', 'tiny_action_done', 'followup_answered', 'told', 'topic_guess_yes', 'topic_guess_no'));

alter table public.alerts add column if not exists first_handled_at timestamptz;
