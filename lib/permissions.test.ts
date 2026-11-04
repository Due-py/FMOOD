import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import type { Role } from "./auth";
import {
  allowsPage,
  canOpenPage,
  cellLock,
  defaultGrants,
  describeChanges,
  differsFromDefault,
  GRADING_PAGE,
  navFor,
  normalizeGrants,
  pageSections,
  PERM_GROUPS,
  PERMISSIONS_PAGE,
  setCell,
  STAFF_PAGES,
  type Grants,
  type Viewer,
} from "./permissions-shared";
import { alertForViewer, TEST_ALERT_PREFIX } from "./staff-privacy";
import { navForRole } from "./staff-nav";

const STAFF: Role[] = ["teacher", "counselor", "admin"];
const who = (role: Role, rater = false): Viewer => ({ role, rater });
const hrefs = (grants: Grants, viewer: Viewer) => navFor(grants, viewer).flatMap((g) => g.items.map((i) => i.href));
const labels = (grants: Grants, viewer: Viewer) => navFor(grants, viewer).flatMap((g) => g.items.map((i) => `${g.title}|${i.href}|${i.label}`));

// ───────── 11.1 Mặc định đúng như hiện nay ─────────

test("chưa sửa gì: mọi vai trò thấy đúng các trang như thanh bên cũ (staff-nav.ts)", () => {
  const grants = defaultGrants();
  for (const role of STAFF) {
    const before = navForRole(role).flatMap((g) => g.items.map((i) => `${g.title}|${i.href}|${i.label}`));
    assert.deepEqual(labels(grants, who(role)), before, role);
    // người chấm (giáo viên / tư vấn viên được giao) cũng không thấy thêm gì
    assert.deepEqual(labels(grants, who(role, true)), before, `${role} + người chấm`);
  }
});

test("mặc định không đụng ô khóa nào: áp ô khóa lên bảng mặc định không đổi gì", () => {
  assert.deepEqual(normalizeGrants(defaultGrants()), defaultGrants());
  assert.equal(differsFromDefault(defaultGrants()), false);
});

test("cài đặt trống hoặc hỏng thì dùng mặc định; trang mới thêm vào mã lấy mặc định", () => {
  assert.deepEqual(normalizeGrants(undefined), defaultGrants());
  assert.deepEqual(normalizeGrants("lung tung"), defaultGrants());
  const partial = normalizeGrants({ "/staff/loi-nho": ["counselor"], "/staff/khong-co": ["teacher"], "/staff/classes": ["admin", "hacker", "teacher"] });
  assert.deepEqual(partial["/staff/loi-nho"], ["counselor"]);
  assert.deepEqual(partial["/staff/classes"], ["teacher"]);
  assert.equal(partial["/staff/khong-co"], undefined);
  assert.deepEqual(partial["/staff/thu-thach"], defaultGrants()["/staff/thu-thach"]);
});

test("mỗi trang có một dòng; trang Phân quyền có trên thanh bên của admin, nhóm giống thanh bên", () => {
  const all = STAFF_PAGES.map((p) => p.href);
  assert.equal(new Set(all).size, all.length);
  assert.ok(hrefs(defaultGrants(), who("admin")).includes(PERMISSIONS_PAGE));
  assert.deepEqual(
    pageSections().flatMap((s) => s.pages.map((p) => p.href)),
    all,
  );
  // /staff/surveys có hai tên (GVCN / admin) nhưng chỉ một dòng
  assert.match(STAFF_PAGES.find((p) => p.href === "/staff/surveys")!.label, /Câu hỏi cho lớp \/ Phiếu khảo sát/);
});

// ───────── 11.2 Một hàm kiểm tra chung ─────────

test("bỏ quyền một trang: nhóm đó không thấy trên thanh bên, mở thẳng / gọi thẳng thao tác bị chặn", () => {
  const grants = setCell(defaultGrants(), "/staff/thu-thach", "teacher", false)!;
  assert.ok(grants);
  assert.ok(!hrefs(grants, who("teacher")).includes("/staff/thu-thach"));
  assert.equal(canOpenPage(grants, who("teacher"), "/staff/thu-thach"), false);
  assert.equal(allowsPage(grants, who("teacher"), ["/staff/thu-thach"]), false);
  // nhóm khác và admin không bị ảnh hưởng
  assert.ok(hrefs(grants, who("admin")).includes("/staff/thu-thach"));
  assert.ok(hrefs(grants, who("teacher")).includes("/staff/bai-cho-lop"));
});

test("mở thêm trang cho một nhóm: hiện trên thanh bên và qua được kiểm tra", () => {
  const grants = setCell(defaultGrants(), "/staff/research", "teacher", true)!;
  assert.ok(hrefs(grants, who("teacher")).includes("/staff/research"));
  assert.equal(allowsPage(grants, who("teacher"), ["/staff/research"]), true);
});

test("sàn vai trò: được mở trang nhưng sai vai trò thì thao tác vẫn bị chặn", () => {
  const grants = defaultGrants();
  // chấm bài: chỉ giáo viên / tư vấn viên, admin không chấm (không đọc bài đo)
  assert.equal(allowsPage(grants, who("admin"), [GRADING_PAGE], ["teacher", "counselor"]), false);
  assert.equal(allowsPage(grants, who("teacher", true), [GRADING_PAGE], ["teacher", "counselor"]), true);
  // việc quản lý lớp ở trang Tình hình lớp: chỉ admin
  assert.equal(allowsPage(grants, who("counselor"), ["/staff/classes"], ["admin"]), false);
});

test("thao tác dùng chung nhiều trang: mở được một trong các trang là đủ", () => {
  let grants = setCell(defaultGrants(), "/staff/may/rules", "counselor", true)!;
  assert.equal(allowsPage(grants, who("counselor"), ["/staff/may/scenarios", "/staff/may/rules"]), true);
  grants = setCell(grants, "/staff/may/rules", "counselor", false)!;
  assert.equal(allowsPage(grants, who("counselor"), ["/staff/may/scenarios", "/staff/may/rules"]), false);
});

test("trang lạ chỉ admin mở được; học sinh không mở được trang nào", () => {
  assert.equal(canOpenPage(defaultGrants(), who("teacher"), "/staff/trang-moi-quen-khai-bao"), false);
  assert.equal(canOpenPage(defaultGrants(), who("admin"), "/staff/trang-moi-quen-khai-bao"), true);
  for (const p of STAFF_PAGES) assert.equal(canOpenPage(defaultGrants(), who("student"), p.href), false, p.href);
});

// ───────── 11.4 Ô khóa ─────────

test("không gỡ được tư vấn viên khỏi trang Cảnh báo, kể cả khi dữ liệu lưu bị sửa tay", () => {
  assert.equal(setCell(defaultGrants(), "/staff/alerts", "counselor", false), null);
  const forced = normalizeGrants({ ...defaultGrants(), "/staff/alerts": [] });
  assert.ok(forced["/staff/alerts"].includes("counselor"));
  assert.ok(hrefs(forced, who("counselor")).includes("/staff/alerts"));
});

test("Tài khoản, Phân quyền, Nhật ký, Tổng quan app, Trình diễn: chỉ admin, không mở cho nhóm nào được", () => {
  for (const href of ["/staff/members", PERMISSIONS_PAGE, "/staff/nhat-ky", "/staff/tong-quan", "/staff/trinh-dien"]) {
    for (const g of PERM_GROUPS) {
      assert.equal(cellLock(href, g)?.on, false, `${href} ${g}`);
      assert.equal(setCell(defaultGrants(), href, g, true), null, `${href} ${g}`);
    }
    const forced = normalizeGrants({ [href]: ["teacher", "counselor", "rater"] });
    assert.deepEqual(forced[href], [], href);
    for (const role of ["teacher", "counselor"] as const) assert.equal(canOpenPage(forced, who(role, true), href), false, `${href} ${role}`);
  }
});

test("Người chấm chỉ mở được trang chấm bài, và luôn mở được", () => {
  for (const p of STAFF_PAGES) {
    const lock = cellLock(p.href, "rater");
    assert.ok(lock, p.href);
    assert.equal(lock.on, p.href === GRADING_PAGE, p.href);
  }
  // admin bỏ trang chấm bài khỏi GVCN: GVCN được giao chấm vẫn mở được, GVCN khác thì không
  const grants = setCell(defaultGrants(), GRADING_PAGE, "teacher", false)!;
  assert.equal(canOpenPage(grants, who("teacher", true), GRADING_PAGE), true);
  assert.equal(canOpenPage(grants, who("teacher", false), GRADING_PAGE), false);
  // được giao chấm không mở thêm trang nào khác
  assert.deepEqual(hrefs(grants, who("teacher", true)).filter((h) => !hrefs(grants, who("teacher")).includes(h)), [GRADING_PAGE]);
});

test("admin luôn mở được mọi trang, dù bảng quyền ghi gì", () => {
  const empty = normalizeGrants(Object.fromEntries(STAFF_PAGES.map((p) => [p.href, []])));
  for (const p of STAFF_PAGES) assert.equal(canOpenPage(empty, who("admin"), p.href), true, p.href);
  assert.deepEqual(hrefs(empty, who("admin")), hrefs(defaultGrants(), who("admin")));
});

test("bật trang Cảnh báo cho GVCN vẫn không thấy nội dung tin nhắn hay bài đo (chặn theo vai trò, không theo trang)", () => {
  const grants = setCell(setCell(defaultGrants(), "/staff/alerts", "teacher", false)!, "/staff/alerts", "teacher", true)!;
  assert.equal(canOpenPage(grants, who("teacher"), "/staff/alerts"), true);
  const alert = { excerpt: "mình buồn lắm", reasons: ["buồn"], note: "đã gọi phụ huynh" };
  const seen = alertForViewer(alert, "teacher");
  assert.equal(seen.excerpt, null);
  assert.deepEqual(seen.reasons, []);
  assert.equal(seen.note, null);
  assert.equal(seen.contentHidden, true);
  const test = alertForViewer({ ...alert, excerpt: `${TEST_ALERT_PREFIX} câu trả lời` }, "teacher");
  assert.equal(test.excerpt, null);
});

test("ghi nhật ký: mỗi ô đổi là một dòng dễ đọc", () => {
  const after = setCell(setCell(defaultGrants(), "/staff/loi-nho", "teacher", false)!, "/staff/research", "teacher", true)!;
  assert.deepEqual(describeChanges(defaultGrants(), after), ["Lời nhờ giúp: bỏ GVCN", "Kết quả nghiên cứu: mở cho GVCN"]);
  assert.equal(differsFromDefault(after), true);
});

// ───────── Mọi trang và thao tác đều dùng kiểm tra chung ─────────

const ROOT = path.join(import.meta.dirname, "..");
const PORTAL = path.join(ROOT, "app", "staff", "(portal)");

function walk(dir: string, name: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p, name) : f === name ? [p] : [];
  });
}

const PAGE_CALL = /require(?:Page|AnyPage)\(\s*(\[[^\]]*\]|"[^"]+")/g;
const known = new Set(STAFF_PAGES.map((p) => p.href));

function calledPages(src: string): string[] {
  return [...src.matchAll(PAGE_CALL)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}

test("mọi trang thầy cô kiểm tra quyền theo trang (không còn danh sách vai trò viết cứng)", () => {
  // trang chung cho mọi thầy cô (Hôm nay, Tài khoản của tôi) và trang chỉ chuyển hướng
  const open = new Set(["page.tsx", path.join("account", "page.tsx"), path.join("may", "persona", "page.tsx"), path.join("teachers", "page.tsx")]);
  for (const file of walk(PORTAL, "page.tsx")) {
    const rel = path.relative(PORTAL, file);
    const src = readFileSync(file, "utf8");
    assert.ok(!/requireStaff\(\s*\[/.test(src), `${rel} còn requireStaff([...])`);
    if (open.has(rel)) continue;
    const pages = calledPages(src);
    assert.ok(pages.length > 0, `${rel} chưa gọi requirePage`);
    for (const p of pages) assert.ok(known.has(p), `${rel}: trang lạ ${p}`);
    // trang con dùng quyền của trang cha trên thanh bên
    const href = `/staff/${rel.replace(/\\/g, "/").replace(/\/?page\.tsx$/, "")}`;
    assert.ok(pages.some((p) => href === p || href.startsWith(`${p}/`)), `${rel} kiểm tra ${pages.join(", ")}`);
  }
});

test("mọi thao tác của trang thầy cô kiểm tra quyền theo trang", () => {
  const files = ["admin.ts", "bai-do.ts", "challenges.ts", "class-content.ts", "demo.ts", "help-inbox.ts", "lesson-review.ts", "permissions.ts", "staff.ts", "support-content.ts", "activity.ts"];
  // thao tác không thuộc trang nào: học sinh gọi, hoặc thầy cô tự đổi mật khẩu
  const exempt = new Set(["markTestStart", "joinChallenge", "recordLogin", "recordOpen", "recordExport", "changeStaffPassword"]);
  for (const f of files) {
    const src = readFileSync(path.join(ROOT, "app", "actions", f), "utf8");
    assert.ok(!/requireStaff\(\s*\[/.test(src), `${f} còn requireStaff([...])`);
    for (const p of calledPages(src)) assert.ok(known.has(p), `${f}: trang lạ ${p}`);
    // mỗi hàm export: thân hàm (đến hàm export kế tiếp) phải gọi kiểm tra theo trang, trực tiếp hoặc qua hàm phụ
    const parts = src.split(/\nexport async function /).slice(1);
    for (const part of parts) {
      const name = part.match(/^(\w+)/)![1];
      if (exempt.has(name)) continue;
      const body = part.split(/\n}\r?\n/)[0];
      assert.ok(/requirePage|requireAnyPage|settingEditor\(|surveyActor\(|reviewer\(|admin\(\)|change\(/.test(body), `${f}#${name} chưa kiểm tra quyền theo trang`);
    }
    // hàm phụ (nếu có) phải gọi requirePage
    for (const helper of ["admin", "reviewer", "surveyActor", "settingEditor", "change"]) {
      const m = src.match(new RegExp(`\\nasync function ${helper}\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`)) ?? src.match(new RegExp(`\\nfunction ${helper}\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`));
      if (m) assert.ok(/requirePage|requireAnyPage/.test(m[1]), `${f}: ${helper}() chưa gọi requirePage`);
    }
  }
});
