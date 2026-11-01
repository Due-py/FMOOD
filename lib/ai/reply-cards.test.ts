// Bộ tách thẻ gợi ý (Bước 10.3): ví dụ ĐÚNG / SAI trong lời dặn phần 6. Chạy: npm test
// Thẻ [SKILL] bỏ từ 01/11 (thẻ chọn kỹ năng do máy chủ gắn): chỉ còn đọc ở tin nhắn cũ đã lưu; máy chủ bỏ dòng mới.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CARDS } from "./prompts";
import { parseReplyCards, splitBubbles, stripCardLines, stripSkillCardLines, visibleReply } from "./reply-cards";

const BODY = "Nghe có vẻ tuần này bạn có nhiều bài quá.\n\nBạn muốn thử chia nhỏ từng việc không?";

test("ví dụ ĐÚNG: thẻ ở cuối được tách ra, câu văn không còn ngoặc vuông; thẻ [SKILL] tin nhắn cũ vẫn đọc được", () => {
  const reply = `${BODY}

[GOAL: Ôn 15 phút mỗi tối | Mỗi tối ôn một phần nhỏ môn Toán trong 15 phút trước khi đi ngủ.]
[SKILL: Gỡ rối từng bước]
[END: Hôm nay bạn đã kể được nhiều rồi, nghỉ ngơi thật tốt nhé!]`;
  const { text, cards } = parseReplyCards(reply);
  assert.equal(text, BODY);
  assert.deepEqual(cards.goal, { title: "Ôn 15 phút mỗi tối", description: "Mỗi tối ôn một phần nhỏ môn Toán trong 15 phút trước khi đi ngủ." });
  assert.deepEqual(cards.skill, { name: "Gỡ rối và lên kế hoạch từng bước", id: "plan_step_by_step" });
  assert.deepEqual(cards.end, { text: "Hôm nay bạn đã kể được nhiều rồi, nghỉ ngơi thật tốt nhé!" });
});

test("ví dụ SAI trong lời dặn: bỏ dòng, không hiện thẻ, học sinh không thấy chữ trong ngoặc", () => {
  const bad = [
    "**[SKILL: Gỡ rối từng bước]**", // có dấu *
    "[SKILL: Gỡ rối từng bước cho đỡ áp lực]", // thêm chữ sau tên kỹ năng
    "[SKILL: Quản lý thời gian]", // tên trợ lý chưa từng dùng
    "[SKILL: Nhìn chuyện từ phía người khác]", // tên kỹ năng thành phần, không phải tên thẻ cũ
    "[GOAL: Ôn bài mỗi tối]", // thiếu mô tả
  ];
  for (const line of bad) {
    const { text, cards } = parseReplyCards(`${BODY}\n\n${line}`);
    assert.deepEqual(cards, {}, line);
    assert.equal(text, BODY, line);
  }
  // các ví dụ SAI chép trong lời dặn mặc định đều đúng là SAI với bộ tách
  const sai = DEFAULT_CARDS.split("Ví dụ SAI")[1].split("\n").slice(1).map((l) => l.replace(/\s*\([^)]*\)\s*$/, ""));
  assert.equal(sai.length, 3);
  for (const line of sai) assert.deepEqual(parseReplyCards(`${BODY}\n\n${line}`).cards, {}, line);
  // còn ví dụ ĐÚNG thì đều thành thẻ
  const dung = DEFAULT_CARDS.split("Ví dụ ĐÚNG:\n")[1].split("\nVí dụ SAI")[0];
  const ok = parseReplyCards(`${BODY}\n\n${dung}`).cards;
  assert.ok(ok.goal && ok.end);
  // lời dặn mặc định không còn dặn viết thẻ [SKILL]
  assert.ok(!DEFAULT_CARDS.includes("[SKILL"));
});

test("quá một dòng mỗi loại: bỏ cả loại đó, loại khác vẫn giữ", () => {
  const { text, cards } = parseReplyCards(`${BODY}\n[SKILL: Gỡ rối từng bước]\n[SKILL: Nhận ra mình đang thế nào]\n[END: Nghỉ ngơi nhé!]`);
  assert.equal(cards.skill, undefined);
  assert.deepEqual(cards.end, { text: "Nghỉ ngơi nhé!" });
  assert.equal(text, BODY);
});

test("dòng thẻ không ở cuối: bị bỏ khỏi câu văn nhưng không thành thẻ", () => {
  const { text, cards } = parseReplyCards(`Câu đầu.\n[SKILL: Gỡ rối từng bước]\nCâu sau vẫn là trò chuyện.`);
  assert.deepEqual(cards, {});
  assert.equal(text, "Câu đầu.\nCâu sau vẫn là trò chuyện.");
});

test("kiểm tra độ dài và định dạng: tên mục tiêu > 40, mô tả > 120, END nhiều câu, gạch đầu dòng, chữ thường", () => {
  const long = "x".repeat(41);
  for (const line of [
    `[GOAL: ${long} | Mô tả ngắn.]`,
    `[GOAL: Ngắn | ${"y".repeat(121)}]`,
    "[GOAL: A | B | C]",
    "[END: Nghỉ nhé. Mai nói tiếp nha!]",
    "- [END: Nghỉ ngơi nhé!]",
    "[end: Nghỉ ngơi nhé!]",
    "[SKILL: Gỡ rối từng bước ]x",
  ]) {
    const { text, cards } = parseReplyCards(`${BODY}\n${line}`);
    assert.deepEqual(cards, {}, line);
    assert.equal(text, BODY, line);
  }
});

test("không có thẻ thì giữ nguyên câu trả lời", () => {
  assert.deepEqual(parseReplyCards(BODY), { text: BODY, cards: {} });
  assert.equal(stripCardLines("Bạn [thử] cách này nhé."), "Bạn [thử] cách này nhé.");
});

test("trong lúc AI đang viết: ẩn dòng thẻ đang viết dở", () => {
  assert.equal(visibleReply(`${BODY}\n\n[SKI`, true), BODY);
  assert.equal(visibleReply(`${BODY}\n\n[SKILL: Gỡ rối từng bước]`, false), BODY);
  assert.equal(visibleReply("Bạn muốn thử", true), "Bạn muốn thử");
});

test("chia bong bóng theo dòng trống, không vượt số tin tối đa", () => {
  const six = ["Một.", "Hai.", "Ba.", "Bốn.", "Năm.", "Sáu."].join("\n\n");
  assert.deepEqual(splitBubbles(six, 6), ["Một.", "Hai.", "Ba.", "Bốn.", "Năm.", "Sáu."]);
  assert.deepEqual(splitBubbles(six, 3), ["Một.", "Hai.", "Ba.\n\nBốn.\n\nNăm.\n\nSáu."]);
  assert.deepEqual(splitBubbles("Chỉ một đoạn.\nXuống dòng thường.", 3), ["Chỉ một đoạn.\nXuống dòng thường."]);
});

test("tên thẻ cũ trong tin nhắn đã lưu: vẫn mở đúng bài, hiện bằng tên kỹ năng thành phần", () => {
  assert.deepEqual(parseReplyCards(`${BODY}\n[SKILL: Sắp xếp việc khi có nhiều bài]`).cards.skill, { name: "Gỡ rối và lên kế hoạch từng bước", id: "plan_step_by_step" });
  assert.deepEqual(parseReplyCards(`${BODY}\n[SKILL: Nhờ thầy cô khi chưa hiểu bài]`).cards.skill, { name: "Mở lời nhờ người giúp", id: "ask_for_help" });
  assert.equal(parseReplyCards(`${BODY}\n[SKILL: Nhận ra mình đang thế nào]`).cards.skill?.id, "recognize_feelings_thoughts");
  assert.equal(parseReplyCards(`${BODY}\n[SKILL: Làm dịu cảm xúc]`).cards.skill?.id, "calm_in_the_moment");
});

test("máy chủ bỏ dòng [SKILL] trợ lý lỡ viết trước khi lưu; dòng GOAL / END và câu văn giữ nguyên", () => {
  const cleaned = stripSkillCardLines(`${BODY}\n\n[SKILL: Gỡ rối từng bước]\n[END: Nghỉ ngơi nhé!]`);
  assert.equal(cleaned, `${BODY}\n\n[END: Nghỉ ngơi nhé!]`);
  assert.equal(parseReplyCards(cleaned).cards.skill, undefined);
  assert.deepEqual(parseReplyCards(cleaned).cards.end, { text: "Nghỉ ngơi nhé!" });
  assert.equal(stripSkillCardLines(`${BODY}\n**[skill: Gỡ rối từng bước]**`), BODY);
  // không có dòng [SKILL]: trả lại đúng chuỗi cũ
  assert.equal(stripSkillCardLines(BODY), BODY);
});
