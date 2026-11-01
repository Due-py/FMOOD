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
import { STEP_LABEL, type PracticeStep } from "@/lib/practice/state";
import { SKILLS } from "@/lib/skills";
import { pendingSurveys } from "@/lib/surveys-server";
import { greeting, moodForHour } from "@/lib/mascot";
import { waitingLine } from "@/lib/worries-shared";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { ArrowUpRight, BookIcon, ChatIcon, ChevronDownIcon, TargetIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ChallengeCard, HelpReplyCard } from "./ClassCards";
import { FollowupCard } from "./FollowupCard";
import { PracticeFollowupCard } from "./PracticeFollowupCard";

export const metadata: Metadata = { title: "Hôm nay" };

/** Một dòng bấm được trong danh sách "còn lại". */
const ROW = "flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:border-brand-edge";

const STEPS: PracticeStep[] = ["H", "M", "T", "G", "N"];

/** Năm vạch H–M–T–G–N: vạch đã qua tô màu, để thấy bài dừng ở đâu. */
function StepBars({ step }: { step: PracticeStep }) {
  const at = STEPS.indexOf(step);
  return (
    <span className="flex gap-1" aria-hidden>
      {STEPS.map((s, i) => (
        <span key={s} className={cn("h-1.5 w-5 rounded-full", i <= at ? "bg-brand-edge" : "bg-line")} />
      ))}
    </span>
  );
}

/**
 * HÔM NAY (phương án A, Duy 01/11): Kiến gợi ý MỘT việc hợp nhất lúc này, mỗi lúc một điều, không giao việc.
 * Thứ tự: thầy cô đã trả lời → hỏi lại chuyện bận lòng → hỏi lại bài luyện → bài đang dở → khảo sát → thử thách lớp
 * → chưa ghi cảm xúc → mời kể chuyện. Dưới đó: dải 7 ngày (ô Nay là chỗ ghi cảm xúc hôm nay), ba lối vào ngang hàng
 * (Kể / Luyện / Nhật ký), mọi việc còn lại gộp vào một dòng mở ra được. Không còn panel phải: 7 ngày đã ở cột giữa.
 * Check-in vẫn tùy chọn, không chặn chat hay luyện.
 */
export default async function HomePage() {
  const profile = await requireProfile();
  const today = dayKey();
  const hour = currentHour();
  const name = await assistantName();

  const [moods, surveys, followup, helpRequests, challenges, overview] = await Promise.all([
    getMoodByDay(profile.id, addDays(today, -6), today),
    pendingSurveys(profile),
    followupLoop(profile),
    myHelpRequests(profile),
    challengesForStudent(profile),
    practiceOverview(profile.id),
  ]);
  // hỏi lại bài luyện 1–3 ngày sau khi xong; chuyện bận lòng tới hạn được ưu tiên
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

  // ứng viên cho lời gợi ý của Kiến, theo thứ tự ưu tiên; cái đầu được nói, còn lại vào "Còn …"
  type Item = { key: string; kind: "practice" | "notice"; line: string; cta?: { href: string; label: string }; node: React.ReactNode };
  const items: Item[] = [];
  for (const r of helpRequests.filter((r) => r.status !== "new"))
    items.push({ key: `h-${r.id}`, kind: "notice", line: "Thầy cô đã trả lời lời nhờ của bạn.", node: <HelpReplyCard request={r} /> });
  if (followup)
    items.push({
      key: "followup",
      kind: "notice",
      line: followup.waitingDays ? waitingLine(Number(today.replaceAll("-", ""))) : "Hôm trước bạn có kể một chuyện bận lòng. Giờ chuyện đó thế nào rồi?",
      node: <FollowupCard loop={followup} />,
    });
  if (practiceAsk)
    items.push({
      key: "practice-ask",
      kind: "notice",
      line: `Mấy hôm trước bạn luyện “${SKILLS[practiceAsk.skill].name}”. Mình muốn hỏi lại một câu nhỏ thôi.`,
      node: <PracticeFollowupCard followup={practiceAsk} />,
    });
  for (const { session: o, older } of open)
    items.push({
      key: `o-${o.id}`,
      kind: "practice",
      line: `Lần trước bạn dừng ở bước ${STEP_LABEL[o.step]} của bài “${SKILLS[o.skill].name}”. Làm tiếp vài phút nhé?`,
      cta: { href: `/luyen/bai/${o.id}`, label: "Làm tiếp" },
      node: (
        <Link href={`/luyen/bai/${o.id}`} className={ROW}>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block truncate font-semibold">{SKILLS[o.skill].name}</span>
            <span className="flex items-center gap-2 text-sm text-muted">
              <StepBars step={o.step} />
              Dừng ở bước {STEP_LABEL[o.step]}
              {older > 0 && ` · và ${older} bài dở cũ hơn`}
            </span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      ),
    });
  for (const r of helpRequests.filter((r) => r.status === "new"))
    items.push({ key: `h-${r.id}`, kind: "notice", line: "Lời nhờ của bạn đã gửi tới thầy cô. Thầy cô sẽ trả lời ở đây.", node: <HelpReplyCard request={r} /> });
  for (const sv of surveys)
    items.push({
      key: `s-${sv.id}`,
      kind: "notice",
      line: `Có một khảo sát mới: “${sv.title}”. Bạn làm lúc nào tiện cũng được.`,
      cta: { href: `/survey/${sv.id}`, label: "Mở khảo sát" },
      node: (
        <Link href={`/survey/${sv.id}`} className={ROW}>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Khảo sát mới</span>
            <span className="block truncate font-semibold">{sv.title}</span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      ),
    });
  for (const c of challenges)
    items.push({ key: `c-${c.id}`, kind: "notice", line: "Lớp bạn có một thử thách mới, tham gia hay không là tùy bạn.", node: <ChallengeCard challenge={c} /> });

  const [top, ...rest] = items;
  // không có việc gì đang chờ: chưa ghi cảm xúc thì mời ghi (không bắt buộc), ghi rồi thì mời kể chuyện
  const idle = checkedIn
    ? { line: "Hôm nay không có việc gì đang chờ bạn. Có điều gì muốn kể không? Mình nghe đây.", cta: { href: "/chat/new?tu=trang-chu", label: `Kể với ${name}` } }
    : { line: "Hôm nay bạn thấy thế nào? Ghi lại nếu bạn muốn, không bắt buộc đâu.", cta: { href: "/checkin", label: "Ghi cảm xúc" } };
  const say = top ?? idle;
  // thẻ có nút bấm riêng (hỏi lại, thầy cô trả lời, thử thách) hiện ngay dưới lời Kiến; thẻ chỉ là lối đi thì nút nằm trong lời
  const topCard = top && !top.cta ? top.node : null;

  const restPractice = rest.filter((i) => i.kind === "practice").length;
  const restNotice = rest.length - restPractice;
  const restLabel = [restPractice && `${restPractice} bài dở`, restNotice && `${restNotice} thông báo`].filter(Boolean).join(" và ");

  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-6">
      {/* Kiến nói một điều */}
      <section className="flex items-start gap-3">
        <CharacterAvatar size={56} mood={checkedIn ? "happy" : moodForHour(hour)} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="rounded-3xl rounded-tl-md border border-brand-edge/50 bg-surface px-5 py-4">
            <h1 className="text-sm font-semibold text-muted">
              {greeting(hour)}, {profile.nickname}
            </h1>
            <p className="mt-1 font-display text-lg font-bold leading-snug tracking-tight sm:text-xl">{say.line}</p>
            {say.cta && (
              <Link href={say.cta.href} className={cn(btn.primary, "mt-4 px-5")}>
                {say.cta.label}
              </Link>
            )}
          </div>
          {topCard}
        </div>
      </section>

      <WeekStrip today={today} moods={moods} todayLabel={todayEmotions.map((e) => `${e!.emoji} ${e!.label}`).join(" · ")} />

      {/* ba lối vào ngang hàng: xếp dọc trên điện thoại */}
      <nav aria-label="Bắt đầu" className="grid gap-2 sm:grid-cols-3">
        <EntryLink href="/chat/new?tu=trang-chu" icon={<ChatIcon size={20} />} title="Kể điều đang nghĩ" sub={`Trò chuyện với ${name}`} />
        <EntryLink href="/ky-nang" icon={<TargetIcon size={20} />} title="Luyện một kỹ năng" sub="Khoảng 10 phút" />
        <EntryLink href="/nhat-ky" icon={<BookIcon size={20} />} title="Viết nhật ký" sub="Vài dòng cho mình" />
      </nav>

      {rest.length > 0 && (
        <details className="group rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-semibold">
            Còn {restLabel} khác
            <ChevronDownIcon size={18} className="shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <div className="space-y-2 px-3 pb-3">
            {rest.map((i) => (
              <div key={i.key}>{i.node}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EntryLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 transition hover:border-brand-edge">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{title}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </Link>
  );
}

/** Dải 7 ngày: mỗi ngày cảm xúc nổi bật nhất; ô Nay và dòng dưới là chỗ ghi cảm xúc hôm nay. */
function WeekStrip({ today, moods, todayLabel }: { today: string; moods: Awaited<ReturnType<typeof getMoodByDay>>; todayLabel: string }) {
  return (
    <section aria-labelledby="bay-ngay" className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="bay-ngay" className="text-sm font-bold">
          7 ngày qua
        </h2>
        <Link href="/tam-trang" className="text-sm font-semibold text-brand-strong hover:underline">
          Xem Tâm trạng <span aria-hidden>→</span>
        </Link>
      </div>
      <ol className="mt-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((day) => {
          const mood = moods.get(day);
          const top = mood ? dominantEmotion(mood.emotions) : undefined;
          const isToday = day === today;
          return (
            <li key={day} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl text-lg",
                  !top && "border border-dashed border-line",
                  isToday && "ring-2 ring-brand-edge ring-offset-2 ring-offset-surface",
                )}
                style={top ? { backgroundColor: `${top.color}2e` } : undefined}
                title={top?.label}
              >
                {top?.emoji ?? ""}
              </span>
              <span className={cn("text-xs", isToday ? "font-semibold text-ink" : "text-muted")}>{isToday ? "Nay" : weekdayLabel(day)}</span>
            </li>
          );
        })}
      </ol>
      <Link href="/checkin" className="mt-3 flex min-h-11 items-center gap-3 border-t border-line pt-3">
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-muted">Hôm nay: </span>
          {todayLabel ? <span className="font-semibold">{todayLabel}</span> : <span className="text-muted">chưa ghi · không bắt buộc</span>}
        </span>
        <span className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-semibold transition hover:border-brand-edge">
          {todayLabel ? "Ghi lại" : "Ghi"}
        </span>
      </Link>
    </section>
  );
}
