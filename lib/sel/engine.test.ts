// Bộ điều phối SEL trong trò chuyện: mỗi quy tắc chọn bước (báo cáo 01/11, mục F.3) và chốt "một câu hỏi". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_EXTRACT, EMPTY_STATE, maxQuestions, moveInstruction, parseState, selStep, SKILL_CARD_MOVES, type SelExtract, type SelMove, type SelState } from "./engine";
import { limitQuestions, questionCutAt } from "./questions";

const x = (p: Partial<SelExtract> = {}): SelExtract => ({ ...EMPTY_EXTRACT, ...p });
const after = (moves: SelMove[], p: Partial<SelState> = {}): SelState => ({ ...EMPTY_STATE, moves, ...p });
const move = (s: SelState, e: Partial<SelExtract>, risk: "none" | "concern" | "urgent" = "none") => selStep(s, x(e), risk).move;

test("lượt đầu \"xấu hổ, ngại phát biểu\": từ mơ hồ chưa tính là đã biết, gọi tên cảm xúc trước, không hiện thẻ kỹ năng", () => {
  const s = selStep(EMPTY_STATE, x({ emotion: "xấu hổ", emotion_vague: true }), "none");
  assert.equal(s.state.known.emotion, undefined);
  const m = s.move;
  assert.equal(m, "lam-ro-cam-xuc");
  assert.ok(!SKILL_CARD_MOVES.includes(m));
});

test("an toàn luôn đứng trước mọi bước SEL", () => {
  assert.equal(move(EMPTY_STATE, { wants_solution: true }, "urgent"), "an-toan");
  assert.equal(move(EMPTY_STATE, { happened_to_me: true }, "concern"), "ho-tro-nguoi-lon");
});

test("nhánh A: chưa phân biệt được cảm xúc → vẫn gọi tên cảm xúc (tối đa 2 lần rồi đi tiếp)", () => {
  assert.equal(move(after(["lam-ro-cam-xuc"]), { emotion_unsure: true }), "lam-ro-cam-xuc");
  assert.equal(move(after(["lam-ro-cam-xuc", "lam-ro-cam-xuc"]), { emotion_unsure: true }), "hoi-co-the");
});

test("nhánh B, C: đã nói cơ thể thì hỏi suy nghĩ (không quay lại hỏi tên cảm xúc); đã nói suy nghĩ thì không hỏi lại", () => {
  assert.equal(move(after(["lam-ro-cam-xuc"]), { body: "tim đập nhanh, tay run" }), "hoi-suy-nghi");
  const s = selStep(after(["lam-ro-cam-xuc"]), x({ emotion: "sợ", thought: "sợ trả lời sai" }), "none");
  assert.notEqual(s.move, "hoi-suy-nghi");
  assert.notEqual(s.move, "lam-ro-cam-xuc");
});

test("nhánh D: dự đoán chưa xảy ra → xin phép trước; đồng ý mới tách sự việc và dự đoán; không đồng ý thì chấp nhận", () => {
  const s1 = selStep(after(["lam-ro-cam-xuc"]), x({ emotion: "sợ", thought: "các bạn sẽ cười", thought_is_prediction: true }), "none");
  assert.equal(s1.move, "xin-phep-xem-lai");
  assert.equal(selStep(s1.state, x({ confirms: true }), "none").move, "xem-lai-suy-nghi");
  assert.equal(selStep(s1.state, x({ declines: true }), "none").move, "chap-nhan");
});

test("nhánh E: chuyện đã thật sự xảy ra → công nhận, và không bao giờ xin phép xem lại suy nghĩ", () => {
  const s1 = selStep(after(["lam-ro-cam-xuc"]), x({ emotion: "xấu hổ", event: "bị cả lớp cười", happened_to_me: true, thought: "sẽ bị cười nữa", thought_is_prediction: true }), "none");
  assert.equal(s1.move, "cong-nhan-su-viec");
  const s2 = selStep(s1.state, x({}), "none");
  assert.notEqual(s2.move, "xin-phep-xem-lai");
});

test("nói sợ lần đầu (nhánh C) không phải \"vẫn sợ\": còn đang tìm hiểu, chưa nhảy sang chấp nhận", () => {
  const m = move(after(["lam-ro-cam-xuc"]), { emotion: "sợ", thought: "trả lời sai", still_afraid: true });
  assert.notEqual(m, "chap-nhan");
});

test("nhánh G: vẫn sợ → chấp nhận, lượt sau chốt bước nhỏ", () => {
  const s1 = selStep(after(["hoi-suy-nghi"]), x({ still_afraid: true }), "none");
  assert.equal(s1.move, "chap-nhan");
  assert.equal(selStep(s1.state, x({ still_afraid: true }), "none").move, "chot-buoc-nho");
});

test("nhánh H: từ chối → dừng hỏi, không câu hỏi nào", () => {
  const m = move(after(["lam-ro-cam-xuc"]), { refuses: true });
  assert.equal(m, "dung-hoi");
  assert.equal(maxQuestions(m), 0);
});

test("nhánh I, J: muốn giải pháp → đưa lựa chọn; cách đã từ chối được nhớ và nhắc không đưa lại", () => {
  assert.equal(move(after(["lam-ro-cam-xuc"]), { wants_solution: true }), "dua-lua-chon");
  const s = selStep(after(["dua-lua-chon"]), x({ rejected_option: "tập nói trước gương" }), "none");
  assert.equal(s.move, "dua-lua-chon");
  assert.match(moveInstruction(s.move, s.state), /tập nói trước gương/);
});

test("nhánh K: đã thử mà chưa được → nhìn lại trước, lượt sau mới đưa cách mới", () => {
  const s1 = selStep(after(["chot-buoc-nho"]), x({ tried: "not_worked" }), "none");
  assert.equal(s1.move, "phan-tu");
  assert.equal(selStep(s1.state, x({ tried: "not_worked" }), "none").move, "dua-lua-chon");
});

test("nhánh L, M: muốn nhờ cô → chuẩn bị lời nhờ; đổi chủ đề → theo chuyện mới và bỏ ý cũ", () => {
  assert.equal(move(after(["lam-ro-cam-xuc"]), { wants_adult: true }), "loi-nho");
  const s = selStep(after(["hoi-suy-nghi"], { known: { emotion: "sợ", thought: "bị cười" } }), x({ topic_shift: true, emotion: "lo" }), "none");
  assert.equal(s.move, "theo-chu-de-moi");
  assert.deepEqual(s.state.known, { emotion: "lo" });
});

test("chọn một cách → chốt bước nhỏ; thẻ kỹ năng chỉ được hiện ở bước chọn cách ứng phó trở đi", () => {
  assert.equal(move(after(["dua-lua-chon"]), { chose_option: true }), "chot-buoc-nho");
  for (const m of ["lam-ro-cam-xuc", "hoi-co-the", "hoi-suy-nghi", "xin-phep-xem-lai", "dung-hoi"] as SelMove[]) assert.ok(!SKILL_CARD_MOVES.includes(m), m);
});

test("trạng thái chỉ giữ lời học sinh, cắt ngắn; đọc dữ liệu hỏng thì bắt đầu lại", () => {
  const s = selStep(EMPTY_STATE, x({ emotion: "a".repeat(200) }), "none").state;
  assert.equal(s.known.emotion?.length, 80);
  assert.deepEqual(parseState(null), EMPTY_STATE);
  assert.deepEqual(parseState({ v: 2 }), EMPTY_STATE);
  assert.deepEqual(parseState(JSON.parse(JSON.stringify(s))).known, s.known);
});

test("một câu hỏi mỗi lượt: cắt câu hỏi thừa, giữ dòng thẻ; không cắt nếu còn lại rỗng", () => {
  const two = "Nghe bạn lo lắm. Bạn sợ điều gì nhất? Lúc đó tim bạn có đập nhanh không?\n[GOAL: Thử một bước | Giơ tay một lần]";
  assert.equal(limitQuestions(two, 1), "Nghe bạn lo lắm. Bạn sợ điều gì nhất?\n[GOAL: Thử một bước | Giơ tay một lần]");
  assert.equal(questionCutAt("Nghe bạn lo lắm. Bạn sợ điều gì nhất?", 1), -1);
  assert.equal(limitQuestions("Ừ, mình không hỏi nữa. Bạn muốn dừng không?", 0), "Ừ, mình không hỏi nữa.");
  assert.equal(questionCutAt("Bạn muốn dừng không?", 0), -1);
  // dấu hỏi trong dòng thẻ không tính
  assert.equal(questionCutAt("Bạn muốn thử không?\n[SKILL: Nhận ra mình đang thế nào?]", 1), -1);
});
