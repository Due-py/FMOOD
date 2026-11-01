"use client";

import { useEffect, useRef, useState } from "react";
import { MoodChip, MoodFace, WeatherIcon } from "@/components/mood/MoodIcons";
import { cn } from "@/components/ui/cn";
import { MOOD_LEVELS, moodLevel, weekGrid, type DayPoint, type MoodValue } from "@/lib/mood";

// Biểu đồ trang Tâm trạng theo mẫu Duy gửi (01/11): lịch tháng có icon thời tiết, lưới cả năm (ngày 1–31 × T1–T12),
// đường có mặt cười ở trục + tỉ lệ tâm trạng. Màu nhóm --mood-1…5 (đã kiểm tra mù màu); ô / điểm luôn kèm icon, chú thích
// hoặc chữ khi rê chuột, và có bảng ẩn cho trình đọc màn hình.

type LinePoint = { key: string; label: string; mood: number | null; text: string };
export type MoodView =
  | { tab: "ngay"; points: DayPoint[]; today: string }
  | { tab: "nam"; year: number; grid: (number | null | undefined)[][]; today: string }
  | {
      tab: "phan-tich";
      period: "tuan" | "thang" | "nam";
      line: LinePoint[];
      shares: { level: MoodValue; days: number; percent: number }[];
      summary: { days: number; avg: number | null };
    };

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const fill = (m: number) => `var(--mood-${Math.round(m)})`;
const tint = (m: number) => `color-mix(in srgb, var(--mood-${Math.round(m)}) 18%, var(--surface))`;

export function MoodCharts({ view }: { view: MoodView }) {
  return (
    <div className="mt-3 w-full min-w-0 space-y-3">
      {view.tab === "ngay" && <MonthCalendar points={view.points} today={view.today} />}
      {view.tab === "nam" && <YearGrid grid={view.grid} year={view.year} today={view.today} />}
      {view.tab === "phan-tich" && <Analysis view={view} />}
    </div>
  );
}

// ───────── Theo ngày: lịch tháng ─────────
function MonthCalendar({ points, today }: { points: DayPoint[]; today: string }) {
  const rows = weekGrid(points);
  const recorded = points.filter((p) => p.mood !== null);
  return (
    <>
      {/* ô cao cố định (không vuông) để cả tháng, kể cả tháng 6 hàng, vừa một màn hình máy tính */}
      <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-2 sm:p-3">
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
          {WD.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="space-y-1">
          {rows.map((week, r) => (
            <div key={r} className="grid grid-cols-7 gap-1">
              {week.map((p, c) =>
                p ? (
                  <div
                    key={c}
                    title={p.mood === null ? undefined : `${Number(p.day.slice(8))}: ${moodLevel(p.mood).label}`}
                    className={cn(
                      "relative flex h-12 flex-col items-center justify-center rounded-lg sm:h-14 lg:h-16",
                      p.mood === null && "bg-surface-2",
                      p.day > today && "opacity-40",
                      p.day === today && "ring-2 ring-ink/30",
                    )}
                    style={p.mood === null ? undefined : { background: tint(p.mood) }}
                  >
                    <span className="absolute left-1.5 top-0.5 text-[10px] font-semibold tabular-nums text-muted">{Number(p.day.slice(8))}</span>
                    {p.mood !== null && <WeatherIcon level={p.mood} size={22} className="mt-2" />}
                  </div>
                ) : (
                  <span key={c} />
                ),
              )}
            </div>
          ))}
        </div>
      </section>
      <Legend />
      <ScreenReaderTable rows={recorded.map((p) => [p.day, moodLevel(p.mood!).label])} />
    </>
  );
}

// ───────── Theo năm: hàng ngày 1–31, cột tháng ─────────
function YearGrid({ grid, year, today }: { grid: (number | null | undefined)[][]; year: number; today: string }) {
  const rows: [string, string][] = [];
  grid.forEach((row, d) => row.forEach((v, m) => typeof v === "number" && rows.push([`${d + 1}/${m + 1}/${year}`, moodLevel(v).label])));
  const [ty, tm, td] = today.split("-").map(Number);
  const future = (d: number, m: number) => year > ty || (year === ty && (m + 1 > tm || (m + 1 === tm && d + 1 > td)));
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-5">
      <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-3 sm:p-4 lg:w-[26rem] lg:flex-none">
        <div className="grid grid-cols-[1.5rem_repeat(12,minmax(0,1fr))] gap-[3px] text-center md:gap-[2px]">
          <span />
          {Array.from({ length: 12 }, (_, m) => (
            <span key={m} className="text-[10px] font-semibold text-muted">
              T{m + 1}
            </span>
          ))}
          {grid.map((row, d) => (
            <YearRow key={d} day={d} row={row} future={future} />
          ))}
        </div>
      </section>
      <Legend vertical />
      <ScreenReaderTable rows={rows} />
    </div>
  );
}

function YearRow({ day, row, future }: { day: number; row: (number | null | undefined)[]; future: (d: number, m: number) => boolean }) {
  return (
    <>
      <span className="text-right text-[10px] leading-4 text-muted tabular-nums md:leading-3">{day + 1}</span>
      {row.map((v, m) =>
        v === undefined ? (
          <span key={m} />
        ) : (
          <span
            key={m}
            title={v === null ? undefined : `${day + 1}/${m + 1}: ${moodLevel(v).label}`}
            className={cn("h-4 rounded-[3px] md:h-3", v === null && "bg-surface-2", v === null && future(day, m) && "opacity-40")}
            style={v === null ? undefined : { background: fill(v) }}
          />
        ),
      )}
    </>
  );
}

// ───────── Phân tích: đường + tỉ lệ ─────────
function Analysis({ view }: { view: Extract<MoodView, { tab: "phan-tich" }> }) {
  const { line, shares, summary } = view;
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(9.5rem,100%),1fr))] gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-2xl bg-surface-2 px-4 py-2">
          <p className="text-sm text-muted">Số ngày đã ghi</p>
          <p className="font-display text-xl font-extrabold tabular-nums">{summary.days}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-2xl bg-surface-2 px-4 py-2">
          <p className="text-sm text-muted">Trung bình</p>
          {summary.avg === null ? <p className="font-display text-xl font-extrabold">–</p> : <MoodChip level={summary.avg} size={28} label />}
        </div>
      </div>
      {summary.days === 0 ? (
        <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Chưa có lần check-in nào trong khoảng này.</p>
      ) : (
        <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-3 sm:p-4">
          <h3 className="mb-1 text-sm font-semibold">{view.period === "nam" ? "Tâm trạng theo tháng (trung bình)" : "Tâm trạng theo ngày"}</h3>
          <LineChart points={line} />
          <h3 className="mb-2 mt-3 text-sm font-semibold">Tỉ lệ tâm trạng</h3>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={shares.map((s) => `${moodLevel(s.level).label} ${s.percent}%`).join(", ")}>
            {shares.map((s) => (
              <span key={s.level} style={{ flexGrow: s.percent, background: fill(s.level) }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {shares.map((s) => (
              <li key={s.level} className="flex items-center gap-2">
                <MoodChip level={s.level} size={28} />
                <span className="font-display text-base font-extrabold tabular-nums">{s.percent}%</span>
                <span className="text-xs text-muted">{moodLevel(s.level).label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ScreenReaderTable rows={line.filter((p) => p.mood !== null).map((p) => [p.label, p.text])} />
    </>
  );
}

const H = 190;
const PAD = { l: 40, r: 14, t: 14, b: 30 };

function LineChart({ points }: { points: LinePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // vẽ theo đúng bề rộng khung (không co giãn chữ): đo khung, đổi kích thước thì vẽ lại
  const [W, setW] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = points.length;
  const x = (i: number) => PAD.l + (n <= 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (n - 1));
  const y = (m: number) => PAD.t + ((5 - m) * (H - PAD.t - PAD.b)) / 4;
  // đoạn liền giữa các điểm có ghi; điểm không ghi làm đứt đường
  const segs: { i: number; m: number }[][] = [];
  let cur: { i: number; m: number }[] = [];
  points.forEach((p, i) => {
    if (p.mood === null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push({ i, m: p.mood });
  });
  if (cur.length) segs.push(cur);
  // nhãn trục ngang thưa dần theo bề rộng (khoảng 52px mỗi nhãn)
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - PAD.l - PAD.r) / 52))));
  const h = hover !== null ? points[hover] : null;
  return (
    <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Biểu đồ đường tâm trạng">
        {MOOD_LEVELS.map((l) => (
          <g key={l.value}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(l.value)} y2={y(l.value)} stroke="var(--line)" strokeWidth={1} />
            <foreignObject x={4} y={y(l.value) - 12} width={24} height={24}>
              <MoodFace level={l.value} size={24} />
            </foreignObject>
          </g>
        ))}
        {points.map((p, i) =>
          (i % every === 0 && n - 1 - i >= every / 2) || i === n - 1 ? (
            <text key={p.key} x={x(i)} y={H - 8} textAnchor={i === n - 1 && n > 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
              {p.label}
            </text>
          ) : null,
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={1} />}
        {segs.map((s, k) => (
          <polyline key={k} points={s.map((p) => `${x(p.i)},${y(p.m)}`).join(" ")} fill="none" stroke="var(--muted)" strokeOpacity={0.7} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) =>
          p.mood === null ? null : <circle key={p.key} cx={x(i)} cy={y(p.mood)} r={hover === i ? 6.5 : 5} fill={fill(p.mood)} stroke="var(--surface)" strokeWidth={2} />,
        )}
        {/* vùng bắt chuột rộng hơn điểm */}
        {points.map((p, i) => (
          <rect
            key={p.key}
            x={x(i) - (W - PAD.l - PAD.r) / Math.max(1, n) / 2}
            y={0}
            width={(W - PAD.l - PAD.r) / Math.max(1, n)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-1.5 text-xs shadow-lg"
          style={{ left: `${Math.min(85, Math.max(15, (x(hover!) / W) * 100))}%` }}
        >
          {h.text}
        </div>
      )}
    </div>
  );
}

// ───────── chú thích, bảng ẩn ─────────
function Legend({ vertical = false }: { vertical?: boolean }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2", vertical && "lg:flex-col lg:gap-3")}>
      {[...MOOD_LEVELS].reverse().map((l) => (
        <li key={l.value}>
          <MoodChip level={l.value} size={28} label className="text-sm" />
        </li>
      ))}
    </ul>
  );
}

function ScreenReaderTable({ rows }: { rows: [string, string][] }) {
  // bọc trong div: thẻ table tự giữ bề rộng, làm tràn trang
  return (
    <div className="sr-only">
      <table>
        <caption>Tâm trạng theo ngày</caption>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
