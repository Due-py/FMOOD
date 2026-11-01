"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { MAX_FEEDBACK, missingRequired, PRACTICE_STEPS, STATE_LABEL, STEP_LABEL, type Answers } from "@/lib/practice/state";
import { ROLEPLAY_BREAK_TEXT } from "@/lib/safety/crisis-text";
import { CASEL, subskill } from "@/lib/sel/casel";
import { SKILLS, type Skill } from "@/lib/skills";
import { FIELD_SHORT, SKILL_CONTRAST, type SkillSample } from "@/lib/skill-samples";
import { RightPanel } from "@/components/RightPanel";
import { SideSheet } from "@/components/SideSheet";
import { ArrowLeft, CheckIcon } from "@/components/ui/icons";
import { btn, input, pill } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { side } from "../../../chat/[id]/side-styles";
import { CrisisNotice, type SupportCards } from "../../CrisisNotice";

type Hint = { hints: string[] | null; showExample: boolean };

/**
 * Bài luyện một kỹ năng, chu trình H-M-T-G-N. Trình duyệt chỉ hiện và gửi nút học sinh bấm;
 * máy chủ quyết định bước và trạng thái (app/actions/practice.ts, lib/practice/state.ts).
 */
export function PracticeView({
  userId,
  initial,
  nextCase,
  sample,
  supportCards,
}: {
  userId: string;
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
  const [crisis, setCrisis] = useState<{ text: string; notified: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  // câu trợ lý đáp ở bước Nhìn lại (chỉ hiện ngay sau khi xong, không lưu)
  const [reaction, setReaction] = useState<string | null>(null);
  // xem lại bước Hiểu / Mẫu đã qua (chỉ đọc, không đổi bước của bài)
  const [peek, setPeek] = useState<"H" | "M" | null>(null);
  // ngăn kéo "Tình huống & tiêu chí" (< 1280px; từ 1280px là cột tham chiếu neo mép phải)
  const [sheet, setSheet] = useState(false);
  const skill = SKILLS[view.skill];

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
        <BackLink />
        <CrisisNotice text={crisis.text} notified={crisis.notified} cards={supportCards} />
      </div>
    );
  }

  const railed = view.state !== "safety";
  const pausable = view.state !== "paused" && view.state !== "completed";
  const rail = (inSheet: boolean) => (
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
  );

  // Bố cục (Duy duyệt 01/11): từ 1280px cột tham chiếu neo mép phải (RightPanel), cột làm bài 768px căn giữa vùng còn lại
  // như khung chat Học cùng AI. data-chat-page: layout bỏ giới hạn rộng của main và cho panel 300–360px như Học cùng AI.
  // Nhỏ hơn 1280px: thanh bước ngang, tình huống ngay dưới, nút mở ngăn kéo cùng nội dung cột tham chiếu.
  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-6">
      <BackLink />
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          {skill.emoji} {CASEL[subskill(skill.id).primary].name}
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{skill.name}</h1>
        <div className={cn("space-y-3", railed && "xl:hidden")}>
          <StepBar view={view} peek={peek} onPeek={setPeek} />
          {railed && (
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-haspopup="dialog"
              className={cn(btn.secondary, "w-full justify-between px-4 py-2.5 text-sm")}
            >
              <span>
                <span aria-hidden>📋 </span>Tình huống &amp; tiêu chí
              </span>
              <span aria-hidden>›</span>
            </button>
          )}
        </div>
        {view.situation && (
          <div className={cn("rounded-2xl bg-surface-2 px-4 py-3 text-sm", railed && "xl:hidden")}>
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{view.own ? "Tình huống của bạn" : "Tình huống mẫu"}</span>
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
        <section className="rounded-[var(--radius-card)] bg-surface-2 p-5">
          <p className="font-semibold">Bài đang tạm dừng. Những gì bạn đã viết vẫn được giữ.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run("resume", () => stepPractice(view.id, "resume"))} className={btn.primary}>
              {busy === "resume" ? "Đang mở…" : "Làm tiếp"}
            </button>
            <DeleteButton id={view.id} onDeleted={() => router.push("/luyen")} />
          </div>
        </section>
      ) : view.state === "completed" ? (
        <Completed view={view} skill={skill} reaction={reaction} nextCase={nextCase} />
      ) : (
        <>
          {peek && peek !== view.step && <PeekPanel step={peek} skill={skill} sample={sample} onClose={() => setPeek(null)} />}
          {view.step === "H" && <UnderstandStep view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}
          {view.step === "M" && <ExampleStep view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}
          {view.step === "T" && <WriteStep userId={userId} view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}
          {view.step === "G" && <FeedbackStep userId={userId} cards={supportCards} view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}
          {view.step === "N" && <ReviewStep userId={userId} onReaction={setReaction} view={view} skill={skill} sample={sample} run={run} pending={pending} busy={busy} />}

          {/* từ 1280px "Dừng ở đây" nằm ở cuối cột tham chiếu */}
          <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4 xl:hidden">
            <button type="button" disabled={pending} onClick={() => run("pause", () => stepPractice(view.id, "pause"))} className={btn.ghost}>
              {busy === "pause" ? "Đang lưu…" : "Dừng ở đây"}
            </button>
            <span className="text-xs text-muted">Bài viết được giữ, lúc nào muốn thì làm tiếp.</span>
          </footer>
        </>
      )}

      {railed && (
        <RightPanel aria-label="Tình huống và tiêu chí của bài luyện" className="hidden xl:block">
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

// ───────── Cột tham chiếu ─────────

/**
 * Cột tham chiếu (Duy duyệt 01/11): những gì cần nhìn TRONG LÚC làm, cùng chuẩn chữ với panel Học cùng AI (side-styles):
 * 5 bước xếp dọc (Hiểu, Mẫu đã qua bấm được để xem lại), tình huống, "Bài tốt cần có", xem lại ví dụ, dừng ở đây.
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
    <>
      <div className={side.head}>
        <h2 className={side.title}>Bài luyện</h2>
        <p className={side.desc}>{view.state === "not_started" ? "5 bước, làm lúc nào cũng được." : `${STATE_LABEL[view.state]} · 5 bước`}</p>
      </div>

      <ol aria-label="Các bước của bài luyện" className="space-y-0.5">
        {PRACTICE_STEPS.map((step, i) => {
          const done = completed || i < at;
          const now = !completed && i === at;
          const reviewable = canPeek && (step === "H" || step === "M") && i < at;
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                  done ? "bg-brand text-brand-ink" : now ? "border-2 border-brand-edge text-brand-ink" : "border border-line text-muted",
                )}
              >
                {done ? <CheckIcon size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("min-w-0 flex-1", !done && !now && "text-muted")}>{STEP_LABEL[step]}</span>
              {reviewable && <span className="text-xs font-semibold text-brand-strong dark:text-brand">{peek === step ? "Đang xem" : "Xem lại"}</span>}
            </>
          );
          const row = cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm", now && "bg-brand-soft font-semibold ring-1 ring-brand-edge/60");
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

      {view.situation && (
        <section className="mt-6">
          <h3 className={side.group}>{view.own ? "Tình huống của bạn" : "Tình huống mẫu"}</h3>
          <p className={cn(side.text, "mt-1.5 whitespace-pre-wrap leading-relaxed")}>{view.situation}</p>
        </section>
      )}

      <section className="mt-6">
        <h3 className={side.group}>Bài tốt cần có</h3>
        <ul className="mt-1.5 space-y-2 px-3 text-sm">
          {skill.criteria.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-edge" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {((canPeek && at > PRACTICE_STEPS.indexOf("M")) || pause) && (
        <div className="mt-5 space-y-0.5 border-t border-line pt-3">
          {canPeek && at > PRACTICE_STEPS.indexOf("M") && (
            <button type="button" onClick={() => onPeek(peek === "M" ? null : "M")} aria-pressed={peek === "M"} className={side.action}>
              {peek === "M" ? "Đóng ví dụ" : "Xem lại ví dụ"} <span aria-hidden>→</span>
            </button>
          )}
          {pause && (
            <button type="button" disabled={pause.pending} onClick={pause.onClick} className={cn(side.action, "font-medium text-muted hover:bg-surface-2")}>
              {pause.busy ? "Đang lưu…" : "Dừng ở đây, làm tiếp sau"}
            </button>
          )}
        </div>
      )}
    </>
  );
}

type Run = <T extends object>(name: string, action: () => Promise<PracticeResult<T>>, after?: (res: Extract<PracticeResult<T>, { ok: true }>) => void) => void;
type StepProps = { view: View; skill: Skill; sample: SkillSample; run: Run; pending: boolean; busy: string | null };

function BackLink() {
  return (
    <Link href="/ky-nang" className={cn(btn.ghost, "-ml-3")}>
      <ArrowLeft size={18} /> Luyện kỹ năng
    </Link>
  );
}

/** Thanh 5 bước H-M-T-G-N và trạng thái hiện tại. Bước Hiểu, Mẫu đã qua bấm được để xem lại (chỉ đọc). */
function StepBar({ view, peek, onPeek }: { view: View; peek: "H" | "M" | null; onPeek: (s: "H" | "M" | null) => void }) {
  const at = PRACTICE_STEPS.indexOf(view.step);
  const canPeek = view.state !== "safety" && view.state !== "completed";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="w-full text-sm font-semibold sm:hidden" aria-hidden>
        Bước {Math.min(at + 1, 5)}/5: {STEP_LABEL[view.step]}
      </p>
      <ol className="flex flex-1 gap-1" aria-label="Các bước của bài luyện">
        {PRACTICE_STEPS.map((step, i) => {
          const bar = <span className={cn("block h-1.5 rounded-full", i <= at || view.state === "completed" ? "bg-brand" : "bg-line")} />;
          const label = STEP_LABEL[step];
          const reviewable = canPeek && (step === "H" || step === "M") && i < at;
          return (
            <li key={step} className="flex-1" aria-current={i === at ? "step" : undefined}>
              {reviewable ? (
                <button
                  type="button"
                  onClick={() => onPeek(peek === step ? null : (step as "H" | "M"))}
                  aria-pressed={peek === step}
                  aria-label={`Xem lại bước ${label}`}
                  className="block w-full text-left"
                  title={`Xem lại bước ${label}`}
                >
                  {bar}
                  <span className={cn("mt-1 block text-xs font-semibold underline decoration-dotted underline-offset-2 max-sm:sr-only", peek === step ? "text-ink" : "text-muted")}>
                    Xem lại: {label}
                  </span>
                </button>
              ) : (
                <>
                  {bar}
                  <span className={cn("mt-1 block text-xs font-semibold max-sm:sr-only", i === at ? "text-ink" : "text-muted")}>{label}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {view.state !== "not_started" && <span className={pill}>{STATE_LABEL[view.state]}</span>}
    </div>
  );
}

// ───────── H: Hiểu ─────────

/**
 * Khung an toàn của mô-đun (SKILLS[k].safetyNote): chữ giao diện CỐ ĐỊNH đã duyệt, hiện ở bước Hiểu và Tự thử.
 * Không bao giờ đưa cho trợ lý AI.
 */
function SafetyNote({ skill }: { skill: Skill }) {
  if (!skill.safetyNote) return null;
  return (
    <aside aria-label="Lưu ý an toàn" className="rounded-[var(--radius-card)] border border-line bg-peach/60 px-4 py-3 text-[15px] leading-relaxed">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Lưu ý</span>
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
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 xl:hidden">
        <h3 className="font-semibold">Bài tốt cần có</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
          {skill.criteria.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-[var(--radius-card)] bg-surface-2 p-5 text-[15px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ô {c.field}: chưa tốt → tốt hơn</p>
        <p className="mt-2">
          <span className="mr-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">Chưa tốt</span>
          {c.weak}
        </p>
        <p className="mt-1.5">
          <span className="mr-2 rounded-full bg-mint px-2 py-0.5 text-xs font-bold">Tốt hơn</span>
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
    <section className="space-y-3 rounded-[var(--radius-card)] border-2 border-dashed border-line p-4" aria-label={`Xem lại bước ${STEP_LABEL[step]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Xem lại: {STEP_LABEL[step]}</p>
        <button type="button" onClick={onClose} className={cn(btn.ghost, "px-3 py-1 text-sm")}>
          Đóng
        </button>
      </div>
      {step === "H" ? (
        <>
          <p className="rounded-2xl bg-sky p-4 text-[15px] leading-relaxed">{skill.understand}</p>
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
      <h2 className="font-display text-xl font-bold tracking-tight">Vì sao luyện cách này?</h2>
      <p className="rounded-[var(--radius-card)] bg-sky p-5 text-[15px] leading-relaxed">{skill.understand}</p>
      {view.bridge && <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-[15px]">{view.bridge}</p>}
      <SafetyNote skill={skill} />
      <GoodWork skill={skill} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run("next", () => stepPractice(view.id, "next"))} className={btn.primary}>
          {busy === "next" ? "Đang mở…" : "Xem ví dụ"}
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
    <div className="rounded-[var(--radius-card)] bg-butter p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{note ?? "Mẫu ở một tình huống khác"}</p>
      <p className="mt-1 font-semibold">{example.situation}</p>
      <ul className="mt-3 space-y-1.5 text-[15px]">
        {example.lines.map((l) => (
          <li key={l} className="rounded-xl bg-surface/70 px-3 py-2">
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
    <div className="rounded-[var(--radius-card)] bg-butter p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mẫu ở một tình huống khác</p>
      <p className="mt-1 font-semibold">{sample.situation}</p>
      <ul className="mt-3 space-y-1.5 text-[15px]">
        {sample.lines.map((l, i) => (
          <li key={i} className="rounded-xl bg-surface/70 px-3 py-2">
            <span className="block text-xs font-semibold text-muted">{short[i]}</span>
            {l.text}
            <details className="mt-1 text-sm">
              <summary className="cursor-pointer text-xs font-semibold text-brand-strong dark:text-brand">Vì sao dòng này tốt?</summary>
              <p className="mt-1 text-muted">{l.why}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExampleStep({ view, skill, sample, run, pending, busy }: StepProps) {
  const [other, setOther] = useState<{ situation: string; lines: string[] } | null>(null);
  const [none, setNone] = useState(false);
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold tracking-tight">Xem một mẫu</h2>
      <p className="text-sm text-muted">Mẫu là chuyện của một bạn khác, hoặc khung có chỗ trống. Bạn sẽ tự viết cho tình huống của mình ở bước sau.</p>
      <AnnotatedSample sample={sample} skill={skill} />
      {other && <ExampleBox example={other} note="Thêm một ví dụ ở tình huống khác" />}
      {none && <p className="text-sm text-muted">Chưa có ví dụ khác lúc này. Bạn dùng mẫu ở trên nhé.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run("next", () => stepPractice(view.id, "next"))} className={btn.primary}>
          {busy === "next" ? "Đang mở…" : "Mình tự làm"}
        </button>
        {view.exampleLeft && !other && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run("example", () => practiceExample(view.id), (res) => {
                if (res.example) setOther(res.example);
                else setNone(true);
              })
            }
            className={btn.secondary}
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

function Fields({
  view,
  skill,
  sample,
  answers,
  set,
  run,
  pending,
  busy,
}: StepProps & { answers: Answers; set: (k: string, v: string) => void }) {
  const [hints, setHints] = useState<Record<string, Hint>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  return (
    <div className="space-y-5">
      {skill.fields.map((f) => {
        const hint = hints[f.key];
        const isSkipped = skipped.includes(f.key);
        return (
          <div key={f.key} className="space-y-2">
            <label htmlFor={`f-${f.key}`} className="block font-semibold">
              {f.label}
              {f.required && (
                <span className="text-brand-strong dark:text-brand" aria-label="(cần để tính là hoàn thành)">
                  {" "}
                  *
                </span>
              )}
            </label>
            {isSkipped && !answers[f.key] ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                Đã bỏ qua ô này.
                <button type="button" onClick={() => setSkipped(skipped.filter((k) => k !== f.key))} className="font-semibold underline underline-offset-4">
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
                className={cn(input, "resize-y")}
              />
            )}
            {!isSkipped && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run("hint:" + f.key, () => practiceHint(view.id, f.key, answers), (res) =>
                    setHints((h) => ({ ...h, [f.key]: { hints: res.hints, showExample: res.showExample } })),
                  )
                }
                className="text-sm font-semibold text-brand-strong underline-offset-4 hover:underline dark:text-brand"
              >
                {busy === "hint:" + f.key ? "Đang nghĩ câu gợi ý…" : "Mình chưa biết"}
              </button>
            )}
            {hint && !isSkipped && (
              <div className="rounded-2xl bg-mint/60 p-3 text-sm">
                {hint.hints ? (
                  <>
                    <p className="font-semibold">Thử nghĩ theo một trong các câu này:</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {hint.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Xem lại mẫu nhé:</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {sample.lines.map((l, i) => (
                        <li key={i}>
                          <span className="font-semibold">{FIELD_SHORT[skill.id][i]}:</span> {l.text}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run("skip:" + f.key, () => stepPractice(view.id, "skip"), () => {
                      setSkipped((s) => [...s, f.key]);
                      set(f.key, "");
                    })
                  }
                  className={cn(btn.ghost, "mt-2 -ml-2 px-2 py-1 text-sm")}
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

function WriteStep({ userId, ...p }: StepProps & { userId: string }) {
  const { view, skill, run, pending, busy } = p;
  const { answers, set, clear } = useDraft(userId, view.id, 1, {});
  const filled = Object.values(answers).some((v) => v.trim().length >= 2);
  const missing = missingRequired(view.skill, answers);
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">Tự làm</h2>
        <p className="text-sm text-muted">
          Viết bằng lời của bạn. Ô có dấu * cần có để bài được tính là hoàn thành; ô nào chưa nghĩ ra thì bấm “Mình chưa biết” hoặc bỏ qua.
        </p>
      </div>
      <SafetyNote skill={skill} />
      <Fields {...p} answers={answers} set={set} />
      {filled && missing.length > 0 && <p className="text-sm text-muted">Còn {missing.length} ô có dấu * chưa viết. Bạn vẫn lưu được và viết thêm ở lần 2.</p>}
      <button
        type="button"
        disabled={pending || !filled}
        onClick={() => run("submit", () => submitPractice(view.id, answers), () => clear())}
        className={btn.primary}
      >
        {busy === "submit" ? "Đang lưu…" : "Lưu bài (lần 1)"}
      </button>
    </section>
  );
}

// ───────── G: Góp ý ─────────

function FeedbackCard({ feedback, version }: { feedback: PracticeFeedback; version: number }) {
  if (feedback.kind === "criteria") {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p className="font-semibold">Tự soát bài lần {version} theo các tiêu chí này</p>
        <p className="text-sm text-muted">Lúc này trợ lý chưa góp ý được, bài của bạn vẫn đã được lưu.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px]">
          {feedback.criteria.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-[15px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Góp ý cho bài lần {version} (không chấm điểm)</p>
      <p>
        <span className="font-semibold">Điểm làm tốt: </span>
        {feedback.good}
      </p>
      <p>
        <span className="font-semibold">Điểm nên sửa: </span>
        {feedback.fix}
      </p>
      <p>
        <span className="font-semibold">Câu hỏi để bạn tự sửa: </span>
        {feedback.question}
      </p>
    </div>
  );
}

function AnswersBox({ skill, attempt }: { skill: Skill; attempt: AttemptView }) {
  return (
    <dl className="space-y-2 rounded-[var(--radius-card)] bg-surface-2 p-4 text-[15px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bài lần {attempt.version}</p>
      {skill.fields.map((f) => (
        <div key={f.key}>
          <dt className="text-sm text-muted">{f.label}</dt>
          <dd className="whitespace-pre-wrap">{attempt.answers[f.key] || <span className="text-muted">(bỏ trống)</span>}</dd>
        </div>
      ))}
    </dl>
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
    <section className="space-y-5">
      <h2 className="font-display text-xl font-bold tracking-tight">Góp ý và sửa bài</h2>
      {view.attempts.map((a) => (
        <div key={a.version} className="space-y-3">
          <AnswersBox skill={skill} attempt={a} />
          {a.feedback && <FeedbackCard feedback={a.feedback} version={a.version} />}
        </div>
      ))}

      {revising && first ? (
        <Revise userId={userId} {...p} start={first.answers} onDone={() => setRevising(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {canAsk && (
            <button type="button" disabled={pending} onClick={() => run("feedback", () => requestPracticeFeedback(view.id))} className={btn.primary}>
              {busy === "feedback" ? "Trợ lý đang đọc bài…" : latest.version === 2 ? "Nhờ góp ý bài lần 2" : "Nhờ trợ lý góp ý"}
            </button>
          )}
          {canRevise && (
            <button type="button" onClick={() => setRevising(true)} className={btn.primary}>
              Sửa bài (lần 2)
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run("next", () => stepPractice(view.id, view.feedbackCount ? "next" : "skip"))}
            className={btn.secondary}
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
    <div className="space-y-4 rounded-[var(--radius-card)] border-2 border-dashed border-line p-4">
      <p className="font-semibold">Sửa bài theo góp ý. Bài lần 1 vẫn được giữ để bạn tự so.</p>
      <Fields {...p} answers={answers} set={set} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run("submit", () => submitPractice(view.id, answers), () => {
              clear();
              onDone();
            })
          }
          className={btn.primary}
        >
          {busy === "submit" ? "Đang lưu…" : "Lưu bài (lần 2)"}
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
  const blocked = roleplayBlocked(view.skill, { own: view.own, caseCode: view.caseCode });
  if (blocked) {
    return (
      <div className="rounded-[var(--radius-card)] bg-surface-2 p-5 text-sm">
        <p className="font-semibold">{spec.title}</p>
        <p className="mt-1 text-muted">{blocked}</p>
      </div>
    );
  }
  const opening = roleplayOpening(view.skill, view.caseCode);
  // vai bạn cùng lớp nói trước: chưa có lượt nào thì hiện câu mở đầu soạn sẵn (lưu cùng lượt đầu của bạn)
  const shown = turns.length === 0 && opening ? [{ role: "partner" as const, text: opening }] : turns;
  return (
    <div className="space-y-3 rounded-[var(--radius-card)] bg-sky p-5">
      <p className="font-display text-lg font-bold tracking-tight">{spec.title}</p>
      <p className="text-sm text-muted">{spec.intro}</p>
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((t, i) => (
            <li key={i} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-[15px]", t.role === "student" ? "ml-auto bg-brand text-brand-ink" : "bg-surface")}>
              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">{turnLabel(t, spec)}</span>
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
            className={cn(input, "flex-1 resize-y")}
          />
          <button
            type="button"
            disabled={pending || text.trim().length < 2}
            onClick={() => run("roleplay", () => practiceRoleplay(view.id, text), () => setText(""))}
            className={cn(btn.primary, "sm:self-end")}
          >
            {busy === "roleplay" ? spec.busy : "Nói"}
          </button>
        </div>
      ) : (
        <p className="text-sm font-semibold">Bạn đã tập đủ lượt cho bài này rồi.</p>
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
    <section className="space-y-5">
      <h2 className="font-display text-xl font-bold tracking-tight">Nhìn lại</h2>
      {view.attempts.length === 2 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {view.attempts.map((a) => (
            <AnswersBox key={a.version} skill={skill} attempt={a} />
          ))}
        </div>
      )}
      {view.skill === "ask_for_help" && (
        <div className="rounded-2xl bg-surface-2 p-4 text-sm">
          <p className="font-semibold">Bạn muốn nhờ thế nào?</p>
          <p className="mt-1 text-muted">Gửi lời nhờ qua F-Mood (bạn tự xem lại trước khi gửi), hoặc tự hỏi trực tiếp thầy cô. Cả hai đều được.</p>
          {/* lời nhờ 3 ý được điền sẵn từ bài làm này (máy chủ đọc lại bài của chính bạn); bạn sửa được trước khi gửi */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/giup-do?luyen=${view.id}#hen-gap`} className={btn.secondary}>
              Gửi qua F-Mood
            </Link>
            <Link href={`/giup-do?luyen=${view.id}&tu-hoi=1#hen-gap`} className={btn.ghost}>
              Soạn để tự hỏi
            </Link>
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <div className="rounded-2xl bg-butter px-4 py-3 text-sm">
          <p>Bài còn {missing.length} ô có dấu * chưa viết nên chưa tính là hoàn thành. Bạn vẫn dừng ở đây được, bài sẽ được giữ.</p>
          {view.attempts.length === 1 && first && !revising && (
            <button type="button" onClick={() => setRevising(true)} className={cn(btn.secondary, "mt-3")}>
              Viết thêm (lần 2)
            </button>
          )}
        </div>
      )}
      {revising && first && <Revise userId={userId} {...p} start={first.answers} onDone={() => setRevising(false)} />}
      <div className="space-y-2">
        <label htmlFor="next-try" className="block font-semibold">
          Một việc bạn sẽ thử thật (không bắt buộc)
        </label>
        <textarea
          id="next-try"
          value={nextTry}
          onChange={(e) => setNextTry(e.target.value)}
          maxLength={LIMITS.nextTry}
          rows={2}
          placeholder="Ví dụ: tối thứ Năm mình sẽ ___"
          className={cn(input, "resize-y")}
        />
      </div>
      <button
        type="button"
        disabled={pending || missing.length > 0}
        onClick={() => run("finish", () => finishPractice(view.id, nextTry.trim() || null), (res) => onReaction(res.reaction))}
        className={btn.primary}
      >
        {busy === "finish" ? "Đang lưu…" : "Mình đã làm xong"}
      </button>
    </section>
  );
}

function Completed({ view, skill, reaction, nextCase }: { view: View; skill: Skill; reaction: string | null; nextCase: { code: string; situation: string } | null }) {
  return (
    <section className="space-y-5">
      <div className="rounded-[var(--radius-card)] bg-mint p-5">
        <p className="font-display text-xl font-bold tracking-tight">Bạn đã luyện xong bài này 🌱</p>
        {view.nextTry && <p className="mt-2">Việc bạn sẽ thử: “{view.nextTry}”</p>}
        {reaction && <p className="mt-2 text-[15px]">{reaction}</p>}
      </div>
      <div className={cn("grid gap-3", view.attempts.length === 2 && "sm:grid-cols-2")}>
        {view.attempts.map((a) => (
          <AnswersBox key={a.version} skill={skill} attempt={a} />
        ))}
      </div>
      {nextCase && <NextCase skill={view.skill} nextCase={nextCase} />}
      <div className="flex flex-wrap gap-2">
        <Link href={`/luyen/${subskill(view.skill).slug}`} className={btn.secondary}>
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
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Thử dùng lại cách này ở tình huống mới</p>
      <p className="mt-1 font-semibold">{nextCase.situation}</p>
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
            const res = await startPractice({ subskill: skill, caseCode: nextCase.code, from: "skills" });
            if (res.ok) router.push(`/luyen/bai/${res.id}`);
            else setError("crisis" in res ? "Chưa mở được bài mới lúc này." : res.error);
          })
        }
        className={cn(btn.primary, "mt-3")}
      >
        {pending ? "Đang mở…" : "Luyện tình huống này"}
      </button>
    </div>
  );
}

/** Đã chuyển an toàn (mở lại bài sau đó): không hiện bài, chỉ hiện thẻ hỗ trợ. */
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
