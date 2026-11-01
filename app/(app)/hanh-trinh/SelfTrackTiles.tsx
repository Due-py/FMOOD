import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { moodLevel } from "@/lib/mood";
import { WeatherIcon } from "@/components/mood/MoodIcons";
import { Section } from "@/components/Section";

export type SelfTrack = {
  /** 7 ngày gần nhất, cũ trước: nhóm tâm trạng 1–5 hoặc null nếu ngày đó chưa check-in */
  week: { day: string; mood: number | null }[];
  habits: { done: number; total: number };
  garden: { earned: number; stage: { emoji: string; label: string } | null };
  journal: { count: number; lastAt: string | null };
};

const tile = "flex min-h-28 flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:bg-surface-2";

/**
 * Tự theo dõi: bốn ô, mỗi ô tóm tắt một tab (Tâm trạng, Thói quen, Khu vườn, Nhật ký); bấm ô là mở tab đó.
 * Nối phần Tổng quan với bốn tab bên dưới hàng tab. Chỉ là số liệu của chính bạn.
 */
export function SelfTrackTiles({ data }: { data: SelfTrack }) {
  const days = data.week.filter((d) => d.mood !== null).length;
  return (
    <Section id="tu-theo-doi" title="Tự theo dõi">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <li>
          <Link href="/tam-trang" className={tile}>
            <span className="text-sm font-semibold text-muted">Tâm trạng</span>
            <span className="mt-2 flex items-center gap-0.5" aria-label={`7 ngày qua: ${days} ngày có check-in`}>
              {data.week.map((d) =>
                d.mood === null ? (
                  <span key={d.day} title={`${formatDate(d.day)}: chưa ghi`} className="flex size-5 items-center justify-center">
                    <span className="size-1.5 rounded-full bg-line" />
                  </span>
                ) : (
                  <span key={d.day} title={`${formatDate(d.day)}: ${moodLevel(d.mood).label}`}>
                    <WeatherIcon level={d.mood} size={20} />
                  </span>
                ),
              )}
            </span>
            <span className="mt-auto pt-2 text-sm text-muted">{days}/7 ngày đã ghi</span>
          </Link>
        </li>
        <li>
          <Link href="/habits" className={tile}>
            <span className="text-sm font-semibold text-muted">Thói quen</span>
            {data.habits.total > 0 ? (
              <>
                <span className="mt-1 font-display text-2xl font-extrabold">
                  {data.habits.done} / {data.habits.total}
                </span>
                <span className="mt-auto text-sm text-muted">việc hôm nay</span>
              </>
            ) : (
              <span className="mt-auto text-sm text-muted">Chưa có thói quen nào. Thêm một việc nhỏ nhé.</span>
            )}
          </Link>
        </li>
        <li>
          <Link href="/garden" className={tile}>
            <span className="text-sm font-semibold text-muted">Khu vườn</span>
            <span className="mt-1 font-display text-2xl font-extrabold">{data.garden.earned} giọt</span>
            <span className="mt-auto text-sm text-muted">
              {data.garden.stage ? (
                <>
                  <span aria-hidden>{data.garden.stage.emoji}</span> {data.garden.stage.label}
                </>
              ) : (
                "nước đã tưới cây"
              )}
            </span>
          </Link>
        </li>
        <li>
          <Link href="/nhat-ky" className={tile}>
            <span className="text-sm font-semibold text-muted">Nhật ký</span>
            {data.journal.count > 0 ? (
              <>
                <span className="mt-1 font-display text-2xl font-extrabold">{data.journal.count} trang</span>
                {data.journal.lastAt && <span className="mt-auto text-sm text-muted">gần nhất {formatDate(data.journal.lastAt)}</span>}
              </>
            ) : (
              <span className="mt-auto text-sm text-muted">Chưa viết trang nào. Vài dòng thôi cũng được.</span>
            )}
          </Link>
        </li>
      </ul>
    </Section>
  );
}
