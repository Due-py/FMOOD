import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { assistantName } from "@/lib/assistant";
import { getMoodByDay } from "@/lib/checkins";
import { addDays, currentHour, dayKey, weekdayLabel } from "@/lib/dates";
import { dominantEmotion, getEmotion } from "@/lib/emotions";
import { challengesForStudent } from "@/lib/challenges";
import { myHelpRequests } from "@/lib/help-requests";
import { followupLoop } from "@/lib/loop-content";
import { practiceFollowup, practiceOverview } from "@/lib/practice/server";
import { STEP_LABEL } from "@/lib/practice/state";
import { getTodayReflection } from "@/lib/reflection";
import { SKILLS } from "@/lib/skills";
import { pendingSurveys } from "@/lib/surveys-server";
import { greeting, moodForHour, remindLine } from "@/lib/mascot";
import { waitingLine } from "@/lib/worries-shared";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { ArrowUpRight, ChatIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { ChallengeCard, HelpReplyCard } from "./ClassCards";
import { FollowupCard } from "./FollowupCard";
import { PracticeFollowupCard } from "./PracticeFollowupCard";
import { ReflectionCard } from "./ReflectionCard";

export const metadata: Metadata = { title: "Hôm nay" };

/** Biểu tượng mục tiêu (luyện kỹ năng), cùng nét với menu. */
const TargetIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

/**
 * HÔM NAY (giao diện 01/11, kế hoạch V2 mục 2.2): hai lựa chọn chính ở đầu trang (Kể / Luyện), rồi việc đang dở và việc nhỏ đến
 * hạn, TỐI ĐA MỘT thông báo nổi bật (còn lại gộp "N thông báo khác"), check-in một dòng tùy chọn, Nhật ký và câu suy ngẫm.
 * Thói quen, Khu vườn, lưới 7 ngày không còn ở đây (mục phụ của Hành trình). Check-in không chặn chat hay luyện.
 * Máy tính rộng: cột phải "Gần đây".
 */
export default async function HomePage() {
  const profile = await requireProfile();
  const today = dayKey();
  const hour = currentHour();
  const name = await assistantName();

  const [moods, reflection, surveys, followup, helpRequests, challenges, overview] = await Promise.all([
    getMoodByDay(profile.id, addDays(today, -6), today),
    getTodayReflection(profile.id),
    pendingSurveys(profile),
    followupLoop(profile),
    myHelpRequests(profile),
    challengesForStudent(profile),
    practiceOverview(profile.id),
  ]);
  // hỏi lại bài luyện 1–3 ngày sau khi xong; mỗi lần chỉ một thẻ việc nhỏ (chuyện bận lòng tới hạn được ưu tiên)
  const practiceAsk = followup ? null : await practiceFollowup(profile.id);
  const resume = overview.open[0] ?? null;

  const todayMood = moods.get(today);
  const checkedIn = Boolean(todayMood);
  const todayEmotions = [...new Set(todayMood?.emotions ?? [])].map(getEmotion).filter(Boolean);

  // thông báo: lời đáp thầy cô trước, rồi khảo sát, rồi thử thách lớp; chỉ cái đầu hiện nổi bật
  const notices = [
    ...helpRequests.map((r) => ({ key: `h-${r.id}`, node: <HelpReplyCard request={r} /> })),
    ...surveys.map((sv) => ({
      key: `s-${sv.id}`,
      node: (
        <Link
          href={`/survey/${sv.id}`}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-brand-edge/60 bg-brand-soft p-4 transition hover:-translate-y-0.5"
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
      ),
    })),
    ...challenges.map((c) => ({ key: `c-${c.id}`, node: <ChallengeCard challenge={c} /> })),
  ];
  const [firstNotice, ...moreNotices] = notices;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-3">
        <section className="flex items-center gap-3">
          <CharacterAvatar size={64} mood={checkedIn ? "happy" : moodForHour(hour)} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">{followup?.waitingDays ? waitingLine(Number(today.replaceAll("-", ""))) : remindLine(checkedIn)}</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
              {greeting(hour)}, {profile.nickname}! Hôm nay bạn muốn làm gì?
            </h1>
          </div>
        </section>

        {/* hai lựa chọn chính: xếp dọc trên điện thoại, hai cột từ 640px */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/chat/new?tu=trang-chu"
            className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-brand-edge bg-brand p-4 text-brand-ink transition hover:-translate-y-0.5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/50" aria-hidden>
              <ChatIcon size={22} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-bold leading-tight">Kể điều mình đang nghĩ</span>
              <span className="block text-sm opacity-80">Trò chuyện với {name}, không cần chọn chủ đề</span>
            </span>
          </Link>
          <Link
            href="/ky-nang"
            className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-brand-edge bg-brand p-4 text-brand-ink transition hover:-translate-y-0.5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/50">
              <TargetIcon />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-bold leading-tight">Luyện một kỹ năng cùng AI</span>
              <span className="block text-sm opacity-80">Có tình huống mẫu, khoảng 10 phút</span>
            </span>
          </Link>
        </div>

        {resume && (
          <Link
            href={`/luyen/bai/${resume.id}`}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:border-brand-edge"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Làm tiếp</span>
              <span className="block truncate font-semibold">{SKILLS[resume.skill].name}</span>
              <span className="block text-sm text-muted">Bạn dừng ở bước {STEP_LABEL[resume.step]}</span>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        )}

        {followup && <FollowupCard loop={followup} />}
        {practiceAsk && <PracticeFollowupCard followup={practiceAsk} />}

        {firstNotice && <div key={firstNotice.key}>{firstNotice.node}</div>}
        {moreNotices.length > 0 && (
          <details className="group rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-2 font-semibold">
              {moreNotices.length} thông báo khác
              <span className="text-muted transition group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-3 px-3 pb-3">
              {moreNotices.map((n) => (
                <div key={n.key}>{n.node}</div>
              ))}
            </div>
          </details>
        )}

        {/* check-in: một dòng, tùy chọn */}
        <Link
          href="/checkin"
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:border-brand-edge"
        >
          <span className="min-w-0 flex-1">
            {checkedIn ? (
              <>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Hôm nay</span>
                <span className="block truncate font-semibold">{todayEmotions.map((e) => `${e!.emoji} ${e!.label}`).join(" · ")}</span>
              </>
            ) : (
              <>
                <span className="block font-semibold">Hôm nay bạn thấy thế nào?</span>
                <span className="block text-sm text-muted">Ghi lại nếu bạn muốn, không bắt buộc</span>
              </>
            )}
          </span>
          <span className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-semibold">{checkedIn ? "Ghi lại" : "Ghi"}</span>
        </Link>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/nhat-ky" className="flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] bg-lilac p-4 transition hover:-translate-y-0.5">
            <span className="text-2xl" aria-hidden>
              📓
            </span>
            <span>
              <span className="block font-semibold">Nhật ký</span>
              <span className="block text-sm text-muted">Viết vài dòng cho chính mình</span>
            </span>
          </Link>
          {reflection.question && (
            <details className="rounded-[var(--radius-card)] bg-lilac sm:col-span-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4">
                <span className="text-2xl" aria-hidden>
                  💭
                </span>
                <span>
                  <span className="block font-semibold">Câu suy ngẫm hôm nay</span>
                  <span className="block text-sm text-muted">{reflection.answer ? "Bạn đã trả lời" : "Mở để trả lời"}</span>
                </span>
              </summary>
              <div className="px-2 pb-2">
                <ReflectionCard question={reflection.question.text} answer={reflection.answer} />
              </div>
            </details>
          )}
        </div>
      </div>

      {/* máy tính rộng: Gần đây */}
      <aside className="hidden space-y-3 lg:block" aria-label="Gần đây">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Gần đây</h2>
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">7 ngày qua</h3>
            <Link href="/tam-trang" className="text-sm font-semibold text-brand-strong hover:underline">
              Xem
            </Link>
          </div>
          <ol className="mt-3 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((day) => {
              const mood = moods.get(day);
              const top = mood ? dominantEmotion(mood.emotions) : undefined;
              return (
                <li key={day} className="flex flex-col items-center gap-1">
                  <span
                    className={cn("flex size-8 items-center justify-center rounded-lg text-base", !top && "border border-dashed border-line")}
                    style={top ? { backgroundColor: `${top.color}2e` } : undefined}
                    title={top?.label}
                  >
                    {top?.emoji ?? ""}
                  </span>
                  <span className={cn("text-xs", day === today ? "font-semibold text-ink" : "text-muted")}>{day === today ? "Nay" : weekdayLabel(day)}</span>
                </li>
              );
            })}
          </ol>
        </section>
        <Link href="/hanh-trinh" className="block rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:border-brand-edge">
          <span className="block font-semibold">Hành trình của mình</span>
          <span className="block text-sm text-muted">Bài đã tự luyện, góp ý đã nhận, việc nhỏ đã thử</span>
        </Link>
      </aside>
    </div>
  );
}
