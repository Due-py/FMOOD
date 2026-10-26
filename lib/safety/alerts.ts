import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";
import { isDemoClass } from "@/lib/demo/guard";
import { emailStaff } from "./notify";
import { shouldEmail } from "./notify-email";

export type AlertInput = {
  profile: Profile;
  type: "chat_risk" | "negative_streak" | "lesson_risk" | "help_request" | "worry_worse";
  severity: "watch" | "urgent";
  excerpt?: string;
  reasons?: string[];
};

/**
 * Ghi cảnh báo cho thầy cô phụ trách. Chỉ chạy phía server.
 * Cảnh báo khẩn / học sinh tự nhờ giúp thì gửi thêm email (không kèm nội dung tin nhắn),
 * gửi SAU khi đã trả lời học sinh để học sinh không phải chờ.
 */
export async function createAlert(input: AlertInput) {
  const { profile, type, severity, excerpt, reasons = [] } = input;
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
  }
  // vẫn gửi email khi ghi cảnh báo lỗi: thầy cô cần biết dù trang thầy cô chưa có.
  // Lớp mẫu (chế độ trình diễn) không bao giờ gửi email.
  if (shouldEmail(input) && !(await isDemoClass(profile.class_id).catch(() => false))) {
    const send = () => emailStaff(input);
    try {
      after(send);
    } catch {
      // gọi ngoài một request (script): gửi luôn
      void send();
    }
  }
  return !error;
}
