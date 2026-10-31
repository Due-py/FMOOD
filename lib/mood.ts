// NHÓM TÂM TRẠNG 1–5 VÀ CHUỖI CHO BIỂU ĐỒ (hàm thuần, có test: mood.test.ts).
// Duy chọn 01/11 (sửa lại cùng ngày): không chọn mức riêng; mỗi cảm xúc xếp sẵn vào một nhóm (lib/emotions.ts, `level`):
//   5 Tuyệt vời (nắng) · 4 Tốt (nắng có mây) · 3 Bình thường (mây) · 2 Tệ (ô gập) · 1 Rất tệ (ô có mưa).
// Một lần check-in chọn nhiều cảm xúc: nhóm = trung bình các nhóm, làm tròn; "Chưa rõ" thì không có nhóm.
// Vì nhóm suy ra từ cảm xúc, check-in cũ cũng có nhóm đúng (không còn "ước tính").
// Mỗi ngày tính theo LẦN GHI GẦN NHẤT (như lib/emotions.ts latestPerDay).
import { addDays } from "./dates";
import { getEmotion } from "./emotions";

export type MoodValue = 1 | 2 | 3 | 4 | 5;

/** Từ thấp tới cao; `icon` là hình thời tiết (components/mood/MoodIcons.tsx). */
export const MOOD_LEVELS = [
  { value: 1, label: "Rất tệ", icon: "o-mua" },
  { value: 2, label: "Tệ", icon: "o-gap" },
  { value: 3, label: "Bình thường", icon: "may" },
  { value: 4, label: "Tốt", icon: "nang-may" },
  { value: 5, label: "Tuyệt vời", icon: "nang" },
] as const;

export const isMood = (v: unknown): v is MoodValue => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
export const moodLevel = (v: number) => MOOD_LEVELS[Math.min(5, Math.max(1, Math.round(v))) - 1];

/** Nhóm của một lần check-in từ các cảm xúc đã chọn (trung bình, làm tròn); không có cảm xúc nào có nhóm thì null. */
export function moodFromEmotions(ids: string[]): MoodValue | null {
  const levels = ids.map((id) => getEmotion(id)?.level).filter((l): l is MoodValue => isMood(l));
  if (!levels.length) return null;
  return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) as MoodValue;
}

export type DayPoint = { day: string; mood: number | null };

/** Nhóm của từng ngày (lần ghi gần nhất trong ngày). `day`: đổi ISO sang ngày giờ VN. */
export function moodByDay(rows: { at: string; emotions: string[] }[], day: (iso: string) => string): Map<string, number> {
  const latest = new Map<string, { at: string; mood: number | null }>();
  for (const r of rows) {
    const d = day(r.at);
    const cur = latest.get(d);
    if (!cur || r.at > cur.at) latest.set(d, { at: r.at, mood: moodFromEmotions(r.emotions) });
  }
  const out = new Map<string, number>();
  for (const [d, { mood }] of latest) if (mood !== null) out.set(d, mood);
  return out;
}

/** Các ngày từ `from` tới `to` (gồm cả hai), mỗi ngày một điểm (null: không ghi). */
export function daySeries(byDay: Map<string, number>, from: string, to: string): DayPoint[] {
  const out: DayPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ day: d, mood: byDay.get(d) ?? null });
  return out;
}

/** Thứ trong tuần, thứ Hai = 0 … Chủ nhật = 6. */
export function mondayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Số ngày của tháng (month 1–12). */
export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const pad = (n: number) => String(n).padStart(2, "0");
export const monthStart = (year: number, month: number) => `${year}-${pad(month)}-01`;
export const monthEnd = (year: number, month: number) => `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;

/** Lịch tháng: các hàng là tuần (bắt đầu thứ Hai), mỗi hàng 7 ô; ô ngoài tháng là null. */
export function weekGrid(points: DayPoint[]): (DayPoint | null)[][] {
  if (!points.length) return [];
  const rows: (DayPoint | null)[][] = [];
  let row: (DayPoint | null)[] = Array.from({ length: mondayIndex(points[0].day) }, () => null);
  for (const p of points) {
    row.push(p);
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push([...row, ...Array.from({ length: 7 - row.length }, () => null)]);
  return rows;
}

/** Lưới cả năm theo mẫu Duy gửi: hàng là ngày 1–31, cột là tháng T1–T12; ngày không có trong tháng là undefined. */
export function yearGrid(byDay: Map<string, number>, year: number): (number | null | undefined)[][] {
  return Array.from({ length: 31 }, (_, i) =>
    Array.from({ length: 12 }, (_, m) => (i + 1 <= daysInMonth(year, m + 1) ? (byDay.get(`${year}-${pad(m + 1)}-${pad(i + 1)}`) ?? null) : undefined)),
  );
}

const avg1 = (vals: number[]) => (vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null);

/** Đường cả năm: trung bình mỗi tháng (T1–T12); tháng không ghi ngày nào là null. */
export function monthlyAverages(byDay: Map<string, number>, year: number): { month: number; mood: number | null; days: number }[] {
  return Array.from({ length: 12 }, (_, m) => {
    const prefix = `${year}-${pad(m + 1)}-`;
    const vals = [...byDay].filter(([d]) => d.startsWith(prefix)).map(([, v]) => v);
    return { month: m + 1, mood: avg1(vals), days: vals.length };
  });
}

/**
 * Tỉ lệ tâm trạng: số ngày mỗi nhóm và phần trăm (làm tròn theo phần dư lớn nhất để tổng đúng 100), cao tới thấp,
 * chỉ các nhóm có ngày.
 */
export function levelShares(moods: number[]): { level: MoodValue; days: number; percent: number }[] {
  if (!moods.length) return [];
  const counts = [1, 2, 3, 4, 5].map((l) => moods.filter((m) => Math.round(m) === l).length);
  const raw = counts.map((c) => (c * 100) / moods.length);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  // phần dư bằng nhau thì ưu tiên nhóm cao hơn (đứng trước khi hiện từ cao tới thấp)
  const order = raw.map((r, i) => [r - floor[i], i] as const).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    if (counts[i]) {
      floor[i] += 1;
      left -= 1;
    }
  }
  return [5, 4, 3, 2, 1].filter((l) => counts[l - 1]).map((l) => ({ level: l as MoodValue, days: counts[l - 1], percent: floor[l - 1] }));
}

/** Tóm tắt: số ngày đã ghi, nhóm trung bình (1 chữ số thập phân). */
export function summary(points: { mood: number | null }[]): { days: number; avg: number | null } {
  const vals = points.map((p) => p.mood).filter((m): m is number => m !== null);
  return { days: vals.length, avg: avg1(vals) };
}
