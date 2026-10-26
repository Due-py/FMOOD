// Chế độ trình diễn: ai thấy lớp nào, ai được tua. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowsClass,
  allowsUser,
  classScopeFor,
  demoEmail,
  isDemoCode,
  isDemoEmail,
  shiftDay,
  shiftIso,
  shouldShiftBack,
  timeTravelBlocked,
} from "./shared";

const DEMO = ["lop-mau-1", "lop-mau-2"];

test("admin đang trình diễn: chỉ thấy lớp mẫu, không thấy lớp thật hay dòng không còn lớp", () => {
  const s = classScopeFor("admin", { demo: true, demoClassIds: DEMO, ownClassIds: [] });
  assert.equal(allowsClass(s, "lop-mau-1"), true);
  assert.equal(allowsClass(s, "lop-that"), false);
  assert.equal(allowsClass(s, null), false);
});

test("admin / phòng tham vấn bình thường: thấy mọi lớp thật, KHÔNG thấy lớp mẫu", () => {
  for (const role of ["admin", "counselor"] as const) {
    const s = classScopeFor(role, { demo: false, demoClassIds: DEMO, ownClassIds: [] });
    assert.equal(allowsClass(s, "lop-that"), true);
    assert.equal(allowsClass(s, null), true, "cảnh báo của lớp đã xóa vẫn hiện như trước");
    assert.equal(allowsClass(s, "lop-mau-2"), false);
  }
});

test("chưa có dữ liệu mẫu: admin thấy mọi lớp như trước khi có chế độ trình diễn", () => {
  assert.deepEqual(classScopeFor("admin", { demo: false, demoClassIds: [], ownClassIds: [] }), { kind: "all" });
});

test("phòng tham vấn không bật được trình diễn (cookie bị bỏ qua)", () => {
  const s = classScopeFor("counselor", { demo: true, demoClassIds: DEMO, ownClassIds: [] });
  assert.equal(allowsClass(s, "lop-mau-1"), false);
  assert.equal(allowsClass(s, "lop-that"), true);
});

test("giáo viên chỉ thấy lớp mình chủ nhiệm; học sinh không thấy lớp nào", () => {
  const t = classScopeFor("teacher", { demo: false, demoClassIds: DEMO, ownClassIds: ["lop-cua-co"] });
  assert.equal(allowsClass(t, "lop-cua-co"), true);
  assert.equal(allowsClass(t, "lop-dong-nghiep"), false);
  assert.equal(allowsClass(t, null), false);
  assert.equal(allowsClass(classScopeFor("student", { demo: true, demoClassIds: DEMO, ownClassIds: [] }), "lop-mau-1"), false);
});

test("tài khoản: trình diễn chỉ tính tài khoản mẫu, bình thường không bao giờ tính tài khoản mẫu", () => {
  const ids = new Set(["hs-mau"]);
  assert.equal(allowsUser(true, ids, "hs-mau"), true);
  assert.equal(allowsUser(true, ids, "hs-that"), false);
  assert.equal(allowsUser(false, ids, "hs-mau"), false);
  assert.equal(allowsUser(false, ids, "hs-that"), true);
});

test("mã lớp mẫu và email mẫu", () => {
  assert.equal(isDemoCode("MAU-7A"), true);
  assert.equal(isDemoCode("mau-7a"), true);
  assert.equal(isDemoCode("MAUX7A"), false, "mã lớp thật do máy sinh không có dấu gạch");
  assert.equal(isDemoCode(null), false);
  assert.equal(isDemoEmail(demoEmail("abc")), true);
  assert.equal(isDemoEmail("abc@students.fmood.invalid"), false);
  assert.equal(isDemoEmail("co.lan@demo.fmood.invalid.com"), false);
});

const registry = { studentIds: ["hs-mau"], classIds: ["lop-mau-1"] };
const mau = { id: "hs-mau", role: "student", classId: "lop-mau-1", classCode: "MAU-7A", email: demoEmail("hs-mau") };

test("tua nhanh: chỉ học sinh mẫu đủ cả 3 dấu hiệu", () => {
  assert.equal(timeTravelBlocked(registry, mau), null);
});

test("tua nhanh: từ chối khi thiếu bất kỳ dấu hiệu nào", () => {
  assert.match(timeTravelBlocked(null, mau) ?? "", /Chưa có dữ liệu mẫu/);
  assert.ok(timeTravelBlocked(registry, { ...mau, id: "hs-that" }), "không có trong sổ ghi");
  assert.ok(timeTravelBlocked(registry, { ...mau, role: "teacher" }), "không phải học sinh");
  assert.ok(timeTravelBlocked(registry, { ...mau, classId: "lop-that" }), "không ở lớp mẫu");
  assert.ok(timeTravelBlocked(registry, { ...mau, classCode: "66PZWV" }), "mã lớp không phải MAU-");
  assert.ok(timeTravelBlocked(registry, { ...mau, email: "hs-mau@students.fmood.invalid" }), "email học sinh thật");
  assert.ok(timeTravelBlocked(registry, { ...mau, classId: null }), "không có lớp");
});

test("dời mốc thời gian: lùi 7 ngày rồi tới 7 ngày thì về đúng chỗ cũ", () => {
  const at = "2026-10-26T03:15:00.000Z";
  assert.equal(shiftIso(at, -7), "2026-10-19T03:15:00.000Z");
  assert.equal(shiftIso(shiftIso(at, -7), 7), at);
  assert.equal(shiftIso(null, -7), null);
  assert.equal(shiftDay("2026-11-03", -7), "2026-10-27");
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
});

test("hoàn tác tua: chỉ dời dòng có trước lúc tua", () => {
  const tuaAt = "2026-10-26T10:00:00.000Z";
  assert.equal(shouldShiftBack("2026-10-19T09:00:00.000Z", tuaAt), true);
  assert.equal(shouldShiftBack("2026-10-26T10:05:00.000Z", tuaAt), false);
});
