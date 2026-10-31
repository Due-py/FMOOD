"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { MOOD_LEVELS, moodLevel, weekGrid, type DayPoint } from "@/lib/mood";

// Biểu đồ đường + heatmap mức tâm trạng 1–5 (trang /tam-trang). Một trục, đường 2px, điểm ≥ 8px, ô có khoảng hở 2px,
// màu theo thang hai phía tím ← xám → xanh (biến --mood-1…5, đã kiểm tra mù màu), luôn kèm số / chú thích / bảng.
// Điểm ước tính (check-in cũ chưa có mức): chấm rỗng, ô viền nét đứt.

export type MoodView = {
  kind: "week" | "month" | "year";
  today: string;
  points: DayPoint[];
  weeks: { from: string; to: string; mood: number | null; days: number }[];
  summary: { days: number; avg: number | null; estimated: boolean };
};

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const dm = (day: string) => `${Number(day.slice(8))}/${Number(day.slice(5, 7))}`;
const fill = (m: number) => `var(--mood-${Math.round(m)})`;
const ink = (m: number) => `var(--mood-on-${Math.round(m)})`;
const tip = (p: DayPoint) => (p.mood === null ? `${dm(p.day)}: chưa ghi` : `${dm(p.day)}: ${moodLevel(p.mood).emoji} mức ${p.mood} · ${moodLevel(p.mood).label}${p.estimated ? " (ước tính)" : ""}`);

export function MoodCharts({ view }: { view: MoodView }) {
  const { kind, points, weeks, summary, today } = view;
  // đường: 7 ngày / tháng theo ngày; năm theo trung bình tuần
  const line =
    kind === "year"
      ? weeks.map((w) => ({ key: w.from, label: dm(w.from), mood: w.mood, estimated: false, text: w.mood === null ? `Tuần ${dm(w.from)}: chưa ghi` : `Tuần ${dm(w.from)}–${dm(w.to)}: trung bình ${w.mood} (${w.days} ngày)` }))
      : points.filter((p) => p.day <= today).map((p) => ({ key: p.day, label: kind === "week" ? `${WD[(new Date(`${p.day}T00:00:00Z`).getUTCDay() + 6) % 7]} ${dm(p.day)}` : dm(p.day), mood: p.mood, estimated: p.estimated, text: tip(p) }));

  return (
    <div className="mt-4 w-full min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-sm text-muted">Số ngày đã ghi</p>
          <p className="font-display text-2xl font-extrabold tabular-nums">{summary.days}</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-sm text-muted">Mức trung bình</p>
          <p className="font-display text-2xl font-extrabold tabular-nums">
            {summary.avg === null ? "–" : `${moodLevel(summary.avg).emoji} ${summary.avg.toLocaleString("vi-VN")}`}
          </p>
        </div>
      </div>

      {summary.days === 0 ? (
        <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Chưa có lần check-in nào trong khoảng này.</p>
      ) : (
        <>
          <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-4">
            <h3 className="mb-2 font-semibold">{kind === "year" ? "Đường tâm trạng (trung bình mỗi tuần)" : "Đường tâm trạng"}</h3>
            <LineChart points={line} />
          </section>
          <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-4">
            <h3 className="mb-3 font-semibold">Heatmap</h3>
            {kind === "week" ? <WeekStrip points={points} /> : kind === "month" ? <MonthGrid points={points} today={today} /> : <YearGrid points={points} today={today} />}
          </section>
        </>
      )}

      <Legend estimated={summary.estimated} />

      {/* bảng cho người dùng trình đọc màn hình (bọc trong div: thẻ table tự giữ bề rộng, làm tràn trang) */}
      <div className="sr-only">
        <table>
          <caption>Mức tâm trạng theo ngày</caption>
          <tbody>
            {points
              .filter((p) => p.mood !== null)
              .map((p) => (
                <tr key={p.day}>
                  <td>{p.day}</td>
                  <td>{tip(p)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const H = 220;
const PAD = { l: 34, r: 12, t: 12, b: 28 };

function LineChart({ points }: { points: { key: string; label: string; mood: number | null; estimated: boolean; text: string }[] }) {
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
  // đoạn liền giữa các ngày có ghi; ngày không ghi làm đứt đường
  const segs: { i: number; m: number }[][] = [];
  let cur: { i: number; m: number }[] = [];
  points.forEach((p, i) => {
    if (p.mood === null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push({ i, m: p.mood });
  });
  if (cur.length) segs.push(cur);
  // nhãn ngày: thưa dần theo bề rộng (khoảng 56px mỗi nhãn)
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - PAD.l - PAD.r) / 56))));
  const h = hover !== null ? points[hover] : null;

  return (
    <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Biểu đồ đường mức tâm trạng">
        {MOOD_LEVELS.map((l) => (
          <g key={l.value}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(l.value)} y2={y(l.value)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(l.value) + 5} textAnchor="end" fontSize={14}>
              {l.emoji}
            </text>
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
          <polyline key={k} points={s.map((p) => `${x(p.i)},${y(p.m)}`).join(" ")} fill="none" stroke="var(--brand-display)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) =>
          p.mood === null ? null : (
            <circle
              key={p.key}
              cx={x(i)}
              cy={y(p.mood)}
              r={hover === i ? 6 : 4.5}
              fill={p.estimated ? "var(--surface)" : fill(p.mood)}
              stroke={p.estimated ? fill(p.mood) : "var(--surface)"}
              strokeWidth={2}
            />
          ),
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
          style={{ left: `${(x(hover!) / W) * 100}%` }}
        >
          {h.text}
        </div>
      )}
    </div>
  );
}

function Cell({ p, size, label }: { p: DayPoint | null; size: string; label?: string }) {
  if (!p) return <span className={size} aria-hidden />;
  const has = p.mood !== null;
  return (
    <span
      title={tip(p)}
      aria-label={tip(p)}
      className={cn(size, "flex items-center justify-center rounded-md text-[11px] font-semibold tabular-nums", !has && "bg-surface-2", p.estimated && "border-2 border-dashed border-ink/40")}
      style={has ? { background: fill(p.mood!), color: ink(p.mood!) } : undefined}
    >
      {label}
    </span>
  );
}

function WeekStrip({ points }: { points: DayPoint[] }) {
  return (
    <div className="grid grid-cols-7 gap-0.5">
      {points.map((p) => (
        <div key={p.day} className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted">{WD[(new Date(`${p.day}T00:00:00Z`).getUTCDay() + 6) % 7]}</span>
          <Cell p={p} size="h-12 w-full" label={p.mood === null ? "–" : `${moodLevel(p.mood).emoji}`} />
          <span className="text-[11px] text-muted tabular-nums">{dm(p.day)}</span>
        </div>
      ))}
    </div>
  );
}

function MonthGrid({ points, today }: { points: DayPoint[]; today: string }) {
  const cols = weekGrid(points);
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-xs text-muted">
        {WD.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="space-y-0.5">
        {cols.map((week, r) => (
          <div key={r} className="grid grid-cols-7 gap-0.5">
            {week.map((p, c) => (
              <Cell key={c} p={p && p.day <= today ? p : p ? { ...p, mood: null } : null} size="aspect-square w-full" label={p ? String(Number(p.day.slice(8))) : ""} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function YearGrid({ points, today }: { points: DayPoint[]; today: string }) {
  const cols = weekGrid(points);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex gap-0.5">
        <div className="mr-1 flex flex-col gap-0.5 pt-4 text-[11px] leading-3 text-muted">
          {WD.map((d, i) => (
            <span key={d} className="h-3">
              {i % 2 === 0 ? d : ""}
            </span>
          ))}
        </div>
        {cols.map((week, k) => {
          const first = week.find((p) => p && p.day.endsWith("-01")) ?? null;
          return (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="h-4 whitespace-nowrap text-[11px] leading-3 text-muted">{first ? `Th${Number(first.day.slice(5, 7))}` : ""}</span>
              {week.map((p, r) => (
                <Cell key={r} p={p && p.day <= today ? p : p ? { ...p, mood: null } : null} size="h-3 w-3 rounded-[3px]" />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ estimated }: { estimated: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {MOOD_LEVELS.map((l) => (
        <span key={l.value} className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-[4px]" style={{ background: fill(l.value) }} aria-hidden />
          {l.value} {l.emoji} {l.label}
        </span>
      ))}
      {estimated && <span className="text-muted">Viền nét đứt / chấm rỗng: ước tính từ cảm xúc (check-in trước khi có mức 1–5)</span>}
    </div>
  );
}
