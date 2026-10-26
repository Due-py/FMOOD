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
  note: string | null;
  status: HelpStatus;
  reply: string | null;
  replied_by_name: string | null;
  replied_at: string | null;
  created_at: string;
};

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

export const helpRequestSchema = z.object({
  toRole: z.enum(["teacher", "counselor"]),
  when: z.enum(["break", "after_school", "any"]),
  note: z
    .string()
    .trim()
    .max(300, "Lời nhắn tối đa 300 ký tự")
    .transform((s) => s || null),
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
export function replyTemplates(toRole: HelpToRole, when: HelpWhen): string[] {
  const place = toRole === "counselor" ? "ở phòng tham vấn" : "ở lớp";
  const time = when === "after_school" ? "sau giờ học" : "giờ ra chơi";
  return [
    `Thầy cô đã đọc rồi. Mình gặp nhau ${time} ngày mai ${place} nhé em.`,
    `Thầy cô sẽ tìm gặp em trong hôm nay. Em cứ yên tâm nhé.`,
    `Cảm ơn em đã nhắn. Em ghé ${place} lúc nào tiện, thầy cô luôn sẵn lòng nghe em.`,
  ];
}
