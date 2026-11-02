import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { moodLevel } from "@/lib/mood";
import { WeatherIcon } from "@/components/mood/MoodIcons";
import { cn } from "@/components/ui/cn";
import { JourneySection } from "./JourneySection";

export type SelfTrack = {
  /** 7 ngày gần nhất, cũ trước: nhóm tâm trạng 1–5 hoặc null nếu ngày đó chưa check-in */
  week: { day: string; mood: number | null }[];
  habits: { done: number; total: number };
  garden: { earned: number; stage: { emoji: string; label: string } | null };
  journal: { count: number; lastAt: string | null };
};

const tile =
  "relative flex h-full min-h-[7.75rem] flex-col rounded-3xl bg-tint p-3 transition duration-200 hover:-translate-y-0.5 hover:-rotate-[0.6deg] motion-reduce:transition-none motion-reduce:hover:transform-none sm:min-h-[8.5rem] sm:p-3.5";
const big = "mt-2 font-display text-[1.65rem] font-extrabold leading-tight sm:text-[1.9rem]";
const unit = "text-lg font-bold text-muted";
const foot = "mt-auto pt-1 text-[13px] leading-snug text-muted";

/** Nhãn ô: biểu tượng trong ô trắng nhỏ + tên tab; mũi tên tròn ở góc phải. */
function Label({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <>
      <span className="flex items-center gap-1.5 pr-7 text-sm font-bold text-tink">
        <span aria-hidden className="grid size-[1.875rem] shrink-0 place-items-center rounded-[0.7rem] bg-surface text-base">
          {emoji}
        </span>
        {children}
      </span>
      <span aria-hidden className="absolute right-3 top-3 grid size-[1.625rem] place-items-center rounded-full bg-surface text-[13px] font-bold text-tink">
        →
      </span>
    </>
  );
}

/**
 * Tự theo dõi: bốn ô, mỗi ô tóm tắt một tab (Tâm trạng, Thói quen, Khu vườn, Nhật ký); bấm ô là mở tab đó.
 * Nối phần Tổng quan với bốn tab bên dưới hàng tab. Chỉ là số liệu của chính bạn.
 * Giao diện vui: mỗi ô một màu pastel (tone-1…5), số to kiểu chữ tròn, hàng thời tiết 7 ngày trong dải trắng.
 */
export function SelfTrackTiles({ data }: { data: SelfTrack }) {
  const days = data.week.filter((d) => d.mood !== null).length;
  return (
    <JourneySection id="tu-theo-doi" emoji="🔭" title="Tự theo dõi">
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <li className="tone-3">
          <Link href="/tam-trang" className={tile}>
            <Label emoji="🌤️">Tâm trạng</Label>
            <span
              className="mt-2.5 flex items-center justify-between rounded-2xl bg-surface px-1.5 py-1"
              aria-label={`7 ngày qua: ${days} ngày có check-in`}
            >
              {data.week.map((d) =>
                d.mood === null ? (
                  <span key={d.day} title={`${formatDate(d.day)}: chưa ghi`} className="flex size-5 items-center justify-center">
                    <span className="size-1.5 rounded-full bg-line" />
                  </span>
                ) : (
                  <span key={d.day} title={`${formatDate(d.day)}: ${moodLevel(d.mood).label}`} className="flex size-5 items-center justify-center">
                    <WeatherIcon level={d.mood} size={18} />
                  </span>
                ),
              )}
            </span>
            <span className={foot}>
              <b className="font-semibold text-ink">{days}/7</b> ngày đã ghi
            </span>
          </Link>
        </li>
        <li className="tone-2">
          <Link href="/habits" className={tile}>
            <Label emoji="✅">Thói quen</Label>
            {data.habits.total > 0 ? (
              <>
                <span className={big}>
                  {data.habits.done} <span className={unit}>/ {data.habits.total}</span>
                </span>
                <span className={foot}>việc hôm nay</span>
              </>
            ) : (
              <span className={cn(foot, "pt-3")}>Chưa có thói quen nào. Thêm một việc nhỏ nhé.</span>
            )}
          </Link>
        </li>
        <li className="tone-5">
          <Link href="/garden" className={tile}>
            <Label emoji="🌻">Khu vườn</Label>
            <span className={big}>
              {data.garden.earned} <span className={unit}>giọt</span>
            </span>
            <span className={foot}>
              {data.garden.stage ? (
                <>
                  <span aria-hidden>{data.garden.stage.emoji}</span> <b className="font-semibold text-ink">{data.garden.stage.label}</b>
                </>
              ) : (
                "nước đã tưới cây"
              )}
            </span>
          </Link>
        </li>
        <li className="tone-1">
          <Link href="/nhat-ky" className={tile}>
            <Label emoji="📓">Nhật ký</Label>
            {data.journal.count > 0 ? (
              <>
                <span className={big}>
                  {data.journal.count} <span className={unit}>trang</span>
                </span>
                {data.journal.lastAt && <span className={foot}>gần nhất {formatDate(data.journal.lastAt)}</span>}
              </>
            ) : (
              <span className={cn(foot, "pt-3")}>Chưa viết trang nào. Vài dòng thôi cũng được.</span>
            )}
          </Link>
        </li>
      </ul>
    </JourneySection>
  );
}
