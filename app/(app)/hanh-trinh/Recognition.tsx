import { formatDate } from "@/lib/dates";
import type { JourneyLoop } from "@/lib/loop-content";
import type { SkillJourney } from "@/lib/practice/review";
import { Section } from "@/components/Section";

/**
 * Ghi nhận: gom những gì bạn đã làm ở cả hai phía (luyện kỹ năng và chuyện bận lòng) vào một chỗ.
 * Ba con số luôn hiện (kể cả 0) để khối không đổi hình; huy hiệu chưa có gập lại. Chỉ đếm việc của chính bạn.
 */
export function Recognition({ loop, skills, drops }: { loop: JourneyLoop | null; skills: SkillJourney[]; drops: number }) {
  const practiced = skills.reduce((s, j) => s + j.practiced, 0);
  const tried = loop?.actionsTried ?? [];
  const triedTimes = tried.reduce((s, a) => s + a.times, 0);
  const earned = (loop?.badges ?? []).filter((b) => b.earnedAt);
  const locked = (loop?.badges ?? []).filter((b) => !b.earnedAt);

  const stats = [
    { value: practiced, label: "lần luyện kỹ năng" },
    { value: triedTimes, label: "lần thử việc nhỏ" },
    { value: drops, label: "giọt nước tưới cây" },
  ];

  return (
    <Section id="ghi-nhan" title="Ghi nhận">
      <ul className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <li key={s.label} className="rounded-[var(--radius-card)] border border-line bg-surface p-3">
            <p className="font-display text-2xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </li>
        ))}
      </ul>

      {(tried.length > 0 || (loop?.toldCount ?? 0) > 0) && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {tried.map((a) => (
            <li key={a.key} className="rounded-full border border-line bg-surface px-3 py-1.5 font-semibold">
              🌱 {a.title}
              {a.times > 1 && <span className="ml-1.5 font-normal text-muted">{a.times} lần</span>}
            </li>
          ))}
          {(loop?.toldCount ?? 0) > 0 && (
            <li className="rounded-full border border-line bg-surface px-3 py-1.5 font-semibold">
              🌉 Đã kể với một người thật <span className="font-normal text-muted">{loop?.toldCount} lần</span>
            </li>
          )}
        </ul>
      )}

      {earned.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {earned.map((b) => (
            <li key={b.key} title={`Nhận ngày ${formatDate(b.earnedAt as string)}`} className="rounded-full bg-butter px-3 py-1.5 font-semibold">
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
    </Section>
  );
}
