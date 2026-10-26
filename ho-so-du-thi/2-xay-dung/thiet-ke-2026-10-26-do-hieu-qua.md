# Thiết kế: đo xem F-Mood có thật sự giúp được các bạn không

Ngày 26/10/2026. Câu hỏi giám khảo: "Làm sao biết app có hiệu quả?" → trả lời bằng 10 chỉ số có mục tiêu đặt trước.

## 10 chỉ số

| # | Câu hỏi | Mục tiêu (đặt trước) | Đo bằng | Tối thiểu để kết luận |
|---|---|---|---|---|
| 1 | Mây có bỏ sót bạn nào đang gặp nguy hiểm không? | 100% câu khẩn cấp, ≥ 95% câu đáng lo | Bộ câu thử an toàn (61 câu có sẵn + câu thầy cô thêm) | 10 câu nguy hiểm |
| 2 | Mây có báo động nhầm quá nhiều không? | Báo nhầm ≤ 10% câu bình thường | Cùng bộ câu thử | 10 câu bình thường |
| 3 | Mây có đoán đúng chuyện bạn đang lo không? | ≥ 80% bộ thử chủ đề; học sinh thật bấm "Đúng rồi" ≥ 70% | Bộ thử 30 câu + câu trả lời của học sinh thật | 20 câu; 5 bạn |
| 4 | Mây có trả lời đúng cách không? | ≥ 90% câu trả lời đạt mọi yêu cầu | Bộ thử câu trả lời (20 tin nhắn mẫu, máy chấm) | 15 câu |
| 5 | Thầy cô có nhận cảnh báo khẩn kịp không? | ≥ 90% được nhận trong 24 giờ | Cảnh báo trong app (lúc nhận lần đầu) | 5 cảnh báo |
| 6 | Các bạn có còn dùng app sau 1 tuần không? | ≥ 50% quay lại ngày 8–14 | Check-in và tin nhắn | 5 bạn |
| 7 | Chuyện các bạn lo có nhẹ đi không? | ≥ 50% chuyện được hỏi lại có mức lo giảm | Mức lo lúc kể và lần hỏi lại gần nhất | 5 bạn |
| 8 | Các bạn có thấy khỏe hơn về tinh thần không? | Lớp dùng tăng hơn lớp không dùng ≥ 5 điểm WHO-5 | Phiếu trước / sau | 5 bạn mỗi lớp |
| 9 | Các bạn có bớt căng thẳng không? | Lớp dùng giảm hơn lớp không dùng ≥ 1 điểm PSS-4 | Phiếu trước / sau | 5 bạn mỗi lớp |
| 10 | Các bạn có dám tìm đến thầy cô hơn không? | Lớp dùng tăng hơn lớp không dùng ≥ 0,5 điểm (thang 1–7) | Phiếu trước / sau (GHSQ) | 5 bạn mỗi lớp |

Trạng thái: **Đạt** · **Chưa đạt** (đủ dữ liệu nhưng chưa tới mục tiêu) · **Chưa đủ dữ liệu** (không kết luận).

## Nguyên tắc trung thực
- Luôn ghi "tính trên bao nhiêu"; ít hơn mức tối thiểu thì ghi "Chưa đủ dữ liệu".
- Không tính học sinh lớp thử (classes.is_test), không tính lựa chọn "Thử phiếu (không tính)".
- Nhóm học sinh dưới 5 bạn không kết luận. Báo cáo không có tên, không có mã.
- Bộ câu thử viết trước, không sửa theo kết quả. Lỗi gọi AI tính là không đạt.
- Chỉ số 8–10 so với lớp không dùng app (lấy thay đổi của lớp dùng trừ thay đổi của lớp không dùng). Chưa kiểm định thống kê; ghi rõ điều này.

## Phần đã làm
- `lib/effect/survey.ts`: câu hỏi chuẩn (WHO-5, PSS-4, GHSQ) viết lại cho học sinh cấp 2, chấm điểm, đọc CSV, ghép phiếu.
- `lib/effect/metrics.ts`: 10 chỉ số, mỗi chỉ số có test bằng dữ liệu mẫu có đáp án tính tay.
- `lib/effect/data.ts` + trang `/staff/research/hieu-qua`: số liệu thật (bỏ lớp thử), nút In báo cáo, Tải CSV; phiếu khảo sát đọc từ CSV ngay trên máy, không tải lên đâu.
- Bộ câu thử: `lib/eval/safety-cases.ts` (chuyển từ script), `lib/eval/topic-cases.ts`, `lib/eval/reply-cases.ts` + máy chấm `reply-checks.ts`. Nút chạy ở trang Bộ câu thử; `npm run eval:replies`.
- `0013_do_hieu_qua.sql`: ghi "Đúng rồi / Không phải" khi Mây đoán chủ đề; ghi lúc thầy cô nhận cảnh báo lần đầu.
- Google Drive: bảng `F-Mood_Kết quả hiệu quả` (công thức đã đối chiếu với app bằng dữ liệu mẫu) và tài liệu `F-Mood_Phiếu khảo sát trước và sau` (câu hỏi + mã Apps Script tạo 2 Google Forms).
