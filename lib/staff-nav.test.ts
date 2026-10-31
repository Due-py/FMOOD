import assert from "node:assert/strict";
import { test } from "node:test";
import { navForRole } from "./staff-nav";

const hrefs = (role: Parameters<typeof navForRole>[0]) => navForRole(role).flatMap((g) => g.items.map((i) => i.href));

test("giáo viên chỉ thấy công cụ của lớp mình, không thấy dạy trợ lý, tài khoản hay nghiên cứu", () => {
  const t = hrefs("teacher");
  assert.ok(t.includes("/staff/bai-cho-lop") && t.includes("/staff/thu-thach") && t.includes("/staff/loi-nho"));
  assert.ok(!t.some((h) => h.startsWith("/staff/may") || h.startsWith("/staff/safety") || h === "/staff/eval"));
  assert.ok(!t.includes("/staff/members") && !t.includes("/staff/research"));
});

test("tư vấn viên thấy cảnh báo, lời nhờ, nghiên cứu, nhưng không dạy trợ lý và không soạn bài cho lớp", () => {
  const c = hrefs("counselor");
  assert.ok(c.includes("/staff/alerts") && c.includes("/staff/loi-nho") && c.includes("/staff/research"));
  assert.ok(!c.some((h) => h.startsWith("/staff/may")));
  assert.ok(!c.includes("/staff/bai-cho-lop") && !c.includes("/staff/members"));
});

test("admin thấy mọi công cụ dạy trợ lý; mỗi đường dẫn chỉ hiện một lần cho mỗi vai trò", () => {
  for (const role of ["teacher", "counselor", "admin"] as const) {
    const list = hrefs(role);
    assert.equal(new Set(list).size, list.length, role);
  }
  const a = hrefs("admin");
  for (const h of ["/staff/may/rules", "/staff/may/tro-chuyen", "/staff/may/knowledge", "/staff/safety/risk", "/staff/members", "/staff/eval"]) assert.ok(a.includes(h), h);
});

test("không còn tên Mây trên thanh bên", () => {
  const all = navForRole("admin").flatMap((g) => [g.title, ...g.items.flatMap((i) => [i.label, i.description])]);
  assert.ok(!all.some((t) => /Mây/.test(t)), all.find((t) => /Mây/.test(t)));
});

test("chỉ admin thấy mục Trình diễn; giáo viên và tư vấn viên không thấy", () => {
  assert.ok(hrefs("admin").includes("/staff/trinh-dien"));
  assert.ok(!hrefs("teacher").includes("/staff/trinh-dien"));
  assert.ok(!hrefs("counselor").includes("/staff/trinh-dien"));
});

test("Tổng quan app đứng đầu thanh bên của admin; Nhật ký hoạt động chỉ admin thấy", () => {
  assert.equal(hrefs("admin")[0], "/staff/tong-quan");
  assert.ok(hrefs("admin").includes("/staff/nhat-ky"));
  for (const role of ["teacher", "counselor"] as const) {
    assert.ok(!hrefs(role).includes("/staff/tong-quan"), role);
    assert.ok(!hrefs(role).includes("/staff/nhat-ky"), role);
  }
});
