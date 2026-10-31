// BÀI ĐO KỸ NĂNG TRONG APP (kế hoạch Demo 3, mục 6.1, 6.2, 6.7). Phần dùng chung, không đọc cơ sở dữ liệu
// (chạy được ở trình duyệt, test và script). Đề và hướng dẫn chấm: ho-so-du-thi/3-kiem-thu/bo-do-ky-nang/.

export type TestForm = "A" | "B";
export type TestRound = 1 | 2;

/** Băm ổn định (FNV-1a 32 bit) mã tài khoản: cùng mã thì luôn ra cùng số, không cần lưu thêm gì. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Đề của một học sinh ở một lần đo: lần 1 nửa tài khoản làm đề A (số băm chẵn), nửa làm đề B;
 * lần 2 tự đổi đề. Tức là đề A khi (số băm chẵn) XOR (lần 2).
 */
export function assignedForm(userId: string, round: TestRound): TestForm {
  const even = stableHash(userId) % 2 === 0;
  return even !== (round === 2) ? "A" : "B";
}

/** Mã các câu đặc biệt trong phiếu bài đo (do scripts/bai-do/tao-phieu.ts tạo). */
export const TEST_IDS = {
  /** chỉ lần 2: "Trước hôm nay, em đã từng đọc đề này chưa?" */
  readBefore: "DD",
  /** câu cuối: "Khi làm bài, em có dùng AI hoặc nhờ ai không?" */
  aiUse: "AI",
  selfRating: ["TD1", "TD2", "TD3", "TD4"],
  behaviour: ["HV1", "HV2"],
} as const;

/** Câu trả lời "đã đọc đề này rồi" (bỏ khỏi phân tích chính). */
export const READ_BEFORE_YES = "Rồi";

export const AI_USE_QUESTION = "Khi làm bài, em có dùng AI hoặc nhờ ai không?";
export const AI_USE_OPTIONS = ["Không", "Có, em dùng AI", "Có, em nhờ người khác", "Có, cả hai"];

/** Chín câu tự trả lời của bài tình huống, nói chung cho cả đề A và đề B (người chấm chỉ thấy câu này, không thấy đề). */
export const TEST_TEXT_QUESTIONS: { id: string; situation: 1 | 2 | 3 | 4; label: string }[] = [
  { id: "1a", situation: 1, label: "Tối hôm đó em sẽ nhận ra mình đang thế nào?" },
  { id: "1b", situation: 1, label: "Vì sao em lại như vậy?" },
  { id: "2a", situation: 2, label: "Trong 10 phút trước giờ kiểm tra, em sẽ làm gì với cảm giác đó?" },
  { id: "2b", situation: 2, label: "Khi nhận đề, em sẽ làm gì?" },
  { id: "3a", situation: 3, label: "Tối nay (1 tiếng rưỡi) em sẽ làm những việc nào, theo thứ tự nào? Vì sao?" },
  { id: "3b", situation: 3, label: "Với việc làm đầu tiên, em sẽ bắt đầu nó như thế nào?" },
  { id: "3c", situation: 3, label: "Làm được 1 tiếng mới xong một nửa việc đầu tiên. Lúc đó em sẽ làm gì?" },
  { id: "4a", situation: 4, label: "Bài bị gạch sai, em chưa hiểu sai ở đâu, ngại hỏi trước lớp. Em sẽ làm gì tiếp?" },
  { id: "4b", situation: 4, label: "Nếu nhờ người khác giúp, đúng những lời em sẽ dùng (2–4 câu)." },
];

export const SITUATION_SKILL: Record<1 | 2 | 3 | 4, string> = {
  1: "Tình huống 1 · K1 Nhận diện (điểm kém hơn bạn / bị nhận xét trước lớp)",
  2: "Tình huống 2 · K2 Điều tiết (10 phút trước bài kiểm tra 15 phút)",
  3: "Tình huống 3 · K3 Giải quyết vấn đề (4 việc, 1 tiếng rưỡi)",
  4: "Tình huống 4 · K4 Tìm kiếm hỗ trợ (bài bị gạch sai, ngại hỏi)",
};

// ───────── Ô chấm (2-huong-dan-cham.md) ─────────

export const CELL_IDS = ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "4.1", "4.2", "4.3"] as const;
export type CellId = (typeof CELL_IDS)[number];

/** Giá trị một ô: 0, 1, 2; T = trống; K = học sinh viết rõ không muốn trả lời. */
export type CellValue = 0 | 1 | 2 | "T" | "K";
export const CELL_VALUES: CellValue[] = [0, 1, 2, "T", "K"];
export type Cells = Partial<Record<CellId, CellValue>>;

/** Tên ô đúng như cột trong phieu-cham-bai-tinh-huong.csv. */
export const CELL_LABEL: Record<CellId, string> = {
  "1.1": "Tác nhân",
  "1.2": "Cảm xúc và dấu hiệu",
  "1.3": "Suy nghĩ",
  "2.1": "Chọn cách làm dịu",
  "2.2": "Cách thực hiện",
  "2.3": "Sau khi dịu",
  "3.1": "Chọn việc và thứ tự",
  "3.2": "Bước đầu",
  "3.3": "Điều chỉnh",
  "4.1": "Chỗ vướng và đã thử gì",
  "4.2": "Người - cách - lúc nhờ",
  "4.3": "Lời nhờ rõ",
};

/** Mốc chấm rút gọn từ hướng dẫn chấm (2 điểm / 1 điểm / 0 điểm), hiện ngay cạnh ô. */
export const CELL_ANCHORS: Record<CellId, { two: string; one: string; zero: string }> = {
  "1.1": {
    two: "Nêu sự việc cụ thể gây căng thẳng, tách riêng khỏi lời chê bản thân.",
    one: "Chung chung (chuyện học, điểm kém) hoặc gộp sự việc với lời chê bản thân.",
    zero: "Không nêu sự việc nào, hoặc chỉ có lời chê bản thân.",
  },
  "1.2": {
    two: "Ít nhất 2 loại: cảm xúc, cơ thể, việc làm.",
    one: "Chỉ một loại (ví dụ chỉ tên cảm xúc).",
    zero: "Không có, hoặc chỉ chép lại đề.",
  },
  "1.3": {
    two: "Nêu suy nghĩ đi kèm VÀ nhận ra đó chỉ là suy nghĩ / có cách nhìn khác.",
    one: "Chỉ nêu suy nghĩ.",
    zero: "Không có suy nghĩ nào.",
  },
  "2.1": {
    two: "Cách làm dịu làm được ngay tại chỗ, không né tránh.",
    one: "Chung chung, khó làm ở lớp, hoặc chỉ ôn tiếp.",
    zero: "Không có, hoặc né tránh (xin về, xin bỏ kiểm tra).",
  },
  "2.2": {
    two: "Nói rõ làm thế nào VÀ bao lâu / mấy lần.",
    one: "Chỉ nêu tên cách, hoặc thiếu bao lâu / mấy lần.",
    zero: "Không có cách làm dịu để thực hiện.",
  },
  "2.3": {
    two: "Việc đầu tiên cụ thể khi nhận đề, hoặc cách biết mình đã ổn hơn.",
    one: "Mơ hồ: đọc kỹ đề, làm cẩn thận, cố gắng.",
    zero: "Không có, hoặc chỉ \"làm bài\".",
  },
  "3.1": {
    two: "Có thứ tự, có lý do, VÀ tính tới giới hạn 1 tiếng rưỡi.",
    one: "Có thứ tự và lý do nhưng định làm hết; hoặc chọn hợp lý mà không có lý do.",
    zero: "Không chọn, không có thứ tự.",
  },
  "3.2": {
    two: "Việc cụ thể, đủ nhỏ, VÀ có lúc làm do học sinh tự nêu.",
    one: "Chung chung, quá to, hoặc chưa nói lúc nào làm.",
    zero: "Không có cách bắt đầu.",
  },
  "3.3": {
    two: "Nói rõ việc nào làm tiếp, việc nào bỏ / dời sang lúc nào, hoặc báo ai.",
    one: "Có điều chỉnh nhưng mơ hồ.",
    zero: "Không điều chỉnh (làm tiếp, thức khuya cho xong), hoặc không có.",
  },
  "4.1": {
    two: "Có cả điều chưa hiểu cụ thể VÀ việc đã thử cụ thể.",
    one: "Chỉ một trong hai, hoặc chung chung.",
    zero: "Không nói chưa hiểu gì, không nói đã làm gì.",
  },
  "4.2": {
    two: "Nhờ người giúp được, bằng cách / lúc tính tới nỗi ngại hỏi trước lớp.",
    one: "Có người nhưng không tính cách / lúc; vẫn giơ tay hỏi trước lớp; hoặc chỉ nhờ bạn.",
    zero: "Không nhờ ai, hoặc chép bài bạn.",
  },
  "4.3": {
    two: "Nói rõ muốn người được nhờ làm gì hoặc khi nào.",
    one: "Có lời nhờ nhưng chưa rõ muốn gì.",
    zero: "Không có lời nhờ (kể cả khi 4a nói không nhờ ai mà 4b bỏ trống).",
  },
};

/** Điểm một người chấm cho một bài (bảng test_scores). */
export type RaterScore = {
  cells: Cells;
  guess_class: string | null;
  guess_round: string | null;
  note: string | null;
  referred: boolean;
};

/** Đoán lớp / đoán lần của người chấm (cột cuối của phiếu chấm). */
export const GUESS_CLASS_OPTIONS = ["8A1", "8A4", "không đoán được"];
export const GUESS_ROUND_OPTIONS = ["1", "2", "không đoán được"];

export function isCellValue(v: unknown): v is CellValue {
  return v === 0 || v === 1 || v === 2 || v === "T" || v === "K";
}

/** Mã chấm thứ n (bắt đầu từ 1): B001, B002… */
export function gradingCode(n: number): string {
  return `B${String(n).padStart(3, "0")}`;
}

/** Thông tin thêm của một lần làm bài đo (cột survey_responses.meta). Không chứa chữ học sinh viết. */
export type TestMeta = {
  started_at: string | null;
  duration_s: number | null;
  /** số lần học sinh thử dán chữ vào ô trả lời (đã bị chặn) */
  pasted_blocked: number;
  /** học sinh tự kể có dùng AI / nhờ ai khi làm bài */
  ai_use: string | null;
};

/** Thời gian làm bài (giây) từ lúc mở bài tới lúc nộp; mốc bắt đầu không hợp lệ thì để trống. */
export function testDuration(startedAt: string | null | undefined, now: Date): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  const s = Math.round((now.getTime() - start) / 1000);
  // không tin mốc ở tương lai hay quá 6 giờ trước (mở trang từ hôm trước)
  return s >= 0 && s <= 6 * 3600 ? s : null;
}
