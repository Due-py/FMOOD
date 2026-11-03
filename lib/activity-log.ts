import "server-only";
import { after } from "next/server";
import type { Profile } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityKind } from "./activity-log-shared";

// GHI HOẠT ĐỘNG HỌC SINH (kế hoạch Demo 3, mục 12.4)
// Chỉ ghi việc làm và một mã ngắn (id kỹ năng, TL09, HD03, mã phiếu, mã cuộc trò chuyện, số chữ), KHÔNG BAO GIỜ ghi chữ học sinh viết.
// Duy 03/11 chọn giữ nguyên điều này (app hứa với học sinh thầy cô không đọc); lib/activity-describe.ts dịch mã thành lời cho admin.
// Ghi khi công tắc "log.students" đang bật, không giới hạn ngày (Duy quyết 01/11); admin xóa toàn bộ ở trang Nhật ký hoạt động.
// Ghi sau khi đã trả lời học sinh; lỗi thì bỏ qua: không làm chậm hay hỏng thao tác của học sinh.

export type { ActivityKind } from "./activity-log-shared";

const MISSING = new Set(["42P01", "42703", "PGRST205"]);

async function write(profile: Pick<Profile, "id" | "class_id" | "role">, kind: ActivityKind, ref?: string | null) {
  if (profile.role !== "student") return;
  try {
    const { enabled } = await getSetting("log.students");
    if (!enabled) return;
    const { error } = await createAdminClient()
      .from("student_activity_log")
      .insert({ user_id: profile.id, class_id: profile.class_id, kind, ref: ref ? ref.slice(0, 60) : null });
    if (error && !MISSING.has(error.code)) console.error("[F-Mood] Ghi nhật ký hoạt động lỗi", error.message);
  } catch (error) {
    console.error("[F-Mood] Ghi nhật ký hoạt động lỗi", error);
  }
}

/**
 * Ghi một việc học sinh vừa làm. Gọi được trong server action, route handler và trang server.
 * `ref` chỉ là mã ngắn, không bao giờ là nội dung.
 */
export function logActivity(profile: Pick<Profile, "id" | "class_id" | "role">, kind: ActivityKind, ref?: string | null) {
  try {
    after(() => write(profile, kind, ref));
  } catch {
    // ngoài phạm vi một request (ví dụ script): ghi luôn
    void write(profile, kind, ref);
  }
}
