import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";
import { isDemoClass } from "@/lib/demo/guard";
import { labelAlert } from "./alert-label";
import { mergeReasons, mergeTarget, MERGE_WINDOW_MS, type OpenAlert } from "./alert-merge";
import { emailStaff } from "./notify";
import { shouldEmail } from "./notify-email";

export type AlertInput = {
  profile: Profile;
  type: "chat_risk" | "negative_streak" | "lesson_risk" | "help_request" | "worry_worse" | "survey_risk";
  severity: "watch" | "urgent";
  excerpt?: string;
  reasons?: string[];
  /**
   * Nhãn ngữ cảnh (không bắt buộc), ví dụ "Về một bạn khác (bài luyện: …)" (lib/skills.ts peerAlertLabel). Có thì ghi ở đầu
   * đoạn trích và là lý do đầu tiên (alert-label.ts); loại, mức, gộp và email không đổi.
   */
  context?: string | null;
};

/**
 * Ghi cảnh báo cho thầy cô phụ trách. Chỉ chạy phía server.
 * Cảnh báo khẩn / học sinh tự nhờ giúp thì gửi thêm email (không kèm nội dung tin nhắn),
 * gửi SAU khi đã trả lời học sinh để học sinh không phải chờ.
 */
export async function createAlert(input: AlertInput) {
  const { profile, type, severity } = input;
  const { excerpt, reasons } = labelAlert(input.excerpt, input.reasons ?? [], input.context);
  const admin = createAdminClient();
  const row = {
    student_id: profile.id,
    class_id: profile.class_id,
    nickname: profile.nickname,
    full_name: profile.full_name,
    type,
    severity,
    excerpt: excerpt ? excerpt.slice(0, 1000) : null,
    reasons,
  };
  // Cùng bạn, cùng loại, cảnh báo "cần để ý" trong 3 giờ: thêm lý do vào cảnh báo đang mở thay vì tạo cảnh báo mới (alert-merge.ts).
  // Khẩn cấp luôn tạo mới. Đọc lỗi thì cứ tạo mới: thà trùng còn hơn mất cảnh báo.
  if (severity === "watch") {
    const { data: recent } = await admin
      .from("alerts")
      .select("id, type, severity, status, created_at, reasons")
      .eq("student_id", profile.id)
      .gte("created_at", new Date(Date.now() - MERGE_WINDOW_MS).toISOString())
      .limit(20);
    const target = mergeTarget((recent ?? []) as OpenAlert[], { type, severity }, new Date());
    if (target) {
      const { error: mergeError } = await admin.from("alerts").update({ reasons: mergeReasons(target.reasons, reasons) }).eq("id", target.id);
      if (!mergeError) return true;
      console.error("[F-Mood] Gộp cảnh báo lỗi, tạo cảnh báo mới", mergeError.message);
    }
  }
  let { error } = await admin.from("alerts").insert(row);
  // chưa chạy migration 0018 (chưa có loại 'survey_risk'): ghi như cảnh báo bài tập để không mất cảnh báo
  if (error?.code === "23514" && type === "survey_risk") ({ error } = await admin.from("alerts").insert({ ...row, type: "lesson_risk" }));
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
