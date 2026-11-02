import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { SkillJourney as Journey } from "@/lib/practice/review";
import { USED_LABEL, type Used } from "@/lib/practice/review";
import type { PracticeFeedback } from "@/lib/practice/shared";
import { CASEL, subskill, subskillHref } from "@/lib/sel/casel";
import { SKILLS } from "@/lib/skills";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { btnWhite, Chevron } from "./JourneySection";

/** Trạng thái theo dữ liệu có thật của bài gần nhất (kèm biểu tượng nhỏ cho hai mốc đáng mừng). */
function statusOf(j: Journey): { label: string; star?: boolean } {
  const l = j.latest;
  if (!l) return { label: "Đã mở" };
  if (l.completed) return { label: "⭐ Đã xong phiên", star: true };
  if (l.v2) return { label: "✏️ Đã tự sửa" };
  if (l.v1) return { label: "Đã thử" };
  return { label: "Đã mở" };
}

function feedbackLines(f: PracticeFeedback): string[] {
  return f.kind === "ai" ? [`Điều làm tốt: ${f.good}`, `Có thể sửa: ${f.fix}`, `Câu hỏi: ${f.question}`] : f.criteria.map((c) => `Đối chiếu: ${c}`);
}

/**
 * Một kỹ năng đã luyện (kế hoạch V2 mục 3.5, 11.4): MỘT DÒNG gọn trong khối "Mình đã làm được"; bấm mở mới thấy THẺ MINH
 * CHỨNG của bài gần nhất: lần đầu, góp ý nhận được, lần sửa sau góp ý, điều tự rút ra, việc đã thử ngoài đời (học sinh tự
 * báo). Trạng thái chỉ theo dữ liệu có thật (đã mở / đã thử / đã tự sửa / đã xong phiên). Không điểm, không xếp hạng, không
 * chữ "thành thạo", không so với bạn khác.
 * Giao diện vui: thẻ mang màu nhóm năng lực của kỹ năng (tone-1…5), tên nhóm thân thiện đậm màu nhóm, tên bản dịch nhỏ.
 */
export function EvidenceCard({ journey: j }: { journey: Journey }) {
  const skill = SKILLS[j.skill];
  const sub = subskill(j.skill);
  const group = CASEL[sub.primary];
  const l = j.latest;
  const used = l?.used && l.used in USED_LABEL ? USED_LABEL[l.used as Used] : null;
  const status = statusOf(j);
  return (
    <details className={cn(`tone-${group.tone}`, "group min-w-0 break-words rounded-[1.25rem] bg-tint")}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 py-2.5 sm:flex-nowrap sm:gap-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[0.95rem] bg-surface text-[1.35rem] sm:size-11">
          {skill.emoji}
        </span>
        <span className="min-w-0 flex-[1_1_calc(100%-6rem)] sm:flex-1">
          <span className="block font-display text-[1.05rem] font-bold leading-tight">{skill.name}</span>
          <span className="block text-[13px] text-muted">
            <span className="font-bold text-tink">{group.friendly}</span> · {group.name} · luyện {j.practiced} lần
            {j.lastAt ? ` · gần nhất ${formatDate(j.lastAt)}` : ""}
          </span>
        </span>
        <span
          className={cn(
            "ml-[3.25rem] shrink-0 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-tink sm:ml-0",
            status.star && "-rotate-3",
          )}
        >
          {status.label}
        </span>
        <Chevron white className="ml-auto group-open:rotate-180 sm:ml-0" />
      </summary>

      <div className="space-y-2 px-2 pb-3 sm:px-3 sm:pb-3.5">
        {l && (
          <ol className="space-y-2 text-sm">
            {l.situation && <li className="px-1 text-muted">Tình huống: {l.situation}</li>}
            <Part title="Lần đầu" empty="Chưa viết">
              {l.v1 && <Answers fields={skill.fields} answers={l.v1} />}
            </Part>
            <Part title="Góp ý nhận được" empty="Chưa nhờ góp ý">
              {l.feedback && (
                <ul className="list-disc space-y-0.5 pl-4">
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

        <div className="flex flex-wrap gap-2 pt-0.5">
          {l && (
            <Link
              href={`/luyen/bai/${l.id}`}
              className={btnWhite}
            >
              Mở bài này
            </Link>
          )}
          <Link href={subskillHref(j.skill)} className={cn(btn.ghost, "min-h-11 px-3 text-sm font-bold")}>
            Luyện thêm →
          </Link>
        </div>
      </div>
    </details>
  );
}

function Part({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const has = Boolean(children);
  return (
    <li className="rounded-2xl bg-surface px-3.5 py-2.5">
      <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-tink">{title}</p>
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
