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
import { CASEL, subskill } from "@/lib/sel/casel";
import { SKILLS, type SkillId } from "@/lib/skills";
import { pendingSurveys } from "@/lib/surveys-server";
import { greeting } from "@/lib/mascot";
import { waitingLine } from "@/lib/worries-shared";
import { MascotArt } from "@/components/mascot/MascotArt";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ChallengeCard, HelpReplyCard } from "./ClassCards";
import { FollowupCard } from "./FollowupCard";
import { PracticeFollowupCard } from "./PracticeFollowupCard";

export const metadata: Metadata = { title: "Hôm nay" };

// Giao diện vui (mẫu hom-nay.html, Duy duyệt 02/11): nhân vật vẫy tay cạnh bong bóng lời nói, thẻ bóng mềm thay viền,
// ba lối vào nền pastel, chấm 5 bước cho bài đang dở. Thứ tự ưu tiên và dữ liệu giữ nguyên.

/** Một dòng bấm được trong danh sách "còn lại": thẻ trắng bóng mềm, ô biểu tượng màu, mũi tên tròn. */
const ROW =
  "flex min-h-16 items-center gap-3 rounded-[20px] bg-surface px-3.5 py-3 shadow-soft transition hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border dark:border-line";
const ROW_ICON = "flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-tint text-[22px]";
const ROW_ARROW = "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-strong";

const STEPS: PracticeStep[] = ["H", "M", "T", "G", "N"];

/** Màu nhóm năng lực của một bài luyện (tone-1…tone-5), để ô biểu tượng cùng màu với trang Luyện kỹ năng. */
const skillTone = (skill: SkillId) => `tone-${CASEL[subskill(skill).primary].tone}`;

/** Chữ trích tên bài trong lời nhân vật: đặt trong ngoặc kép, tô xanh lá như mẫu. */
function Q({ children }: { children: React.ReactNode }) {
  return <span className="text-c2-ink">“{children}”</span>;
}

/** Năm vạch H–M–T–G–N: vạch đã qua tô màu, để thấy bài dừng ở đâu. */
function StepBars({ step }: { step: PracticeStep }) {
  const at = STEPS.indexOf(step);
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {STEPS.map((s, i) => (
        <span key={s} className={cn("h-1.5 w-4 rounded-full", i <= at ? "bg-brand-edge" : "bg-line")} />
      ))}
    </span>
  );
}

/** Năm chấm tròn có tên bước: bước đã qua có dấu ✓, bước đang dừng phóng to. */
function StepPath({ step }: { step: PracticeStep }) {
  const at = STEPS.indexOf(step);
  return (
    <div role="img" aria-label={`Bước ${at + 1} trên 5: ${STEP_LABEL[step]}`} className="flex items-start">
      {STEPS.map((s, i) => (
        <span key={s} className="contents">
          {i > 0 && <span aria-hidden className="mt-[11px] h-0.5 min-w-0.5 max-w-[18px] flex-1 bg-brand-edge/40" />}
          <span aria-hidden className="flex w-11 shrink-0 flex-col items-center gap-1 sm:w-[60px]">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                i < at && "border-brand-edge bg-brand-edge text-surface",
                i === at && "scale-[1.18] border-brand-edge bg-brand text-brand-ink",
                i > at && "border-brand-edge/40 bg-surface",
              )}
            >
              {i < at ? "✓" : i + 1}
            </span>
            <span className={cn("text-center text-[10.5px] leading-tight", i === at ? "font-bold text-brand-strong" : "text-muted")}>{STEP_LABEL[s]}</span>
          </span>
        </span>
      ))}
    </div>
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
  // `practice`: bài đang dở thì lời nói kèm khung 5 bước + nút Làm tiếp; `cta`: lối đi một nút
  type Item = {
    key: string;
    kind: "practice" | "notice";
    line: React.ReactNode;
    cta?: { href: string; label: string };
    practice?: { href: string; step: PracticeStep; skill: SkillId };
    node: React.ReactNode;
  };
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
      line: (
        <>
          Mấy hôm trước bạn luyện <Q>{SKILLS[practiceAsk.skill].name}</Q>. Mình muốn hỏi lại một câu nhỏ thôi.
        </>
      ),
      node: <PracticeFollowupCard followup={practiceAsk} />,
    });
  for (const { session: o, older } of open)
    items.push({
      key: `o-${o.id}`,
      kind: "practice",
      line: (
        <>
          Lần trước bạn dừng ở bước {STEP_LABEL[o.step]} của bài <Q>{SKILLS[o.skill].name}</Q>. Làm tiếp vài phút nhé?
        </>
      ),
      practice: { href: `/luyen/bai/${o.id}`, step: o.step, skill: o.skill },
      node: (
        <Link href={`/luyen/bai/${o.id}`} className={cn(ROW, skillTone(o.skill))}>
          <span className={ROW_ICON} aria-hidden>
            {SKILLS[o.skill].emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold leading-tight">{SKILLS[o.skill].name}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <StepBars step={o.step} />
              Dừng ở bước {STEP_LABEL[o.step]}
              {older > 0 && ` · và ${older} bài dở cũ hơn`}
            </span>
          </span>
          <span className={ROW_ARROW} aria-hidden>
            →
          </span>
        </Link>
      ),
    });
  for (const r of helpRequests.filter((r) => r.status === "new"))
    items.push({ key: `h-${r.id}`, kind: "notice", line: "Lời nhờ của bạn đã gửi tới thầy cô. Thầy cô sẽ trả lời ở đây.", node: <HelpReplyCard request={r} /> });
  for (const sv of surveys)
    items.push({
      key: `s-${sv.id}`,
      kind: "notice",
      line: (
        <>
          Có một khảo sát mới: <Q>{sv.title}</Q>. Bạn làm lúc nào tiện cũng được.
        </>
      ),
      cta: { href: `/survey/${sv.id}`, label: "Mở khảo sát" },
      node: (
        <Link href={`/survey/${sv.id}`} className={cn(ROW, "tone-3")}>
          <span className={ROW_ICON} aria-hidden>
            📝
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">Khảo sát mới</span>
            <span className="block truncate font-bold">{sv.title}</span>
          </span>
          <span className={ROW_ARROW} aria-hidden>
            →
          </span>
        </Link>
      ),
    });
  for (const c of challenges)
    items.push({ key: `c-${c.id}`, kind: "notice", line: "Lớp bạn có một thử thách mới, tham gia hay không là tùy bạn.", node: <ChallengeCard challenge={c} /> });

  const [top, ...rest] = items;
  // không có việc gì đang chờ: chưa ghi cảm xúc thì mời ghi (không bắt buộc), ghi rồi thì mời kể chuyện
  const idle: Pick<Item, "line" | "cta"> = checkedIn
    ? { line: "Hôm nay không có việc gì đang chờ bạn. Có điều gì muốn kể không? Mình nghe đây.", cta: { href: "/chat/new?tu=trang-chu", label: `Kể với ${name}` } }
    : { line: "Hôm nay bạn thấy thế nào? Ghi lại nếu bạn muốn, không bắt buộc đâu.", cta: { href: "/checkin", label: "Ghi cảm xúc" } };
  const say = top ?? idle;
  const practice = top?.practice;
  // thẻ có nút bấm riêng (hỏi lại, thầy cô trả lời, thử thách) hiện ngay dưới lời Kiến; thẻ chỉ là lối đi thì nút nằm trong lời
  const topCard = top && !top.cta && !top.practice ? top.node : null;

  const restPractice = rest.filter((i) => i.kind === "practice").length;
  const restNotice = rest.length - restPractice;
  const restLabel = [restPractice && `${restPractice} bài dở`, restNotice && `${restNotice} thông báo`].filter(Boolean).join(" và ");

  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-6">
      {/* Kiến nói một điều: nhân vật vẫy tay cạnh bong bóng lời nói; trên điện thoại nhân vật đứng trên bong bóng */}
      <section aria-label={`${name} gợi ý`} className="space-y-4">
        <div className="flex flex-col items-start sm:flex-row sm:items-end sm:gap-1">
          <MascotArt size={104} float className="relative z-10 -mb-3.5 ml-2 h-auto w-[72px] sm:-mb-1 sm:ml-0 sm:w-[104px]" />
          <div className="w-full min-w-0 flex-1 rounded-[8px_26px_26px_26px] bg-surface px-4 pb-4 pt-[18px] shadow-soft sm:rounded-[28px_28px_28px_8px] sm:px-[22px] sm:pb-5 dark:border dark:border-line">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-0.5 text-[13px] font-bold text-brand-strong">
              <span aria-hidden>{hour < 5 || hour >= 18 ? "🌙" : "🌤️"}</span>
              {greeting(hour)}, {profile.nickname}
            </p>
            <h1 className="mt-2 font-display text-[21px] font-extrabold leading-[1.22] tracking-tight sm:text-[25px]">{say.line}</h1>
            {practice ? (
              <div className="mt-3.5 flex flex-wrap items-center gap-3.5 rounded-[22px] border-2 border-dashed border-brand-edge/40 bg-brand-soft p-3 sm:flex-nowrap sm:px-3.5">
                <span className="flex size-11 shrink-0 -rotate-6 items-center justify-center rounded-[18px] bg-surface text-[22px] shadow-soft sm:size-[50px] sm:text-[26px]" aria-hidden>
                  {SKILLS[practice.skill].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <StepPath step={practice.step} />
                </div>
                <Link href={practice.href} className={cn(btn.primary, "w-full whitespace-nowrap px-5 sm:w-auto")}>
                  Làm tiếp nào <span aria-hidden>→</span>
                </Link>
              </div>
            ) : (
              say.cta && (
                <Link href={say.cta.href} className={cn(btn.primary, "mt-4 px-5")}>
                  {say.cta.label}
                  {say.cta.href === "/checkin" && <span aria-hidden>✏️</span>}
                </Link>
              )
            )}
          </div>
        </div>
        {topCard}
      </section>

      <WeekStrip today={today} moods={moods} todayLabel={todayEmotions.map((e) => `${e!.emoji} ${e!.label}`).join(" · ")} />

      {/* ba lối vào ngang hàng, mỗi lối một màu pastel: xếp dọc trên điện thoại */}
      <nav aria-label="Bắt đầu" className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        <EntryLink href="/chat/new?tu=trang-chu" tone="tone-3" emoji="💬" title="Kể điều đang nghĩ" sub={`Trò chuyện với ${name}`} />
        <EntryLink href="/ky-nang" tone="tone-5" emoji="🎯" title="Luyện một kỹ năng" sub="Khoảng 10 phút" />
        <EntryLink href="/nhat-ky" tone="tone-1" emoji="📓" title="Viết nhật ký" sub="Vài dòng cho mình" />
      </nav>

      {rest.length > 0 && (
        <details className="group rounded-[24px] border-2 border-dashed border-ink/15 bg-surface/60">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-[22px] px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="text-xl">
              📬
            </span>
            <span className="min-w-0 flex-1">Còn {restLabel} khác</span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-surface px-3 py-1 text-[13px]">
              <span className="group-open:hidden">
                Mở ra <span aria-hidden>▾</span>
              </span>
              <span className="hidden group-open:inline">
                Gấp lại <span aria-hidden>▴</span>
              </span>
            </span>
          </summary>
          <div className="space-y-2.5 px-3 pb-3">
            {rest.map((i) => (
              <div key={i.key}>{i.node}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EntryLink({ href, tone, emoji, title, sub }: { href: string; tone: string; emoji: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className={cn(
        tone,
        "relative flex min-h-[72px] items-center gap-3 rounded-[24px] bg-tint px-3.5 py-3 transition duration-150 hover:-translate-y-[3px] hover:-rotate-[0.6deg] motion-reduce:transition-none motion-reduce:hover:transform-none sm:min-h-[150px] sm:flex-col sm:items-start sm:gap-1.5 sm:p-4",
      )}
    >
      <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[18px] bg-surface text-2xl sm:size-[52px] sm:text-[27px]" aria-hidden>
        {emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col sm:mt-0.5 sm:flex-none sm:pr-9">
        <span className="font-display text-lg font-bold leading-tight text-tink sm:text-[19px]">{title}</span>
        <span className="text-[13px] text-muted">{sub}</span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface font-bold text-tink sm:absolute sm:bottom-3.5 sm:right-3.5" aria-hidden>
        →
      </span>
    </Link>
  );
}

/** Dải 7 ngày: mỗi ngày cảm xúc nổi bật nhất; ô Nay và dòng dưới là chỗ ghi cảm xúc hôm nay. */
function WeekStrip({ today, moods, todayLabel }: { today: string; moods: Awaited<ReturnType<typeof getMoodByDay>>; todayLabel: string }) {
  return (
    <section aria-labelledby="bay-ngay" className="rounded-[24px] bg-surface px-3.5 py-4 shadow-soft sm:rounded-[28px] sm:px-5 sm:py-[18px] dark:border dark:border-line">
      <div className="flex items-center justify-between gap-2.5">
        <h2 id="bay-ngay" className="font-display text-[21px] font-extrabold leading-tight">
          <span aria-hidden>🗓️ </span>7 ngày qua
        </h2>
        {/* viên thuốc nhỏ; vùng bấm nới ra trên dưới cho đủ 44px */}
        <Link
          href="/tam-trang"
          className="relative whitespace-nowrap rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand-strong transition after:absolute after:inset-x-0 after:-inset-y-1.5 hover:brightness-95"
        >
          Xem Tâm trạng <span aria-hidden>→</span>
        </Link>
      </div>
      <ol className="mt-3.5 grid grid-cols-7 gap-[5px] sm:gap-2">
        {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((day) => {
          const mood = moods.get(day);
          const top = mood ? dominantEmotion(mood.emotions) : undefined;
          const isToday = day === today;
          const label = isToday ? "Nay" : weekdayLabel(day);
          const tile = "flex aspect-square w-full max-w-[58px] items-center justify-center rounded-[14px] text-[21px] sm:rounded-[18px] sm:text-[26px]";
          return (
            <li key={day} className="flex flex-col items-center gap-[5px]">
              {isToday && !top ? (
                // ô Nay chưa ghi: dấu + mời ghi (cùng lối với dòng "Hôm nay" bên dưới, nên bỏ khỏi thứ tự Tab)
                <Link
                  href="/checkin"
                  tabIndex={-1}
                  aria-hidden
                  title="Ghi cảm xúc hôm nay"
                  className={cn(tile, "border-2 border-dashed border-brand-edge bg-surface text-lg font-bold text-brand-strong ring-4 ring-brand-soft sm:text-[22px]")}
                >
                  +
                </Link>
              ) : (
                <span
                  role="img"
                  aria-label={`${label}: ${top?.label ?? "chưa ghi"}`}
                  className={cn(tile, !top && "border-2 border-dashed border-line bg-surface-2/50", isToday && "ring-4 ring-brand-soft")}
                  style={top ? { backgroundColor: `${top.color}2e` } : undefined}
                  title={top?.label}
                >
                  {top?.emoji ?? ""}
                </span>
              )}
              <span aria-hidden className={cn("text-xs font-semibold", isToday ? "rounded-full bg-brand px-2 font-bold text-brand-ink" : "text-muted")}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <Link href="/checkin" className="mt-3.5 flex min-h-11 items-center gap-3 rounded-[18px] bg-brand-soft py-2.5 pl-4 pr-2.5">
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-muted">Hôm nay: </span>
          {todayLabel ? <span className="font-semibold">{todayLabel}</span> : <span>chưa ghi · không bắt buộc đâu</span>}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-brand-edge bg-brand px-4 py-1.5 text-sm font-bold text-brand-ink shadow-[0_3px_0_var(--brand-edge)]">
          {todayLabel ? "Ghi lại" : "Ghi"} <span aria-hidden>✏️</span>
        </span>
      </Link>
    </section>
  );
}
