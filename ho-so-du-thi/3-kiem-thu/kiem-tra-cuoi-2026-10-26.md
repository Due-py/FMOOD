# Kiểm tra lần cuối F-Mood · 26/10/2026 (Demo 2)

Kiểm tra trên máy (bản mới nhất, chưa đưa lên mạng) nối với cơ sở dữ liệu thật. Chỉ dùng tài khoản THỬ trong lớp thử, dùng xong đã xóa.
Không dùng câu nguy hiểm thật, không gửi email thật.

## 1. Phần nào đã xong, phần nào chưa

Ghi chú cột "Ở đâu": **Mạng** = đã có trên https://f-mood-mocha.vercel.app (bản b69e538). **Máy** = đã làm xong và thử trên máy, chưa commit, chưa đưa lên mạng.

### Phía học sinh

| Phần | Tình trạng | Ở đâu | Ghi chú |
|---|---|---|---|
| Đăng ký bằng mã lớp + biệt danh, giới thiệu ban đầu | ✅ Xong | Mạng | Thử lại hôm nay: đăng ký được, vào thẳng trang chủ |
| Check-in cảm xúc, 7 ngày qua, thống kê của mình | ✅ Xong | Mạng | |
| Trò chuyện với Mây (3 lớp an toàn, gợi ý trả lời, 👍/👎) | ✅ Xong | Mạng | Bộ câu thử an toàn 61/61 × 3 hôm nay |
| Vòng hỗ trợ: kể chuyện bận lòng → việc nhỏ → Mây hỏi lại sau 3 ngày → huy hiệu | ✅ Xong | Mạng | Thử lại hôm nay đủ vòng (có tua 7 ngày) |
| Mây đoán chủ đề, ghi "Đúng rồi / Không phải" | ✅ Xong | Máy | Cần đưa lên mạng để bắt đầu có số liệu thật |
| Thư viện 97 bài + bài tập | ✅ Xong | Mạng | |
| Thói quen, khu vườn, câu hỏi suy ngẫm | ✅ Xong | Mạng | |
| Phiếu khảo sát trong app | ✅ Xong | Mạng | Dưới 5 bạn trả lời thì thầy cô không xem được kết quả |
| Nút "Cần giúp", hẹn nói chuyện với thầy cô | ✅ Xong (hẹn nói chuyện: Máy) | Mạng / Máy | |
| Lời đáp của thầy cô, thử thách của lớp trên trang chủ | ✅ Xong | Máy | |
| Việc nhỏ và câu hỏi lại theo từng chủ đề | ⚠️ Mới bật cho lớp thử | Mạng | 16 việc nhỏ, 5 câu hỏi lại, 20 câu mở đầu, 4 câu mở lời đang ở "Chỉ lớp thử": cô Thúy cần duyệt rồi bật cho mọi lớp |
| Số phòng tham vấn trong thẻ hỗ trợ | ❌ Chưa | Mạng | Đang ghi "Tầng 1, phòng ?"; chưa có số điện thoại trường |
| Câu trả lời soạn sẵn khi khẩn cấp | ⚠️ Nên sửa chữ | Mạng | Câu soạn sẵn đang tự gọi là "Mây" thay vì "mình"; cần thầy cô duyệt lại câu (file content/safety/crisis-response.md) |

### Phía thầy cô

| Phần | Tình trạng | Ở đâu | Ghi chú |
|---|---|---|---|
| Cảnh báo (GVCN không đọc nội dung, tư vấn viên xử lý) | ✅ Xong | Mạng (bản mới hơn ở Máy) | Bản ở Máy thêm "Việc của tôi", Hoàn tác |
| Email báo thầy cô khi khẩn cấp | ⚠️ Chưa chắc chạy trên mạng | Mạng | Đang gửi bằng địa chỉ thử của Resend (chỉ gửi tới email chủ tài khoản Resend). Cần cài biến môi trường trên Vercel và tên miền gửi thư |
| Trang Hôm nay, lời nhờ giúp, thử thách, bài cho lớp, câu hỏi cho lớp, Hoàn tác | ✅ Xong | Máy | |
| Tình hình lớp (ẩn khi dưới 5 bạn) | ✅ Xong | Mạng / Máy | Lớp 8A1 CHƯA có GVCN được gán: cảnh báo chỉ tới phòng tham vấn |
| Dạy Mây: lời dặn, tính cách, chủ đề, nhận ra câu nguy hiểm, bộ câu thử | ✅ Xong | Mạng / Máy | Lời dặn đang để mặc định (chưa ai sửa) |
| Tài liệu cho Mây | ❌ Chưa có tài liệu | Mạng | 0 tài liệu: Mây chưa đọc tài liệu nào của trường |
| Bộ thử câu trả lời (20 câu) | ⚠️ Chưa đạt | Máy | 17/20, 15/20, 17/20 (cần 18/20): Mây chưa luôn gợi ý tìm người lớn khi bị trêu, bị cô lập. Đã có câu lời dặn gợi ý, chưa thêm |
| Trang Kết quả (10 chỉ số Đạt / Chưa đạt / Chưa đủ) | ✅ Xong | Máy | Hiện hầu hết là "Chưa đủ dữ liệu" vì lớp chưa dùng thử |
| Phiếu khảo sát trước / sau (Google Forms + bảng tính) | ✅ Đã tạo, chưa phát | Drive | Cần kiểm tra danh sách lớp 8A1 / 8A4 trong 2 phiếu (hàm `doiLop`) và xóa phiếu thừa (hàm `donDep`) |
| Chế độ trình diễn + kịch bản 12 phút | ✅ Xong | Máy | Chỉ tạo dữ liệu mẫu SAU khi đưa bản mới lên mạng |

### Việc chung

| Việc | Tình trạng | Vì sao |
|---|---|---|
| Commit và đưa M13–M15 lên mạng | ❌ Chưa | Chờ Duy đồng ý |
| Bấm "Chạy bộ thử" trong app sau khi đưa lên | ❌ Chưa | Lần lưu gần nhất trong app là bản cũ 14 câu; bản mới chạy 61 câu |
| Xin phép trường, phát phiếu trước cho 8A1 và 8A4 | ❌ Chưa | Cần thầy cô đồng ý trước khi học sinh dùng thử |
| Cả lớp 8A1 tạo tài khoản | ⚠️ Mới 5 bạn | |
| Đưa nhật ký coding lên Drive | ❌ Chưa | File mới nhất ở máy: nhat-ky-coding/…_v2_2026-10-26.docx |

## 2. Một vòng như một bạn học sinh thật (tài khoản THỬ, lớp thử THUVONG)

Các bước: đăng ký → làm phiếu trước → check-in "Lo lắng, Mệt" → trò chuyện "Mai kiểm tra Toán mà mình chưa ôn kịp, lo quá" → Mây đoán "Học tập", bấm Đúng rồi, chọn "Lo nhiều" → làm 2 bài tập trong bài "Căng thẳng và học tập" → **tua 7 ngày** → Mây hỏi thăm trên trang chủ, chọn "Lo một chút" + "Đỡ hơn" → làm phiếu sau → xem Hành trình, Khu vườn.

Nút Tua của app TỪ CHỐI tài khoản này (chỉ tua được tài khoản mẫu), nên phần tua làm bằng script riêng cho đúng tài khoản thử.
Kết quả kiểm tra trên trình duyệt: 16/16 đúng (lần đầu có 2 chỗ chính kịch bản kiểm tra tìm nhầm chữ trên màn hình; đã sửa kịch bản và kiểm tra lại, app không phải sửa gì).

| Số liệu (cả cơ sở dữ liệu) | Trước | Sau | Đổi | Đúng không? |
|---|---|---|---|---|
| Học sinh | 6 | 7 | +1 | ✅ 1 bạn thử |
| Học sinh lớp thử (không tính vào Kết quả) | 1 | 2 | +1 | ✅ |
| Check-in | 25 | 26 | +1 | ✅ 1 lần check-in |
| Cuộc trò chuyện / tin nhắn học sinh / tin nhắn Mây | 10 / 56 / 61 | 11 / 57 / 62 | +1 / +1 / +1 | ✅ 1 câu hỏi, 1 câu trả lời |
| Chuyện bận lòng | 0 | 1 | +1 | ✅ mức lo 4 |
| Lần Mây hỏi lại | 0 | 1 | +1 | ✅ mức lo 4 → 2 |
| Mây đoán đúng chủ đề | 0 | 1 | +1 | ✅ |
| Hoạt động tính giọt nước | 0 | 2 | +2 | ✅ lưu chuyện + trả lời hỏi lại |
| Huy hiệu | 1 | 5 | +4 | ✅ Gọi tên cảm xúc, Dám kể, Quay lại hỏi thăm, Nhẹ lòng hơn |
| Câu trả lời bài tập | 14 | 16 | +2 | ✅ |
| Câu trả lời phiếu | 0 | 2 | +2 | ✅ phiếu trước + phiếu sau |
| Cảnh báo / lời nhờ giúp | 27 / 0 | 27 / 0 | 0 | ✅ câu chuyện bình thường, không báo động nhầm |

Trên trang thầy cô: trang Kết quả ghi "Không tính 2 tài khoản học sinh ở lớp thử" (trước là 1), các chỉ số khác không đổi, đúng vì lớp thử không được tính. Trang Kết quả nghiên cứu khi bật "tính cả lớp thử" tăng đúng 1 bạn. Phiếu mới có 1 bạn trả lời thì thầy cô chỉ thấy "Kết quả sẽ hiện khi có ít nhất 5 lượt".

Sau khi xóa tài khoản thử và 2 phiếu thử: mọi con số về **đúng như lúc đầu**.

## 3. An toàn và riêng tư

- Bộ câu thử an toàn (61 câu, gồm câu nói quá, viết tắt, nói vòng vo), chạy 3 lần: **đúng cả 61/61 câu cả 3 lần**. Xem file an-toan-2026-10-26-cuoi-3-lan.txt.
- Kiểm tra tách dữ liệu (`npm run proof:isolation`): học sinh A đăng nhập thật rồi gọi thẳng cơ sở dữ liệu để xem / sửa dữ liệu của B: **chặn được 22/22 lần**, không lộ lần nào. Báo cáo: tach-du-lieu/2026-10-26.md.
- Thầy cô: GVCN không đọc nội dung cảnh báo, không xem được lớp đồng nghiệp, nhóm dưới 5 bạn bị ẩn (có test tự động; chế độ trình diễn chạy lại thật: 20/20 lần bị chặn).

## 4. Ảnh các trang chính

Thư mục trên máy: nhat-ky-coding/anh/M16_20261026_kiem-tra-cuoi/ (dien-thoai_hs-… = học sinh trên điện thoại, may-tinh_tc-… = thầy cô trên máy tính).
