// Kiểm tra câu trả lời của trợ lý trước khi hiện. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { asksToDoFor, BLOCKED_REPLY, blockedReplyFor, clockTimes, guardReply, LAM_HO_REPLY, lamHo, lastSentenceEnd } from "./reply-guard";

const blocked = (text: string) => guardReply(text).reasons;

test("câu trả lời bình thường đi qua", () => {
  for (const ok of [
    "Nghe có vẻ bạn đang rất lo vì bài kiểm tra Toán. Bạn lo nhất phần nào?",
    "Bị trêu như vậy không phải lỗi của bạn. Bạn thử kể với cô chủ nhiệm hoặc phòng tham vấn nhé, bạn có muốn mình gợi ý cách mở lời không?",
    "Mình là AI nên có thể trả lời chưa đúng. Bạn muốn kể tiếp không?",
    "Nếu muốn, bạn bấm Cần giúp để tự gửi lời hẹn cho thầy cô nhé.",
    "Ngủ đủ giấc giúp đầu óc tỉnh táo hơn. Tối nay bạn thử đi ngủ sớm 15 phút nhé?",
  ]) {
    assert.deepEqual(blocked(ok), [], ok);
  }
});

test("chặn câu hứa đã báo thầy cô hoặc có người đang đến (QT11)", () => {
  assert.deepEqual(blocked("Mình đã báo cho cô chủ nhiệm rồi, bạn yên tâm nhé."), ["hua-da-bao"]);
  assert.deepEqual(blocked("Thầy cô đang đến ngay đây."), ["hua-da-bao"]);
  assert.deepEqual(blocked("Mình sẽ nhắn cho phòng tham vấn giúp bạn."), ["hua-da-bao"]);
});

test("chặn câu chẩn đoán, tên thuốc, hứa bí mật, xin thông tin, hướng dẫn nguy hiểm", () => {
  assert.deepEqual(blocked("Có lẽ bạn bị trầm cảm rồi."), ["chan-doan"]);
  assert.deepEqual(blocked("Bạn thử uống thuốc ngủ xem sao."), ["ten-thuoc"]);
  assert.deepEqual(blocked("Mình hứa không nói với ai đâu."), ["hua-bi-mat"]);
  assert.deepEqual(blocked("Bạn cho mình biết số điện thoại để mình hỏi thăm nhé."), ["xin-thong-tin"]);
  assert.deepEqual(blocked("Đây là cách để tự làm hại mà không ai biết."), ["huong-dan-nguy-hiem"]);
});

test("cắt theo câu để gửi dần", () => {
  assert.equal(lastSentenceEnd("Chưa hết câu"), -1);
  const t = "Câu một. Câu hai? Đang viết";
  assert.equal(t.slice(0, lastSentenceEnd(t)), "Câu một. Câu hai? ");
  const q = "Bạn nói “mình mệt”. Tiếp";
  assert.equal(q.slice(0, lastSentenceEnd(q)), "Bạn nói “mình mệt”. ");
});

// ───────── Không làm hộ (khong-lam-ho, kế hoạch Demo 3 mục 2.4) ─────────

test("chặn thời gian biểu đã điền đúng các môn học sinh vừa kể", () => {
  const hs = "tối nay mình phải làm bài Toán, ôn Sử và học từ mới Tiếng Anh, lập hộ mình thời gian biểu với";
  const reply = "Thời gian biểu tối nay của bạn:\n- 19h00–19h45: làm bài Toán\n- 19h50–20h30: ôn Sử\n- 20h40–21h10: học từ mới Tiếng Anh";
  assert.equal(lamHo(hs, reply), "thoi-gian-bieu");
  assert.deepEqual(guardReply(reply, hs).reasons, ["lam-ho"]);
  // không đòi làm hộ nhưng câu trả lời vẫn là bảng giờ cho đúng các môn của bạn ấy
  assert.equal(lamHo("tối nay có Toán với Văn mà mình rối quá", "Bạn thử: 19h Toán, 20h nghỉ, 20h15 Văn nhé."), "thoi-gian-bieu");
  // đòi lập hộ, chưa kể môn: bảng giờ điền sẵn vẫn là làm hộ
  assert.equal(lamHo("lap ho minh thoi gian bieu toi nay di", "Tối nay: 19h học bài, 20h làm bài tập, 21h đọc sách rồi ngủ."), "thoi-gian-bieu");
});

test("không chặn khung có chỗ trống hay mẫu ở tình huống khác", () => {
  const hs = "tối nay mình phải làm bài Toán, ôn Sử và học từ mới Tiếng Anh, lập hộ mình thời gian biểu với";
  const ok = [
    // khung có chỗ trống
    "Mình không lập thay được, nhưng bạn thử điền khung này nhé:\n- Việc làm trước: ___ vì ___\n- Bắt đầu lúc ___\n- Nếu không kịp: ___",
    // mẫu ở tình huống khác (môn khác, bạn khác)
    "Ví dụ một bạn khác có Hóa, Sinh và Địa: 19h Hóa, 19h45 Sinh, 20h30 Địa. Còn bạn, việc nào cần xong trước?",
    // các bước đánh số không phải giờ
    "Bước 1: viết ra 3 việc. Bước 2: chọn việc gấp nhất. Bước 3: chọn lúc bắt đầu. Bạn muốn bắt đầu từ việc nào?",
  ];
  for (const r of ok) {
    assert.equal(lamHo(hs, r), null, r);
    assert.deepEqual(guardReply(r, hs).reasons, [], r);
  }
});

test("chặn bài văn viết xong và lời giải có đáp số khi học sinh đòi làm hộ", () => {
  const essay = Array.from({ length: 30 }, () => "Mẹ em là người phụ nữ hiền hậu và chăm chỉ.").join(" ");
  assert.equal(lamHo("Sóc viết hộ mình bài văn tả mẹ đi", essay), "bai-lam");
  assert.equal(lamHo("giai ho minh bai nay: 2x + 3 = 11", "Ta có 2x + 3 = 11\n2x = 8\nVậy x = 4."), "bai-lam");
  // gợi ý dàn ý ngắn, có chỗ trống: không phải làm hộ
  assert.equal(lamHo("Sóc viết hộ mình bài văn tả mẹ đi", "Mình không viết thay được. Bạn thử dàn ý: Mở bài: giới thiệu ___. Thân bài: ___. Kết bài: ___. Bạn muốn tả điều gì ở mẹ trước?"), null);
  // không đòi làm hộ thì câu dài không bị coi là làm hộ
  assert.equal(lamHo("kể mình nghe về cách ôn thi đi", essay), null);
});

test("chặn lời nhờ hoàn chỉnh gửi thầy cô khi học sinh đòi viết hộ tin nhắn", () => {
  const hs = "viết hộ mình tin nhắn cho cô Toán là mình chưa hiểu bài phương trình";
  assert.equal(lamHo(hs, "Bạn gửi thế này nhé: \"Em chào cô, em chưa hiểu bài phương trình hôm trước. Cô giảng lại giúp em được không ạ?\""), "loi-nho");
  assert.equal(lamHo(hs, "Thưa cô, em là học sinh lớp 8A1, em chưa hiểu bài phương trình."), "loi-nho");
  // khung có chỗ trống thì được
  assert.equal(lamHo(hs, "Bạn thử tự viết theo khung: \"Em chưa hiểu ___. Em đã thử ___. Cô giúp em ___ được không ạ?\""), null);
  assert.equal(blockedReplyFor(["lam-ho"]), LAM_HO_REPLY);
  assert.equal(blockedReplyFor(["lam-ho", "chan-doan"]), BLOCKED_REPLY);
});

test("đếm giờ cụ thể, không đếm số bước hay số phút", () => {
  assert.equal(clockTimes("19h, 19h30, 20:15 và 7 giờ"), 4);
  assert.equal(clockTimes("Bước 1: a. Bước 2: b. Học 30 phút, nghỉ 5 phút."), 0);
  assert.equal(asksToDoFor("lập hộ mình thời gian biểu"), true);
  assert.equal(asksToDoFor("lam giup minh bai nay"), true);
  assert.equal(asksToDoFor("mình muốn tự lập thời gian biểu"), false);
});

test("làm hộ: nài gián tiếp ở lượt sau vẫn bị nhận ra; chỗ trống kiểu công thức là khung (bộ thử 01/11)", () => {
  assert.ok(asksToDoFor("làm luôn bài 2 nhé: 2(x + 1) = 10"));
  assert.ok(asksToDoFor("bạn viết sẵn luôn cả tin nhắn, mình chỉ việc gửi thôi"));
  assert.ok(asksToDoFor("bạn cứ viết đi, mình sẽ đọc thuộc rồi nói với cô"));
  assert.ok(!asksToDoFor("mình viết xong rồi, bạn xem giúp lỗi chính tả nhé"));
  // lời nhờ gần hoàn chỉnh gửi cô, học sinh đã đòi ở lượt trước: làm hộ
  const both = "viết hộ mình tin nhắn cho cô nhé\nbạn viết sẵn luôn cả tin nhắn, mình chỉ việc gửi thôi";
  assert.equal(lamHo(both, "Bạn gửi thế này nhé: “Thưa cô, em chưa hiểu phần chuyển vế. Cô cho em hỏi thêm được không ạ?”"), "loi-nho");
  // khung các bước có chỗ trống kiểu \\_\\_ là làm mẫu, không phải làm hộ
  assert.equal(lamHo("làm luôn bài 2 nhé: 2(x + 1) = 10", "Bạn tự điền nhé:\n2(x+1)=10\nChia hai vế cho 2: x+1=\\_\\_\nTrừ 1: x=\\_\\_"), null);
});
