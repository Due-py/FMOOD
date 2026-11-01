// Khung CASEL 5 (lib/sel/casel.ts): năm năng lực, mã kỹ năng thành phần 2020, danh mục kỹ năng thành phần F-Mood. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CASEL,
  CASEL5,
  CASEL_LIST,
  caselItem,
  isCasel,
  isSubskillId,
  SUBSKILLS,
  subskill,
  subskillBySlug,
  subskillHref,
  subskillsByCompetency,
  visibleItems,
} from "./casel";

test("năm năng lực, đủ tên, định nghĩa, câu dễ hiểu, ví dụ học đường và biểu hiện quan sát được", () => {
  assert.equal(CASEL5.length, 5);
  assert.deepEqual(CASEL_LIST.map((c) => c.key), [...CASEL5]);
  for (const k of CASEL5) {
    const c = CASEL[k];
    assert.equal(c.key, k);
    assert.ok(isCasel(k));
    for (const field of [c.name, c.en, c.plain, c.definition, c.schoolExample]) assert.ok(field.trim().length > 0, `${k}: thiếu chữ`);
    assert.ok(c.observable.length > 0 && c.observable.every((o) => o.trim()), `${k}: biểu hiện quan sát được`);
    assert.ok(c.items.length > 0, k);
  }
  assert.equal(isCasel("tu-nhan-thuc"), false);
});

test("mã kỹ năng thành phần CASEL không trùng nhau; mỗi mã thuộc đúng năng lực theo tiền tố", () => {
  const codes = CASEL_LIST.flatMap((c) => c.items.map((i) => i.code));
  assert.equal(new Set(codes).size, codes.length);
  const prefix: Record<string, string> = {
    self_awareness: "SA",
    self_management: "SM",
    social_awareness: "SO",
    relationship_skills: "RS",
    responsible_decision_making: "RD",
  };
  for (const c of CASEL_LIST) for (const i of c.items) {
    assert.ok(i.code.startsWith(prefix[c.key]), i.code);
    assert.equal(caselItem(i.code)?.competency, c.key, i.code);
    assert.ok(i.en.trim(), i.code);
  }
  assert.equal(caselItem("XX1"), null);
});

test("SM6 (bản dịch không có dòng riêng) không hiện cho học sinh; các dòng hiện đều có câu tiếng Việt", () => {
  assert.ok(caselItem("SM6"));
  assert.ok(!visibleItems("self_management").some((i) => i.code === "SM6"));
  for (const k of CASEL5) for (const i of visibleItems(k)) assert.ok(i.vi.trim(), i.code);
  assert.equal(visibleItems("self_management").length, CASEL.self_management.items.length - 1);
});

test("kỹ năng thành phần F-Mood: id và slug không trùng, mã CASEL có thật, năng lực hợp lệ, có mục tiêu luyện", () => {
  assert.equal(new Set(SUBSKILLS.map((s) => s.id)).size, SUBSKILLS.length);
  assert.equal(new Set(SUBSKILLS.map((s) => s.slug)).size, SUBSKILLS.length);
  for (const s of SUBSKILLS) {
    assert.ok(isSubskillId(s.id));
    assert.equal(subskill(s.id), s);
    assert.equal(subskillBySlug(s.slug), s);
    assert.match(s.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, s.slug);
    assert.equal(subskillHref(s.id), `/ky-nang/${s.slug}`);
    assert.ok(isCasel(s.primary), s.id);
    assert.ok(!s.related.includes(s.primary), `${s.id}: năng lực liên quan trùng năng lực chính`);
    for (const r of s.related) assert.ok(isCasel(r), s.id);
    assert.ok(s.items.length > 0, s.id);
    for (const code of s.items) {
      assert.ok(caselItem(code), `${s.id}: mã ${code} không có trong CASEL`);
      assert.ok(visibleItems(caselItem(code)!.competency).some((i) => i.code === code), `${s.id}: mã ${code} bị ẩn`);
    }
    assert.ok(s.name.trim() && s.objective.trim(), s.id);
    assert.doesNotMatch(s.name, /\bK[1-4]\b/, s.id);
  }
  assert.equal(subskillBySlug("k3"), null);
  assert.equal(isSubskillId("K3"), false);
});

test("xếp kỹ năng thành phần theo năng lực chính: đủ năm năng lực, không sót, không trùng", () => {
  const by = subskillsByCompetency();
  assert.deepEqual(Object.keys(by), [...CASEL5]);
  assert.equal(Object.values(by).flat().length, SUBSKILLS.length);
  for (const k of CASEL5) for (const s of by[k]) assert.equal(s.primary, k);
  const some = subskillsByCompetency(["ask_for_help"]);
  assert.deepEqual(some.relationship_skills.map((s) => s.id), ["ask_for_help"]);
  assert.equal(some.self_awareness.length, 0);
});
