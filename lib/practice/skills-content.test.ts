// Bốn kỹ năng trong kho việc nhỏ và ngân hàng tình huống luyện (kế hoạch Demo 3, mục 1.1, 1.2). Chạy: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { casesForSkill, PRACTICE_CASES, SKILL_CODES, SKILLS } from "@/lib/skills";
import { parseItemData, type SeedItem } from "@/lib/support-content";
import { actionSkill, skillFromSlug } from "./shared";

const ROOT = path.join(import.meta.dirname, "..", "..");
const seed = JSON.parse(readFileSync(path.join(ROOT, "content/vong-ho-tro/noi-dung-mau.json"), "utf8")) as SeedItem[];
const actions = seed.filter((i) => i.kind === "tiny_action");

const TABLE: Record<string, string[]> = {
  K1: ["HD01", "HD02", "HD13"],
  K2: ["HD07", "HD09", "HD04", "HD22"],
  K3: ["HD03", "HD11", "HD12", "HD27"],
  K4: ["HD05", "HD28"],
};

test("mỗi kỹ năng có ít nhất 2 việc nhỏ trong file mẫu, đúng như bảng ở đầu kế hoạch", () => {
  for (const skill of SKILL_CODES) {
    const codes = actions.filter((a) => a.data.skill === skill).map((a) => a.data.code as string);
    assert.ok(codes.length >= 2, `${skill}: ${codes.length} việc`);
    assert.deepEqual(codes.sort(), [...TABLE[skill]].sort(), skill);
    assert.deepEqual([...SKILLS[skill].actions].sort(), [...TABLE[skill]].sort(), `lib/skills.ts ${skill}`);
  }
  // việc nhỏ có trường skill vẫn hợp lệ với trang duyệt nội dung
  for (const a of actions) assert.ok(parseItemData("tiny_action", a.data).ok, a.key);
  assert.equal(parseItemData("tiny_action", { title: "Thử", minutes: 2, steps: ["a b"], skill: "K9" }).ok, false);
});

test("dữ liệu cũ chưa có trường skill: lấy kỹ năng theo mã HD", () => {
  assert.equal(actionSkill({ code: "HD03" }), "K3");
  assert.equal(actionSkill({ code: "HD03", skill: "K1" }), "K1");
  assert.equal(actionSkill({ code: "HD08" }), null);
  assert.equal(actionSkill({}), null);
});

test("đủ 12 tình huống luyện TL01–TL12, mỗi kỹ năng có ít nhất 4 tình huống", () => {
  assert.deepEqual(
    PRACTICE_CASES.map((c) => c.code),
    Array.from({ length: 12 }, (_, i) => `TL${String(i + 1).padStart(2, "0")}`),
  );
  for (const skill of SKILL_CODES) assert.ok(casesForSkill(skill).length >= 4, `${skill}: ${casesForSkill(skill).length}`);
});

test("đường dẫn kỹ năng", () => {
  assert.equal(skillFromSlug("k3"), "K3");
  assert.equal(skillFromSlug("K4"), "K4");
  assert.equal(skillFromSlug("k5"), null);
});
