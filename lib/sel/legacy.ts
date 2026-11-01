// LỚP TƯƠNG THÍCH VỚI HỆ NHÃN CŨ (Duy chốt 01/11/2026: CASEL 5 là khung duy nhất, kế hoạch V2 mục 3.3).
// Đây là nơi DUY NHẤT trong mã ứng dụng được nhắc mã K1–K4 (ngoài bộ đo 24 điểm, lib/test-scoring.ts, giữ nguyên).
// Mã cũ còn nằm trong dữ liệu đã lưu: practice_sessions.skill, support_activity.ref ("K3", "K3|TL09", "skill:K3"),
// support_content.data.skill. Đọc thì đổi sang kỹ năng thành phần; ghi phiên luyện của 4 kỹ năng cũ thì đổi ngược để
// điền cột skill (cột này còn ràng buộc K1–K4 tới khi bỏ ở bản sau đợt thử).
import { isSubskillId, type Casel, type SubskillId } from "@/lib/sel/casel";

export type LegacySkillCode = "K1" | "K2" | "K3" | "K4";

const FROM_LEGACY: Record<LegacySkillCode, SubskillId> = {
  K1: "recognize_feelings_thoughts",
  K2: "calm_in_the_moment",
  K3: "plan_step_by_step",
  K4: "ask_for_help",
};
const TO_LEGACY = Object.fromEntries(Object.entries(FROM_LEGACY).map(([k, v]) => [v, k])) as Partial<Record<SubskillId, LegacySkillCode>>;

export function isLegacySkillCode(v: unknown): v is LegacySkillCode {
  return v === "K1" || v === "K2" || v === "K3" || v === "K4";
}

/** "K3" → plan_step_by_step; không nhận ra → null (hiển thị "Kỹ năng khác", không đoán). */
export function subskillFromLegacy(code: unknown): SubskillId | null {
  return isLegacySkillCode(code) ? FROM_LEGACY[code] : null;
}

/** plan_step_by_step → "K3"; kỹ năng mới không có mã cũ → null. */
export function legacyFromSubskill(id: SubskillId): LegacySkillCode | null {
  return TO_LEGACY[id] ?? null;
}

/** Đọc một giá trị đã lưu có thể là mã mới hoặc mã cũ. */
export function readSubskill(v: unknown): SubskillId | null {
  return isSubskillId(v) ? v : subskillFromLegacy(v);
}

/** support_activity.ref cũ ("K3", "K3|TL09", "skill:K3") hoặc mới ("plan_step_by_step|TL09", "subskill:plan_step_by_step") → kỹ năng. */
export function subskillFromRef(ref: string | null | undefined): SubskillId | null {
  if (!ref) return null;
  const head = ref.replace(/^(skill|subskill):/, "").split("|")[0];
  return readSubskill(head);
}

/** Nhãn năng lực cũ của bộ điều phối (trước 01/11) → khóa CASEL mới. */
const OLD_CASEL: Record<string, Casel> = {
  "tu-nhan-thuc": "self_awareness",
  "tu-quan-ly": "self_management",
  "nhan-thuc-xa-hoi": "social_awareness",
  "ky-nang-quan-he": "relationship_skills",
  "ra-quyet-dinh": "responsible_decision_making",
};
export const caselFromOld = (v: string): Casel | null => OLD_CASEL[v] ?? null;

/** Tên trợ lý từng dùng trong thẻ [SKILL: …] ở các tin nhắn cũ đã lưu → kỹ năng. */
const OLD_CARD_NAMES: Record<string, SubskillId> = {
  "nhận ra mình đang thế nào": "recognize_feelings_thoughts",
  "làm dịu cảm xúc": "calm_in_the_moment",
  "gỡ rối từng bước": "plan_step_by_step",
  "tìm người giúp mình": "ask_for_help",
  "bình tĩnh lại trước khi làm bài": "calm_in_the_moment",
  "sắp xếp việc khi có nhiều bài": "plan_step_by_step",
  "nhờ thầy cô khi chưa hiểu bài": "ask_for_help",
};
export function subskillFromOldCardName(name: string): SubskillId | null {
  return OLD_CARD_NAMES[name.trim().toLowerCase()] ?? null;
}
