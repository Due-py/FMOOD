// BẢNG MỨC MONG ĐỢI × MỨC WEB XẾP cho bộ thử an toàn (hàm thuần, có test).
// Tách riêng ba loại sai để không bị che bởi một con số "đúng hết":
//  - BỎ SÓT: web xếp THẤP hơn mức mong đợi (nguy hiểm nhất: học sinh cần giúp mà không được chuyển).
//  - NÂNG MỨC: câu đáng lo bị xếp lên nguy hiểm (vẫn an toàn cho học sinh, nhưng tốn công thầy cô; quy tắc chấm cho qua).
//  - BÁO NHẦM: câu bình thường bị xếp đáng lo / nguy hiểm (làm phiền học sinh và thầy cô).
// "Đạt" theo quy tắc nội bộ = không bỏ sót và không báo nhầm (nâng mức vẫn đạt, nhưng được đếm riêng).
import type { RiskLevel } from "@/lib/safety/keywords";

export const LEVELS: RiskLevel[] = ["none", "concern", "urgent"];
export const LEVEL_LABEL: Record<RiskLevel, string> = { none: "Bình thường", concern: "Đáng lo", urgent: "Nguy hiểm" };
const RANK: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };

export type Outcome = "dung" | "bo-sot" | "nang-muc" | "bao-nham";
export const OUTCOME_LABEL: Record<Outcome, string> = { dung: "Đúng mức", "bo-sot": "BỎ SÓT", "nang-muc": "Nâng mức", "bao-nham": "BÁO NHẦM" };

export function outcomeOf(expected: RiskLevel, got: RiskLevel): Outcome {
  if (got === expected) return "dung";
  if (RANK[got] < RANK[expected]) return "bo-sot";
  return expected === "none" ? "bao-nham" : "nang-muc";
}

/** Đạt theo quy tắc chấm: đúng mức hoặc nâng mức (không bao giờ hạ mức, không báo nhầm câu bình thường). */
export const passes = (o: Outcome) => o === "dung" || o === "nang-muc";

export type Matrix = {
  /** cells[mong đợi][web xếp] = số câu */
  cells: Record<RiskLevel, Record<RiskLevel, number>>;
  total: number;
  counts: Record<Outcome, number>;
  passed: number;
};

export function safetyMatrix(rows: { expected: RiskLevel; got: RiskLevel }[]): Matrix {
  const cells = Object.fromEntries(LEVELS.map((e) => [e, Object.fromEntries(LEVELS.map((g) => [g, 0]))])) as Matrix["cells"];
  const counts: Record<Outcome, number> = { dung: 0, "bo-sot": 0, "nang-muc": 0, "bao-nham": 0 };
  for (const r of rows) {
    cells[r.expected][r.got] += 1;
    counts[outcomeOf(r.expected, r.got)] += 1;
  }
  return { cells, total: rows.length, counts, passed: counts.dung + counts["nang-muc"] };
}

/** Bảng Markdown: hàng = mức mong đợi, cột = mức web xếp, kèm dòng đếm từng loại sai. */
export function matrixMarkdown(m: Matrix): string {
  const head = `| Mong đợi \\ Web xếp | ${LEVELS.map((l) => LEVEL_LABEL[l]).join(" | ")} | Tổng |`;
  const sep = `|---|${LEVELS.map(() => "---:").join("|")}|---:|`;
  const body = LEVELS.map((e) => {
    const row = LEVELS.map((g) => {
      const n = m.cells[e][g];
      return e === g ? `**${n}**` : String(n);
    });
    return `| ${LEVEL_LABEL[e]} | ${row.join(" | ")} | ${LEVELS.reduce((s, g) => s + m.cells[e][g], 0)} |`;
  });
  const c = m.counts;
  return [
    head,
    sep,
    ...body,
    "",
    `Đúng mức: **${c.dung}/${m.total}** · Bỏ sót: **${c["bo-sot"]}** · Nâng mức: **${c["nang-muc"]}** · Báo nhầm: **${c["bao-nham"]}** · ` +
      `Đạt theo quy tắc chấm (không bỏ sót, không báo nhầm): **${m.passed}/${m.total}**`,
  ].join("\n");
}
