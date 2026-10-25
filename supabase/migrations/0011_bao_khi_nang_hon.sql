-- F-Mood · Vòng hỗ trợ: thêm loại cảnh báo "worry_worse"
-- Khi Mây hỏi thăm một chuyện bận lòng và học sinh chọn "Nặng hơn" ở mức "Lo rất nhiều",
-- thầy cô phụ trách được báo (mức cần để ý, có email, không kèm chuyện học sinh kể).
-- Chạy trước khi deploy bản có tính năng này (chạy lại nhiều lần không sao).

alter table public.alerts drop constraint if exists alerts_type_check;
alter table public.alerts
  add constraint alerts_type_check
  check (type in ('chat_risk', 'negative_streak', 'lesson_risk', 'help_request', 'worry_worse'));
