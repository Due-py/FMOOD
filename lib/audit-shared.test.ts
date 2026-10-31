// Nhật ký hoạt động: loại thao tác, mã học sinh, CSV. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { AUDIT_KINDS, auditKindOf, classTag, inferAuditKind, STUDENT_CODE_RE, studentCodes, toCsv } from "./audit-shared";

test("dòng nhật ký cũ (chưa có loại) được đoán đúng loại", () => {
  assert.equal(inferAuditKind("Sửa"), "setting");
  assert.equal(inferAuditKind("Dùng lại bản trước"), "setting");
  assert.equal(inferAuditKind("Duyệt bài thư viện"), "content");
  assert.equal(inferAuditKind("Vòng hỗ trợ: đổi trạng thái"), "content");
  assert.equal(inferAuditKind("Đặt mật khẩu tạm cho học sinh"), "account");
  assert.equal(inferAuditKind("Đánh dấu lớp thử"), "account");
  assert.equal(inferAuditKind("Bật chế độ trình diễn"), "demo");
  assert.equal(inferAuditKind("Nhận cảnh báo"), "alert_handle");
  assert.equal(inferAuditKind("Trả lời lời nhờ giúp"), "help_reply");
  assert.equal(inferAuditKind("Một việc lạ"), "other");
});

test("cột kind có giá trị hợp lệ thì dùng luôn, không đoán", () => {
  assert.equal(auditKindOf({ kind: "export", action: "Sửa" }), "export");
  assert.equal(auditKindOf({ kind: "khong-co", action: "Sửa" }), "setting");
  assert.equal(auditKindOf({ kind: null, action: "Sửa" }), "setting");
  for (const [k, label] of Object.entries(AUDIT_KINDS)) assert.ok(label.length > 2, k);
});

test("tên lớp thành phần mã: bỏ dấu, viết liền, chữ hoa", () => {
  assert.equal(classTag("8A1"), "8A1");
  assert.equal(classTag("Lớp 8a 4"), "LOP8A4");
  assert.equal(classTag("Đội thử"), "DOITHU");
  assert.equal(classTag(null), "LOP");
});

test("mã học sinh cố định theo thứ tự vào lớp; bạn mới không làm đổi mã bạn cũ", () => {
  const classes = [
    { id: "c1", name: "8A1" },
    { id: "c2", name: "8A4" },
  ];
  const students = [
    { id: "s3", class_id: "c1", created_at: "2026-10-03T00:00:00Z" },
    { id: "s1", class_id: "c1", created_at: "2026-10-01T00:00:00Z" },
    { id: "s2", class_id: "c2", created_at: "2026-10-02T00:00:00Z" },
    { id: "s4", class_id: null, created_at: "2026-10-02T00:00:00Z" },
  ];
  const codes = studentCodes(students, classes);
  assert.equal(codes.get("s1"), "HS-8A1-01");
  assert.equal(codes.get("s3"), "HS-8A1-02");
  assert.equal(codes.get("s2"), "HS-8A4-01");
  assert.equal(codes.get("s4"), "HS-KHONGLOP-01");
  for (const c of codes.values()) assert.match(c, STUDENT_CODE_RE);

  const later = studentCodes([...students, { id: "s5", class_id: "c1", created_at: "2026-11-04T00:00:00Z" }], classes);
  assert.equal(later.get("s1"), "HS-8A1-01");
  assert.equal(later.get("s3"), "HS-8A1-02");
  assert.equal(later.get("s5"), "HS-8A1-03");
});

test("hai lớp trùng tên không cho ra mã trùng", () => {
  const codes = studentCodes(
    [
      { id: "a", class_id: "c1", created_at: "2026-10-01T00:00:00Z" },
      { id: "b", class_id: "c2", created_at: "2026-10-01T00:00:00Z" },
    ],
    [
      { id: "c1", name: "8A1" },
      { id: "c2", name: "8A1" },
    ],
  );
  assert.notEqual(codes.get("a"), codes.get("b"));
});

test("CSV: bọc ngoặc kép, nhân đôi ngoặc kép bên trong", () => {
  assert.equal(toCsv([["a", 1, null], ['nói "chào"', "x,y", 2]]), '"a","1",""\r\n"nói ""chào""","x,y","2"');
});
