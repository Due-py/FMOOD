// KIỂM TRA SƯ PHẠM, TẦNG ĐÁNH GIÁ NGỮ NGHĨA (hàm thuần, có test: sel-judge.test.ts). Góp ý "5 cải tiến", 31/10 khuya.
// Tầng quy tắc (reply-checks.ts, STEP_CHECKS) bắt lỗi cấu trúc rõ; tầng này chấm câu trả lời có LÀM ĐÚNG NHIỆM VỤ của bước
// được giao không, có thấu cảm không, có tự thêm điều học sinh chưa nói không, có hợp ngữ cảnh không.
// Chạy NGOẠI TUYẾN trên bộ thử mạch SEL (npm run eval:sel -- --cham), KHÔNG chạy cho từng tin nhắn thật.
// AI chấm trước; giáo viên tư vấn chấm cùng phiếu trên một mẫu để đo độ đồng thuận giữa AI chấm và người chấm
// (AI chấm chỉ được tin khi đồng thuận đủ cao với người).
import { csvCell, parseLine } from "./ab";

export const JUDGE_CRITERIA = [
  {
    key: "dung_buoc",
    label: "Làm đúng nhiệm vụ của bước",
    max: 2,
    rubric: "2 = làm đúng và đủ nhiệm vụ của bước; 1 = làm một phần, hoặc làm thêm việc của bước khác (ví dụ đã đưa cách làm khi bước chỉ là hỏi); 0 = làm việc khác hẳn",
  },
  {
    key: "thau_cam",
    label: "Thấu cảm",
    max: 2,
    rubric: "2 = ghi nhận cảm xúc tự nhiên, không phán xét, giọng hợp học sinh THCS; 1 = có ghi nhận nhưng sáo rỗng hoặc hơi giảng giải; 0 = phán xét, thuyết phục, bỏ qua cảm xúc",
  },
  {
    key: "khong_suy_doan",
    label: "Không thêm điều học sinh chưa nói",
    max: 1,
    rubric: "1 = chỉ dựa vào điều học sinh đã nói; 0 = tự gọi tên cảm xúc, nguyên nhân, suy nghĩ thay học sinh như thể học sinh đã nói",
  },
  {
    key: "hop_ngu_canh",
    label: "Hợp ngữ cảnh",
    max: 2,
    rubric: "2 = nối đúng với tin vừa rồi và các lượt trước, không hỏi lại điều đã biết; 1 = hơi lạc hoặc lặp; 0 = lạc đề hoặc mâu thuẫn với điều học sinh đã nói",
  },
] as const;

export type JudgeKey = (typeof JUDGE_CRITERIA)[number]["key"];
export type JudgeScores = Record<JudgeKey, number>;
export type Turn = { role: "user" | "assistant"; content: string };

/** Lời dặn cho AI chấm (cố định, không theo lời dặn admin sửa). */
export const JUDGE_INSTRUCTIONS = [
  "Bạn là người chấm câu trả lời của một trợ lý trò chuyện giúp học sinh THCS luyện kỹ năng cảm xúc xã hội (SEL).",
  "Mỗi lượt, một bộ điều phối giao cho trợ lý MỘT nhiệm vụ (một bước). Chấm câu trả lời theo đúng nhiệm vụ đó, không theo ý thích của bạn.",
  "Chấm từng tiêu chí bằng số nguyên theo thang dưới đây, rồi ghi một lý do ngắn bằng tiếng Việt (tối đa 30 từ), nêu điểm trừ cụ thể nếu có.",
  ...JUDGE_CRITERIA.map((c) => `- ${c.key} (${c.label}, 0–${c.max}): ${c.rubric}`),
  "Không chấm độ dài, cách xưng hô hay dòng thẻ [GOAL/SKILL/END]: các phần đó đã có máy chấm khác.",
].join("\n");

/** Nội dung gửi AI chấm cho một câu trả lời. `task`: dòng "LƯỢT NÀY" của bước được giao (moveInstruction). */
export function judgeInput({ history, message, reply, task }: { history: Turn[]; message: string; reply: string; task: string }): string {
  const context = history.map((t) => `${t.role === "user" ? "Học sinh" : "Trợ lý"}: ${t.content}`).join("\n");
  return [
    context ? `CÁC LƯỢT TRƯỚC:\n${context}` : "CÁC LƯỢT TRƯỚC: (chưa có)",
    `TIN NHẮN MỚI CỦA HỌC SINH:\n${message}`,
    `NHIỆM VỤ ĐƯỢC GIAO CHO LƯỢT NÀY:\n${task || "(không có bước nào được giao: trò chuyện thường, chỉ chấm thấu cảm, không suy đoán, hợp ngữ cảnh; dung_buoc chấm theo việc có đáp lại đúng điều học sinh vừa nói)"}`,
    `CÂU TRẢ LỜI CẦN CHẤM:\n${reply}`,
  ].join("\n\n");
}

/** Điểm hợp lệ: số nguyên trong thang của tiêu chí. */
export function validScores(s: Partial<Record<JudgeKey, unknown>>): s is JudgeScores {
  return JUDGE_CRITERIA.every((c) => Number.isInteger(s[c.key]) && (s[c.key] as number) >= 0 && (s[c.key] as number) <= c.max);
}

/** Tổng điểm và tỉ lệ trên điểm tối đa (0–1). */
export function judgeTotal(s: JudgeScores): { total: number; max: number; rate: number } {
  const max = JUDGE_CRITERIA.reduce((a, c) => a + c.max, 0);
  const total = JUDGE_CRITERIA.reduce((a, c) => a + s[c.key], 0);
  return { total, max, rate: total / max };
}

export type SheetItem = { code: string; caseId: string; message: string; task: string; reply: string };

/** Phiếu chấm cho người (CSV có BOM để Excel đọc đúng tiếng Việt), cùng tiêu chí và thang với AI chấm. Không có điểm của AI. */
export function humanSheet(items: SheetItem[]): string {
  const head = ["Ma cham", "Ca", "Hoc sinh nhan", "Nhiem vu cua buoc", "Tro ly tra loi", ...JUDGE_CRITERIA.map((c) => `${c.key} ${c.label} (0-${c.max})`), "Ghi chu"];
  const rows = items.map((i) => [i.code, i.caseId, i.message, i.task, i.reply, ...JUDGE_CRITERIA.map(() => ""), ""]);
  return `﻿${[head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** Đọc phiếu người chấm đã điền. Ô trống hoặc ngoài thang thì báo lỗi rõ (không tự đoán). */
export function parseHumanSheet(csv: string): { scores: Map<string, JudgeScores>; errors: string[] } {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const sep = (lines[0]?.match(/;/g)?.length ?? 0) > (lines[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  const scores = new Map<string, JudgeScores>();
  const errors: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseLine(line, sep);
    const code = cells[0]?.trim();
    if (!code) continue;
    const raw = cells.slice(5, 5 + JUDGE_CRITERIA.length).map((c) => c.trim());
    const s = Object.fromEntries(JUDGE_CRITERIA.map((c, k) => [c.key, raw[k] === "" ? NaN : Number(raw[k])]));
    if (!validScores(s)) {
      errors.push(`${code}: cần điền đủ ${JUDGE_CRITERIA.length} ô, mỗi ô là số nguyên trong thang của tiêu chí`);
      continue;
    }
    scores.set(code, s);
  }
  return { scores, errors };
}

/** Độ đồng thuận giữa AI chấm và người chấm, theo từng tiêu chí: trùng hẳn, và lệch không quá 1 điểm. */
export function judgeAgreement(ai: Map<string, JudgeScores>, human: Map<string, JudgeScores>) {
  const codes = [...human.keys()].filter((c) => ai.has(c));
  return {
    items: codes.length,
    byCriterion: JUDGE_CRITERIA.map((c) => ({
      key: c.key,
      label: c.label,
      exact: codes.filter((code) => ai.get(code)![c.key] === human.get(code)![c.key]).length,
      within1: codes.filter((code) => Math.abs(ai.get(code)![c.key] - human.get(code)![c.key]) <= 1).length,
    })),
  };
}
