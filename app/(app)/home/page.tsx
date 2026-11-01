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
import { RightPanel } from "@/components/RightPanel";
import { SideSheetButton } from "@/components/SideSheet";
import { side } from "@/app/(app)/chat/[id]/side-styles";
import { Empty, Section } from "@/components/Section";
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

/** Một dòng bấm được: cùng một kiểu cho mọi dòng ở trang Hôm nay. */
const ROW = "flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:border-brand-edge";

/**
 * HÔM NAY (sắp lại 01/11, kế hoạch V2 mục 2.2): lời chào và hai lựa chọn chính (Kể / Luyện), rồi hai khối có tiêu đề:
 * Cần làm bây giờ (hỏi lại đến hạn, MỌI bài đang dở, TỐI ĐA MỘT thông báo nổi bật, còn lại gộp "N thông báo khác"; khối này
 * chuyển từ Hành trình sang, Hành trình chỉ còn ghi lại những gì đã làm) và Hôm nay (check-in, câu suy ngẫm, nhật ký, đều tùy chọn).
 * Thói quen, Khu vườn, lưới 7 ngày không ở đây (mục phụ của Hành trình). Check-in không chặn chat hay luyện.
 * Bố cục như Luyện kỹ năng (Duy 01/11): cột giữa căn giữa vùng trống (data-chat-page); panel "Gần đây" (cảm xúc 7 ngày,
 * lối sang Tâm trạng, Hành trình) cùng chuẩn chữ panel Kỹ năng, neo mép phải từ 1280px; nhỏ hơn mở bằng nút cuối trang.
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
  // bài đang dở: mỗi kỹ năng một dòng (bài mới nhất; danh sách đã xếp mới trước), kèm số bài dở cũ hơn
  const openBySkill = new Map<string, { session: (typeof overview.open)[number]; older: number }>();
  for (const o of overview.open) {
    const seen = openBySkill.get(o.skill);
    if (seen) seen.older += 1;
    else openBySkill.set(o.skill, { session: o, older: 0 });
  }
  const open = [...openBySkill.values()];

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
  const recent = <RecentPanel today={today} moods={moods} />;
  const nothingDue = !followup && !practiceAsk && open.length === 0 && notices.length === 0;

  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-3">
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
      </div>

      {/* việc đang chờ: hỏi lại đến hạn, mọi bài đang dở, thông báo (tối đa một cái nổi bật) */}
      <Section id="can-lam" title="Cần làm bây giờ">
        {nothingDue ? (
          <Empty>Không có việc nào đang chờ bạn.</Empty>
        ) : (
          <div className="space-y-2">
            {followup && <FollowupCard loop={followup} />}
            {practiceAsk && <PracticeFollowupCard followup={practiceAsk} />}
            {open.length > 0 && (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                {open.map(({ session: o, older }) => (
                  <li key={o.id}>
                    <Link href={`/luyen/bai/${o.id}`} className={ROW}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Bài đang dở</span>
                        <span className="block truncate font-semibold">{SKILLS[o.skill].name}</span>
                        <span className="block text-sm text-muted">
                          Dừng ở bước {STEP_LABEL[o.step]}
                          {older > 0 && ` · và ${older} bài dở cũ hơn`}
                        </span>
                      </span>
                      <ArrowUpRight size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
          </div>
        )}
      </Section>

      {/* ba việc nhỏ của ngày, đều tùy chọn, cùng một kiểu dòng */}
      <Section id="hom-nay" title="Hôm nay">
        <div className="space-y-2">
          <Link href="/checkin" className={ROW}>
            <span className="text-2xl" aria-hidden>
              ☁️
            </span>
            <span className="min-w-0 flex-1">
              {checkedIn ? (
                <>
                  <span className="block font-semibold">Cảm xúc hôm nay</span>
                  <span className="block truncate text-sm text-muted">{todayEmotions.map((e) => `${e!.emoji} ${e!.label}`).join(" · ")}</span>
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

          {reflection.question && (
            <details className="group rounded-[var(--radius-card)] border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="text-2xl" aria-hidden>
                  💭
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Câu suy ngẫm hôm nay</span>
                  <span className="block text-sm text-muted">{reflection.answer ? "Bạn đã trả lời" : "Mở để trả lời"}</span>
                </span>
                <span className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="px-2 pb-2">
                <ReflectionCard question={reflection.question.text} answer={reflection.answer} />
              </div>
            </details>
          )}

          <Link href="/nhat-ky" className={ROW}>
            <span className="text-2xl" aria-hidden>
              📓
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Nhật ký</span>
              <span className="block text-sm text-muted">Viết vài dòng cho chính mình</span>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </Section>

      <SideSheetButton icon="📅" label="Gần đây">
        {recent}
      </SideSheetButton>

      <RightPanel aria-label="Gần đây" className="hidden xl:block">
        {recent}
      </RightPanel>
    </div>
  );
}

/** Panel "Gần đây": cảm xúc 7 ngày qua (mỗi ngày cảm xúc nổi bật nhất), lối sang Tâm trạng và Hành trình. */
function RecentPanel({ today, moods }: { today: string; moods: Awaited<ReturnType<typeof getMoodByDay>> }) {
  return (
    <>
      <div className={side.head}>
        <h2 className={side.title}>Gần đây</h2>
        <p className={side.desc}>Cảm xúc bạn ghi trong 7 ngày qua.</p>
      </div>
      <ol className="grid grid-cols-7 gap-1 px-3">
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
      <Link href="/tam-trang" className={cn(side.action, "mt-3")}>
        Xem Tâm trạng <span aria-hidden>→</span>
      </Link>

      <section className="mt-6">
        <h3 className={side.group}>Xem thêm</h3>
        <Link href="/hanh-trinh" className={cn(side.row, "mt-1 gap-3")}>
          <span aria-hidden className="w-5 shrink-0 text-center text-base">
            🧭
          </span>
          <span className="min-w-0">
            <span className={side.rowTitle}>Hành trình của mình</span>
            <span className={side.rowSub}>Kỹ năng đã luyện, chuyện bận lòng, ghi nhận</span>
          </span>
        </Link>
      </section>
    </>
  );
}
