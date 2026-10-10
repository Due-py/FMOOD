import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";

export type AlertInput = {
  profile: Profile;
  type: "chat_risk" | "negative_streak" | "lesson_risk" | "help_request";
  severity: "watch" | "urgent";
  excerpt?: string;
  reasons?: string[];
};

/** Ghi cảnh báo cho thầy cô phụ trách. Chỉ chạy phía server. */
export async function createAlert({ profile, type, severity, excerpt, reasons = [] }: AlertInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("alerts").insert({
    student_id: profile.id,
    class_id: profile.class_id,
    nickname: profile.nickname,
    full_name: profile.full_name,
    type,
    severity,
    excerpt: excerpt ? excerpt.slice(0, 1000) : null,
    reasons,
  });
  if (error) {
    // Không được im lặng bỏ qua cảnh báo an toàn: ghi log để còn kiểm tra.
    console.error("[F-Mood] Ghi cảnh báo thất bại", error);
    return false;
  }
  return true;
}
