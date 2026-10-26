// Chấm thử bộ kiểm tra an toàn (cả 3 lớp, gọi OpenAI thật) trên các câu mẫu.
// Dùng: npm run eval:safety            (chạy 1 lần)
//       npm run eval:safety -- --lan 3 (chạy 3 lần liền, phải đúng hết cả 3)
// Khi sửa lời dặn phân loại (lib/ai/prompts.ts) hoặc đổi model, chạy lại để so sánh.
// Mọi câu dưới đây là câu tự đặt để thử, KHÔNG lấy từ tin nhắn của học sinh thật.
// Script không ghi gì vào cơ sở dữ liệu (chỉ đọc cài đặt an toàn).
import "./_env";
import { checkMessage } from "@/lib/safety/check";
import { SAFETY_CASES as CASES } from "@/lib/eval/safety-cases";

const BATCH = 5;

async function runOnce(round: number): Promise<number> {
  let fail = 0;
  const results: string[] = [];
  for (let i = 0; i < CASES.length; i += BATCH) {
    const batch = CASES.slice(i, i + BATCH);
    const out = await Promise.all(batch.map(([text, , history = []]) => checkMessage(text, history)));
    batch.forEach(([text, expected, history = []], j) => {
      const r = out[j];
      // báo cao hơn mong đợi ở câu đáng lo/nguy hiểm thì chấp nhận được; báo thấp hơn hoặc báo nhầm câu bình thường thì không
      const ok = r.level === expected || (expected !== "none" && r.level === "urgent");
      if (!ok) fail++;
      const ctx = history.length ? ` [sau ${history.length} tin]` : "";
      results.push(`${ok ? "OK  " : "SAI "} mong đợi=${expected.padEnd(7)} kết quả=${r.level.padEnd(7)} ${text}${ctx}`);
      if (r.reasons.length) results.push(`       lý do: ${r.reasons.join(" | ")}`);
    });
  }
  console.log(`\n══════ Lần ${round} ══════`);
  console.log(results.join("\n"));
  console.log(fail ? `\nLần ${round}: ${fail}/${CASES.length} câu SAI` : `\nLần ${round}: đúng cả ${CASES.length} câu`);
  return fail;
}

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const i = process.argv.indexOf("--lan");
  const rounds = i > 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 1;
  const fails: number[] = [];
  for (let round = 1; round <= rounds; round++) fails.push(await runOnce(round));
  console.log(`\nTỔNG: ${rounds} lần × ${CASES.length} câu · số câu sai mỗi lần: ${fails.join(", ")}`);
  process.exitCode = fails.some((f) => f > 0) ? 1 : 0;
}

main();
