import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { SkillJourney as Journey } from "@/lib/practice/review";
import { skillHref } from "@/lib/practice/shared";
import { SKILLS } from "@/lib/skills";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/**
 * Hành trình theo 4 kỹ năng (kế hoạch Demo 3, mục 4.3; thuộc Demo 2.1): số lần luyện, bài gần nhất lần 1 và lần 2
 * để TỰ so, và những điều học sinh tự rút ra. Chỉ so với chính mình: không điểm, không xếp hạng, không so với bạn khác.
 */
export function SkillJourney({ skills }: { skills: Journey[] }) {
  const any = skills.some((s) => s.practiced > 0);
  return (
    <section aria-labelledby="ky-nang-da-luyen" className="space-y-3">
      <h2 id="ky-nang-da-luyen" className="font-display text-2xl font-extrabold tracking-tight">
        Kỹ năng đã luyện
      </h2>
      {!any && (
        <p className="rounded-3xl bg-surface-2 p-5 text-muted">
          Bạn chưa luyện kỹ năng nào.{" "}
          <Link href="/luyen" className="font-semibold text-ink underline underline-offset-4">
            Thử một bài luyện
          </Link>{" "}
          khi bạn muốn nhé.
        </p>
      )}
      <ul className="grid gap-3">
        {skills
          .filter((s) => s.practiced > 0)
          .map((s) => (
            <li key={s.skill}>
              <SkillCard journey={s} />
            </li>
          ))}
      </ul>
    </section>
  );
}

function SkillCard({ journey: j }: { journey: Journey }) {
  const skill = SKILLS[j.skill];
  return (
    <article className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="font-display text-lg font-bold tracking-tight">
          <span aria-hidden>{skill.emoji}</span> {skill.code} · {skill.suggestName}
        </h3>
        <span className="text-sm text-muted">
          Đã luyện {j.practiced} lần{j.completed ? `, xong ${j.completed} bài` : ""}
          {j.usedForReal ? `, đã dùng thật ${j.usedForReal} lần` : ""}
          {j.lastAt ? ` · gần nhất ${formatDate(j.lastAt)}` : ""}
        </span>
      </div>

      {j.latest && (j.latest.v1 || j.latest.v2) && (
        <details className="rounded-2xl bg-surface-2 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">
            {j.latest.v2 ? "Bài gần nhất: lần 1 và lần 2 để bạn tự so" : "Bài gần nhất của bạn"}
          </summary>
          {j.latest.situation && <p className="mt-2 text-muted">Tình huống: {j.latest.situation}</p>}
          <div className={cn("mt-2 grid gap-3", j.latest.v2 && "sm:grid-cols-2")}>
            {([1, 2] as const).map((v) => {
              const answers = v === 1 ? j.latest?.v1 : j.latest?.v2;
              if (!answers) return null;
              return (
                <dl key={v} className="space-y-1.5 rounded-xl bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Lần {v}</p>
                  {skill.fields.map((f) => (
                    <div key={f.key}>
                      <dt className="text-xs text-muted">{f.label}</dt>
                      <dd className="whitespace-pre-wrap">{answers[f.key] || <span className="text-muted">(bỏ trống)</span>}</dd>
                    </div>
                  ))}
                </dl>
              );
            })}
          </div>
          <Link href={`/luyen/bai/${j.latest.id}`} className="mt-3 inline-block font-semibold underline underline-offset-4">
            Mở bài này
          </Link>
        </details>
      )}

      {j.notes.length > 0 && (
        <div className="rounded-2xl bg-mint/60 p-4 text-sm">
          <p className="font-semibold">Điều bạn tự rút ra</p>
          <ul className="mt-1 space-y-1">
            {j.notes.map((n) => (
              <li key={`${n.kind}-${n.at}-${n.text}`}>
                <span className="text-muted">{n.kind === "next_time" ? "Lần sau sẽ chỉnh: " : "Việc sẽ thử: "}</span>“{n.text}”
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={skillHref(j.skill)} className={cn(btn.ghost, "-ml-3")}>
        Luyện thêm kỹ năng này
      </Link>
    </article>
  );
}
