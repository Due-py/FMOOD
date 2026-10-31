// Chạy BỘ THỬ MẠCH SEL (lib/eval/sel-cases.ts) với cả ba nhân vật Sóc, Cú, Kiến (cùng các lựa chọn mặc định khác).
// Dùng: npm run eval:sel                          (1 lần)
//       npm run eval:sel -- --lan 3               (3 lần)
//       npm run eval:sel -- --cham                (thêm tầng AI chấm sư phạm + phiếu cho người chấm, lib/eval/sel-judge.ts)
//       npm run eval:sel -- --khong-dieu-phoi     (cấu hình A của phép so sánh: chỉ lời dặn, không bộ điều phối)
// In nguyên văn câu trả lời để giáo viên tư vấn đọc; máy chấm chỉ bắt các lỗi rõ. Không ghi gì vào cơ sở dữ liệu.
// Phép so sánh A/B: chạy một lần có --khong-dieu-phoi --cham và một lần chỉ --cham, cùng số lần; hai cấu hình được chấm theo
// cùng nhiệm vụ (bước mong đợi của ca), cùng lớp an toàn.
import "./_env";
import { writeFileSync } from "node:fs";
import { CHARACTER_KEYS, CHARACTERS, defaultStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { chatModel } from "@/lib/ai/openai";
import { CHECK_LABEL } from "@/lib/eval/reply-checks";
import { judgeReply, prepareSelCases, runSelSuite, type SelResult } from "@/lib/eval/reply-run";
import { humanSheet, JUDGE_CRITERIA, judgeTotal, type JudgeScores } from "@/lib/eval/sel-judge";
import { MOVE_LABEL } from "@/lib/sel/engine";
import { SEL_CASES } from "@/lib/eval/sel-cases";
import { rounds, saveResult, stamp, versionCode } from "./eval/chung";

type Judged = SelResult & { code: string; judge?: { scores: JudgeScores; reason: string } | { error: string } };

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const judge = process.argv.includes("--cham");
  const engine = !process.argv.includes("--khong-dieu-phoi");
  const config = engine ? "B (lời dặn + bộ điều phối)" : "A (chỉ lời dặn)";
  const base = defaultStyle((await getPromptConfig()).styles);
  const model = await chatModel();
  const n = rounds();
  const runs: { round: number; character: string; passed: number; total: number; results: Judged[] }[] = [];
  let seq = 0;
  for (let round = 1; round <= n; round++) {
    // nhận diện lượt và chọn bước: một lần cho cả ba nhân vật (cùng tin nhắn, cùng bước)
    const prepared = await prepareSelCases();
    for (const character of CHARACTER_KEYS) {
      const { results, passed, total } = await runSelSuite({ ...base, character }, prepared, { engine });
      const judged: Judged[] = await Promise.all(
        results.map(async (r) => {
          const code = `S${String(++seq).padStart(3, "0")}`;
          if (!judge || !r.reply) return { ...r, code };
          try {
            return { ...r, code, judge: await judgeReply(r) };
          } catch (e) {
            return { ...r, code, judge: { error: e instanceof Error ? e.message.slice(0, 120) : "lỗi" } };
          }
        }),
      );
      const name = CHARACTERS[character].name;
      console.log(`\n══════ Lần ${round} · ${name} · cấu hình ${config} · máy chấm đạt ${passed}/${total} ══════`);
      for (const r of judged) {
        console.log(`${r.ok ? "OK  " : "SAI "} [${r.code} · ${r.id} · ${r.step}] ${r.message}`);
        console.log(`       bước: ${r.move ? MOVE_LABEL[r.move] : "(không có)"}${r.expect ? ` · mong đợi: ${r.expect.map((m) => MOVE_LABEL[m]).join(" / ")}${r.moveOk === false ? " ✗" : ""}` : ""} · mức an toàn: ${r.level}`);
        console.log(`       ${name}: ${r.reply.replace(/\s+/g, " ").slice(0, 500)}${r.error ? ` (lỗi: ${r.error})` : ""}`);
        for (const f of r.failed) console.log(`       ✗ ${CHECK_LABEL[f]}`);
        if (r.judge) console.log(`       AI chấm: ${"error" in r.judge ? `lỗi: ${r.judge.error}` : `${scoreText(r.judge.scores)} · ${r.judge.reason}`}`);
      }
      runs.push({ round, character: name, passed, total, results: judged });
    }
  }
  const tally = runs.map((r) => `${r.character} ${r.passed}/${r.total}`).join(", ");
  const all = runs.flatMap((r) => r.results);
  const scored = all.flatMap((r) => (r.judge && !("error" in r.judge) ? [r.judge.scores] : []));
  const judgeSummary = scored.length
    ? `AI chấm ${scored.length} câu: ${JUDGE_CRITERIA.map((c) => `${c.label} ${avg(scored.map((s) => s[c.key]))}/${c.max}`).join(" · ")} · tổng ${Math.round(avg(scored.map((s) => judgeTotal(s).rate)) * 100)}%`
    : "";
  console.log(`\nTỔNG (${config}): ${tally}${judgeSummary ? `\n${judgeSummary}` : ""}`);
  const md = [
    `# Bộ thử mạch SEL (góp ý giáo viên tư vấn 31/10) · ${stamp().text}`,
    "",
    `Phiên bản: \`${versionCode()}\` · Mô hình: \`${model}\` · Cấu hình ${config} · ${SEL_CASES.length} ca × 3 nhân vật × ${n} lần. Kết quả máy chấm: **${tally}**`,
    ...(judgeSummary ? ["", `**${judgeSummary}** (AI chấm chỉ được tin khi đồng thuận đủ cao với người chấm trên phiếu kèm theo).`] : []),
    "",
    "Máy chấm bắt lỗi rõ (hỏi dồn, chuyển người lớn quá sớm, ép hết sợ, bảo nghĩ lại khi bị trêu thật) và yêu cầu cấu trúc của bước được giao. Đúng tinh thần SEL hay không: giáo viên tư vấn đọc nguyên văn bên dưới.",
    "",
    ...runs.flatMap((run) => [
      `## Lần ${run.round} · ${run.character}: đạt ${run.passed}/${run.total}`,
      "",
      `| Mã chấm | Ca | Nhánh | Học sinh nhắn | Bước bộ điều phối chọn | Trợ lý trả lời (nguyên văn) | Máy chấm |${judge ? " AI chấm |" : ""}`,
      `|---|---|---|---|---|---|---|${judge ? "---|" : ""}`,
      ...run.results.map(
        (r) =>
          `| ${r.code} | ${r.id} | ${r.step} | ${r.message} | ${r.move ? MOVE_LABEL[r.move] : "–"}${r.moveOk === false ? ` (mong đợi: ${(r.expect ?? []).map((m) => MOVE_LABEL[m]).join(" / ")})` : ""} | ${(r.reply || `(lỗi: ${r.error})`).replace(/\s+/g, " ").replace(/\|/g, "/")} | ${r.ok ? "Đạt" : `**Chưa đạt**: ${[...r.failed.map((f) => CHECK_LABEL[f]), ...(r.moveOk === false ? ["bước chưa đúng"] : [])].join("; ")}`} |${judge ? ` ${r.judge ? ("error" in r.judge ? `lỗi: ${r.judge.error}` : `${scoreText(r.judge.scores)}: ${r.judge.reason.replace(/\|/g, "/")}`) : "–"} |` : ""}`,
      ),
      "",
    ]),
  ].join("\n");
  const files = saveResult(engine ? "mach-sel" : "mach-sel-khong-dieu-phoi", md, runs);
  if (judge) {
    // phiếu người chấm: cùng mã chấm, không có điểm của AI
    const sheet = files[0].replace(/\.md$/, "_phieu-nguoi-cham.csv");
    writeFileSync(sheet, humanSheet(all.filter((r) => r.reply).map((r) => ({ code: r.code, caseId: r.id, message: r.message, task: r.task, reply: r.reply }))), "utf8");
    files.push(sheet);
  }
  console.log(`\nĐã lưu: ${files.join(", ")}`);
}

const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)) * 100) / 100;
const scoreText = (s: JudgeScores) => JUDGE_CRITERIA.map((c) => `${c.key} ${s[c.key]}/${c.max}`).join(", ");

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
