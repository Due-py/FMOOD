# Thử phân quyền trang thầy cô · 17:04:53 30/10/2026

Phiên bản: `2deda4a+sua` · Web: http://localhost:3100 (bản build trên máy, dùng cơ sở dữ liệu thật) · Lệnh: `npm run proof:roles -- http://localhost:3100`

Tạo 2 lớp thử (X, Y), 1 GVCN lớp X, 1 tư vấn viên (đối chứng), 1 học sinh mỗi lớp, cảnh báo và lời nhờ thử có mã nhận diện.
Trang được mở bằng HTTP như trình duyệt; thao tác được gọi THẲNG bằng mã thao tác của bản build (bỏ qua giao diện), rồi đọc lại cơ sở dữ liệu xem có gì bị đổi.
Đối chứng trước khi thử: GVCN mở được lớp mình và thấy lời nhờ lớp mình gửi mình; tư vấn viên đọc được nội dung cảnh báo.
Đối chứng sau khi thử (cùng cách gọi thẳng thao tác): tư vấn viên nhận được cảnh báo, GVCN trả lời được lời nhờ lớp mình. Nhờ vậy “không đổi” ở bảng dưới là do bị chặn, không phải do cách gọi hỏng.
Không gửi email. Mọi dữ liệu thử đã xóa ngay sau khi chạy.

**Kết quả: chặn được 25/25 lần thử.**

| # | Nhóm | Lần thử | Kết quả | Chi tiết |
|---|---|---|---|---|
| 1 | GVCN lớp X cố xem dữ liệu lớp Y | Mở trang lớp Y (biết sẵn mã lớp) | ✅ Chặn được | HTTP 404 |
| 2 | GVCN lớp X cố xem dữ liệu lớp Y | Danh sách lớp có lớp Y | ✅ Chặn được | không thấy lớp Y |
| 3 | GVCN lớp X cố xem dữ liệu lớp Y | Trang Cảnh báo có cảnh báo của học sinh lớp Y | ✅ Chặn được | không thấy |
| 4 | GVCN lớp X cố xem dữ liệu lớp Y | Hộp lời nhờ có lời nhờ của học sinh lớp Y gửi GVCN lớp Y | ✅ Chặn được | không thấy |
| 5 | GVCN lớp X cố xem dữ liệu lớp Y | Gọi thẳng thao tác trả lời lời nhờ của lớp Y | ✅ Chặn được | máy chủ trả 200; lời nhờ không đổi |
| 6 | GVCN lớp X cố xem dữ liệu lớp Y | Gọi thẳng thao tác đặt lại mật khẩu học sinh lớp Y | ✅ Chặn được | máy chủ trả 200; mật khẩu không đổi |
| 7 | Giáo viên cố làm việc của phòng tham vấn | Đọc nội dung cảnh báo của học sinh lớp mình | ✅ Chặn được | chỉ thấy có cảnh báo, nội dung bị ẩn |
| 8 | Giáo viên cố làm việc của phòng tham vấn | Gọi thẳng thao tác nhận / xử lý cảnh báo (lớp mình) | ✅ Chặn được | máy chủ trả 200; cảnh báo không đổi |
| 9 | Giáo viên cố làm việc của phòng tham vấn | Gọi thẳng thao tác đóng cảnh báo của lớp Y | ✅ Chặn được | máy chủ trả 200; cảnh báo không đổi |
| 10 | Giáo viên cố làm việc của phòng tham vấn | Hộp lời nhờ có lời nhờ gửi phòng tham vấn | ✅ Chặn được | không thấy |
| 11 | Giáo viên cố làm việc của phòng tham vấn | Gọi thẳng thao tác trả lời / đóng / đánh dấu đã xem lời nhờ gửi phòng tham vấn | ✅ Chặn được | máy chủ trả 200/200; lời nhờ không đổi |
| 12 | Giáo viên cố làm việc của phòng tham vấn | Mở trang Kết quả nghiên cứu | ✅ Chặn được | HTTP 307 → /staff |
| 13 | Giáo viên cố làm việc của phòng tham vấn | Mở trang Duyệt nội dung vòng hỗ trợ | ✅ Chặn được | HTTP 307 → /staff |
| 14 | Giáo viên cố làm việc của phòng tham vấn | Mở trang Câu nguy hiểm (an toàn) | ✅ Chặn được | HTTP 307 → /staff |
| 15 | Giáo viên cố làm việc của phòng tham vấn | Mở trang Quản lý tài khoản | ✅ Chặn được | HTTP 307 → /staff |
| 16 | Giáo viên cố làm việc của phòng tham vấn | Gọi thẳng thao tác bật / tắt nội dung vòng hỗ trợ | ✅ Chặn được | máy chủ trả 200; nội dung không đổi |
| 17 | Học sinh cố vào trang thầy cô | Mở /staff | ✅ Chặn được | HTTP 307 → /home |
| 18 | Học sinh cố vào trang thầy cô | Mở /staff/alerts | ✅ Chặn được | HTTP 307 → /home |
| 19 | Học sinh cố vào trang thầy cô | Mở /staff/classes/<lớp mình> | ✅ Chặn được | HTTP 307 → /home |
| 20 | Học sinh cố vào trang thầy cô | Mở /staff/loi-nho | ✅ Chặn được | HTTP 307 → /home |
| 21 | Học sinh cố vào trang thầy cô | Mở /staff/research | ✅ Chặn được | HTTP 307 → /home |
| 22 | Học sinh cố vào trang thầy cô | Gọi thẳng thao tác trả lời lời nhờ (lời nhờ của chính mình) | ✅ Chặn được | máy chủ trả 200 → /home;push; lời nhờ không đổi |
| 23 | Học sinh cố vào trang thầy cô | Gọi thẳng thao tác tự đóng cảnh báo về mình | ✅ Chặn được | máy chủ trả 200; cảnh báo không đổi |
| 24 | Người chưa đăng nhập | Mở /staff/alerts | ✅ Chặn được | HTTP 307 → /staff/login |
| 25 | Người chưa đăng nhập | Mở /staff/loi-nho | ✅ Chặn được | HTTP 307 → /staff/login |
