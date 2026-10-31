// THÓI QUEN: phần tính thuần (không đọc cơ sở dữ liệu; chạy được ở test, máy chủ và trình duyệt).
// Nguyên tắc không phạt: không có "chuỗi" để đứt, ngày chưa làm không tô đỏ, nhãn trạng thái không trách.
// Tuần tính theo lịch, từ Thứ Hai đến Chủ Nhật (giờ Việt Nam), để "Tuần này 3/7" khớp với một hàng của lịch 4 tuần.
import { addDays, weekdayLabel } from "./dates";
import { guardReply } from "./safety/reply-guard";

/** Dữ liệu một thói quen đủ để tính mọi thứ dưới đây. */
export type HabitDays = {
  id: string;
  title: string;
  icon: string;
  /** ngày bắt đầu (ngày tạo, giờ Việt Nam) */
  startDay: string;
  /** hôm nay (giờ Việt Nam) do máy chủ đặt */
  today: string;
  /** các ngày đã làm trong 5 tuần gần nhất (đủ cho lịch 4 tuần) */
  done: string[];
  /** số ngày đã làm từ khi bắt đầu */
  total: number;
};

/** Số ngày giữ lại để vẽ lịch: 4 tuần lịch, tuần sớm nhất có thể bắt đầu 34 ngày trước. */
export const HISTORY_DAYS = 35;

export type HabitStatus = "steady" | "regaining" | "new";

export const STATUS_LABEL: Record<HabitStatus, string> = {
  steady: "Đang đều",
  regaining: "Đang lấy lại nhịp",
  new: "Mới bắt đầu",
};

const WEEKDAY_NAME: Record<string, string> = {
  T2: "Thứ Hai",
  T3: "Thứ Ba",
  T4: "Thứ Tư",
  T5: "Thứ Năm",
  T6: "Thứ Sáu",
  T7: "Thứ Bảy",
  CN: "Chủ Nhật",
};
const WEEK_ORDER = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Thứ Hai của tuần chứa ngày này. */
export function mondayOf(day: string): string {
  const offset = WEEK_ORDER.indexOf(weekdayLabel(day));
  return addDays(day, -offset);
}

/** "26/10" */
export function shortDate(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function countBetween(done: Set<string>, from: string, to: string): number {
  let n = 0;
  for (let k = from; k <= to; k = addDays(k, 1)) if (done.has(k)) n++;
  return n;
}

export type HabitSummary = {
  thisWeek: number;
  /** null khi tuần trước thói quen chưa có */
  lastWeek: number | null;
  /** 7 ngày gần nhất, tính cả hôm nay */
  last7: number;
  status: HabitStatus | null;
  /** câu trạng thái một dòng: "Tuần này 3/7 · tuần trước 5/7" */
  line: string;
};

/**
 * Nhãn trạng thái, theo thứ tự ưu tiên:
 *  - "Mới bắt đầu": tạo chưa đủ 7 ngày
 *  - "Đang đều": làm ≥ 5 trong 7 ngày gần nhất
 *  - "Đang lấy lại nhịp": hôm qua và hôm kia đều chưa làm (hôm nay chưa hết nên không tính)
 *  - còn lại: không gắn nhãn, chỉ hiện số ngày
 */
export function summarize(h: HabitDays): HabitSummary {
  const done = new Set(h.done);
  const monday = mondayOf(h.today);
  const thisWeek = countBetween(done, monday, h.today);
  const lastMonday = addDays(monday, -7);
  const lastWeek = h.startDay <= addDays(monday, -1) ? countBetween(done, lastMonday, addDays(monday, -1)) : null;
  const last7 = countBetween(done, addDays(h.today, -6), h.today);
  const yesterday = addDays(h.today, -1);
  const dayBefore = addDays(h.today, -2);

  let status: HabitStatus | null = null;
  if (h.startDay > addDays(h.today, -7)) status = "new";
  else if (last7 >= 5) status = "steady";
  else if (!done.has(yesterday) && !done.has(dayBefore)) status = "regaining";

  const line = `Tuần này ${thisWeek}/7${lastWeek === null ? "" : ` · tuần trước ${lastWeek}/7`}`;
  return { thisWeek, lastWeek, last7, status, line };
}

/** Chưa làm hôm nay xếp lên đầu; giữ thứ tự tạo trong mỗi nhóm. */
export function sortForToday<T extends { doneToday: boolean }>(habits: T[]): T[] {
  return [...habits.filter((h) => !h.doneToday), ...habits.filter((h) => h.doneToday)];
}

export type DayCell = { day: string; state: "done" | "open" | "before" | "future"; today: boolean };
export type CalendarWeek = { monday: string; label: string; days: DayCell[]; count: number };

/** Lịch 4 tuần: hàng là tuần (cũ → mới), cột cố định T2…CN; kèm số ngày đã làm mỗi tuần. */
export function calendar(h: HabitDays): CalendarWeek[] {
  const done = new Set(h.done);
  const thisMonday = mondayOf(h.today);
  return [3, 2, 1, 0].map((back) => {
    const monday = addDays(thisMonday, -7 * back);
    const days = Array.from({ length: 7 }, (_, i): DayCell => {
      const day = addDays(monday, i);
      const state = day > h.today ? "future" : done.has(day) ? "done" : day < h.startDay ? "before" : "open";
      return { day, state, today: day === h.today };
    });
    const label = back === 0 ? "Tuần này" : back === 1 ? "Tuần trước" : `Từ ${shortDate(monday)}`;
    return { monday, label, days, count: days.filter((d) => d.state === "done").length };
  });
}

// ───────── "Nhìn lại cùng trợ lý": sự thật do app tự đếm ─────────

export type HabitFacts = {
  thisWeek: number;
  lastWeek: number | null;
  /** số ngày đã có thói quen trong 4 tuần gần đây (tính cả hôm nay) */
  span: number;
  /** số ngày đã làm trong khoảng đó */
  doneInSpan: number;
  /** thứ trong tuần thường làm được / thường chưa làm (T2…CN), chỉ xét những ngày đã qua */
  oftenDone: string[];
  oftenOpen: string[];
};

export function habitFacts(h: HabitDays): HabitFacts {
  const done = new Set(h.done);
  const { thisWeek, lastWeek } = summarize(h);
  const from = h.startDay > addDays(h.today, -27) ? h.startDay : addDays(h.today, -27);
  let span = 0;
  let doneInSpan = 0;
  const perDay = new Map<string, { n: number; d: number }>();
  for (let k = from; k <= h.today; k = addDays(k, 1)) {
    span++;
    if (done.has(k)) doneInSpan++;
    if (k === h.today) continue;
    const w = weekdayLabel(k);
    const cur = perDay.get(w) ?? { n: 0, d: 0 };
    perDay.set(w, { n: cur.n + 1, d: cur.d + (done.has(k) ? 1 : 0) });
  }
  const pick = (ok: (s: { n: number; d: number }) => boolean) => WEEK_ORDER.filter((w) => perDay.has(w) && ok(perDay.get(w)!));
  return {
    thisWeek,
    lastWeek,
    span,
    doneInSpan,
    oftenDone: pick((s) => s.n >= 2 && s.d / s.n >= 0.75),
    oftenOpen: pick((s) => s.n >= 2 && s.n - s.d >= 2 && s.d / s.n <= 0.5),
  };
}

/** Các dòng số liệu hiện cho học sinh (và đưa cho AI): chỉ nói sự thật, không khen chê. */
export function factLines(f: HabitFacts): string[] {
  const lines = [`Tuần này ${f.thisWeek}/7 ngày${f.lastWeek === null ? "" : `, tuần trước ${f.lastWeek}/7 ngày`}.`];
  lines.push(f.span >= 28 ? `4 tuần gần đây: ${f.doneInSpan}/28 ngày.` : `Từ khi bắt đầu (${f.span} ngày): ${f.doneInSpan} ngày.`);
  if (f.oftenDone.length) lines.push(`Hôm thường làm được: ${f.oftenDone.join(", ")}.`);
  if (f.oftenOpen.length) lines.push(`Hôm thường chưa làm: ${f.oftenOpen.join(", ")}.`);
  return lines;
}

const names = (days: string[]) => {
  const full = days.map((d) => WEEKDAY_NAME[d]);
  return full.length > 1 ? `${full.slice(0, -1).join(", ")} và ${full.at(-1)}` : full[0];
};

/** Câu hỏi soạn sẵn từ số liệu (dùng khi AI lỗi, hoặc câu AI viết không qua được kiểm tra). */
export function fallbackQuestion(f: HabitFacts): string {
  if (f.oftenOpen.length) return `Những hôm ${names(f.oftenOpen)} thường có gì khác với các hôm còn lại?`;
  if (f.oftenDone.length) return `Những hôm ${names(f.oftenDone)} bạn làm được, việc này thường diễn ra lúc nào, ngay sau việc gì?`;
  return "Những hôm làm được, việc này thường diễn ra lúc nào, ngay sau việc gì?";
}

// ───────── Gợi ý một điều chỉnh nhỏ ─────────

export const ADJUST_KINDS = ["nho-lai", "gan-viec", "doi-gio"] as const;
export type AdjustKind = (typeof ADJUST_KINDS)[number];

export const ADJUST_TIPS: { kind: AdjustKind; title: string; text: string }[] = [
  { kind: "nho-lai", title: "Làm nhỏ lại", text: "Thu việc lại thật nhỏ, nhỏ tới mức hôm mệt vẫn làm được (ví dụ 2 phút thay vì 15 phút)." },
  { kind: "gan-viec", title: "Gắn vào một việc có sẵn", text: "Làm ngay sau một việc ngày nào bạn cũng làm: sau khi đánh răng, sau bữa tối…" },
  { kind: "doi-gio", title: "Đổi giờ", text: "Chọn một lúc khác trong ngày, khi bạn thường rảnh và còn sức." },
];

export type HabitAdjust = { kind: AdjustKind; text: string; newTitle: string };

/** Lời trách, gán tính cách, chấm điểm, nói "chuỗi", gọi "em": không được có trong lời trợ lý ở phần thói quen. */
const BLAME = /(chuỗi|lười|thất bại|kém cỏi|sao bạn|bỏ lỡ|chấm điểm|điểm số|kỷ luật|phải cố|đáng lẽ|tại bạn|các bạn khác|bạn khác)/iu;
const CALLS_EM = /(^|[^\p{L}])em([^\p{L}]|$)/iu;

function cleanLine(text: unknown, max: number): string | null {
  if (typeof text !== "string") return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length > max || BLAME.test(t) || CALLS_EM.test(t) || !guardReply(t).ok) return null;
  return t;
}

/** Câu hỏi AI viết: một dòng, đúng một câu hỏi, không trách; không đạt thì null (dùng câu soạn sẵn). */
export function checkQuestion(text: unknown): string | null {
  const t = cleanLine(text, 160);
  if (!t || (t.match(/\?/g) ?? []).length !== 1 || !t.endsWith("?")) return null;
  return t;
}

/** Tên thói quen mới phải hợp lệ như khi tạo (1–60 ký tự). */
export const TITLE_MAX = 60;

/** Gợi ý AI viết: đúng một loại điều chỉnh, lời ngắn, tên mới hợp lệ và khác tên cũ; không đạt thì null. */
export function checkAdjust(raw: unknown, oldTitle: string): HabitAdjust | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!ADJUST_KINDS.includes(r.kind as AdjustKind)) return null;
  const text = cleanLine(r.text, 220);
  const newTitle = cleanLine(r.newTitle, TITLE_MAX);
  if (!text || !newTitle || newTitle.toLocaleLowerCase("vi") === oldTitle.trim().toLocaleLowerCase("vi")) return null;
  return { kind: r.kind as AdjustKind, text, newTitle };
}
