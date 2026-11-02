"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  deletePractice,
  finishPractice,
  practiceBridge,
  practiceExample,
  practiceHint,
  practiceRoleplay,
  requestPracticeFeedback,
  startPractice,
  stepPractice,
  submitPractice,
} from "@/app/actions/practice";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/lib/drafts";
import { LIMITS, type AttemptView, type PracticeFeedback, type PracticeResult, type PracticeView as View } from "@/lib/practice/shared";
import { roleplayBlocked, roleplayOf, roleplayOpening, turnLabel } from "@/lib/practice/roleplay";
import { MAX_FEEDBACK, missingRequired, PRACTICE_STEPS, STATE_LABEL, STEP_LABEL, type Answers, type PracticeStep } from "@/lib/practice/state";
import { ROLEPLAY_BREAK_TEXT } from "@/lib/safety/crisis-text";
import { CASEL, subskill } from "@/lib/sel/casel";
import { SKILLS, type Skill } from "@/lib/skills";
import { FIELD_SHORT, SKILL_CONTRAST, type SkillSample } from "@/lib/skill-samples";
import { MascotArt } from "@/components/mascot/MascotArt";
import { RightPanel } from "@/components/RightPanel";
import { SideSheet } from "@/components/SideSheet";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { BackPill, bubble, chunkyWhite } from "../../vui";
import { CrisisNotice, type SupportCards } from "../../CrisisNotice";

type Hint = { hints: string[] | null; showExample: boolean };

// ───────── Kiểu giao diện vui (Duy duyệt mẫu bài luyện 02/11) ─────────
// Bước là "hành trình" 5 chặng có nhân vật đứng ở chặng đang làm; lời hướng dẫn mỗi bước là bong bóng thoại của nhân vật;
// mỗi ô viết là một thẻ trắng bóng mềm có nhãn "✱ cần có"; "Mình chưa biết" là viên tím nhạt; gợi ý nền bạc hà.
// Trang bọc class tone-N (màu nhóm năng lực) nên bg-tint / text-tink là màu của nhóm.

/** Hình trang trí cho 5 bước (chỉ để nhìn, không đọc). */
const STEP_EMOJI: Record<PracticeStep, string> = {
  H: "💡",
  M: "👀",
  T: "✏️",
  G: "💬",
  N: "🌟",
};

/** Thẻ trắng bóng mềm (cột tham chiếu, ô viết, bài đã lưu). */
const softCard = "rounded-3xl bg-surface shadow-soft dark:border dark:border-line";
/** Thẻ của cột tham chiếu: chưa có màu nền, ghép thêm bg-surface hoặc bg-tint. */
const railCard = "rounded-[26px] p-4 shadow-soft dark:border dark:border-line";
/** Ô viết trong thẻ. */
const fieldInput =
  "block w-full resize-y rounded-2xl border-2 border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-muted focus:border-brand-edge focus:ring-4 focus:ring-brand/25";
/** Nhãn nhỏ dạng viên (bài lần 1, mẫu…). */
const tag = "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold";

/**
 * Bài luyện một kỹ năng, chu trình H-M-T-G-N. Trình duyệt chỉ hiện và gửi nút học sinh bấm;
 * máy chủ quyết định bước và trạng thái (app/actions/practice.ts, lib/practice/state.ts).
 */
export function PracticeView({
  userId,
  nickname,
  initial,
  nextCase,
  sample,
  supportCards,
}: {
  userId: string;
  /** tên học sinh, để nhân vật gọi tên trong bong bóng thoại */
  nickname: string;
  initial: View;
  /** mục 4.2: tình huống mẫu khác cùng kỹ năng, gợi ý khi đã luyện xong */
  nextCase: { code: string; situation: string } | null;
  /** mẫu của bài này từ ngân hàng mẫu đã duyệt (lib/skill-samples.ts), máy chủ chọn */
  sample: SkillSample;
  supportCards: SupportCards;
}) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<{
    text: string;
    notified: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  // câu trợ lý đáp ở bước Nhìn lại (chỉ hiện ngay sau khi xong, không lưu)
  const [reaction, setReaction] = useState<string | null>(null);
  // xem lại bước Hiểu / Mẫu đã qua (chỉ đọc, không đổi bước của bài)
  const [peek, setPeek] = useState<"H" | "M" | null>(null);
  // ngăn kéo "Tình huống & tiêu chí" (< 1280px; từ 1280px là cột tham chiếu neo mép phải)
  const [sheet, setSheet] = useState(false);
  const skill = SKILLS[view.skill];
  const comp = CASEL[subskill(skill.id).primary];

  // bước Hiểu với tình huống riêng: xin trợ lý một câu nối (một lần mỗi bài; lỗi thì thôi, câu Hiểu soạn sẵn vẫn đủ)
  const askedBridge = useRef(false);
  const needBridge = view.step === "H" && view.own && !view.bridge && view.state !== "safety" && view.state !== "paused";
  useEffect(() => {
    if (!needBridge || askedBridge.current) return;
    askedBridge.current = true;
    void practiceBridge(view.id)
      .then((res) => {
        if (res.ok && res.view.bridge) setView((v) => ({ ...v, bridge: res.view.bridge }));
      })
      .catch(() => {});
  }, [needBridge, view.id]);

  /** Gọi một nút; cập nhật bài theo kết quả máy chủ. Trả kết quả để nút xử lý thêm. */
  function run<T extends object>(name: string, action: () => Promise<PracticeResult<T>>, after?: (res: Extract<PracticeResult<T>, { ok: true }>) => void) {
    setError(null);
    setBusy(name);
    startTransition(async () => {
      const res = await action();
      setBusy(null);
      if (res.ok) {
        setView(res.view);
        after?.(res as Extract<PracticeResult<T>, { ok: true }>);
      } else if ("crisis" in res) {
        setCrisis(res.crisis);
        setView((v) => ({ ...v, state: "safety" }));
      } else {
        setError(res.error);
        if (res.view) setView(res.view);
      }
    });
  }

  if (crisis) {
    return (
      <div className="space-y-6">
        <BackPill />
        <CrisisNotice text={crisis.text} notified={crisis.notified} cards={supportCards} />
      </div>
    );
  }

  const railed = view.state !== "safety";
  const pausable = view.state !== "paused" && view.state !== "completed";
  // trong ngăn kéo: chừa chỗ cho nút ✕ của ngăn kéo phía trên thẻ đầu
  const rail = (inSheet: boolean) => (
    <div className={inSheet ? "pt-9" : undefined}>
      <PracticeRail
        view={view}
        skill={skill}
        peek={peek}
        onPeek={(s) => {
          setPeek(s);
          if (inSheet) setSheet(false);
        }}
        pause={
          pausable
            ? {
                busy: busy === "pause",
                pending,
                onClick: () => {
                  setSheet(false);
                  run("pause", () => stepPractice(view.id, "pause"));
                },
              }
            : null
        }
      />
    </div>
  );

  // Bố cục (Duy duyệt 01/11): từ 1280px cột tham chiếu neo mép phải (RightPanel), cột làm bài 768px căn giữa vùng còn lại
  // như khung chat Học cùng AI. data-chat-page: layout bỏ giới hạn rộng của main và cho panel 300–360px như Học cùng AI.
  // Nhỏ hơn 1280px: tình huống ngay dưới hành trình, nút mở ngăn kéo cùng nội dung cột tham chiếu.
  // Hành trình 5 bước hiện ở mọi cỡ màn hình (mẫu 02/11), cột tham chiếu vẫn có danh sách bước gọn.
  return (
    <div data-chat-page className={cn("mx-auto w-full max-w-3xl space-y-5", `tone-${comp.tone}`)}>
      <BackPill />
      <header className="space-y-3">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-tint px-3 py-0.5 text-xs text-tink">
              <span className="font-bold">
                <span aria-hidden>{skill.emoji} </span>
                {comp.friendly}
              </span>
              <span aria-hidden>·</span>
              <span className="font-medium">{comp.name}</span>
            </p>
            <h1 className="mt-1.5 font-display text-[25px] font-extrabold leading-[1.1] sm:text-[30px]">{skill.name}</h1>
          </div>
          {view.state !== "not_started" && (
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-extrabold",
                view.state === "safety" ? "bg-surface-2 text-ink" : "-rotate-2 bg-c1 text-c1-ink",
              )}
            >
              {STATE_LABEL[view.state]}
            </span>
          )}
        </div>
        <Journey view={view} peek={peek} onPeek={setPeek} />
        {railed && (
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-haspopup="dialog"
            className={cn(
              softCard,
              "flex min-h-11 w-full items-center justify-between px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5 motion-reduce:transform-none xl:hidden",
            )}
          >
            <span>
              <span aria-hidden>📋 </span>Tình huống &amp; tiêu chí
            </span>
            <span aria-hidden>›</span>
          </button>
        )}
        {view.situation && (
          <div className={cn("rounded-[20px] bg-tint px-4 py-3 text-sm", railed && "xl:hidden")}>
            <span className="block text-xs font-extrabold text-tink">{view.own ? "Tình huống của bạn" : "Tình huống mẫu"}</span>
            {view.situation}
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {view.state === "safety" ? (
        <Stopped cards={supportCards} />
      ) : view.state === "paused" ? (
        <section className={cn(softCard, "flex gap-4 p-5")}>
          <span aria-hidden className="grid size-12 shrink-0 -rotate-6 place-items-center rounded-2xl bg-c1 text-2xl">
            ⏸️
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-snug">Bài đang tạm dừng. Những gì bạn đã viết vẫn được giữ.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => run("resume", () => stepPractice(view.id, "resume"))} className={btn.primary}>
                {busy === "resume" ? "Đang mở…" : "Làm tiếp →"}
              </button>
              <DeleteButton id={view.id} onDeleted={() => router.push("/luyen")} />
            </div>
          </div>
        </section>
      ) : view.state === "completed" ? (
        <Completed view={view} skill={skill} reaction={reaction} nextCase={nextCase} />
      ) : (
        <>
          {peek && peek !== view.step && <PeekPanel step={peek} skill={skill} sample={sample} onClose={() => setPeek(null)} />}
          {view.step === "H" && <UnderstandStep view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}
          {view.step === "M" && <ExampleStep view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}
          {view.step === "T" && (
            <WriteStep userId={userId} nickname={nickname} view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />
          )}
          {view.step === "G" && (
            <FeedbackStep userId={userId} cards={supportCards} view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />
          )}
          {view.step === "N" && (
            <ReviewStep userId={userId} onReaction={setReaction} view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />
          )}

          {/* từ 1280px "Dừng ở đây" nằm ở cuối cột tham chiếu */}
          <footer className="flex flex-wrap items-center gap-2.5 pt-2 xl:hidden">
            <button
              type="button"
              disabled={pending}
              onClick={() => run("pause", () => stepPractice(view.id, "pause"))}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-bold shadow-soft transition hover:bg-surface-2 disabled:opacity-50 dark:border dark:border-line"
            >
              <span aria-hidden>⏸️</span> {busy === "pause" ? "Đang lưu…" : "Dừng ở đây"}
            </button>
            <span className="text-xs text-muted">Bài viết được giữ, lúc nào muốn thì làm tiếp.</span>
          </footer>
        </>
      )}

      {railed && (
        <RightPanel
          bare
          aria-label="Tình huống và tiêu chí của bài luyện"
          className="hidden xl:bottom-0 xl:block xl:overflow-y-auto xl:border-l xl:border-line xl:bg-surface/50 xl:px-[18px] xl:pb-6 xl:pt-6"
        >
          {rail(false)}
        </RightPanel>
      )}
      {railed && sheet && (
        <SideSheet label="Tình huống và tiêu chí" onClose={() => setSheet(false)}>
          {rail(true)}
        </SideSheet>
      )}
    </div>
  );
}

// ───────── Hành trình 5 bước ─────────

// đường chấm nối 5 chặng (khung 400×40, chặng ở x = 0, 100, …, 400; chặng chẵn thấp hơn): mỗi đoạn nối hai chặng kề nhau
const ROAD = ["C50 6 50 24 100 24", "S150 6 200 6", "S250 24 300 24", "S350 6 400 6"];

/**
 * Thanh 5 bước H-M-T-G-N dạng hành trình: chặng đã qua xanh có dấu ✓, chặng đang làm nền bơ có nhân vật đứng cạnh.
 * Bước Hiểu, Mẫu đã qua bấm được để xem lại (chỉ đọc).
 */
function Journey({ view, peek, onPeek }: { view: View; peek: "H" | "M" | null; onPeek: (s: "H" | "M" | null) => void }) {
  const completed = view.state === "completed";
  const at = PRACTICE_STEPS.indexOf(view.step);
  const canPeek = view.state !== "safety" && !completed;
  const doneTo = completed ? ROAD.length : at;
  return (
    <section
      aria-label="Các bước của bài luyện"
      className="relative mt-5 rounded-[28px] border-2 border-dashed border-brand-edge/30 bg-brand-soft px-2.5 pb-3 pt-4 sm:mt-8 sm:px-[18px] sm:pb-3.5 sm:pt-[18px]"
    >
      <p aria-hidden className="mb-8 font-display text-[15px] font-extrabold sm:hidden">
        {completed ? (
          <>Đã đi hết 5 bước 🌟</>
        ) : (
          <>
            Bước {Math.min(at + 1, 5)}/5: {STEP_LABEL[view.step]} {STEP_EMOJI[view.step]}
          </>
        )}
      </p>
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-[10%] top-3.5 h-[26px] w-4/5 overflow-visible sm:top-[22px] sm:h-10"
        >
          <path
            d={`M0 6 ${ROAD.join(" ")}`}
            fill="none"
            className="stroke-brand-edge/35"
            strokeWidth={4}
            strokeDasharray="2 9"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {doneTo > 0 && (
            <path
              d={`M0 6 ${ROAD.slice(0, doneTo).join(" ")}`}
              fill="none"
              className="stroke-c2-mid"
              strokeWidth={4}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <ol className="relative grid grid-cols-5">
          {PRACTICE_STEPS.map((step, i) => {
            const done = completed || i < at;
            const now = !completed && i === at;
            const reviewable = canPeek && (step === "H" || step === "M") && i < at;
            const label = STEP_LABEL[step];
            const body = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-[42px] place-items-center rounded-full border-2 text-[19px] shadow-soft transition sm:size-14 sm:border-[3px] sm:text-[25px]",
                    done
                      ? "border-c2-mid bg-c2"
                      : now
                        ? "scale-[1.14] border-brand-edge bg-brand ring-[6px] ring-brand/45"
                        : "border-brand-edge/30 bg-surface opacity-75",
                  )}
                >
                  {STEP_EMOJI[step]}
                  {done && (
                    <span className="absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full border-2 border-surface bg-c2-ink text-[10px] font-extrabold text-surface sm:size-[22px] sm:text-xs">
                      ✓
                    </span>
                  )}
                </span>
                <span className={cn("mt-1.5 text-[13px] leading-tight max-sm:sr-only", done || now ? "font-bold" : "font-semibold text-muted")}>
                  {label}
                  {!reviewable && <span className="sr-only">{done ? " (đã xong)" : now ? " (đang làm)" : ""}</span>}
                </span>
                {now && <span className="text-[11px] font-bold text-brand-strong max-sm:hidden dark:text-brand">Bạn đang ở đây</span>}
                {reviewable && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold max-sm:hidden",
                      peek === step ? "bg-c2-ink text-surface" : "bg-surface text-c2-ink shadow-[0_2px_0_var(--c2-mid)]",
                    )}
                  >
                    {peek === step ? "Đang xem" : "Xem lại"}
                  </span>
                )}
              </>
            );
            return (
              <li key={step} aria-current={now ? "step" : undefined} className={cn("relative", i % 2 === 1 && "mt-2.5 sm:mt-[18px]")}>
                {/* nhân vật đứng cạnh chặng đang làm */}
                {now && (
                  <span aria-hidden className="absolute -top-8 left-[calc(50%+8px)] z-10 rotate-[8deg] sm:-top-11 sm:left-[calc(50%+14px)]">
                    <MascotArt size={44} className="max-sm:h-9 max-sm:w-[30px]" />
                  </span>
                )}
                {reviewable ? (
                  <button
                    type="button"
                    onClick={() => onPeek(peek === step ? null : (step as "H" | "M"))}
                    aria-pressed={peek === step}
                    aria-label={`Xem lại bước ${label}`}
                    title={`Xem lại bước ${label}`}
                    className="flex w-full flex-col items-center gap-1 rounded-2xl pb-1 text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/50 motion-reduce:transform-none"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Lời nhân vật mở đầu mỗi bước: tiêu đề bước (h2) và một câu hướng dẫn. */
function StepIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={bubble.wrap}>
      <MascotArt size={88} className="-mb-1 max-sm:h-[84px] max-sm:w-[70px]" />
      <div className={bubble.box}>
        <h2 className={bubble.title}>{title}</h2>
        {children && <p className={bubble.text}>{children}</p>}
      </div>
    </div>
  );
}

// ───────── Cột tham chiếu ─────────

/**
 * Cột tham chiếu (Duy duyệt 01/11): những gì cần nhìn TRONG LÚC làm: 5 bước xếp dọc (Hiểu, Mẫu đã qua bấm được để xem lại),
 * tình huống, "Bài tốt cần có", xem lại ví dụ, dừng ở đây. Giao diện vui 02/11: mỗi phần một thẻ bo tròn bóng mềm.
 * Góp ý của trợ lý là chữ tự do (không chấm từng tiêu chí) nên tiêu chí chỉ liệt kê, không đánh dấu đạt / chưa đạt.
 */
function PracticeRail({
  view,
  skill,
  peek,
  onPeek,
  pause,
}: {
  view: View;
  skill: Skill;
  peek: "H" | "M" | null;
  onPeek: (s: "H" | "M" | null) => void;
  pause: { busy: boolean; pending: boolean; onClick: () => void } | null;
}) {
  const completed = view.state === "completed";
  const at = PRACTICE_STEPS.indexOf(view.step);
  const canPeek = !completed;
  return (
    <div className="space-y-3.5">
      <section className={cn(railCard, "bg-surface")}>
        <h2 className="font-display text-xl font-extrabold leading-tight">Bài luyện</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          {view.state === "not_started" ? "5 bước, làm lúc nào cũng được." : `${STATE_LABEL[view.state]} · 5 bước`}
        </p>

        <ol aria-label="Các bước của bài luyện" className="mt-2.5 space-y-1">
          {PRACTICE_STEPS.map((step, i) => {
            const done = completed || i < at;
            const now = !completed && i === at;
            const reviewable = canPeek && (step === "H" || step === "M") && i < at;
            const body = (
              <>
                <span
                  aria-hidden
                  className={cn("grid size-8 shrink-0 place-items-center rounded-xl text-base", done ? "bg-c2" : now ? "bg-brand" : "bg-surface-2")}
                >
                  {STEP_EMOJI[step]}
                </span>
                <span className="min-w-0 flex-1">
                  {STEP_LABEL[step]}
                  {done && (
                    <span aria-hidden className="font-extrabold text-c2-ink">
                      {" "}
                      ✓
                    </span>
                  )}
                </span>
                {reviewable && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                      peek === step ? "bg-c2-ink text-surface" : "bg-surface text-c2-ink shadow-[0_2px_0_var(--c2-mid)] dark:border dark:border-line",
                    )}
                  >
                    {peek === step ? "Đang xem" : "Xem lại"}
                  </span>
                )}
                {now && <span className="text-[11px] font-semibold text-brand-strong dark:text-brand">đang làm</span>}
              </>
            );
            const row = cn(
              "flex min-h-11 w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left text-sm",
              now && "bg-brand-soft font-bold ring-2 ring-inset ring-brand-edge/30",
              !done && !now && "text-muted",
            );
            return (
              <li key={step} aria-current={now ? "step" : undefined}>
                {reviewable ? (
                  <button
                    type="button"
                    onClick={() => onPeek(peek === step ? null : (step as "H" | "M"))}
                    aria-pressed={peek === step}
                    aria-label={`Xem lại bước ${STEP_LABEL[step]}`}
                    className={cn(row, "transition hover:bg-surface-2", peek === step && "bg-surface-2")}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={row}>
                    {body}
                    <span className="sr-only">{done ? "(đã xong)" : now ? "(đang làm)" : ""}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {view.situation && (
        <section className={cn(railCard, "bg-tint")}>
          <h3 className="font-display text-xl font-extrabold leading-tight text-tink">
            {view.own ? "Tình huống của bạn" : "Tình huống mẫu"} <span aria-hidden>📚</span>
          </h3>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-surface px-3 py-2.5 text-sm leading-relaxed">{view.situation}</p>
        </section>
      )}

      <section className={cn(railCard, "bg-surface")}>
        <h3 className="font-display text-xl font-extrabold leading-tight">
          Bài tốt cần có <span aria-hidden>✨</span>
        </h3>
        <Criteria items={skill.criteria} className="mt-2.5 text-[13px]" />
      </section>

      {((canPeek && at > PRACTICE_STEPS.indexOf("M")) || pause) && (
        <div className="grid gap-2">
          {canPeek && at > PRACTICE_STEPS.indexOf("M") && (
            <button
              type="button"
              onClick={() => onPeek(peek === "M" ? null : "M")}
              aria-pressed={peek === "M"}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[18px] bg-brand-soft px-3.5 py-2.5 text-left text-sm font-bold transition hover:brightness-[0.98]"
            >
              <span>
                <span aria-hidden>👀 </span>
                {peek === "M" ? "Đóng ví dụ" : "Xem lại ví dụ"}
              </span>
              <span aria-hidden>→</span>
            </button>
          )}
          {pause && (
            <button
              type="button"
              disabled={pause.pending}
              onClick={pause.onClick}
              className="flex min-h-11 w-full items-center gap-2 rounded-[18px] bg-surface-2 px-3.5 py-2.5 text-left text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-60"
            >
              <span aria-hidden>⏸️</span> {pause.busy ? "Đang lưu…" : "Dừng ở đây, làm tiếp sau"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Danh sách "Bài tốt cần có": số tròn nền bơ nhạt. */
function Criteria({ items, className }: { items: string[]; className?: string }) {
  return (
    <ol className={cn("space-y-2 leading-snug", className)}>
      {items.map((c, i) => (
        <li key={c} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="grid size-[22px] shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-extrabold text-brand-strong dark:text-brand"
          >
            {i + 1}
          </span>
          <span className="pt-px">{c}</span>
        </li>
      ))}
    </ol>
  );
}

type Run = <T extends object>(name: string, action: () => Promise<PracticeResult<T>>, after?: (res: Extract<PracticeResult<T>, { ok: true }>) => void) => void;
type StepProps = {
  view: View;
  skill: Skill;
  sample: SkillSample;
  run: Run;
  pending: boolean;
  busy: string | null;
};

// ───────── H: Hiểu ─────────

/**
 * Khung an toàn của mô-đun (SKILLS[k].safetyNote): chữ giao diện CỐ ĐỊNH đã duyệt, hiện ở bước Hiểu và Tự thử.
 * Không bao giờ đưa cho trợ lý AI.
 */
function SafetyNote({ skill }: { skill: Skill }) {
  if (!skill.safetyNote) return null;
  return (
    <aside aria-label="Lưu ý an toàn" className="rounded-[20px] bg-c4 px-4 py-3 text-[15px] leading-relaxed">
      <span className="block text-xs font-extrabold text-c4-ink">Lưu ý</span>
      {skill.safetyNote}
    </aside>
  );
}

/**
 * "Bài tốt cần có": đúng các tiêu chí trợ lý dùng để góp ý, để học sinh biết đích trước khi viết; kèm một cặp so sánh.
 * Từ 1280px danh sách tiêu chí đã nằm ở cột tham chiếu nên ở đây ẩn đi, chỉ còn cặp so sánh.
 */
function GoodWork({ skill }: { skill: Skill }) {
  const c = SKILL_CONTRAST[skill.id];
  return (
    <div className="space-y-3">
      <div className={cn(softCard, "p-4 sm:p-5 xl:hidden")}>
        <h3 className="font-display text-lg font-extrabold">
          Bài tốt cần có <span aria-hidden>✨</span>
        </h3>
        <Criteria items={skill.criteria} className="mt-2.5 text-[15px]" />
      </div>
      <div className={cn(softCard, "p-4 text-[15px] sm:p-5")}>
        <p className="text-xs font-extrabold text-muted">Ô {c.field}: chưa tốt → tốt hơn</p>
        <p className="mt-2">
          <span className={cn(tag, "mr-2 bg-danger-soft text-danger")}>Chưa tốt</span>
          {c.weak}
        </p>
        <p className="mt-1.5">
          <span className={cn(tag, "mr-2 bg-c2 text-c2-ink")}>Tốt hơn</span>
          {c.better}
        </p>
        <p className="mt-2 text-sm text-muted">{c.why}</p>
      </div>
    </div>
  );
}

/** Xem lại bước Hiểu hoặc Mẫu đã qua, ngay trên bước đang làm (chỉ đọc). */
function PeekPanel({ step, skill, sample, onClose }: { step: "H" | "M"; skill: Skill; sample: SkillSample; onClose: () => void }) {
  return (
    <section className="space-y-3 rounded-[26px] border-2 border-dashed border-line bg-surface/45 p-3.5 sm:p-4" aria-label={`Xem lại bước ${STEP_LABEL[step]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">
          <span aria-hidden>👀 </span>Xem lại: {STEP_LABEL[step]}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-sm font-bold shadow-soft transition hover:bg-surface-2 dark:border dark:border-line"
        >
          Đóng
        </button>
      </div>
      {step === "H" ? (
        <>
          <p className="rounded-[20px] bg-sky px-4 py-3.5 text-[15px] leading-relaxed text-sky-ink">{skill.understand}</p>
          <SafetyNote skill={skill} />
          <GoodWork skill={skill} />
        </>
      ) : (
        <AnnotatedSample sample={sample} skill={skill} />
      )}
    </section>
  );
}

function UnderstandStep({ view, skill, run, pending, busy }: StepProps) {
  return (
    <section className="space-y-4">
      <StepIntro title="Vì sao luyện cách này?">Đọc chút xíu trước khi bắt đầu nhé.</StepIntro>
      <p className="rounded-[20px] bg-sky px-4 py-4 text-[15px] leading-relaxed text-sky-ink sm:px-5">{skill.understand}</p>
      {view.bridge && <p className={cn(softCard, "px-4 py-3 text-[15px]")}>{view.bridge}</p>}
      <SafetyNote skill={skill} />
      <GoodWork skill={skill} />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" disabled={pending} onClick={() => run("next", () => stepPractice(view.id, "next"))} className={cn(btn.primary, "max-sm:w-full")}>
          {busy === "next" ? "Đang mở…" : "Xem ví dụ →"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("skip", () => stepPractice(view.id, "skip"))}
          className="min-h-11 px-2 text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Bỏ qua ví dụ, tự thử luôn (vẫn xem lại được)
        </button>
      </div>
    </section>
  );
}

// ───────── M: Mẫu ─────────

function ExampleBox({ example, note }: { example: { situation: string; lines: string[] }; note?: string }) {
  return (
    <div className="rounded-[20px] bg-c5 px-4 py-3.5 sm:px-5">
      <p className="text-xs font-extrabold text-brand-strong dark:text-brand">{note ?? "Mẫu ở một tình huống khác"}</p>
      <p className="mt-0.5 font-bold">{example.situation}</p>
      <ul className="mt-2.5 space-y-1.5 text-[15px]">
        {example.lines.map((l) => (
          <li key={l} className="rounded-[14px] bg-surface/80 px-3 py-2">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mẫu có nhãn từng ô (khớp ô học sinh sẽ viết) và chú thích "vì sao dòng này tốt" bấm mở. */
function AnnotatedSample({ sample, skill }: { sample: SkillSample; skill: Skill }) {
  const short = FIELD_SHORT[skill.id];
  return (
    <div className="rounded-[20px] bg-c5 px-4 py-3.5 sm:px-5">
      <p className="text-xs font-extrabold text-brand-strong dark:text-brand">Mẫu ở một tình huống khác</p>
      <p className="mt-0.5 font-bold">{sample.situation}</p>
      <ul className="mt-2.5 space-y-1.5 text-[15px]">
        {sample.lines.map((l, i) => (
          <li key={i} className="rounded-[14px] bg-surface/80 px-3 py-2">
            <span className="block text-[11px] font-extrabold text-muted">{short[i]}</span>
            {l.text}
            <details className="mt-1 text-sm">
              <summary className="cursor-pointer py-1 text-xs font-extrabold text-brand-strong dark:text-brand">Vì sao dòng này tốt?</summary>
              <p className="mt-0.5 text-muted">{l.why}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExampleStep({ view, skill, sample, run, pending, busy }: StepProps) {
  const [other, setOther] = useState<{
    situation: string;
    lines: string[];
  } | null>(null);
  const [none, setNone] = useState(false);
  return (
    <section className="space-y-4">
      <StepIntro title="Xem một mẫu">Mẫu là chuyện của một bạn khác, hoặc khung có chỗ trống. Bạn sẽ tự viết cho tình huống của mình ở bước sau.</StepIntro>
      <AnnotatedSample sample={sample} skill={skill} />
      {other && <ExampleBox example={other} note="Thêm một ví dụ ở tình huống khác" />}
      {none && <p className="text-sm text-muted">Chưa có ví dụ khác lúc này. Bạn dùng mẫu ở trên nhé.</p>}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <button type="button" disabled={pending} onClick={() => run("next", () => stepPractice(view.id, "next"))} className={cn(btn.primary, "max-sm:w-full")}>
          {busy === "next" ? "Đang mở…" : "Mình tự làm →"}
        </button>
        {view.exampleLeft && !other && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                "example",
                () => practiceExample(view.id),
                (res) => {
                  if (res.example) setOther(res.example);
                  else setNone(true);
                },
              )
            }
            className={cn(chunkyWhite, "max-sm:w-full")}
          >
            {busy === "example" ? "Đang nghĩ ví dụ…" : "Cho mình ví dụ khác"}
          </button>
        )}
      </div>
    </section>
  );
}

// ───────── T: Tự làm ─────────

/** Nháp trên máy để lỡ tải lại trang hay bấm "Dừng ở đây" không mất chữ (xóa khi đã lưu, xóa hết khi đăng xuất). */
function useDraft(userId: string, id: string, version: 1 | 2, start: Answers) {
  const key = draftKey(userId, "luyen", `${id}:${version}`);
  const [answers, setAnswers] = useState<Answers>(() => {
    try {
      const saved = readDraft(key);
      return saved ? { ...start, ...(JSON.parse(saved) as Answers) } : start;
    } catch {
      return start;
    }
  });
  function set(k: string, v: string) {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    writeDraft(key, Object.values(next).some((x) => x.trim()) ? JSON.stringify(next) : "");
  }
  return { answers, set, clear: () => clearDraft(key) };
}

/** Nhãn "✱ cần có" / "không bắt buộc" cạnh tên ô. */
function NeedTag({ required }: { required?: boolean }) {
  return required ? (
    <span className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-brand-soft px-2 py-px align-[2px] text-[11px] font-extrabold text-brand-strong dark:text-brand">
      <span aria-hidden>✱ </span>cần có
    </span>
  ) : (
    <span className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-surface-2 px-2 py-px align-[2px] text-[11px] font-bold text-muted">
      không bắt buộc
    </span>
  );
}

function Fields({ view, skill, sample, answers, set, run, pending, busy }: StepProps & { answers: Answers; set: (k: string, v: string) => void }) {
  const [hints, setHints] = useState<Record<string, Hint>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  return (
    <div className="grid gap-3">
      {skill.fields.map((f, i) => {
        const hint = hints[f.key];
        const isSkipped = skipped.includes(f.key);
        const filled = (answers[f.key] ?? "").trim().length >= 2;
        return (
          <div key={f.key} className={cn(softCard, "px-3.5 pb-3 pt-3.5 transition-shadow sm:px-4", filled && "ring-2 ring-c2-mid")}>
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "grid size-[30px] shrink-0 place-items-center rounded-[11px] text-sm font-extrabold",
                  filled ? "bg-c2 text-c2-ink" : "bg-brand-soft text-brand-strong dark:text-brand",
                )}
              >
                {i + 1}
              </span>
              <label htmlFor={`f-${f.key}`} className="min-w-0 flex-1 pt-0.5 font-bold leading-snug">
                {f.label}
                <NeedTag required={f.required} />
              </label>
            </div>
            {isSkipped && !answers[f.key] ? (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-1 text-sm text-muted">
                Đã bỏ qua ô này.
                <button
                  type="button"
                  onClick={() => setSkipped(skipped.filter((k) => k !== f.key))}
                  className="min-h-11 px-1 font-bold text-ink underline underline-offset-4"
                >
                  Viết lại
                </button>
              </p>
            ) : (
              <textarea
                id={`f-${f.key}`}
                value={answers[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                maxLength={LIMITS.field}
                rows={2}
                className={cn(fieldInput, "mt-2.5 min-h-[66px]")}
              />
            )}
            {!isSkipped && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    "hint:" + f.key,
                    () => practiceHint(view.id, f.key, answers),
                    (res) =>
                      setHints((h) => ({
                        ...h,
                        [f.key]: {
                          hints: res.hints,
                          showExample: res.showExample,
                        },
                      })),
                  )
                }
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-c1 px-4 text-[13px] font-bold text-c1-ink transition hover:brightness-[0.97] disabled:opacity-60"
              >
                <span aria-hidden>🤔</span> {busy === "hint:" + f.key ? "Đang nghĩ câu gợi ý…" : "Mình chưa biết"}
              </button>
            )}
            {hint && !isSkipped && (
              <div className="mt-2.5 rounded-[18px] bg-c2 px-3.5 py-3 text-sm">
                {hint.hints ? (
                  <>
                    <p className="flex items-center gap-2 font-extrabold text-c2-ink">
                      <span aria-hidden>
                        <MascotArt size={28} />
                      </span>
                      Thử nghĩ theo một trong các câu này:
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {hint.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-2 font-extrabold text-c2-ink">
                      <span aria-hidden>
                        <MascotArt size={28} />
                      </span>
                      Xem lại mẫu nhé:
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {sample.lines.map((l, j) => (
                        <li key={j}>
                          <span className="font-semibold">{FIELD_SHORT[skill.id][j]}:</span> {l.text}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      "skip:" + f.key,
                      () => stepPractice(view.id, "skip"),
                      () => {
                        setSkipped((s) => [...s, f.key]);
                        set(f.key, "");
                      },
                    )
                  }
                  className="mt-2 inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-[13px] font-bold transition hover:bg-surface-2 disabled:opacity-60"
                >
                  Bỏ qua ô này
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WriteStep({ userId, nickname, ...p }: StepProps & { userId: string; nickname: string }) {
  const { view, skill, run, pending, busy } = p;
  const { answers, set, clear } = useDraft(userId, view.id, 1, {});
  const filled = Object.values(answers).some((v) => v.trim().length >= 2);
  const missing = missingRequired(view.skill, answers);
  return (
    <section className="space-y-4">
      <StepIntro title={`Tới lượt bạn tự làm rồi nè, ${nickname}! 💪`}>
        Viết bằng lời của bạn. Ô có nhãn <b className="text-ink">cần có</b> giúp bài được tính là hoàn thành; ô nào chưa nghĩ ra thì bấm “Mình chưa biết” hoặc
        bỏ qua nhé.
      </StepIntro>
      <SafetyNote skill={skill} />
      <Fields {...p} answers={answers} set={set} />
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 pt-2">
        {filled && missing.length > 0 && (
          <p className="basis-full text-[13px] text-muted">Còn {missing.length} ô “cần có” chưa viết. Bạn vẫn lưu được và viết thêm ở lần 2.</p>
        )}
        <button
          type="button"
          disabled={pending || !filled}
          onClick={() =>
            run(
              "submit",
              () => submitPractice(view.id, answers),
              () => clear(),
            )
          }
          className={cn(btn.primary, "max-sm:w-full")}
        >
          {busy === "submit" ? "Đang lưu…" : "Lưu bài (lần 1) →"}
        </button>
        <span className="text-[13px] text-muted">Lưu xong, bạn nhờ trợ lý góp ý ở bước {PRACTICE_STEPS.indexOf("G") + 1}.</span>
      </div>
    </section>
  );
}

// ───────── G: Góp ý ─────────

function FeedbackCard({ feedback, version }: { feedback: PracticeFeedback; version: number }) {
  if (feedback.kind === "criteria") {
    return (
      <div className={cn(softCard, "p-4 sm:p-5")}>
        <p className="font-bold">Tự soát bài lần {version} theo các tiêu chí này</p>
        <p className="text-sm text-muted">Lúc này trợ lý chưa góp ý được, bài của bạn vẫn đã được lưu.</p>
        <Criteria items={feedback.criteria} className="mt-3 text-[15px]" />
      </div>
    );
  }
  const rows: [string, string, string][] = [
    ["👍", "Điểm làm tốt", feedback.good],
    ["🔧", "Điểm nên sửa", feedback.fix],
    ["❓", "Câu hỏi để bạn tự sửa", feedback.question],
  ];
  return (
    <div className="rounded-3xl bg-c1 p-4 text-[15px] sm:p-5">
      <p className="text-xs font-extrabold text-c1-ink">Góp ý cho bài lần {version} (không chấm điểm)</p>
      <ul className="mt-2.5 space-y-2">
        {rows.map(([emoji, label, text]) => (
          <li key={label} className="flex gap-2.5 rounded-2xl bg-surface/75 px-3 py-2.5">
            <span aria-hidden className="shrink-0">
              {emoji}
            </span>
            <span>
              <span className="font-bold">{label}: </span>
              {text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswersBox({ skill, attempt }: { skill: Skill; attempt: AttemptView }) {
  return (
    <div className={cn(softCard, "p-4 text-[15px]")}>
      <span className={cn(tag, "-rotate-3 bg-brand text-brand-ink")}>Bài lần {attempt.version}</span>
      <dl className="mt-2.5 space-y-2">
        {skill.fields.map((f) => (
          <div key={f.key}>
            <dt className="text-[13px] text-muted">{f.label}</dt>
            <dd className="whitespace-pre-wrap">{attempt.answers[f.key] || <span className="text-muted">(bỏ trống)</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FeedbackStep({ userId, cards, ...p }: StepProps & { userId: string; cards: SupportCards }) {
  const { view, skill, run, pending, busy } = p;
  const latest = view.attempts[view.attempts.length - 1];
  const first = view.attempts.find((a) => a.version === 1);
  const [revising, setRevising] = useState(false);
  const canAsk = view.feedbackCount < MAX_FEEDBACK && view.feedbackCount < view.attempts.length;
  const canRevise = view.attempts.length === 1 && view.feedbackCount >= 1;
  return (
    <section className="space-y-4">
      <StepIntro title="Góp ý và sửa bài">Xem lại bài của bạn cùng góp ý, rồi sửa lần 2 nếu muốn nhé.</StepIntro>
      {view.attempts.map((a) => (
        <div key={a.version} className="space-y-3">
          <AnswersBox skill={skill} attempt={a} />
          {a.feedback && <FeedbackCard feedback={a.feedback} version={a.version} />}
        </div>
      ))}

      {revising && first ? (
        <Revise userId={userId} {...p} start={first.answers} onDone={() => setRevising(false)} />
      ) : (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {canAsk && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("feedback", () => requestPracticeFeedback(view.id))}
              className={cn(btn.primary, "max-sm:w-full")}
            >
              {busy === "feedback" ? "Trợ lý đang đọc bài…" : latest.version === 2 ? "Nhờ góp ý bài lần 2" : "Nhờ trợ lý góp ý"}
            </button>
          )}
          {canRevise && (
            <button type="button" onClick={() => setRevising(true)} className={cn(btn.primary, "max-sm:w-full")}>
              Sửa bài (lần 2)
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run("next", () => stepPractice(view.id, view.feedbackCount ? "next" : "skip"))}
            className={cn(chunkyWhite, "max-sm:w-full")}
          >
            {busy === "next" ? "Đang mở…" : view.feedbackCount ? "Sang bước Nhìn lại" : "Bỏ qua bước Nhận góp ý"}
          </button>
        </div>
      )}

      {roleplayOf(view.skill) && <Roleplay {...p} cards={cards} />}
    </section>
  );
}

function Revise({ userId, start, onDone, ...p }: StepProps & { userId: string; start: Answers; onDone: () => void }) {
  const { view, run, pending, busy } = p;
  const { answers, set, clear } = useDraft(userId, view.id, 2, start);
  return (
    <div className="space-y-3 rounded-[26px] border-2 border-dashed border-brand-edge/35 bg-brand-soft/60 p-3.5 sm:p-4">
      <p className="font-bold">
        <span aria-hidden>✏️ </span>Sửa bài theo góp ý. Bài lần 1 vẫn được giữ để bạn tự so.
      </p>
      <Fields {...p} answers={answers} set={set} />
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              "submit",
              () => submitPractice(view.id, answers),
              () => {
                clear();
                onDone();
              },
            )
          }
          className={cn(btn.primary, "max-sm:w-full")}
        >
          {busy === "submit" ? "Đang lưu…" : "Lưu bài (lần 2) →"}
        </button>
        <button type="button" onClick={onDone} className={btn.ghost}>
          Thôi, chưa sửa
        </button>
      </div>
    </div>
  );
}

/**
 * Tập nói (tối đa 4 lượt, lib/practice/roleplay.ts): vai thầy cô bộ môn (mở lời nhờ người giúp) hoặc vai một bạn cùng lớp
 * (nghe bạn, giải quyết bất đồng, nói "không"; bạn trong vai nói câu mở đầu trước). Vai bạn cùng lớp chỉ có với tình huống mẫu;
 * vai đã dừng (thoát vai) thì hiện khung hỗ trợ soạn sẵn và thẻ số hỗ trợ, không tập nói tiếp.
 */
function Roleplay({ view, run, pending, busy, cards }: StepProps & { cards: SupportCards }) {
  const spec = roleplayOf(view.skill);
  const latest = view.attempts[view.attempts.length - 1];
  const turns = latest?.roleplay ?? [];
  const [text, setText] = useState(turns.length || spec?.kind !== "teacher" ? "" : (latest?.answers.request ?? ""));
  if (!spec || !latest) return null;
  const blocked = roleplayBlocked(view.skill, {
    own: view.own,
    caseCode: view.caseCode,
  });
  if (blocked) {
    return (
      <div className="rounded-3xl bg-surface-2 p-4 text-sm sm:p-5">
        <p className="font-bold">{spec.title}</p>
        <p className="mt-1 text-muted">{blocked}</p>
      </div>
    );
  }
  const opening = roleplayOpening(view.skill, view.caseCode);
  // vai bạn cùng lớp nói trước: chưa có lượt nào thì hiện câu mở đầu soạn sẵn (lưu cùng lượt đầu của bạn)
  const shown = turns.length === 0 && opening ? [{ role: "partner" as const, text: opening }] : turns;
  return (
    <div className="space-y-3 rounded-[26px] bg-sky p-4 sm:p-5">
      <p className="font-display text-xl font-extrabold leading-tight text-sky-ink">
        <span aria-hidden>🎭 </span>
        {spec.title}
      </p>
      <p className="text-sm text-muted">{spec.intro}</p>
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((t, i) => (
            <li
              key={i}
              className={cn(
                "max-w-[85%] rounded-[18px] px-3.5 py-2 text-[15px]",
                t.role === "student" ? "ml-auto rounded-br-md bg-brand text-brand-ink" : "rounded-bl-md bg-surface shadow-soft",
              )}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70">{turnLabel(t, spec)}</span>
              {t.text}
            </li>
          ))}
        </ul>
      )}
      {view.roleplayStopped ? (
        <div role="status" className="space-y-3">
          <p className="rounded-2xl bg-surface p-4 text-[15px] leading-relaxed">{ROLEPLAY_BREAK_TEXT}</p>
          {cards.urgent}
        </div>
      ) : view.roleplayLeft > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="roleplay" className="sr-only">
            {spec.placeholder.replace(/…$/, "")}
          </label>
          <textarea
            id="roleplay"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={LIMITS.roleplay}
            rows={2}
            placeholder={spec.placeholder}
            className={cn(fieldInput, "flex-1")}
          />
          <button
            type="button"
            disabled={pending || text.trim().length < 2}
            onClick={() =>
              run(
                "roleplay",
                () => practiceRoleplay(view.id, text),
                () => setText(""),
              )
            }
            className={cn(btn.primary, "sm:self-end")}
          >
            {busy === "roleplay" ? spec.busy : "Nói"}
          </button>
        </div>
      ) : (
        <p className="text-sm font-bold">Bạn đã tập đủ lượt cho bài này rồi.</p>
      )}
    </div>
  );
}

// ───────── N: Nhìn lại ─────────

function ReviewStep({ userId, onReaction, ...p }: StepProps & { userId: string; onReaction: (text: string | null) => void }) {
  const { view, skill, run, pending, busy } = p;
  const [nextTry, setNextTry] = useState("");
  const [revising, setRevising] = useState(false);
  const first = view.attempts.find((a) => a.version === 1);
  const latest = view.attempts[view.attempts.length - 1];
  const missing = latest ? missingRequired(view.skill, latest.answers) : skill.fields.filter((f) => f.required).map((f) => f.key);
  return (
    <section className="space-y-4">
      <StepIntro title="Nhìn lại">Gần xong rồi! Nhìn lại bài của mình và nghĩ một việc bạn sẽ thử thật nhé.</StepIntro>
      {view.attempts.length === 2 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {view.attempts.map((a) => (
            <AnswersBox key={a.version} skill={skill} attempt={a} />
          ))}
        </div>
      )}
      {view.skill === "ask_for_help" && (
        <div className="rounded-3xl bg-c3 p-4 text-sm sm:p-5">
          <p className="font-display text-lg font-extrabold text-c3-ink">Bạn muốn nhờ thế nào?</p>
          <p className="mt-1 text-muted">Gửi lời nhờ qua F-Mood (bạn tự xem lại trước khi gửi), hoặc tự hỏi trực tiếp thầy cô. Cả hai đều được.</p>
          {/* lời nhờ 3 ý được điền sẵn từ bài làm này (máy chủ đọc lại bài của chính bạn); bạn sửa được trước khi gửi */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/giup-do?luyen=${view.id}#hen-gap`} className={chunkyWhite}>
              Gửi qua F-Mood
            </Link>
            <Link href={`/giup-do?luyen=${view.id}&tu-hoi=1#hen-gap`} className={btn.ghost}>
              Soạn để tự hỏi
            </Link>
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <div className="rounded-[20px] bg-butter px-4 py-3 text-sm">
          <p>Bài còn {missing.length} ô “cần có” chưa viết nên chưa tính là hoàn thành. Bạn vẫn dừng ở đây được, bài sẽ được giữ.</p>
          {view.attempts.length === 1 && first && !revising && (
            <button type="button" onClick={() => setRevising(true)} className={cn(chunkyWhite, "mt-3")}>
              Viết thêm (lần 2)
            </button>
          )}
        </div>
      )}
      {revising && first && <Revise userId={userId} {...p} start={first.answers} onDone={() => setRevising(false)} />}
      <div className={cn(softCard, "px-3.5 pb-3.5 pt-3.5 sm:px-4")}>
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-[11px] bg-brand-soft text-sm">
            🌟
          </span>
          <label htmlFor="next-try" className="min-w-0 flex-1 pt-0.5 font-bold leading-snug">
            Một việc bạn sẽ thử thật
            <NeedTag />
          </label>
        </div>
        <textarea
          id="next-try"
          value={nextTry}
          onChange={(e) => setNextTry(e.target.value)}
          maxLength={LIMITS.nextTry}
          rows={2}
          placeholder="Ví dụ: tối thứ Năm mình sẽ ___"
          className={cn(fieldInput, "mt-2.5 min-h-[66px]")}
        />
      </div>
      <button
        type="button"
        disabled={pending || missing.length > 0}
        onClick={() =>
          run(
            "finish",
            () => finishPractice(view.id, nextTry.trim() || null),
            (res) => onReaction(res.reaction),
          )
        }
        className={cn(btn.primary, "max-sm:w-full")}
      >
        {busy === "finish" ? "Đang lưu…" : "Mình đã làm xong"}
      </button>
    </section>
  );
}

function Completed({
  view,
  skill,
  reaction,
  nextCase,
}: {
  view: View;
  skill: Skill;
  reaction: string | null;
  nextCase: { code: string; situation: string } | null;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end gap-2 rounded-[28px] bg-c2 px-4 pt-4 sm:gap-3 sm:px-5">
        <MascotArt size={84} float className="max-sm:h-[84px] max-sm:w-[70px]" />
        <div className="min-w-0 flex-1 pb-4">
          <h2 className="font-display text-2xl font-extrabold leading-tight text-c2-ink">Bạn đã luyện xong bài này 🌱</h2>
          {view.nextTry && <p className="mt-1.5">Việc bạn sẽ thử: “{view.nextTry}”</p>}
          {reaction && <p className="mt-2.5 rounded-[18px] rounded-bl-md bg-surface px-3.5 py-2.5 text-[15px] shadow-soft">{reaction}</p>}
        </div>
      </div>
      <div className={cn("grid gap-3", view.attempts.length === 2 && "sm:grid-cols-2")}>
        {view.attempts.map((a) => (
          <AnswersBox key={a.version} skill={skill} attempt={a} />
        ))}
      </div>
      {nextCase && <NextCase skill={view.skill} nextCase={nextCase} />}
      <div className="flex flex-wrap gap-2">
        <Link href={`/luyen/${subskill(view.skill).slug}`} className={chunkyWhite}>
          Luyện lại kỹ năng này
        </Link>
        {/* chỉ mở trò chuyện mới, không mang bài làm theo */}
        <Link href="/chat/new?tu=luyen" className={btn.ghost}>
          Nói chuyện thêm
        </Link>
      </div>
    </section>
  );
}

/** Mục 4.2: dùng lại cách vừa luyện ở một tình huống mẫu khác cùng kỹ năng (phần mềm chọn, không gọi AI). */
function NextCase({ skill, nextCase }: { skill: View["skill"]; nextCase: { code: string; situation: string } }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className={cn(softCard, "p-4 sm:p-5")}>
      <span className={cn(tag, "-rotate-2 bg-tint text-tink")}>Thử dùng lại cách này ở tình huống mới</span>
      <p className="mt-2 font-bold">{nextCase.situation}</p>
      <p className="mt-1 text-sm text-muted">Dùng lại một cách ở chỗ khác giúp bạn nhớ lâu hơn và tự làm được khi cần.</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await startPractice({
              subskill: skill,
              caseCode: nextCase.code,
              from: "skills",
            });
            if (res.ok) router.push(`/luyen/bai/${res.id}`);
            else setError("crisis" in res ? "Chưa mở được bài mới lúc này." : res.error);
          })
        }
        className={cn(btn.primary, "mt-3 max-sm:w-full")}
      >
        {pending ? "Đang mở…" : "Luyện tình huống này →"}
      </button>
    </div>
  );
}

/** Đã chuyển an toàn (mở lại bài sau đó): không hiện bài, chỉ hiện thẻ hỗ trợ. Giữ giản dị, không trang trí. */
function Stopped({ cards }: { cards: SupportCards }) {
  return (
    <div className="space-y-4">
      <p className="rounded-[var(--radius-card)] bg-surface-2 p-5">
        Bài luyện này đã dừng để bạn được hỗ trợ trước. Bạn không phải một mình, những người dưới đây luôn sẵn lòng giúp bạn.
      </p>
      {cards.urgent}
    </div>
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={btn.ghost}>
        Xóa bài này
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deletePractice(id);
          if (res.ok) onDeleted();
        })
      }
      className={btn.danger}
    >
      {pending ? "Đang xóa…" : "Xóa hẳn (không lấy lại được)"}
    </button>
  );
}
