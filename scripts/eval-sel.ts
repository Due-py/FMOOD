// Chạy BỘ THỬ MẠCH SEL (lib/eval/sel-cases.ts) với cả ba nhân vật Sóc, Cú, Kiến (cùng các lựa chọn mặc định khác).
// Dùng: npm run eval:sel            (1 lần)
//       npm run eval:sel -- --lan 3 (3 lần)
// In nguyên văn câu trả lời để giáo viên tư vấn đọc; máy chấm chỉ bắt các lỗi rõ. Không ghi gì vào cơ sở dữ liệu.
import "./_env";
import { CHARACTER_KEYS, CHARACTERS, defaultStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { chatModel } from "@/lib/ai/openai";
import { CHECK_LABEL } from "@/lib/eval/reply-checks";
import { runSelSuite } from "@/lib/eval/reply-run";
import { SEL_CASES } from "@/lib/eval/sel-cases";
import { rounds, saveResult, stamp, versionCode } from "./eval/chung";

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const base = defaultStyle((await getPromptConfig()).styles);
  const model = await chatModel();
  const n = rounds();
  const runs: { round: number; character: string; passed: number; total: number; results: Awaited<ReturnType<typeof runSelSuite>>["results"] }[] = [];
  for (let round = 1; round <= n; round++) {
    for (const character of CHARACTER_KEYS) {
      const { results, passed, total } = await runSelSuite({ ...base, character });
      const name = CHARACTERS[character].name;
      console.log(`\n══════ Lần ${round} · ${name} · đạt ${passed}/${total} ══════`);
      for (const r of results) {
        console.log(`${r.ok ? "OK  " : "SAI "} [${r.id} · ${r.step}] ${r.message}`);
        console.log(`       ${name}: ${r.reply.replace(/\s+/g, " ").slice(0, 500)}${r.error ? ` (lỗi: ${r.error})` : ""}`);
        for (const f of r.failed) console.log(`       ✗ ${CHECK_LABEL[f]}`);
      }
      runs.push({ round, character: name, passed, total, results });
    }
  }
  const tally = runs.map((r) => `${r.character} ${r.passed}/${r.total}`).join(", ");
  console.log(`\nTỔNG: ${tally}`);
  const md = [
    `# Bộ thử mạch SEL (góp ý giáo viên tư vấn 31/10) · ${stamp().text}`,
    "",
    `Phiên bản: \`${versionCode()}\` · Mô hình: \`${model}\` · ${SEL_CASES.length} ca × 3 nhân vật × ${n} lần. Kết quả máy chấm: **${tally}**`,
    "",
    "Máy chấm chỉ bắt lỗi rõ (hỏi dồn, chuyển người lớn quá sớm, ép hết sợ, bảo nghĩ lại khi bị trêu thật). Đúng tinh thần SEL hay không: giáo viên tư vấn đọc nguyên văn bên dưới.",
    "",
    ...runs.flatMap((run) => [
      `## Lần ${run.round} · ${run.character}: đạt ${run.passed}/${run.total}`,
      "",
      "| Mã | Bước | Học sinh nhắn | Trợ lý trả lời (nguyên văn) | Máy chấm |",
      "|---|---|---|---|---|",
      ...run.results.map(
        (r) =>
          `| ${r.id} | ${r.step} | ${r.message} | ${(r.reply || `(lỗi: ${r.error})`).replace(/\s+/g, " ").replace(/\|/g, "/")} | ${r.ok ? "Đạt" : `**Chưa đạt**: ${r.failed.map((f) => CHECK_LABEL[f]).join("; ")}`} |`,
      ),
      "",
    ]),
  ].join("\n");
  console.log(`\nĐã lưu: ${saveResult("mach-sel", md, runs).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
