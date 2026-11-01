"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { answerPracticeFollowup, saveWorryNextTime, type ReviewResult } from "@/app/actions/review";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { PhoneIcon } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NEXT_TIME_CHOICES, NEXT_TIME_MAX, NEXT_TIME_QUESTION, USED, USED_EMOJI, USED_LABEL, USED_QUESTION, type Used } from "@/lib/practice/review";
import { SKILLS, type SkillId } from "@/lib/skills";

// NHÌN LẠI SAU 1–3 NGÀY (kế hoạch Demo 3, mục 4.1; thuộc Demo 2.1): "Bạn đã dùng cách này thật chưa? Lần sau bạn sẽ chỉnh gì?"
// Chọn nhanh, có ô viết tùy ý, luôn bỏ qua được. Không chấm điểm, không trách khi "chưa có dịp".

type Crisis = { text: string; notified: boolean };

/** Câu soạn sẵn khi chữ vừa viết có dấu hiệu nguy hiểm (không lưu chữ đó), kèm lối sang trang Cần giúp. */
function CrisisBox({ crisis }: { crisis: Crisis }) {
  return (
    <div role="alert" className="space-y-3 rounded-3xl border border-danger/30 bg-danger-soft p-4 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2">
      <Markdown>{crisis.text}</Markdown>
      <Link href="/giup-do" className={cn(btn.danger, "px-5")}>
        <PhoneIcon size={16} /> Cần giúp ngay
      </Link>
    </div>
  );
}

/** "Lần sau bạn sẽ chỉnh gì?": một ô chọn nhanh (bấm lại để bỏ chọn) và ô viết thêm. */
function NextTimeFields({
  id,
  choice,
  text,
  onChoice,
  onText,
}: {
  id: string;
  choice: string | null;
  text: string;
  onChoice: (c: string | null) => void;
  onText: (t: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">
        {NEXT_TIME_QUESTION} <span className="font-normal text-muted">(không bắt buộc)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {NEXT_TIME_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={choice === c}
            onClick={() => onChoice(choice === c ? null : c)}
            className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition", choice === c ? "bg-ink text-bg" : "bg-surface/70 hover:bg-surface")}
          >
            {c}
          </button>
        ))}
      </div>
      <label htmlFor={`next-time-${id}`} className="sr-only">
        Viết thêm điều bạn sẽ chỉnh
      </label>
      <textarea
        id={`next-time-${id}`}
        value={text}
        onChange={(e) => onText(e.target.value)}
        maxLength={NEXT_TIME_MAX}
        rows={2}
        placeholder="Viết thêm nếu muốn, ví dụ: lần sau mình làm ___ trước"
        className={cn(input, "resize-none")}
      />
    </fieldset>
  );
}

/**
 * Sau khi trả lời "… hỏi thăm" một chuyện bận lòng: hỏi thêm "Lần sau bạn sẽ chỉnh gì?" (lưu vào lần hỏi lại vừa rồi).
 * `save` mặc định là học sinh đang đăng nhập.
 */
export function WorryNextTime({ worryId, save = saveWorryNextTime }: { worryId: string; save?: (worryId: string, choice: string | null, text: string | null) => Promise<ReviewResult> }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"ask" | "saved" | "skipped">("ask");
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<Crisis | null>(null);
  const [pending, start] = useTransition();

  if (crisis) return <CrisisBox crisis={crisis} />;
  if (state === "skipped") return null;
  if (state === "saved") {
    return (
      <p role="status" className="rounded-3xl bg-surface/70 px-4 py-3 text-sm">
        Đã ghi lại điều bạn sẽ chỉnh. Bạn xem lại được trong Hành trình.
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-3xl bg-surface/60 p-4">
      <NextTimeFields id={worryId} choice={choice} text={text} onChoice={setChoice} onText={setText} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || (!choice && text.trim().length < 2)}
          className={btn.secondary}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await save(worryId, choice, text);
              if (res.ok) setState("saved");
              else if ("crisis" in res) setCrisis(res.crisis);
              else setError(res.error);
            })
          }
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" disabled={pending} onClick={() => setState("skipped")} className={btn.ghost}>
          Bỏ qua
        </button>
      </div>
    </div>
  );
}

/** Thẻ trên Trang chủ: hỏi lại một bài luyện đã hoàn thành 1–3 ngày trước. */
export function PracticeFollowupCard({ followup }: { followup: { id: string; skill: SkillId; situation: string | null; nextTry: string | null } }) {
  const { name, emoji } = useAssistant();
  const skill = SKILLS[followup.skill];
  const [used, setUsed] = useState<Used | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<"saved" | "skipped" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<Crisis | null>(null);
  const [pending, start] = useTransition();

  function send(skip: boolean) {
    setError(null);
    start(async () => {
      const res = await answerPracticeFollowup(followup.id, { used, choice, text, skip });
      if (res.ok) setDone(skip ? "skipped" : "saved");
      else if ("crisis" in res) setCrisis(res.crisis);
      else setError(res.error);
    });
  }

  if (done === "skipped") return null;
  return (
    <section aria-label={`${name} hỏi lại bài luyện`} className="rounded-[var(--radius-card)] border-2 border-dashed border-ink/15 bg-mint/60 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span aria-hidden>{emoji}</span> {name} hỏi lại bài luyện
      </p>
      <p className="mt-2 font-display text-lg font-bold tracking-tight">
        {skill.emoji} {skill.name}
      </p>
      {followup.situation && <p className="mt-1 text-sm text-muted">Tình huống: {followup.situation}</p>}
      {followup.nextTry && <p className="mt-1 text-sm">Việc bạn định thử: “{followup.nextTry}”</p>}

      {crisis ? (
        <div className="mt-3">
          <CrisisBox crisis={crisis} />
        </div>
      ) : done === "saved" ? (
        <div role="status" className="mt-3 space-y-3">
          <p className="rounded-3xl bg-surface px-4 py-3">
            {used === "not_yet"
              ? "Chưa có dịp cũng không sao. Khi gặp chuyện tương tự, bạn mở lại bài luyện để nhớ cách làm nhé."
              : used === "hard"
                ? "Cảm ơn bạn đã thử thật. Còn khó là chuyện bình thường; luyện thêm một tình huống nữa sẽ dễ hơn."
                : "Cảm ơn bạn đã kể. Điều bạn sẽ chỉnh được ghi lại trong Hành trình, chỉ mình bạn xem."}
          </p>
          <Link href="/hanh-trinh" className={btn.secondary}>
            Xem hành trình của mình
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{USED_QUESTION}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {USED.map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={used === u}
                  onClick={() => setUsed(used === u ? null : u)}
                  className={cn(
                    "rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition",
                    used === u ? "border-ink/60 bg-surface" : "border-transparent bg-surface/60 hover:bg-surface",
                  )}
                >
                  <span aria-hidden>{USED_EMOJI[u]} </span>
                  {USED_LABEL[u]}
                </button>
              ))}
            </div>
          </fieldset>
          <NextTimeFields id={followup.id} choice={choice} text={text} onChoice={setChoice} onText={setText} />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || (!used && !choice && text.trim().length < 2)} onClick={() => send(false)} className={btn.primary}>
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
            <button type="button" disabled={pending} onClick={() => send(true)} className={btn.ghost}>
              Bỏ qua
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
