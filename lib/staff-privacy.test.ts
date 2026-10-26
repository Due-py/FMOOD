import assert from "node:assert/strict";
import { test } from "node:test";
import { alertForViewer, canHandleAlerts, hideSmall, MIN_GROUP } from "./staff-privacy";

const alert = {
  id: "a1",
  excerpt: "đoạn tin nhắn của học sinh",
  reasons: ["lý do từ nội dung"],
  note: "ghi chú của tư vấn viên",
  nickname: "Mèo",
  status: "new" as const,
};

test("nhóm dưới 5 bạn thì ẩn", () => {
  assert.equal(MIN_GROUP, 5);
  assert.equal(hideSmall(4), null);
  assert.equal(hideSmall(5), 5);
  assert.equal(hideSmall(0), null);
});

test("giáo viên không nhận được nội dung, lý do hay ghi chú của cảnh báo", () => {
  const seen = alertForViewer(alert, "teacher");
  assert.equal(seen.excerpt, null);
  assert.deepEqual(seen.reasons, []);
  assert.equal(seen.note, null);
  assert.equal(seen.contentHidden, true);
  assert.equal(seen.nickname, "Mèo");
});

test("tư vấn viên và admin đọc được đoạn đáng lo để xử lý", () => {
  for (const role of ["counselor", "admin"] as const) {
    const seen = alertForViewer(alert, role);
    assert.equal(seen.excerpt, alert.excerpt);
    assert.equal(seen.note, alert.note);
    assert.equal(seen.contentHidden, false);
  }
});

test("giáo viên chỉ xem trạng thái, không đổi được cảnh báo (phòng tham vấn xử lý)", () => {
  assert.equal(canHandleAlerts("teacher"), false);
});

test("tư vấn viên và admin xử lý cảnh báo", () => {
  assert.equal(canHandleAlerts("counselor"), true);
  assert.equal(canHandleAlerts("admin"), true);
});
