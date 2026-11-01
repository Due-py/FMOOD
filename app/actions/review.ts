"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, type Profile } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { saveFollowup } from "@/lib/practice/server";
import { cleanNextTime, isUsed } from "@/lib/practice/review";
import { createAlert, type AlertInput } from "@/lib/safety/alerts";
import { checkMessage, CLASSIFIER_DOWN_REASON, keywordLayer, type SafetyResult } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import { maxLevel } from "@/lib/safety/keywords";
import { createAdminClient } from "@/lib/supabase/admin";
import { missingSchema } from "@/lib/worries";

// NHÌN LẠI VÀ VẬN DỤNG (kế hoạch Demo 3, Bước 4) và "SOẠN ĐỂ TỰ HỎI" (Bước 5, mục 5.1). Thuộc Demo 2.1.
// "Lần sau bạn sẽ chỉnh gì?" là chữ học sinh tự viết nên được quét an toàn như tin nhắn:
//   khẩn cấp → không lưu, trả câu soạn sẵn và báo thầy cô · đáng lo → vẫn lưu, ghi cảnh báo theo dõi.
// Nhật ký đợt thử chỉ ghi loại việc (và mã kỹ năng), không bao giờ ghi chữ học sinh viết.

type Crisis = { ok: false; crisis: { text: string; notified: boolean } };
export type ReviewResult = { ok: true } | { ok: false; error: string } | Crisis;

const SAVE_FAILED = "Chưa lưu được. Bạn thử lại nhé.";

/** Quét an toàn chữ học sinh viết; khẩn cấp thì trả câu soạn sẵn (nói đúng thầy cô đã được báo hay chưa). */
async function safetyGate(profile: Profile, text: string, type: AlertInput["type"]): Promise<Crisis | null> {
  const keyword = await keywordLayer(text);
  const safety: SafetyResult =
    keyword.level === "urgent"
      ? keyword
      : await checkMessage(text, []).catch((error) => {
          console.error("[F-Mood] Kiểm tra an toàn lỗi", error);
          return { level: maxLevel(keyword.level, "concern"), reasons: [...keyword.reasons, CLASSIFIER_DOWN_REASON] };
        });
  if (safety.level === "none") return null;
  if (safety.level === "concern") {
    await createAlert({ profile, type, severity: "watch", excerpt: text, reasons: safety.reasons });
    return null;
  }
  const [message, notified] = await Promise.all([crisisResponse(), createAlert({ profile, type, severity: "urgent", excerpt: text, reasons: safety.reasons })]);
  return { ok: false, crisis: { text: crisisWithStatus(message, notified), notified } };
}

/**
 * Sau khi trả lời "… hỏi thăm" một chuyện bận lòng: "Lần sau bạn sẽ chỉnh gì?" (không bắt buộc).
 * Ghi vào lần hỏi lại MỚI NHẤT của chính chuyện đó. Chưa chạy 0021 thì báo chưa lưu được.
 */
export async function saveWorryNextTime(worryId: string, choice: string | null, text: string | null): Promise<ReviewResult> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(worryId).success) return { ok: false, error: "Không tìm thấy chuyện này." };
  const nextTime = cleanNextTime(choice, text);
  if (!nextTime) return { ok: false, error: "Chọn một ô hoặc viết vài chữ nhé." };
  const crisis = await safetyGate(profile, nextTime, "chat_risk");
  if (crisis) return crisis;

  const db = createAdminClient();
  const { data: last } = await db
    .from("worry_checks")
    .select("id")
    .eq("worry_id", worryId)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return { ok: false, error: SAVE_FAILED };
  const { error } = await db.from("worry_checks").update({ next_time: nextTime }).eq("id", last.id).eq("user_id", profile.id);
  if (error) {
    if (!missingSchema(error)) console.error("[F-Mood] Lưu điều sẽ chỉnh lỗi", error.message);
    return { ok: false, error: SAVE_FAILED };
  }
  revalidatePath("/hanh-trinh");
  return { ok: true };
}

/**
 * Thẻ hỏi lại bài luyện trên Trang chủ (1–3 ngày sau khi hoàn thành): "Bạn đã dùng cách này thật chưa?" và
 * "Lần sau bạn sẽ chỉnh gì?". `skip`: học sinh bấm bỏ qua, thôi hỏi bài này (không ghi câu trả lời).
 */
export async function answerPracticeFollowup(
  id: string,
  input: { used: string | null; choice: string | null; text: string | null; skip?: boolean },
): Promise<ReviewResult> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Không tìm thấy bài luyện này." };
  const skip = input.skip === true;
  const used = !skip && isUsed(input.used) ? input.used : null;
  const nextTime = skip ? null : cleanNextTime(input.choice, input.text);
  if (!skip && !used && !nextTime) return { ok: false, error: "Chọn một ô, hoặc bấm “Bỏ qua” nhé." };
  if (nextTime) {
    const crisis = await safetyGate(profile, nextTime, "lesson_risk");
    if (crisis) return crisis;
  }
  if (!(await saveFollowup(profile.id, id, used, nextTime))) return { ok: false, error: SAVE_FAILED };
  if (!skip) logActivity(profile, "practice_followup", used ?? "next_time");
  revalidatePath("/home");
  revalidatePath("/hanh-trinh");
  return { ok: true };
}

/**
 * Học sinh bấm "Sao chép" ở lời nhờ "Soạn để tự hỏi". KHÔNG gửi gì, không lưu chữ: chỉ đếm số lần (nhật ký đợt thử),
 * và tách hẳn khỏi "help_request" để "đã sao chép" không bao giờ bị tính là "đã gửi".
 */
export async function noteSelfAsk(): Promise<void> {
  const profile = await requireProfile();
  logActivity(profile, "help_self_ask");
}
