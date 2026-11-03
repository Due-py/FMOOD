import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { requireProfile } from "@/lib/auth";
import type { ExerciseAnswer } from "@/lib/exercises";
import { formatFullDate } from "@/lib/dates";
import { getLesson, getLessons, topicBg } from "@/lib/lessons";
import { createClient } from "@/lib/supabase/server";
import { CASEL, isCasel, isSubskillId, subskill, subskillHref } from "@/lib/sel/casel";
import { isSkillId, SKILLS } from "@/lib/skills";
import { MascotArt } from "@/components/mascot/MascotArt";
import { SupportCard } from "@/components/SupportCard";
import { TrackOpen } from "@/components/TrackOpen";
import { cn } from "@/components/ui/cn";
import { BackPill } from "../../luyen/vui";
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
  const { data: responses } = await supabase.from("lesson_responses").select("exercise_id, answer").eq("user_id", profile.id).eq("lesson_id", lesson.id);
  const saved = new Map((responses ?? []).map((r) => [r.exercise_id as string, r.answer as ExerciseAnswer]));
  // khung CASEL người duyệt đã gắn (0026): năng lực chính, mục tiêu học tập, bài luyện nối với bài đọc (nếu có)
  const { data: sel } = await supabase.from("lessons").select("casel_primary, subskill, learning_objective").eq("id", lesson.id).maybeSingle();
  const primary = isCasel(sel?.casel_primary) ? CASEL[sel.casel_primary] : null;
  const practice = isSubskillId(sel?.subskill) && isSkillId(sel.subskill) ? subskill(sel.subskill) : null;

  const all = await getLessons();
  const index = all.findIndex((l) => l.slug === slug);
  const next = all[index + 1];

  // màu đầu bài theo nhóm năng lực người duyệt đã gắn (giao diện vui 02/11); chưa gắn thì màu theo chủ đề như trước
  const tone = `tone-${primary?.tone ?? 5}`;
  const practiceEmoji = practice && isSkillId(practice.id) ? SKILLS[practice.id].emoji : "🎯";

  return (
    <article className={tone}>
      <TrackOpen kind="lesson" refCode={lesson.slug} />
      <BackPill />

      <header className={cn("relative mt-4 rounded-[30px] px-4 pb-5 pt-[18px] sm:px-[26px] sm:pb-[22px] sm:pt-6", primary ? "bg-tint" : topicBg(lesson.topic))}>
        <span
          aria-hidden
          className="grid size-[60px] -rotate-[7deg] place-items-center rounded-[20px] bg-surface text-[32px] shadow-soft sm:size-[76px] sm:rounded-3xl sm:text-[42px]"
        >
          {lesson.emoji}
        </span>
        <div className="sm:pr-[150px]">
          <div className="mt-4 flex flex-wrap gap-1.5 max-sm:pr-20">
            {primary ? (
              <span className="inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-surface px-3 py-0.5 text-xs text-tink">
                <span className="font-bold">
                  <span aria-hidden>{primary.emoji} </span>
                  {primary.name}
                </span>
              </span>
            ) : (
              <span className="rounded-full bg-surface px-3 py-0.5 text-xs font-bold">{lesson.topic}</span>
            )}
            {lesson.grade && (
              <span className="-rotate-3 rounded-full bg-tink px-3 py-0.5 text-xs font-bold text-surface" title={`Lớp ${lesson.grade}`}>
                C{lesson.grade}
              </span>
            )}
          </div>
          <h1 className="mt-2 max-w-[560px] font-display text-[28px] font-extrabold leading-[1.08] sm:text-4xl">{lesson.title}</h1>
          {lesson.summary && <p className="mt-2 max-w-[560px] text-base text-muted sm:text-[17px]">{lesson.summary}</p>}
          {sel?.learning_objective && (
            <p className="mt-3.5 flex max-w-[600px] flex-col gap-0.5 rounded-2xl bg-surface/75 px-3 py-2 text-sm sm:flex-row sm:gap-2">
              <span className="shrink-0 font-bold">
                <span aria-hidden>🎯 </span>Mục tiêu:
              </span>
              <span>{sel.learning_objective}</span>
            </p>
          )}
        </div>
        {/* nhân vật học sinh đã chọn ngó vào góc đầu bài */}
        <span
          aria-hidden
          className="absolute bottom-[112px] right-[128px] hidden rotate-2 rounded-[18px] rounded-br bg-surface px-3 py-2 text-[13px] font-bold shadow-soft xl:block"
        >
          Đọc cùng mình nha! 📖
        </span>
        <span aria-hidden className="absolute right-1.5 top-2 sm:-bottom-2.5 sm:right-[22px] sm:top-auto">
          <MascotArt size={120} className="max-sm:h-[94px] max-sm:w-[78px]" />
        </span>
      </header>

      {/* nội dung bài (Markdown): tiêu đề mục có ô bơ nghiêng nhỏ, khung trích dẫn (mẹo) viền đứt như mẫu */}
      <div className="lesson-body mt-6 px-1 text-[17px] [&_blockquote]:border-2 [&_blockquote]:border-dashed [&_blockquote]:border-brand-edge/30 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2.5 [&_h2]:before:size-4 [&_h2]:before:shrink-0 [&_h2]:before:-rotate-6 [&_h2]:before:rounded-[6px] [&_h2]:before:bg-brand [&_h2]:before:shadow-[0_2px_0_var(--brand-edge)] [&_h2]:before:content-['']">
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

      {practice && (
        <Link
          href={`${subskillHref(practice.id)}?tu=bai-doc`}
          className="group mt-8 flex items-center gap-3 rounded-3xl border-2 border-brand-edge/30 bg-brand-soft px-4 py-3.5 transition hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <span aria-hidden className="grid size-[46px] shrink-0 -rotate-6 place-items-center rounded-2xl bg-surface text-2xl">
            {practiceEmoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-brand-strong dark:text-brand">Luyện cùng AI</span>
            <span className="block font-display text-lg font-bold leading-tight">{practice.name}</span>
            <span className="block text-[13px] text-muted">Có tình huống mẫu, không cần kể chuyện riêng.</span>
          </span>
          <RoundGo />
        </Link>
      )}

      <footer className="mt-8 grid gap-1.5 text-xs text-muted">
        {lesson.source && <p>Nguồn: {lesson.source}</p>}
        {lesson.reviewed_at ? (
          <p className="w-fit rounded-full bg-c2 px-3 py-1 font-bold text-c2-ink">
            ✓ Thầy cô đã duyệt: {lesson.reviewed_by_name ?? "thầy cô"}, ngày {formatFullDate(lesson.reviewed_at)}.
          </p>
        ) : (
          <p>Bài này chưa được thầy cô duyệt.</p>
        )}
      </footer>

      {next && (
        <Link
          href={`/library/${next.slug}`}
          className="group mt-6 flex items-center gap-3 rounded-3xl bg-surface px-4 py-3.5 shadow-soft transition hover:-translate-y-0.5 motion-reduce:transform-none dark:border dark:border-line"
        >
          <span aria-hidden className="grid size-[46px] shrink-0 place-items-center rounded-2xl bg-c1 text-2xl">
            {next.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-muted">Bài tiếp theo</span>
            <span className="block font-display text-lg font-bold leading-tight">{next.title}</span>
          </span>
          <RoundGo />
        </Link>
      )}
    </article>
  );
}

/** Mũi tên tròn nền bơ, lún nhẹ khi rê chuột vào thẻ cha (class group). */
function RoundGo() {
  return (
    <span
      aria-hidden
      className="grid size-[34px] shrink-0 place-items-center rounded-full bg-brand font-extrabold text-brand-ink shadow-[0_2px_0_var(--brand-edge)] transition group-hover:translate-x-0.5 motion-reduce:transform-none"
    >
      →
    </span>
  );
}
