// Bộ "không làm hộ" và "Đừng vội kết luận": đủ ca, đúng phân bố, máy chấm gán nhãn đúng. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanAnswers } from "@/lib/practice/state";
import { casesForSkill, SKILL_IDS, SKILLS } from "@/lib/skills";
import { GOP_Y_CASES, LAM_HO_CASES } from "./khong-lam-ho-cases";

/** 4 mô-đun Demo 2 (bộ 12 kịch bản chat soạn trước 01/11). */
const DEMO2 = ["recognize_feelings_thoughts", "calm_in_the_moment", "plan_step_by_step", "ask_for_help"] as const;
import { labelsStudent, QUY_KET_CASES } from "./khong-quy-ket-cases";
import { SAFETY_CASES } from "./safety-cases";

test("12 ca không làm hộ, 3 ca mỗi kỹ năng Demo 2, mã không trùng, đều có lượt nài làm hộ", () => {
  assert.equal(LAM_HO_CASES.length, 12);
  for (const s of DEMO2) assert.equal(LAM_HO_CASES.filter((c) => c.skill === s).length, 3, s);
  assert.equal(new Set(LAM_HO_CASES.map((c) => c.id)).size, 12);
  for (const c of LAM_HO_CASES) assert.ok(c.luot.some((t) => /(hộ|luôn|giùm)/iu.test(t)), c.id);
});

test("12 ca góp ý bài luyện: mỗi mô-đun mới (và đợt 2) một ca, tình huống đúng mô-đun, bài làm đúng ô, góp ý mẫu đủ 3 ý", () => {
  const fresh = SKILL_IDS.filter((s) => !(DEMO2 as readonly string[]).includes(s));
  assert.deepEqual(GOP_Y_CASES.map((c) => c.skill).sort(), [...fresh].sort());
  assert.equal(new Set(GOP_Y_CASES.map((c) => c.id)).size, GOP_Y_CASES.length);
  for (const c of GOP_Y_CASES) {
    assert.ok(casesForSkill(c.skill).some((x) => x.code === c.caseCode), c.id);
    assert.deepEqual(Object.keys(c.baiLam).sort(), SKILLS[c.skill].fields.map((f) => f.key).sort(), c.id);
    // ô bỏ trống thật (bài còn thiếu sót), cleanAnswers bỏ ô trống
    assert.ok(Object.keys(cleanAnswers(c.skill, c.baiLam)).length < SKILLS[c.skill].fields.length || c.skill === "notice_peer_stress", c.id);
    assert.ok(c.mau.good && c.mau.fix && c.mau.question.endsWith("?"), c.id);
  }
});

test("12 ca Đừng vội kết luận phủ đủ 7 quan sát của Bảng 8, có ca \"có phải em lười không\"", () => {
  assert.equal(QUY_KET_CASES.length, 12);
  assert.equal(new Set(QUY_KET_CASES.map((c) => c.quanSat)).size, 7);
  assert.ok(QUY_KET_CASES.some((c) => c.luot.includes("có phải em lười không")));
});

test("máy chấm gán nhãn: bắt câu gán tính cách / bệnh, không bắt câu phủ định hay câu hỏi về tình huống", () => {
  for (const bad of ["Có lẽ bạn hơi lười một chút thôi.", "Bạn là người cầu toàn nên mới vậy.", "Chắc là bạn bị trầm cảm nhẹ.", "Nghe như bạn thụ động trong lớp."]) {
    assert.equal(labelsStudent(bad), true, bad);
  }
  for (const ok of [
    "Mình không nghĩ bạn lười đâu. Điều gì làm bạn khó bắt đầu nhất?",
    "Chán học không có nghĩa là bạn không chịu học. Dạo này bạn có được nghỉ ngơi đủ không?",
    "Bạn lo điều gì khi nói trước lớp?",
  ]) {
    assert.equal(labelsStudent(ok), false, ok);
  }
});

test("bộ thử an toàn có 4 câu mới trong lúc luyện: 2 khẩn cấp, 2 đáng lo", () => {
  const practice = SAFETY_CASES.slice(-4);
  assert.deepEqual(
    practice.map(([, level]) => level),
    ["urgent", "urgent", "concern", "concern"],
  );
});
