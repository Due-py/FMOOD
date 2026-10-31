# Câu hỏi thêm vào phiếu khảo sát trước và sau

Demo 2 · bản 31/10/2026 (4 kỹ năng).

Thêm vào **cả phiếu trước và phiếu sau**, cho **cả hai lớp** 8A1 và 8A4, ngay sau Phần 3 của phiếu hiện có (`../phieu-khao-sat-truoc-sau.md`).

Mã câu dùng **TĐ** (tự đánh giá) và **HV** (hành vi tự kể) để không lẫn với mã kỹ năng K1–K4 của bài tình huống.

Đây vẫn là **học sinh tự đánh giá**. Nó cho biết các em *thấy mình* làm được hay không, **không** chứng minh các em làm được. Năng lực làm được đo bằng bài tình huống.

### Phần 4. Những câu sau đúng với em tới mức nào?

Lựa chọn: 1 Rất không đồng ý · 2 Không đồng ý · 3 Phân vân · 4 Đồng ý · 5 Rất đồng ý

- **[TĐ1]** Em biết điều gì đang làm em căng thẳng trong học tập *(kỹ năng K1 Nhận diện)*
- **[TĐ2]** Em có cách bình tĩnh lại trước giờ kiểm tra *(K2 Điều tiết)*
- **[TĐ3]** Khi có nhiều bài, em biết nên bắt đầu từ việc nào *(K3 Giải quyết vấn đề)*
- **[TĐ4]** Khi chưa hiểu bài, em dám hỏi thầy cô *(K4 Tìm kiếm hỗ trợ)*

Trên phiếu phát cho học sinh, bỏ phần ghi kỹ năng trong ngoặc.

Cách tính: mỗi câu tính riêng (1–5), so trước với sau. Không cộng thành một điểm.

### Phần 5. Trong 2 tuần vừa qua…

- **[HV1]** Khi chưa hiểu bài, em đã hỏi thầy cô (trong lớp, sau giờ học hoặc nhắn tin) bao nhiêu lần?
  Lựa chọn: Chưa lần nào · 1 lần · 2–3 lần · Từ 4 lần trở lên · Trong 2 tuần qua em không có bài nào chưa hiểu

- **[HV2]** *(chỉ hỏi khi HV1 từ 1 lần trở lên)* Trong những lần đó, có lần nào em hỏi qua **nút "Cần giúp" của F-Mood** không?
  Lựa chọn: Không · Có · Em không dùng F-Mood

Cách tính:
- Tỉ lệ bạn đã hỏi **ít nhất 1 lần**, chỉ tính các bạn **có** bài chưa hiểu (bỏ lựa chọn cuối của HV1).
- Báo **hai số cho lớp 8A1**: có và không tính các lần hỏi qua F-Mood. Lớp 8A4 không có nút "Cần giúp", nên chỉ số **không tính F-Mood** mới so được giữa hai lớp.
- Đây là hành vi **do các em tự kể** và nhớ lại trong 2 tuần, không phải số đếm thật.

## Cần sửa mã (chưa làm)

- Phiếu đang được tạo từ `lib/effect/survey.ts` bằng `scripts/khao-sat/tao-file.ts`, rồi chạy Apps Script `taoPhieu` hoặc `doiLop`. Muốn thêm TĐ1–TĐ4 và HV1–HV2 phải sửa `survey.ts`, tạo lại mã Apps Script và cập nhật bảng **F-Mood_Kết quả hiệu quả**. Sửa `survey.ts` sẽ làm đổi số trong `lib/effect/sample.test.ts`, nên phải kiểm tra lại.
- **Nếu phiếu trước đã phát rồi thì không thêm vào giữa chừng.** Khi đó dùng bài tình huống làm thước đo chính, TĐ1–TĐ4 và HV1–HV2 chỉ có ở phiếu sau và **không** được so trước với sau.
