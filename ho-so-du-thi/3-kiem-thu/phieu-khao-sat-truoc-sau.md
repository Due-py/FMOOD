# F-Mood · Phiếu khảo sát trước và sau khi dùng thử

Mục đích: đo xem F-Mood có giúp được học sinh không, bằng cách so lớp dùng F-Mood với lớp không dùng, trước và sau 2 tuần.
Phiếu không hỏi tên, không thu email. Kết quả chỉ báo theo nhóm, nhóm dưới 5 bạn không kết luận.

## Cách làm

1. Mở bảng **F-Mood_Kết quả hiệu quả** (thư mục documents) → **Tiện ích mở rộng → Apps Script**.
2. Xóa đoạn mã có sẵn, dán toàn bộ **Mã tạo phiếu** ở cuối tài liệu này. Sửa tên lớp ở hai dòng `LOP_DUNG_APP` và `LOP_SO_SANH`.
3. Bấm **Lưu**, chọn hàm `taoPhieu`, bấm **▶ Chạy**, cho phép quyền khi Google hỏi.
4. Hai Google Forms được tạo trong thư mục Khảo sát và tự nối vào bảng kết quả (tab Phản hồi trước / Phản hồi sau). Đường dẫn gửi học sinh nằm ở tab Hướng dẫn, hàng 20–23.
5. Lịch: cả hai lớp làm **Phiếu trước** → lớp dùng F-Mood dùng thử **2 tuần** → cả hai lớp làm **Phiếu sau** với đúng mã bí mật cũ.

Trước khi làm khảo sát cần nhà trường đồng ý (và phụ huynh nếu trường yêu cầu). Nói rõ với học sinh là không bắt buộc.

## Câu hỏi (giống nhau ở hai phiếu)

**[LOP] Em học lớp nào?** (chọn trong danh sách; có thêm lựa chọn "Thử phiếu (không tính)" để nhóm thử phiếu)

**[MA] Mã bí mật của em**: viết không dấu, 4 ký tự: chữ cái đầu tên mẹ (hoặc người chăm sóc em) + ngày sinh của em (2 chữ số) + chữ cái đầu tên em. Ví dụ: mẹ tên Lan, em sinh ngày 7, em tên Minh → L07M. Mã chỉ dùng để ghép phiếu trước với phiếu sau của cùng một bạn.

### Phần 1. Trong 2 tuần vừa qua, em thấy thế nào? (WHO-5)

Lựa chọn: 0 Không lúc nào · 1 Thỉnh thoảng · 2 Ít hơn một nửa số ngày · 3 Hơn một nửa số ngày · 4 Phần lớn số ngày · 5 Lúc nào cũng vậy

- [W1] Em thấy vui vẻ, tinh thần thoải mái
- [W2] Em thấy bình tĩnh, thư thái
- [W3] Em thấy khỏe khoắn, nhiều năng lượng
- [W4] Em thức dậy thấy tỉnh táo, như được nghỉ ngơi đủ
- [W5] Mỗi ngày của em có những điều em thấy thú vị

Cách tính: cộng 5 câu (0–25) rồi nhân 4 → thang 0–100, cao là tốt.

### Phần 2. Trong 2 tuần vừa qua, em có hay thấy như thế này không? (PSS-4)

Lựa chọn: 0 Không bao giờ · 1 Hầu như không · 2 Thỉnh thoảng · 3 Khá thường xuyên · 4 Rất thường xuyên

- [P1] Em thấy mình không làm chủ được những việc quan trọng của mình
- [P2] Em thấy tự tin là mình xử lý được chuyện riêng của mình *(tính ngược)*
- [P3] Em thấy mọi việc diễn ra theo ý mình *(tính ngược)*
- [P4] Em thấy khó khăn dồn lại nhiều đến mức không vượt qua nổi

Cách tính: P1 + (4 − P2) + (4 − P3) + P4 → thang 0–16, thấp là tốt.

### Phần 3. Nếu em gặp chuyện buồn hoặc lo lắng, em có tìm đến những người này để được giúp không? (GHSQ)

Lựa chọn: 1 Chắc chắn không · 2 Gần như không · 3 Có lẽ không · 4 Chưa chắc · 5 Có lẽ có · 6 Gần như chắc chắn · 7 Chắc chắn có

- [H1] Bố mẹ hoặc người thân trong nhà
- [H2] Bạn bè
- [H3] Thầy cô chủ nhiệm
- [H4] Thầy cô tư vấn tâm lý của trường

Cách tính chỉ số "dám tìm đến thầy cô": trung bình của H3 và H4 (thang 1–7).

## Chỉ có ở Phiếu sau, chỉ lớp dùng F-Mood trả lời (không bắt buộc)

Lựa chọn: 1 Rất không đồng ý · 2 Không đồng ý · 3 Phân vân · 4 Đồng ý · 5 Rất đồng ý

- [S1] F-Mood giúp em hiểu và gọi tên cảm xúc của mình hơn
- [S2] Em thấy an toàn khi kể chuyện với Mây
- [S3] Khi gặp chuyện khó, em biết mình có thể tìm ai để được giúp
- [S4] Em muốn tiếp tục dùng F-Mood
- [GOP_Y] Em muốn F-Mood sửa hay thêm điều gì? (tự viết)

Các câu này chỉ là thông tin thêm, không dùng để chấm Đạt / Chưa đạt.

## Nguồn bộ câu hỏi

- WHO-5 Well-Being Index: Tổ chức Y tế Thế giới (WHO), bộ 5 câu, dùng tự do, đã dùng cho học sinh từ 9 tuổi. Lời ở đây viết lại cho học sinh cấp 2, giữ nguyên ý và thang điểm.
- PSS-4 (Perceived Stress Scale, 4 câu): Cohen và cộng sự (1983), dùng tự do cho giáo dục và nghiên cứu. Bản gốc hỏi "tháng vừa qua"; ở đây đổi thành "2 tuần vừa qua" cho khớp thời gian dùng thử.
- GHSQ (General Help-Seeking Questionnaire): Wilson và cộng sự (2005), thang 1–7 cho từng người có thể tìm đến.

Đây là bộ câu hỏi khảo sát, không dùng để chẩn đoán. Không kết luận về từng bạn, chỉ so trung bình của nhóm.

## Mã tạo phiếu (Apps Script)

Dán toàn bộ đoạn dưới đây vào Apps Script của bảng kết quả (xem phần Cách làm). File gốc trong mã nguồn: scripts/khao-sat/tao-phieu.gs, được sinh từ cùng danh sách câu hỏi app dùng để tính điểm.

```
/**
 * F-Mood · TẠO PHIẾU KHẢO SÁT TRƯỚC / SAU KHI DÙNG THỬ
 * File này được sinh tự động từ lib/effect/survey.ts (đừng sửa câu hỏi ở đây, sửa ở đó rồi sinh lại).
 *
 * Cách dùng (một lần):
 *   1. Sửa danh sách lớp ở dưới (LOP_DUNG_APP, LOP_SO_SANH) cho đúng tên lớp.
 *   2. Bấm ▶ Chạy với hàm taoPhieu, cho phép quyền truy cập khi Google hỏi.
 *   3. Xem nhật ký thực thi: có đường dẫn 2 phiếu. Đường dẫn cũng được ghi vào tab "Hướng dẫn" của bảng kết quả.
 * Chạy lại sẽ tạo thêm 2 phiếu MỚI (phiếu cũ không bị xóa).
 */

const LOP_DUNG_APP = ["7A1"]; // các lớp dùng thử F-Mood
const LOP_SO_SANH = ["7A2"]; // các lớp KHÔNG dùng, để so sánh

const BANG_KET_QUA = "1Q13alMH7KCpnQ1Zk8ArG5qrXO7Fa_X8CYGtIUCO9L2U";
const THU_MUC = "1lYLEHeuW8Kxg6EAXjJFMIyyXqqU2APuH";
const LOP_THU = "Thử phiếu (không tính)";

const WHO5 = [{"code":"W1","text":"Em thấy vui vẻ, tinh thần thoải mái"},{"code":"W2","text":"Em thấy bình tĩnh, thư thái"},{"code":"W3","text":"Em thấy khỏe khoắn, nhiều năng lượng"},{"code":"W4","text":"Em thức dậy thấy tỉnh táo, như được nghỉ ngơi đủ"},{"code":"W5","text":"Mỗi ngày của em có những điều em thấy thú vị"}];
const WHO5_LUA_CHON = ["0 - Không lúc nào","1 - Thỉnh thoảng","2 - Ít hơn một nửa số ngày","3 - Hơn một nửa số ngày","4 - Phần lớn số ngày","5 - Lúc nào cũng vậy"];
const PSS4 = [{"code":"P1","text":"Em thấy mình không làm chủ được những việc quan trọng của mình"},{"code":"P2","text":"Em thấy tự tin là mình xử lý được chuyện riêng của mình"},{"code":"P3","text":"Em thấy mọi việc diễn ra theo ý mình"},{"code":"P4","text":"Em thấy khó khăn dồn lại nhiều đến mức không vượt qua nổi"}];
const PSS4_LUA_CHON = ["0 - Không bao giờ","1 - Hầu như không","2 - Thỉnh thoảng","3 - Khá thường xuyên","4 - Rất thường xuyên"];
const TIM_GIUP = [{"code":"H1","text":"Bố mẹ hoặc người thân trong nhà"},{"code":"H2","text":"Bạn bè"},{"code":"H3","text":"Thầy cô chủ nhiệm"},{"code":"H4","text":"Thầy cô tư vấn tâm lý của trường"}];
const TIM_GIUP_LUA_CHON = ["1 - Chắc chắn không","2 - Gần như không","3 - Có lẽ không","4 - Chưa chắc","5 - Có lẽ có","6 - Gần như chắc chắn","7 - Chắc chắn có"];
const CAU_SAU = [{"code":"S1","text":"F-Mood giúp em hiểu và gọi tên cảm xúc của mình hơn"},{"code":"S2","text":"Em thấy an toàn khi kể chuyện với Mây"},{"code":"S3","text":"Khi gặp chuyện khó, em biết mình có thể tìm ai để được giúp"},{"code":"S4","text":"Em muốn tiếp tục dùng F-Mood"}];
const DONG_Y = ["1 - Rất không đồng ý","2 - Không đồng ý","3 - Phân vân","4 - Đồng ý","5 - Rất đồng ý"];

function taoPhieu() {
  const ss = SpreadsheetApp.openById(BANG_KET_QUA);
  const truoc = taoMotPhieu_("F-Mood · Phiếu TRƯỚC khi dùng thử", false);
  const sau = taoMotPhieu_("F-Mood · Phiếu SAU khi dùng thử", true);
  noiVaoBang_(ss, truoc, "Phản hồi trước");
  noiVaoBang_(ss, sau, "Phản hồi sau");
  ghiLop_(ss);
  const huongDan = ss.getSheetByName("Hướng dẫn");
  huongDan.getRange("A20:B23").setValues([
    ["Phiếu trước (gửi học sinh)", truoc.getPublishedUrl()],
    ["Phiếu sau (gửi học sinh)", sau.getPublishedUrl()],
    ["Sửa phiếu trước", truoc.getEditUrl()],
    ["Sửa phiếu sau", sau.getEditUrl()],
  ]);
  Logger.log("Phiếu trước: " + truoc.getPublishedUrl());
  Logger.log("Phiếu sau: " + sau.getPublishedUrl());
}

function taoMotPhieu_(tieuDe, laPhieuSau) {
  const form = FormApp.create(tieuDe);
  form.setDescription(
    "Phiếu này giúp nhóm F-Mood biết app có giúp được các bạn không. Không cần ghi tên. " +
      "Không có câu trả lời đúng hay sai; em trả lời theo cảm nhận thật của mình. Mất khoảng 5 phút.\n\n" +
      "Nếu em đang thấy rất buồn hoặc gặp nguy hiểm, hãy nói ngay với thầy cô, bố mẹ, hoặc gọi 111 (miễn phí, 24/7)."
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);

  form.addListItem().setTitle("[LOP] Em học lớp nào?").setChoiceValues(LOP_DUNG_APP.concat(LOP_SO_SANH, [LOP_THU])).setRequired(true);
  const ma = form
    .addTextItem()
    .setTitle("[MA] Mã bí mật của em")
    .setHelpText(
      "Viết không dấu, 4 ký tự: chữ cái đầu tên mẹ (hoặc người chăm sóc em) + ngày sinh của em (2 chữ số) + chữ cái đầu tên em. " +
        "Ví dụ: mẹ tên Lan, em sinh ngày 7, em tên Minh → L07M. Hãy dùng đúng mã này ở cả hai phiếu."
    )
    .setRequired(true);
  ma.setValidation(FormApp.createTextValidation().requireTextMatchesPattern("^[A-Za-z][0-9]{2}[A-Za-z]$").setHelpText("Mã gồm 1 chữ, 2 số, 1 chữ. Ví dụ L07M.").build());

  form.addPageBreakItem().setTitle("Trong 2 tuần vừa qua, em thấy thế nào?").setHelpText("Chọn mức gần đúng nhất với em.");
  WHO5.forEach((q) => form.addMultipleChoiceItem().setTitle("[" + q.code + "] " + q.text).setChoiceValues(WHO5_LUA_CHON).setRequired(true));

  form.addPageBreakItem().setTitle("Trong 2 tuần vừa qua, em có hay thấy như thế này không?");
  PSS4.forEach((q) => form.addMultipleChoiceItem().setTitle("[" + q.code + "] " + q.text).setChoiceValues(PSS4_LUA_CHON).setRequired(true));

  form
    .addPageBreakItem()
    .setTitle("Nếu em gặp chuyện buồn hoặc lo lắng, em có tìm đến những người này để được giúp không?")
    .setHelpText("1 = chắc chắn không, 7 = chắc chắn có.");
  TIM_GIUP.forEach((q) => form.addMultipleChoiceItem().setTitle("[" + q.code + "] " + q.text).setChoiceValues(TIM_GIUP_LUA_CHON).setRequired(true));

  if (laPhieuSau) {
    form.addPageBreakItem().setTitle("Chỉ dành cho lớp đã dùng F-Mood").setHelpText("Lớp em không dùng F-Mood thì bỏ qua phần này và bấm Gửi.");
    CAU_SAU.forEach((q) => form.addMultipleChoiceItem().setTitle("[" + q.code + "] " + q.text).setChoiceValues(DONG_Y).setRequired(false));
    form.addParagraphTextItem().setTitle("[GOP_Y] Em muốn F-Mood sửa hay thêm điều gì? (không bắt buộc)").setRequired(false);
  }
  form.setConfirmationMessage("Cảm ơn em! Nếu em cần nói chuyện với ai, thầy cô luôn sẵn lòng nghe em.");
  if (THU_MUC) DriveApp.getFileById(form.getId()).moveTo(DriveApp.getFolderById(THU_MUC));
  return form;
}

/** Nối phiếu vào bảng kết quả; tab phản hồi mới thay cho tab mẫu cùng tên (công thức dùng INDIRECT nên vẫn đúng). */
function noiVaoBang_(ss, form, ten) {
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  const moi = ss.getSheets().filter((s) => s.getFormUrl() && s.getFormUrl().indexOf(form.getId()) >= 0)[0];
  const cu = ss.getSheetByName(ten);
  if (cu && moi && cu.getSheetId() !== moi.getSheetId()) ss.deleteSheet(cu);
  if (moi) moi.setName(ten);
}

function ghiLop_(ss) {
  const lop = ss.getSheetByName("Lớp");
  const rows = LOP_DUNG_APP.map((l) => [l, "Dùng F-Mood"]).concat(LOP_SO_SANH.map((l) => [l, "Không dùng"]), [[LOP_THU, "Không tính"]]);
  lop.getRange("A2:B").clearContent();
  lop.getRange(2, 1, rows.length, 2).setValues(rows);
}
```
