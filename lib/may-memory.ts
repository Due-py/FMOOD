import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FOLLOW_UP_DAYS,
  MAX_MEMORIES,
  type Concern,
  type ConcernStatus,
  type Memory,
  type MemoryKind,
} from "@/lib/may-memory-shared";

// Đọc / ghi những điều Mây nhớ và danh sách điều bận lòng (quyền server).
// Chưa chạy migration 0007 thì coi như chưa có gì, để chat vẫn chạy.

const MISSING = new Set(["42P01", "42703", "PGRST205"]);

const CONCERN_COLUMNS = "id, title, intensity, status, next_check_at, last_checked_at, created_at";

export async function getMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await createAdminClient()
    .from("student_memories")
    .select("id, kind, content, created_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error && !MISSING.has(error.code)) console.error("[F-Mood] đọc ghi nhớ lỗi", error);
  return (data ?? []) as Memory[];
}

/** Điều bận lòng chưa xong (đang bận lòng / đã đỡ hơn). */
export async function getOpenConcerns(userId: string): Promise<Concern[]> {
  const { data, error } = await createAdminClient()
    .from("student_concerns")
    .select(CONCERN_COLUMNS)
    .eq("user_id", userId)
    .neq("status", "resolved")
    .order("created_at");
  if (error && !MISSING.has(error.code)) console.error("[F-Mood] đọc điều bận lòng lỗi", error);
  return (data ?? []) as Concern[];
}

export function dueConcerns(concerns: Concern[], now = Date.now()): Concern[] {
  return concerns.filter((c) => c.next_check_at && new Date(c.next_check_at).getTime() <= now);
}

function followUpAt(from = Date.now()): string {
  return new Date(from + FOLLOW_UP_DAYS * 86_400_000).toISOString();
}

export async function addMemory(userId: string, kind: MemoryKind, content: string): Promise<Memory | null> {
  const db = createAdminClient();
  const existing = await getMemories(userId);

  // trùng hệt điều đã nhớ thì thôi
  const same = existing.find((m) => m.content.toLowerCase() === content.toLowerCase());
  if (same) return same;
  // chỉ giữ một cách xưng hô (cái mới thay cái cũ)
  const stale = existing.filter((m) => kind === "address" && m.kind === "address").map((m) => m.id);
  // đầy thì bỏ điều cũ nhất
  const overflow = existing.length - stale.length - (MAX_MEMORIES - 1);
  if (overflow > 0) stale.push(...existing.filter((m) => !stale.includes(m.id)).slice(0, overflow).map((m) => m.id));
  if (stale.length) await db.from("student_memories").delete().in("id", stale).eq("user_id", userId);

  const { data, error } = await db
    .from("student_memories")
    .insert({ user_id: userId, kind, content })
    .select("id, kind, content, created_at")
    .single();
  if (error) {
    console.error("[F-Mood] lưu ghi nhớ lỗi", error);
    return null;
  }
  return data as Memory;
}

export async function addConcern(userId: string, title: string, intensity: number): Promise<Concern | null> {
  const { data, error } = await createAdminClient()
    .from("student_concerns")
    .insert({ user_id: userId, title, intensity, next_check_at: followUpAt() })
    .select(CONCERN_COLUMNS)
    .single();
  if (error) {
    console.error("[F-Mood] lưu điều bận lòng lỗi", error);
    return null;
  }
  return data as Concern;
}

export async function updateConcernFromChat(
  userId: string,
  id: string,
  patch: { intensity?: number | null; status?: ConcernStatus | null },
): Promise<Concern | null> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { last_checked_at: now, updated_at: now };
  if (patch.intensity) update.intensity = patch.intensity;
  if (patch.status) update.status = patch.status;
  update.next_check_at = patch.status === "resolved" ? null : followUpAt();
  const { data, error } = await createAdminClient()
    .from("student_concerns")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select(CONCERN_COLUMNS)
    .maybeSingle();
  if (error) console.error("[F-Mood] cập nhật điều bận lòng lỗi", error);
  return (data as Concern | null) ?? null;
}

/** Mây vừa hỏi thăm các điều bận lòng này: dời lần hỏi thăm tiếp theo. */
export async function markConcernsAsked(userId: string, ids: string[]) {
  if (!ids.length) return;
  await createAdminClient()
    .from("student_concerns")
    .update({ last_checked_at: new Date().toISOString(), next_check_at: followUpAt() })
    .in("id", ids)
    .eq("user_id", userId);
}

export type OpenerContext = {
  checkin: { id: string; emotions: string[]; created_at: string } | null;
  due: Concern[];
};

/** Check-in trong vòng này (phút) được Mây nhắc tới khi mở cuộc trò chuyện mới. */
const CHECKIN_WINDOW_MIN = 180;

/**
 * Mây có nên chủ động mở lời không: có check-in gần đây chưa được nhắc tới,
 * hoặc có điều bận lòng đến hạn hỏi thăm.
 */
export async function getOpenerContext(userId: string): Promise<OpenerContext | null> {
  const db = createAdminClient();
  const since = new Date(Date.now() - CHECKIN_WINDOW_MIN * 60_000).toISOString();
  const [{ data: latest }, concerns] = await Promise.all([
    db
      .from("checkins")
      .select("id, emotions, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getOpenConcerns(userId),
  ]);

  let checkin = latest as OpenerContext["checkin"];
  if (checkin) {
    const { count, error } = await db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("checkin_id", checkin.id);
    // đã mở chuyện cho lần check-in này rồi (hoặc chưa chạy migration) thì thôi
    if (error || (count ?? 0) > 0) checkin = null;
  }
  const due = dueConcerns(concerns);
  return checkin || due.length ? { checkin, due } : null;
}
