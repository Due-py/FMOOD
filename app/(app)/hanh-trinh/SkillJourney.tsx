import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { SkillJourney as Journey } from "@/lib/practice/review";
import { USED_LABEL, type Used } from "@/lib/practice/review";
import type { PracticeFeedback } from "@/lib/practice/shared";
import { CASEL, subskill, subskillHref } from "@/lib/sel/casel";
import { SKILLS } from "@/lib/skills";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { Empty, Section } from "@/components/Section";

/**
 * Kỹ năng đã luyện (kế hoạch V2 mục 3.5, 11.4): mỗi kỹ năng MỘT DÒNG gọn; bấm mở mới thấy THẺ MINH CHỨNG của bài gần
 * nhất: lần đầu, góp ý nhận được, lần sửa sau góp ý, điều tự rút ra, việc đã thử ngoài đời (học sinh tự báo). Trạng thái
 * chỉ theo dữ liệu có thật (đã mở / đã thử / đã tự sửa / đã xong phiên). Không điểm, không xếp hạng, không chữ
 * "thành thạo", không so với bạn khác.
 */
export function SkillJourney({ skills }: { skills: Journey[] }) {
  const done = skills.filter((s) => s.practiced > 0);
  return (
    <Section id="ky-nang-da-luyen" title="Kỹ năng đã luyện">
      {done.length === 0 ? (
        <Empty>
          Bạn chưa luyện kỹ năng nào.{" "}
          <Link href="/ky-nang" className="font-semibold text-brand-strong underline underline-offset-4">
            Chọn một kỹ năng
          </Link>{" "}
          khi bạn muốn nhé. Có tình huống mẫu, không cần kể chuyện riêng.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {done.map((s) => (
            <li key={s.skill}>
              <EvidenceCard journey={s} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Trạng thái theo dữ liệu có thật của bài gần nhất. */
function statusOf(j: Journey): string {
  const l = j.latest;
  if (!l) return "Đã mở";
  if (l.completed) return "Đã xong phiên";
  if (l.v2) return "Đã tự sửa";
  if (l.v1) return "Đã thử";
  return "Đã mở";
}

function feedbackLines(f: PracticeFeedback): string[] {
  return f.kind === "ai" ? [`Điều làm tốt: ${f.good}`, `Có thể sửa: ${f.fix}`, `Câu hỏi: ${f.question}`] : f.criteria.map((c) => `Đối chiếu: ${c}`);
}

function EvidenceCard({ journey: j }: { journey: Journey }) {
  const skill = SKILLS[j.skill];
  const sub = subskill(j.skill);
  const l = j.latest;
  const used = l?.used && l.used in USED_LABEL ? USED_LABEL[l.used as Used] : null;
  return (
    <details className="group min-w-0 break-words rounded-[var(--radius-card)] border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl" aria-hidden>
          {skill.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{skill.name}</span>
          <span className="block text-sm text-muted">
            {CASEL[sub.primary].name} · luyện {j.practiced} lần{j.lastAt ? ` · gần nhất ${formatDate(j.lastAt)}` : ""}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold">{statusOf(j)}</span>
        <span aria-hidden className="shrink-0 text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-3 border-t border-line p-4">
        {l && (
          <ol className="space-y-2 text-sm">
            {l.situation && <li className="text-muted">Tình huống: {l.situation}</li>}
            <Part title="Lần đầu" empty="Chưa viết">
              {l.v1 && <Answers fields={skill.fields} answers={l.v1} />}
            </Part>
            <Part title="Góp ý nhận được" empty="Chưa nhờ góp ý">
              {l.feedback && (
                <ul className="space-y-0.5">
                  {feedbackLines(l.feedback).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </Part>
            <Part title="Lần sửa sau góp ý" empty="Chưa sửa lần 2">
              {l.v2 && <Answers fields={skill.fields} answers={l.v2} />}
            </Part>
            <Part title="Điều mình rút ra" empty="Chưa ghi">
              {l.nextTry && <p>“{l.nextTry}”</p>}
            </Part>
            <Part title="Đã thử ngoài đời (bạn tự báo)" empty="Chưa trả lời">
              {used && <p>{used}</p>}
            </Part>
          </ol>
        )}
  
        <div className="flex flex-wrap gap-2">
          {l && (
            <Link href={`/luyen/bai/${l.id}`} className={cn(btn.secondary, "px-4 py-2 text-sm")}>
              Mở bài này
            </Link>
          )}
          <Link href={subskillHref(j.skill)} className={cn(btn.ghost, "px-3 py-2 text-sm")}>
            Luyện thêm
          </Link>
        </div>
      </div>
    </details>
  );
}

function Part({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const has = Boolean(children);
  return (
    <li className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className={cn("mt-1", !has && "text-muted")}>{has ? children : empty}</div>
    </li>
  );
}

function Answers({ fields, answers }: { fields: { key: string; label: string }[]; answers: Record<string, string> }) {
  return (
    <dl className="space-y-1">
      {fields.map((f) =>
        answers[f.key] ? (
          <div key={f.key}>
            <dt className="text-xs text-muted">{f.label}</dt>
            <dd className="whitespace-pre-wrap">{answers[f.key]}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}
