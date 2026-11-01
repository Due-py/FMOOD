import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JournalPrompt } from "@/lib/journal-shared";

// NHẬT KÝ, phần đọc (quyền học sinh qua RLS: chỉ đọc trang của chính mình và mẫu đang dùng). Xem lib/journal-shared.ts.
// Chưa chạy migration 0024 thì `ready = false`: trang nhật ký báo chưa sẵn sàng, phần khác vẫn chạy.

export type JournalEntry = { id: string; prompt_id: string | null; prompt_text: string; body: string; created_at: string; updated_at: string };

const missing = (code: string | undefined) => code === "42P01" || code === "PGRST205";

/** Mẫu câu đang dùng, theo thứ tự admin xếp. */
export async function journalPrompts(): Promise<{ ready: boolean; prompts: JournalPrompt[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("journal_prompts").select("id, kind, text, emoji, uses").eq("active", true).order("sort_order").order("created_at");
  if (missing(error?.code)) return { ready: false, prompts: [] };
  return { ready: true, prompts: (data ?? []) as JournalPrompt[] };
}

/** Các trang nhật ký của học sinh, mới trước. */
export async function journalEntries(userId: string, limit = 60): Promise<JournalEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("id, prompt_id, prompt_text, body, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as JournalEntry[];
}

/** Một trang của chính học sinh (không phải của mình thì null). */
export async function journalEntry(userId: string, id: string): Promise<JournalEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("id, prompt_id, prompt_text, body, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as JournalEntry | null) ?? null;
}

/** Tóm tắt cho ô Nhật ký ở trang Hành trình: số trang đã viết và ngày viết gần nhất (không đọc nội dung). */
export async function journalSummary(userId: string): Promise<{ count: number; lastAt: string | null }> {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("journal_entries")
    .select("created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  return { count: count ?? 0, lastAt: (data?.[0]?.created_at as string | undefined) ?? null };
}
