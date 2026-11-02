import Link from "next/link";
import { addDays } from "@/lib/dates";
import { dominantEmotion, getEmotion } from "@/lib/emotions";
import type { DayMood } from "@/lib/checkins";
import { ArrowLeft } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

const WEEK_HEADER = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Lịch tháng: mỗi ngày tô màu theo cảm xúc xuất hiện nhiều nhất. Giao diện vui: ô bo 14px, hôm nay viền nghệ, ngày tới nét đứt. */
export function MoodCalendar({
  month,
  today,
  moods,
}: {
  /** "YYYY-MM" */
  month: string;
  today: string;
  moods: Map<string, DayMood>;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // thứ của ngày 1 (thứ Hai = 0)
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const isCurrent = month === today.slice(0, 7);

  // các cảm xúc nổi bật trong tháng (để làm chú thích)
  const tally = new Map<string, number>();
  for (const mood of moods.values()) for (const id of mood.emotions) tally.set(id, (tally.get(id) ?? 0) + 1);
  const top = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="mx-auto mt-4 max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/me?thang=${prev}`} className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-strong transition hover:brightness-95 dark:text-brand" aria-label="Tháng trước">
          <ArrowLeft size={18} />
        </Link>
        <p className="font-display text-xl font-extrabold tracking-tight">
          Tháng {m}/{y}
        </p>
        {isCurrent ? (
          <span className="size-11" />
        ) : (
          <Link
            href={`/me?thang=${next}`}
            className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-strong transition hover:brightness-95 dark:text-brand rotate-180"
            aria-label="Tháng sau"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEK_HEADER.map((d) => (
          <span key={d} className="pb-0.5 text-[11px] font-bold text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = addDays(first, i);
          const mood = moods.get(day);
          const emotion = mood ? dominantEmotion(mood.emotions) : undefined;
          const future = day > today;
          return (
            <div
              key={day}
              title={emotion ? `${i + 1}/${m}: ${emotion.label} (${mood!.count} lần check-in)` : undefined}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-[0.875rem] text-[11px] leading-tight",
                !emotion && !future && "bg-surface-2",
                future && "border-2 border-dashed border-line opacity-50",
                day === today && "ring-[3px] ring-brand-edge",
              )}
              style={emotion ? { backgroundColor: `${emotion.color}38` } : undefined}
            >
              <span className={cn("font-semibold", emotion ? "text-ink" : "text-muted")}>{i + 1}</span>
              {emotion && (
                <span className="mt-px text-sm leading-none sm:text-[17px]" aria-label={emotion.label}>
                  {emotion.emoji}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {top.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] text-muted">Cảm xúc bạn chọn nhiều nhất tháng này</p>
          <ul className="flex flex-wrap gap-2">
            {top.map(([id, n]) => {
              const e = getEmotion(id);
              if (!e) return null;
              return (
                <li key={id} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ backgroundColor: `${e.color}30` }}>
                  {e.emoji} {e.label} <span className="font-extrabold">×{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
