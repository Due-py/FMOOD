// MỨC TÂM TRẠNG 1–5 VÀ CHUỖI CHO BIỂU ĐỒ (hàm thuần, có test: mood.test.ts). Duy chọn 01/11.
// Check-in chọn một mức 1–5 trước khi gọi tên cảm xúc. Trang "Tâm trạng" vẽ đường + heatmap cho 7 ngày, một tháng, một năm.
// Mỗi ngày tính theo LẦN GHI GẦN NHẤT (như lib/emotions.ts latestPerDay). Check-in cũ chưa có mức thì ƯỚC TÍNH từ nhóm
// cảm xúc (tích cực 4, trung tính 3, nặng lòng 2; "Chưa rõ" không ước tính) và đánh dấu `estimated` để trang ghi rõ.
import { addDays } from "./dates";
import { dominantGroup, isUnsure } from "./emotions";

export const MOOD_LEVELS = [
  { value: 1, emoji: "😣", label: "Rất tệ" },
  { value: 2, emoji: "🙁", label: "Không vui" },
  { value: 3, emoji: "😐", label: "Bình thường" },
  { value: 4, emoji: "🙂", label: "Vui" },
  { value: 5, emoji: "😄", label: "Rất tốt" },
] as const;
export type MoodValue = 1 | 2 | 3 | 4 | 5;

export const isMood = (v: unknown): v is MoodValue => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
export const moodLevel = (v: number) => MOOD_LEVELS[Math.min(5, Math.max(1, Math.round(v))) - 1];

/** Mức của một lần ghi: mức học sinh chọn; chưa có thì ước tính từ cảm xúc (null nếu "Chưa rõ" / không có cảm xúc). */
export function checkinMood(c: { mood?: number | null; emotions: string[] }): { mood: number; estimated: boolean } | null {
  if (isMood(c.mood)) return { mood: c.mood, estimated: false };
  if (!c.emotions.length || isUnsure(c.emotions)) return null;
  const g = dominantGroup(c.emotions);
  return { mood: g === "positive" ? 4 : g === "negative" ? 2 : 3, estimated: true };
}

export type DayPoint = { day: string; mood: number | null; estimated: boolean };

/** Mức của từng ngày (lần ghi gần nhất trong ngày). `day`: đổi ISO sang ngày giờ VN. */
export function moodByDay(rows: { at: string; mood?: number | null; emotions: string[] }[], day: (iso: string) => string): Map<string, { mood: number; estimated: boolean }> {
  const latest = new Map<string, { at: string; v: { mood: number; estimated: boolean } | null }>();
  for (const r of rows) {
    const d = day(r.at);
    const cur = latest.get(d);
    if (!cur || r.at > cur.at) latest.set(d, { at: r.at, v: checkinMood(r) });
  }
  const out = new Map<string, { mood: number; estimated: boolean }>();
  for (const [d, { v }] of latest) if (v) out.set(d, v);
  return out;
}

/** Các ngày từ `from` tới `to` (gồm cả hai), mỗi ngày một điểm (null: không ghi). */
export function daySeries(byDay: Map<string, { mood: number; estimated: boolean }>, from: string, to: string): DayPoint[] {
  const out: DayPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const v = byDay.get(d);
    out.push({ day: d, mood: v?.mood ?? null, estimated: v?.estimated ?? false });
  }
  return out;
}

/** Thứ trong tuần, thứ Hai = 0 … Chủ nhật = 6. */
export function mondayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Số ngày của tháng (month 1–12). */
export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
export const monthStart = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-01`;
export const monthEnd = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;

/** Lưới heatmap kiểu lịch: các cột là tuần (bắt đầu thứ Hai), mỗi cột 7 ô; ô ngoài khoảng là null. */
export function weekGrid(points: DayPoint[]): (DayPoint | null)[][] {
  if (!points.length) return [];
  const cols: (DayPoint | null)[][] = [];
  let col: (DayPoint | null)[] = Array.from({ length: mondayIndex(points[0].day) }, () => null);
  for (const p of points) {
    col.push(p);
    if (col.length === 7) {
      cols.push(col);
      col = [];
    }
  }
  if (col.length) cols.push([...col, ...Array.from({ length: 7 - col.length }, () => null)]);
  return cols;
}

/** Đường cả năm: trung bình mỗi tuần (bắt đầu thứ Hai); tuần không ghi ngày nào là null. */
export function weeklyAverages(points: DayPoint[]): { from: string; to: string; mood: number | null; days: number }[] {
  return weekGrid(points).map((col) => {
    const days = col.filter((p): p is DayPoint => p !== null);
    const vals = days.map((p) => p.mood).filter((m): m is number => m !== null);
    return {
      from: days[0].day,
      to: days.at(-1)!.day,
      mood: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
      days: vals.length,
    };
  });
}

/** Tóm tắt: số ngày đã ghi, mức trung bình (1 chữ số thập phân), có ngày ước tính không. */
export function summary(points: { mood: number | null; estimated?: boolean }[]): { days: number; avg: number | null; estimated: boolean } {
  const vals = points.filter((p) => p.mood !== null);
  if (!vals.length) return { days: 0, avg: null, estimated: false };
  return {
    days: vals.length,
    avg: Math.round((vals.reduce((a, p) => a + (p.mood as number), 0) / vals.length) * 10) / 10,
    estimated: vals.some((p) => p.estimated),
  };
}
