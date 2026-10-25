"use server";

import { requireProfile } from "@/lib/auth";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage } from "@/lib/safety/check";
import { createAdminClient } from "@/lib/supabase/admin";

const EXCERPT_PREFIX = "Học sinh bấm “Cần giúp ngay”";

/**
 * Học sinh bấm "Báo thầy cô" ở trang Cần giúp ngay: tạo cảnh báo KHẨN cho GVCN và
 * phòng tham vấn (kèm email, không có nội dung lời nhắn). Bấm lại trong 30 phút thì không gửi trùng.
 */
export async function requestHelpNow(
  note: string,
): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  const profile = await requireProfile();
  const text = note.trim().slice(0, 500);
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("alerts")
    .select("id")
    .eq("student_id", profile.id)
    .eq("type", "help_request")
    .neq("status", "resolved")
    .ilike("excerpt", `${EXCERPT_PREFIX}%`)
    .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString())
    .limit(1);
  if (recent?.length) return { ok: true, already: true };

  const reasons = ["Học sinh tự bấm “Cần giúp ngay”"];
  if (text) reasons.push(...(await checkMessage(text, [])).reasons);

  const ok = await createAlert({
    profile,
    type: "help_request",
    severity: "urgent",
    excerpt: `${EXCERPT_PREFIX}${text ? `\nLời nhắn: ${text}` : ""}`,
    reasons,
  });
  return ok ? { ok: true, already: false } : { ok: false, error: "Chưa gửi được. Bạn hãy gọi số ở trên hoặc tìm thầy cô trực tiếp nhé." };
}
