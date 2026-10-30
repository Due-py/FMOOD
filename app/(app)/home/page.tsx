import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getMoodByDay } from "@/lib/checkins";
import { addDays, currentHour, dayKey, weekdayLabel } from "@/lib/dates";
import { dominantEmotion, getEmotion } from "@/lib/emotions";
import { getHabits } from "@/lib/habits";
import { getGarden } from "@/lib/garden";
import { getLessons, topicBg } from "@/lib/lessons";
import { challengesForStudent } from "@/lib/challenges";
import { myHelpRequests } from "@/lib/help-requests";
import { followupLoop } from "@/lib/loop-content";
import { getTodayReflection } from "@/lib/reflection";
import { pendingSurveys } from "@/lib/surveys-server";
import { greeting, moodForHour, remindLine } from "@/lib/mascot";
import { waitingLine } from "@/lib/worries-shared";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowUpRight, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { RoundArrow } from "@/components/ui/ArrowLink";
import { card, cardHover } from "@/components/ui/styles";
import { ChallengeCard, HelpReplyCard } from "./ClassCards";
import { FollowupCard } from "./FollowupCard";
import { ReflectionCard } from "./ReflectionCard";

export const metadata: Metadata = { title: "Trang chủ" };

export default async function HomePage() {
  const profile = await requireProfile();
  const today = dayKey();
  const hour = currentHour();

  const [moods, habits, lessons, reflection, garden, surveys, followup, helpRequests, challenges] = await Promise.all([
    getMoodByDay(profile.id, addDays(today, -6), today),
    getHabits(profile.id),
    getLessons(),
    getTodayReflection(profile.id),
    getGarden(profile.id),
    pendingSurveys(profile),
    followupLoop(profile),
    myHelpRequests(profile),
    challengesForStudent(profile),
  ]);
  const plantStage = garden.plant?.stages[garden.stageIndex];

  const todayMood = moods.get(today);
  const checkedIn = Boolean(todayMood);
  const todayEmotions = [...new Set(todayMood?.emotions ?? [])].map(getEmotion).filter(Boolean);
  const habitsDone = habits.filter((h) => h.doneToday).length;
  // gợi ý bài học thay đổi theo ngày
  const lesson = lessons.length ? lessons[Number(today.replaceAll("-", "")) % lessons.length] : null;

  return (
    <div className="fm-stagger space-y-4">
      <section className="flex items-end gap-3 pt-2">
        <May size={104} mood={checkedIn ? "happy" : moodForHour(hour)} />
        <div className="mb-3 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">{greeting(hour)},</p>
          <h1 className="truncate font-display text-3xl font-extrabold tracking-tight">{profile.nickname}!</h1>
          {/* câu hỏi thăm tới hạn lúc bạn ấy chưa mở web: Mây nhắc nhẹ, không trách, không "mất chuỗi" */}
          <SpeechBubble className="mt-2">
            {followup?.waitingDays ? waitingLine(Number(today.replaceAll("-", ""))) : remindLine(checkedIn)}
          </SpeechBubble>
        </div>
      </section>

      {followup && <FollowupCard loop={followup} />}

      {helpRequests.map((r) => (
        <HelpReplyCard key={r.id} request={r} />
      ))}

      {surveys.map((sv) => (
        <Link
          key={sv.id}
          href={`/survey/${sv.id}`}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-brand/50 bg-brand-soft p-4 transition hover:-translate-y-0.5"
        >
          <span className="text-2xl" aria-hidden>
            📋
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Khảo sát mới</span>
            <span className="block truncate font-semibold">{sv.title}</span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      ))}

      {/* Check-in */}
      <Link
        href="/checkin"
        className="group block rounded-[var(--radius-card)] bg-brand p-6 text-brand-ink transition hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold opacity-80">{checkedIn ? "Hôm nay bạn đã check-in" : "Chưa check-in hôm nay"}</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
              {checkedIn ? "Check-in thêm" : "Bạn đang thấy thế nào?"}
            </h2>
          </div>
          <span className="flex size-11 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white/30">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {checkedIn
            ? todayEmotions.map((e) => (
                <span key={e!.id} className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                  {e!.emoji} {e!.label}
                </span>
              ))
            : ["😄", "🙂", "😴", "😢", "😟"].map((emoji) => (
                <span key={emoji} className="flex size-10 items-center justify-center rounded-full bg-white/20 text-xl">
                  {emoji}
                </span>
              ))}
        </div>
      </Link>

      {challenges.map((c) => (
        <ChallengeCard key={c.id} challenge={c} />
      ))}

      {reflection.question && <ReflectionCard question={reflection.question.text} answer={reflection.answer} />}

      {/* 7 ngày qua */}
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight">7 ngày qua</h2>
          <Link href="/me" className="text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
            Xem thống kê
          </Link>
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((day) => {
            const mood = moods.get(day);
            const top = mood ? dominantEmotion(mood.emotions) : undefined;
            return (
              <li key={day} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-2xl text-xl",
                    !top && "border border-dashed border-line",
                  )}
                  style={top ? { backgroundColor: `${top.color}2e` } : undefined}
                  title={top?.label}
                >
                  {top?.emoji ?? ""}
                </span>
                <span className={cn("text-[11px] font-medium", day === today ? "text-ink" : "text-muted")}>
                  {day === today ? "Nay" : weekdayLabel(day)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Thói quen hôm nay */}
      <Link href="/habits" className="block rounded-[var(--radius-card)] bg-peach p-5 transition hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight">Thói quen hôm nay</h2>
          <span className="text-sm font-semibold">
            {habits.length ? `${habitsDone}/${habits.length}` : "Tạo thói quen đầu tiên"}
          </span>
        </div>
        {habits.length > 0 && (
          <ul className="mt-3 space-y-2">
            {habits.slice(0, 4).map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-surface/70 px-3 py-2">
                <span aria-hidden>{h.icon}</span>
                <span className={cn("flex-1 truncate", h.doneToday && "text-muted line-through")}>{h.title}</span>
                {h.daysDone > 0 && <span className="text-sm text-muted">{h.daysDone} ngày</span>}
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    h.doneToday ? "bg-brand text-brand-ink" : "border-2 border-ink/20",
                  )}
                >
                  {h.doneToday && <CheckIcon size={14} strokeWidth={3} />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Link>

      {garden.plant && plantStage && (
        <Link href="/garden" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-gradient-to-r from-sky to-mint p-5 transition hover:-translate-y-0.5">
          <span className="text-5xl" aria-hidden>
            {plantStage.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Khu vườn của bạn</span>
            <span className="block font-display text-lg font-bold tracking-tight">
              {garden.plant.name} · {plantStage.label}
            </span>
            <span className="block text-sm text-muted">
              {garden.canHarvest
                ? "Cây đã nở hoa, vào thu hoạch nào!"
                : garden.nextStage
                  ? `Còn ${garden.nextStage.points - garden.progress} 💧 nữa để lớn tiếp`
                  : ""}
            </span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/chat/new" className={cn(card, cardHover, "flex flex-col")}>
          <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-xl transition group-hover:bg-surface" aria-hidden>
            💬
          </span>
          <h2 className="mt-6 font-display text-lg font-bold tracking-tight">Trò chuyện với Mây</h2>
          <p className="flex-1 text-sm text-muted">Kể bất cứ điều gì, riêng tư và không phán xét.</p>
          <div className="mt-4 flex justify-end">
            <RoundArrow />
          </div>
        </Link>
        {lesson && (
          <Link href={`/library/${lesson.slug}`} className={cn(card, cardHover, "flex flex-col")}>
            <span className={cn("flex size-11 items-center justify-center rounded-full text-xl", topicBg(lesson.topic))} aria-hidden>
              {lesson.emoji}
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Bài học hôm nay</p>
            <h2 className="font-display text-lg font-bold tracking-tight">{lesson.title}</h2>
            <p className="flex-1 text-sm text-muted">{lesson.summary}</p>
            <div className="mt-4 flex justify-end">
              <RoundArrow />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
