// Chạy bộ thử câu trả lời của trợ lý (gọi OpenAI thật, KHÔNG ghi vào cơ sở dữ liệu).
// Dùng: npm run eval:replies            (1 lần)
//       npm run eval:replies -- --lan 3 (3 lần liền)
//       npm run eval:replies -- --to-hop cu,ngan,thang,tu_lo   (một tổ hợp nhân vật / độ dài / dẫn dắt / động lực)
//       npm run eval:replies -- --the      (chạy thêm 6 ca thẻ gợi ý GOAL / SKILL / END, Bước 10.5)
//       npm run eval:replies -- --ba-nhan-vat   (P2: chạy bộ 20 câu một lượt cho MỖI nhân vật Sóc, Cú, Kiến, cùng tin nhắn;
//                                                độ dài, cách dẫn dắt, động lực để mặc định admin đặt, hoặc theo --to-hop nếu có)
// Tin nhắn mẫu ở lib/eval/reply-cases.ts, máy chấm ở lib/eval/reply-checks.ts.
// Chạy xong tự lưu file kết quả (nguyên văn từng câu trả lời) có ngày và mã phiên bản vào ho-so-du-thi/3-kiem-thu/ket-qua/.
import "./_env";
import { CHARACTER_KEYS, CHARACTERS, defaultStyle, type ChatStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { CHECK_LABEL } from "@/lib/eval/reply-checks";
import { runCardSuite, runReplySuite, type CardResult, type ReplyResult } from "@/lib/eval/reply-run";
import { rounds, saveResult, stamp, styleArg, versionCode } from "./eval/chung";

/** Ngưỡng đạt mỗi lần chạy bộ 20 câu. */
const PASS_AT = 18;

/** Tổ hợp cần chạy: một tổ hợp (hoặc mặc định), hoặc 3 nhân vật với cùng các lựa chọn còn lại khi có --ba-nhan-vat. */
async function stylesToRun(style: ChatStyle | null, threeCharacters: boolean): Promise<(ChatStyle | null)[]> {
  if (!threeCharacters) return [style];
  const base = style ?? defaultStyle((await getPromptConfig()).styles);
  return CHARACTER_KEYS.map((character) => ({ ...base, character }));
}

type RunRow = { round: number; model: string; style: string; character?: string; passed: number; total: number; results: ReplyResult[]; cards: CardResult[] };

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const n = rounds();
  const style = styleArg();
  const withCards = process.argv.includes("--the");
  const threeCharacters = process.argv.includes("--ba-nhan-vat");
  const styles = await stylesToRun(style, threeCharacters);
  const runs: RunRow[] = [];
  for (let round = 1; round <= n; round++) {
    for (const one of styles) {
      const { model, style: used, results, passed, total } = await runReplySuite(one);
      const cards = withCards ? (await runCardSuite(one)).results : [];
      const character = one && threeCharacters ? CHARACTERS[one.character].name : undefined;
      console.log(`\n══════ Lần ${round} · ${model} · ${character ? `nhân vật ${character} · ` : ""}tổ hợp ${used} ══════`);
      for (const r of results) {
        console.log(`${r.ok ? "OK  " : "SAI "} [${r.id}] ${r.message}`);
        console.log(`       Trợ lý: ${r.reply.replace(/\s+/g, " ").slice(0, 400)}${r.error ? ` (lỗi: ${r.error})` : ""}`);
        for (const f of r.failed) console.log(`       ✗ ${CHECK_LABEL[f]}`);
      }
      for (const c of cards) console.log(`${c.ok ? "OK  " : "SAI "} [thẻ ${c.id}] mong ${c.expect}, có: ${c.got.join(", ") || "không có thẻ"}${c.error ? ` (lỗi: ${c.error})` : ""}`);
      console.log(`\nLần ${round}${character ? ` · ${character}` : ""}: đạt ${passed}/${total}${withCards ? ` · thẻ đúng ${cards.filter((c) => c.ok).length}/${cards.length}` : ""}`);
      runs.push({ round, model, style: used, character, passed, total, results, cards });
    }
  }
  const tally = runs.map((r) => `${r.character ? `${r.character} ` : ""}${r.passed}/${r.total}`).join(", ");
  console.log(`\nTỔNG: ${tally}`);
  // P2: báo riêng từng nhân vật (cùng 20 tin nhắn, chỉ đổi giọng)
  const perCharacter = threeCharacters
    ? CHARACTER_KEYS.map((k) => {
        const mine = runs.filter((r) => r.character === CHARACTERS[k].name);
        const ok = mine.every((r) => r.passed >= PASS_AT);
        return `${CHARACTERS[k].emoji} ${CHARACTERS[k].name}: ${mine.map((r) => `${r.passed}/${r.total}`).join(", ")}${ok ? "" : ` (CHƯA ĐẠT ngưỡng ${PASS_AT}/20)`}`;
      })
    : [];
  for (const line of perCharacter) console.log(`  ${line}`);

  const t = stamp();
  const version = versionCode();
  const usedStyles = [...new Set(runs.map((r) => r.style))].map((s) => `\`${s}\``).join(", ");
  const md = [
    `# Bộ thử câu trả lời của trợ lý · ${t.text}`,
    "",
    `Phiên bản: \`${version}\` · Lệnh: \`npm run eval:replies -- ${process.argv.slice(2).join(" ")}\` · Mô hình: \`${runs[0]?.model}\` · Tổ hợp: ${usedStyles}`,
    `Ngưỡng: ít nhất ${PASS_AT}/20 mỗi lần${threeCharacters ? ", với từng nhân vật" : ""}. Kết quả: **${tally}**`,
    ...(threeCharacters ? ["", "## Theo nhân vật (cùng 20 tin nhắn, chỉ đổi nhân vật)", "", ...perCharacter.map((l) => `- ${l}`)] : []),
    "",
    ...runs.flatMap((run) => [
      `## Lần ${run.round}${run.character ? ` · ${run.character} (\`${run.style}\`)` : ""}: đạt ${run.passed}/${run.total}`,
      "",
      "| # | Mã | Tin nhắn | Câu trả lời của trợ lý (nguyên văn) | Kết quả |",
      "|---|---|---|---|---|",
      ...run.results.map(
        (r, i) =>
          `| ${i + 1} | ${r.id} | ${r.message} | ${(r.reply || `(lỗi: ${r.error})`).replace(/\s+/g, " ").replace(/\|/g, "/")} | ${r.ok ? "Đạt" : `**Chưa đạt**: ${r.failed.map((f) => CHECK_LABEL[f]).join("; ")}`} |`,
      ),
      "",
      ...(run.cards.length
        ? [
            `### Thẻ gợi ý: đúng ${run.cards.filter((c) => c.ok).length}/${run.cards.length} (ngưỡng ≥ 5/6, 0 thẻ ở ca đáng lo)`,
            "",
            "| Mã | Tin nhắn | Mong đợi | Thẻ có | Câu trả lời (nguyên văn) |",
            "|---|---|---|---|---|",
            ...run.cards.map(
              (c) =>
                `| ${c.id} | ${c.message} | ${c.expect} | ${c.got.join(", ") || "không"} | ${(c.reply || `(lỗi: ${c.error})`).replace(/\s+/g, " ").replace(/\|/g, "/")} |`,
            ),
            "",
          ]
        : []),
    ]),
  ].join("\n");
  const kind = threeCharacters ? "-ba-nhan-vat" : style ? `-${runs[0]?.style.replace(/\|/g, "-")}` : "";
  const files = saveResult(`cau-tra-loi${kind}${n > 1 ? `-${n}-lan` : ""}`, md, { loai: "cau-tra-loi", thoiGian: t.text, phienBan: version, lan: runs });
  console.log(`Đã lưu: ${files.join(", ")}`);
}

main();
