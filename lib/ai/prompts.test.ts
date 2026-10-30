// Lời dặn của Mây: bối cảnh vòng hỗ trợ (cấu hình B) và lời dặn chung (cấu hình A). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompanionPrompt, DEFAULT_PERSONA, DEFAULT_RULES, loopContext, withoutLoopRules } from "./prompts";

test("cấu hình A bỏ đúng QT03–QT08, giữ quy tắc an toàn và xưng hô", () => {
  const a = withoutLoopRules(DEFAULT_RULES);
  for (const code of ["QT03", "QT04", "QT05", "QT06", "QT07", "QT08"]) assert.ok(!a.includes(`- ${code}`), code);
  for (const code of ["QT01", "QT02", "QT09", "QT10", "QT11", "QT12"]) assert.ok(a.includes(code), code);
  assert.ok(a.includes("KHÔNG chẩn đoán"));
});

test("khó khăn đã xác nhận và việc đã thử vào lời dặn; chưa thử không bị coi là thất bại", () => {
  const ctx = loopContext(
    { topicLabel: "Học tập", level: 4, difficulty: "học rồi mà sợ quên", tried: [{ title: "Chia nhỏ", result: "no_help" }, { title: "Hít thở", result: "not_yet" }] },
    undefined,
  );
  assert.ok(ctx.includes("«học rồi mà sợ quên»"));
  assert.ok(ctx.includes('"Chia nhỏ" (thử rồi nhưng chưa đỡ)'));
  assert.ok(ctx.includes('"Hít thở" (chưa thử)'));
  assert.ok(ctx.includes("KHÔNG gợi ý lại"));
});

test("nút Mây hiểu chưa đúng: bỏ cách hiểu cũ, nói lại, hỏi đã đúng chưa; Bỏ qua: không hỏi lại", () => {
  const c = loopContext(undefined, "correction");
  assert.ok(c.indexOf("Bỏ hẳn cách hiểu") < c.indexOf("Nói lại") && c.indexOf("Nói lại") < c.indexOf("đúng chưa?"));
  assert.match(loopContext(undefined, "skip"), /Không hỏi lại câu đó/);
  assert.equal(loopContext(undefined, undefined), "");
});

test("khó khăn xác nhận khi chưa lưu chuyện bận lòng: không bịa chủ đề, mức lo", () => {
  const p = buildCompanionPrompt({ persona: DEFAULT_PERSONA, rules: DEFAULT_RULES }, "Bạn thử", {
    worry: { topicLabel: null, level: null, difficulty: "chưa hiểu bài" },
  });
  assert.ok(!p.includes("mức lo null") && !p.includes('chủ đề "null"'));
  assert.ok(p.includes("«chưa hiểu bài»"));
});
