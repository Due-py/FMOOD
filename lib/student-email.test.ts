// Email "mồi" khi đăng nhập sai biệt danh. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { decoyStudentEmail, STUDENT_EMAIL_DOMAIN } from "./student-email";

const UUID_EMAIL = new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}@${STUDENT_EMAIL_DOMAIN.replace(/\./g, "\.")}$`);

test("email mồi trông giống email thật và luôn giống nhau cho cùng lớp + biệt danh", async () => {
  const a = await decoyStudentEmail("bi-mat", "8A1FBG", "Mèo Lười");
  assert.match(a, UUID_EMAIL);
  assert.equal(a, await decoyStudentEmail("bi-mat", "8a1fbg", "mèo lười"));
  assert.notEqual(a, await decoyStudentEmail("bi-mat", "8A1FBG", "Cún Con"));
  // không đoán được nếu không có khóa bí mật
  assert.notEqual(a, await decoyStudentEmail("khoa-khac", "8A1FBG", "Mèo Lười"));
});
