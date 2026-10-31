// Biểu đồ của trang Tổng quan app: SVG và CSS thuần theo kiểu WeekChart / trang Kết quả (không thêm thư viện).
// Vẽ ở máy chủ, không cần JavaScript trên trình duyệt; mỗi biểu đồ có số liệu đi kèm bằng chữ.
import { GROUP_COLOR, GROUP_LABEL } from "@/lib/emotions";
import type { MoodCounts } from "@/lib/dashboard-calc";
import { cn } from "@/components/ui/cn";

const dm = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`;

/** Nhãn ngày dưới trục: khoảng dài thì chỉ hiện vài nhãn để không chồng chữ. */
function DayAxis({ days }: { days: string[] }) {
  const every = Math.max(1, Math.ceil(days.length / 8));
  return (
    <div className="mt-1.5 flex gap-1">
      {days.map((d, i) => (
        <span key={d} className="flex-1 text-center text-[10px] text-muted sm:text-[11px]">
          {i % every === 0 || i === days.length - 1 ? dm(d) : ""}
        </span>
      ))}
    </div>
  );
}

/** Cột theo ngày (null = ẩn vì dưới 5 bạn). */
export function DayBars({ data, color = "var(--series-pos)", unit }: { data: { day: string; value: number | null }[]; color?: string; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  return (
    <div>
      <div className="flex h-36 items-end gap-1 border-b border-line">
        {data.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${dm(d.day)}: ${d.value ?? "ẩn (dưới 5 bạn)"} ${unit}`}>
            {d.value == null ? (
              <span className="text-center text-[10px] text-muted">ẩn</span>
            ) : (
              <>
                {data.length <= 14 && d.value > 0 && <span className="mb-0.5 text-center text-[11px] font-semibold tabular-nums">{d.value}</span>}
                <div className="rounded-t" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0, background: color }} />
              </>
            )}
          </div>
        ))}
      </div>
      <DayAxis days={data.map((d) => d.day)} />
    </div>
  );
}

/** Đường nhỏ cho một chỉ số theo ngày, kèm tổng. */
export function Spark({ label, values, total, color }: { label: string; values: number[]; total: number; color: string }) {
  const w = 100;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 2) - 1).toFixed(2)}`);
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight">{total}</p>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 h-10 w-full" aria-hidden>
        {values.length > 1 && (
          <>
            <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={color} opacity={0.15} />
            <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}

const MOOD_KEYS = ["positive", "neutral", "negative", "unsure"] as const;
const MOOD_COLOR: Record<(typeof MOOD_KEYS)[number], string> = { ...GROUP_COLOR, unsure: "var(--muted)" };
export const MOOD_LABEL: Record<(typeof MOOD_KEYS)[number], string> = { ...GROUP_LABEL, unsure: "Chưa rõ" };

/** Cột chồng 100% theo ngày: tỉ lệ tích cực / trung tính / nặng lòng / chưa rõ. */
export function MoodBars({ data }: { data: { day: string; counts: MoodCounts | null }[] }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {MOOD_KEYS.map((k) => (
          <li key={k} className="flex items-center gap-1.5 text-muted">
            <span className={cn("size-2.5 rounded-sm", k === "unsure" && "opacity-50")} style={{ background: MOOD_COLOR[k] }} />
            {MOOD_LABEL[k]}
          </li>
        ))}
      </ul>
      <div className="flex h-36 items-stretch gap-1 border-b border-line">
        {data.map((d) => {
          const c = d.counts;
          const title = c ? `${dm(d.day)}: ${MOOD_KEYS.map((k) => `${MOOD_LABEL[k]} ${c[k]}`).join(", ")}` : `${dm(d.day)}: ẩn (dưới 5 bạn)`;
          return (
            <div key={d.day} className="flex flex-1 flex-col-reverse overflow-hidden rounded-t" title={title}>
              {!c ? (
                <span className="m-auto text-[10px] text-muted">ẩn</span>
              ) : c.total === 0 ? null : (
                MOOD_KEYS.filter((k) => c[k] > 0).map((k) => (
                  <span key={k} className={cn(k === "unsure" && "opacity-50")} style={{ flexGrow: c[k], flexBasis: 0, background: MOOD_COLOR[k] }} />
                ))
              )}
            </div>
          );
        })}
      </div>
      <DayAxis days={data.map((d) => d.day)} />
    </div>
  );
}

/** Thanh ngang có nhãn và số (nguồn trò chuyện, chủ đề…). */
export function HBars({ items, color = "var(--series-pos)", empty = "Chưa có dữ liệu." }: { items: { label: string; value: number; note?: string }[]; color?: string; empty?: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{i.label}</span>
            <span className="shrink-0 tabular-nums font-semibold">
              {i.value}
              {i.note && <span className="ml-1 font-normal text-muted">{i.note}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full" style={{ width: `${(i.value / max) * 100}%`, minWidth: i.value > 0 ? 4 : 0, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Bản đồ nhiệt thứ × giờ (giờ Việt Nam). Ô càng đậm càng nhiều lượt dùng. */
export function Heatmap({ grid, max }: { grid: number[][]; max: number }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[2rem_repeat(24,minmax(0,1fr))] gap-0.5">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-[10px] text-muted">
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="pr-1 text-right text-[11px] font-medium leading-5 text-muted">{WEEKDAYS[d]}</span>
              {row.map((n, h) => (
                <span
                  key={h}
                  title={`${WEEKDAYS[d]} ${h}h: ${n} lượt`}
                  className="h-5 rounded-[3px] bg-surface-2"
                  style={n > 0 ? { background: "var(--series-pos)", opacity: 0.15 + 0.85 * (n / Math.max(1, max)) } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
