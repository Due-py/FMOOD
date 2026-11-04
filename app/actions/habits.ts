"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, type Profile } from "@/lib/auth";
import { assistantName } from "@/lib/assistant";
import { habitAdjust, habitQuestion } from "@/lib/ai/habit-review";
import { dayKey } from "@/lib/dates";
import { isHabitIcon } from "@/lib/habit-icons";
import { getHabit } from "@/lib/habits";
import { factLines, fallbackQuestion, habitFacts, type HabitAdjust } from "@/lib/habits-shared";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage, CLASSIFIER_DOWN_REASON, keywordLayer, type SafetyResult } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import { maxLevel } from "@/lib/safety/keywords";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const habitSchema = z.object({
  title: z.string().trim().min(1, "Đặt tên cho thói quen nhé").max(60, "Tên thói quen tối đa 60 ký tự"),
  icon: z.string().trim().refine(isHabitIcon, "Chọn một biểu tượng (một emoji) nhé"),
});

const MAX_ACTIVE = 8;
const TOO_MANY = "Tập trung vào tối đa 8 thói quen thôi. Ít mà đều sẽ tốt hơn!";

async function atLimit(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("archived", false);
  return (count ?? 0) >= MAX_ACTIVE;
}

function refresh() {
  revalidatePath("/habits");
  revalidatePath("/home");
}

export async function createHabit(input: { title: string; icon: string }): Promise<Result> {
  const profile = await requireProfile();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (await atLimit(profile.id)) return { ok: false, error: TOO_MANY };

  const { error } = await supabase.from("habits").insert({ user_id: profile.id, ...parsed.data });
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

/** Đánh dấu / bỏ đánh dấu thói quen cho hôm nay (theo giờ Việt Nam). */
export async function toggleHabitToday(habitId: string, done: boolean): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  const supabase = await createClient();
  const day = dayKey();

  // chỉ chạm được thói quen của chính mình; ghi bằng quyền server với ngày do máy chủ đặt
  // (học sinh không tự chèn ngày cũ để lấy điểm khu vườn)
  const { data: habit } = await supabase.from("habits").select("id").eq("id", habitId).eq("user_id", profile.id).maybeSingle();
  if (!habit) return { ok: false, error: "Không tìm thấy thói quen." };
  const { error } = done
    ? await createAdminClient().from("habit_logs").upsert({ habit_id: habitId, day }, { ignoreDuplicates: true })
    : await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("day", day);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

/** Lưu trữ (archived = true) hoặc khôi phục một thói quen. Số ngày đã làm vẫn giữ nguyên. */
async function setArchived(habitId: string, archived: boolean): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  if (!archived && (await atLimit(profile.id))) return { ok: false, error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase.from("habits").update({ archived }).eq("id", habitId).eq("user_id", profile.id);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

export async function archiveHabit(habitId: string): Promise<Result> {
  return setArchived(habitId, true);
}

export async function restoreHabit(habitId: string): Promise<Result> {
  return setArchived(habitId, false);
}

/** Đổi biểu tượng của một thói quen của chính mình (chọn có sẵn hoặc tự gõ một emoji). */
export async function updateHabitIcon(habitId: string, icon: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  const value = String(icon).trim();
  if (!isHabitIcon(value)) return { ok: false, error: "Chọn một biểu tượng (một emoji) nhé." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("habits").update({ icon: value }).eq("id", habitId).eq("user_id", profile.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

/** Đổi tên một thói quen của chính mình (học sinh chọn điều chỉnh "Nhìn lại cùng trợ lý" gợi ý). */
export async function renameHabit(habitId: string, title: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  const parsed = habitSchema.shape.title.safeParse(title);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("habits").update({ title: parsed.data }).eq("id", habitId).eq("user_id", profile.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

// ───────── Nhìn lại cùng trợ lý (lib/ai/habit-review.ts) ─────────
// App tự đếm số liệu; AI hỏi một câu rồi gợi ý một điều chỉnh. AI lỗi vẫn trả số liệu và câu hỏi soạn sẵn.
// Câu trả lời của học sinh qua cùng lớp an toàn như tin nhắn trò chuyện TRƯỚC khi tới AI:
//   khẩn cấp → không gọi AI, trả câu soạn sẵn và báo thầy cô · đáng lo → vẫn gợi ý, ghi cảnh báo theo dõi.

type Crisis = { ok: false; crisis: { text: string; notified: boolean } };
export type HabitReviewStart = { ok: true; facts: string[]; question: string } | { ok: false; error: string };
export type HabitReviewAdjust = { ok: true; adjust: HabitAdjust | null } | { ok: false; error: string } | Crisis;

const ANSWER_MAX = 300;
const NOT_FOUND = "Không tìm thấy thói quen.";
const TOO_FAST = "Bạn nhìn lại nhiều quá rồi, nghỉ một chút rồi thử lại nhé.";

// Giới hạn gọi AI theo từng học sinh (trong bộ nhớ của máy chủ đang chạy, đủ để chặn bấm liên tục; không tốn bảng mới).
const WINDOW_MS = 10 * 60_000;
const MAX_CALLS = 12;
const calls = new Map<string, number[]>();
function allowAi(userId: string): boolean {
  const now = Date.now();
  const recent = (calls.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_CALLS) return false;
  calls.set(userId, [...recent, now]);
  return true;
}

/** Quét an toàn chữ học sinh viết (giống trò chuyện): từ khóa rõ nguy hiểm thì không chờ AI; lỗi thì coi là đáng lo. */
async function safetyGate(profile: Profile, text: string): Promise<Crisis | null> {
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
    await createAlert({ profile, type: "chat_risk", severity: "watch", excerpt: text, reasons: safety.reasons });
    return null;
  }
  const [message, notified] = await Promise.all([
    crisisResponse(),
    createAlert({ profile, type: "chat_risk", severity: "urgent", excerpt: text, reasons: safety.reasons }),
  ]);
  return { ok: false, crisis: { text: crisisWithStatus(message, notified), notified } };
}

/** Bước 1: số liệu app tự đếm và một câu hỏi (AI viết; AI lỗi thì câu soạn sẵn từ số liệu). */
export async function startHabitReview(habitId: string): Promise<HabitReviewStart> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: NOT_FOUND };
  const habit = await getHabit(profile.id, habitId);
  if (!habit) return { ok: false, error: NOT_FOUND };
  const f = habitFacts(habit);
  const facts = factLines(f);
  const question = allowAi(profile.id) ? await habitQuestion({ name: await assistantName(), title: habit.title, facts }) : null;
  return { ok: true, facts, question: question ?? fallbackQuestion(f) };
}

/** Bước 2: học sinh trả lời (hoặc bỏ qua, answer = null); AI gợi ý một điều chỉnh, lỗi thì adjust = null. */
export async function suggestHabitAdjust(habitId: string, question: string, answer: string | null): Promise<HabitReviewAdjust> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: NOT_FOUND };
  const text = (answer ?? "").replace(/\s+/g, " ").trim().slice(0, ANSWER_MAX) || null;
  if (text) {
    const crisis = await safetyGate(profile, text);
    if (crisis) return crisis;
  }
  const habit = await getHabit(profile.id, habitId);
  if (!habit) return { ok: false, error: NOT_FOUND };
  if (!allowAi(profile.id)) return { ok: false, error: TOO_FAST };
  const adjust = await habitAdjust({
    name: await assistantName(),
    title: habit.title,
    facts: factLines(habitFacts(habit)),
    question: String(question).replace(/\s+/g, " ").trim().slice(0, 200),
    answer: text,
  });
  return { ok: true, adjust };
}
