/**
 * F-Mood · TẠO PHIẾU KHẢO SÁT TRƯỚC / SAU KHI DÙNG THỬ
 * File này được sinh tự động từ lib/effect/survey.ts (đừng sửa câu hỏi ở đây, sửa ở đó rồi sinh lại).
 *
 * Lớp: 7A1 và 8A1 dùng F-Mood, 7A3 và 8A4 là lớp so sánh (lấy từ SURVEY_CLASSES trong lib/effect/survey.ts).
 *
 * ĐÃ TẠO PHIẾU RỒI (chỉ cần đổi danh sách lớp): bấm ▶ Chạy với hàm doiLop.
 *   Hàm tìm 2 phiếu đang nối vào bảng kết quả, đổi câu "[LOP] Em học lớp nào?" thành 8A1, 8A4 và lựa chọn thử phiếu,
 *   rồi ghi lại tab "Lớp". Câu trả lời đã có không bị xóa. Xem nhật ký thực thi để biết đã đổi phiếu nào.
 *
 * CHƯA CÓ PHIẾU: bấm ▶ Chạy với hàm taoPhieu, cho phép quyền truy cập khi Google hỏi.
 *   Xem nhật ký thực thi: có đường dẫn 2 phiếu, cũng được ghi vào tab "Hướng dẫn" của bảng kết quả.
 *   Chạy lại sẽ tạo thêm 2 phiếu MỚI (phiếu cũ không bị xóa).
 */

const LOP_DUNG_APP = ["7A1","8A1"]; // lớp dùng thử F-Mood
const LOP_SO_SANH = ["7A3","8A4"]; // lớp KHÔNG dùng, để so sánh

const BANG_KET_QUA = "1Q13alMH7KCpnQ1Zk8ArG5qrXO7Fa_X8CYGtIUCO9L2U";
const THU_MUC = "1lYLEHeuW8Kxg6EAXjJFMIyyXqqU2APuH";
const LOP_THU = "Thử phiếu (không tính)";

const WHO5 = [{"code":"W1","text":"Em thấy vui vẻ, tinh thần thoải mái"},{"code":"W2","text":"Em thấy bình tĩnh, thư thái"},{"code":"W3","text":"Em thấy khỏe khoắn, nhiều năng lượng"},{"code":"W4","text":"Em thức dậy thấy tỉnh táo, như được nghỉ ngơi đủ"},{"code":"W5","text":"Mỗi ngày của em có những điều em thấy thú vị"}];
const WHO5_LUA_CHON = ["0 - Không lúc nào","1 - Thỉnh thoảng","2 - Ít hơn một nửa số ngày","3 - Hơn một nửa số ngày","4 - Phần lớn số ngày","5 - Lúc nào cũng vậy"];
const PSS4 = [{"code":"P1","text":"Em thấy mình không làm chủ được những việc quan trọng của mình"},{"code":"P2","text":"Em thấy tự tin là mình xử lý được chuyện riêng của mình"},{"code":"P3","text":"Em thấy mọi việc diễn ra theo ý mình"},{"code":"P4","text":"Em thấy khó khăn dồn lại nhiều đến mức không vượt qua nổi"}];
const PSS4_LUA_CHON = ["0 - Không bao giờ","1 - Hầu như không","2 - Thỉnh thoảng","3 - Khá thường xuyên","4 - Rất thường xuyên"];
const TIM_GIUP = [{"code":"H1","text":"Bố mẹ hoặc người thân trong nhà"},{"code":"H2","text":"Bạn bè"},{"code":"H3","text":"Thầy cô chủ nhiệm"},{"code":"H4","text":"Thầy cô tư vấn tâm lý của trường"}];
const TIM_GIUP_LUA_CHON = ["1 - Chắc chắn không","2 - Gần như không","3 - Có lẽ không","4 - Chưa chắc","5 - Có lẽ có","6 - Gần như chắc chắn","7 - Chắc chắn có"];
const CAU_SAU = [{"code":"S1","text":"F-Mood giúp em hiểu và gọi tên cảm xúc của mình hơn"},{"code":"S2","text":"Em thấy an toàn khi kể chuyện với trợ lý AI của F-Mood"},{"code":"S3","text":"Khi gặp chuyện khó, em biết mình có thể tìm ai để được giúp"},{"code":"S4","text":"Em muốn tiếp tục dùng F-Mood"}];
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

/** Đổi danh sách lớp trong 2 phiếu ĐÃ TẠO (đang nối vào bảng kết quả) và tab "Lớp". Không xóa câu trả lời nào. */
function doiLop() {
  const ss = SpreadsheetApp.openById(BANG_KET_QUA);
  const lop = LOP_DUNG_APP.concat(LOP_SO_SANH, [LOP_THU]);
  let doi = 0;
  ss.getSheets().forEach((sheet) => {
    const formUrl = sheet.getFormUrl();
    if (!formUrl) return;
    const form = FormApp.openByUrl(formUrl);
    form.getItems(FormApp.ItemType.LIST).forEach((item) => {
      if (item.getTitle().indexOf("[LOP]") !== 0) return;
      item.asListItem().setChoiceValues(lop);
      doi++;
      Logger.log("Đã đổi lớp trong phiếu: " + form.getTitle() + " (tab " + sheet.getName() + ") → " + lop.join(", "));
    });
  });
  ghiLop_(ss);
  Logger.log(doi ? "Xong: đổi " + doi + " phiếu, ghi lại tab Lớp." : "Không thấy phiếu nào nối vào bảng kết quả. Chạy taoPhieu để tạo phiếu.");
}

function ghiLop_(ss) {
  const lop = ss.getSheetByName("Lớp");
  const rows = LOP_DUNG_APP.map((l) => [l, "Dùng F-Mood"]).concat(LOP_SO_SANH.map((l) => [l, "Không dùng"]), [[LOP_THU, "Không tính"]]);
  lop.getRange("A2:B").clearContent();
  lop.getRange(2, 1, rows.length, 2).setValues(rows);
}
