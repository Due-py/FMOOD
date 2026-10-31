// TÍNH ĐIỂM BÀI TÌNH HUỐNG (kế hoạch Demo 3, mục 6.3; cách tính theo 2-huong-dan-cham.md).
// Phần toán thuần, không đọc file hay cơ sở dữ liệu: scripts/tinh-bai-tinh-huong.ts dùng, test-scoring.test.ts kiểm tra.
import { CELL_IDS, CELL_LABEL, type CellId, type CellValue, type Cells } from "./bai-do";

export type SkillKey = "K1" | "K2" | "K3" | "K4";
export const SKILLS: SkillKey[] = ["K1", "K2", "K3", "K4"];

export const SKILL_CELLS: Record<SkillKey, CellId[]> = {
  K1: ["1.1", "1.2", "1.3"],
  K2: ["2.1", "2.2", "2.3"],
  K3: ["3.1", "3.2", "3.3"],
  K4: ["4.1", "4.2", "4.3"],
};

export const SKILL_NAME: Record<SkillKey, string> = {
  K1: "Nhận diện",
  K2: "Điều tiết",
  K3: "Giải quyết vấn đề",
  K4: "Tìm kiếm hỗ trợ",
};

/** Ô sau khi gộp hai người chấm: điểm có thể là số lẻ (trung bình), hoặc T / K. */
export type ScoredCells = Partial<Record<CellId, number | "T" | "K">>;

export type SkillScores = Record<SkillKey, number | null> & { total: number | null };

/**
 * Điểm mỗi kỹ năng = trung bình các ô có điểm × 3 (thang 0–6), bỏ ô T và K.
 * Kỹ năng trống hết thì không có điểm; thiếu kỹ năng nào thì không có tổng.
 * `blanksAsZero`: kiểm tra độ nhạy, coi T và K (và ô thiếu) là 0.
 */
export function skillScores(cells: ScoredCells, { blanksAsZero = false } = {}): SkillScores {
  const out = { total: null } as SkillScores;
  for (const k of SKILLS) {
    const vals = SKILL_CELLS[k]
      .map((c) => cells[c])
      .map((v) => (typeof v === "number" ? v : blanksAsZero ? 0 : null))
      .filter((v): v is number => v !== null);
    out[k] = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) * 3 : null;
  }
  const parts = SKILLS.map((k) => out[k]);
  out.total = parts.every((v) => v !== null) ? parts.reduce<number>((s, v) => s + (v as number), 0) : null;
  return out;
}

/**
 * Điểm cuối cùng của một bài = trung bình hai người chấm, từng ô.
 * Chỉ một người cho điểm số thì lấy điểm đó; cả hai trống thì T (có người ghi K thì K).
 */
export function mergeRaters(a: Cells, b?: Cells | null): ScoredCells {
  const out: ScoredCells = {};
  for (const c of CELL_IDS) {
    const vals = [a[c], b?.[c]].filter((v) => v !== undefined) as CellValue[];
    const nums = vals.filter((v): v is 0 | 1 | 2 => typeof v === "number");
    if (nums.length) out[c] = nums.reduce<number>((s, v) => s + v, 0) / nums.length;
    else if (vals.includes("K")) out[c] = "K";
    else out[c] = "T";
  }
  return out;
}

/** Kappa có trọng số của Cohen cho hai người chấm trên thang thứ bậc (mặc định 0, 1, 2). */
export function weightedKappa(pairs: [number, number][], weight: "linear" | "quadratic" = "linear", categories = [0, 1, 2]): number | null {
  const n = pairs.length;
  if (!n) return null;
  const k = categories.length;
  const idx = new Map(categories.map((c, i) => [c, i]));
  const w = (i: number, j: number) => {
    const d = Math.abs(i - j) / (k - 1);
    return 1 - (weight === "linear" ? d : d * d);
  };
  const pa = new Array(k).fill(0);
  const pb = new Array(k).fill(0);
  let observed = 0;
  for (const [a, b] of pairs) {
    const i = idx.get(a);
    const j = idx.get(b);
    if (i === undefined || j === undefined) throw new Error(`Điểm ngoài thang: ${a}, ${b}`);
    pa[i] += 1 / n;
    pb[j] += 1 / n;
    observed += w(i, j) / n;
  }
  let expected = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) expected += pa[i] * pb[j] * w(i, j);
  if (expected >= 1) return observed >= 1 ? 1 : null;
  return (observed - expected) / (1 - expected);
}

export type Agreement = {
  /** số ô được so (12 ô × số bài chấm đôi) */
  cells: number;
  /** số ô hai người ghi giống hệt nhau (kể cả cùng T hoặc cùng K) */
  equal: number;
  pct: number | null;
  /** số ô cả hai đều cho điểm số (dùng tính kappa) */
  numeric: number;
  kappaLinear: number | null;
  kappaQuadratic: number | null;
};

/** Độ đồng ý của hai người chấm trên các bài chấm đôi, chung hoặc theo một nhóm ô (một kỹ năng). */
export function agreement(pairs: [Cells, Cells][], cells: readonly CellId[] = CELL_IDS): Agreement {
  let total = 0;
  let equal = 0;
  const numeric: [number, number][] = [];
  for (const [a, b] of pairs) {
    for (const c of cells) {
      const va = a[c] ?? "T";
      const vb = b[c] ?? "T";
      total++;
      if (va === vb) equal++;
      if (typeof va === "number" && typeof vb === "number") numeric.push([va, vb]);
    }
  }
  return {
    cells: total,
    equal,
    pct: total ? equal / total : null,
    numeric: numeric.length,
    kappaLinear: weightedKappa(numeric, "linear"),
    kappaQuadratic: weightedKappa(numeric, "quadratic"),
  };
}

export type Describe = { n: number; mean: number | null; sd: number | null; median: number | null };

/** Số bạn, trung bình, độ lệch chuẩn (mẫu, chia n − 1), trung vị. */
export function describe(values: number[]): Describe {
  const n = values.length;
  if (!n) return { n, mean: null, sd: null, median: null };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : null;
  const sorted = [...values].sort((x, y) => x - y);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { n, mean, sd, median };
}

/** Bộ sinh số ngẫu nhiên có hạt giống (mulberry32): chạy lại script ra đúng cùng khoảng tin cậy. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Phân vị (nội suy tuyến tính) của một dãy đã sắp xếp tăng dần. */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

/**
 * Chênh lệch mức thay đổi giữa hai lớp (lớp dùng app − lớp so sánh) kèm khoảng tin cậy
 * bằng lấy mẫu lại (bootstrap phân vị) trên từng học sinh, mỗi lớp lấy mẫu riêng.
 */
export function bootstrapDiff(
  a: number[],
  b: number[],
  { samples = 2000, level = 0.95, seed = 20261103 } = {},
): { estimate: number; low: number; high: number; samples: number } | null {
  if (!a.length || !b.length) return null;
  const rand = seededRandom(seed);
  const pick = (xs: number[]) => {
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rand() * xs.length)];
    return s / xs.length;
  };
  const stats: number[] = [];
  for (let i = 0; i < samples; i++) stats.push(pick(a) - pick(b));
  stats.sort((x, y) => x - y);
  const tail = (1 - level) / 2;
  return { estimate: mean(a) - mean(b), low: quantile(stats, tail), high: quantile(stats, 1 - tail), samples };
}

/** Đếm số bạn tăng / giữ / giảm (|thay đổi| ≤ eps coi là giữ). */
export function directionCounts(changes: number[], eps = 1e-9): { up: number; same: number; down: number } {
  return {
    up: changes.filter((c) => c > eps).length,
    same: changes.filter((c) => Math.abs(c) <= eps).length,
    down: changes.filter((c) => c < -eps).length,
  };
}

/** Đọc ô điểm từ chữ trong bảng tính: "0", "1", "2", "T", "K" (không phân biệt hoa thường); ô rỗng là chưa chấm. */
export function parseCell(text: string): CellValue | undefined {
  const t = text.trim().toUpperCase();
  if (t === "0" || t === "1" || t === "2") return Number(t) as 0 | 1 | 2;
  if (t === "T" || t === "K") return t;
  return undefined;
}

/** Đọc CSV (có ngoặc kép, dấu phẩy và xuống dòng trong ô; bỏ BOM đầu file). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Ghi CSV (mọi ô trong ngoặc kép), dùng chung cho trang chấm và script. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

// ───────── Cột của bảng xuất ra (trang Chấm bài → script tính) ─────────

/** Đúng thứ tự cột của ho-so-du-thi/3-kiem-thu/bo-do-ky-nang/phieu-cham-bai-tinh-huong.csv. */
export const SCORE_CSV_HEADER = [
  "Mã chấm",
  "Người chấm (1/2)",
  ...CELL_IDS.map((c) => `${c} ${CELL_LABEL[c]} (0-2/T/K)`),
  ...SKILLS.map((k) => `Điểm ${k} ${SKILL_NAME[k]} (0-6; bảng tính tự tính)`),
  "Tổng (0-24; bảng tính tự tính)",
  "Đoán lớp (8A1/8A4/không đoán được)",
  "Đoán lần (1/2/không đoán được)",
  "Ghi chú (câu chưa có trong bảng mẫu / chuyển tư vấn)",
];

/**
 * Bảng ghép mã chấm với tài khoản (chỉ mở sau khi khóa điểm). Không có câu tự trả lời, không có TĐ, HV
 * (TĐ, HV so theo lớp: tải ở trang Phiếu khảo sát, ẩn danh).
 */
export const MAPPING_CSV_HEADER = [
  "Mã chấm",
  "Mã học sinh",
  "Tài khoản",
  "Lớp",
  "Lần",
  "Đề",
  "Đã đọc đề (lần 2)",
  "Dùng AI / nhờ ai",
  "Thời gian làm (giây)",
  "Lần dán bị chặn",
  "Thời điểm nộp",
  "Người chấm báo tư vấn",
];

/** Một dòng của bảng điểm: 12 ô, điểm K1–K4 và tổng (tính sẵn, 2 chữ số thập phân), đoán, ghi chú. */
export function scoreCsvRow(r: {
  code: string;
  slot: 1 | 2;
  cells: Cells;
  guess_class: string | null;
  guess_round: string | null;
  note: string | null;
  referred: boolean;
}): (string | number)[] {
  const s = skillScores(r.cells);
  const fmt = (v: number | null) => (v === null ? "" : Math.round(v * 100) / 100);
  const note = [r.note ?? "", r.referred ? "chuyển tư vấn" : ""].filter(Boolean).join(" · ");
  return [
    r.code,
    r.slot,
    ...CELL_IDS.map((c) => (r.cells[c] === undefined ? "" : String(r.cells[c]))),
    ...SKILLS.map((k) => fmt(s[k])),
    fmt(s.total),
    r.guess_class ?? "",
    r.guess_round ?? "",
    note,
  ];
}
