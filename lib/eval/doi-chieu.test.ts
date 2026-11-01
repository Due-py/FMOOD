// Bộ đối chiếu AI / không AI (P1): đủ 8 kịch bản, 2 mỗi kỹ năng, bài lần 1 đúng ô của mô-đun, xáo chữ tái lập được. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanAnswers } from "@/lib/practice/state";
import { casesForSkill, SKILL_IDS, SKILLS } from "@/lib/skills";
import { assignLetters, chatbotPrompts, DOI_CHIEU_CASES, LETTERS, situationOfCase, TOOLS } from "./doi-chieu-cases";

test("8 kịch bản cố định, 2 mỗi kỹ năng Demo 2, mã không trùng, tình huống mẫu đúng kỹ năng", () => {
  assert.equal(DOI_CHIEU_CASES.length, 8);
  assert.equal(new Set(DOI_CHIEU_CASES.map((c) => c.id)).size, 8);
  // bộ đối chiếu soạn cho 4 mô-đun Demo 2 (31/10); 5 mô-đun mới chưa có kịch bản đối chiếu
  for (const s of SKILL_IDS) {
    const n = DOI_CHIEU_CASES.filter((c) => c.skill === s).length;
    assert.equal(n, ["recognize_feelings_thoughts", "calm_in_the_moment", "plan_step_by_step", "ask_for_help"].includes(s) ? 2 : 0, s);
  }
  for (const c of DOI_CHIEU_CASES) {
    assert.ok(casesForSkill(c.skill).some((x) => x.code === c.caseCode), `${c.id}: ${c.caseCode}`);
    assert.ok(situationOfCase(c).length > 10, c.id);
  }
});

test("bài lần 1 chỉ dùng ô của mô-đun, đã gọn sẵn; ô làm hộ có thật; lời nhờ đúng là đòi làm hộ", () => {
  for (const c of DOI_CHIEU_CASES) {
    assert.deepEqual(cleanAnswers(c.skill, c.banNhap), c.banNhap, c.id);
    assert.ok(Object.keys(c.banNhap).length >= 3, c.id);
    assert.ok(SKILLS[c.skill].fields.some((f) => f.key === c.oLamHo), `${c.id}: ô ${c.oLamHo}`);
    assert.match(c.lamHo, /(hộ|giùm|giúp mình .*luôn|luôn)/u, c.id);
  }
});

test("lời nhắn cho chatbot chung chứa đủ tình huống và bài lần 1, lượt 2 là lời nhờ nguyên văn", () => {
  for (const c of DOI_CHIEU_CASES) {
    const [first, second] = chatbotPrompts(c);
    assert.ok(first.includes(situationOfCase(c)), c.id);
    for (const v of Object.values(c.banNhap)) assert.ok(first.includes(v), `${c.id}: ${v}`);
    assert.equal(second, c.lamHo);
  }
});

test("xáo chữ X / Y / Z: mỗi kịch bản đủ 3 công cụ, cùng hạt giống thì cùng kết quả", () => {
  const ids = DOI_CHIEU_CASES.map((c) => c.id);
  const a = assignLetters(ids, 12345);
  assert.deepEqual(assignLetters(ids, 12345), a);
  for (const id of ids) assert.deepEqual(LETTERS.map((l) => a[id][l]).sort(), [...TOOLS].sort(), id);
  // không phải lúc nào F-Mood cũng là X
  assert.ok(new Set(ids.map((id) => a[id].X)).size > 1);
});
