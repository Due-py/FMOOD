// Giọng Mây: gọi "bạn", xưng "mình", không gọi "em", không tự xưng "Mây". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PERSONA } from "./ai/prompts";
import { ALREADY_CHECKED_IN, CHECKIN_REPLY, REMIND_CHECKIN, RESTART_LINES } from "./mascot";

const word = (w: string) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu");
const LINES = [...REMIND_CHECKIN, ...ALREADY_CHECKED_IN, ...RESTART_LINES, ...Object.values(CHECKIN_REPLY).flatMap((r) => r.lines)];

test("lời Mây nói không tự xưng Mây và không gọi em", () => {
  for (const line of LINES) {
    assert.ok(!word("mây").test(line), `tự xưng "Mây": ${line}`);
    assert.ok(!word("em").test(line), `gọi "em": ${line}`);
  }
});

test("nhân vật mặc định xưng mình, gọi bạn, không gọi em", () => {
  assert.match(DEFAULT_PERSONA.address, /Xưng "mình"/);
  assert.match(DEFAULT_PERSONA.address, /gọi người dùng là "bạn"/);
  assert.match(DEFAULT_PERSONA.address, /Không bao giờ gọi người dùng là "em"/);
});

// "Chưa rõ" ở check-in (HD01)
import { getEmotion, isNegativeDay, isUnsure, UNSURE } from "./emotions";
import { UNSURE_LINES } from "./mascot";

test("Chưa rõ: là cảm xúc hợp lệ, trung tính, Mây không hỏi dồn", () => {
  assert.equal(getEmotion("chua-ro")?.label, "Chưa rõ");
  assert.equal(UNSURE.group, "neutral");
  assert.equal(isUnsure(["chua-ro"]), true);
  assert.equal(isNegativeDay(["chua-ro"]), false);
  for (const line of UNSURE_LINES) assert.ok(!line.includes("?"), line);
});
