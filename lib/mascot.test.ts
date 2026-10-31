// Giọng trợ lý: gọi "bạn", xưng "mình", không gọi "em", không tự xưng tên cũ "Mây". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_TALK } from "./ai/prompts";
import { ALREADY_CHECKED_IN, CHECKIN_REPLY, REMIND_CHECKIN, RESTART_LINES } from "./mascot";

const word = (w: string) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu");
const LINES = [...REMIND_CHECKIN, ...ALREADY_CHECKED_IN, ...RESTART_LINES, ...Object.values(CHECKIN_REPLY).flatMap((r) => r.lines)];

test("lời trợ lý nói không tự xưng tên cũ Mây và không gọi em", () => {
  for (const line of LINES) {
    assert.ok(!word("mây").test(line), `tự xưng "Mây": ${line}`);
    assert.ok(!word("em").test(line), `gọi "em": ${line}`);
  }
});

test("cách nói chuyện chung: gọi bạn, không gọi em", () => {
  assert.match(DEFAULT_TALK, /Gọi học sinh là "bạn"/);
  assert.match(DEFAULT_TALK, /không bao giờ gọi là "em"/);
});

// "Chưa rõ" ở check-in (HD01)
import { dominantGroup, getEmotion, isNegative, isUnsure, latestPerDay, UNSURE } from "./emotions";
import { UNSURE_LINES } from "./mascot";

test("Chưa rõ: là cảm xúc hợp lệ, trung tính, trợ lý không hỏi dồn", () => {
  assert.equal(getEmotion("chua-ro")?.label, "Chưa rõ");
  assert.equal(UNSURE.group, "neutral");
  assert.equal(isUnsure(["chua-ro"]), true);
  assert.equal(isNegative(["chua-ro"]), false);
  for (const line of UNSURE_LINES) assert.ok(!line.includes("?"), line);
});

test("một quy tắc nặng lòng: chiếm ít nhất một nửa số cảm xúc đã chọn", () => {
  assert.equal(isNegative(["lo-lang"]), true);
  assert.equal(isNegative(["vui", "lo-lang"]), true);
  assert.equal(isNegative(["lo-lang", "met"]), true);
  assert.equal(isNegative(["vui", "binh-yen", "lo-lang"]), false);
  assert.equal(isNegative(["vui", "met"]), false);
  assert.equal(dominantGroup(["vui", "lo-lang"]), "negative");
  assert.equal(dominantGroup(["vui", "binh-yen", "lo-lang"]), "positive");
  assert.equal(dominantGroup(["met", "binh-thuong"]), "neutral");
});

test("mỗi bạn mỗi ngày lấy lần ghi gần nhất, không cộng dồn", () => {
  const rows = [
    { u: "a", at: "2026-11-04T01:00:00Z", e: ["lo-lang"] },
    { u: "a", at: "2026-11-04T09:00:00Z", e: ["vui"] },
    { u: "a", at: "2026-11-05T02:00:00Z", e: ["buon"] },
    { u: "b", at: "2026-11-04T03:00:00Z", e: ["met"] },
  ];
  const day = (iso: string) => iso.slice(0, 10);
  const got = latestPerDay(rows, (r) => r.u, (r) => r.at, day).map((r) => `${r.u} ${day(r.at)} ${r.e}`).sort();
  assert.deepEqual(got, ["a 2026-11-04 vui", "a 2026-11-05 buon", "b 2026-11-04 met"]);
});

