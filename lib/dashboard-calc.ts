// TỔNG QUAN APP: tính số liệu cho 7 khu (kế hoạch Demo 3, 13.2). Hàm thuần, không đọc cơ sở dữ liệu,
// có test (dashboard.test.ts). Phần đọc dữ liệu ở lib/dashboard.ts.
//
// Quy định: chỉ số liệu gộp, không có nội dung tin nhắn hay bài làm; nhóm dưới MIN_GROUP bạn bị ẩn (null);
// chỉ tính học sinh có trong `students` (bên đọc dữ liệu đã bỏ lớp thử, lớp trình diễn và lọc theo lớp).
import { addDays, dayKey, TIME_ZONE } from "@/lib/dates";
import { dominantGroup, isUnsure } from "@/lib/emotions";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { SOURCE_LABEL, isConversationSource } from "@/lib/chat-source";
import { CASEL, CASEL_LABEL, MOVE_LABEL, MOVE_SKILL, SEL_MOVES, type SelMove } from "@/lib/sel/engine";
import { CHARACTER_KEYS, GROUP_LABEL, GUIDANCE_KEYS, LENGTH_KEYS, MOTIVATION_KEYS, normalizeStyle, normalizeStyleSettings, optionLabel, STYLE_GROUPS, type ChatStyle, type StyleGroup } from "@/lib/ai/chat-style";

// ───────────────────────── Khoảng thời gian ─────────────────────────

export type Range = { from: string; to: string; preset: RangePreset };
export type RangePreset = "7" | "30" | "dot-thu" | "tu-chon";

export const PRESET_LABEL: Record<RangePreset, string> = {
  "7": "7 ngày",
  "30": "30 ngày",
  "dot-thu": "Đợt thử 03–12/11",
  "tu-chon": "Tự chọn",
};

/** Đợt dùng thử của Demo 3. */
export const TRIAL = { from: "2026-11-03", to: "2026-11-12" };
/** Khoảng tự chọn dài nhất (ngày), để trang không đọc quá nhiều dữ liệu. */
export const MAX_SPAN = 120;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Đọc bộ lọc thời gian từ đường dẫn (?khoang=7|30|dot-thu|tu-chon&tu=…&den=…). Sai thì về 7 ngày. */
export function resolveRange(params: { khoang?: unknown; tu?: unknown; den?: unknown }, today: string): Range {
  const preset = params.khoang;
  if (preset === "30") return { from: addDays(today, -29), to: today, preset: "30" };
  if (preset === "dot-thu") return { ...TRIAL, preset: "dot-thu" };
  if (preset === "tu-chon" && typeof params.tu === "string" && DAY.test(params.tu)) {
    const to = typeof params.den === "string" && DAY.test(params.den) ? params.den : today;
    if (params.tu <= to) {
      const from = daysBetween(params.tu, to) > MAX_SPAN ? addDays(to, -MAX_SPAN) : params.tu;
      return { from, to, preset: "tu-chon" };
    }
  }
  return { from: addDays(today, -6), to: today, preset: "7" };
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function daysOf(range: { from: string; to: string }): string[] {
  const out: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
  return out;
}

const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" });

/** Giờ (0–23) theo giờ Việt Nam. */
export function vnHour(iso: string): number {
  return Number(hourFmt.format(new Date(iso)));
}

/** Thứ trong tuần theo giờ Việt Nam: 0 = Thứ hai … 6 = Chủ nhật. */
export function vnWeekday(iso: string): number {
  const [y, m, d] = dayKey(iso).split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Ẩn số người từ 1 đến MIN_GROUP − 1 (0 thì vẫn hiện là 0). */
export function small(n: number): number | null {
  return n > 0 && n < MIN_GROUP ? null : n;
}

const ratio = (a: number, b: number) => (b ? a / b : null);

// ───────────────────────── Dữ liệu vào ─────────────────────────

type At = { userId: string; at: string };

export type DashRows = {
  /** học sinh được tính (đã bỏ lớp thử, lớp trình diễn; đã lọc theo lớp) */
  students: { id: string; classId: string | null }[];
  checkins: (At & { emotions: string[] })[];
  conversations: (At & { id: string; source: string | null })[];
  /** mã bước SEL đã đi của từng cuộc trò chuyện (conversations.sel_state); null = chưa chạy 0022 */
  selMoves?: (At & { moves: string[] })[] | null;
  /** chỉ tin của học sinh */
  messages: (At & { conversationId: string })[];
  feedback: (At & { rating: number })[];
  /** support_activity: tiny_action_done, topic_guess_yes, practice_* … */
  activity: (At & { kind: string; ref: string | null })[];
  /** content_opens: lượt mở bài thư viện, việc nhỏ */
  opens: (At & { kind: string; ref: string })[];
  /** cảnh báo của các lớp được tính */
  alerts: { at: string; severity: string }[];
  helpRequests: At[];
  /** bấm "Cần giúp" (nhật ký đợt thử) */
  helpButtons: At[];
  worries: (At & { topic: string })[];
  worryChecks: (At & { feeling: string })[];
  habitLogs: { userId: string; day: string }[];
  gardenHarvests: At[];
  /** bài luyện (migration 0017): at = lúc bắt đầu; null = chưa có bảng */
  practice: (At & { skill: string | null; status: string | null; completedAt?: string | null })[] | null;
  /** điểm bài đo đã khóa (migration 0018); null = chưa có bảng hoặc chưa đọc được */
  testScores: { userId: string; round: number; total: number }[] | null;
  /**
   * lựa chọn trò chuyện hiện tại của từng học sinh (cột profiles.chat_style, migration 0020; null = chưa tự chọn);
   * cả mảng null = chưa có cột. Chỉ để đếm, không có nội dung.
   */
  chatStyles?: { userId: string; style: unknown }[] | null;
  /** mức mặc định admin đặt (học sinh chưa tự chọn được tính theo mức này) */
  styleDefault?: ChatStyle;
};

export type Labels = { topics: Record<string, string>; actions: Record<string, string>; lessons: Record<string, string> };

// ───────────────────────── Kết quả ─────────────────────────

export type Feature = "chat" | "checkin" | "practice" | "tiny_action" | "library" | "habits" | "garden" | "help";

export const FEATURE_LABEL: Record<Feature, string> = {
  chat: "Trò chuyện",
  checkin: "Ghi tâm trạng",
  practice: "Luyện kỹ năng",
  tiny_action: "Việc nhỏ",
  library: "Thư viện",
  habits: "Thói quen",
  garden: "Khu vườn",
  help: "Cần giúp, lời nhờ",
};

export const SKILLS = ["K1", "K2", "K3", "K4"] as const;
export const SKILL_LABEL: Record<(typeof SKILLS)[number], string> = { K1: "Nhận diện", K2: "Điều tiết", K3: "Giải quyết vấn đề", K4: "Tìm kiếm hỗ trợ" };

export type MoodCounts = { positive: number; neutral: number; negative: number; unsure: number; total: number };

export type Dashboard = {
  range: { from: string; to: string };
  students: number;
  /** số học sinh được tính ít hơn MIN_GROUP: ẩn toàn bộ */
  tooSmall: boolean;
  usage: {
    activeToday: number | null;
    active7: number | null;
    activeRange: number | null;
    totals: { checkins: number; practiceDone: number; actionsDone: number; help: number; alerts: number };
    daily: { day: string; active: number | null; checkins: number; practice: number; actions: number; help: number; alerts: number }[];
  };
  mood: { total: MoodCounts | null; daily: { day: string; counts: MoodCounts | null }[] };
  chat: {
    conversations: number;
    messages: number;
    avgPerConversation: number | null;
    sources: { key: string; label: string; count: number }[];
    /** số cuộc trò chuyện đã đi qua từng bước SEL (bộ điều phối); null = chưa có dữ liệu */
    /** `note`: nhãn kỹ năng của bước (mã K và năng lực CASEL), rỗng với bước điều phối */
    selSteps: { key: string; label: string; count: number; note: string }[] | null;
    /** số cuộc trò chuyện đã chạm tới mỗi năng lực CASEL (qua nhãn của các bước) */
    selCasel: { key: string; label: string; count: number }[] | null;
    topics: { key: string; label: string; count: number; students: number }[];
    hiddenTopics: number;
    feedback: { ups: number; downs: number };
    /** nhân vật và tùy chọn đang dùng (Bước 9.7); null = chưa chạy 0020 */
    styles: {
      /** số bạn đã tự chọn (còn lại dùng mặc định) */
      chosen: number | null;
      /** số lần học sinh lưu lựa chọn trong khoảng */
      changes: number;
      groups: { group: StyleGroup; label: string; items: { key: string; label: string; students: number | null; isDefault: boolean }[] }[];
    } | null;
    /** thẻ gợi ý đã hiện và đã bấm trong khoảng (Bước 10.4), đếm lượt */
    cards: {
      goal: { shown: number; add: number; later: number };
      skill: { shown: number; opened: number; bySkill: { skill: string; shown: number; opened: number }[] };
      end: { shown: number; stop: number; cont: number };
    };
  };
  practice: {
    ready: boolean;
    bySkill: { skill: string; label: string; sessions: number; students: number | null; completed: number }[];
    rates: { feedback: number | null; revised: number | null; completed: number | null };
    topActions: { key: string; label: string; opens: number; done: number }[];
    topLessons: { key: string; label: string; opens: number }[];
  };
  outcomes: {
    followups: { better: number; same: number; worse: number; done: number; students: number } | null;
    firstVsLatest: { students: number; first: number; latest: number; improved: number; same: number; worse: number } | null;
    tests: { students: number; before: number; after: number } | null;
    testsReady: boolean;
  };
  engagement: {
    features: { key: Feature; label: string; students: number | null; uses: number; returnRate: number | null }[];
    /** [thứ 0–6][giờ 0–23]: số lượt */
    heatmap: number[][];
    heatmapMax: number;
  };
  retention: { d7: { cohort: number; retained: number } | null; d14: { cohort: number; retained: number } | null };
};

const COMPLETE = new Set(["completed", "complete", "done", "hoan_thanh", "hoan-thanh", "finished"]);

/** Mức tâm trạng của một lần ghi: tích cực 1, trung tính / chưa rõ 0, nặng lòng −1. */
function moodScore(emotions: string[]): number {
  if (isUnsure(emotions)) return 0;
  const g = dominantGroup(emotions);
  return g === "positive" ? 1 : g === "negative" ? -1 : 0;
}

function moodKind(emotions: string[]): keyof Omit<MoodCounts, "total"> {
  return isUnsure(emotions) ? "unsure" : dominantGroup(emotions);
}

function tallyMood(rows: { emotions: string[] }[]): MoodCounts {
  const c: MoodCounts = { positive: 0, neutral: 0, negative: 0, unsure: 0, total: 0 };
  for (const r of rows) {
    c[moodKind(r.emotions)]++;
    c.total++;
  }
  return c;
}

export function normalizeSkill(s: string | null | undefined): string | null {
  const m = /K[1-4]/.exec(String(s ?? "").toUpperCase());
  return m ? m[0] : null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Tính cả 7 khu. `today` là ngày hôm nay (giờ VN), dùng cho "hôm nay", "7 ngày" và giữ chân. */
export function computeDashboard(input: DashRows, range: { from: string; to: string }, today: string, labels: Labels): Dashboard {
  const counted = new Set(input.students.map((s) => s.id));
  const ok = <T extends { userId: string }>(rows: T[]) => rows.filter((r) => counted.has(r.userId));
  const inRange = (iso: string) => {
    const d = dayKey(iso);
    return d >= range.from && d <= range.to;
  };

  const checkins = ok(input.checkins);
  const conversations = ok(input.conversations);
  const messages = ok(input.messages);
  const activity = ok(input.activity);
  const opens = ok(input.opens);
  const help = [...ok(input.helpRequests), ...ok(input.helpButtons)];
  const practice = input.practice ? ok(input.practice) : null;
  const habitLogs = input.habitLogs.filter((h) => counted.has(h.userId));
  const harvests = ok(input.gardenHarvests);

  // mọi lượt dùng, theo tính năng (dùng cho học sinh hoạt động, mức tương tác, bản đồ nhiệt, giữ chân)
  type Ev = { userId: string; day: string; at: string | null; feature: Feature };
  const events: Ev[] = [
    ...messages.map((m) => ({ userId: m.userId, day: dayKey(m.at), at: m.at, feature: "chat" as const })),
    ...checkins.map((c) => ({ userId: c.userId, day: dayKey(c.at), at: c.at, feature: "checkin" as const })),
    ...(practice ?? []).map((p) => ({ userId: p.userId, day: dayKey(p.at), at: p.at, feature: "practice" as const })),
    ...activity.filter((a) => a.kind === "tiny_action_done").map((a) => ({ userId: a.userId, day: dayKey(a.at), at: a.at, feature: "tiny_action" as const })),
    ...opens.filter((o) => o.kind === "tiny_action").map((o) => ({ userId: o.userId, day: dayKey(o.at), at: o.at, feature: "tiny_action" as const })),
    ...opens.filter((o) => o.kind === "lesson").map((o) => ({ userId: o.userId, day: dayKey(o.at), at: o.at, feature: "library" as const })),
    // đánh dấu thói quen chỉ có ngày, không có giờ: không vào bản đồ nhiệt
    ...habitLogs.map((h) => ({ userId: h.userId, day: h.day, at: null, feature: "habits" as const })),
    ...harvests.map((h) => ({ userId: h.userId, day: dayKey(h.at), at: h.at, feature: "garden" as const })),
    ...help.map((h) => ({ userId: h.userId, day: dayKey(h.at), at: h.at, feature: "help" as const })),
  ];
  const rangeEvents = events.filter((e) => e.day >= range.from && e.day <= range.to);
  const activeBetween = (from: string, to: string) => new Set(events.filter((e) => e.day >= from && e.day <= to).map((e) => e.userId)).size;

  // ── 1. Sử dụng ──
  const days = daysOf(range);
  const practiceDoneRows = (practice ?? []).filter((p) => COMPLETE.has(String(p.status ?? "").toLowerCase()));
  const byDay = <T,>(rows: T[], dayOf: (r: T) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(dayOf(r), (m.get(dayOf(r)) ?? 0) + 1);
    return m;
  };
  const ciDay = byDay(checkins, (c) => dayKey(c.at));
  const prDay = byDay(practiceDoneRows, (p) => dayKey(p.completedAt ?? p.at));
  const acDay = byDay(activity.filter((a) => a.kind === "tiny_action_done"), (a) => dayKey(a.at));
  const hpDay = byDay(help, (h) => dayKey(h.at));
  const alDay = byDay(input.alerts, (a) => dayKey(a.at));
  const sumIn = (m: Map<string, number>) => days.reduce((s, d) => s + (m.get(d) ?? 0), 0);

  const usage: Dashboard["usage"] = {
    activeToday: small(activeBetween(today, today)),
    active7: small(activeBetween(addDays(today, -6), today)),
    activeRange: small(activeBetween(range.from, range.to)),
    totals: { checkins: sumIn(ciDay), practiceDone: sumIn(prDay), actionsDone: sumIn(acDay), help: sumIn(hpDay), alerts: sumIn(alDay) },
    daily: days.map((d) => ({
      day: d,
      active: small(activeBetween(d, d)),
      checkins: ciDay.get(d) ?? 0,
      practice: prDay.get(d) ?? 0,
      actions: acDay.get(d) ?? 0,
      help: hpDay.get(d) ?? 0,
      alerts: alDay.get(d) ?? 0,
    })),
  };

  // ── 2. Tâm trạng ──
  const ciRange = checkins.filter((c) => inRange(c.at));
  const usersOf = (rows: { userId: string }[]) => new Set(rows.map((r) => r.userId)).size;
  const mood: Dashboard["mood"] = {
    total: usersOf(ciRange) >= MIN_GROUP ? tallyMood(ciRange) : null,
    daily: days.map((d) => {
      const rows = ciRange.filter((c) => dayKey(c.at) === d);
      const n = usersOf(rows);
      return { day: d, counts: n === 0 ? tallyMood([]) : n >= MIN_GROUP ? tallyMood(rows) : null };
    }),
  };

  // ── 3. Trò chuyện ──
  const convRange = conversations.filter((c) => inRange(c.at));
  const convIds = new Set(convRange.map((c) => c.id));
  const msgRange = messages.filter((m) => inRange(m.at));
  const sourceTally = new Map<string, number>();
  for (const c of convRange) {
    const key = isConversationSource(c.source) ? c.source : "unknown";
    sourceTally.set(key, (sourceTally.get(key) ?? 0) + 1);
  }
  const topicUsers = new Map<string, Set<string>>();
  const topicCount = new Map<string, number>();
  const addTopic = (topic: string | null, userId: string) => {
    if (!topic) return;
    topicCount.set(topic, (topicCount.get(topic) ?? 0) + 1);
    topicUsers.set(topic, (topicUsers.get(topic) ?? new Set()).add(userId));
  };
  // chủ đề học sinh xác nhận khi trợ lý đoán, và chủ đề của chuyện bận lòng đã lưu (không đọc tin nhắn)
  for (const a of activity) if (a.kind === "topic_guess_yes" && inRange(a.at)) addTopic(a.ref, a.userId);
  for (const w of ok(input.worries)) if (inRange(w.at)) addTopic(w.topic, w.userId);
  const allTopics = [...topicCount].map(([key, count]) => ({ key, label: labels.topics[key] ?? key, count, students: topicUsers.get(key)?.size ?? 0 }));
  const fbRange = ok(input.feedback).filter((f) => inRange(f.at));

  const chat: Dashboard["chat"] = {
    conversations: convRange.length,
    messages: msgRange.length,
    avgPerConversation: convRange.length ? round1(messages.filter((m) => convIds.has(m.conversationId)).length / convRange.length) : null,
    sources: [...sourceTally]
      .map(([key, count]) => ({ key, label: isConversationSource(key) ? SOURCE_LABEL[key] : "Chưa ghi nguồn (trước 0019)", count }))
      .sort((a, b) => b.count - a.count),
    selSteps: selStepCounts(input.selMoves, inRange),
    selCasel: selCaselCounts(input.selMoves, inRange),
    topics: allTopics.filter((t) => t.students >= MIN_GROUP).sort((a, b) => b.count - a.count),
    hiddenTopics: allTopics.filter((t) => t.students < MIN_GROUP).reduce((s, t) => s + t.count, 0),
    feedback: { ups: fbRange.filter((f) => f.rating > 0).length, downs: fbRange.filter((f) => f.rating < 0).length },
    styles: styleCounts(input, counted, activity.filter((a) => a.kind === "style_changed" && inRange(a.at)).length),
    cards: cardCounts(activity.filter((a) => inRange(a.at))),
  };

  // ── 4. Bài tập và luyện kỹ năng ──
  const prRange = (practice ?? []).filter((p) => inRange(p.at));
  const actRange = activity.filter((a) => inRange(a.at));
  const countKind = (k: string) => actRange.filter((a) => a.kind === k).length;
  const actionStats = new Map<string, { opens: number; done: number }>();
  const lessonOpens = new Map<string, number>();
  for (const o of opens) {
    if (!inRange(o.at)) continue;
    if (o.kind === "tiny_action") {
      const s = actionStats.get(o.ref) ?? { opens: 0, done: 0 };
      s.opens++;
      actionStats.set(o.ref, s);
    } else if (o.kind === "lesson") lessonOpens.set(o.ref, (lessonOpens.get(o.ref) ?? 0) + 1);
  }
  for (const a of actRange) {
    if (a.kind !== "tiny_action_done" || !a.ref) continue;
    const s = actionStats.get(a.ref) ?? { opens: 0, done: 0 };
    s.done++;
    actionStats.set(a.ref, s);
  }
  const practiceOut: Dashboard["practice"] = {
    ready: practice !== null,
    bySkill: SKILLS.map((k) => {
      const rows = prRange.filter((p) => normalizeSkill(p.skill) === k);
      return {
        skill: k,
        label: SKILL_LABEL[k],
        sessions: rows.length,
        students: small(usersOf(rows)),
        completed: rows.filter((p) => COMPLETE.has(String(p.status ?? "").toLowerCase())).length,
      };
    }),
    rates: {
      feedback: practice ? ratio(countKind("practice_feedback"), prRange.length) : null,
      revised: practice ? ratio(countKind("practice_revised"), prRange.length) : null,
      completed: practice ? ratio(prRange.filter((p) => COMPLETE.has(String(p.status ?? "").toLowerCase())).length, prRange.length) : null,
    },
    topActions: [...actionStats]
      .map(([key, s]) => ({ key, label: labels.actions[key] ?? key, ...s }))
      .sort((a, b) => b.opens + b.done - (a.opens + a.done) || b.done - a.done)
      .slice(0, 10),
    topLessons: [...lessonOpens]
      .map(([key, n]) => ({ key, label: labels.lessons[key] ?? key, opens: n }))
      .sort((a, b) => b.opens - a.opens)
      .slice(0, 10),
  };

  // ── 5. Kết quả sau thời gian đồng hành ──
  const checksRange = ok(input.worryChecks).filter((c) => inRange(c.at));
  const followups =
    usersOf(checksRange) >= MIN_GROUP
      ? {
          better: checksRange.filter((c) => c.feeling === "better").length,
          same: checksRange.filter((c) => c.feeling === "same").length,
          worse: checksRange.filter((c) => c.feeling === "worse").length,
          done: checksRange.filter((c) => c.feeling === "done").length,
          students: usersOf(checksRange),
        }
      : null;

  // tuần đầu so với tuần gần nhất: học sinh có lần ghi tâm trạng đầu và cuối cách nhau ít nhất 14 ngày (tính tới hết khoảng chọn)
  const byUser = new Map<string, { day: string; score: number }[]>();
  for (const c of checkins) {
    const d = dayKey(c.at);
    if (d > range.to) continue;
    const list = byUser.get(c.userId) ?? [];
    list.push({ day: d, score: moodScore(c.emotions) });
    byUser.set(c.userId, list);
  }
  const pairs: { first: number; latest: number }[] = [];
  for (const list of byUser.values()) {
    list.sort((a, b) => a.day.localeCompare(b.day));
    const firstDay = list[0].day;
    const lastDay = list[list.length - 1].day;
    if (daysBetween(firstDay, lastDay) < 14) continue;
    const mean = (xs: { score: number }[]) => xs.reduce((s, x) => s + x.score, 0) / xs.length;
    pairs.push({
      first: mean(list.filter((x) => x.day <= addDays(firstDay, 6))),
      latest: mean(list.filter((x) => x.day >= addDays(lastDay, -6))),
    });
  }
  const firstVsLatest =
    pairs.length >= MIN_GROUP
      ? {
          students: pairs.length,
          first: round2(pairs.reduce((s, p) => s + p.first, 0) / pairs.length),
          latest: round2(pairs.reduce((s, p) => s + p.latest, 0) / pairs.length),
          improved: pairs.filter((p) => p.latest - p.first > 0.001).length,
          same: pairs.filter((p) => Math.abs(p.latest - p.first) <= 0.001).length,
          worse: pairs.filter((p) => p.first - p.latest > 0.001).length,
        }
      : null;

  // bài đo: điểm lần 1 và lần 2 của cùng một học sinh (chỉ điểm đã khóa, bên đọc dữ liệu đã lọc)
  let tests: Dashboard["outcomes"]["tests"] = null;
  if (input.testScores) {
    const r1 = new Map<string, number>();
    const r2 = new Map<string, number>();
    for (const t of input.testScores) {
      if (!counted.has(t.userId)) continue;
      if (t.round === 1) r1.set(t.userId, t.total);
      if (t.round === 2) r2.set(t.userId, t.total);
    }
    const both = [...r1.keys()].filter((u) => r2.has(u));
    if (both.length >= MIN_GROUP)
      tests = {
        students: both.length,
        before: round2(both.reduce((s, u) => s + (r1.get(u) as number), 0) / both.length),
        after: round2(both.reduce((s, u) => s + (r2.get(u) as number), 0) / both.length),
      };
  }

  // ── 6. Mức độ tương tác ──
  const features = (Object.keys(FEATURE_LABEL) as Feature[]).map((f) => {
    const rows = rangeEvents.filter((e) => e.feature === f);
    const daysByUser = new Map<string, Set<string>>();
    for (const e of rows) daysByUser.set(e.userId, (daysByUser.get(e.userId) ?? new Set()).add(e.day));
    const users = daysByUser.size;
    const returned = [...daysByUser.values()].filter((s) => s.size >= 2).length;
    return {
      key: f,
      label: FEATURE_LABEL[f],
      students: small(users),
      uses: rows.length,
      returnRate: users >= MIN_GROUP ? returned / users : null,
    };
  });
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const e of rangeEvents) if (e.at) heatmap[vnWeekday(e.at)][vnHour(e.at)]++;

  // ── 7. Giữ chân ──
  const firstDayOf = new Map<string, string>();
  const userDays = new Map<string, Set<string>>();
  for (const e of events) {
    if (!firstDayOf.has(e.userId) || e.day < (firstDayOf.get(e.userId) as string)) firstDayOf.set(e.userId, e.day);
    userDays.set(e.userId, (userDays.get(e.userId) ?? new Set()).add(e.day));
  }
  const retention = (after: number) => {
    // nhóm: học sinh dùng lần đầu trong khoảng chọn, và đã đủ `after` ngày tính tới hôm nay
    const cohort = [...firstDayOf].filter(([, f]) => f >= range.from && f <= range.to && addDays(f, after) <= today);
    if (cohort.length < MIN_GROUP) return null;
    const retained = cohort.filter(([u, f]) => [...(userDays.get(u) ?? [])].some((d) => d >= addDays(f, after))).length;
    return { cohort: cohort.length, retained };
  };

  return {
    range: { from: range.from, to: range.to },
    students: counted.size,
    tooSmall: counted.size < MIN_GROUP,
    usage,
    mood,
    chat,
    practice: practiceOut,
    outcomes: { followups, firstVsLatest, tests, testsReady: input.testScores !== null },
    engagement: { features, heatmap, heatmapMax: Math.max(0, ...heatmap.flat()) },
    retention: { d7: retention(7), d14: retention(14) },
  };
}

// ───────────────────────── Khu 3: nhân vật, tùy chọn, thẻ gợi ý (Bước 9.7, 10.4) ─────────────────────────

const GROUP_KEYS: Record<StyleGroup, readonly string[]> = { character: CHARACTER_KEYS, length: LENGTH_KEYS, guidance: GUIDANCE_KEYS, motivation: MOTIVATION_KEYS };

/** Số bạn đang dùng từng lựa chọn (chưa tự chọn thì tính theo mặc định admin đặt); 1–4 bạn bị ẩn. */
function styleCounts(input: DashRows, counted: Set<string>, changes: number): Dashboard["chat"]["styles"] {
  if (!input.chatStyles) return null;
  const saved = new Map(input.chatStyles.filter((r) => counted.has(r.userId)).map((r) => [r.userId, r.style]));
  const fallback = input.styleDefault ?? normalizeStyle(null);
  const settings = normalizeStyleSettings({
    characters: { default: fallback.character },
    lengths: { default: fallback.length },
    guidance: { default: fallback.guidance },
    motivation: { default: fallback.motivation },
  });
  const styles = [...counted].map((id) => normalizeStyle(saved.get(id) ?? null, settings));
  const chosen = [...counted].filter((id) => saved.get(id) && typeof saved.get(id) === "object").length;
  return {
    chosen: small(chosen),
    changes,
    groups: STYLE_GROUPS.map((g) => ({
      group: g,
      label: GROUP_LABEL[g],
      items: GROUP_KEYS[g].map((k) => ({ key: k, label: optionLabel(g, k), students: small(styles.filter((s) => s[g] === k).length), isDefault: fallback[g] === k })),
    })),
  };
}

/** Thẻ đã hiện (card_shown: goal / skill:K3 / end) và đã bấm (card_clicked: goal:add, goal:later, skill:K3, end:stop, end:continue). */
function cardCounts(rows: { kind: string; ref: string | null }[]): Dashboard["chat"]["cards"] {
  const shown = rows.filter((a) => a.kind === "card_shown").map((a) => a.ref ?? "");
  const clicked = rows.filter((a) => a.kind === "card_clicked").map((a) => a.ref ?? "");
  const n = (list: string[], ref: string) => list.filter((r) => r === ref).length;
  const skillOf = (r: string) => (r.startsWith("skill:") ? r.slice(6) : null);
  const skills = [...new Set([...shown, ...clicked].map(skillOf).filter((s): s is string => Boolean(s)))].sort();
  return {
    goal: { shown: n(shown, "goal"), add: n(clicked, "goal:add"), later: n(clicked, "goal:later") },
    skill: {
      shown: shown.filter((r) => skillOf(r)).length,
      opened: clicked.filter((r) => skillOf(r)).length,
      bySkill: skills.map((s) => ({ skill: s, shown: n(shown, `skill:${s}`), opened: n(clicked, `skill:${s}`) })),
    },
    end: { shown: n(shown, "end"), stop: n(clicked, "end:stop"), cont: n(clicked, "end:continue") },
  };
}

// ───────────────────────── Xuất CSV ─────────────────────────

const pctText = (x: number | null) => (x == null ? "ẩn / chưa có" : `${Math.round(x * 100)}%`);
const numText = (x: number | null) => (x == null ? "ẩn (dưới 5 bạn)" : x);

/** Bảng số liệu của trang (chỉ số gộp) để tải CSV. */
export function dashboardCsv(d: Dashboard, classLabel: string): (string | number)[][] {
  const rows: (string | number)[][] = [
    ["Khu", "Chỉ số", "Giá trị"],
    ["", "Khoảng thời gian", `${d.range.from} → ${d.range.to}`],
    ["", "Lớp", classLabel],
    ["", "Số học sinh được tính", d.students],
    ["1. Sử dụng", "Hoạt động hôm nay", numText(d.usage.activeToday)],
    ["1. Sử dụng", "Hoạt động 7 ngày", numText(d.usage.active7)],
    ["1. Sử dụng", "Hoạt động trong khoảng", numText(d.usage.activeRange)],
    ["1. Sử dụng", "Lượt ghi tâm trạng", d.usage.totals.checkins],
    ["1. Sử dụng", "Bài luyện hoàn thành", d.usage.totals.practiceDone],
    ["1. Sử dụng", "Việc nhỏ hoàn thành", d.usage.totals.actionsDone],
    ["1. Sử dụng", "Cần giúp, lời nhờ", d.usage.totals.help],
    ["1. Sử dụng", "Cảnh báo", d.usage.totals.alerts],
  ];
  for (const x of d.usage.daily)
    rows.push(["1. Theo ngày", x.day, `hoạt động ${x.active ?? "ẩn"} · tâm trạng ${x.checkins} · luyện ${x.practice} · việc nhỏ ${x.actions} · cần giúp ${x.help} · cảnh báo ${x.alerts}`]);
  if (d.mood.total) {
    const t = d.mood.total;
    rows.push(["2. Tâm trạng", "Tích cực / Trung tính / Nặng lòng / Chưa rõ", `${t.positive} / ${t.neutral} / ${t.negative} / ${t.unsure}`]);
  } else rows.push(["2. Tâm trạng", "Tổng", "ẩn (dưới 5 bạn)"]);
  for (const x of d.mood.daily)
    rows.push(["2. Theo ngày", x.day, x.counts ? `${x.counts.positive} / ${x.counts.neutral} / ${x.counts.negative} / ${x.counts.unsure}` : "ẩn"]);
  rows.push(
    ["3. Trò chuyện", "Cuộc trò chuyện", d.chat.conversations],
    ["3. Trò chuyện", "Tin nhắn của học sinh", d.chat.messages],
    ["3. Trò chuyện", "Trung bình tin mỗi cuộc", d.chat.avgPerConversation ?? "–"],
    ["3. Trò chuyện", "👍 / 👎", `${d.chat.feedback.ups} / ${d.chat.feedback.downs}`],
    ...d.chat.sources.map((s) => ["3. Bắt đầu từ", s.label, s.count]),
    ...d.chat.topics.map((t) => ["3. Chủ đề", t.label, `${t.count} lượt · ${t.students} bạn`]),
    ["3. Chủ đề", "Chủ đề khác (dưới 5 bạn mỗi chủ đề)", d.chat.hiddenTopics],
  );
  if (d.chat.styles) {
    rows.push(["3. Nhân vật và tùy chọn", "Đã tự chọn", numText(d.chat.styles.chosen)], ["3. Nhân vật và tùy chọn", "Lượt đổi lựa chọn", d.chat.styles.changes]);
    for (const g of d.chat.styles.groups)
      for (const it of g.items) rows.push([`3. ${g.label}`, `${it.label}${it.isDefault ? " (mặc định)" : ""}`, numText(it.students)]);
  } else rows.push(["3. Nhân vật và tùy chọn", "Lựa chọn", "chưa có dữ liệu (chưa chạy migration 0020)"]);
  const c = d.chat.cards;
  rows.push(
    ["3. Thẻ gợi ý", "Mục tiêu: hiện / thêm vào thói quen / để sau", `${c.goal.shown} / ${c.goal.add} / ${c.goal.later}`],
    ["3. Thẻ gợi ý", "Kỹ năng: hiện / mở bài luyện", `${c.skill.shown} / ${c.skill.opened}`],
    ["3. Thẻ gợi ý", "Dừng: hiện / dừng ở đây / nói tiếp", `${c.end.shown} / ${c.end.stop} / ${c.end.cont}`],
  );
  for (const s of d.chat.selSteps ?? []) rows.push(["3. Bước SEL", `${s.label} ${s.note}`.trim(), s.count]);
  for (const s of d.chat.selCasel ?? []) rows.push(["3. Năng lực CASEL", s.label, s.count]);
  if (d.practice.ready) {
    for (const s of d.practice.bySkill) rows.push(["4. Luyện kỹ năng", `${s.skill} ${s.label}`, `${s.sessions} lượt · ${s.students ?? "ẩn"} bạn · ${s.completed} hoàn thành`]);
    rows.push(
      ["4. Luyện kỹ năng", "Tỉ lệ nhờ góp ý", pctText(d.practice.rates.feedback)],
      ["4. Luyện kỹ năng", "Tỉ lệ sửa lần 2", pctText(d.practice.rates.revised)],
      ["4. Luyện kỹ năng", "Tỉ lệ hoàn thành", pctText(d.practice.rates.completed)],
    );
  } else rows.push(["4. Luyện kỹ năng", "Bài luyện", "chưa có dữ liệu"]);
  for (const a of d.practice.topActions) rows.push(["4. Việc nhỏ", a.label, `mở ${a.opens} · làm xong ${a.done}`]);
  for (const l of d.practice.topLessons) rows.push(["4. Bài thư viện", l.label, `mở ${l.opens}`]);
  const f = d.outcomes.followups;
  rows.push(["5. Hỏi thăm lại", "Đỡ hơn / Vẫn vậy / Nặng hơn / Đã ổn", f ? `${f.better} / ${f.same} / ${f.worse} / ${f.done}` : "ẩn / chưa có"]);
  const fl = d.outcomes.firstVsLatest;
  rows.push(["5. Tuần đầu và tuần gần nhất", "Mức tâm trạng (−1 đến 1)", fl ? `${fl.first} → ${fl.latest} (${fl.students} bạn)` : "ẩn / chưa có"]);
  const t = d.outcomes.tests;
  rows.push(["5. Bài đo", "Điểm lần 1 → lần 2", t ? `${t.before} → ${t.after} (${t.students} bạn)` : "chưa có dữ liệu"]);
  for (const x of d.engagement.features) rows.push(["6. Tương tác", x.label, `${x.students ?? "ẩn"} bạn · ${x.uses} lượt · quay lại ${pctText(x.returnRate)}`]);
  rows.push(
    ["7. Giữ chân", "Còn dùng sau 7 ngày", d.retention.d7 ? `${d.retention.d7.retained}/${d.retention.d7.cohort}` : "ẩn / chưa đủ"],
    ["7. Giữ chân", "Còn dùng sau 14 ngày", d.retention.d14 ? `${d.retention.d14.retained}/${d.retention.d14.cohort}` : "ẩn / chưa đủ"],
  );
  return rows;
}

/** Số cuộc trò chuyện (trong khoảng chọn) đã đi qua mỗi bước SEL, theo thứ tự bước; không có dữ liệu thì null. */
export function selStepCounts(rows: DashRows["selMoves"], inRange: (at: string) => boolean): Dashboard["chat"]["selSteps"] {
  if (!rows) return null;
  const tally = new Map<string, number>();
  for (const r of rows) if (inRange(r.at)) for (const m of new Set(r.moves)) tally.set(m, (tally.get(m) ?? 0) + 1);
  if (!tally.size) return null;
  return SEL_MOVES.filter((m) => m !== "mo" && tally.has(m)).map((m: SelMove) => {
    const tag = MOVE_SKILL[m];
    const note = tag.skill ? `· ${tag.skill} · ${tag.casel.map((c) => CASEL_LABEL[c]).join(", ")}` : "";
    return { key: m, label: MOVE_LABEL[m], count: tally.get(m) ?? 0, note };
  });
}

/** Số cuộc trò chuyện (trong khoảng chọn) đã chạm tới mỗi năng lực CASEL, theo nhãn của các bước đã đi; không có thì null. */
export function selCaselCounts(rows: DashRows["selMoves"], inRange: (at: string) => boolean): Dashboard["chat"]["selCasel"] {
  if (!rows) return null;
  const tally = new Map<string, number>();
  for (const r of rows) {
    if (!inRange(r.at)) continue;
    const touched = new Set(r.moves.flatMap((m) => (m in MOVE_SKILL ? MOVE_SKILL[m as SelMove].casel : [])));
    for (const c of touched) tally.set(c, (tally.get(c) ?? 0) + 1);
  }
  if (!tally.size) return null;
  // giữ đủ năm năng lực (kể cả 0) để thấy năng lực nào chưa được luyện
  return CASEL.map((c) => ({ key: c, label: CASEL_LABEL[c], count: tally.get(c) ?? 0 }));
}
