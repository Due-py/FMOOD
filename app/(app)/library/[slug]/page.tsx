import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { requireProfile } from "@/lib/auth";
import type { ExerciseAnswer } from "@/lib/exercises";
import { formatFullDate } from "@/lib/dates";
import { getLesson, getLessons, topicBg } from "@/lib/lessons";
import { createClient } from "@/lib/supabase/server";
import { SupportCard } from "@/components/SupportCard";
import { TrackOpen } from "@/components/TrackOpen";
import { ArrowLeft, ArrowUpRight } from "@/components/ui/icons";
import { btn, pill } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ExerciseList } from "./ExerciseList";

export async function generateMetadata({ params }: PageProps<"/library/[slug]">): Promise<Metadata> {
  const lesson = await getLesson((await params).slug);
  return { title: lesson?.title ?? "Bài học" };
}

export default async function LessonPage({ params }: PageProps<"/library/[slug]">) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: responses } = await supabase
    .from("lesson_responses")
    .select("exercise_id, answer")
    .eq("user_id", profile.id)
    .eq("lesson_id", lesson.id);
  const saved = new Map((responses ?? []).map((r) => [r.exercise_id as string, r.answer as ExerciseAnswer]));

  const all = await getLessons();
  const index = all.findIndex((l) => l.slug === slug);
  const next = all[index + 1];

  return (
    <article>
      <TrackOpen kind="lesson" refCode={lesson.slug} />
      <Link href="/library" className={cn(btn.ghost, "-ml-3 mb-3")}>
        <ArrowLeft size={18} /> Thư viện
      </Link>

      <header className={cn("rounded-[var(--radius-card)] p-6 sm:p-8", topicBg(lesson.topic))}>
        <span className="text-5xl" aria-hidden>
          {lesson.emoji}
        </span>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className={pill}>{lesson.topic}</span>
          {lesson.grade && <span className={pill}>Lớp {lesson.grade}</span>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {lesson.title}
        </h1>
        {lesson.summary && <p className="mt-2 text-lg text-muted">{lesson.summary}</p>}
      </header>

      <div className="lesson-body mt-6 px-1 text-[17px]">
        <Markdown>{lesson.body}</Markdown>
      </div>

      {lesson.exercises.length > 0 && (
        <ExerciseList
          userId={profile.id}
          lessonId={lesson.id}
          lessonSlug={lesson.slug}
          exercises={lesson.exercises}
          saved={Object.fromEntries(saved)}
          supportCard={<SupportCard tone="urgent" />}
          supportCardNotified={<SupportCard tone="urgent" teacherNotified />}
        />
      )}

      <footer className="mt-10 space-y-1 border-t border-line pt-4 text-xs text-muted">
        {lesson.source && <p>Nguồn: {lesson.source}</p>}
        <p>
          {lesson.reviewed_at
            ? `Thầy cô đã duyệt: ${lesson.reviewed_by_name ?? "thầy cô"}, ngày ${formatFullDate(lesson.reviewed_at)}.`
            : "Bài này chưa được thầy cô duyệt."}
        </p>
      </footer>

      {next && (
        <Link
          href={`/library/${next.slug}`}
          className="mt-6 flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 transition hover:bg-surface-2"
        >
          <span className="text-2xl" aria-hidden>
            {next.emoji}
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Bài tiếp theo</span>
            <span className="font-display text-lg font-bold tracking-tight">{next.title}</span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      )}
    </article>
  );
}
