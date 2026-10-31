// BỘ ĐIỀU PHỐI BÀI LUYỆN: hàm chuyển trạng thái thuần (kế hoạch Demo 3, Bước 3.1; báo cáo Bảng 17).
// File này dùng chung cho máy chủ và trình duyệt (không đọc cơ sở dữ liệu, không gọi AI), chạy được ở test.
//
// Nguyên tắc:
// - MÁY CHỦ quản lý trạng thái theo dữ liệu thật (ô đã viết, nút học sinh bấm, kết quả kiểm tra an toàn).
// - Chữ AI viết KHÔNG BAO GIỜ đổi trạng thái: mọi sự kiện có người gửi là "ai" đều bị từ chối.
// - "Hoàn thành" chỉ khi đủ các ô bắt buộc của mô-đun VÀ học sinh tự bấm xác nhận.
// - "Chuyển an toàn" là trạng thái cuối: không đi tiếp, không gọi AI nữa.
//
// Chu trình H-M-T-G-N: Hiểu → Mẫu → Tự làm → Góp ý (sửa lần 2 nếu muốn) → Nhìn lại.

import { SKILLS, type SkillCode } from "@/lib/skills";

export type PracticeStep = "H" | "M" | "T" | "G" | "N";
export const PRACTICE_STEPS: PracticeStep[] = ["H", "M", "T", "G", "N"];

export const STEP_LABEL: Record<PracticeStep, string> = {
  H: "Hiểu",
  M: "Mẫu",
  T: "Tự làm",
  G: "Góp ý",
  N: "Nhìn lại",
};

export type PracticeState = "not_started" | "in_progress" | "need_hint" | "completed" | "skipped" | "paused" | "safety";
export const PRACTICE_STATES: PracticeState[] = ["not_started", "in_progress", "need_hint", "completed", "skipped", "paused", "safety"];

export const STATE_LABEL: Record<PracticeState, string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang làm",
  need_hint: "Cần gợi ý thêm",
  completed: "Hoàn thành",
  skipped: "Bỏ qua",
  paused: "Tạm dừng",
  safety: "Chuyển an toàn",
};

/** Hai trạng thái cuối: không chuyển đi đâu nữa. */
export const FINAL_STATES: PracticeState[] = ["completed", "safety"];

/** Số lần trợ lý đưa câu gợi ý (khi "Mình chưa biết") tối đa mỗi bài; quá thì cho xem mẫu hoặc bỏ qua ô. */
export const MAX_HINTS = 2;
/** Số lượt góp ý tối đa mỗi bài (lần 1, lần 2). */
export const MAX_FEEDBACK = 2;
/** Số lượt liền chưa tiến thì chuyển "Cần gợi ý thêm". */
export const STALL_LIMIT = 2;

/** Những việc AI làm trong bài luyện và số lần tối đa mỗi bài (bảng "Trợ lý AI trong bài luyện"). */
export const AI_LIMITS = {
  /** câu nối kỹ năng với tình huống riêng ở bước Hiểu */
  bridge: 1,
  /** ví dụ mới (tình huống khác) khi bấm "Cho mình ví dụ khác" */
  example: 1,
  /** K4: lượt trợ lý đóng vai thầy cô được nhờ */
  roleplay: 4,
  /** câu đáp ở bước Nhìn lại */
  reaction: 1,
} as const;
export type AiUse = keyof typeof AI_LIMITS;
export type AiUses = Partial<Record<AiUse, number>>;

export type Answers = Record<string, string>;

/** Ảnh chụp một bài luyện (một dòng practice_sessions). */
export type Snapshot = {
  skill: SkillCode;
  step: PracticeStep;
  state: PracticeState;
  hintCount: number;
  feedbackCount: number;
  stallCount: number;
  /** số lần đã lưu bài làm (0, 1 hoặc 2) */
  versions: number;
  /** bài làm mới nhất (lần 2 nếu có, không thì lần 1) */
  answers: Answers;
};

export type Actor = "student" | "server" | "ai";

export type PracticeEvent =
  /** học sinh bắt đầu bài (bước Hiểu) */
  | { type: "start" }
  /** học sinh bấm "Tiếp" sang bước sau (H→M→T, G→N) */
  | { type: "next" }
  /** học sinh bấm "Mình chưa biết" ở một ô */
  | { type: "dont_know" }
  /** học sinh viết hoặc sửa một ô; máy chủ tính có tiến không (ô có thêm chữ mới) */
  | { type: "answer"; progressed: boolean }
  /** học sinh bỏ qua một ô (bước Tự làm) hoặc bỏ qua bước Góp ý / Nhìn lại */
  | { type: "skip" }
  /** lưu bài làm (lần 1 ở bước Tự làm, lần 2 ở bước Góp ý) */
  | { type: "submit"; answers: Answers }
  /** bấm "Nhờ góp ý" */
  | { type: "feedback" }
  /** học sinh bấm "Dừng ở đây" (bài đã viết được giữ) */
  | { type: "pause" }
  /** học sinh mở lại bài đang tạm dừng */
  | { type: "resume" }
  /** học sinh bấm xác nhận "Mình đã làm xong" */
  | { type: "confirm" }
  /** bộ kiểm tra an toàn xếp khẩn cấp (chỉ máy chủ gửi được) */
  | { type: "safety_urgent" };

export type Transition =
  | { ok: true; next: Snapshot; /** bước "Cần gợi ý thêm": còn được nhờ AI gợi ý không (false = cho xem mẫu / bỏ qua ô) */ aiHint?: boolean }
  | { ok: false; reason: string };

export function emptySnapshot(skill: SkillCode): Snapshot {
  return { skill, step: "H", state: "not_started", hintCount: 0, feedbackCount: 0, stallCount: 0, versions: 0, answers: {} };
}

/** Bỏ khoảng trắng thừa, chỉ giữ các ô của mô-đun, cắt độ dài. */
export function cleanAnswers(skill: SkillCode, raw: Record<string, unknown>, maxLen = 600): Answers {
  const out: Answers = {};
  for (const f of SKILLS[skill].fields) {
    const v = raw[f.key];
    if (typeof v !== "string") continue;
    const t = v.replace(/\s+/g, " ").trim().slice(0, maxLen);
    if (t) out[f.key] = t;
  }
  return out;
}

/** Các ô bắt buộc còn trống (đủ đầu ra của mô-đun khi danh sách rỗng). */
export function missingRequired(skill: SkillCode, answers: Answers): string[] {
  return SKILLS[skill].fields.filter((f) => f.required && (answers[f.key] ?? "").trim().length < 2).map((f) => f.key);
}

export function isFinal(state: PracticeState): boolean {
  return FINAL_STATES.includes(state);
}

/** Còn được gọi AI cho việc này không (theo số lần đã dùng trong bài). */
export function aiAllowed(use: AiUse, uses: AiUses, state: PracticeState): boolean {
  if (state === "safety" || state === "paused") return false;
  return (uses[use] ?? 0) < AI_LIMITS[use];
}

const fail = (reason: string): Transition => ({ ok: false, reason });
const go = (s: Snapshot, patch: Partial<Snapshot>, aiHint?: boolean): Transition => ({
  ok: true,
  next: { ...s, ...patch },
  ...(aiHint === undefined ? {} : { aiHint }),
});

/**
 * Chuyển trạng thái một bài luyện. Hàm thuần: cùng đầu vào luôn cho cùng kết quả.
 * `actor = "ai"` luôn bị từ chối (AI không bao giờ chuyển bước hay đánh dấu hoàn thành).
 */
export function transition(s: Snapshot, event: PracticeEvent, actor: Actor): Transition {
  if (actor === "ai") return fail("AI không được đổi trạng thái bài luyện");
  if (event.type === "safety_urgent") {
    if (actor !== "server") return fail("Chỉ máy chủ chuyển an toàn");
    return go(s, { state: "safety" });
  }
  if (isFinal(s.state)) return fail(s.state === "safety" ? "Bài luyện đã dừng vì an toàn" : "Bài luyện đã hoàn thành");

  // đang tạm dừng: chỉ mở lại được (bài đã viết vẫn giữ)
  if (s.state === "paused") {
    if (event.type !== "resume") return fail("Bài đang tạm dừng");
    return go(s, { state: s.versions > 0 || s.step !== "H" ? "in_progress" : "not_started" });
  }
  if (event.type === "resume") return fail("Bài không tạm dừng");

  switch (event.type) {
    case "start":
      if (s.state !== "not_started") return fail("Bài đã bắt đầu");
      return go(s, { state: "in_progress", step: "H" });

    case "pause":
      return go(s, { state: "paused" });

    case "next": {
      if (s.state === "not_started") return fail("Chưa bắt đầu");
      if (s.step === "H") return go(s, { step: "M", state: "in_progress" });
      if (s.step === "M") return go(s, { step: "T", state: "in_progress", stallCount: 0 });
      if (s.step === "G") return go(s, { step: "N", state: "in_progress" });
      // bước Tự làm đi tiếp bằng "submit"; Nhìn lại kết thúc bằng "confirm"
      return fail("Bước này đi tiếp bằng nút khác");
    }

    case "dont_know": {
      if (s.step !== "T" && s.step !== "G") return fail("Chỉ dùng khi đang viết bài");
      // còn lượt: trợ lý đưa tối đa 3 câu hỏi / lựa chọn; hết lượt: cho xem mẫu hoặc bỏ qua ô (không gọi AI)
      if (s.hintCount < MAX_HINTS) return go(s, { state: "need_hint", hintCount: s.hintCount + 1, stallCount: 0 }, true);
      return go(s, { state: "need_hint", stallCount: 0 }, false);
    }

    case "answer": {
      if (s.step !== "T" && s.step !== "G") return fail("Chỉ dùng khi đang viết bài");
      if (event.progressed) return go(s, { state: "in_progress", stallCount: 0 });
      const stalls = s.stallCount + 1;
      if (stalls >= STALL_LIMIT) {
        const aiHint = s.hintCount < MAX_HINTS;
        return go(s, { state: "need_hint", stallCount: 0, hintCount: aiHint ? s.hintCount + 1 : s.hintCount }, aiHint);
      }
      return go(s, { stallCount: stalls });
    }

    case "skip": {
      if (s.state === "not_started") return fail("Chưa bắt đầu");
      // bỏ qua một ô: vẫn ở bước Tự làm; bỏ qua góp ý: sang Nhìn lại; bỏ qua Nhìn lại: vẫn xác nhận xong được
      if (s.step === "T") return go(s, { state: "skipped", stallCount: 0 });
      if (s.step === "G") return go(s, { state: "skipped", step: "N" });
      if (s.step === "N") return go(s, { state: "skipped" });
      // bước Hiểu, Mẫu: bỏ qua = đi thẳng tới phần tự viết
      return go(s, { state: "skipped", step: "T" });
    }

    case "submit": {
      const filled = Object.values(event.answers).some((v) => v.trim().length >= 2);
      if (!filled) return fail("Bạn chưa viết ô nào");
      if (s.step === "T") {
        if (s.versions > 0) return fail("Lần 1 đã lưu");
        return go(s, { step: "G", state: "in_progress", versions: 1, answers: event.answers, stallCount: 0 });
      }
      // lần 2: ở bước Góp ý (sau khi đọc góp ý), hoặc ở bước Nhìn lại khi bạn ấy đã bỏ qua góp ý mà muốn tự sửa
      if (s.step === "G" || s.step === "N") {
        if (s.versions !== 1) return fail(s.versions === 0 ? "Chưa có lần 1" : "Đã lưu lần 2");
        if (s.step === "G" && s.feedbackCount < 1) return fail("Sửa lần 2 sau khi đọc góp ý");
        return go(s, { state: "in_progress", versions: 2, answers: event.answers, stallCount: 0 });
      }
      return fail("Chưa tới bước lưu bài");
    }

    case "feedback": {
      if (s.step !== "G" || s.versions === 0) return fail("Lưu bài trước rồi mới nhờ góp ý");
      if (s.feedbackCount >= MAX_FEEDBACK) return fail("Mỗi bài được góp ý tối đa 2 lần");
      // lần góp ý thứ 2 chỉ cho bài đã sửa (lần 2)
      if (s.feedbackCount >= s.versions) return fail("Sửa bài rồi nhờ góp ý lần nữa nhé");
      return go(s, { state: "in_progress", feedbackCount: s.feedbackCount + 1 });
    }

    case "confirm": {
      if (actor !== "student") return fail("Chỉ học sinh tự xác nhận hoàn thành");
      if (s.step !== "G" && s.step !== "N") return fail("Chưa tới bước xác nhận");
      if (s.versions === 0) return fail("Chưa lưu bài");
      const missing = missingRequired(s.skill, s.answers);
      if (missing.length) return fail("Còn ô bắt buộc chưa viết");
      return go(s, { state: "completed", step: "N" });
    }
  }
}
