"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, type Profile } from "@/lib/auth";
import { wordCount } from "@/lib/activity-describe";
import { logActivity } from "@/lib/activity-log";
import { assistantName } from "@/lib/assistant";
import { journalNextQuestion, journalWeekLetter } from "@/lib/ai/journal-ai";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { BODY_MAX, nextFallback, skillFor, weekFacts, type WeekLetter } from "@/lib/journal-shared";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage, CLASSIFIER_DOWN_REASON, keywordLayer, type SafetyResult } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import { maxLevel } from "@/lib/safety/keywords";
import type { SkillId } from "@/lib/skills";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// NHẬT KÝ của học sinh (lib/journal-shared.ts). Ghi bằng quyền máy chủ để kiểm tra an toàn TRƯỚC khi trả kết quả và đếm lượt
// dùng mẫu; đọc bằng quyền học sinh (RLS: chỉ trang của mình). Nội dung không ghi vào nhật ký hoạt động.

export type SaveJournalResult =
  | {
      ok: true;
      id: string;
      /** khẩn cấp: câu soạn sẵn đã duyệt và thầy cô đã được báo chưa */
      crisis: { text: string; notified: boolean } | null;
      /** đáng lo: đã báo thầy cô mức "để ý" (notified: báo được chưa); trang hiện thẻ người lắng nghe */
      concern: { notified: boolean } | null;
      /** ý 2: trang kể một chuyện khó → mời kể với trợ lý */
      talk: boolean;
      /** ý 5: bài luyện hợp với chuyện vừa viết */
      skill: SkillId | null;
    }
  | { ok: false; error: string };

const NOT_READY = "Nhật ký chưa sẵn sàng (cần chạy file 0024 trên máy chủ dữ liệu).";
const FAILED = "Chưa lưu được. Thử lại nhé.";

const saveSchema = z.object({
  id: z.uuid().nullable().optional(),
  promptId: z.uuid().nullable().optional(),
  body: z.string().trim().min(1, "Viết ít nhất một chữ nhé.").max(BODY_MAX, `Một trang tối đa ${BODY_MAX} ký tự.`),
});

/** Quét an toàn như tin nhắn trò chuyện: từ khóa rõ nguy hiểm thì không chờ AI; AI lỗi thì coi là đáng lo. */
async function scan(text: string): Promise<SafetyResult> {
  const keyword = await keywordLayer(text);
  if (keyword.level === "urgent") return keyword;
  return checkMessage(text, []).catch((error) => {
    console.error("[F-Mood] Kiểm tra an toàn nhật ký lỗi", error);
    return { level: maxLevel(keyword.level, "concern"), reasons: [...keyword.reasons, CLASSIFIER_DOWN_REASON] };
  });
}

export async function saveJournalEntry(input: unknown): Promise<SaveJournalResult> {
  const profile = await requireProfile();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { id, promptId, body } = parsed.data;
  const db = createAdminClient();

  // mẫu câu (chỉ mẫu đang dùng); sửa trang cũ thì giữ mẫu cũ
  let promptText = "";
  if (!id && promptId) {
    const { data, error } = await db.from("journal_prompts").select("text, uses").eq("id", promptId).eq("active", true).maybeSingle();
    if (error?.code === "42P01" || error?.code === "PGRST205") return { ok: false, error: NOT_READY };
    promptText = (data?.text as string | undefined) ?? "";
  }

  const safety = await scan(body);
  const now = new Date().toISOString();
  const saved = id
    ? await db.from("journal_entries").update({ body, updated_at: now }).eq("id", id).eq("user_id", profile.id).select("id").maybeSingle()
    : await db
        .from("journal_entries")
        .insert({ user_id: profile.id, prompt_id: promptText ? promptId : null, prompt_text: promptText, body })
        .select("id")
        .single();
  if (saved.error?.code === "42P01" || saved.error?.code === "PGRST205") return { ok: false, error: NOT_READY };
  if (saved.error || !saved.data) return { ok: false, error: FAILED };
  const entryId = saved.data.id as string;
  if (!id && promptText && promptId) await bumpUses(promptId);
  logActivity(profile, "journal_write", String(wordCount(body)), body);
  revalidatePath("/nhat-ky");

  // ý 1: có dấu hiệu nguy hiểm thì báo thầy cô (học sinh đã được báo trước trên trang nhật ký)
  if (safety.level !== "none") {
    const severity = safety.level === "urgent" ? "urgent" : "watch";
    const alert = createAlert({ profile, type: "chat_risk", severity, excerpt: `Nhật ký: ${body}`, reasons: safety.reasons });
    if (safety.level === "urgent") {
      const [message, notified] = await Promise.all([crisisResponse(), alert]);
      return { ok: true, id: entryId, crisis: { text: crisisWithStatus(message, notified), notified }, concern: null, talk: false, skill: null };
    }
    return { ok: true, id: entryId, crisis: null, concern: { notified: await alert }, talk: false, skill: null };
  }
  const sel = safety.sel;
  return { ok: true, id: entryId, crisis: null, concern: null, talk: Boolean(sel?.difficulty), skill: sel ? skillFor(sel) : null };
}

async function bumpUses(promptId: string) {
  const db = createAdminClient();
  const { data } = await db.from("journal_prompts").select("uses").eq("id", promptId).maybeSingle();
  if (data) await db.from("journal_prompts").update({ uses: ((data.uses as number) ?? 0) + 1 }).eq("id", promptId);
  revalidatePath("/staff/content/nhat-ky");
}

export async function deleteJournalEntry(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Không tìm thấy trang này." };
  const { error } = await createAdminClient().from("journal_entries").delete().eq("id", id).eq("user_id", profile.id);
  if (error) return { ok: false, error: "Chưa xóa được. Thử lại nhé." };
  revalidatePath("/nhat-ky");
  return { ok: true };
}

// ───────── AI: ý 4 (gợi ý viết tiếp) và ý 3 (nhìn lại tuần) ─────────

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

/** Ý 4: một câu hỏi gợi mở để viết tiếp. Viết chưa đủ, đang có dấu hiệu nguy hiểm, AI lỗi hay bấm quá nhiều thì dùng câu soạn sẵn. */
export async function suggestJournalNext(promptText: string, draft: string): Promise<{ question: string; careful: boolean }> {
  const profile = await requireProfile();
  const text = String(draft ?? "").slice(0, BODY_MAX);
  const prompt = String(promptText ?? "").slice(0, 200);
  // chữ đang viết có dấu hiệu nguy hiểm (lớp từ khóa, tức thì): không gợi ý viết tiếp, nhắc nút Cần giúp
  if ((await keywordLayer(text)).level !== "none") return { question: "", careful: true };
  logActivity(profile, "journal_next");
  const ai = text.trim().length >= 12 && allowAi(profile.id) ? await journalNextQuestion({ name: await assistantName(), promptText: prompt, draft: text }) : null;
  return { question: ai ?? nextFallback(text), careful: false };
}

export type WeekReview = { ok: true; facts: string[]; letter: WeekLetter | null; empty: boolean } | { ok: false; error: string };

/** Ý 3: số liệu tuần do mã tính, AI viết thư ngắn (AI lỗi thì chỉ hiện số liệu). */
export async function journalWeekReview(): Promise<WeekReview> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = dayKey();
  const [checkins, entries] = await Promise.all([
    supabase.from("checkins").select("emotions, created_at").eq("user_id", profile.id).gte("created_at", startOfDayIso(addDays(today, -27))),
    supabase.from("journal_entries").select("body, created_at").eq("user_id", profile.id).gte("created_at", startOfDayIso(addDays(today, -6))).order("created_at"),
  ]);
  const { facts, enough } = weekFacts(
    (checkins.data ?? []).map((c) => ({ emotions: c.emotions as string[], at: c.created_at as string })),
    (entries.data ?? []).map((e) => dayKey(e.created_at as string)),
    today,
    dayKey,
  );
  if (!enough) return { ok: true, facts, letter: null, empty: true };
  logActivity(profile, "journal_review");
  const letter = allowAi(profile.id)
    ? await journalWeekLetter({ name: await assistantName(), facts, pages: (entries.data ?? []).slice(-5).map((e) => e.body as string) })
    : null;
  return { ok: true, facts, letter, empty: false };
}

export type { Profile };
