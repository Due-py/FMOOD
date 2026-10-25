import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AlertInput } from "./alerts";
import { buildAlertEmail } from "./notify-email";

// EMAIL BÁO THẦY CÔ KHI CÓ CẢNH BÁO KHẨN
// Gửi qua Resend (https://resend.com) bằng REST, không cần thêm thư viện.
// Email KHÔNG BAO GIỜ chứa nội dung tin nhắn / câu trả lời của học sinh: chỉ báo
// "có cảnh báo, mức nào, lớp nào" và đường dẫn để thầy cô đăng nhập xem.
//
// Biến môi trường (xem .env.example):
//   RESEND_API_KEY      khóa Resend; để trống = không gửi email (cảnh báo vẫn hiện trong trang thầy cô)
//   ALERT_EMAIL_FROM    địa chỉ gửi, ví dụ "F-Mood <canh-bao@ten-mien-cua-truong.vn>"
//   APP_URL             địa chỉ web, ví dụ https://f-mood-mocha.vercel.app (để tạo đường dẫn)
//   ALERT_EMAIL_DRY_RUN=1  chỉ in email ra log, không gửi (dùng khi thử)

/** Email của thầy cô phụ trách: GVCN của lớp + phòng tham vấn (không ai thì gửi admin). */
async function recipients(classId: string | null): Promise<{ emails: string[]; className: string | null }> {
  const admin = createAdminClient();
  const [{ data: cls }, { data: staff }] = await Promise.all([
    classId
      ? admin.from("classes").select("name, homeroom_teacher_id").eq("id", classId).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("profiles").select("id, role, email").in("role", ["counselor", "admin", "teacher"]).is("locked_at", null),
  ]);
  const people = (staff ?? []).filter((s) => s.email);
  let chosen = people.filter((s) => s.role === "counselor" || (cls && s.id === cls.homeroom_teacher_id));
  if (chosen.length === 0) chosen = people.filter((s) => s.role === "admin");
  return { emails: [...new Set(chosen.map((s) => s.email as string))], className: cls?.name ?? null };
}

/** Gửi email báo thầy cô. Không bao giờ ném lỗi (cảnh báo đã nằm trong trang thầy cô). */
export async function emailStaff(alert: AlertInput): Promise<"sent" | "skipped" | "failed"> {
  try {
    const { emails, className } = await recipients(alert.profile.class_id);
    if (emails.length === 0) {
      console.error("[F-Mood] Không có email thầy cô nào để báo cảnh báo");
      return "failed";
    }
    const { subject, text } = buildAlertEmail(alert, { className, appUrl: process.env.APP_URL ?? null, at: new Date() });

    if (process.env.ALERT_EMAIL_DRY_RUN === "1") {
      console.log(`[F-Mood] (thử, không gửi) email tới ${emails.length} thầy cô\n${subject}\n${text}`);
      return "skipped";
    }
    const key = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_EMAIL_FROM;
    if (!key || !from) {
      console.warn("[F-Mood] Chưa cài RESEND_API_KEY / ALERT_EMAIL_FROM nên chưa gửi email cảnh báo");
      return "skipped";
    }
    // mỗi thầy cô một thư riêng, để không lộ email của nhau và một địa chỉ lỗi không chặn các thư khác
    const results = await Promise.all(
      emails.map(async (to) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [to], subject, text }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) console.error("[F-Mood] Gửi email cảnh báo lỗi", res.status, await res.text().catch(() => ""));
        return res.ok;
      }),
    );
    return results.some(Boolean) ? "sent" : "failed";
  } catch (error) {
    console.error("[F-Mood] Gửi email cảnh báo lỗi", error);
    return "failed";
  }
}
