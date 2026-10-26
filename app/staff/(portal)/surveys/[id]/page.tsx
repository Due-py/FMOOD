import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { surveyWithResults } from "@/lib/admin-data";
import { ownedSurvey } from "@/lib/class-content";
import { listClasses, MIN_GROUP } from "@/lib/staff";
import type { SurveyQuestion } from "@/lib/surveys";
import { Section } from "@/components/admin/AdminUI";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ExportButton } from "../../research/ExportButton";
import { SurveyBuilder, SurveyStatusBar } from "./SurveyBuilder";
import { classLabel } from "@/lib/class-tools";

export const metadata: Metadata = { title: "Phiếu khảo sát" };

export default async function SurveyDetailPage({ params }: PageProps<"/staff/surveys/[id]">) {
  const profile = await requireStaff(["admin", "teacher"]);
  const forTeacher = profile.role === "teacher";
  const { id } = await params;
  const classes = (await listClasses(profile)).map((c) => ({ id: c.id, name: c.name }));

  if (id === "new") {
    if (forTeacher && classes.length === 0) notFound();
    return (
      <div>
        <BackLink forTeacher={forTeacher} />
        <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight">{forTeacher ? "Câu hỏi mới cho lớp" : "Phiếu khảo sát mới"}</h1>
        <SurveyBuilder survey={null} classes={classes} forTeacher={forTeacher} />
      </div>
    );
  }

  if (!z.uuid().safeParse(id).success) notFound();
  // giáo viên chỉ mở được phiếu của chính mình
  if (forTeacher && !(await ownedSurvey(profile, id))) notFound();
  const data = await surveyWithResults(id);
  if (!data) notFound();
  const { survey, responses } = data;

  const csv = [
    ["Lớp", "Thời gian", ...survey.questions.map((q) => q.text)],
    ...responses.map((r) => [r.className ?? "", r.created_at, ...survey.questions.map((q) => String(r.answers[q.id] ?? ""))]),
  ];

  return (
    <div className="space-y-6">
      <BackLink forTeacher={forTeacher} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{survey.title}</h1>
          <p className="mt-1 text-muted">
            {responses.length} lượt trả lời · {survey.class_ids?.length ? classes.filter((c) => survey.class_ids!.includes(c.id)).map((c) => classLabel(c.name)).join(", ") : "mọi lớp"}
          </p>
        </div>
        {responses.length >= MIN_GROUP && <ExportButton rows={csv} filename={`khao-sat-${survey.id.slice(0, 8)}.csv`} />}
      </header>

      <SurveyStatusBar id={survey.id} status={survey.status} hasResponses={responses.length > 0} />

      {responses.length > 0 && responses.length < MIN_GROUP ? (
        <p className="rounded-[var(--radius-card)] bg-surface-2 p-6 text-center text-sm text-muted">
          Đã có {responses.length} lượt trả lời. Kết quả sẽ hiện khi có ít nhất {MIN_GROUP} lượt, để không ai bị nhận ra.
        </p>
      ) : responses.length > 0 ? (
        <div className="space-y-4">
          {survey.questions.map((q, i) => (
            <QuestionResult key={q.id} index={i} q={q} answers={responses.map((r) => r.answers[q.id]).filter((a) => a !== undefined && a !== "")} />
          ))}
        </div>
      ) : (
        <Section title="Sửa phiếu" description="Khi đã có người trả lời, câu hỏi sẽ được khóa để kết quả không bị lệch.">
          <SurveyBuilder survey={survey} classes={classes} forTeacher={forTeacher} />
        </Section>
      )}
    </div>
  );
}

function BackLink({ forTeacher }: { forTeacher: boolean }) {
  return (
    <Link href="/staff/surveys" className={cn(btn.ghost, "-ml-3 mb-2")}>
      <ArrowLeft size={18} /> {forTeacher ? "Câu hỏi cho lớp" : "Phiếu khảo sát"}
    </Link>
  );
}

function QuestionResult({ q, index, answers }: { q: SurveyQuestion; index: number; answers: (string | number)[] }) {
  return (
    <Section title={`${index + 1}. ${q.text}`} description={`${answers.length} lượt trả lời`}>
      {q.type === "scale" && <ScaleResult answers={answers.map(Number)} min={q.minLabel} max={q.maxLabel} />}
      {q.type === "choice" && <ChoiceResult options={q.options} answers={answers.map(String)} />}
      {q.type === "text" &&
        (answers.length < MIN_GROUP ? (
          <p className="text-sm text-muted">Cần ít nhất {MIN_GROUP} câu trả lời mới hiện để giữ ẩn danh.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {answers.map((a, i) => (
              <li key={i} className="whitespace-pre-wrap rounded-2xl bg-surface-2 px-4 py-2 text-sm">
                {String(a)}
              </li>
            ))}
          </ul>
        ))}
    </Section>
  );
}

function ScaleResult({ answers, min, max }: { answers: number[]; min: string; max: string }) {
  const avg = answers.length ? answers.reduce((s, v) => s + v, 0) / answers.length : 0;
  const counts = [1, 2, 3, 4, 5].map((n) => answers.filter((a) => a === n).length);
  const top = Math.max(1, ...counts);
  return (
    <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
      <div className="rounded-2xl bg-lilac p-4 text-center">
        <p className="font-display text-4xl font-extrabold">{avg.toFixed(1)}</p>
        <p className="text-xs text-muted">điểm trung bình / 5</p>
      </div>
      <div>
        {counts.map((c, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5 text-sm">
            <span className="w-4 text-right font-semibold">{i + 1}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-[var(--series-neg)]" style={{ width: `${(c / top) * 100}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums text-muted">{c}</span>
          </div>
        ))}
        {(min || max) && (
          <p className="mt-1 flex justify-between text-xs text-muted">
            <span>1 = {min}</span>
            <span>5 = {max}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function ChoiceResult({ options, answers }: { options: string[]; answers: string[] }) {
  const total = answers.length || 1;
  return (
    <ul className="space-y-2">
      {options.map((o) => {
        const n = answers.filter((a) => a === o).length;
        return (
          <li key={o}>
            <div className="flex justify-between text-sm">
              <span>{o}</span>
              <span className="font-semibold tabular-nums">
                {n} · {Math.round((n / total) * 100)}%
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-[var(--series-pos)]" style={{ width: `${(n / total) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
