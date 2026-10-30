import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canHandleHelpRequest,
  composeNote,
  helpInboxScope,
  helpProgress,
  helpRequestSchema,
  partsOf,
  replySchema,
  replyTemplates,
} from "./help-requests-shared";

test("giáo viên chỉ nhận lời nhờ gửi GVCN của lớp mình", () => {
  assert.deepEqual(helpInboxScope("teacher", ["c1"]), { toRole: "teacher", classIds: ["c1"] });
  assert.equal(canHandleHelpRequest("teacher", ["c1"], { to_role: "teacher", class_id: "c1" }), true);
  assert.equal(canHandleHelpRequest("teacher", ["c1"], { to_role: "teacher", class_id: "c2" }), false);
  assert.equal(canHandleHelpRequest("teacher", ["c1"], { to_role: "counselor", class_id: "c1" }), false);
});

test("giáo viên chưa có lớp thì không thấy lời nhờ nào", () => {
  assert.equal(helpInboxScope("teacher", []), null);
  assert.equal(canHandleHelpRequest("teacher", [], { to_role: "teacher", class_id: null }), false);
});

test("phòng tham vấn và admin nhận lời nhờ gửi phòng tham vấn, không đọc lời nhờ gửi riêng GVCN", () => {
  for (const role of ["counselor", "admin"] as const) {
    assert.deepEqual(helpInboxScope(role, null), { toRole: "counselor", classIds: null });
    assert.equal(canHandleHelpRequest(role, null, { to_role: "counselor", class_id: "c9" }), true);
    assert.equal(canHandleHelpRequest(role, null, { to_role: "teacher", class_id: "c9" }), false);
  }
});

test("lời nhờ 3 ý: phải có chỗ khó và điều muốn được giúp; đã thử thì không bắt buộc; mỗi ý tối đa 200 ký tự", () => {
  const base = { toRole: "teacher", when: "any", difficulty: "  em chưa hiểu câu 3  ", tried: "", want: "cô giảng lại giúp em" };
  const ok = helpRequestSchema.parse(base);
  assert.equal(ok.difficulty, "em chưa hiểu câu 3");
  assert.equal(ok.tried, null);
  assert.equal(ok.withBuddy, false);
  assert.equal(helpRequestSchema.parse({ ...base, withBuddy: true }).withBuddy, true);
  assert.equal(helpRequestSchema.safeParse({ ...base, difficulty: "" }).success, false);
  assert.equal(helpRequestSchema.safeParse({ ...base, want: " " }).success, false);
  assert.equal(helpRequestSchema.safeParse({ ...base, tried: "a".repeat(201) }).success, false);
  assert.equal(helpRequestSchema.safeParse({ ...base, toRole: "admin" }).success, false);
});

test("ghép 3 ý thành lời nhắn một ô (bản cũ) không quá 300 ký tự; lời nhờ cũ vẫn hiện được", () => {
  assert.equal(composeNote({ difficulty: "khó", tried: null, want: "giúp" }), "Em đang khó: khó\nEm muốn thầy cô giúp: giúp");
  assert.ok((composeNote({ difficulty: "a".repeat(200), tried: "b".repeat(200), want: "c".repeat(200) }) ?? "").length <= 300);
  assert.deepEqual(partsOf({ difficulty: null, tried: null, want: null, note: "lời cũ" }), [{ label: "Lời nhắn", text: "lời cũ" }]);
  assert.equal(partsOf({ difficulty: "khó", tried: null, want: "giúp", note: null }).length, 2);
});

test("trạng thái lời nhờ chỉ hiện khi sự kiện đã xảy ra thật: gửi ≠ đã xem ≠ đã trả lời", () => {
  const sent = helpProgress({ created_at: "2026-10-30T01:00:00Z", seen_at: null, replied_at: null, reply: null });
  assert.deepEqual(sent.map((p) => Boolean(p.at)), [true, false, false]);
  const seen = helpProgress({ created_at: "2026-10-30T01:00:00Z", seen_at: "2026-10-30T02:00:00Z", replied_at: null, reply: null });
  assert.deepEqual(seen.map((p) => Boolean(p.at)), [true, true, false]);
  // trả lời mà chưa ghi lúc xem (bản cũ): coi như đã xem
  const replied = helpProgress({ created_at: "2026-10-30T01:00:00Z", seen_at: null, replied_at: "2026-10-30T03:00:00Z", reply: "Cô gặp em nhé" });
  assert.deepEqual(replied.map((p) => Boolean(p.at)), [true, true, true]);
});

test("câu mẫu trả lời có sẵn, gọi học sinh là 'em', và lời đáp tối đa 300 ký tự", () => {
  const t = replyTemplates("counselor", "break");
  assert.ok(t.length >= 3);
  assert.ok(t.every((s) => s.length <= 300 && /\bem\b/i.test(s)));
  assert.ok(t[0].includes("giờ ra chơi"));
  assert.equal(replySchema.safeParse("  ").success, false);
  assert.equal(replySchema.safeParse("a".repeat(301)).success, false);
});
