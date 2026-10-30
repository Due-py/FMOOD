// Chạy bộ thử câu trả lời của Mây (gọi OpenAI thật, KHÔNG ghi vào cơ sở dữ liệu).
// Dùng: npm run eval:replies            (1 lần)
//       npm run eval:replies -- --lan 3 (3 lần liền)
// Tin nhắn mẫu ở lib/eval/reply-cases.ts, máy chấm ở lib/eval/reply-checks.ts.
// Chạy xong tự lưu file kết quả (nguyên văn từng câu trả lời) có ngày và mã phiên bản vào ho-so-du-thi/3-kiem-thu/ket-qua/.
import "./_env";
import { CHECK_LABEL } from "@/lib/eval/reply-checks";
import { runReplySuite, type ReplyResult } from "@/lib/eval/reply-run";
import { rounds, saveResult, stamp, versionCode } from "./eval/chung";

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const n = rounds();
  const runs: { round: number; model: string; passed: number; total: number; results: ReplyResult[] }[] = [];
  for (let round = 1; round <= n; round++) {
    const { model, results, passed, total } = await runReplySuite();
    console.log(`\n══════ Lần ${round} · ${model} ══════`);
    for (const r of results) {
      console.log(`${r.ok ? "OK  " : "SAI "} [${r.id}] ${r.message}`);
      console.log(`       Mây: ${r.reply.replace(/\s+/g, " ").slice(0, 400)}${r.error ? ` (lỗi: ${r.error})` : ""}`);
      for (const f of r.failed) console.log(`       ✗ ${CHECK_LABEL[f]}`);
    }
    console.log(`\nLần ${round}: đạt ${passed}/${total}`);
    runs.push({ round, model, passed, total, results });
  }
  const tally = runs.map((r) => `${r.passed}/${r.total}`).join(", ");
  console.log(`\nTỔNG: ${tally}`);

  const t = stamp();
  const version = versionCode();
  const md = [
    `# Bộ thử câu trả lời của Mây · ${t.text}`,
    "",
    `Phiên bản: \`${version}\` · Lệnh: \`npm run eval:replies${n > 1 ? ` -- --lan ${n}` : ""}\` · Mô hình: \`${runs[0]?.model}\``,
    `Ngưỡng: ít nhất 18/20 mỗi lần. Kết quả: **${tally}**`,
    "",
    ...runs.flatMap((run) => [
      `## Lần ${run.round}: đạt ${run.passed}/${run.total}`,
      "",
      "| # | Mã | Tin nhắn | Câu trả lời của Mây (nguyên văn) | Kết quả |",
      "|---|---|---|---|---|",
      ...run.results.map(
        (r, i) =>
          `| ${i + 1} | ${r.id} | ${r.message} | ${(r.reply || `(lỗi: ${r.error})`).replace(/\s+/g, " ").replace(/\|/g, "/")} | ${r.ok ? "Đạt" : `**Chưa đạt**: ${r.failed.map((f) => CHECK_LABEL[f]).join("; ")}`} |`,
      ),
      "",
    ]),
  ].join("\n");
  const files = saveResult(`cau-tra-loi${n > 1 ? `-${n}-lan` : ""}`, md, { loai: "cau-tra-loi", thoiGian: t.text, phienBan: version, lan: runs });
  console.log(`Đã lưu: ${files.join(", ")}`);
}

main();
