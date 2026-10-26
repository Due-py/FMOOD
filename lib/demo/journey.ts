import "server-only";
import { addDays, dayKey } from "@/lib/dates";
import { dominantEmotion, getEmotion } from "@/lib/emotions";
import { supportDrops } from "@/lib/garden-drops";
import { stageFor, type Plant } from "@/lib/garden";
import { followupLoop, type FollowupLoop } from "@/lib/loop-content";
import { listAlerts } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { allContent } from "@/lib/support-content-server";
import { LEVEL_LABELS, type Feeling } from "@/lib/worries-shared";
import { demoProfile } from "./people";
import { demoRegistry } from "./server";

// HÀNH TRÌNH 1 THÁNG CỦA MỘT BẠN MẪU: đọc bằng quyền máy chủ, CHỈ cho tài khoản mẫu (demoProfile từ chối tài khoản thật).
// Trang này cố ý cho thấy cả phần riêng tư (tin nhắn đếm được, không hiện chữ) để giải thích "ai thấy gì".

export type JourneyEvent = { at: string; emoji: string; title: string; detail?: string; tone: "mint" | "sky" | "peach" | "lilac" | "butter" };

const WHO_LABEL: Record<string, string> = { parent: "bố mẹ", teacher: "thầy cô", friend: "bạn bè", other: "một người tin cậy" };
const FEELING_LABEL: Record<Feeling, string> = { better: "Đỡ hơn", same: "Vẫn vậy", worse: "Nặng hơn", done: "Chuyện này xong rồi" };

export async function journeyData(studentId: string) {
  const profile = await demoProfile(studentId);
  if (!profile || profile.role !== "student") return null;
  const db = createAdminClient();
  const today = dayKey();
  const [cls, checkins, worries, checks, activity, badges, help, habits, harvests, plants, convs, reflections, content, followup, registry] = await Promise.all([
    db.from("classes").select("id, name, homeroom:profiles!classes_homeroom_teacher_id_fkey(id, nickname)").eq("id", profile.class_id ?? "").maybeSingle(),
    db.from("checkins").select("emotions, created_at").eq("user_id", studentId).order("created_at"),
    db.from("worries").select("id, topic, note, level_start, level_now, status, next_check_at, created_at").eq("user_id", studentId).order("created_at"),
    db.from("worry_checks").select("worry_id, level, feeling, created_at").eq("user_id", studentId).order("created_at"),
    db.from("support_activity").select("kind, ref, day, created_at").eq("user_id", studentId).order("created_at"),
    db.from("badges_earned").select("badge_key, earned_at").eq("user_id", studentId),
    db.from("help_requests").select("to_role, note, status, reply, replied_by_name, replied_at, created_at").eq("student_id", studentId),
    db.from("habits").select("id, title, icon, challenge_id, habit_logs(day)").eq("user_id", studentId),
    db.from("garden_harvests").select("plant_name, plant_emoji, points_used, created_at").eq("user_id", studentId),
    db.from("garden_plants").select("id, name, stages").eq("active", true).order("sort_order"),
    db.from("conversations").select("id, created_at").eq("user_id", studentId),
    db.from("reflection_answers").select("id", { count: "exact", head: true }).eq("user_id", studentId),
    allContent(),
    followupLoop(profile),
    demoRegistry(),
  ]);
  const convIds = (convs.data ?? []).map((c) => c.id as string);
  const { count: messages } = convIds.length
    ? await db.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", convIds).eq("role", "user")
    : { count: 0 };

  const item = (kind: string, key: string) => content.items.find((i) => i.kind === kind && (i.topic === key || i.key === key));
  const topicLabel = (t: string) => {
    const it = item("topic", t);
    return it ? { label: String(it.data.label), emoji: String(it.data.emoji) } : { label: t, emoji: "☁️" };
  };
  const badgeInfo = (key: string) => {
    const it = content.items.find((i) => i.kind === "badge" && i.key === `badge.${key}`);
    return it ? { name: String(it.data.name), emoji: String(it.data.emoji) } : { name: key, emoji: "🏅" };
  };

  // ── Lịch cảm xúc 31 ngày ──
  const byDay = new Map<string, string[]>();
  for (const c of checkins.data ?? []) byDay.set(dayKey(c.created_at as string), [...(byDay.get(dayKey(c.created_at as string)) ?? []), ...(c.emotions as string[])]);
  const calendar = Array.from({ length: 31 }, (_, i) => {
    const day = addDays(today, i - 30);
    const top = byDay.has(day) ? dominantEmotion(byDay.get(day) as string[]) : undefined;
    return { day, emoji: top?.emoji ?? null, color: top?.color ?? null, label: top?.label ?? null, group: top?.group ?? null };
  });

  // ── Chuyện bận lòng và mức lo qua từng lần hỏi lại ──
  const checksBy = new Map<string, { level: number; feeling: Feeling; at: string }[]>();
  for (const c of checks.data ?? []) checksBy.set(c.worry_id as string, [...(checksBy.get(c.worry_id as string) ?? []), { level: c.level as number, feeling: c.feeling as Feeling, at: c.created_at as string }]);
  const worryList = (worries.data ?? []).map((w) => ({
    id: w.id as string,
    ...topicLabel(w.topic as string),
    note: w.note as string | null,
    levelStart: w.level_start as number,
    levelNow: w.level_now as number,
    status: w.status as string,
    nextCheckAt: w.next_check_at as string | null,
    createdAt: w.created_at as string,
    checks: checksBy.get(w.id as string) ?? [],
  }));

  // ── Dòng thời gian ──
  const events: JourneyEvent[] = [];
  const firstCheckin = (checkins.data ?? [])[0];
  if (firstCheckin) {
    const e = getEmotion((firstCheckin.emotions as string[])[0]);
    events.push({ at: firstCheckin.created_at as string, emoji: e?.emoji ?? "🙂", title: "Check-in cảm xúc lần đầu", detail: e?.label, tone: "butter" });
  }
  for (const w of worryList) {
    events.push({ at: w.createdAt, emoji: w.emoji, title: `Kể chuyện bận lòng: ${w.label}`, detail: `Mức lo lúc kể: ${LEVEL_LABELS[w.levelStart - 1]}`, tone: "peach" });
    for (const c of w.checks) {
      events.push({ at: c.at, emoji: "☁️", title: `Mây hỏi lại chuyện "${w.label}"`, detail: `${FEELING_LABEL[c.feeling]} · ${LEVEL_LABELS[c.level - 1]}`, tone: c.level < w.levelStart ? "mint" : "sky" });
    }
  }
  for (const a of activity.data ?? []) {
    if (a.kind === "tiny_action_done") {
      const it = content.items.find((i) => i.kind === "tiny_action" && i.key === a.ref);
      events.push({ at: a.created_at as string, emoji: "🌱", title: "Thử một việc nhỏ", detail: it ? String(it.data.title) : undefined, tone: "mint" });
    } else if (a.kind === "told") {
      events.push({ at: a.created_at as string, emoji: "🌉", title: `Đã kể với ${WHO_LABEL[a.ref as string] ?? "một người tin cậy"}`, tone: "lilac" });
    }
  }
  for (const b of badges.data ?? []) {
    const info = badgeInfo(b.badge_key as string);
    events.push({ at: b.earned_at as string, emoji: info.emoji, title: `Nhận huy hiệu "${info.name}"`, tone: "butter" });
  }
  for (const h of help.data ?? []) {
    events.push({ at: h.created_at as string, emoji: "🙋", title: `Nhờ ${h.to_role === "counselor" ? "phòng tham vấn" : "thầy cô chủ nhiệm"} nói chuyện`, tone: "lilac" });
    if (h.reply) events.push({ at: h.replied_at as string, emoji: "💌", title: `${h.replied_by_name} trả lời`, detail: h.reply as string, tone: "lilac" });
  }
  for (const h of harvests.data ?? []) events.push({ at: h.created_at as string, emoji: h.plant_emoji as string, title: `Thu hoạch cây ${h.plant_name}`, tone: "mint" });
  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  // ── Khu vườn (giống lib/garden.ts, đọc bằng quyền máy chủ cho bạn mẫu) ──
  const habitRows = (habits.data ?? []) as { id: string; title: string; icon: string; challenge_id: string | null; habit_logs: { day: string }[] }[];
  const habitDone = habitRows.reduce((s, h) => s + (h.habit_logs?.length ?? 0), 0);
  const earned = habitDone + byDay.size + supportDrops((activity.data ?? []) as { kind: string; day: string }[]);
  const spent = (harvests.data ?? []).reduce((s, h) => s + (h.points_used as number), 0);
  const plantList = (plants.data ?? []) as Plant[];
  const { data: me } = await db.from("profiles").select("garden_plant_id").eq("id", studentId).maybeSingle();
  const plant = plantList.find((p) => p.id === me?.garden_plant_id) ?? plantList[0] ?? null;
  const progress = Math.max(0, earned - spent);
  const stage = plant ? plant.stages[stageFor(plant.stages, progress)] : null;

  // ── Ai thấy gì: GVCN xem bằng đúng hàm của trang GVCN ──
  const homeroom = cls.data?.homeroom as unknown as { id: string; nickname: string } | null;
  const teacher = homeroom ? await demoProfile(homeroom.id) : null;
  const teacherAlerts = teacher ? await listAlerts(teacher, { studentId }) : [];
  const counselor = registry ? await demoProfile(registry.showcase.counselor) : null;
  const counselorAlerts = counselor ? await listAlerts(counselor, { studentId }) : [];

  const openWorry = worryList.filter((w) => w.status === "open" && w.nextCheckAt).sort((a, b) => Date.parse(a.nextCheckAt!) - Date.parse(b.nextCheckAt!))[0] ?? null;

  return {
    student: { id: profile.id, nickname: profile.nickname, className: (cls.data?.name as string | undefined) ?? null },
    teacherName: homeroom?.nickname ?? null,
    counselorName: counselor?.nickname ?? null,
    calendar,
    checkinDays: byDay.size,
    worries: worryList,
    events,
    badges: (badges.data ?? []).map((b) => ({ ...badgeInfo(b.badge_key as string), at: b.earned_at as string })),
    habits: habitRows.map((h) => ({ title: h.title, icon: h.icon, days: h.habit_logs?.length ?? 0, challenge: Boolean(h.challenge_id) })),
    garden: plant && stage ? { plant: plant.name, emoji: stage.emoji, stage: stage.label, progress, earned } : null,
    privateCounts: { messages: messages ?? 0, conversations: convIds.length, reflections: reflections.count ?? 0, notes: worryList.filter((w) => w.note).length },
    teacherSees: teacherAlerts.map((a) => ({ type: a.type, severity: a.severity, hidden: a.contentHidden, at: a.created_at })),
    counselorSees: counselorAlerts.map((a) => ({ type: a.type, severity: a.severity, excerpt: a.excerpt, status: a.status, at: a.created_at })),
    helpToTeacher: (help.data ?? []).filter((h) => h.to_role === "teacher").length,
    helpToCounselor: (help.data ?? []).filter((h) => h.to_role === "counselor").length,
    followup: followup as FollowupLoop | null,
    nextCheck: openWorry ? { label: openWorry.label, emoji: openWorry.emoji, at: openWorry.nextCheckAt as string } : null,
  };
}

export type JourneyData = NonNullable<Awaited<ReturnType<typeof journeyData>>>;
