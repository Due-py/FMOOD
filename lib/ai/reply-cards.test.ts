// Bộ tách thẻ gợi ý (Bước 10.3): ví dụ ĐÚNG / SAI trong lời dặn phần 6. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CARDS } from "./prompts";
import { parseReplyCards, splitBubbles, stripCardLines, visibleReply } from "./reply-cards";

const SKILLS = ["Nhận ra mình đang thế nào", "Bình tĩnh lại trước khi làm bài", "Sắp xếp việc khi có nhiều bài", "Nhờ thầy cô khi chưa hiểu bài"];
const BODY = "Nghe có vẻ tuần này bạn có nhiều bài quá.\n\nBạn muốn thử chia nhỏ từng việc không?";

test("ví dụ ĐÚNG: ba loại thẻ ở cuối được tách ra, câu văn không còn ngoặc vuông", () => {
  const reply = `${BODY}

[GOAL: Ôn 15 phút mỗi tối | Mỗi tối ôn một phần nhỏ môn Toán trong 15 phút trước khi đi ngủ.]
[SKILL: Sắp xếp việc khi có nhiều bài]
[END: Hôm nay bạn đã kể được nhiều rồi, nghỉ ngơi thật tốt nhé!]`;
  const { text, cards } = parseReplyCards(reply, SKILLS);
  assert.equal(text, BODY);
  assert.deepEqual(cards.goal, { title: "Ôn 15 phút mỗi tối", description: "Mỗi tối ôn một phần nhỏ môn Toán trong 15 phút trước khi đi ngủ." });
  assert.deepEqual(cards.skill, { name: "Sắp xếp việc khi có nhiều bài", code: "K3" });
  assert.deepEqual(cards.end, { text: "Hôm nay bạn đã kể được nhiều rồi, nghỉ ngơi thật tốt nhé!" });
});

test("ví dụ SAI trong lời dặn: bỏ dòng, không hiện thẻ, học sinh không thấy chữ trong ngoặc", () => {
  const bad = [
    "**[SKILL: Sắp xếp việc khi có nhiều bài]**", // có dấu *
    "[SKILL: Sắp xếp việc khi có nhiều bài để đỡ áp lực]", // thêm chữ sau tên kỹ năng
    "[SKILL: Quản lý thời gian]", // tên không có trong danh sách
    "[GOAL: Ôn bài mỗi tối]", // thiếu mô tả
  ];
  for (const line of bad) {
    const { text, cards } = parseReplyCards(`${BODY}\n\n${line}`, SKILLS);
    assert.deepEqual(cards, {}, line);
    assert.equal(text, BODY, line);
  }
  // các ví dụ SAI chép trong lời dặn mặc định đều đúng là SAI với bộ tách
  const sai = DEFAULT_CARDS.split("Ví dụ SAI")[1].split("\n").slice(1).map((l) => l.replace(/\s*\([^)]*\)\s*$/, ""));
  assert.equal(sai.length, 4);
  for (const line of sai) assert.deepEqual(parseReplyCards(`${BODY}\n\n${line}`, SKILLS).cards, {}, line);
  // còn ví dụ ĐÚNG thì đều thành thẻ
  const dung = DEFAULT_CARDS.split("Ví dụ ĐÚNG:\n")[1].split("\nVí dụ SAI")[0];
  const ok = parseReplyCards(`${BODY}\n\n${dung}`, SKILLS).cards;
  assert.ok(ok.goal && ok.skill && ok.end);
});

test("quá một dòng mỗi loại: bỏ cả loại đó, loại khác vẫn giữ", () => {
  const { text, cards } = parseReplyCards(
    `${BODY}\n[SKILL: Sắp xếp việc khi có nhiều bài]\n[SKILL: Nhận ra mình đang thế nào]\n[END: Nghỉ ngơi nhé!]`,
    SKILLS,
  );
  assert.equal(cards.skill, undefined);
  assert.deepEqual(cards.end, { text: "Nghỉ ngơi nhé!" });
  assert.equal(text, BODY);
});

test("dòng thẻ không ở cuối: bị bỏ khỏi câu văn nhưng không thành thẻ", () => {
  const { text, cards } = parseReplyCards(`Câu đầu.\n[SKILL: Sắp xếp việc khi có nhiều bài]\nCâu sau vẫn là trò chuyện.`, SKILLS);
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
    "[SKILL: Sắp xếp việc khi có nhiều bài ]x",
  ]) {
    const { text, cards } = parseReplyCards(`${BODY}\n${line}`, SKILLS);
    assert.deepEqual(cards, {}, line);
    assert.equal(text, BODY, line);
  }
  // tên kỹ năng có trong mã nhưng không nằm trong danh sách đang bật thì cũng bỏ
  assert.deepEqual(parseReplyCards(`${BODY}\n[SKILL: Sắp xếp việc khi có nhiều bài]`, ["Nhận ra mình đang thế nào"]).cards, {});
});

test("không có thẻ thì giữ nguyên câu trả lời", () => {
  assert.deepEqual(parseReplyCards(BODY, SKILLS), { text: BODY, cards: {} });
  assert.equal(stripCardLines("Bạn [thử] cách này nhé."), "Bạn [thử] cách này nhé.");
});

test("trong lúc AI đang viết: ẩn dòng thẻ đang viết dở", () => {
  assert.equal(visibleReply(`${BODY}\n\n[SKI`, true), BODY);
  assert.equal(visibleReply(`${BODY}\n\n[SKILL: Sắp xếp việc khi có nhiều bài]`, false), BODY);
  assert.equal(visibleReply("Bạn muốn thử", true), "Bạn muốn thử");
});

test("chia bong bóng theo dòng trống, không vượt số tin tối đa", () => {
  const six = ["Một.", "Hai.", "Ba.", "Bốn.", "Năm.", "Sáu."].join("\n\n");
  assert.deepEqual(splitBubbles(six, 6), ["Một.", "Hai.", "Ba.", "Bốn.", "Năm.", "Sáu."]);
  assert.deepEqual(splitBubbles(six, 3), ["Một.", "Hai.", "Ba.\n\nBốn.\n\nNăm.\n\nSáu."]);
  assert.deepEqual(splitBubbles("Chỉ một đoạn.\nXuống dòng thường.", 3), ["Chỉ một đoạn.\nXuống dòng thường."]);
});
