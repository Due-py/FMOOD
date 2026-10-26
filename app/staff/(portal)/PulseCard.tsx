import Link from "next/link";
import type { ClassPulse } from "@/lib/class-pulse";
import { GROUP_COLOR, GROUP_LABEL, type EmotionGroup } from "@/lib/emotions";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { cn } from "@/components/ui/cn";
import { classLabel } from "@/lib/class-tools";

const ORDER: EmotionGroup[] = ["positive", "neutral", "negative"];

const CHANGE = {
  better: { text: "Nhẹ nhõm hơn tuần trước", cls: "bg-mint" },
  same: { text: "Gần giống tuần trước", cls: "bg-surface-2" },
  worse: { text: "Nặng lòng hơn tuần trước", cls: "bg-peach" },
} as const;

/** Nhịp cảm xúc một lớp trong tuần: số liệu gộp, dưới 5 bạn thì ẩn. */
export function PulseCard({
  classId,
  name,
  total,
  data,
  linked = true,
}: {
  classId: string;
  name: string;
  total: number;
  data: ClassPulse | null;
  linked?: boolean;
}) {
  const week = data?.pulse.thisWeek;
  const change = data?.pulse.change;
  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl font-bold tracking-tight">{classLabel(name)}</h3>
        <p className="text-sm text-muted">
          {week?.participants ?? 0}/{total} bạn check-in trong 7 ngày
        </p>
      </div>

      {week?.share ? (
        <div className="mt-4">
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {ORDER.filter((g) => week.share![g] > 0).map((g) => (
              <span key={g} style={{ flexGrow: week.share![g], background: GROUP_COLOR[g] }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {ORDER.map((g) => (
              <li key={g} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} aria-hidden />
                <span className="text-muted">{GROUP_LABEL[g]}</span>
                <strong className="tabular-nums">{week.share![g]}%</strong>
              </li>
            ))}
          </ul>
          {change && <p className={cn("mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold", CHANGE[change].cls)}>{CHANGE[change].text}</p>}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          Chưa đủ {MIN_GROUP} bạn check-in tuần này nên chưa hiện tỉ lệ, để không ai bị nhận ra.
        </p>
      )}

      {data?.worries.ready && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Điều nhiều bạn đang bận lòng (30 ngày)</p>
          {data.worries.shown.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {data.worries.shown.map((t) => (
                <li key={t.topic} className="rounded-full bg-lilac px-3 py-1 text-sm">
                  {t.label} <strong>· {t.students} bạn</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">Chưa có chủ đề nào từ {MIN_GROUP} bạn trở lên.</p>
          )}
          {data.worries.hiddenTopics > 0 && data.worries.shown.length > 0 && (
            <p className="mt-1 text-xs text-muted">Chủ đề có dưới {MIN_GROUP} bạn được ẩn.</p>
          )}
        </div>
      )}

      {linked && (
        <Link href={`/staff/classes/${classId}`} className="mt-4 inline-block text-sm font-bold text-brand-strong hover:underline dark:text-brand">
          Xem {classLabel(name).replace(/^Lớp/, "lớp")}
        </Link>
      )}
    </article>
  );
}
