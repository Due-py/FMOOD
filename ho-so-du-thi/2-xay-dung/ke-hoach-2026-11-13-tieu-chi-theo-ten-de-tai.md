# Bộ tiêu chí hiệu quả bám tên đề tài (đề xuất, chờ Duy duyệt)

Soạn 13/11/2026. **Duy duyệt ngày 13/11/2026 và đã triển khai trong app** (trang `/staff/research/hieu-qua`): B2, B3, C2, các chỉ số "chưa đo" A1, B1, B4 và bốn nhóm A–D cộng mục tham khảo. Cấu hình ở `lib/effect/metrics.ts`. Còn lại: đọc câu TĐ1–TĐ4 từ phiếu lần 2 (A1, B4) và nhập điểm chấm mù (B1). Thay cho bảng 10 chỉ số trong `ke-hoach-2026-11-13-muc-tieu-hai-giai-doan.md` (file đó giữ làm tham chiếu cho cách chia 2 giai đoạn).

**Tên đề tài (Duy xác nhận 13/11):** F-MOOD – SAFE AND SOUND: nền tảng số có ứng dụng AI giúp học sinh **nhận diện cảm xúc**, **rèn kỹ năng cảm xúc – xã hội** và **kết nối kịp thời với thầy cô**.

## 1. Vì sao đổi

10 chỉ số cũ đo app có an toàn và chạy tốt không, không đo ba vế của tên. Vế 1 và vế 2 không có chỉ số nào; WHO-5 và PSS-4 đo tâm trạng và căng thẳng nói chung, không đo kỹ năng.

## 2. Bộ tiêu chí mới

Bốn nhóm bám tên đề tài. Cột "dữ liệu" cho biết nguồn; cột "giai đoạn 1" ghi đo được ngay hay phải chờ.

### A. Nhận diện cảm xúc

| # | Tiêu chí | Cách tính | Dữ liệu | Giai đoạn 1 | Giai đoạn 2 |
|---|---|---|---|---|---|
| A1 | Học sinh thấy mình biết điều gì đang làm mình căng thẳng (TĐ1) | Mức tăng điểm TĐ1 (1–5) của lớp dùng app so với lớp so sánh | Phiếu Bài đo, câu TĐ1, lần 1 và lần 2 | Đo khi có phiếu lần 2 (14/11) và đủ cặp phiếu; ngưỡng ≥ +0,25 | ≥ +0,5 |
| A2 | Trợ lý hiểu đúng điều bạn đang lo | Học sinh thật bấm "Đúng rồi" / (Đúng rồi + Không phải); bộ thử chủ đề ≥ 70% (gs 1) | `support_activity` | ≥ 60% (hiện 14/21 = 67%) | ≥ 70% (bộ thử ≥ 80%) |

### B. Rèn kỹ năng cảm xúc – xã hội

| # | Tiêu chí | Cách tính | Dữ liệu | Giai đoạn 1 | Giai đoạn 2 |
|---|---|---|---|---|---|
| B1 | Kỹ năng làm được tăng hơn lớp so sánh | Điểm bài tình huống (thang 24, 2 người chấm mù) tăng nhiều hơn lớp so sánh, khoảng tin cậy 95% không chứa 0 | Bài đo lần 1 và lần 2, chấm mù | **Chưa đo**: có 44 bài lần 1, chưa chấm, chưa có lần 2 | ≥ +2,5 điểm (mục tiêu đã đặt trước trong bộ đo kỹ năng); mỗi lớp ≥ 12 bạn đủ hai bài |
| B2 | Học sinh thực sự luyện kỹ năng | Tỉ lệ bạn đã dùng app mà hoàn thành ít nhất 1 bài luyện | `practice_sessions` (state = completed) | ≥ 30% (hiện 10/26 = 38%) | ≥ 60% |
| B3 | Học sinh sửa bài sau góp ý | Số bài luyện được làm lại lần 2 / số bài làm lần 1 | `practice_attempts` (version 2 / version 1) | ≥ 40% (hiện 24/46 = 52%) | ≥ 50% |
| B4 | Học sinh thấy mình làm được hơn (phụ) | Mức tăng TĐ2–TĐ4 so với lớp so sánh | Phiếu Bài đo, câu TĐ2–TĐ4 | Đo khi có lần 2; không chấm Đạt | ≥ +0,5 mỗi câu |

### C. Kết nối kịp thời với thầy cô

| # | Tiêu chí | Cách tính | Dữ liệu | Giai đoạn 1 | Giai đoạn 2 |
|---|---|---|---|---|---|
| C1 | Cảnh báo khẩn cấp được thầy cô nhận kịp | Cảnh báo khẩn cấp có người nhận trong 24 giờ (và 72 giờ) | `alerts` | ≥ 50% trong 24 giờ và 100% trong 72 giờ (hiện 50% / 100%) | ≥ 90% trong 24 giờ |
| C2 | Yêu cầu "Cần giúp" được thầy cô xem và trả lời kịp | Yêu cầu được xem hoặc trả lời trong 24 giờ / tổng số yêu cầu | `help_requests` (seen_at, replied_at) | **Lấy số nền** (chưa tính), cần ≥ 5 yêu cầu | ≥ 80% |
| C3 | Học sinh dám tìm đến thầy cô | Mức tăng điểm GHSQ thầy cô (1–7) so với lớp so sánh | Phiếu Bài đo, câu GHSQ 3–4 | Đo khi có phiếu lần 2 và đủ cặp; ngưỡng ≥ +0,25 | ≥ +0,5 |

### D. SAFE: điều kiện an toàn (không hạ ở giai đoạn nào)

| # | Tiêu chí | Giai đoạn 1 | Giai đoạn 2 |
|---|---|---|---|
| D1 | Không bỏ sót câu nguy hiểm | 100% khẩn cấp, ≥ 95% đáng lo | giữ nguyên |
| D2 | Không báo nhầm quá nhiều | ≤ 10% | giữ nguyên |
| D3 | Câu trả lời của trợ lý đúng cách | ≥ 80% câu thử đạt | ≥ 90% |

### Chỉ số tham khảo (không chấm Đạt hay Chưa đạt)

Còn dùng sau 1 tuần, chuyện lo nhẹ đi, WHO-5, PSS-4. Hiện số thật kèm mẫu số, để bổ sung bức tranh, không dùng để kết luận đề tài.

## 3. Tình hình dữ liệu ngày 13/11 (học sinh lớp thật, 28 tài khoản, 26 đã dùng app)

- Check-in: 125 lượt của 25 bạn, trung bình 2,5 cảm xúc mỗi lượt, không lượt nào chọn "Chưa rõ".
- Bài luyện: 87 phiên của 15 bạn; 45 phiên hoàn thành; 10 bạn hoàn thành ít nhất 1 bài; 46 bài làm lần 1, 24 bài làm lại lần 2.
- Yêu cầu giúp (`help_requests`): 8 dòng (chưa tách bỏ lớp thử).
- Bài đo: bảng "F-Mood · Bài đo lần 1" có 44 phiếu từ 03/11 đến 10/11; chưa có bài nào được chấm; bài đo trong app (`/bai-do`, chấm mù) chưa dùng (0 điểm chấm).
- Lớp dùng app: 7A1, 8A1. Lớp không dùng: 7A3, 8A4.

## 4. Rủi ro cần quyết

1. **B1 là tiêu chí quan trọng nhất của vế 2 nhưng cần 2 người chấm ngoài nhóm** (6–10 giờ mỗi người theo bộ đo kỹ năng) và phải xong trước khi báo cáo. Chưa có người chấm thì B1 chỉ ghi "chưa đo".
2. **Mã bí mật** sai dạng làm mất cặp phiếu (lần 1: khoảng một phần ba), đặc biệt lớp 8A4. Phải nhắc lại ngay trên phiếu lần 2.
3. **Phiếu lần 2 (14/11) chưa chắc có đủ TĐ1–TĐ4 và GHSQ**; cần kiểm tra khi có phiếu.
4. **Đặt tiêu chí sau khi thấy số.** Các ngưỡng giai đoạn 1 ở B2, B3 và A2 dựa trên số nền hiện có; báo cáo phải ghi "đặt ngày 13/11, sau khi có kết quả đợt thử đầu".

## 5. Việc sửa code (làm sau khi Duy duyệt)

- Thêm B2, B3, C2 vào `lib/effect/` (lấy từ `practice_sessions`, `practice_attempts`, `help_requests`, bỏ lớp thử).
- Đọc thêm TĐ1–TĐ4 từ phiếu Bài đo (cần biết lời hỏi), tính A1, B4, C3.
- Xếp trang kết quả thành bốn nhóm A–D theo tên đề tài, chuyển các chỉ số cũ không còn trong bộ chính xuống mục tham khảo.
- B1: nhập điểm chấm mù (24 điểm) từ bài đo vào trang kết quả.
