// Nhắc nghỉ sau 20 phút trò chuyện trong ngày (mục 4.4). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { chatMinutes, needsRest, REST_AFTER_MINUTES, restLine, restStatus } from "./chat-rest";

const at = (min: number) => new Date(Date.UTC(2026, 10, 5, 2, 0) + min * 60_000).toISOString();

test("cộng khoảng cách giữa các tin, mỗi khoảng tối đa 5 phút; thứ tự tin không quan trọng", () => {
  assert.equal(chatMinutes([]), 0);
  assert.equal(chatMinutes([at(0)]), 0);
  assert.equal(chatMinutes([at(3), at(0), at(1)]), 3);
  // rời đi 2 tiếng rồi quay lại: khoảng đó chỉ tính 5 phút
  assert.equal(chatMinutes([at(0), at(2), at(122), at(124)]), 2 + 5 + 2);
  assert.equal(chatMinutes([at(0), "không phải ngày"]), 0);
});

test("quá 20 phút thì nhắc nghỉ; lời nhắc nói nút Cần giúp vẫn mở", () => {
  const steady = Array.from({ length: 21 }, (_, i) => at(i));
  assert.equal(chatMinutes(steady), 20);
  assert.ok(needsRest(chatMinutes(steady)));
  assert.ok(!needsRest(REST_AFTER_MINUTES - 1));
  const line = restLine("Sóc", 22);
  assert.match(line, /Sóc/);
  assert.match(line, /22 phút/);
  assert.match(line, /Cần giúp/);
  assert.doesNotMatch(line, /Mây/);
});

test("chỉ tin làm vượt mốc 20 phút mới được đếm là 'vừa nhắc'; các tin sau vẫn nhắc nhưng không đếm lại", () => {
  const upTo = (n: number) => Array.from({ length: n + 1 }, (_, i) => at(i));
  assert.deepEqual(restStatus(upTo(19)), { minutes: 19, remind: false, crossed: false });
  assert.deepEqual(restStatus(upTo(20)), { minutes: 20, remind: true, crossed: true });
  assert.deepEqual(restStatus(upTo(21)), { minutes: 21, remind: true, crossed: false });
});
