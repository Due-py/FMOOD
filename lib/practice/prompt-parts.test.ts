// Lời dặn góp ý và vai bạn cùng lớp dựng từ dữ liệu mô-đun, không rẽ nhánh theo mô-đun. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CASEL, subskill } from "@/lib/sel/casel";
import { SKILL_IDS, SKILLS } from "@/lib/skills";
import { feedbackRubric, partnerInstructions } from "./prompt-parts";
import { ROLEPLAY } from "./roleplay";

test("lời dặn góp ý của mọi mô-đun: mục tiêu, biểu hiện quan sát được của năng lực CASEL chính, đủ tiêu chí; không mã cũ", () => {
  for (const k of SKILL_IDS) {
    const r = feedbackRubric(k);
    assert.ok(r.includes(subskill(k).objective), k);
    for (const o of CASEL[subskill(k).primary].observable) assert.ok(r.includes(o), `${k}: ${o}`);
    for (const c of SKILLS[k].criteria) assert.ok(r.includes(c), `${k}: ${c}`);
    assert.doesNotMatch(r, /\bK[1-4]\b/, k);
    assert.equal(r.includes("ƯU TIÊN"), Boolean(SKILLS[k].feedbackPriority), k);
  }
  // tiêu chí có mã CASEL: kèm tên kỹ năng thành phần
  assert.ok(feedbackRubric("say_no_to_pressure").includes("(CASEL: Chống lại áp lực xã hội tiêu cực)"));
  assert.ok(feedbackRubric("notice_peer_stress").includes("Khi nào nhờ người lớn"));
});

test("lời dặn vai bạn cùng lớp: đúng nhân vật, giới hạn cứng, quy tắc thoát vai, lượt cuối thì kết thúc", () => {
  for (const spec of Object.values(ROLEPLAY)) {
    if (spec?.kind !== "peer") continue;
    const mid = partnerInstructions(spec, 2);
    const last = partnerInstructions(spec, spec.maxTurns);
    assert.ok(mid.includes(`bạn đóng vai ${spec.persona.toUpperCase()}`), spec.persona);
    for (const l of spec.hardLimits) assert.ok(mid.includes(l), l);
    assert.ok(mid.includes("\"outOfRole\": true"), spec.persona);
    assert.ok(mid.includes(`lượt thứ 2/${spec.maxTurns}`));
    assert.ok(!mid.includes("nói câu kết thúc tự nhiên, không hỏi thêm"));
    assert.ok(last.includes("nói câu kết thúc tự nhiên, không hỏi thêm"));
  }
});
