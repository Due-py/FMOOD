import "server-only";
import type { Profile } from "@/lib/auth";
import { awardBadge } from "@/lib/badges";
import { dayKey } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import { isWho } from "@/lib/support-picks";

// VIỆC NHỎ và "ĐÃ KỂ VỚI AI" (quyền server). Mỗi lần ghi vào sổ hoạt động (tính giọt nước)
// và trao huy hiệu dấu mốc lần đầu. Không lưu học sinh đã kể chuyện gì, chỉ lưu kể với ai.

export type StepResult = { ok: true; firstTime: boolean } | { ok: false; error: string };

/** Mã chuyện bận lòng nếu đúng là của học sinh này, không thì null (bỏ qua, không báo lỗi). */
async function ownWorry(userId: string, worryId: string | null): Promise<string | null> {
  if (!worryId) return null;
  const { data } = await createAdminClient().from("worries").select("id").eq("id", worryId).eq("user_id", userId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function completeTinyAction(profile: Profile, actionKey: string, worryId: string | null): Promise<StepResult> {
  const actions = await contentForProfile(profile, ["tiny_action"]);
  if (!actions.some((a) => a.key === actionKey)) return { ok: false, error: "Việc nhỏ này chưa dùng được." };
  const { error } = await createAdminClient()
    .from("support_activity")
    .insert({ user_id: profile.id, kind: "tiny_action_done", ref: actionKey, worry_id: await ownWorry(profile.id, worryId), day: dayKey() });
  if (error) {
    console.error("[F-Mood] Ghi việc nhỏ lỗi", error);
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  return { ok: true, firstTime: await awardBadge(profile.id, "thu-viec-nho") };
}

export async function markTold(profile: Profile, who: string, worryId: string | null): Promise<StepResult> {
  if (!isWho(who)) return { ok: false, error: "Chọn người bạn đã kể nhé." };
  const { error } = await createAdminClient()
    .from("support_activity")
    .insert({ user_id: profile.id, kind: "told", ref: who, worry_id: await ownWorry(profile.id, worryId), day: dayKey() });
  if (error) {
    console.error("[F-Mood] Ghi đã kể lỗi", error);
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  return { ok: true, firstTime: await awardBadge(profile.id, "cay-cau") };
}

/**
 * Học sinh trả lời "Có phải bạn đang lo chuyện…?": chỉ ghi chủ đề và đúng / không đúng (không ghi tin nhắn),
 * để đo Mây đoán đúng bao nhiêu. Không tính giọt nước. Chưa chạy 0013 thì bỏ qua, không làm phiền học sinh.
 */
export async function recordTopicGuess(profile: Profile, topic: string, correct: boolean): Promise<void> {
  const topics = await contentForProfile(profile, ["topic"]);
  if (!topics.some((t) => t.topic === topic)) return;
  const { error } = await createAdminClient()
    .from("support_activity")
    .insert({ user_id: profile.id, kind: correct ? "topic_guess_yes" : "topic_guess_no", ref: topic, day: dayKey() });
  if (error) console.error("[F-Mood] Ghi câu trả lời đoán chủ đề lỗi", error.message);
}

export type Reflection = "helped" | "no_help" | "unsure";
const REFLECTIONS: Reflection[] = ["helped", "no_help", "unsure"];

/**
 * Học sinh bấm "Bỏ qua" một việc nhỏ (không hợp, không muốn làm), hoặc trả lời câu nhìn lại sau khi làm.
 * Chỉ ghi mã việc và lựa chọn, không ghi chữ học sinh viết. Không tính giọt nước. Chưa chạy 0014 thì bỏ qua.
 */
export async function recordActionChoice(
  profile: Profile,
  actionKey: string,
  worryId: string | null,
  choice: { skipped: true } | { reflection: string },
): Promise<void> {
  const actions = await contentForProfile(profile, ["tiny_action"]);
  if (!actions.some((a) => a.key === actionKey)) return;
  if ("reflection" in choice && !REFLECTIONS.includes(choice.reflection as Reflection)) return;
  const { error } = await createAdminClient()
    .from("support_activity")
    .insert({
      user_id: profile.id,
      kind: "skipped" in choice ? "tiny_action_skipped" : "tiny_action_reflect",
      ref: "skipped" in choice ? actionKey : `${actionKey}|${choice.reflection}`.slice(0, 80),
      worry_id: await ownWorry(profile.id, worryId),
      day: dayKey(),
    });
  if (error) console.warn("[F-Mood] Ghi lựa chọn việc nhỏ lỗi", error.message);
}
