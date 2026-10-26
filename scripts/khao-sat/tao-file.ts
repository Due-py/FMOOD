// Sinh các file cho phiếu khảo sát từ MỘT nguồn câu hỏi (lib/effect/survey.ts):
//   scripts/khao-sat/tao-phieu.gs      mã Apps Script tạo 2 Google Forms (trước / sau) nối vào bảng kết quả
//   scripts/khao-sat/mau-truoc.json    dữ liệu mẫu phiếu trước (để kiểm tra công thức trong Google Sheets)
//   scripts/khao-sat/mau-sau.json      dữ liệu mẫu phiếu sau
//   scripts/khao-sat/dap-an-mau.json   đáp án app tính trên dữ liệu mẫu (Sheets phải ra đúng như vậy)
// Dùng: npx tsx scripts/khao-sat/tao-file.ts <id bảng kết quả> <id thư mục Khảo sát>
import { writeFileSync } from "node:fs";
import path from "node:path";
import { surveyMetric } from "@/lib/effect/metrics";
import {
  AFTER_ITEMS,
  AGREE_OPTIONS,
  HELP_ITEMS,
  HELP_OPTIONS,
  pairSurveys,
  parseSurveyCsv,
  PSS4_ITEMS,
  PSS4_OPTIONS,
  TEST_CLASS,
  WHO5_ITEMS,
  WHO5_OPTIONS,
} from "@/lib/effect/survey";

const [sheetId = "ID_BANG_KET_QUA", folderId = "ID_THU_MUC"] = process.argv.slice(2);
const DIR = path.join(import.meta.dirname);

// ───────── Tiêu đề cột đúng như Google Forms sẽ tạo ─────────
const t = (code: string, text: string) => `[${code}] ${text}`;
const LOP = t("LOP", "Em học lớp nào?");
const MA = t("MA", "Mã bí mật của em");
const PRE_HEADER = ["Dấu thời gian", LOP, MA, ...[...WHO5_ITEMS, ...PSS4_ITEMS, ...HELP_ITEMS].map((q) => t(q.code, q.text))];
const POST_HEADER = [...PRE_HEADER, ...AFTER_ITEMS.map((q) => t(q.code, q.text))];

// ───────── Dữ liệu mẫu (tự đặt, không phải học sinh thật) ─────────
const opt = (list: string[], n: number, offset = 0) => list[n - offset];
type Ans = { w: number[]; p: number[]; h: number[]; s?: number[] };
const row = (lop: string, ma: string, a: Ans) => [
  "26/10/2026 08:00:00",
  lop,
  ma,
  ...a.w.map((x) => opt(WHO5_OPTIONS, x)),
  ...a.p.map((x) => opt(PSS4_OPTIONS, x)),
  ...a.h.map((x) => opt(HELP_OPTIONS, x, 1)),
  ...(a.s ? a.s.map((x) => opt(AGREE_OPTIONS, x, 1)) : []),
];
const APP = "7A1";
const CTL = "7A2";
const pre = [
  row(APP, "A01B", { w: [2, 2, 3, 2, 2], p: [3, 1, 1, 3], h: [5, 6, 3, 2] }),
  row(APP, "C02D", { w: [3, 2, 2, 2, 3], p: [2, 2, 1, 2], h: [6, 6, 2, 2] }),
  row(APP, "E03F", { w: [1, 2, 2, 1, 2], p: [3, 1, 2, 3], h: [4, 5, 3, 3] }),
  row(APP, "G04H", { w: [3, 3, 3, 3, 3], p: [2, 2, 2, 2], h: [5, 5, 4, 3] }),
  row(APP, "J05K", { w: [2, 3, 2, 2, 2], p: [2, 1, 2, 3], h: [7, 6, 3, 2] }),
  row(APP, "L06M", { w: [2, 2, 2, 2, 2], p: [3, 2, 1, 2], h: [5, 6, 2, 1] }),
  row(APP, "L06M", { w: [5, 5, 5, 5, 5], p: [0, 4, 4, 0], h: [7, 7, 7, 7] }), // trùng mã: giữ lần đầu
  row(APP, "Z99Z", { w: [3, 3, 3, 3, 3], p: [2, 2, 2, 2], h: [4, 4, 4, 4] }), // không làm phiếu sau
  row(CTL, "N07P", { w: [2, 3, 2, 2, 3], p: [2, 2, 2, 2], h: [5, 5, 3, 2] }),
  row(CTL, "Q08R", { w: [3, 3, 2, 3, 2], p: [2, 1, 2, 2], h: [6, 5, 3, 3] }),
  row(CTL, "S09T", { w: [2, 2, 2, 1, 2], p: [3, 2, 1, 3], h: [5, 4, 2, 2] }),
  row(CTL, "U10V", { w: [3, 2, 3, 3, 3], p: [1, 2, 2, 2], h: [6, 6, 3, 3] }),
  row(CTL, "W11X", { w: [2, 2, 2, 2, 3], p: [2, 2, 2, 3], h: [5, 6, 2, 2] }),
  row(TEST_CLASS, "T12T", { w: [0, 0, 0, 0, 0], p: [4, 0, 0, 4], h: [1, 1, 1, 1] }), // phiếu thử: không tính
];
const post = [
  row(APP, "A01B", { w: [3, 3, 3, 3, 3], p: [2, 2, 2, 2], h: [5, 6, 4, 3], s: [4, 5, 4, 4] }),
  row(APP, "C02D", { w: [4, 3, 3, 3, 3], p: [1, 3, 2, 2], h: [6, 6, 3, 3], s: [5, 4, 5, 5] }),
  row(APP, "E03F", { w: [2, 3, 2, 2, 3], p: [2, 2, 2, 2], h: [5, 5, 4, 4], s: [3, 4, 4, 3] }),
  row(APP, "G04H", { w: [4, 4, 3, 3, 4], p: [1, 3, 2, 1], h: [5, 5, 5, 4], s: [4, 4, 5, 4] }),
  row(APP, "J05K", { w: [3, 3, 3, 2, 3], p: [2, 2, 2, 2], h: [7, 6, 4, 3], s: [2, 3, 3, 2] }),
  row(APP, "L06M", { w: [3, 3, 2, 3, 3], p: [2, 2, 2, 2], h: [5, 6, 3, 2], s: [5, 5, 4, 5] }),
  row(CTL, "N07P", { w: [2, 3, 2, 2, 2], p: [2, 2, 2, 2], h: [5, 5, 3, 2] }),
  row(CTL, "Q08R", { w: [3, 3, 3, 3, 2], p: [2, 2, 2, 2], h: [6, 5, 3, 3] }),
  row(CTL, "S09T", { w: [2, 2, 2, 2, 2], p: [3, 2, 1, 3], h: [5, 4, 3, 2] }),
  row(CTL, "U10V", { w: [3, 2, 3, 3, 3], p: [2, 2, 2, 2], h: [6, 6, 3, 3] }),
  row(CTL, "W11X", { w: [2, 3, 2, 2, 3], p: [2, 2, 2, 2], h: [5, 6, 2, 3] }),
  row(CTL, "W11X", { w: [5, 5, 5, 5, 5], p: [0, 4, 4, 0], h: [7, 7, 7, 7] }), // trùng mã: giữ lần đầu
  row(CTL, "Y13Y", { w: [3, 3, 3, 3, 3], p: [2, 2, 2, 2], h: [4, 4, 4, 4] }), // không làm phiếu trước
];

// ───────── Đáp án của app trên dữ liệu mẫu ─────────
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
const pairs = pairSurveys(parseSurveyCsv(csv([PRE_HEADER, ...pre])).rows, parseSurveyCsv(csv([POST_HEADER, ...post])).rows, (c) =>
  c === APP ? "app" : c === CTL ? "control" : null,
).pairs;
const answer = Object.fromEntries(
  (["who5", "pss4", "helpTeacher"] as const).map((f) => {
    const m = surveyMetric(f, pairs);
    return [f, { status: m.status, ...m.compare }];
  }),
);
writeFileSync(path.join(DIR, "mau-truoc.json"), JSON.stringify([PRE_HEADER, ...pre]));
writeFileSync(path.join(DIR, "mau-sau.json"), JSON.stringify([POST_HEADER, ...post]));
writeFileSync(path.join(DIR, "dap-an-mau.json"), JSON.stringify(answer, null, 2));

// ───────── Mã Apps Script tạo Google Forms ─────────
const js = (v: unknown) => JSON.stringify(v);
const gs = `/**
 * F-Mood · TẠO PHIẾU KHẢO SÁT TRƯỚC / SAU KHI DÙNG THỬ
 * File này được sinh tự động từ lib/effect/survey.ts (đừng sửa câu hỏi ở đây, sửa ở đó rồi sinh lại).
 *
 * Cách dùng (một lần):
 *   1. Sửa danh sách lớp ở dưới (LOP_DUNG_APP, LOP_SO_SANH) cho đúng tên lớp.
 *   2. Bấm ▶ Chạy với hàm taoPhieu, cho phép quyền truy cập khi Google hỏi.
 *   3. Xem nhật ký thực thi: có đường dẫn 2 phiếu. Đường dẫn cũng được ghi vào tab "Hướng dẫn" của bảng kết quả.
 * Chạy lại sẽ tạo thêm 2 phiếu MỚI (phiếu cũ không bị xóa).
 */

const LOP_DUNG_APP = ["8A1"]; // các lớp dùng thử F-Mood
const LOP_SO_SANH = ["8A4"]; // các lớp KHÔNG dùng, để so sánh

const BANG_KET_QUA = ${js(sheetId)};
const THU_MUC = ${js(folderId)};
const LOP_THU = ${js(TEST_CLASS)};

const WHO5 = ${js(WHO5_ITEMS)};
const WHO5_LUA_CHON = ${js(WHO5_OPTIONS)};
const PSS4 = ${js(PSS4_ITEMS)};
const PSS4_LUA_CHON = ${js(PSS4_OPTIONS)};
const TIM_GIUP = ${js(HELP_ITEMS)};
const TIM_GIUP_LUA_CHON = ${js(HELP_OPTIONS)};
const CAU_SAU = ${js(AFTER_ITEMS)};
const DONG_Y = ${js(AGREE_OPTIONS)};

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
      "Không có câu trả lời đúng hay sai; em trả lời theo cảm nhận thật của mình. Mất khoảng 5 phút.\\n\\n" +
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
`;
writeFileSync(path.join(DIR, "tao-phieu.gs"), gs);
console.log("Đã sinh: tao-phieu.gs, mau-truoc.json, mau-sau.json, dap-an-mau.json");
console.log(JSON.stringify(answer, null, 2));
