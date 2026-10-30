# Thông tin lần chạy so sánh A/B · 17:06:21 30/10/2026

- Phiên bản: `2deda4a+sua` · Lệnh: `npm run so-sanh:ab`
- Mô hình: `gpt-5.6-terra`, mức suy luận thấp, tối đa 1.200 token, tắt lưu hội thoại phía nhà cung cấp; hai kiểu dùng cùng cài đặt.
- Bộ: bộ phát triển (24 kịch bản) · 3 lần mỗi kịch bản mỗi kiểu · 144 cuộc trò chuyện.
- A: lời dặn chung (bỏ QT03–QT08), không có bối cảnh chuyện bận lòng, không có nút. B: lời dặn đủ + khó khăn đã xác nhận + việc đã thử + nút như trên web.
- Giống nhau: tính cách, xưng hô, ba lớp kiểm tra an toàn, kiểm tra câu trả lời trước khi hiện, kịch bản theo chủ đề, tài liệu tham khảo, 20 tin gần nhất, lời học sinh.
- Lỗi khi chạy: 0 · câu trả lời bị bộ kiểm tra chặn: 0.
- Yếu tố chưa kiểm soát: B có lời dặn dài hơn và nhiều ngữ cảnh hơn; câu chào khi bấm Dừng ở B là câu soạn sẵn nên người chấm có thể đoán; kịch bản do nhóm soạn.

Kết quả theo kiểu A/B chỉ có sau khi 2 người chấm xong: `npm run so-sanh:cham -- <thư mục này>`.