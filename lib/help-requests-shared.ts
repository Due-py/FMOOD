import { z } from "zod";
import type { Role } from "@/lib/auth";

// LỜI NHỜ GIÚP KHÔNG KHẨN: học sinh hẹn nói chuyện với GVCN hoặc phòng tham vấn.
// (Khi nguy hiểm, học sinh dùng "Cần giúp ngay" → cảnh báo khẩn, không đi đường này.)
// Lời nhờ chỉ người được nhờ đọc: gửi GVCN thì chỉ GVCN lớp đó; gửi phòng tham vấn
// thì tư vấn viên và admin. Admin không đọc lời nhờ gửi riêng GVCN.

export type HelpToRole = "teacher" | "counselor";
export type HelpWhen = "break" | "after_school" | "any";
export type HelpStatus = "new" | "replied" | "done";

export type HelpRequest = {
  id: string;
  student_id: string | null;
  class_id: string | null;
  class_name: string | null;
  nickname: string;
  full_name: string | null;
  to_role: HelpToRole;
  when_pref: HelpWhen;
  /** lời nhắn cũ (một ô); lời nhờ mới dùng 3 ý bên dưới */
  note: string | null;
  /** HD05: mình đang khó chỗ nào · mình đã thử gì · mình muốn thầy cô giúp gì (có sau migration 0014) */
  difficulty?: string | null;
  tried?: string | null;
  want?: string | null;
  /** học sinh muốn rủ một bạn đi cùng khi gặp thầy cô */
  with_buddy?: boolean;
  /** lúc thầy cô được nhờ mở hộp lời nhờ và thấy lời nhờ này lần đầu */
  seen_at?: string | null;
  status: HelpStatus;
  reply: string | null;
  replied_by_name: string | null;
  replied_at: string | null;
  created_at: string;
};

export const PART_MAX = 200;

/** Ba ý của lời nhờ, theo đúng thứ tự thầy cô sẽ đọc. */
export const PARTS = [
  { key: "difficulty", label: "Mình đang khó chỗ nào", placeholder: "Ví dụ: em chưa hiểu bước biến đổi ở câu 3", required: true },
  { key: "tried", label: "Mình đã thử gì", placeholder: "Ví dụ: em đã đọc lại ví dụ trong vở (không bắt buộc)", required: false },
  { key: "want", label: "Mình muốn thầy cô giúp gì", placeholder: "Ví dụ: cô giải thích lại giúp em bước này", required: true },
] as const;
export type HelpParts = { difficulty: string; tried: string | null; want: string };

/** Lời nhắn một ô cho bản chưa chạy 0014 (và để sao chép): ghép 3 ý, không quá 300 ký tự. */
export function composeNote(p: { difficulty?: string | null; tried?: string | null; want?: string | null }): string | null {
  const lines = [
    p.difficulty ? `Em đang khó: ${p.difficulty}` : null,
    p.tried ? `Em đã thử: ${p.tried}` : null,
    p.want ? `Em muốn thầy cô giúp: ${p.want}` : null,
  ].filter(Boolean);
  return lines.length ? lines.join("\n").slice(0, 300) : null;
}

/** Ba ý của một lời nhờ để hiện (lời nhờ cũ chỉ có một ô lời nhắn). */
export function partsOf(r: Pick<HelpRequest, "difficulty" | "tried" | "want" | "note">): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = PARTS.map((p) => ({ label: p.label as string, text: (r[p.key] ?? "").trim() })).filter((x) => x.text);
  if (!out.length && r.note) out.push({ label: "Lời nhắn", text: r.note });
  return out;
}

export type ProgressStep = { key: "sent" | "seen" | "replied"; label: string; at: string | null };

/**
 * Lời nhờ đang ở đâu: đã gửi → thầy cô đã xem → thầy cô đã trả lời. Mỗi bước chỉ "xong" khi sự kiện đó
 * đã xảy ra thật (đã lưu, thầy cô đã mở hộp lời nhờ, đã có lời đáp). Trả lời rồi thì coi như đã xem.
 */
export function helpProgress(r: Pick<HelpRequest, "created_at" | "seen_at" | "replied_at" | "reply">): ProgressStep[] {
  const replied = r.reply ? (r.replied_at ?? r.created_at) : null;
  return [
    { key: "sent", label: "Đã gửi", at: r.created_at },
    { key: "seen", label: "Thầy cô đã xem", at: r.seen_at ?? replied },
    { key: "replied", label: "Thầy cô đã trả lời", at: replied },
  ];
}

export const TO_LABEL: Record<HelpToRole, string> = {
  teacher: "Thầy cô chủ nhiệm",
  counselor: "Phòng tham vấn",
};

export const WHEN_LABEL: Record<HelpWhen, string> = {
  break: "Giờ ra chơi",
  after_school: "Sau giờ học",
  any: "Lúc nào cũng được",
};

export const HELP_STATUS_LABEL: Record<HelpStatus, string> = {
  new: "Đang chờ",
  replied: "Đã trả lời",
  done: "Xong",
};

const part = (label: string) => z.string().trim().max(PART_MAX, `${label}: tối đa ${PART_MAX} ký tự`);

export const helpRequestSchema = z.object({
  toRole: z.enum(["teacher", "counselor"]),
  when: z.enum(["break", "after_school", "any"]),
  difficulty: part("Mình đang khó chỗ nào").min(2, "Viết ngắn mình đang khó chỗ nào nhé"),
  tried: part("Mình đã thử gì").transform((s) => s || null),
  want: part("Mình muốn thầy cô giúp gì").min(2, "Viết ngắn mình muốn thầy cô giúp gì nhé"),
  withBuddy: z.boolean().default(false),
});

export const replySchema = z.string().trim().min(1, "Viết vài chữ trả lời em nhé").max(300, "Tối đa 300 ký tự");

export type InboxScope = { toRole: "teacher"; classIds: string[] } | { toRole: "counselor"; classIds: null };

/** Hộp lời nhờ của một người. classIds: các lớp GVCN chủ nhiệm (null = không giới hạn). */
export function helpInboxScope(role: Role, classIds: string[] | null): InboxScope | null {
  if (role === "counselor" || role === "admin") return { toRole: "counselor", classIds: null };
  if (role === "teacher" && classIds && classIds.length > 0) return { toRole: "teacher", classIds };
  return null;
}

export function canHandleHelpRequest(
  role: Role,
  classIds: string[] | null,
  req: { to_role: HelpToRole; class_id: string | null },
): boolean {
  const scope = helpInboxScope(role, classIds);
  if (!scope || scope.toRole !== req.to_role) return false;
  return scope.classIds === null || (req.class_id !== null && scope.classIds.includes(req.class_id));
}

/** Câu trả lời mẫu: thầy cô bấm một lần là điền sẵn, sửa lại được. */
export function replyTemplates(toRole: HelpToRole, when: HelpWhen, withBuddy = false): string[] {
  const place = toRole === "counselor" ? "ở phòng tham vấn" : "ở lớp";
  const time = when === "after_school" ? "sau giờ học" : "giờ ra chơi";
  return [
    `Thầy cô đã đọc rồi. Mình gặp nhau ${time} ngày mai ${place} nhé em.${withBuddy ? " Em rủ bạn đi cùng nhé." : ""}`,
    `Thầy cô sẽ tìm gặp em trong hôm nay. Em cứ yên tâm nhé.`,
    `Cảm ơn em đã nhắn. Em ghé ${place} lúc nào tiện, thầy cô luôn sẵn lòng nghe em.`,
  ];
}
