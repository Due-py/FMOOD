import "server-only";
import { dayKey } from "@/lib/dates";
import { isSkillCode, SKILL_CODES, type SkillCode } from "@/lib/skills";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickSample, type SkillSample } from "@/lib/skill-samples";
import { dueFollowup, type FollowupCandidate, type JourneySessionRow, type Used } from "./review";
import { situationFromRow, snapshotFromRows } from "./rows";
import type { PracticeFeedback, PracticeView, RoleplayTurn } from "./shared";
import { AI_LIMITS, aiAllowed, PRACTICE_STATES, PRACTICE_STEPS, type AiUses, type Answers, type PracticeState, type PracticeStep, type Snapshot } from "./state";

// BÀI LUYỆN (quyền server). Mọi hàm đọc / ghi đều lọc theo user_id: chỉ chủ bài mới thấy và sửa được.
// Chưa chạy migration 0017 thì coi như trang Luyện kỹ năng "chưa sẵn sàng" (không báo lỗi cho học sinh).

const MISSING = new Set(["42P01", "42703", "PGRST205"]);
export const missingTable = (error: { code?: string } | null) => Boolean(error?.code && MISSING.has(error.code));

const SESSION_COLS =
  "id, skill, case_code, own_situation, step, state, hint_count, feedback_count, stall_count, ai_uses, bridge, next_try, completed_at, created_at, updated_at";

export type SessionRow = {
  id: string;
  skill: SkillCode;
  case_code: string | null;
  own_situation: string | null;
  step: PracticeStep;
  state: PracticeState;
  hint_count: number;
  feedback_count: number;
  stall_count: number;
  ai_uses: AiUses;
  bridge: string | null;
  next_try: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AttemptRow = {
  id: string;
  version: 1 | 2;
  answers: Answers;
  feedback: PracticeFeedback | null;
  roleplay: RoleplayTurn[] | null;
  created_at: string;
};

export type LoadedSession = { session: SessionRow; attempts: AttemptRow[] };

/** Tình huống của bài luyện (để hiện và để đưa cho trợ lý): tình huống mẫu hoặc lời học sinh tự kể. */
export function situationOf(s: Pick<SessionRow, "case_code" | "own_situation">): { text: string | null; own: boolean } {
  return situationFromRow(s);
}

/** Trạng thái dựng lại từ dữ liệu đã lưu (khôi phục sau khi tải lại trang; hàm thuần ở rows.ts, có test). */
export function toSnapshot({ session, attempts }: LoadedSession): Snapshot {
  return snapshotFromRows(session, attempts);
}

/** Bài luyện của CHÍNH học sinh này. null khi không có (hoặc không phải của bạn ấy); "missing" khi chưa chạy 0017. */
export async function loadSession(userId: string, id: string): Promise<LoadedSession | null | "missing"> {
  const db = createAdminClient();
  const [{ data, error }, attempts] = await Promise.all([
    db.from("practice_sessions").select(SESSION_COLS).eq("id", id).eq("user_id", userId).maybeSingle(),
    db.from("practice_attempts").select("id, version, answers, feedback, roleplay, created_at").eq("session_id", id).eq("user_id", userId).order("version"),
  ]);
  if (error) {
    if (missingTable(error)) return "missing";
    console.error("[F-Mood] Đọc bài luyện lỗi", error.message);
    return null;
  }
  if (!data || !isSkillCode(data.skill) || !PRACTICE_STEPS.includes(data.step) || !PRACTICE_STATES.includes(data.state)) return null;
  return {
    session: { ...(data as SessionRow), ai_uses: (data.ai_uses as AiUses | null) ?? {} },
    attempts: ((attempts.error ? [] : attempts.data) ?? []) as AttemptRow[],
  };
}

export type SkillStat = { count: number; completed: number; lastAt: string | null };
export type OpenSession = { id: string; skill: SkillCode; state: PracticeState; step: PracticeStep; caseCode: string | null; updatedAt: string };

/** Số lần luyện, lần gần nhất của từng kỹ năng và các bài còn dở (trang Luyện kỹ năng). */
export async function practiceOverview(
  userId: string,
): Promise<{ ready: boolean; stats: Record<SkillCode, SkillStat>; open: OpenSession[] }> {
  const stats = Object.fromEntries(SKILL_CODES.map((s) => [s, { count: 0, completed: 0, lastAt: null }])) as Record<SkillCode, SkillStat>;
  const { data, error } = await createAdminClient()
    .from("practice_sessions")
    .select("id, skill, state, step, case_code, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) {
    if (!missingTable(error)) console.error("[F-Mood] Đọc bài luyện lỗi", error.message);
    return { ready: !missingTable(error), stats, open: [] };
  }
  const open: OpenSession[] = [];
  for (const r of data ?? []) {
    if (!isSkillCode(r.skill)) continue;
    const st = stats[r.skill];
    // chỉ tính lần đã thật sự làm (đã qua bước Hiểu), không tính lần mở rồi đóng ngay
    if (r.state !== "not_started") {
      st.count++;
      st.lastAt ??= r.updated_at;
    }
    if (r.state === "completed") st.completed++;
    if (["in_progress", "need_hint", "skipped", "paused"].includes(r.state) && open.length < 5) {
      open.push({ id: r.id, skill: r.skill, state: r.state, step: r.step, caseCode: r.case_code, updatedAt: r.updated_at });
    }
  }
  return { ready: true, stats, open };
}

/** Khó khăn học sinh đã bấm "Đúng rồi" gần nhất (để điền sẵn "tình huống của mình"). Chưa chạy 0014 thì null. */
export async function latestDifficulty(userId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("worries")
    .select("difficulty, difficulty_at")
    .eq("user_id", userId)
    .not("difficulty", "is", null)
    .order("difficulty_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data?.difficulty as string | null) ?? null;
}

export async function insertSession(
  userId: string,
  input: { skill: SkillCode; caseCode: string | null; ownSituation: string | null; state?: PracticeState },
): Promise<{ id: string } | "missing" | null> {
  const { data, error } = await createAdminClient()
    .from("practice_sessions")
    .insert({ user_id: userId, skill: input.skill, case_code: input.caseCode, own_situation: input.ownSituation, state: input.state ?? "not_started" })
    .select("id")
    .single();
  if (error) {
    if (missingTable(error)) return "missing";
    console.error("[F-Mood] Tạo bài luyện lỗi", error.message);
    return null;
  }
  return { id: data.id as string };
}

/** Ghi trạng thái mới (chỉ của chủ bài). */
export async function saveSnapshot(userId: string, id: string, s: Snapshot, extra: Record<string, unknown> = {}): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("practice_sessions")
    .update({
      step: s.step,
      state: s.state,
      hint_count: s.hintCount,
      feedback_count: s.feedbackCount,
      stall_count: s.stallCount,
      updated_at: new Date().toISOString(),
      ...(s.state === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...extra,
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) console.error("[F-Mood] Lưu bài luyện lỗi", error.message);
  return !error;
}

export async function updateSession(userId: string, id: string, patch: Record<string, unknown>): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("practice_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) console.error("[F-Mood] Lưu bài luyện lỗi", error.message);
  return !error;
}

export async function insertAttempt(userId: string, sessionId: string, version: 1 | 2, answers: Answers): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("practice_attempts")
    .upsert({ session_id: sessionId, user_id: userId, version, answers }, { onConflict: "session_id,version" });
  if (error) console.error("[F-Mood] Lưu bài làm lỗi", error.message);
  return !error;
}

export async function updateAttempt(userId: string, sessionId: string, version: 1 | 2, patch: { feedback?: PracticeFeedback; roleplay?: RoleplayTurn[] }) {
  const { error } = await createAdminClient()
    .from("practice_attempts")
    .update(patch)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("version", version);
  if (error) console.error("[F-Mood] Lưu góp ý lỗi", error.message);
  return !error;
}

export async function removeSession(userId: string, id: string): Promise<boolean> {
  const { error } = await createAdminClient().from("practice_sessions").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("[F-Mood] Xóa bài luyện lỗi", error.message);
  return !error;
}

export type PracticeMeasure = "practice_done" | "practice_feedback" | "practice_revised" | "practice_completed";

/**
 * Ghi để đo (kế hoạch mục 3.7): chỉ loại việc và mã kỹ năng, KHÔNG ghi nội dung bài làm. Không tính giọt nước.
 * Lỗi (ví dụ chưa chạy 0017 nên sổ chưa nhận loại mới) thì bỏ qua, không làm phiền học sinh.
 */
export async function recordPracticeMeasure(userId: string, kind: PracticeMeasure, skill: SkillCode): Promise<void> {
  const { error } = await createAdminClient().from("support_activity").insert({ user_id: userId, kind, ref: skill, day: dayKey() });
  if (error) console.warn("[F-Mood] Ghi số liệu bài luyện lỗi", error.message);
}

/** Bài luyện gửi xuống trình duyệt. */
export function viewOf({ session, attempts }: LoadedSession): PracticeView {
  const sit = situationOf(session);
  return {
    id: session.id,
    skill: session.skill,
    caseCode: session.case_code,
    situation: sit.text,
    own: sit.own,
    step: session.step,
    state: session.state,
    hintCount: session.hint_count,
    feedbackCount: session.feedback_count,
    roleplayLeft: Math.max(0, AI_LIMITS.roleplay - (session.ai_uses.roleplay ?? 0)),
    exampleLeft: aiAllowed("example", session.ai_uses, session.state),
    bridge: session.bridge,
    nextTry: session.next_try,
    attempts: attempts.map((a) => ({ version: a.version, answers: a.answers ?? {}, feedback: a.feedback, roleplay: a.roleplay ?? [] })),
  };
}

/** Số bài học sinh này mở trong 10 phút gần đây (chặn mở bài liên tục để gọi AI). */
export async function recentSessionCount(userId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("practice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  return count ?? 0;
}

// ───────── Nhìn lại và vận dụng (kế hoạch Demo 3, Bước 4; migration 0021) ─────────

/** Chưa chạy 0021: cột hỏi lại chưa có. */
const missingColumn = (error: { code?: string } | null) => ["42703", "PGRST204"].includes(error?.code ?? "");

export type PracticeFollowup = { id: string; skill: SkillCode; situation: string | null; nextTry: string | null };

/** Bài luyện tới hạn hỏi lại "đã dùng thật chưa, lần sau chỉnh gì" (1–3 ngày sau khi hoàn thành). null khi chưa chạy 0021. */
export async function practiceFollowup(userId: string, now: Date = new Date()): Promise<PracticeFollowup | null> {
  const { data, error } = await createAdminClient()
    .from("practice_sessions")
    .select("id, skill, state, case_code, own_situation, next_try, completed_at, followup_at")
    .eq("user_id", userId)
    .eq("state", "completed")
    .is("followup_at", null)
    .gte("completed_at", new Date(now.getTime() - 5 * 86_400_000).toISOString())
    .limit(20);
  if (error) {
    if (!missingTable(error) && !missingColumn(error)) console.error("[F-Mood] Đọc bài luyện cần hỏi lại lỗi", error.message);
    return null;
  }
  const due = dueFollowup((data ?? []).filter((r) => isSkillCode(r.skill)) as (FollowupCandidate & Pick<SessionRow, "skill" | "case_code" | "own_situation" | "next_try">)[], now);
  return due ? { id: due.id, skill: due.skill, situation: situationOf(due).text, nextTry: due.next_try } : null;
}

/**
 * Lưu câu trả lời hỏi lại (hoặc bấm bỏ qua: cả hai đều null) cho bài luyện ĐÃ HOÀN THÀNH của chính học sinh này.
 * Chỉ lưu một lần (lần sau thẻ không hiện nữa). false khi chưa chạy 0021 hoặc không tìm thấy bài.
 */
export async function saveFollowup(userId: string, id: string, used: Used | null, nextTime: string | null): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("practice_sessions")
    .update({ followup_used: used, next_time: nextTime, followup_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("state", "completed")
    .is("followup_at", null)
    .select("id");
  if (error) {
    if (!missingColumn(error)) console.error("[F-Mood] Lưu hỏi lại bài luyện lỗi", error.message);
    return false;
  }
  return Boolean(data?.length);
}

/** Mã tình huống TL học sinh đã luyện cho một kỹ năng, mới trước (để gợi ý tình huống mới, mục 4.2). */
export async function usedCaseCodes(userId: string, skill: SkillCode): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("practice_sessions")
    .select("case_code")
    .eq("user_id", userId)
    .eq("skill", skill)
    .not("case_code", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return [...new Set((data ?? []).map((r) => r.case_code as string))];
}

/** Bài luyện của học sinh cho trang Hành trình (mục 4.3), mới trước. `ready = false` khi chưa chạy 0017. */
export async function practiceJourney(userId: string): Promise<{ ready: boolean; rows: JourneySessionRow[] }> {
  const db = createAdminClient();
  const base = "id, skill, state, case_code, own_situation, next_try, completed_at, updated_at";
  const read = (cols: string) =>
    db.from("practice_sessions").select(cols).eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
  let { data, error } = await read(`${base}, next_time, followup_used`);
  // chưa chạy 0021: đọc như cũ, chỉ thiếu "lần sau sẽ chỉnh gì"
  if (missingColumn(error)) ({ data, error } = await read(base));
  if (error) {
    if (!missingTable(error)) console.error("[F-Mood] Đọc bài luyện cho Hành trình lỗi", error.message);
    return { ready: !missingTable(error), rows: [] };
  }
  type Row = Pick<SessionRow, "id" | "skill" | "state" | "case_code" | "own_situation" | "next_try" | "completed_at" | "updated_at"> & {
    next_time?: string | null;
    followup_used?: string | null;
  };
  const sessions = ((data ?? []) as unknown as Row[]).filter((r) => isSkillCode(r.skill));
  const ids = sessions.map((s) => s.id);
  const attempts = ids.length
    ? await db.from("practice_attempts").select("session_id, version, answers").eq("user_id", userId).in("session_id", ids)
    : { data: [], error: null };
  const bySession = new Map<string, JourneySessionRow["attempts"]>();
  for (const a of (attempts.error ? [] : (attempts.data ?? [])) as { session_id: string; version: 1 | 2; answers: Answers | null }[]) {
    const list = bySession.get(a.session_id) ?? [];
    list.push({ version: a.version, answers: a.answers ?? {} });
    bySession.set(a.session_id, list);
  }
  return {
    ready: true,
    rows: sessions.map((s) => ({
      id: s.id,
      skill: s.skill,
      state: s.state,
      case_code: s.case_code,
      situation: situationOf(s).text,
      next_try: s.next_try,
      next_time: s.next_time ?? null,
      followup_used: s.followup_used ?? null,
      completed_at: s.completed_at,
      updated_at: s.updated_at,
      attempts: bySession.get(s.id) ?? [],
    })),
  };
}

/**
 * Mẫu của bài luyện này (ngân hàng mẫu, lib/skill-samples.ts): gần loại với chuyện của học sinh, khác bối cảnh,
 * và đổi theo số bài cùng kỹ năng học sinh đã mở TRƯỚC bài này (tải lại trang không đổi mẫu). Đọc lỗi thì lấy hạng 0.
 */
export async function sampleFor(userId: string, session: Pick<SessionRow, "skill" | "case_code" | "own_situation" | "created_at">): Promise<SkillSample> {
  const { count } = await createAdminClient()
    .from("practice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("skill", session.skill)
    .lt("created_at", session.created_at);
  return pickSample(session.skill, { situation: session.own_situation, caseCode: session.case_code, rank: count ?? 0 });
}
