# Thiết kế: Chế độ trình diễn (cho ban giám khảo "nhìn được bên trong" Mây)

Ngày 26/10/2026 · Demo 2.

## Mục tiêu
Trong 10–12 phút, ban giám khảo thấy được 5 điều, bằng chính code đang chạy thật (không phải ảnh dựng sẵn):
1. Mây hiểu một tin nhắn qua những bước nào.
2. Mây nhận ra chuyện nguy hiểm và báo thầy cô ra sao.
3. Mây được dạy như thế nào.
4. Bí mật của từng bạn được giữ thế nào.
5. Một bạn đi hết vòng chăm sóc trong 1 tháng ra sao, kể cả lúc Mây hỏi lại.

## Giữ an toàn (luật cứng, có kiểm tra trong code)
- Chỉ admin bật được. Bật = ghi một cookie trên máy admin đó; máy chủ còn kiểm tra vai trò admin ở mỗi lần mở trang. Học sinh không bao giờ thấy.
- Dữ liệu mẫu nằm trong 3 **lớp mẫu** riêng (mã lớp bắt đầu bằng `MAU-`, đánh dấu lớp thử, có sổ ghi danh sách tài khoản mẫu `demo.registry`).
  Email đăng nhập của tài khoản mẫu có đuôi `@demo.fmood.invalid` (không ai nhận thư được).
- Khi **bật**: trang thầy cô chỉ hiện lớp mẫu, không hiện bất kỳ học sinh thật nào. Khi **tắt**: lớp mẫu biến mất hẳn khỏi mọi trang và mọi số liệu.
- Không ai đăng nhập hay đăng ký vào lớp mẫu được (mã `MAU-` bị chặn ở trang đăng nhập / đăng ký).
- Không gửi email cho lớp mẫu (chặn ngay trong hàm tạo cảnh báo). Tình huống nguy hiểm là **giả lập**: không dùng câu nguy hiểm thật, chỉ ghi "câu mẫu – giả lập".
- "Tua nhanh" chỉ chạy với tài khoản nằm trong sổ ghi tài khoản mẫu, ở lớp `MAU-`, có email `@demo.fmood.invalid`. Thiếu một điều kiện là từ chối.
- Khi đang trình diễn, các nút sửa **dữ liệu thật dùng chung** (lời dặn, tính cách, tài liệu, bài học chung, lớp, tài khoản thầy cô) bị khóa. Muốn dạy thử thì dùng phần "Dạy thử" (không lưu).

## Dữ liệu mẫu
- 3 lớp dùng app (7A: 22 bạn, 7B: 20 bạn, 8C: 16 bạn) trong 30 ngày + 1 lớp không dùng app (8D, 20 bạn, chỉ có phiếu khảo sát trước/sau).
- 3 GVCN mẫu + 1 tư vấn viên mẫu (không có email).
- Mỗi bạn có một "kiểu" (vui vẻ đều đặn, áp lực thi, chuyện bạn bè, chuyện gia đình, bỏ dở sau tuần đầu, mới vào...), nên số liệu trông thật: có bạn bỏ dở, có ngày dưới 5 bạn check-in (bị ẩn), có chỉ số Đạt, Chưa đạt và Chưa đủ dữ liệu.
- Tạo bằng hàm thuần `lib/demo/generate.ts` (cùng hạt giống → cùng dữ liệu, có test), ghi bằng `lib/demo/seed.ts`. Nút **Tạo / Tạo lại / Xóa** ở trang Trình diễn.

## Các phần trình diễn (`/staff/trinh-dien`)
| # | Phần | Thấy gì |
|---|---|---|
| 1 | Hành trình 1 tháng | Lịch cảm xúc, chuyện bận lòng và mức lo qua từng lần hỏi lại, huy hiệu, ai thấy gì. Nút **Tua nhanh 7 ngày** → thẻ "Mây hỏi thăm" hiện ra, trả lời ngay trên màn hình. |
| 2 | Mây nghĩ thế nào | Gõ 1 câu → từng bước hiện dần: chuẩn hóa, từ khóa, AI phân loại, quyết định, đoán chủ đề, kịch bản, tài liệu, lời dặn, câu trả lời, máy chấm, gợi ý. Không lưu gì. |
| 3 | Khi có chuyện nguy hiểm | 5 tình huống giả lập (khẩn cấp, đáng lo, nói quá, AI mất kết nối, thấy nặng hơn khi được hỏi lại): câu trả lời soạn sẵn, cảnh báo vào hộp của tư vấn viên, email xem trước (không gửi). |
| 4 | Giữ bí mật | Đăng nhập thật bằng bạn A rồi gọi thẳng cơ sở dữ liệu để đọc / sửa dữ liệu của bạn B → mọi lần đều bị chặn. Kèm: GVCN chỉ thấy số liệu chung, không xem được lớp đồng nghiệp, nhóm dưới 5 bạn bị ẩn. |
| 5 | Mây được dạy thế nào | Các lớp lời dặn (tính cách, lời dặn, luật cố định, chủ đề, tài liệu, phản hồi 👍/👎, bộ câu thử). **Dạy thử**: thêm một lời dặn tạm, so câu trả lời trước / sau. |
| 6 | App có giúp được không | Trang Kết quả với dữ liệu mẫu (ghi rõ là mẫu), phiếu khảo sát mẫu có lớp không dùng app. |

## Phần đã quyết định thay Duy (xem lại giúp)
- Lớp không dùng app chỉ có trong phiếu khảo sát (không tạo tài khoản), vì lớp đó thật sự không dùng app.
- Cảnh báo khẩn trong dữ liệu mẫu chỉ có 3 (cho giống thật), nên chỉ số 5 hiện "Chưa đủ dữ liệu" — đây là cố ý, để thấy app không "làm đẹp" số liệu.
- Kết quả hiệu quả trong chế độ trình diễn là số mẫu; trang ghi to "DỮ LIỆU MẪU" (cả khi in).
