"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { unreadHelpReplies } from "@/lib/help-requests";
import { composeNote, helpRequestSchema, TO_LABEL } from "@/lib/help-requests-shared";
import { missingSchema } from "@/lib/worries";
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

// ───────── Lời nhờ giúp không khẩn: "Mình muốn nói chuyện với thầy cô" ─────────

type AskResult = { ok: true; already: boolean; urgent: boolean } | { ok: false; error: string };

/**
 * Học sinh gửi lời nhờ (HD05, QT10) cho GVCN hoặc phòng tham vấn (không khẩn), SAU khi đã xem trước và bấm "Gửi".
 * Chỉ gửi đúng 3 ý học sinh viết (không gửi kèm cuộc trò chuyện với Mây). Ba ý vẫn được quét câu nguy hiểm:
 * có dấu hiệu thì tạo cảnh báo như ở trò chuyện. Đã có lời nhờ đang chờ gửi cùng người thì không tạo trùng.
 */
export async function askToTalk(input: {
  toRole: string;
  when: string;
  difficulty: string;
  tried: string;
  want: string;
  withBuddy: boolean;
}): Promise<AskResult> {
  const profile = await requireProfile();
  const parsed = helpRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Chưa gửi được." };
  const { toRole, when, difficulty, tried, want, withBuddy } = parsed.data;
  const note = composeNote({ difficulty, tried, want });
  if (toRole === "teacher" && !profile.class_id) return { ok: false, error: "Bạn chưa vào lớp nào nên chưa có thầy cô chủ nhiệm. Chọn phòng tham vấn nhé." };

  const admin = createAdminClient();
  const { data: waiting, error: readError } = await admin
    .from("help_requests")
    .select("id")
    .eq("student_id", profile.id)
    .eq("to_role", toRole)
    .eq("status", "new")
    .limit(1);
  if (readError) return { ok: false, error: "Phần này chưa mở. Bạn tìm thầy cô trực tiếp nhé." };

  const safety = note ? await checkMessage(note, []) : { level: "none" as const, reasons: [] };
  if (safety.level !== "none") {
    await createAlert({
      profile,
      type: "help_request",
      severity: safety.level === "urgent" ? "urgent" : "watch",
      excerpt: `Học sinh hẹn nói chuyện với ${TO_LABEL[toRole].toLowerCase()}\nLời nhắn: ${note}`,
      reasons: safety.reasons,
    });
  }
  if (waiting?.length) return { ok: true, already: true, urgent: safety.level === "urgent" };

  const row = {
    student_id: profile.id,
    class_id: profile.class_id,
    nickname: profile.nickname,
    full_name: profile.full_name,
    to_role: toRole,
    when_pref: when,
  };
  let { error } = await admin.from("help_requests").insert({ ...row, difficulty, tried, want, with_buddy: withBuddy, note: null });
  // chưa chạy 0014: ghép 3 ý vào một ô lời nhắn như bản cũ
  if (missingSchema(error)) ({ error } = await admin.from("help_requests").insert({ ...row, note: withBuddy ? `${note}\n(Em muốn rủ một bạn đi cùng)`.slice(0, 300) : note }));
  if (error) return { ok: false, error: "Chưa gửi được. Thử lại nhé, hoặc tìm thầy cô trực tiếp." };
  revalidatePath("/home");
  return { ok: true, already: false, urgent: safety.level === "urgent" };
}

/** Học sinh đã đọc lời đáp: cất khỏi trang chủ. */
export async function closeMyHelpRequest(id: string): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { error } = await createAdminClient()
    .from("help_requests")
    .update({ status: "done" })
    .eq("id", id)
    .eq("student_id", profile.id)
    .eq("status", "replied");
  revalidatePath("/home");
  return { ok: !error };
}

/**
 * Số lời đáp của thầy cô học sinh chưa đọc, để hiện chấm báo trên thanh menu. Trình duyệt hỏi SAU khi trang đã hiện,
 * nên trang không phải chờ thêm một lượt hỏi cơ sở dữ liệu.
 */
export async function myUnreadReplies(): Promise<number> {
  const profile = await requireProfile();
  return unreadHelpReplies(profile);
}
