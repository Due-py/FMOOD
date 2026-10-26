import assert from "node:assert/strict";
import { test } from "node:test";
import { canHandleHelpRequest, helpInboxScope, helpRequestSchema, replySchema, replyTemplates } from "./help-requests-shared";

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

test("học sinh không bắt buộc viết lời nhắn; lời nhắn dài quá 300 ký tự bị chặn", () => {
  assert.equal(helpRequestSchema.safeParse({ toRole: "counselor", when: "break", note: "" }).success, true);
  const ok = helpRequestSchema.parse({ toRole: "teacher", when: "any", note: "  em muốn hỏi cô  " });
  assert.equal(ok.note, "em muốn hỏi cô");
  assert.equal(helpRequestSchema.safeParse({ toRole: "teacher", when: "any", note: "a".repeat(301) }).success, false);
  assert.equal(helpRequestSchema.safeParse({ toRole: "admin", when: "any", note: "" }).success, false);
});

test("câu mẫu trả lời có sẵn, gọi học sinh là 'em', và lời đáp tối đa 300 ký tự", () => {
  const t = replyTemplates("counselor", "break");
  assert.ok(t.length >= 3);
  assert.ok(t.every((s) => s.length <= 300 && /\bem\b/i.test(s)));
  assert.ok(t[0].includes("giờ ra chơi"));
  assert.equal(replySchema.safeParse("  ").success, false);
  assert.equal(replySchema.safeParse("a".repeat(301)).success, false);
});
