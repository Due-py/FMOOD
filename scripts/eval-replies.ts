// Chạy bộ thử câu trả lời của Mây (gọi OpenAI thật, KHÔNG ghi vào cơ sở dữ liệu).
// Dùng: npm run eval:replies            (1 lần)
//       npm run eval:replies -- --lan 3 (3 lần liền)
// Tin nhắn mẫu ở lib/eval/reply-cases.ts, máy chấm ở lib/eval/reply-checks.ts.
import "./_env";
import { CHECK_LABEL } from "@/lib/eval/reply-checks";
import { runReplySuite } from "@/lib/eval/reply-run";

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const i = process.argv.indexOf("--lan");
  const rounds = i > 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 1;
  const tally: string[] = [];
  for (let round = 1; round <= rounds; round++) {
    const { model, results, passed, total } = await runReplySuite();
    console.log(`\n══════ Lần ${round} · ${model} ══════`);
    for (const r of results) {
      console.log(`${r.ok ? "OK  " : "SAI "} [${r.id}] ${r.message}`);
      console.log(`       Mây: ${r.reply.replace(/\s+/g, " ").slice(0, 400)}${r.error ? ` (lỗi: ${r.error})` : ""}`);
      for (const f of r.failed) console.log(`       ✗ ${CHECK_LABEL[f]}`);
    }
    console.log(`\nLần ${round}: đạt ${passed}/${total}`);
    tally.push(`${passed}/${total}`);
  }
  console.log(`\nTỔNG: ${tally.join(", ")}`);
}

main();
