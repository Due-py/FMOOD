import assert from "node:assert/strict";
import { test } from "node:test";
import { navForRole } from "./staff-nav";

const hrefs = (role: Parameters<typeof navForRole>[0]) => navForRole(role).flatMap((g) => g.items.map((i) => i.href));

test("giáo viên chỉ thấy công cụ của lớp mình, không thấy dạy Mây, tài khoản hay nghiên cứu", () => {
  const t = hrefs("teacher");
  assert.ok(t.includes("/staff/bai-cho-lop") && t.includes("/staff/thu-thach") && t.includes("/staff/loi-nho"));
  assert.ok(!t.some((h) => h.startsWith("/staff/may") || h.startsWith("/staff/safety") || h === "/staff/eval"));
  assert.ok(!t.includes("/staff/members") && !t.includes("/staff/research"));
});

test("tư vấn viên thấy cảnh báo, lời nhờ, nghiên cứu, nhưng không dạy Mây và không soạn bài cho lớp", () => {
  const c = hrefs("counselor");
  assert.ok(c.includes("/staff/alerts") && c.includes("/staff/loi-nho") && c.includes("/staff/research"));
  assert.ok(!c.some((h) => h.startsWith("/staff/may")));
  assert.ok(!c.includes("/staff/bai-cho-lop") && !c.includes("/staff/members"));
});

test("admin thấy mọi công cụ dạy Mây; mỗi đường dẫn chỉ hiện một lần cho mỗi vai trò", () => {
  for (const role of ["teacher", "counselor", "admin"] as const) {
    const list = hrefs(role);
    assert.equal(new Set(list).size, list.length, role);
  }
  const a = hrefs("admin");
  for (const h of ["/staff/may/rules", "/staff/may/knowledge", "/staff/safety/risk", "/staff/members", "/staff/eval"]) assert.ok(a.includes(h), h);
});

test("chỉ admin thấy mục Trình diễn; giáo viên và tư vấn viên không thấy", () => {
  assert.ok(hrefs("admin").includes("/staff/trinh-dien"));
  assert.ok(!hrefs("teacher").includes("/staff/trinh-dien"));
  assert.ok(!hrefs("counselor").includes("/staff/trinh-dien"));
});
