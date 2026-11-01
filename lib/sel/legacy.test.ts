// Lớp tương thích với hệ nhãn cũ (lib/sel/legacy.ts): đọc dữ liệu đã lưu trước 01/11, ghi cột cũ cho 4 mô-đun. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { SUBSKILLS } from "./casel";
import {
  caselFromOld,
  isLegacySkillCode,
  legacyFromSubskill,
  readSubskill,
  subskillFromLegacy,
  subskillFromOldCardName,
  subskillFromRef,
} from "./legacy";

const PAIRS = [
  ["K1", "recognize_feelings_thoughts"],
  ["K2", "calm_in_the_moment"],
  ["K3", "plan_step_by_step"],
  ["K4", "ask_for_help"],
] as const;

test("bốn mã cũ đổi hai chiều đúng một kỹ năng thành phần", () => {
  for (const [code, id] of PAIRS) {
    assert.ok(isLegacySkillCode(code));
    assert.equal(subskillFromLegacy(code), id);
    assert.equal(legacyFromSubskill(id), code);
    assert.equal(subskillFromLegacy(legacyFromSubskill(id)), id);
  }
  assert.equal(new Set(PAIRS.map(([, id]) => id)).size, 4);
});

test("kỹ năng thành phần mới không có mã cũ; mã lạ không đoán", () => {
  const mapped = new Set<string>(PAIRS.map(([, id]) => id));
  for (const s of SUBSKILLS) if (!mapped.has(s.id)) assert.equal(legacyFromSubskill(s.id), null, s.id);
  for (const v of ["K5", "K0", "k3", "", null, undefined, 3, "plan_step_by_step"]) assert.equal(subskillFromLegacy(v), null, String(v));
  assert.equal(isLegacySkillCode("k1"), false);
});

test("đọc giá trị đã lưu: id mới giữ nguyên, mã cũ đổi sang id, còn lại null", () => {
  assert.equal(readSubskill("plan_step_by_step"), "plan_step_by_step");
  assert.equal(readSubskill("see_other_side"), "see_other_side");
  assert.equal(readSubskill("K2"), "calm_in_the_moment");
  for (const v of ["K9", "go-roi-tung-buoc", "", null, undefined, {}]) assert.equal(readSubskill(v), null, String(v));
});

test("ref ở sổ hoạt động: dạng cũ và dạng mới cho cùng một kỹ năng", () => {
  const same: [string, string][] = [
    ["K3", "plan_step_by_step"],
    ["K3|TL09", "plan_step_by_step|TL09"],
    ["skill:K3", "subskill:plan_step_by_step"],
  ];
  for (const [old, now] of same) {
    assert.equal(subskillFromRef(old), "plan_step_by_step", old);
    assert.equal(subskillFromRef(now), "plan_step_by_step", now);
  }
  assert.equal(subskillFromRef("ask_for_help|TL11|from:chat"), "ask_for_help");
  assert.equal(subskillFromRef("subskill:listen_to_peer"), "listen_to_peer");
  for (const v of ["skill:?", "subskill:?", "goal", "end:stop", "HD03", "", null, undefined]) assert.equal(subskillFromRef(v), null, String(v));
});

test("nhãn năng lực cũ của bộ điều phối đổi sang khóa CASEL mới", () => {
  assert.equal(caselFromOld("tu-nhan-thuc"), "self_awareness");
  assert.equal(caselFromOld("tu-quan-ly"), "self_management");
  assert.equal(caselFromOld("nhan-thuc-xa-hoi"), "social_awareness");
  assert.equal(caselFromOld("ky-nang-quan-he"), "relationship_skills");
  assert.equal(caselFromOld("ra-quyet-dinh"), "responsible_decision_making");
  assert.equal(caselFromOld("self_awareness"), null);
});

test("tên thẻ [SKILL] cũ trong tin nhắn đã lưu: cả tên 31/10 sáng và tên 31/10 tối", () => {
  assert.equal(subskillFromOldCardName("Nhận ra mình đang thế nào"), "recognize_feelings_thoughts");
  assert.equal(subskillFromOldCardName("Làm dịu cảm xúc"), "calm_in_the_moment");
  assert.equal(subskillFromOldCardName("Gỡ rối từng bước"), "plan_step_by_step");
  assert.equal(subskillFromOldCardName("Tìm người giúp mình"), "ask_for_help");
  assert.equal(subskillFromOldCardName("Bình tĩnh lại trước khi làm bài"), "calm_in_the_moment");
  assert.equal(subskillFromOldCardName("Sắp xếp việc khi có nhiều bài"), "plan_step_by_step");
  assert.equal(subskillFromOldCardName("  Nhờ thầy cô khi chưa hiểu bài "), "ask_for_help");
  for (const v of ["Quản lý thời gian", "Gỡ rối từng bước cho đỡ áp lực", "", "K3"]) assert.equal(subskillFromOldCardName(v), null, v);
});
