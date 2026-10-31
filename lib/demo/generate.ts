// TẠO DỮ LIỆU MẪU cho chế độ trình diễn (hàm thuần: cùng hạt giống + cùng "bây giờ" → cùng dữ liệu).
// Giống như 3 lớp đã dùng F-Mood khoảng 1 tháng. Mỗi bạn có một "kiểu" để số liệu trông thật:
// có bạn bỏ dở sau tuần đầu, có ngày ít hơn 5 bạn check-in (trang thầy cô phải ẩn), có chỉ số Đạt / Chưa đạt / Chưa đủ.
//
// KHÔNG có câu nguy hiểm thật nào: tin nhắn và ghi chú là chuyện thường ngày; cảnh báo nguy hiểm chỉ ghi
// "[Giả lập trình diễn …]". Test generate.test.ts kiểm tra mọi dòng chữ qua bộ lọc từ khóa an toàn.
import { addDays, dayKey } from "@/lib/dates";
import { getEmotion, type EmotionGroup } from "@/lib/emotions";
import { isStale, nextCheckAt, nextWorryState, type Feeling, type WorryStatus } from "@/lib/worries-shared";
import { DEMO_CODE_PREFIX, SIMULATED } from "./shared";

export const DEMO_DAYS = 30;

export type DemoInput = {
  now: Date;
  seed?: number;
  newId: () => string;
  /** cây trong khu vườn đang bật (id thật trong bảng garden_plants) */
  plantIds: string[];
  /** mã việc nhỏ theo chủ đề (nội dung vòng hỗ trợ lớp thử thấy được) */
  actions: Record<string, string[]>;
};

export type Story =
  | "showcase"
  | "steady"
  | "exam"
  | "friends"
  | "family"
  | "lowkey"
  | "dropoff"
  | "fade"
  | "sporadic"
  | "late";

export type DemoClass = { id: string; key: string; code: string; name: string; grade: number; homeroom_teacher_id: string };
export type DemoStaff = { id: string; key: string; nickname: string; role: "teacher" | "counselor" };
export type DemoStudent = {
  id: string;
  key: string;
  class_id: string;
  classKey: string;
  nickname: string;
  full_name: string;
  story: Story;
  created_at: string;
  garden_plant_id: string | null;
};

type Row = Record<string, unknown>;

export type DemoData = {
  classes: DemoClass[];
  staff: DemoStaff[];
  students: DemoStudent[];
  showcase: { journey: string; a: string; b: string; teacher: string; counselor: string };
  checkins: Row[];
  conversations: Row[];
  messages: Row[];
  message_feedback: Row[];
  worries: Row[];
  worry_checks: Row[];
  support_activity: Row[];
  badges_earned: Row[];
  habits: Row[];
  habit_logs: Row[];
  reflection_answers: Row[];
  garden_harvests: Row[];
  alerts: Row[];
  help_requests: Row[];
  challenges: Row[];
  surveys: Row[];
  survey_responses: Row[];
  lessons: Row[];
  admin_audit: Row[];
};

// ───────── Số ngẫu nhiên có hạt giống ─────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];
const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

// ───────── Lớp, thầy cô, học sinh ─────────

export const DEMO_CLASSES = [
  { key: "7A", name: "7A (mẫu)", grade: 7, size: 22, teacher: "Cô Lan (mẫu)" },
  { key: "7B", name: "7B (mẫu)", grade: 7, size: 20, teacher: "Thầy Minh (mẫu)" },
  { key: "8C", name: "8C (mẫu)", grade: 8, size: 16, teacher: "Cô Hoa (mẫu)" },
] as const;
/** Lớp không dùng app: chỉ có trong phiếu khảo sát trước / sau. */
export const DEMO_CONTROL_CLASS = { key: "8D", name: "8D (mẫu)", size: 20 };
export const DEMO_COUNSELOR = "Cô Thảo · tư vấn (mẫu)";

const NICKNAMES = [
  "Bánh Bao", "Cá Heo", "Mèo Mướp", "Gấu Trúc", "Sóc Nâu", "Thỏ Bông", "Cú Mèo", "Chim Sẻ", "Hạt Dẻ", "Bắp Rang",
  "Kẹo Dừa", "Mai Hồng", "Sao Biển", "Rùa Con", "Cáo Nhỏ", "Nai Vàng", "Ốc Sên", "Ong Vàng", "Dâu Tây", "Bưởi Hồng",
  "Xoài Chín", "Táo Đỏ", "Na Ngọt", "Trà Sữa", "Bánh Flan", "Khoai Lang", "Đậu Phộng", "Hải Âu", "Cánh Cụt", "Gà Con",
  "Vịt Bầu", "Sư Tử Nhỏ", "Hổ Con", "Voi Xám", "Hươu Sao", "Chuồn Chuồn", "Bướm Xanh", "Lá Me", "Hoa Sữa", "Nắng Mai",
  "Gió Nhẹ", "Mưa Bay", "Cầu Vồng", "Trăng Non", "Sao Mai", "Lá Phong", "Cỏ May", "Bồ Công Anh", "Hạt Mưa", "Cà Rốt",
  "Bí Đỏ", "Dưa Hấu", "Măng Cụt", "Chôm Chôm", "Kem Dâu", "Su Kem", "Bánh Quy", "Mochi", "Kiwi", "Ổi Xanh",
] as const;

/** Kiểu của các bạn còn lại trong lớp (lặp vòng, mỗi lớp lệch một chút). */
const STORY_CYCLE: Story[] = [
  "steady", "exam", "friends", "steady", "lowkey", "dropoff", "family", "fade", "sporadic", "exam", "late",
  "steady", "friends", "fade", "steady", "lowkey", "exam", "dropoff", "steady", "late", "dropoff", "steady",
];

// ───────── Nội dung chữ (chuyện thường ngày, không có câu nguy hiểm) ─────────

const POSITIVE = ["vui", "hao-hung", "binh-yen", "biet-on"];
const NEUTRAL = ["binh-thuong", "met"];
const NEGATIVE_BY_TOPIC: Record<string, string[]> = {
  "hoc-tap": ["lo-lang", "cang-thang", "met"],
  "ban-be": ["buon", "co-don", "tuc-gian"],
  "gia-dinh": ["buon", "tuc-gian", "lo-lang"],
  "ban-than": ["met", "lo-lang", "buon"],
  "mang-xa-hoi": ["buon", "tuc-gian", "lo-lang"],
};

const USER_LINES: Record<string, string[]> = {
  "hoc-tap": [
    "Mai kiểm tra Toán mà mình chưa ôn kịp",
    "Bài tập Văn nhiều quá, làm mãi chưa xong",
    "Mình sợ bị điểm kém môn Anh",
    "Học thêm cả tối nên mình hơi đuối",
  ],
  "ban-be": ["Hôm nay mình với bạn thân giận nhau", "Giờ ra chơi không ai rủ mình chơi cả", "Bạn cùng bàn nói xấu mình với cả nhóm"],
  "gia-dinh": ["Mẹ mắng mình vì về muộn", "Bố mẹ so sánh mình với anh họ", "Ở nhà ai cũng bận, chẳng ai hỏi chuyện mình"],
  "ban-than": ["Dạo này mình khó ngủ", "Mình thấy tự ti về ngoại hình", "Mình hay thức khuya xem điện thoại"],
  "mang-xa-hoi": ["Có người bình luận chê ảnh của mình", "Nhóm chat lớp cứ nhắc chuyện cũ của mình"],
  vui: ["Hôm nay mình được điểm 9 môn Sử!", "Cuối tuần mình được đi chơi công viên", "Mình vừa học được cách gấp hạc giấy"],
};
const MAY_LINES = [
  "Nghe có vẻ bạn đang lo lắm. Phần nào làm bạn thấy khó nhất?",
  "Cảm ơn bạn đã kể cho mình nghe. Lúc đó bạn thấy thế nào?",
  "Chuyện này đúng là dễ làm mình buồn. Bạn muốn thử một việc nhỏ cho nhẹ lòng không?",
  "Mình vui cùng bạn nè! Điều gì làm bạn thấy vui nhất hôm nay?",
  "Mình hiểu mà. Nếu muốn, bạn có thể kể với thầy cô chủ nhiệm hoặc bố mẹ nữa nhé.",
];
const WORRY_NOTES: Record<string, string[]> = {
  "hoc-tap": ["Kiểm tra 15 phút môn Toán, mình sợ bị điểm kém", "Sắp thi giữa kỳ mà nhiều bài chưa hiểu"],
  "ban-be": ["Mình với bạn thân giận nhau từ hôm thứ Hai", "Nhóm bạn đi chơi mà không rủ mình"],
  "gia-dinh": ["Bố mẹ hay cãi nhau buổi tối", "Mẹ muốn mình học thêm nhiều hơn"],
  "ban-than": ["Dạo này mình hay thức khuya xem điện thoại", "Mình thấy mình không có gì nổi bật"],
  "mang-xa-hoi": ["Có bạn đăng ảnh chế về mình"],
};
const REFLECTION_QUESTIONS = [
  "Hôm nay điều gì làm bạn mỉm cười?",
  "Một việc nhỏ bạn làm tốt hôm nay là gì?",
  "Hôm nay bạn đã chăm sóc bản thân bằng cách nào?",
  "Có ai đã giúp bạn hôm nay không? Bạn muốn cảm ơn họ điều gì?",
];
const REFLECTION_ANSWERS = [
  "Được bạn cho mượn vở chép bài",
  "Mình làm xong bài tập trước 9 giờ tối",
  "Đi bộ với mẹ sau bữa tối",
  "Con mèo nhà mình nằm ngủ trên vở của mình",
  "Mình đã giơ tay phát biểu môn Sinh",
  "Ngủ sớm hơn hôm qua 30 phút",
];
const HABIT_CHOICES = [
  { title: "Đọc sách 10 phút", icon: "📖" },
  { title: "Đi ngủ trước 22h30", icon: "🌙" },
  { title: "Tập thể dục 15 phút", icon: "🏃" },
  { title: "Dọn góc học tập", icon: "🧹" },
];
const FEEDBACK_REASONS = ["too_long", "too_many_questions", "not_helpful"];

// ───────── Bộ tạo ─────────

export function buildDemo(input: DemoInput): DemoData {
  const { now, newId } = input;
  const seed = input.seed ?? 20261026;
  const today = dayKey(now);
  const nowMs = now.getTime();
  const data: DemoData = {
    classes: [],
    staff: [],
    students: [],
    showcase: { journey: "", a: "", b: "", teacher: "", counselor: "" },
    checkins: [],
    conversations: [],
    messages: [],
    message_feedback: [],
    worries: [],
    worry_checks: [],
    support_activity: [],
    badges_earned: [],
    habits: [],
    habit_logs: [],
    reflection_answers: [],
    garden_harvests: [],
    alerts: [],
    help_requests: [],
    challenges: [],
    surveys: [],
    survey_responses: [],
    lessons: [],
    admin_audit: [],
  };

  /** Ngày thứ t (0 = 30 ngày trước, 30 = hôm nay). */
  const dayOf = (t: number) => addDays(today, t - DEMO_DAYS);
  /** Một lúc trong ngày t (giờ Việt Nam); không bao giờ ở tương lai. */
  const stamp = (t: number, hour: number, minute = 0, rng?: Rng) => {
    const iso = new Date(`${dayOf(t)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`).getTime();
    if (iso <= nowMs - 60_000) return new Date(iso).toISOString();
    return new Date(nowMs - (rng ? between(rng, 5, 90) : 30) * 60_000).toISOString();
  };
  const isWeekend = (t: number) => {
    const [y, m, d] = dayOf(t).split("-").map(Number);
    const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return w === 0 || w === 6;
  };
  const plus = (iso: string, minutes: number) => {
    const ms = Math.min(Date.parse(iso) + minutes * 60_000, nowMs - 60_000);
    return new Date(ms).toISOString();
  };

  // ── Thầy cô mẫu ──
  const counselor: DemoStaff = { id: newId(), key: "tu-van", nickname: DEMO_COUNSELOR, role: "counselor" };
  data.staff.push(counselor);
  const rngCodes = mulberry32(seed ^ 0x5a5a);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (const c of DEMO_CLASSES) {
    const teacher: DemoStaff = { id: newId(), key: `gv-${c.key}`, nickname: c.teacher, role: "teacher" };
    data.staff.push(teacher);
    const suffix = Array.from({ length: 4 }, () => pick(rngCodes, alphabet.split(""))).join("");
    data.classes.push({ id: newId(), key: c.key, code: `${DEMO_CODE_PREFIX}${c.key}-${suffix}`, name: c.name, grade: c.grade, homeroom_teacher_id: teacher.id });
  }
  const teacherOf = (classKey: string) => data.staff.find((s) => s.key === `gv-${classKey}`) as DemoStaff;
  const classOf = (key: string) => data.classes.find((c) => c.key === key) as DemoClass;

  // ── Học sinh ──
  let nick = 0;
  DEMO_CLASSES.forEach((c, ci) => {
    for (let i = 0; i < c.size; i++) {
      let story: Story = STORY_CYCLE[(i + ci * 3) % STORY_CYCLE.length];
      if (c.key === "7A" && i === 0) story = "showcase";
      if (c.key === "7A" && i === 1) story = "steady"; // bạn A trong phần "giữ bí mật"
      if (c.key === "7A" && i === 2) story = "friends"; // bạn B
      const join = story === "late" ? 16 + (i % 5) : i % 3;
      const id = newId();
      data.students.push({
        id,
        key: `${c.key}-${String(i + 1).padStart(2, "0")}`,
        class_id: classOf(c.key).id,
        classKey: c.key,
        nickname: NICKNAMES[nick++ % NICKNAMES.length],
        full_name: `Học sinh mẫu ${c.key}-${String(i + 1).padStart(2, "0")}`,
        story,
        created_at: stamp(join, 7, 15 + i),
        garden_plant_id: input.plantIds.length ? input.plantIds[(i + ci) % input.plantIds.length] : null,
      });
    }
  });
  const s7A = data.students.filter((s) => s.classKey === "7A");
  data.showcase = { journey: s7A[0].id, a: s7A[1].id, b: s7A[2].id, teacher: teacherOf("7A").id, counselor: counselor.id };

  // nhớ một số việc để trao huy hiệu đúng lúc (giống app: lần đầu làm việc đó)
  const firsts = new Map<string, Map<string, string>>();
  const first = (userId: string, badge: string, at: string) => {
    const m = firsts.get(userId) ?? new Map<string, string>();
    if (!m.has(badge) || Date.parse(at) < Date.parse(m.get(badge) as string)) m.set(badge, at);
    firsts.set(userId, m);
  };
  const activity = (user_id: string, kind: string, t: number, at: string, ref: string | null = null, worry_id: string | null = null) =>
    data.support_activity.push({ id: newId(), user_id, kind, ref, worry_id, day: dayKey(at), created_at: at });

  /** Một chuyện bận lòng và các lần được hỏi lại, đi qua đúng quy tắc của app (worries-shared). */
  const worry = (
    s: DemoStudent,
    rng: Rng,
    o: {
      t: number;
      hour?: number;
      topic: string;
      level: number;
      note?: string | null;
      source?: "checkin" | "chat";
      path: { after: number; level: number; feeling: Feeling }[];
      actions?: number[];
      told?: { after: number; who: "parent" | "teacher" | "friend" }[];
    },
  ) => {
    const id = newId();
    const created = stamp(o.t, o.hour ?? between(rng, 17, 21), between(rng, 0, 59), rng);
    let state = {
      status: "open" as WorryStatus,
      levelStart: o.level,
      levelNow: o.level,
      checksCount: 0,
      nextCheckAt: nextCheckAt(new Date(created)) as Date | null,
    };
    let updated = created;
    activity(s.id, "worry_saved", o.t, created, null, id);
    first(s.id, "dam-ke", created);
    for (const a of o.actions ?? []) {
      const at = stamp(o.t + a, between(rng, 18, 21), between(rng, 0, 59), rng);
      if (Date.parse(at) <= nowMs) {
        const pool = input.actions[o.topic]?.length ? input.actions[o.topic] : Object.values(input.actions).flat();
        if (pool.length) {
          activity(s.id, "tiny_action_done", o.t + a, at, pick(rng, pool), id);
          first(s.id, "thu-viec-nho", at);
        }
      }
    }
    for (const tl of o.told ?? []) {
      const at = stamp(o.t + tl.after, between(rng, 18, 21), between(rng, 0, 59), rng);
      activity(s.id, "told", o.t + tl.after, at, tl.who, id);
      first(s.id, "cay-cau", at);
    }
    let t = o.t;
    for (const p of o.path) {
      t += p.after;
      if (t > DEMO_DAYS || state.status !== "open") break;
      let at = stamp(t, between(rng, 6, 20), between(rng, 0, 59), rng);
      // app chỉ hỏi khi đã tới hạn: trả lời sớm nhất là ngay sau lúc tới hạn
      if (state.nextCheckAt && Date.parse(at) < state.nextCheckAt.getTime()) {
        at = new Date(state.nextCheckAt.getTime() + between(rng, 20, 240) * 60_000).toISOString();
        if (Date.parse(at) > nowMs - 60_000) break;
      }
      const next = nextWorryState(state, { level: p.level, feeling: p.feeling }, new Date(at));
      data.worry_checks.push({ id: newId(), worry_id: id, user_id: s.id, level: p.level, feeling: p.feeling, created_at: at });
      activity(s.id, "followup_answered", t, at, null, id);
      first(s.id, "quay-lai-hoi-tham", at);
      if (next.levelDropped) first(s.id, "nhe-long-hon", at);
      if (p.feeling === "worse" && p.level === 5) worseAlerts.push({ s, at, topic: o.topic, levelStart: o.level });
      state = next;
      updated = at;
    }
    if (isStale(state, now)) state = { ...state, status: "stale" };
    data.worries.push({
      id,
      user_id: s.id,
      topic: o.topic,
      note: o.note ?? null,
      level_start: o.level,
      level_now: state.levelNow,
      status: state.status,
      next_check_at: state.nextCheckAt?.toISOString() ?? null,
      checks_count: state.checksCount,
      source: o.source ?? "checkin",
      created_at: created,
      updated_at: updated,
    });
    return id;
  };
  const worseAlerts: { s: DemoStudent; at: string; topic: string; levelStart: number }[] = [];

  /** Một cuộc trò chuyện ngắn (2 lượt), kèm trợ lý đoán chủ đề và vài lượt chấm 👍/👎. */
  const chat = (s: DemoStudent, rng: Rng, t: number, topic: string, guessed: "yes" | "no" | null) => {
    const conv = newId();
    const lines = USER_LINES[topic] ?? USER_LINES.vui;
    const start = stamp(t, between(rng, 19, 21), between(rng, 0, 40), rng);
    const opening = pick(rng, lines);
    let at = start;
    const msgs: Row[] = [];
    for (let k = 0; k < 2; k++) {
      msgs.push({ id: newId(), conversation_id: conv, role: "user", content: k === 0 ? opening : pick(rng, lines), created_at: at });
      at = plus(at, 1);
      const reply = { id: newId(), conversation_id: conv, role: "assistant", content: pick(rng, MAY_LINES), created_at: at };
      msgs.push(reply);
      if (rng() < 0.3) {
        const up = rng() < 0.85;
        data.message_feedback.push({
          message_id: reply.id,
          user_id: s.id,
          rating: up ? 1 : -1,
          reason: up ? null : pick(rng, FEEDBACK_REASONS),
          created_at: at,
          updated_at: at,
        });
      }
      at = plus(at, between(rng, 1, 4));
    }
    data.conversations.push({ id: conv, user_id: s.id, title: opening, created_at: start, updated_at: at });
    data.messages.push(...msgs);
    if (guessed && topic !== "vui") activity(s.id, guessed === "yes" ? "topic_guess_yes" : "topic_guess_no", t, plus(start, 2), topic);
    return conv;
  };

  /** Tin nhắn bị gắn cờ trong cảnh báo: chỉ là dòng giả lập, kèm câu trả lời soạn sẵn. */
  const flaggedChat = (s: DemoStudent, at: string, level: "urgent" | "concern") => {
    const conv = newId();
    data.conversations.push({ id: conv, user_id: s.id, title: "Cuộc trò chuyện (giả lập)", created_at: at, updated_at: plus(at, 1) });
    data.messages.push(
      { id: newId(), conversation_id: conv, role: "user", content: `${SIMULATED} (mức ${level === "urgent" ? "khẩn cấp" : "đáng lo"})`, flagged: true, created_at: at },
      {
        id: newId(),
        conversation_id: conv,
        role: "assistant",
        content:
          level === "urgent"
            ? "Mình rất lo cho bạn. Bạn không phải ở một mình đâu: hãy tìm thầy cô hoặc người lớn ngay bây giờ nhé. (câu soạn sẵn, giả lập)"
            : "Chuyện đó không phải lỗi của bạn. Bạn kể với thầy cô chủ nhiệm hoặc phòng tham vấn nhé. (giả lập)",
        is_crisis_response: level === "urgent",
        created_at: plus(at, 1),
      },
    );
  };

  const byStory = (classKey: string, story: Story, nth = 0) => data.students.filter((s) => s.classKey === classKey && s.story === story)[nth];
  // bạn sẽ có cảnh báo "nặng lòng 5 ngày liền" gần đây: những ngày đó check-in nặng lòng thật
  const lateStreak = byStory("7A", "exam", 1) ?? byStory("7A", "exam");

  // ── Hoạt động từng bạn ──
  for (const s of data.students) {
    const rng = mulberry32(seed ^ hash(s.key));
    const join = Math.round((Date.parse(s.created_at) - Date.parse(stamp(0, 0))) / 86_400_000);
    const active = (t: number) => {
      if (t < join) return false;
      switch (s.story) {
        case "dropoff":
          return t <= join + 6;
        case "fade":
          return t <= join + 6 || (t >= join + 15 && t <= join + 18);
        case "sporadic":
          return rng() < 0.45;
        default:
          return true;
      }
    };
    const p = { showcase: 0.85, steady: 0.75, exam: 0.7, friends: 0.65, family: 0.6, lowkey: 0.3, dropoff: 0.85, fade: 0.7, sporadic: 0.8, late: 0.7 }[
      s.story
    ];

    // tâm trạng theo ngày: âm khi đang có chuyện, nhẹ dần sau khi được hỏi lại
    const dips: { from: number; to: number; topic: string }[] = [];
    if (s.story === "exam") dips.push({ from: 9, to: 15, topic: "hoc-tap" });
    if (s.story === "friends") dips.push({ from: 6, to: 11, topic: "ban-be" });
    if (s.story === "family") dips.push({ from: 10, to: 17, topic: "gia-dinh" });
    if (s.story === "showcase") dips.push({ from: 3, to: 8, topic: "hoc-tap" }, { from: 16, to: 19, topic: "ban-be" }, { from: 29, to: 30, topic: "ban-than" });
    if (s.story === "lowkey") dips.push({ from: 19, to: 23, topic: "mang-xa-hoi" });
    if (s.id === lateStreak.id) dips.push({ from: 25, to: 29, topic: "hoc-tap" });
    const base = s.story === "lowkey" ? 0.45 : 0.62;

    let firstCheckin: string | null = null;
    const checkinDays: number[] = [];
    for (let t = 0; t <= DEMO_DAYS; t++) {
      if (!active(t)) continue;
      const prob = isWeekend(t) ? p * 0.45 : p;
      if (rng() >= prob) continue;
      const dip = dips.find((d) => t >= d.from && t <= d.to);
      const at = stamp(t, between(rng, 6, 21), between(rng, 0, 59), rng);
      const roll = rng();
      const group: EmotionGroup = dip ? (roll < 0.7 ? "negative" : roll < 0.9 ? "neutral" : "positive") : roll < base ? "positive" : roll < base + 0.26 ? "neutral" : "negative";
      const pool = group === "positive" ? POSITIVE : group === "neutral" ? NEUTRAL : NEGATIVE_BY_TOPIC[dip?.topic ?? pick(rng, Object.keys(NEGATIVE_BY_TOPIC))];
      const emotions = [pick(rng, pool)];
      if (rng() < 0.3) {
        const extra = pick(rng, group === "negative" ? [...pool, "met"] : POSITIVE);
        if (!emotions.includes(extra)) emotions.push(extra);
      }
      data.checkins.push({ id: newId(), user_id: s.id, emotions, created_at: at });
      checkinDays.push(t);
      if (!firstCheckin) firstCheckin = at;
    }
    if (firstCheckin) first(s.id, "goi-ten-cam-xuc", firstCheckin);

    // chuyện bận lòng + trò chuyện
    const guess = () => (rng() < 0.82 ? "yes" : "no") as "yes" | "no";
    switch (s.story) {
      case "showcase":
        // Bạn được kể chuyện trong buổi trình diễn: 2 chuyện đã nhẹ đi, 1 chuyện vừa kể hôm nay (để "tua nhanh")
        chat(s, rng, 3, "hoc-tap", "yes");
        worry(s, rng, {
          t: 4,
          hour: 20,
          topic: "hoc-tap",
          level: 4,
          note: "Kiểm tra 15 phút môn Toán, mình sợ bị điểm kém",
          path: [
            { after: 3, level: 3, feeling: "same" },
            { after: 3, level: 2, feeling: "better" },
            { after: 3, level: 1, feeling: "better" },
          ],
          actions: [1, 4],
          told: [{ after: 6, who: "parent" }],
        });
        chat(s, rng, 12, "vui", null);
        chat(s, rng, 17, "ban-be", "yes");
        worry(s, rng, {
          t: 17,
          topic: "ban-be",
          level: 3,
          source: "chat",
          note: "Mình với bạn thân giận nhau từ hôm thứ Hai",
          path: [
            { after: 3, level: 2, feeling: "better" },
            { after: 3, level: 1, feeling: "done" },
          ],
          actions: [1],
          told: [{ after: 1, who: "friend" }],
        });
        worry(s, rng, { t: DEMO_DAYS, topic: "ban-than", level: 3, note: "Dạo này mình hay thức khuya xem điện thoại", path: [] });
        break;
      case "exam":
        chat(s, rng, 9, "hoc-tap", guess());
        worry(s, rng, {
          t: 10,
          topic: "hoc-tap",
          level: 4,
          note: rng() < 0.5 ? pick(rng, WORRY_NOTES["hoc-tap"]) : null,
          path: [
            { after: 3, level: 3, feeling: "same" },
            { after: 3, level: 2, feeling: "better" },
            { after: 3, level: 1, feeling: "better" },
          ],
          actions: [1],
        });
        if (rng() < 0.5) chat(s, rng, 22, "vui", null);
        break;
      case "friends":
        chat(s, rng, 6, "ban-be", guess());
        worry(s, rng, {
          t: 7,
          topic: "ban-be",
          level: 3,
          source: "chat",
          path: [
            { after: 3, level: 2, feeling: "better" },
            { after: 4, level: 1, feeling: "done" },
          ],
          told: [{ after: 2, who: "friend" }],
        });
        chat(s, rng, 20, "vui", null);
        break;
      case "family":
        chat(s, rng, 10, "gia-dinh", guess());
        worry(s, rng, {
          t: 11,
          topic: "gia-dinh",
          level: 4,
          path: [
            { after: 3, level: 5, feeling: "worse" },
            { after: 3, level: 3, feeling: "better" },
            { after: 3, level: 2, feeling: "better" },
          ],
          actions: [4],
          told: [{ after: 5, who: "teacher" }],
        });
        break;
      case "lowkey":
        worry(s, rng, { t: 20, topic: "mang-xa-hoi", level: 3, path: [{ after: 3, level: 3, feeling: "same" }] });
        break;
      case "dropoff":
        worry(s, rng, { t: Math.min(3, DEMO_DAYS), topic: "hoc-tap", level: 3, path: [] });
        break;
      case "steady":
        if (rng() < 0.45) chat(s, rng, between(rng, 5, 25), "vui", null);
        if (rng() < 0.5) {
          const topic = pick(rng, ["ban-than", "hoc-tap"]);
          chat(s, rng, 13, topic, guess());
          worry(s, rng, { t: 14, topic, level: 2, path: [{ after: 3, level: 1, feeling: "better" }] });
        }
        break;
      case "sporadic":
        if (rng() < 0.6) chat(s, rng, between(rng, 8, 26), pick(rng, ["hoc-tap", "ban-be", "vui"]), guess());
        break;
      case "late":
        chat(s, rng, Math.min(DEMO_DAYS, 22), pick(rng, ["hoc-tap", "vui"]), guess());
        break;
      default:
        break;
    }

    // thói quen riêng
    if (["showcase", "steady", "exam", "friends", "late"].includes(s.story) && rng() < (s.story === "showcase" ? 1 : 0.55)) {
      const h = pick(rng, HABIT_CHOICES);
      const hid = newId();
      const start = Math.max(join + 1, 2);
      data.habits.push({ id: hid, user_id: s.id, title: h.title, icon: h.icon, archived: false, challenge_id: null, created_at: stamp(start, 20, 10, rng) });
      for (let t = start; t <= DEMO_DAYS; t++) if (rng() < (s.story === "showcase" ? 0.75 : 0.55)) data.habit_logs.push({ habit_id: hid, day: dayOf(t), created_at: stamp(t, 21, 0, rng) });
    }

    // câu trả lời suy ngẫm (riêng tư, không ai đọc được)
    for (const t of checkinDays) {
      if (rng() < (s.story === "showcase" ? 0.4 : 0.15)) {
        data.reflection_answers.push({
          id: newId(),
          user_id: s.id,
          question_text: pick(rng, REFLECTION_QUESTIONS),
          day: dayOf(t),
          answer: pick(rng, REFLECTION_ANSWERS),
          created_at: stamp(t, 21, 30, rng),
        });
      }
    }
  }

  // ── Thử thách của lớp ──
  const challengeSpecs = [
    { classKey: "7A", title: "Uống đủ 6 cốc nước", icon: "💧", description: "Mỗi ngày uống đủ 6 cốc nước, tick khi xong.", t: 20, ends: 4, joinRate: 0.5 },
    { classKey: "7B", title: "Ngủ trước 22h30", icon: "🌙", description: "Cả lớp thử đi ngủ sớm trong 2 tuần.", t: 5, ends: -11, joinRate: 0.45 },
    { classKey: "8C", title: "Mỗi ngày một điều biết ơn", icon: "🙏", description: "Viết ra một điều bạn biết ơn hôm nay.", t: 12, ends: 2, joinRate: 0.45 },
  ];
  for (const spec of challengeSpecs) {
    const rng = mulberry32(seed ^ hash(`thu-thach-${spec.classKey}`));
    const teacher = teacherOf(spec.classKey);
    const cid = newId();
    const createdAt = stamp(spec.t, 7, 30, rng);
    data.challenges.push({
      id: cid,
      class_id: classOf(spec.classKey).id,
      author_id: teacher.id,
      author_name: teacher.nickname,
      title: spec.title,
      icon: spec.icon,
      description: spec.description,
      ends_on: addDays(today, spec.ends),
      status: spec.ends < 0 ? "closed" : "open",
      created_at: createdAt,
    });
    data.admin_audit.push({ actor_id: teacher.id, actor_name: teacher.nickname, action: "Tạo thử thách cho lớp", detail: spec.title, created_at: createdAt });
    const last = Math.min(DEMO_DAYS, DEMO_DAYS + spec.ends);
    for (const s of data.students.filter((x) => x.classKey === spec.classKey && !["dropoff", "fade"].includes(x.story))) {
      if (rng() >= spec.joinRate) continue;
      const hid = newId();
      const joinT = spec.t + between(rng, 0, 2);
      data.habits.push({ id: hid, user_id: s.id, title: spec.title, icon: spec.icon, archived: false, challenge_id: cid, created_at: stamp(joinT, 19, 0, rng) });
      for (let t = joinT; t <= last; t++) if (rng() < 0.6) data.habit_logs.push({ habit_id: hid, day: dayOf(t), created_at: stamp(t, 21, 15, rng) });
    }
  }

  // ── Cảnh báo (mẫu; không có câu nguy hiểm thật) ──
  const alert = (
    s: DemoStudent,
    o: {
      at: string;
      type: string;
      severity: "watch" | "urgent";
      excerpt: string | null;
      reasons: string[];
      handledAfterMin?: number;
      status: "new" | "seen" | "resolved";
      note?: string;
    },
  ) => {
    const handled = o.handledAfterMin !== undefined ? plus(o.at, o.handledAfterMin) : null;
    data.alerts.push({
      id: newId(),
      student_id: s.id,
      class_id: s.class_id,
      nickname: s.nickname,
      full_name: s.full_name,
      type: o.type,
      severity: o.severity,
      excerpt: o.excerpt,
      reasons: o.reasons,
      status: o.status,
      note: o.note ?? null,
      handled_by: handled ? counselor.id : null,
      handled_by_name: handled ? counselor.nickname : null,
      handled_at: handled,
      first_handled_at: handled,
      created_at: o.at,
    });
    if (handled) {
      data.admin_audit.push({ actor_id: counselor.id, actor_name: counselor.nickname, action: "Nhận cảnh báo", detail: o.severity === "urgent" ? "Mức khẩn" : "Cần để ý", created_at: handled });
    }
  };
  const urgent = (s: DemoStudent, t: number, hour: number, after: number, status: "seen" | "resolved", note: string) => {
    const at = stamp(t, hour, 12);
    flaggedChat(s, at, "urgent");
    alert(s, { at, type: "chat_risk", severity: "urgent", excerpt: `${SIMULATED} (mức khẩn cấp)`, reasons: ["Giả lập: câu mẫu mức khẩn cấp"], handledAfterMin: after, status, note });
  };
  urgent(byStory("7B", "family"), 12, 21, 40, "resolved", "Đã gặp riêng bạn ấy sáng hôm sau, đã báo phụ huynh. (mẫu)");
  urgent(byStory("8C", "sporadic"), 21, 22, 190, "resolved", "Đã nói chuyện cùng GVCN, hẹn gặp lại sau 1 tuần. (mẫu)");
  urgent(byStory("7A", "lowkey"), 27, 20, 95, "seen", "Đang theo dõi, hẹn gặp thứ Sáu. (mẫu)");

  const teased = (s: DemoStudent, t: number, status: "new" | "resolved") => {
    const at = stamp(t, 20, 40);
    flaggedChat(s, at, "concern");
    alert(s, {
      at,
      type: "chat_risk",
      severity: "watch",
      excerpt: `${SIMULATED} Bạn kể bị trêu chọc nhiều lần ở lớp`,
      reasons: ["Giả lập: có dấu hiệu bị trêu chọc kéo dài"],
      handledAfterMin: status === "resolved" ? 300 : undefined,
      status,
      note: status === "resolved" ? "GVCN đã nhắc nhở nhóm bạn, theo dõi thêm. (mẫu)" : undefined,
    });
  };
  teased(byStory("7A", "friends", 1), 15, "resolved");
  teased(byStory("8C", "friends"), 28, "new");

  alert(byStory("7B", "exam"), {
    at: stamp(14, 21, 5),
    type: "negative_streak",
    severity: "watch",
    excerpt: null,
    reasons: ["Cảm xúc nặng lòng 5 ngày liền"],
    handledAfterMin: 720,
    status: "resolved",
    note: "Bạn ấy lo thi, đã cùng lập kế hoạch ôn. (mẫu)",
  });
  alert(lateStreak, {
    at: stamp(29, 21, 0),
    type: "negative_streak",
    severity: "watch",
    excerpt: null,
    reasons: ["Cảm xúc nặng lòng 5 ngày liền"],
    status: "new",
  });
  for (const w of worseAlerts) {
    alert(w.s, {
      at: w.at,
      type: "worry_worse",
      severity: "watch",
      excerpt: `Trợ lý hỏi thăm chuyện "${w.topic}": học sinh chọn "Nặng hơn", mức lo "Lo rất nhiều". Không kèm chuyện học sinh kể.`,
      reasons: ["Học sinh tự đánh giá: nặng hơn, lo rất nhiều"],
      handledAfterMin: 240,
      status: "resolved",
      note: "Đã hỏi thăm, bạn ấy muốn hẹn gặp phòng tham vấn. (mẫu)",
    });
  }

  // ── Lời nhờ giúp (không khẩn) ──
  const help = (
    s: DemoStudent,
    o: { t: number; to: "teacher" | "counselor"; when: "break" | "after_school" | "any"; note: string | null; reply?: string; afterMin?: number; status: "new" | "replied" | "done" },
  ) => {
    const at = stamp(o.t, 10, 5);
    const by = o.to === "counselor" ? counselor : teacherOf(s.classKey);
    const repliedAt = o.reply ? plus(at, o.afterMin ?? 120) : null;
    data.help_requests.push({
      id: newId(),
      student_id: s.id,
      class_id: s.class_id,
      nickname: s.nickname,
      full_name: s.full_name,
      to_role: o.to,
      when_pref: o.when,
      note: o.note,
      status: o.status,
      reply: o.reply ?? null,
      replied_by: o.reply ? by.id : null,
      replied_by_name: o.reply ? by.nickname : null,
      replied_at: repliedAt,
      created_at: at,
    });
    if (repliedAt) data.admin_audit.push({ actor_id: by.id, actor_name: by.nickname, action: "Trả lời lời nhờ giúp", detail: null, created_at: repliedAt });
  };
  help(byStory("7A", "family"), { t: 16, to: "counselor", when: "after_school", note: "Mình muốn nói chuyện về chuyện ở nhà", reply: "Cô hẹn em chiều thứ Năm 16h30 ở phòng tham vấn nhé.", afterMin: 95, status: "done" });
  help(byStory("7B", "exam"), { t: 11, to: "teacher", when: "break", note: "Thầy giảng lại giúp em bài phân số được không ạ", reply: "Giờ ra chơi tiết 2 em lên bàn thầy nhé.", afterMin: 50, status: "done" });
  help(byStory("8C", "exam"), { t: 24, to: "teacher", when: "any", note: null, reply: "Cô gặp em đầu giờ chiều mai nhé.", afterMin: 180, status: "replied" });
  help(byStory("8C", "friends"), { t: 29, to: "counselor", when: "break", note: "Mình muốn hỏi cách làm lành với bạn", status: "new" });
  help(byStory("7A", "steady", 2), { t: 30, to: "teacher", when: "after_school", note: null, status: "new" });

  // ── Khu vườn: vài bạn đã thu hoạch ──
  for (const s of [data.students[0], ...data.students.filter((x) => x.story === "steady").slice(0, 2)]) {
    const at = stamp(24, 20, 30);
    data.garden_harvests.push({ id: newId(), user_id: s.id, plant_name: "Hướng dương", plant_emoji: "🌻", points_used: 25, created_at: at });
    first(s.id, "nguoi-lam-vuon", at);
  }

  // ── Huy hiệu: đúng lần đầu làm việc đó ──
  for (const [user_id, m] of firsts) for (const [badge_key, earned_at] of m) data.badges_earned.push({ user_id, badge_key, earned_at });

  // ── Câu hỏi cho lớp (GVCN tạo) và bài cho lớp ──
  const surveyFor = (classKey: string, respondRate: number, t: number) => {
    const teacher = teacherOf(classKey);
    const id = newId();
    const rng = mulberry32(seed ^ hash(`phieu-${classKey}`));
    const questions = [
      { id: "q1", type: "scale", text: "Tuần này em thấy thế nào?", required: true, options: [], minLabel: "Rất mệt", maxLabel: "Rất vui" },
      { id: "q2", type: "choice", text: "Điều gì khiến em bận lòng nhất tuần này?", required: true, options: ["Học tập, thi cử", "Bạn bè", "Gia đình", "Không có gì"], minLabel: "", maxLabel: "" },
      { id: "q3", type: "text", text: "Em muốn thầy cô biết điều gì? (không bắt buộc)", required: false, options: [], minLabel: "", maxLabel: "" },
    ];
    const at = stamp(t, 7, 0);
    data.surveys.push({
      id,
      title: "Tuần này của lớp mình",
      description: "3 câu hỏi nhanh, thầy cô chỉ xem kết quả chung của cả lớp.",
      questions,
      class_ids: [classOf(classKey).id],
      status: "open",
      author_id: teacher.id,
      author_name: teacher.nickname,
      created_at: at,
      updated_at: at,
    });
    for (const s of data.students.filter((x) => x.classKey === classKey && !["dropoff", "late"].includes(x.story))) {
      if (rng() >= respondRate) continue;
      data.survey_responses.push({
        id: newId(),
        survey_id: id,
        user_id: s.id,
        class_id: s.class_id,
        answers: { q1: between(rng, 2, 5), q2: pick(rng, ["Học tập, thi cử", "Học tập, thi cử", "Bạn bè", "Gia đình", "Không có gì"]), q3: "" },
        created_at: stamp(t + between(rng, 0, 2), 20, between(rng, 0, 59)),
      });
    }
  };
  surveyFor("7A", 0.85, 22);
  surveyFor("8C", 0.25, 26); // ít bạn trả lời: trang thầy cô phải ẩn kết quả (dưới 5 bạn)

  const gv7A = teacherOf("7A");
  data.lessons.push({
    id: newId(),
    slug: `mau-7a-hit-tho-${data.classes[0].code.slice(-4).toLowerCase()}`,
    title: "Hít thở 4-7-8 trước giờ kiểm tra",
    summary: "Một cách thở chậm giúp bình tĩnh lại trong 1 phút.",
    grade: 7,
    unit: "",
    topic: "Cảm xúc",
    emoji: "🌬️",
    sort_order: 100,
    source: "GVCN lớp mẫu 7A",
    body: "Hít vào bằng mũi 4 nhịp, giữ hơi 7 nhịp, thở ra bằng miệng 8 nhịp. Làm 3 lần.",
    published: true,
    exercises: [],
    class_id: data.classes[0].id,
    author_id: gv7A.id,
    author_name: gv7A.nickname,
    created_at: stamp(18, 8, 0),
    updated_at: stamp(18, 8, 0),
  });

  return data;
}

/** Băm một chuỗi thành số (để mỗi bạn có dãy ngẫu nhiên riêng, ổn định). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kiểm tra cảm xúc có thật trong danh sách của app (dùng trong test). */
export const knownEmotion = (id: string) => Boolean(getEmotion(id));
