// Các mô-đun luyện trong kho việc nhỏ và ngân hàng tình huống luyện (kế hoạch Demo 3, mục 1.1, 1.2). Chạy: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { caselItem, subskill, subskillsByCompetency } from "@/lib/sel/casel";
import { caseByCode, casesForSkill, PRACTICE_CASES, SKILL_IDS, SKILLS, type SkillId } from "@/lib/skills";
import { parseItemData, type SeedItem } from "@/lib/support-content";
import { actionSkill, skillFromSlug } from "./shared";

const ROOT = path.join(import.meta.dirname, "..", "..");
const seed = JSON.parse(readFileSync(path.join(ROOT, "content/vong-ho-tro/noi-dung-mau.json"), "utf8")) as SeedItem[];
const actions = seed.filter((i) => i.kind === "tiny_action");

const TABLE: Record<string, string[]> = {
  recognize_feelings_thoughts: ["HD01", "HD02", "HD13"],
  calm_in_the_moment: ["HD07", "HD09", "HD04", "HD22"],
  plan_step_by_step: ["HD03", "HD11", "HD12", "HD27"],
  ask_for_help: ["HD05", "HD28"],
  // 5 mô-đun mới (01/11): chưa gắn việc nhỏ nào trong kho
  see_other_side: [],
  notice_peer_stress: [],
  listen_to_peer: [],
  resolve_group_conflict: [],
  say_no_to_pressure: [],
  // 7 mô-đun đợt 2 (01/11): chưa gắn việc nhỏ nào trong kho
  know_my_strengths: [],
  growth_mindset: [],
  set_small_goal: [],
  start_when_reluctant: [],
  weigh_consequences: [],
  check_information: [],
  show_gratitude: [],
};

test("mỗi kỹ năng Demo 2 có ít nhất 2 việc nhỏ trong file mẫu, đúng như bảng ở đầu kế hoạch", () => {
  for (const skill of SKILL_IDS) {
    const codes = actions.filter((a) => a.data.skill === skill).map((a) => a.data.code as string);
    if (TABLE[skill].length) assert.ok(codes.length >= 2, `${skill}: ${codes.length} việc`);
    assert.deepEqual(codes.sort(), [...TABLE[skill]].sort(), skill);
    assert.deepEqual([...SKILLS[skill].actions].sort(), [...TABLE[skill]].sort(), `lib/skills.ts ${skill}`);
  }
  // việc nhỏ có trường skill vẫn hợp lệ với trang duyệt nội dung
  for (const a of actions) assert.ok(parseItemData("tiny_action", a.data).ok, a.key);
  assert.equal(parseItemData("tiny_action", { title: "Thử", minutes: 2, steps: ["a b"], skill: "K9" }).ok, false);
  // từ 01/11 cả 9 kỹ năng thành phần đều có bài luyện: gắn được cả mô-đun mới
  assert.equal(parseItemData("tiny_action", { title: "Thử", minutes: 2, steps: ["a b"], skill: "see_other_side" }).ok, true);
  assert.equal(parseItemData("tiny_action", { title: "Thử", minutes: 2, steps: ["a b"], skill: "khong_co" }).ok, false);
  // mục cũ lưu mã cũ: vẫn hợp lệ, lưu lại thì thành id mới
  const old = parseItemData("tiny_action", { title: "Thử", minutes: 2, steps: ["a b"], skill: "K3" });
  assert.ok(old.ok && old.data.skill === "plan_step_by_step");
});

test("dữ liệu cũ chưa có trường skill: lấy kỹ năng theo mã HD", () => {
  assert.equal(actionSkill({ code: "HD03" }), "plan_step_by_step");
  assert.equal(actionSkill({ code: "HD03", skill: "recognize_feelings_thoughts" }), "recognize_feelings_thoughts");
  // mục cũ gắn mã cũ
  assert.equal(actionSkill({ code: "HD03", skill: "K1" }), "recognize_feelings_thoughts");
  assert.equal(actionSkill({ code: "HD08" }), null);
  assert.equal(actionSkill({}), null);
});

test("đủ 57 tình huống luyện TL01–TL57; mô-đun nào cũng có ít nhất 4 tình huống (Duy 01/11)", () => {
  assert.deepEqual(
    PRACTICE_CASES.map((c) => c.code),
    Array.from({ length: 57 }, (_, i) => `TL${String(i + 1).padStart(2, "0")}`),
  );
  const demo2 = new Set(["recognize_feelings_thoughts", "calm_in_the_moment", "plan_step_by_step", "ask_for_help"]);
  for (const skill of SKILL_IDS) assert.ok(casesForSkill(skill).length >= 4, `${skill}: ${casesForSkill(skill).length}`);
  // TL01–TL12 chỉ thuộc mô-đun Demo 2, TL13 trở đi chỉ thuộc mô-đun mới (đúng bảng đã duyệt)
  for (const c of PRACTICE_CASES) {
    const old = Number(c.code.slice(2)) <= 12;
    for (const s of c.skills) assert.equal(demo2.has(s), old, `${c.code} ${s}`);
  }
});

// bản nội dung đã duyệt nằm trong hồ sơ (chưa chắc có ở mọi máy): không có thì bỏ qua phần so nguyên văn
const APPROVED = path.join(ROOT, "ho-so-du-thi/2-xay-dung/bai-luyen-moi/noi-dung.json");

test("5 mô-đun mới: nội dung đúng bản Duy duyệt (noi-dung.json), tiêu chí gắn mã CASEL, tên lấy ở casel.ts", { skip: !existsSync(APPROVED) && "không có noi-dung.json" }, () => {
  const json = JSON.parse(readFileSync(APPROVED, "utf8")) as {
    modules: { id: SkillId; emoji: string; tagline: string; understand: string; safetyNote: string | null; fields: unknown[]; criteria: { text: string; casel_item: string }[] }[];
    cases: { code: string; situation: string; modules: string[]; signLabel: string }[];
  };
  for (const m of json.modules) {
    const s = SKILLS[m.id];
    assert.equal(s.name, subskill(m.id).name, m.id);
    assert.equal(s.emoji, m.emoji, m.id);
    assert.equal(s.tagline, m.tagline, m.id);
    assert.equal(s.understand, m.understand, m.id);
    assert.equal(s.safetyNote ?? null, m.safetyNote, m.id);
    assert.deepEqual(s.fields, m.fields, m.id);
    assert.deepEqual(s.criteria, m.criteria.map((c) => c.text), m.id);
    assert.deepEqual(s.criteriaCodes, m.criteria.map((c) => c.casel_item), m.id);
    assert.deepEqual(s.actions, [], m.id);
  }
  for (const c of json.cases) {
    const mine = caseByCode(c.code);
    assert.ok(mine, c.code);
    assert.deepEqual([mine.situation, mine.sign, mine.skills], [c.situation, c.signLabel, c.modules], c.code);
  }
});

test("khung an toàn chỉ ở 3 mô-đun; ưu tiên góp ý chỉ ở \"Nhận ra khi bạn đang áp lực\"", () => {
  assert.deepEqual(SKILL_IDS.filter((k) => SKILLS[k].safetyNote), ["notice_peer_stress", "listen_to_peer", "say_no_to_pressure"]);
  assert.deepEqual(SKILL_IDS.filter((k) => SKILLS[k].feedbackPriority), ["notice_peer_stress"]);
  assert.ok(SKILLS.notice_peer_stress.fields.some((f) => f.key === SKILLS.notice_peer_stress.feedbackPriority?.field));
});

test("mỗi nhóm năng lực CASEL có 3–4 bài luyện; mọi tiêu chí đều gắn mã CASEL của đúng bài", () => {
  for (const [c, list] of Object.entries(subskillsByCompetency(SKILL_IDS))) assert.ok(list.length >= 3 && list.length <= 4, `${c}: ${list.length}`);
  for (const k of SKILL_IDS) {
    assert.equal(SKILLS[k].criteriaCodes.length, SKILLS[k].criteria.length, k);
    for (const code of SKILLS[k].criteriaCodes) assert.ok(caselItem(code)?.vi, `${k}: ${code}`);
  }
});

// bản nội dung đợt 2 (7 mô-đun, tạo từ lib/skills.ts để Duy và cô Thúy duyệt): khi đã có thì phải khớp nguyên văn
const DOT_2 = path.join(ROOT, "ho-so-du-thi/2-xay-dung/bai-luyen-moi/noi-dung-dot-2.json");

test("7 mô-đun đợt 2: nội dung khớp bản để duyệt (noi-dung-dot-2.json)", { skip: !existsSync(DOT_2) && "không có noi-dung-dot-2.json" }, () => {
  const json = JSON.parse(readFileSync(DOT_2, "utf8")) as {
    modules: { id: SkillId; tagline: string; understand: string; fields: unknown[]; criteria: { text: string; casel_item: string }[]; example: unknown }[];
    cases: { code: string; situation: string; modules: string[]; signLabel: string }[];
  };
  assert.equal(json.modules.length, 7);
  for (const m of json.modules) {
    const s = SKILLS[m.id];
    assert.equal(s.tagline, m.tagline, m.id);
    assert.equal(s.understand, m.understand, m.id);
    assert.deepEqual(s.example, m.example, m.id);
    assert.deepEqual(s.fields, m.fields, m.id);
    assert.deepEqual(s.criteria, m.criteria.map((c) => c.text), m.id);
    assert.deepEqual(s.criteriaCodes, m.criteria.map((c) => c.casel_item), m.id);
  }
  for (const c of json.cases) {
    const mine = caseByCode(c.code);
    assert.ok(mine, c.code);
    assert.deepEqual([mine.situation, mine.sign, mine.skills], [c.situation, c.signLabel, c.modules], c.code);
  }
});

test("đường dẫn kỹ năng", () => {
  assert.equal(skillFromSlug("go-roi-tung-buoc"), "plan_step_by_step");
  assert.equal(skillFromSlug("mo-loi-nho-giup"), "ask_for_help");
  // đánh dấu trang cũ /luyen/k3
  assert.equal(skillFromSlug("k3"), "plan_step_by_step");
  assert.equal(skillFromSlug("K4"), "ask_for_help");
  assert.equal(skillFromSlug("k5"), null);
  // mô-đun mới (01/11)
  assert.equal(skillFromSlug("nhin-tu-phia-nguoi-khac"), "see_other_side");
  assert.equal(skillFromSlug("noi-khong-voi-ap-luc"), "say_no_to_pressure");
  // đợt 2 (01/11)
  assert.equal(skillFromSlug("tin-minh-tien-bo"), "growth_mindset");
  assert.equal(skillFromSlug("cam-on-va-ghi-nhan"), "show_gratitude");
});
