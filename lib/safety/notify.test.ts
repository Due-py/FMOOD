// Email báo thầy cô không được chứa nội dung tin nhắn. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import type { AlertInput } from "./alerts";
import { buildAlertEmail, shouldEmail } from "./notify-email";

const SECRET = "NOI-DUNG-RIENG-TU-CUA-HOC-SINH";

const alert: AlertInput = {
  profile: {
    id: "00000000-0000-0000-0000-000000000000",
    nickname: "Mèo Mướp",
    full_name: "Họ Tên Thật",
    email: null,
    class_id: null,
    role: "student",
    onboarded_at: null,
    locked_at: null,
    avatar: null,
    must_change_password: false,
  },
  type: "chat_risk",
  severity: "urgent",
  excerpt: SECRET,
  reasons: [`AI: ${SECRET}`],
};

test("email không chứa nội dung tin nhắn, lý do AI hay họ tên thật", () => {
  const { subject, text } = buildAlertEmail(alert, { className: "8A1", appUrl: "https://vi-du.vn", at: new Date() });
  for (const part of [subject, text]) {
    assert.ok(!part.includes(SECRET));
    assert.ok(!part.includes("Họ Tên Thật"));
  }
  assert.match(subject, /KHẨN/);
  assert.match(text, /https:\/\/vi-du\.vn\/staff\/alerts/);
});

test("chỉ gửi email khi khẩn hoặc học sinh tự nhờ giúp", () => {
  assert.equal(shouldEmail({ severity: "urgent", type: "chat_risk" }), true);
  assert.equal(shouldEmail({ severity: "watch", type: "help_request" }), true);
  assert.equal(shouldEmail({ severity: "watch", type: "chat_risk" }), false);
});

test("Trợ lý hỏi thăm mà học sinh thấy nặng hơn, lo rất nhiều: gửi email, không kèm chuyện học sinh kể", () => {
  const worse: AlertInput = { ...alert, type: "worry_worse", severity: "watch" };
  assert.equal(shouldEmail(worse), true);
  const { subject, text } = buildAlertEmail(worse, { className: "8A1", appUrl: null, at: new Date() });
  for (const part of [subject, text]) assert.ok(!part.includes(SECRET));
  assert.match(subject, /Cần để ý/);
  assert.match(text, /Trợ lý hỏi thăm/);
});
