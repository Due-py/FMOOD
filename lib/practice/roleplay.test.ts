// Tập nói: vai thầy cô (Demo 2) và vai bạn cùng lớp (3 mô-đun mới, chỉ với tình huống mẫu). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { keywordCheck } from "@/lib/safety/keywords";
import { casesForSkill, SKILL_IDS } from "@/lib/skills";
import { readTurns, ROLEPLAY, roleplayBlocked, roleplayOf, roleplayOpening, studentTurns, turnLabel } from "./roleplay";
import { AI_LIMITS, ROLEPLAY_STOPPED, roleplayStopped, aiAllowed } from "./state";

test("tập nói có ở mở lời nhờ người giúp (vai thầy cô) và 3 mô-đun mới (vai bạn cùng lớp), không ở mô-đun khác", () => {
  assert.equal(roleplayOf("ask_for_help")?.kind, "teacher");
  for (const s of ["listen_to_peer", "resolve_group_conflict", "say_no_to_pressure"] as const) assert.equal(roleplayOf(s)?.kind, "peer", s);
  assert.deepEqual(
    SKILL_IDS.filter((s) => roleplayOf(s)),
    ["ask_for_help", "listen_to_peer", "resolve_group_conflict", "say_no_to_pressure"],
  );
  for (const spec of Object.values(ROLEPLAY)) assert.equal(spec?.maxTurns, AI_LIMITS.roleplay);
});

test("vai bạn cùng lớp: mỗi tình huống mẫu của mô-đun có câu mở đầu riêng, câu mở đầu không chạm bộ lọc an toàn, giữ giới hạn cứng", () => {
  for (const [skill, spec] of Object.entries(ROLEPLAY) as [keyof typeof ROLEPLAY, (typeof ROLEPLAY)[keyof typeof ROLEPLAY]][]) {
    if (spec?.kind !== "peer") continue;
    const codes = casesForSkill(skill).map((c) => c.code);
    assert.deepEqual(Object.keys(spec.openingByCase).sort(), [...codes].sort(), skill);
    for (const code of codes) assert.equal(roleplayOpening(skill, code), spec.openingByCase[code]);
    for (const line of [spec.opening, ...Object.values(spec.openingByCase)]) assert.equal(keywordCheck(line).level, "none", line);
    assert.ok(spec.hardLimits.some((l) => l.includes("không bao giờ gọi \"em\"")), skill);
    assert.ok(spec.hardLimits.some((l) => l.includes("không nhận là AI trong vai")), skill);
    assert.equal(spec.label, `Bạn ${spec.persona} (vai)`);
  }
  assert.equal(roleplayOpening("ask_for_help", "TL11"), null);
});

test("vai bạn cùng lớp chỉ với tình huống mẫu; vai thầy cô như cũ (cả tình huống tự kể)", () => {
  assert.equal(roleplayBlocked("listen_to_peer", { own: false, caseCode: "TL19" }), null);
  assert.match(roleplayBlocked("listen_to_peer", { own: true, caseCode: null }) ?? "", /chỉ có khi bạn chọn tình huống mẫu/u);
  assert.match(roleplayBlocked("say_no_to_pressure", { own: false, caseCode: null }) ?? "", /tình huống mẫu/u);
  assert.equal(roleplayBlocked("ask_for_help", { own: true, caseCode: null }), null);
  assert.ok(roleplayBlocked("see_other_side", { own: false, caseCode: "TL13" }));
});

test("lượt đã lưu: dòng cũ (student / teacher) đọc như trước, thêm partner, bỏ lượt hỏng", () => {
  const old = [
    { role: "student", text: "Em chưa hiểu bài." },
    { role: "teacher", text: "Em vướng ở bước nào?" },
  ];
  assert.deepEqual(readTurns(old), old);
  assert.deepEqual(readTurns([{ role: "partner", text: "Chán ghê…" }, { role: "ai", text: "x" }, { role: "student", text: "" }, null, "x"]), [
    { role: "partner", text: "Chán ghê…" },
  ]);
  assert.deepEqual(readTurns(null), []);
  assert.equal(studentTurns(readTurns(old)), 1);
  assert.equal(turnLabel({ role: "teacher", text: "" }, null), "Thầy cô (vai)");
  assert.equal(turnLabel({ role: "partner", text: "" }, roleplayOf("listen_to_peer")), "Bạn An (vai)");
  assert.equal(turnLabel({ role: "student", text: "" }, roleplayOf("listen_to_peer")), "Bạn");
});

test("thoát vai: hết lượt tập nói và nhớ là đã dừng (sau khi tải lại trang)", () => {
  assert.equal(roleplayStopped({ roleplay: AI_LIMITS.roleplay }), false);
  assert.equal(roleplayStopped({ roleplay: ROLEPLAY_STOPPED }), true);
  assert.equal(aiAllowed("roleplay", { roleplay: ROLEPLAY_STOPPED }, "in_progress"), false);
});
