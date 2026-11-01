import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { JourneyLoop } from "@/lib/loop-content";
import type { SkillJourney } from "@/lib/practice/review";
import { Section } from "@/components/Section";
import { EvidenceCard } from "./SkillJourney";

const label = "text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * Mình đã làm được (Duy 01/11 tối: gộp "Kỹ năng đã luyện" và "Ghi nhận" vì hai khối nói cùng một chuyện).
 * Ba con số luôn hiện (kể cả 0) để khối không đổi hình; dưới là MỘT thẻ chia dòng: từng kỹ năng đã luyện (bấm mở thẻ
 * minh chứng), việc nhỏ đã thử, huy hiệu (chưa có thì gập lại). Giọt nước nằm ở ô Khu vườn. Chỉ đếm việc của chính bạn.
 */
export function Recognition({ loop, skills, practiceReady }: { loop: JourneyLoop | null; skills: SkillJourney[]; practiceReady: boolean }) {
  const done = skills.filter((s) => s.practiced > 0);
  const practiced = done.reduce((s, j) => s + j.practiced, 0);
  const tried = loop?.actionsTried ?? [];
  const triedTimes = tried.reduce((s, a) => s + a.times, 0);
  const badges = loop?.badges ?? [];
  const earned = badges.filter((b) => b.earnedAt);
  const locked = badges.filter((b) => !b.earnedAt);
  const hasRows = practiceReady || tried.length > 0 || badges.length > 0;

  const stats = [
    { value: practiced, label: "lần luyện kỹ năng" },
    { value: triedTimes, label: "lần thử việc nhỏ" },
    { value: loop?.toldCount ?? 0, label: "lần kể với người thật" },
  ];

  return (
    <Section id="da-lam-duoc" title="Mình đã làm được">
      <ul className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <li key={s.label} className="rounded-[var(--radius-card)] bg-surface-2 p-3">
            <p className="font-display text-2xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </li>
        ))}
      </ul>

      {hasRows && (
        <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {practiceReady &&
            (done.length ? (
              done.map((s) => <EvidenceCard key={s.skill} journey={s} />)
            ) : (
              <p className="px-4 py-3 text-muted">
                Bạn chưa luyện kỹ năng nào.{" "}
                <Link href="/ky-nang" className="font-semibold text-brand-strong underline underline-offset-4">
                  Chọn một kỹ năng
                </Link>{" "}
                khi bạn muốn nhé. Có tình huống mẫu, không cần kể chuyện riêng.
              </p>
            ))}

          {tried.length > 0 && (
            <div className="space-y-2 px-4 py-3">
              <p className={label}>Việc nhỏ đã thử</p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {tried.map((a) => (
                  <li key={a.key} className="rounded-full border border-line px-3 py-1 font-semibold">
                    🌱 {a.title}
                    {a.times > 1 && <span className="ml-1.5 font-normal text-muted">{a.times} lần</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {badges.length > 0 && (
            <div className="space-y-2 px-4 py-3">
              <p className={label}>
                Huy hiệu {earned.length}/{badges.length}
              </p>
              {earned.length > 0 && (
                <ul className="flex flex-wrap gap-2 text-sm">
                  {earned.map((b) => (
                    <li key={b.key} title={`Nhận ngày ${formatDate(b.earnedAt as string)}`} className="rounded-full bg-butter px-3 py-1 font-semibold">
                      <span aria-hidden>{b.emoji}</span> {b.name}
                    </li>
                  ))}
                </ul>
              )}
              {locked.length > 0 && (
                <details className="group text-sm">
                  <summary className="w-fit cursor-pointer list-none text-muted underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                    Huy hiệu chưa có ({locked.length}) <span aria-hidden className="inline-block transition group-open:rotate-180">▾</span>
                  </summary>
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {locked.map((b) => (
                      <li key={b.key} className="flex items-center gap-2 text-muted">
                        <span aria-hidden className="opacity-50 grayscale">
                          {b.emoji}
                        </span>
                        <span>
                          <span className="font-semibold">{b.name}</span>: {b.how}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
