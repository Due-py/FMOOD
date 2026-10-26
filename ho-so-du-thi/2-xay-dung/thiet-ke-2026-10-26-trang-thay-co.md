# Thiết kế: trang dành cho thầy cô (Demo 2)

Ngày 26/10/2026. Duy giao: "xem trang thầy cô hiện có gì, đề xuất mỗi người nên có những công cụ nào, rồi tự thiết kế và làm".

## 1. Trang thầy cô đang có gì (trước khi sửa)

| Có rồi | Ai dùng | Vấn đề |
|---|---|---|
| Bàn làm việc: lưới thẻ dẫn tới mọi trang | cả 3 | Là danh mục, không nói "hôm nay cần làm gì" |
| Cảnh báo (mới / đang xử lý / đã xong, ghi chú) | cả 3 | **Giáo viên đọc được đoạn tin nhắn của học sinh**; không có Hoàn tác; không biết ai đang nhận xử lý |
| Tình hình lớp: biểu đồ cảm xúc 7 ngày | cả 3 | Ẩn khi dưới **3** bạn (cần 5); không có xu hướng tuần, không có chuyện bận lòng chung |
| Thư viện bài học, câu hỏi, khảo sát | chỉ admin | Giáo viên chủ nhiệm không soạn bài cho lớp mình được |
| Dạy Mây: lời dặn, nhân vật, kịch bản, kho kiến thức, cụm từ nguy hiểm, khẩn cấp, bộ thử | admin | Nhiều từ khó ("model", "kịch bản", "kho kiến thức"); lưu đè là mất bản cũ, không quay lại được |
| Thành viên (thầy cô, học sinh) | admin | Đổi vai trò, khóa tài khoản không có Hoàn tác |
| "Cần giúp ngay" của học sinh | → cảnh báo khẩn | Không có cách nhờ giúp **không khẩn** ("em muốn nói chuyện với cô") và học sinh không nhận được lời đáp |

## 2. Công cụ cho từng người

### Giáo viên chủ nhiệm: "lớp mình đang thế nào, mình giúp được gì"
1. **Hôm nay**: 3–4 việc cần làm (lời nhờ giúp đang chờ, cảnh báo của lớp, thử thách đang chạy) + nhịp cảm xúc lớp tuần này.
2. **Lớp của tôi**: cảm xúc chung 7 ngày, so với tuần trước, số bạn tham gia, những chuyện bận lòng chung của lớp. Nhóm dưới 5 bạn thì ẩn.
3. **Cảnh báo của lớp**: biết *bạn nào* cần quan tâm và *phòng tham vấn đã nhận chưa*, **không** thấy nội dung tin nhắn, lý do hay ghi chú của đồng nghiệp. Chỉ có một nút "Tôi đã biết".
4. **Lời nhờ giúp**: học sinh lớp mình hẹn nói chuyện với GVCN. Trả lời bằng câu mẫu bấm một lần, rồi "Xong".
5. **Bài học cho lớp**: soạn bài ngắn (tiêu đề, nội dung, câu hỏi luyện tập), lưu nháp, đăng cho lớp mình. Chỉ thấy và sửa bài của mình.
6. **Câu hỏi cho lớp**: phiếu hỏi nhanh gửi lớp mình, xem kết quả gộp (dưới 5 câu trả lời thì ẩn).
7. **Thử thách**: gợi ý một việc nhỏ cả lớp cùng làm trong 1–2 tuần. Học sinh tự bấm "Tham gia" (thành một thói quen). Giáo viên chỉ thấy số bạn tham gia và tổng lượt làm, không có bảng xếp hạng, không có tên.

### Tư vấn viên: "biết ngay, nhận việc, xử lý, không bỏ sót"
1. **Hôm nay**: cảnh báo khẩn trên cùng, rồi cảnh báo mới chưa ai nhận, rồi lời nhờ giúp.
2. **Cảnh báo**: đọc đoạn đáng lo và lý do; bấm **"Tôi nhận"** (đồng nghiệp thấy "cô X đang xử lý"); "Đã xong" kèm ghi chú; lọc "Việc của tôi"; xem em này đã có bao nhiêu cảnh báo trước. Mọi nút đều có **Hoàn tác** trong vài giây.
3. **Lời nhờ giúp**: học sinh hẹn gặp phòng tham vấn; trả lời giờ gặp, học sinh thấy lời đáp ở trang chủ.
4. Giữ: tình hình các lớp, nội dung Vòng hỗ trợ, kết quả nghiên cứu.

### Admin: "quản lý mọi thứ, kể cả dạy Mây"
1. **Hôm nay**: Mây có khỏe không, việc chờ, hoạt động gần đây.
2. **Dạy Mây**, đổi tên cho dễ hiểu: Lời dặn · Tính cách và cách xưng hô · Cách xử lý từng chủ đề · Tài liệu cho Mây đọc · Nhận ra câu nguy hiểm · Câu trả lời khi khẩn cấp · Bộ câu thử an toàn · Mây có khỏe không.
3. **Các bản trước**: mỗi lần lưu lời dặn / tính cách / cụm từ nguy hiểm / tiêu chí / câu khẩn cấp đều giữ bản cũ. Sau khi lưu có nút "Hoàn tác", và có danh sách "Các bản trước" để dùng lại.
4. **Tài khoản**: thêm thầy cô, đổi vai trò, khóa; có Hoàn tác cho đổi vai trò và khóa.
5. Giữ mọi công cụ còn lại.

### Thêm vào (Duy chưa nêu)
- **Hoàn tác** dùng chung: thông báo nhỏ ở cuối màn hình "Đã … · Hoàn tác" trong 8 giây.
- **Lời đáp về tới học sinh**: lời nhờ giúp được trả lời thì học sinh thấy ở trang chủ.
- **Xóa bài an toàn**: bài đã có học sinh làm thì chỉ ẩn được, không xóa (tránh mất bài làm của học sinh).

## 3. Những điều giữ cứng (kiểm ở máy chủ, không chỉ ẩn nút)
- Giáo viên: máy chủ **xóa** nội dung tin nhắn, lý do và ghi chú khỏi cảnh báo trước khi gửi về trình duyệt.
- Mọi số liệu nhóm: **dưới 5 bạn thì ẩn** (sửa ngưỡng cũ 3 → 5, cả trang nghiên cứu).
- Lời nhờ giúp chỉ người được nhờ thấy: gửi GVCN thì chỉ GVCN lớp đó; gửi phòng tham vấn thì tư vấn viên và admin.
- Bài nháp, phiếu hỏi, thử thách của giáo viên: chỉ chính người soạn (và admin) thấy và sửa.
- Mỗi người chỉ thấy công cụ của vai trò mình (thanh bên và cả máy chủ đều chặn).

## 4. Cơ sở dữ liệu: `0012_trang_thay_co.sql` (Duy chạy)
Chỉ thêm, không xóa gì; chạy trước khi deploy được, bản đang chạy không bị ảnh hưởng.
- `help_requests`: lời nhờ giúp không khẩn và lời đáp.
- `challenges` + `habits.challenge_id`: thử thách của lớp.
- `lessons.class_id`, `lessons.author_id`; `surveys.author_id`: bài và phiếu của từng giáo viên. Chính sách đọc bài: học sinh chỉ thấy bài chung hoặc bài của lớp mình.
- `app_settings_history`: các bản trước của cài đặt Mây.

## 5. Những điều mình tự quyết
- Giáo viên chỉ bấm "Tôi đã biết" ở cảnh báo; xử lý và ghi chú là việc của phòng tham vấn.
- Lời nhờ giúp không khẩn vẫn được quét câu nguy hiểm; nếu có thì tạo cảnh báo như bình thường.
- Thử thách là một thói quen tự nguyện, không xếp hạng, không nêu tên.
