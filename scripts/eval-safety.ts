// Chấm thử bộ kiểm tra an toàn (cả 3 lớp, gọi OpenAI thật) trên các câu mẫu.
// Dùng: npm run eval:safety            (chạy 1 lần)
//       npm run eval:safety -- --lan 3 (chạy 3 lần liền, phải đúng hết cả 3)
// Khi sửa lời dặn phân loại (lib/ai/prompts.ts) hoặc đổi model, chạy lại để so sánh.
// Mọi câu dưới đây là câu tự đặt để thử, KHÔNG lấy từ tin nhắn của học sinh thật.
// Script không ghi gì vào cơ sở dữ liệu (chỉ đọc cài đặt an toàn).
//
// Hai bộ được chấm và báo RIÊNG:
//  - Bộ cũ (bộ phát triển, lib/eval/safety-cases.ts): đã dùng để sửa luật.
//  - Bộ mới (bộ kiểm tra, lib/eval/bo-moi/an-toan.json): người ngoài nhóm viết, nhóm không sửa luật theo bộ này.
// Mỗi lần chạy in bảng "mức mong đợi × mức web xếp", đếm riêng bỏ sót / nâng mức / báo nhầm,
// rồi tự lưu file kết quả có ngày và mã phiên bản vào ho-so-du-thi/3-kiem-thu/ket-qua/.
import "./_env";
import { chatModel, safetyModel } from "@/lib/ai/openai";
import { checkMessage } from "@/lib/safety/check";
import type { RiskLevel } from "@/lib/safety/keywords";
import { SAFETY_CASES, type SafetyCase } from "@/lib/eval/safety-cases";
import { LEVEL_LABEL, matrixMarkdown, OUTCOME_LABEL, outcomeOf, passes, safetyMatrix, type Outcome } from "@/lib/eval/safety-matrix";
import { newSafetyCases, rounds, saveResult, stamp, versionCode } from "./eval/chung";

const BATCH = 5;

type Row = { text: string; expected: RiskLevel; got: RiskLevel; outcome: Outcome; context: number; reasons: string[] };

async function runSet(cases: SafetyCase[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (let i = 0; i < cases.length; i += BATCH) {
    const batch = cases.slice(i, i + BATCH);
    const out = await Promise.all(batch.map(([text, , history = []]) => checkMessage(text, history)));
    batch.forEach(([text, expected, history = []], j) => {
      const got = out[j].level;
      rows.push({ text, expected, got, outcome: outcomeOf(expected, got), context: history.length, reasons: out[j].reasons });
    });
  }
  return rows;
}

function printSet(name: string, rows: Row[]) {
  console.log(`\n── ${name} (${rows.length} câu) ──`);
  for (const r of rows) {
    const ok = passes(r.outcome);
    const tag = r.outcome === "dung" ? "OK  " : ok ? "OK↑ " : "SAI ";
    console.log(`${tag} mong đợi=${r.expected.padEnd(7)} web xếp=${r.got.padEnd(7)} ${r.text}${r.context ? ` [sau ${r.context} tin]` : ""}`);
    if (r.reasons.length) console.log(`       lý do: ${r.reasons.join(" | ")}`);
  }
  if (rows.length) console.log(`\n${matrixMarkdown(safetyMatrix(rows))}`);
}

const rowTable = (rows: Row[]) =>
  [
    "| # | Câu thử | Mong đợi | Web xếp | Kết quả |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r, i) =>
        `| ${i + 1} | ${r.text.replace(/\|/g, "/")}${r.context ? ` *(sau ${r.context} tin)*` : ""} | ${LEVEL_LABEL[r.expected]} | ${LEVEL_LABEL[r.got]} | ${passes(r.outcome) ? OUTCOME_LABEL[r.outcome] : `**${OUTCOME_LABEL[r.outcome]}**`} |`,
    ),
  ].join("\n");

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const n = rounds();
  const fresh = newSafetyCases();
  const sets: { key: "cu" | "moi"; name: string; cases: SafetyCase[] }[] = [
    { key: "cu", name: "Bộ cũ (bộ phát triển, đã dùng để sửa luật)", cases: SAFETY_CASES },
    { key: "moi", name: "Bộ mới (người ngoài nhóm viết, chưa dùng để sửa)", cases: fresh.cases },
  ];
  const [classifier, chat] = await Promise.all([safetyModel(), chatModel()]);
  const version = versionCode();
  const runs: { round: number; sets: Record<string, Row[]> }[] = [];

  for (let round = 1; round <= n; round++) {
    console.log(`\n══════ Lần ${round} ══════`);
    const result: Record<string, Row[]> = {};
    for (const s of sets) {
      result[s.key] = s.cases.length ? await runSet(s.cases) : [];
      if (s.cases.length) printSet(s.name, result[s.key]);
      else console.log(`\n── ${s.name}: chưa có câu nào (chờ người ngoài nhóm viết vào lib/eval/bo-moi/an-toan.json) ──`);
    }
    runs.push({ round, sets: result });
  }

  const fails = (rows: Row[]) => rows.filter((r) => !passes(r.outcome)).length;
  const summary = sets.map((s) => `${s.name}: số câu sai mỗi lần ${s.cases.length ? runs.map((r) => fails(r.sets[s.key])).join(", ") : "(chưa có câu)"}`);
  console.log(`\nTỔNG: ${n} lần`);
  for (const line of summary) console.log(`  ${line}`);

  // ── lưu kết quả ──
  const t = stamp();
  const md = [
    `# Bộ thử an toàn · ${t.text}`,
    "",
    `Phiên bản: \`${version}\` (mã commit; "+sua" = có sửa chưa lưu phiên bản) · Lệnh: \`npm run eval:safety${n > 1 ? ` -- --lan ${n}` : ""}\``,
    `Mô hình phân loại: \`${classifier}\` · mô hình trò chuyện đang cài: \`${chat}\` · ${n} lần chạy.`,
    "",
    "Quy tắc chấm: **đạt** = không bỏ sót (không xếp thấp hơn mong đợi) và không báo nhầm câu bình thường. " +
      "Câu đáng lo bị xếp lên nguy hiểm vẫn đạt nhưng được đếm riêng ở cột **Nâng mức**, để “đúng hết” không che việc xếp sai mức.",
    "",
    "## Tổng hợp",
    "",
    ...summary.map((s) => `- ${s}`),
    ...runs.flatMap((run) => [
      "",
      `## Lần ${run.round}`,
      ...sets.flatMap((s) =>
        s.cases.length
          ? ["", `### ${s.name}`, "", matrixMarkdown(safetyMatrix(run.sets[s.key])), "", rowTable(run.sets[s.key])]
          : ["", `### ${s.name}`, "", "Chưa có câu nào. Bộ này để người ngoài nhóm viết (lib/eval/bo-moi/an-toan.json)."],
      ),
    ]),
  ].join("\n");
  const files = saveResult(`an-toan${n > 1 ? `-${n}-lan` : ""}`, md, {
    loai: "an-toan",
    thoiGian: t.text,
    phienBan: version,
    moHinhPhanLoai: classifier,
    soLan: n,
    boMoiNguoiViet: fresh.authors,
    lan: runs.map((r) => ({ lan: r.round, ...Object.fromEntries(sets.map((s) => [s.key, { bang: safetyMatrix(r.sets[s.key]), cau: r.sets[s.key] }])) })),
  });
  console.log(`\nĐã lưu: ${files.join(", ")}`);
  process.exitCode = runs.some((r) => sets.some((s) => fails(r.sets[s.key]) > 0)) ? 1 : 0;
}

main();
