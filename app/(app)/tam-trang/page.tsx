import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getMoodByDay } from "@/lib/checkins";
import { addDays, dayKey, formatTime, startOfDayIso } from "@/lib/dates";
import { getEmotion } from "@/lib/emotions";
import { daySeries, levelShares, monthEnd, monthlyAverages, monthStart, moodByDay, moodFromEmotions, moodLevel, summary, yearGrid } from "@/lib/mood";
import { createClient } from "@/lib/supabase/server";
import { MoodChip } from "@/components/mood/MoodIcons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { MoodCharts, type MoodView } from "./MoodCharts";

export const metadata: Metadata = { title: "Tâm trạng của mình" };

// TRANG TÂM TRẠNG (Duy chọn 01/11, làm lại theo mẫu Duy gửi): nhóm tâm trạng 1–5 suy ra từ cảm xúc của mỗi lần check-in
// (lib/mood.ts). Ba tab: Theo ngày (lịch tháng có icon thời tiết), Theo năm (lưới ngày 1–31 × tháng T1–T12), Phân tích
// (Tuần / Tháng / Năm: đường có mặt cười ở trục + tỉ lệ tâm trạng). Chỉ học sinh thấy của chính mình (đọc qua RLS).

const TABS = { ngay: "Theo ngày", nam: "Theo năm", "phan-tich": "Phân tích" } as const;
type TabKey = keyof typeof TABS;
const PERIODS = { tuan: "Tuần", thang: "Tháng", nam: "Năm" } as const;
type PeriodKey = keyof typeof PERIODS;
const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const pad = (n: number) => String(n).padStart(2, "0");
const dm = (day: string) => `${Number(day.slice(8))}/${Number(day.slice(5, 7))}`;

export default async function MoodPage({ searchParams }: PageProps<"/tam-trang">) {
  const profile = await requireProfile();
  const params = await searchParams;
  const today = dayKey();
  const [ty, tm] = today.split("-").map(Number);
  const tab: TabKey = typeof params.xem === "string" && params.xem in TABS ? (params.xem as TabKey) : "ngay";
  const period: PeriodKey = typeof params.ky === "string" && params.ky in PERIODS ? (params.ky as PeriodKey) : "tuan";

  // tháng / năm đang xem (?thang=YYYY-MM, ?nam=YYYY), không xem tương lai
  const pm = typeof params.thang === "string" && /^\d{4}-\d{2}$/.test(params.thang) ? params.thang.split("-").map(Number) : [ty, tm];
  const [y, mo] = pm[0] * 12 + pm[1] > ty * 12 + tm ? [ty, tm] : pm;
  const year = typeof params.nam === "string" && /^\d{4}$/.test(params.nam) ? Math.min(Number(params.nam), ty) : ty;
  const base = tab === "phan-tich" ? `/tam-trang?xem=phan-tich&ky=${period}` : `/tam-trang?xem=${tab}`;
  const monthNav = () => {
    const p = mo === 1 ? [y - 1, 12] : [y, mo - 1];
    const n = mo === 12 ? [y + 1, 1] : [y, mo + 1];
    return {
      title: `Tháng ${mo}/${y}`,
      prev: `${base}&thang=${p[0]}-${pad(p[1])}`,
      next: n[0] * 12 + n[1] <= ty * 12 + tm ? `${base}&thang=${n[0]}-${pad(n[1])}` : null,
    };
  };
  const yearNav = () => ({ title: `Năm ${year}`, prev: `${base}&nam=${year - 1}`, next: year < ty ? `${base}&nam=${year + 1}` : null });
  const usesYear = tab === "nam" || (tab === "phan-tich" && period === "nam");
  const usesWeek = tab === "phan-tich" && period === "tuan";
  const nav = usesWeek ? { title: "7 ngày vừa qua", prev: null, next: null } : usesYear ? yearNav() : monthNav();
  const from = usesWeek ? addDays(today, -6) : usesYear ? `${year}-01-01` : monthStart(y, mo);
  const to = usesWeek ? today : usesYear ? `${year}-12-31` : monthEnd(y, mo);

  const supabase = await createClient();
  // lần ghi gần nhất hôm nay (nút check-in ở đầu trang; trang này là mục "Tâm trạng" trong menu)
  const todayMood = (await getMoodByDay(profile.id, today, today)).get(today) ?? null;
  const todayLevel = todayMood ? moodFromEmotions(todayMood.emotions) : null;
  const { data } = await supabase
    .from("checkins")
    .select("emotions, created_at")
    .eq("user_id", profile.id)
    .gte("created_at", startOfDayIso(from))
    .lt("created_at", startOfDayIso(addDays(to, 1)))
    .order("created_at");
  const byDay = moodByDay(
    (data ?? []).map((r) => ({ at: r.created_at as string, emotions: (r.emotions as string[]) ?? [] })),
    dayKey,
  );
  const points = daySeries(byDay, from, to).map((p) => (p.day > today ? { ...p, mood: null } : p));
  const moods = points.map((p) => p.mood).filter((m): m is number => m !== null);

  let view: MoodView;
  if (tab === "nam") view = { tab, year, grid: yearGrid(byDay, year), today };
  else if (tab === "ngay") view = { tab, points, today };
  else {
    const line =
      period === "nam"
        ? monthlyAverages(byDay, year).map((m) => ({
            key: `T${m.month}`,
            label: `T${m.month}`,
            mood: m.mood,
            text: m.mood === null ? `Tháng ${m.month}: chưa ghi` : `Tháng ${m.month}: trung bình ${moodLevel(m.mood).label} (${m.days} ngày)`,
          }))
        : points.map((p) => ({
            key: p.day,
            label: period === "tuan" ? `${WD[(new Date(`${p.day}T00:00:00Z`).getUTCDay() + 6) % 7]} ${dm(p.day)}` : dm(p.day),
            mood: p.day > today ? null : p.mood,
            text: p.mood === null ? `${dm(p.day)}: chưa ghi` : `${dm(p.day)}: ${moodLevel(p.mood).label}`,
          }));
    view = { tab, period, line, shares: levelShares(moods), summary: summary(points) };
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Tâm trạng của mình</h1>
      <p className="mt-1 text-muted">Mỗi cảm xúc bạn chọn khi check-in thuộc sẵn một nhóm, từ Rất tệ tới Tuyệt vời. Chỉ mình bạn thấy trang này.</p>

      {/* check-in ngay từ đây: chưa ghi hôm nay thì nút lớn; ghi rồi thì nhắc giờ và cho ghi lại */}
      {todayMood ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {todayLevel && <MoodChip level={todayLevel} size={32} />}
            <span>
              Hôm nay bạn đã ghi lúc <strong>{formatTime(todayMood.at)}</strong>:{" "}
              {todayMood.emotions
                .map((id) => getEmotion(id))
                .filter(Boolean)
                .map((e) => `${e!.emoji} ${e!.label}`)
                .join(" · ")}
            </span>
          </div>
          <Link href="/checkin" className={cn(btn.secondary, "px-4 text-sm")}>
            Ghi lại
          </Link>
        </div>
      ) : (
        <Link href="/checkin" className={cn(btn.cta, "mt-5 w-full justify-center py-4 text-base")}>
          Check-in hôm nay
        </Link>
      )}

      <nav aria-label="Cách xem" className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(TABS) as TabKey[]).map((k) => (
          <Link
            key={k}
            href={`/tam-trang?xem=${k}`}
            aria-current={k === tab ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              k === tab ? "border-transparent bg-[var(--mood-4)] text-[var(--mood-on-4)]" : "border-line bg-surface hover:bg-surface-2",
            )}
          >
            {TABS[k]}
          </Link>
        ))}
      </nav>
      {tab === "phan-tich" && (
        <nav aria-label="Khoảng phân tích" className="mt-3 flex gap-2">
          {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
            <Link
              key={k}
              href={`/tam-trang?xem=phan-tich&ky=${k}`}
              aria-current={k === period ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                k === period ? "border-transparent bg-[var(--mood-1)] text-[var(--mood-on-1)]" : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              {PERIODS[k]}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-5 flex items-center justify-center gap-4">
        {nav.prev ? (
          <Link href={nav.prev} className={btn.ghost} aria-label="Trước">
            ‹
          </Link>
        ) : (
          <span className="w-10" />
        )}
        <h2 className="min-w-32 text-center font-display text-xl font-bold tracking-tight">{nav.title}</h2>
        {nav.next ? (
          <Link href={nav.next} className={btn.ghost} aria-label="Sau">
            ›
          </Link>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <MoodCharts view={view} />
    </div>
  );
}
