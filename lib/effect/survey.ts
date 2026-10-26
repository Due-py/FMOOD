// PHIẾU KHẢO SÁT TRƯỚC / SAU KHI DÙNG THỬ (dùng chung cho trang Kết quả và file tạo Google Forms)
//
// Ba bộ câu hỏi chuẩn, viết lại cho học sinh cấp 2:
//  - WHO-5 (chỉ số sức khỏe tinh thần của Tổ chức Y tế Thế giới): 5 câu, mỗi câu 0–5, cộng lại × 4 → thang 0–100.
//  - PSS-4 (thang đo căng thẳng của Cohen, bản 4 câu): mỗi câu 0–4, câu 2 và 3 tính ngược → thang 0–16.
//  - GHSQ (bảng hỏi ý định tìm giúp đỡ, Wilson và cộng sự): mỗi nguồn giúp đỡ 1–7.
// Không bộ nào dùng để chẩn đoán ai; chỉ so sánh trung bình của nhóm.
//
// Mỗi câu trong Google Forms có mã trong ngoặc vuông ở đầu, ví dụ "[W1] …", nên file CSV xuất ra
// đọc được theo mã, không phụ thuộc thứ tự cột. Mỗi lựa chọn bắt đầu bằng con số điểm, ví dụ "3 - …".

export type Scores = { who5: number; pss4: number; helpTeacher: number };
export type Question = { code: string; text: string };

export const WHO5_ITEMS: Question[] = [
  { code: "W1", text: "Em thấy vui vẻ, tinh thần thoải mái" },
  { code: "W2", text: "Em thấy bình tĩnh, thư thái" },
  { code: "W3", text: "Em thấy khỏe khoắn, nhiều năng lượng" },
  { code: "W4", text: "Em thức dậy thấy tỉnh táo, như được nghỉ ngơi đủ" },
  { code: "W5", text: "Mỗi ngày của em có những điều em thấy thú vị" },
];
export const WHO5_OPTIONS = [
  "0 - Không lúc nào",
  "1 - Thỉnh thoảng",
  "2 - Ít hơn một nửa số ngày",
  "3 - Hơn một nửa số ngày",
  "4 - Phần lớn số ngày",
  "5 - Lúc nào cũng vậy",
];

export const PSS4_ITEMS: Question[] = [
  { code: "P1", text: "Em thấy mình không làm chủ được những việc quan trọng của mình" },
  { code: "P2", text: "Em thấy tự tin là mình xử lý được chuyện riêng của mình" },
  { code: "P3", text: "Em thấy mọi việc diễn ra theo ý mình" },
  { code: "P4", text: "Em thấy khó khăn dồn lại nhiều đến mức không vượt qua nổi" },
];
/** Câu nói điều tốt: điểm cao = ít căng thẳng, nên tính ngược (4 − điểm). */
export const PSS4_REVERSED = new Set(["P2", "P3"]);
export const PSS4_OPTIONS = ["0 - Không bao giờ", "1 - Hầu như không", "2 - Thỉnh thoảng", "3 - Khá thường xuyên", "4 - Rất thường xuyên"];

export const HELP_ITEMS: Question[] = [
  { code: "H1", text: "Bố mẹ hoặc người thân trong nhà" },
  { code: "H2", text: "Bạn bè" },
  { code: "H3", text: "Thầy cô chủ nhiệm" },
  { code: "H4", text: "Thầy cô tư vấn tâm lý của trường" },
];
/** Hai nguồn "thầy cô" dùng cho chỉ số "dám tìm đến thầy cô". */
export const HELP_TEACHER = ["H3", "H4"];
export const HELP_OPTIONS = [
  "1 - Chắc chắn không",
  "2 - Gần như không",
  "3 - Có lẽ không",
  "4 - Chưa chắc",
  "5 - Có lẽ có",
  "6 - Gần như chắc chắn",
  "7 - Chắc chắn có",
];

/** Câu chỉ có ở phiếu sau, chỉ học sinh lớp dùng F-Mood trả lời (thang 1–5, không dùng để chấm Đạt). */
export const AFTER_ITEMS: Question[] = [
  { code: "S1", text: "F-Mood giúp em hiểu và gọi tên cảm xúc của mình hơn" },
  { code: "S2", text: "Em thấy an toàn khi kể chuyện với Mây" },
  { code: "S3", text: "Khi gặp chuyện khó, em biết mình có thể tìm ai để được giúp" },
  { code: "S4", text: "Em muốn tiếp tục dùng F-Mood" },
];
export const AGREE_OPTIONS = ["1 - Rất không đồng ý", "2 - Không đồng ý", "3 - Phân vân", "4 - Đồng ý", "5 - Rất đồng ý"];

/** Lựa chọn lớp để nhóm thử phiếu, không bao giờ được tính. */
export const TEST_CLASS = "Thử phiếu (không tính)";

const SCORED_CODES = [...WHO5_ITEMS, ...PSS4_ITEMS, ...HELP_ITEMS].map((q) => q.code);

// ───────── Chấm điểm ─────────

export function scoreRow(a: Record<string, number>): Scores {
  const who5 = WHO5_ITEMS.reduce((s, q) => s + a[q.code], 0) * 4;
  const pss4 = PSS4_ITEMS.reduce((s, q) => s + (PSS4_REVERSED.has(q.code) ? 4 - a[q.code] : a[q.code]), 0);
  const helpTeacher = HELP_TEACHER.reduce((s, c) => s + a[c], 0) / HELP_TEACHER.length;
  return { who5, pss4, helpTeacher };
}

/** Mã bí mật: bỏ dấu, bỏ khoảng trắng, viết hoa ("Đ12á" → "D12A"). */
export function normalizeCode(code: string): string {
  return code
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "D")
    .replace(/\s+/g, "")
    .toUpperCase();
}

const normalizeClass = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

// ───────── Đọc CSV xuất từ Google Sheets ─────────

/** Đọc CSV chuẩn (ô có dấu phẩy / xuống dòng nằm trong ngoặc kép, "" là một dấu ngoặc kép). */
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
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export type SurveyRow = { key: string; className: string; scores: Scores; after: Record<string, number> };
export type ParsedSurvey = {
  rows: SurveyRow[];
  skipped: { duplicate: number; test: number; incomplete: number };
  error?: string;
};

/** Số ở đầu lựa chọn ("3 - Hơn một nửa số ngày" → 3); ô trống hoặc không có số → null. */
function leadingNumber(s: string | undefined): number | null {
  const m = s?.trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Đọc một file CSV phiếu (trước hoặc sau). Bỏ: dòng lớp "Thử phiếu (không tính)", dòng thiếu câu trả lời,
 * và các lần trả lời sau của cùng một mã trong cùng lớp (chỉ giữ lần đầu tiên).
 */
export function parseSurveyCsv(text: string): ParsedSurvey {
  const skipped = { duplicate: 0, test: 0, incomplete: 0 };
  const [header, ...body] = parseCsv(text);
  if (!header) return { rows: [], skipped, error: "File trống." };
  const col = new Map<string, number>();
  header.forEach((h, i) => {
    const m = h.trim().match(/^\[([A-Z]+\d*)\]/);
    if (m) col.set(m[1], i);
  });
  const missing = ["LOP", "MA", ...SCORED_CODES].filter((c) => !col.has(c));
  if (missing.length) return { rows: [], skipped, error: `File thiếu các câu: ${missing.join(", ")}. Hãy tải đúng tab phản hồi của phiếu.` };

  const seen = new Set<string>();
  const rows: SurveyRow[] = [];
  for (const r of body) {
    const className = normalizeClass(r[col.get("LOP")!] ?? "");
    if (className === TEST_CLASS) {
      skipped.test++;
      continue;
    }
    const code = normalizeCode(r[col.get("MA")!] ?? "");
    const answers: Record<string, number> = {};
    let complete = Boolean(className && code);
    for (const c of SCORED_CODES) {
      const n = leadingNumber(r[col.get(c)!]);
      if (n === null) complete = false;
      else answers[c] = n;
    }
    if (!complete) {
      skipped.incomplete++;
      continue;
    }
    const key = `${className}|${code}`;
    if (seen.has(key)) {
      skipped.duplicate++;
      continue;
    }
    seen.add(key);
    const after: Record<string, number> = {};
    for (const q of AFTER_ITEMS) {
      const n = col.has(q.code) ? leadingNumber(r[col.get(q.code)!]) : null;
      if (n !== null) after[q.code] = n;
    }
    rows.push({ key, className, scores: scoreRow(answers), after });
  }
  return { rows, skipped };
}

export type Group = "app" | "control";
export type SurveyPair = { group: Group; className: string; pre: Scores; post: Scores; after: Record<string, number> };

/** Ghép phiếu trước và sau của cùng một bạn (cùng lớp + mã). Lớp không thuộc nhóm nào thì bỏ. */
export function pairSurveys(
  pre: SurveyRow[],
  post: SurveyRow[],
  groupOf: (className: string) => Group | null,
): { pairs: SurveyPair[]; unpaired: { preOnly: number; postOnly: number } } {
  const before = new Map(pre.map((r) => [r.key, r]));
  const postKeys = new Set(post.map((r) => r.key));
  const pairs: SurveyPair[] = [];
  for (const r of post) {
    const p = before.get(r.key);
    const group = groupOf(r.className);
    if (p && group) pairs.push({ group, className: r.className, pre: p.scores, post: r.scores, after: r.after });
  }
  return {
    pairs,
    unpaired: { preOnly: pre.filter((r) => !postKeys.has(r.key)).length, postOnly: post.filter((r) => !before.has(r.key)).length },
  };
}
