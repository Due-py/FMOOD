// Bộ điều phối SEL trong trò chuyện: mỗi quy tắc chọn bước (báo cáo 31/10, mục F.3) và chốt "một câu hỏi". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CASEL, EMPTY_EXTRACT, EMPTY_STATE, IN_FLOW_STATE, INVITE_COOLDOWN, maxQuestions, MOVE_SKILL, moveInstruction, parseState, SEL_MOVES, selStep, SKILL_CARD_MOVES, type SelExtract, type SelMove, type SelState } from "./engine";
import { limitQuestions, questionCutAt } from "./questions";

const x = (p: Partial<SelExtract> = {}): SelExtract => ({ ...EMPTY_EXTRACT, ...p });
// các nhánh A–N: học sinh đã đồng ý vào mạch (phần mời vào mạch có test riêng ở cuối)
const after = (moves: SelMove[], p: Partial<SelState> = {}): SelState => ({ ...IN_FLOW_STATE, moves, ...p });
const move = (s: SelState, e: Partial<SelExtract>, risk: "none" | "concern" | "urgent" = "none") => selStep(s, x(e), risk).move;

test("lượt đầu \"xấu hổ, ngại phát biểu\": từ mơ hồ chưa tính là đã biết, gọi tên cảm xúc trước, không hiện thẻ kỹ năng", () => {
  const s = selStep(IN_FLOW_STATE, x({ emotion: "xấu hổ", emotion_vague: true }), "none");
  assert.equal(s.state.known.emotion, undefined);
  const m = s.move;
  assert.equal(m, "lam-ro-cam-xuc");
  assert.ok(!SKILL_CARD_MOVES.includes(m));
});

test("an toàn luôn đứng trước mọi bước SEL", () => {
  for (const st of [EMPTY_STATE, IN_FLOW_STATE, { ...EMPTY_STATE, mode: "da-moi" as const }]) {
    assert.equal(move(st, { wants_solution: true }, "urgent"), "an-toan");
    assert.equal(move(st, { happened_to_me: true }, "concern"), "ho-tro-nguoi-lon");
  }
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

test("nhánh D: dự đoán chưa xảy ra → tóm tắt, rồi xin phép; đồng ý mới tách sự việc và dự đoán; không đồng ý thì chấp nhận", () => {
  const s0 = selStep(after(["lam-ro-cam-xuc"]), x({ emotion: "sợ", thought: "các bạn sẽ cười", thought_is_prediction: true }), "none");
  assert.equal(s0.move, "tom-tat");
  const s1 = selStep(s0.state, x({ confirms: true }), "none");
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

test("câu tự hỏi đặt trong ngoặc kép không tính là câu hỏi cho học sinh (không bị cắt giữa ngoặc)", () => {
  const t = "Chốt bước nhỏ nhé. Lần sau bạn tự hỏi: “Mình đã thử được gì? Cảm xúc trước và sau khác nhau thế nào?” Bước này có vừa sức không?";
  assert.equal(questionCutAt(t, 1), -1);
  const u = 'Bạn tự hỏi "mình sợ gì?" nhé. Bạn muốn thử không? Hay để mai?';
  assert.equal(limitQuestions(u, 1), 'Bạn tự hỏi "mình sợ gì?" nhé. Bạn muốn thử không?');
});

// ── Ba lớp hiểu, nhớ cách đã chọn, nhãn kỹ năng (5 cải tiến, 31/10 khuya) ──
test("đủ hai ý thì tóm tắt và hỏi lại; đúng rồi thì các ý thành đã xác nhận, lời dặn ghi rõ", () => {
  const s1 = selStep(after(["lam-ro-cam-xuc", "hoi-co-the"]), x({ emotion: "lo", thought: "cả lớp sẽ cười" }), "none");
  assert.equal(s1.move, "tom-tat");
  assert.match(moveInstruction("tom-tat", s1.state), /cảm xúc: "lo" \(bạn ấy nói, chưa xác nhận\)/);
  assert.match(moveInstruction("tom-tat", s1.state), /KHÔNG thêm điều bạn ấy chưa nói/);
  const s2 = selStep(s1.state, x({ confirms: true }), "none");
  assert.deepEqual(s2.state.confirmed, { emotion: "lo", thought: "cả lớp sẽ cười" });
  assert.notEqual(s2.move, "tom-tat");
  assert.match(moveInstruction(s2.move, s2.state), /cảm xúc: "lo" \(đã xác nhận\)/);
});

test("tóm tắt chưa đúng: đã sửa luôn thì tóm tắt lại; chưa sửa thì hỏi chỗ nào chưa đúng; tối đa 2 lần tóm tắt", () => {
  const s1 = selStep(after(["lam-ro-cam-xuc"]), x({ emotion: "lo", thought: "cả lớp sẽ cười" }), "none").state;
  assert.equal(selStep(s1, x({ declines: true, emotion: "buồn" }), "none").move, "tom-tat");
  const s2 = selStep(s1, x({ declines: true }), "none");
  assert.equal(s2.move, "hoi-lai");
  const s3 = selStep(s2.state, x({ emotion: "bực" }), "none");
  assert.equal(s3.move, "tom-tat");
  assert.equal(s3.state.known.emotion, "bực");
  assert.notEqual(selStep(s3.state, x({ declines: true }), "none").move, "tom-tat");
});

test("ý mới sau khi đã xác nhận thì chưa được tính là đã xác nhận", () => {
  const s = { ...after(["tom-tat"]), known: { emotion: "lo", thought: "sợ sai" }, confirmed: { emotion: "lo", thought: "sợ sai" } };
  const next = selStep(s, x({ thought: "sợ bị cười" }), "none").state;
  assert.match(moveInstruction("dua-lua-chon", next), /suy nghĩ: "sợ bị cười" \(bạn ấy nói, chưa xác nhận\)/);
});

test("nhớ nguyên văn cách đã chọn, bước đã chốt, việc đã thử; lượt nhìn lại nói đúng việc đó", () => {
  const s1 = selStep(after(["dua-lua-chon"]), x({ chose_option: true, chosen_text: "Viết trước một câu trả lời ngắn" }), "none");
  assert.equal(s1.move, "chot-buoc-nho");
  assert.equal(s1.state.choice, "Viết trước một câu trả lời ngắn");
  const s2 = selStep(s1.state, x({ confirms: true, agreed_step: "Tối nay viết 1 câu trả lời cho bài Sử" }), "none");
  assert.equal(s2.state.step, "Tối nay viết 1 câu trả lời cho bài Sử");
  const s3 = selStep(s2.state, x({ tried: "not_worked" }), "none");
  assert.equal(s3.move, "phan-tu");
  assert.deepEqual(s3.state.tried, [{ what: "Tối nay viết 1 câu trả lời cho bài Sử", result: "not_worked" }]);
  const line = moveInstruction("phan-tu", s3.state);
  assert.match(line, /Cách bạn ấy đã chọn: "Viết trước một câu trả lời ngắn"/);
  assert.match(line, /Việc bạn ấy đã thử: "Tối nay viết 1 câu trả lời cho bài Sử" \(chưa được\)/);
  // kể rõ việc đã thử thì lấy lời học sinh
  const s4 = selStep(s3.state, x({ tried: "worked", tried_text: "thở chậm trước khi giơ tay" }), "none");
  assert.deepEqual(s4.state.tried.at(-1), { what: "thở chậm trước khi giơ tay", result: "worked" });
  // lưu rồi đọc lại vẫn còn
  const back = parseState(JSON.parse(JSON.stringify(s4.state)));
  assert.equal(back.choice, s4.state.choice);
  assert.deepEqual(back.tried, s4.state.tried);
});

test("trả lời lời mời bằng \"ừ, gỡ từng bước\" không bị hiểu là xin cách làm ngay", () => {
  const invited = selStep(EMPTY_STATE, x({ difficulty: true, emotion: "lo", event: "mai thuyết trình" }), "none").state;
  assert.equal(selStep(invited, x({ confirms: true, wants_solution: true }), "none").move, "hoi-co-the");
  // xin cách làm thật (không chỉ nói có) vẫn được đưa lựa chọn
  assert.equal(selStep(invited, x({ wants_solution: true }), "none").move, "dua-lua-chon");
});

test("mỗi bước đều có nhãn; bước luyện kỹ năng có năng lực CASEL và mã K", () => {
  for (const m of SEL_MOVES) {
    const tag = MOVE_SKILL[m];
    assert.ok(tag, m);
    assert.equal(tag.casel.length > 0, tag.skill !== null, m);
    for (const c of tag.casel) assert.ok(CASEL.includes(c), m);
  }
  assert.deepEqual(MOVE_SKILL["hoi-co-the"], { casel: ["tu-nhan-thuc"], skill: "K1" });
  assert.ok(MOVE_SKILL["dua-lua-chon"].casel.includes("ra-quyet-dinh"));
});

// ── Mời vào mạch (cách C, 31/10 tối) ──
test("trò chuyện thường: chào hỏi, chuyện vui không bị dẫn theo các bước", () => {
  assert.equal(move(EMPTY_STATE, {}), "mo");
  assert.equal(move(EMPTY_STATE, { emotion: "vui" }), "mo");
});

test("kể chuyện khó → mời trước (chưa hỏi cảm xúc); đồng ý thì vào mạch, ý đã kể vẫn được giữ", () => {
  const s1 = selStep(EMPTY_STATE, x({ difficulty: true, emotion: "xấu hổ", emotion_vague: true }), "none");
  assert.equal(s1.move, "moi-vao");
  assert.equal(s1.state.mode, "da-moi");
  assert.match(moveInstruction("moi-vao", s1.state), /gỡ chuyện này từng bước/);
  const s2 = selStep(s1.state, x({ confirms: true }), "none");
  assert.equal(s2.move, "lam-ro-cam-xuc");
  assert.equal(s2.state.mode, "trong-mach");
  assert.equal(s2.state.agreed, true);
});

test("trả lời lời mời là chọn cách trò chuyện, không phải chọn cách ứng phó: không nhảy tới chốt bước", () => {
  const invited = selStep(EMPTY_STATE, x({ difficulty: true, emotion: "lo", event: "mai thuyết trình" }), "none").state;
  const yes = selStep(invited, x({ confirms: true, chose_option: true }), "none");
  assert.equal(yes.move, "hoi-co-the");
  assert.equal(yes.state.chosen, false);
  const no = selStep(invited, x({ declines: true, chose_option: true }), "none");
  assert.equal(no.move, "lang-nghe");
  assert.equal(no.state.chosen, false);
});

test("không nhận lời (hoặc kể tiếp mà không nói có) → chỉ lắng nghe, không mời lại ngay", () => {
  const invited = selStep(EMPTY_STATE, x({ difficulty: true }), "none").state;
  for (const e of [{ declines: true }, { refuses: true }, { difficulty: true, emotion: "buồn" }]) {
    const s = selStep(invited, x(e), "none");
    assert.equal(s.move, "lang-nghe");
    assert.equal(s.state.mode, "tro-chuyen");
    assert.equal(maxQuestions(s.move), 1);
  }
  let st = selStep(invited, x({ declines: true }), "none").state;
  for (let i = 1; i < INVITE_COOLDOWN; i++) {
    const s = selStep(st, x({ difficulty: true }), "none");
    assert.equal(s.move, "mo", `lượt ${i} sau khi từ chối`);
    st = s.state;
  }
  assert.equal(selStep(st, x({ difficulty: true }), "none").move, "moi-vao");
});

test("tự xin cách làm, muốn nhờ người lớn, kể đã thử: vào thẳng, không cần mời", () => {
  assert.equal(move(EMPTY_STATE, { difficulty: true, wants_solution: true }), "dua-lua-chon");
  assert.equal(move(EMPTY_STATE, { wants_adult: true }), "loi-nho");
  assert.equal(move(EMPTY_STATE, { tried: "not_worked" }), "phan-tu");
  const invited = selStep(EMPTY_STATE, x({ difficulty: true }), "none").state;
  assert.equal(move(invited, { wants_solution: true }), "dua-lua-chon");
});

test("đã đồng ý một lần: chuyện khó sau vào thẳng; đổi sang chuyện không khó thì về trò chuyện thường", () => {
  const done = { ...IN_FLOW_STATE, moves: ["chot-buoc-nho"] as SelMove[], known: { emotion: "sợ" } };
  const s1 = selStep(done, x({ topic_shift: true, emotion: "vui" }), "none");
  assert.equal(s1.move, "theo-chu-de-moi");
  assert.equal(s1.state.mode, "tro-chuyen");
  assert.deepEqual(s1.state.known, { emotion: "vui" });
  assert.equal(move(s1.state, {}), "mo");
  const s2 = selStep(s1.state, x({ difficulty: true, emotion: "lo" }), "none");
  assert.notEqual(s2.move, "moi-vao");
  assert.equal(s2.state.mode, "trong-mach");
});

test("trạng thái lưu trước khi có lời mời: đang ở giữa các bước thì coi như đã đồng ý", () => {
  const old = { v: 1, known: { emotion: "sợ" }, prediction: false, happened: false, consent: null, rejected: [], chosen: false, moves: ["lam-ro-cam-xuc"] };
  const p = parseState(old);
  assert.equal(p.mode, "trong-mach");
  assert.equal(p.agreed, true);
  assert.equal(parseState({ ...old, moves: ["mo"] }).mode, "tro-chuyen");
});
