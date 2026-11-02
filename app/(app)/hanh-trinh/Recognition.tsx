import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { JourneyLoop } from "@/lib/loop-content";
import type { SkillJourney } from "@/lib/practice/review";
import { cn } from "@/components/ui/cn";
import { JourneySection } from "./JourneySection";
import { EvidenceCard } from "./SkillJourney";

const kick = "mx-1 mb-2 text-xs font-extrabold uppercase tracking-[0.06em] text-muted";

/**
 * Mình đã làm được (Duy 01/11 tối: gộp "Kỹ năng đã luyện" và "Ghi nhận" vì hai khối nói cùng một chuyện).
 * Ba con số luôn hiện (kể cả 0) để khối không đổi hình; dưới là MỘT thẻ chia phần: từng kỹ năng đã luyện (bấm mở thẻ
 * minh chứng), việc nhỏ đã thử, huy hiệu (chưa có thì gập lại). Giọt nước nằm ở ô Khu vườn. Chỉ đếm việc của chính bạn.
 * Giao diện vui (mẫu hanh-trinh.html): ba ô số màu bơ / bạc hà / đào có biểu tượng nghiêng; kỹ năng mang màu nhóm năng lực;
 * việc nhỏ là viên bạc hà; huy hiệu là nhãn bơ hơi nghiêng như sticker.
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
    { value: practiced, label: "lần luyện kỹ năng", emoji: "🎯", tone: "tone-5" },
    { value: triedTimes, label: "lần thử việc nhỏ", emoji: "🌱", tone: "tone-2" },
    { value: loop?.toldCount ?? 0, label: "lần kể với người thật", emoji: "🌉", tone: "tone-4" },
  ];

  return (
    <JourneySection id="da-lam-duoc" emoji="🏆" title="Mình đã làm được">
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <li
            key={s.label}
            className={cn(s.tone, "flex flex-col items-start gap-1.5 rounded-[1.25rem] bg-tint p-3 sm:flex-row sm:items-center sm:gap-3 sm:rounded-3xl sm:px-4 sm:py-3.5")}
          >
            <span aria-hidden className="grid size-9 shrink-0 -rotate-6 place-items-center rounded-[0.8rem] bg-surface text-lg sm:size-[2.875rem] sm:rounded-2xl sm:text-2xl">
              {s.emoji}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[1.75rem] font-extrabold leading-none text-tink sm:text-[2rem]">{s.value}</span>
              <span className="mt-0.5 block text-xs leading-tight text-muted sm:text-[13px]">{s.label}</span>
            </span>
          </li>
        ))}
      </ul>

      {hasRows && (
        <div className="mt-3 space-y-6 rounded-[1.6rem] bg-surface p-3 shadow-soft sm:rounded-[1.75rem] sm:p-4">
          {practiceReady && (
            <div>
              <p className={kick}>Kỹ năng đã luyện</p>
              {done.length ? (
                <div className="grid gap-2">
                  {done.map((s) => (
                    <EvidenceCard key={s.skill} journey={s} />
                  ))}
                </div>
              ) : (
                <p className="mx-1 text-muted">
                  Bạn chưa luyện kỹ năng nào.{" "}
                  <Link href="/ky-nang" className="font-semibold text-brand-strong underline underline-offset-4 dark:text-brand">
                    Chọn một kỹ năng
                  </Link>{" "}
                  khi bạn muốn nhé. Có tình huống mẫu, không cần kể chuyện riêng.
                </p>
              )}
            </div>
          )}

          {tried.length > 0 && (
            <div>
              <p className={kick}>Việc nhỏ đã thử</p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {tried.map((a) => (
                  <li key={a.key} className="rounded-full bg-c2 px-3.5 py-1.5 font-bold text-c2-ink">
                    🌱 {a.title}
                    {a.times > 1 && <span className="ml-1.5 font-medium text-muted">{a.times} lần</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {badges.length > 0 && (
            <div>
              <p className={kick}>
                Huy hiệu {earned.length}/{badges.length}
              </p>
              {earned.length > 0 && (
                <ul className="flex flex-wrap gap-2.5 text-sm">
                  {earned.map((b) => (
                    <li
                      key={b.key}
                      title={`Nhận ngày ${formatDate(b.earnedAt as string)}`}
                      className="rounded-2xl bg-brand px-3.5 py-1.5 font-bold text-brand-ink shadow-[0_3px_0_color-mix(in_srgb,var(--brand-edge)_35%,var(--brand))] odd:-rotate-2 even:rotate-[1.5deg]"
                    >
                      <span aria-hidden>{b.emoji}</span> {b.name}
                    </li>
                  ))}
                </ul>
              )}
              {locked.length > 0 && (
                <details className="group mt-3 text-sm">
                  <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                    <span aria-hidden>🔒</span> Huy hiệu chưa có ({locked.length}){" "}
                    <span aria-hidden className="inline-block transition group-open:rotate-180 motion-reduce:transition-none">
                      ▾
                    </span>
                  </summary>
                  <ul className="mt-1 grid gap-2 sm:grid-cols-2">
                    {locked.map((b) => (
                      <li key={b.key} className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-line bg-surface-2/60 px-3 py-2 text-[13px] text-muted">
                        <span aria-hidden className="text-[1.35rem] opacity-55 grayscale">
                          {b.emoji}
                        </span>
                        <span>
                          <span className="font-semibold text-ink">{b.name}</span>: {b.how}
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
    </JourneySection>
  );
}
