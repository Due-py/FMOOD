import "server-only";
import { after } from "next/server";
import type { Profile } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityKind } from "./activity-log-shared";

// GHI HOẠT ĐỘNG HỌC SINH (kế hoạch Demo 3, mục 12.4)
// Ghi việc làm và một mã ngắn (id kỹ năng, TL09, HD03, mã phiếu, mã cuộc trò chuyện, số chữ); lib/activity-describe.ts dịch mã thành lời.
// Lời học sinh viết và tâm trạng (`content`) CHỈ được lưu khi admin bật thêm công tắc "Ghi cả lời học sinh viết và tâm trạng"
// (log.students.text, mặc định tắt). Duy 03/11: chỉ bật khi tự thử chức năng; áp cho mọi học sinh, tắt bằng tay.
// Ghi khi công tắc "log.students" đang bật, không giới hạn ngày (Duy quyết 01/11); admin xóa toàn bộ ở trang Nhật ký hoạt động.
// Ghi sau khi đã trả lời học sinh; lỗi thì bỏ qua: không làm chậm hay hỏng thao tác của học sinh.

export type { ActivityKind } from "./activity-log-shared";

const MISSING = new Set(["42P01", "42703", "PGRST205"]);

const CONTENT_MAX = 4000;

async function write(profile: Pick<Profile, "id" | "class_id" | "role">, kind: ActivityKind, ref?: string | null, content?: string | null) {
  if (profile.role !== "student") return;
  try {
    const { enabled, text } = await getSetting("log.students");
    if (!enabled) return;
    const row: { user_id: string; class_id: string | null; kind: ActivityKind; ref: string | null; content?: string } = {
      user_id: profile.id,
      class_id: profile.class_id,
      kind,
      ref: ref ? ref.slice(0, 60) : null,
    };
    const words = text && content?.trim() ? content.trim().slice(0, CONTENT_MAX) : null;
    const db = createAdminClient();
    let { error } = await db.from("student_activity_log").insert(words ? { ...row, content: words } : row);
    // chưa chạy 0028 (chưa có cột content): ghi như bản cũ, bỏ lời
    if (words && (error?.code === "42703" || error?.code === "PGRST204")) ({ error } = await db.from("student_activity_log").insert(row));
    if (error && !MISSING.has(error.code)) console.error("[F-Mood] Ghi nhật ký hoạt động lỗi", error.message);
  } catch (error) {
    console.error("[F-Mood] Ghi nhật ký hoạt động lỗi", error);
  }
}

/**
 * Ghi một việc học sinh vừa làm. Gọi được trong server action, route handler và trang server.
 * `ref` chỉ là mã ngắn, không bao giờ là nội dung. `content` (lời học sinh viết, tâm trạng) chỉ được lưu khi công tắc ghi lời đang bật.
 */
export function logActivity(profile: Pick<Profile, "id" | "class_id" | "role">, kind: ActivityKind, ref?: string | null, content?: string | null) {
  try {
    after(() => write(profile, kind, ref, content));
  } catch {
    // ngoài phạm vi một request (ví dụ script): ghi luôn
    void write(profile, kind, ref, content);
  }
}
