import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { daySeries, monthEnd, monthStart, moodByDay, summary, weeklyAverages } from "@/lib/mood";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { MoodCharts, type MoodView } from "./MoodCharts";

export const metadata: Metadata = { title: "Tâm trạng của mình" };

// TRANG TÂM TRẠNG (Duy chọn 01/11): biểu đồ đường + heatmap theo mức 1–5 của check-in, cho 7 ngày, một tháng, một năm.
// Chỉ học sinh thấy của chính mình (đọc qua RLS). Mỗi ngày tính lần ghi gần nhất; check-in cũ chưa có mức thì ước tính (lib/mood.ts).

const VIEWS = { "7-ngay": "7 ngày", thang: "Tháng", nam: "Năm" } as const;
type ViewKey = keyof typeof VIEWS;
const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

export default async function MoodPage({ searchParams }: PageProps<"/tam-trang">) {
  const profile = await requireProfile();
  const params = await searchParams;
  const today = dayKey();
  const [ty, tm] = today.split("-").map(Number);
  const view: ViewKey = typeof params.xem === "string" && params.xem in VIEWS ? (params.xem as ViewKey) : "7-ngay";

  // khoảng ngày theo cách xem; tháng / năm chọn bằng ?thang=YYYY-MM, ?nam=YYYY (không xem tương lai)
  let from: string;
  let to: string;
  let title: string;
  let prev: string | null = null;
  let next: string | null = null;
  if (view === "thang") {
    const m = typeof params.thang === "string" && /^\d{4}-\d{2}$/.test(params.thang) ? params.thang.split("-").map(Number) : [ty, tm];
    const [y, mo] = m[0] * 12 + m[1] > ty * 12 + tm ? [ty, tm] : m;
    from = monthStart(y, mo);
    to = monthEnd(y, mo);
    title = `${MONTHS[mo - 1]}/${y}`;
    const p = mo === 1 ? [y - 1, 12] : [y, mo - 1];
    const n = mo === 12 ? [y + 1, 1] : [y, mo + 1];
    prev = `/tam-trang?xem=thang&thang=${p[0]}-${String(p[1]).padStart(2, "0")}`;
    next = n[0] * 12 + n[1] <= ty * 12 + tm ? `/tam-trang?xem=thang&thang=${n[0]}-${String(n[1]).padStart(2, "0")}` : null;
  } else if (view === "nam") {
    const y = typeof params.nam === "string" && /^\d{4}$/.test(params.nam) ? Math.min(Number(params.nam), ty) : ty;
    from = `${y}-01-01`;
    to = `${y}-12-31`;
    title = `Năm ${y}`;
    prev = `/tam-trang?xem=nam&nam=${y - 1}`;
    next = y < ty ? `/tam-trang?xem=nam&nam=${y + 1}` : null;
  } else {
    from = addDays(today, -6);
    to = today;
    title = "7 ngày vừa qua";
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", profile.id)
    .gte("created_at", startOfDayIso(from))
    .lt("created_at", startOfDayIso(addDays(to, 1)))
    .order("created_at");
  const byDay = moodByDay(
    (data ?? []).map((r) => ({ at: r.created_at as string, mood: (r.mood as number | null) ?? null, emotions: (r.emotions as string[]) ?? [] })),
    dayKey,
  );
  const points = daySeries(byDay, from, to);
  const shown = points.filter((p) => p.day <= today);
  const payload: MoodView = {
    kind: view === "nam" ? "year" : view === "thang" ? "month" : "week",
    today,
    points,
    weeks: view === "nam" ? weeklyAverages(points).map((w) => ({ ...w, mood: w.from > today ? null : w.mood })) : [],
    summary: summary(shown),
  };

  return (
    <div>
      <Link href="/me" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Trang của tôi
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Tâm trạng của mình</h1>
      <p className="mt-1 text-muted">Theo mức 1–5 bạn chọn mỗi lần check-in. Chỉ mình bạn thấy trang này.</p>

      <nav aria-label="Cách xem" className="mt-5 flex gap-2">
        {(Object.keys(VIEWS) as ViewKey[]).map((k) => (
          <Link
            key={k}
            href={`/tam-trang?xem=${k}`}
            aria-current={k === view ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              k === view ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:bg-surface-2",
            )}
          >
            {VIEWS[k]}
          </Link>
        ))}
      </nav>

      <div className="mt-5 flex items-center justify-between gap-2">
        {prev ? (
          <Link href={prev} className={btn.ghost} aria-label="Trước">
            ‹
          </Link>
        ) : (
          <span />
        )}
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
        {next ? (
          <Link href={next} className={btn.ghost} aria-label="Sau">
            ›
          </Link>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <MoodCharts view={payload} />
    </div>
  );
}
