// Cảm xúc vừa check-in đi vào trò chuyện. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkinContext, freshCheckin } from "./checkin-context";
import { EMPTY_EXTRACT, EMPTY_STATE, selStep } from "./sel/engine";

test("cảm xúc vừa chọn thành lời dặn và thành cảm xúc bạn ấy đã nói", () => {
  const c = checkinContext(["lo-lang", "met"]);
  assert.match(c.line, /vừa tự chọn khi ghi tâm trạng: Lo lắng, Mệt/);
  assert.match(c.line, /Không hỏi lại/);
  assert.equal(c.emotion, "lo lắng, mệt");
});

test("Chưa rõ: không gán cảm xúc, dặn không hỏi dồn", () => {
  const c = checkinContext(["chua-ro"]);
  assert.equal(c.emotion, null);
  assert.match(c.line, /Chưa rõ/);
  assert.match(c.line, /Không hỏi dồn/);
  assert.deepEqual(checkinContext([]), { line: "", emotion: null });
});

test("bộ điều phối không hỏi lại tên cảm xúc khi đã có cảm xúc từ check-in", () => {
  const seeded = { ...EMPTY_STATE, mode: "trong-mach" as const, agreed: true, known: { emotion: "lo lắng, mệt" } };
  const s = selStep(seeded, { ...EMPTY_EXTRACT, event: "mai kiểm tra" }, "none");
  assert.notEqual(s.move, "lam-ro-cam-xuc");
  assert.equal(s.move, "hoi-co-the");
});

test("chỉ dùng lần check-in trong 2 giờ gần nhất", () => {
  const now = new Date("2026-11-04T10:00:00Z");
  assert.equal(freshCheckin("2026-11-04T09:30:00Z", now), true);
  assert.equal(freshCheckin("2026-11-04T07:30:00Z", now), false);
  assert.equal(freshCheckin("2026-11-04T10:05:00Z", now), false);
});
