// SO SÁNH HAI KIỂU MÂY: che tên kiểu, xáo thứ tự, đọc phiếu chấm, tính kết quả và độ đồng thuận (hàm thuần, có test).
import { CRITERIA } from "./ab-scenarios";

export type Config = "A" | "B";
export type Run = { scenario: string; set: "phat-trien" | "moi"; config: Config; lan: number };
export type Blinded<T extends Run> = T & { code: string };

/** Bộ sinh số ngẫu nhiên có hạt giống (để ghi lại được cách đã xáo, tái lập được). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Xáo thứ tự và gắn mã chấm C001, C002… theo thứ tự đã xáo; mã không cho biết kiểu A hay B. */
export function blind<T extends Run>(runs: T[], seed: number): Blinded<T>[] {
  const r = rng(seed);
  const out = [...runs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.map((x, i) => ({ ...x, code: `C${String(i + 1).padStart(3, "0")}` }));
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Phiếu chấm trống (CSV có BOM để Excel đọc đúng tiếng Việt): mỗi dòng một mã chấm, 4 tiêu chí 0/1. */
export function ratingSheet(items: { code: string; scenario: string }[]): string {
  const head = ["Ma cham", "Kich ban", ...CRITERIA.map((c) => `${c.key} ${c.label} (0/1)`), "Ghi chu"];
  return `﻿${[head, ...items.map((i) => [i.code, i.scenario, "", "", "", "", ""])].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** Đọc một dòng CSV (có ngoặc kép). Chấp nhận dấu phẩy hoặc chấm phẩy (Excel tiếng Việt hay lưu bằng ;). */
function parseLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export type Rating = { code: string; scores: number[] };

/** Đọc phiếu chấm đã điền. Ô trống hoặc khác 0/1 thì báo lỗi rõ ràng (không tự đoán). */
export function parseRatings(csv: string): { ratings: Rating[]; errors: string[] } {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const sep = (lines[0]?.match(/;/g)?.length ?? 0) > (lines[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  const ratings: Rating[] = [];
  const errors: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseLine(line, sep);
    const code = cells[0]?.trim();
    if (!code) continue;
    const scores = cells.slice(2, 2 + CRITERIA.length).map((c) => c.trim());
    if (scores.some((s) => s !== "0" && s !== "1")) {
      errors.push(`${code}: cần điền đủ 4 ô bằng 0 hoặc 1`);
      continue;
    }
    ratings.push({ code, scores: scores.map(Number) });
  }
  return { ratings, errors };
}

const passed = (scores: number[]) => scores.every((s) => s === 1);

export type ConfigResult = {
  config: Config;
  /** số lượt chấm (kịch bản × lần chạy) */
  turns: number;
  passedTurns: number;
  /** kịch bản đạt ở ít nhất 2/3 lần */
  scenarios: number;
  passedScenarios: number;
  /** từng tiêu chí: số lượt đạt tiêu chí đó */
  byCriterion: number[];
};

/**
 * Kết quả từng kiểu theo MỘT bộ điểm (điểm đã thống nhất, hoặc của một người chấm).
 * Lượt đạt khi đủ cả 4 tiêu chí; kịch bản đạt khi đạt ≥ 2/3 số lần chạy.
 */
export function scoreConfigs(items: Blinded<Run>[], scores: Map<string, number[]>): ConfigResult[] {
  return (["A", "B"] as const).map((config) => {
    const mine = items.filter((i) => i.config === config && scores.has(i.code));
    const byScenario = new Map<string, boolean[]>();
    for (const i of mine) byScenario.set(i.scenario, [...(byScenario.get(i.scenario) ?? []), passed(scores.get(i.code)!)]);
    return {
      config,
      turns: mine.length,
      passedTurns: mine.filter((i) => passed(scores.get(i.code)!)).length,
      scenarios: byScenario.size,
      passedScenarios: [...byScenario.values()].filter((v) => v.filter(Boolean).length * 3 >= v.length * 2).length,
      byCriterion: CRITERIA.map((_, k) => mine.filter((i) => scores.get(i.code)![k] === 1).length),
    };
  });
}

/** Độ đồng thuận ban đầu giữa 2 người chấm: theo từng ô tiêu chí và theo kết luận Đạt / Chưa đạt của cả lượt. */
export function agreement(r1: Rating[], r2: Rating[]) {
  const m2 = new Map(r2.map((r) => [r.code, r.scores]));
  const both = r1.filter((r) => m2.has(r.code));
  let cells = 0;
  let same = 0;
  const disagree: { code: string; criteria: string[] }[] = [];
  let samePass = 0;
  for (const r of both) {
    const other = m2.get(r.code)!;
    const diff = CRITERIA.filter((_, k) => r.scores[k] !== other[k]).map((c) => c.key);
    cells += CRITERIA.length;
    same += CRITERIA.length - diff.length;
    if (passed(r.scores) === passed(other)) samePass++;
    if (diff.length) disagree.push({ code: r.code, criteria: diff });
  }
  return { items: both.length, cells, sameCells: same, samePass, disagree };
}
