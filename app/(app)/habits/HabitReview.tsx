"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import Markdown from "react-markdown";
import { renameHabit, startHabitReview, suggestHabitAdjust } from "@/app/actions/habits";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { PhoneIcon } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ADJUST_TIPS, type HabitAdjust } from "@/lib/habits-shared";

// "NHÌN LẠI CÙNG TRỢ LÝ" một thói quen: số liệu app tự đếm → một câu hỏi → một điều chỉnh nhỏ, học sinh chọn hoặc bỏ.
// AI lỗi vẫn hiện số liệu, câu hỏi soạn sẵn và ba cách điều chỉnh để học sinh tự chọn.

type Stage =
  | { step: "idle" }
  | { step: "asked"; facts: string[]; question: string }
  | { step: "suggested"; facts: string[]; adjust: HabitAdjust | null }
  | { step: "applied"; title: string }
  | { step: "crisis"; text: string };

const ANSWER_MAX = 300;

export function HabitReview({ habitId }: { habitId: string }) {
  const { name } = useAssistant();
  const [stage, setStage] = useState<Stage>({ step: "idle" });
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    setError(null);
    startTransition(async () => {
      const res = await startHabitReview(habitId);
      if (res.ok) setStage({ step: "asked", facts: res.facts, question: res.question });
      else setError(res.error);
    });
  }

  function send(skip: boolean) {
    if (stage.step !== "asked") return;
    setError(null);
    startTransition(async () => {
      const res = await suggestHabitAdjust(habitId, stage.question, skip ? null : answer);
      if (res.ok) setStage({ step: "suggested", facts: stage.facts, adjust: res.adjust });
      else if ("crisis" in res) setStage({ step: "crisis", text: res.crisis.text });
      else setError(res.error);
    });
  }

  function apply(adjust: HabitAdjust) {
    setError(null);
    startTransition(async () => {
      const res = await renameHabit(habitId, adjust.newTitle, adjust.kind);
      if (res.ok) setStage({ step: "applied", title: adjust.newTitle });
      else setError(res.error);
    });
  }

  const close = () => {
    setStage({ step: "idle" });
    setAnswer("");
    setError(null);
  };

  if (stage.step === "idle") {
    return (
      <div>
        <button type="button" onClick={begin} disabled={pending} className={cn(btn.secondary, "w-full")}>
          <CharacterAvatar size={26} float={false} />
          {pending ? "Đang xem lại…" : `Nhìn lại cùng ${name}`}
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <section data-review aria-label={`Nhìn lại cùng ${name}`} className="space-y-3 rounded-3xl border border-line bg-surface p-4">
      {"facts" in stage && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">F-Mood đếm được</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {stage.facts.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-muted">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage.step === "asked" && (
        <div className="space-y-3">
          <Said name={name}>
            <p data-review-question>{stage.question}</p>
          </Said>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={ANSWER_MAX}
            rows={2}
            placeholder="Viết vài chữ thôi cũng được"
            aria-label="Câu trả lời của bạn"
            className={cn(input, "resize-none text-[15px]")}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => send(false)} disabled={pending || !answer.trim()} className={cn(btn.primary, "px-5 py-2")}>
              {pending ? "Đang nghĩ…" : "Gửi"}
            </button>
            <button type="button" onClick={() => send(true)} disabled={pending} className={btn.ghost}>
              Bỏ qua câu hỏi
            </button>
          </div>
        </div>
      )}

      {stage.step === "suggested" && (
        <div data-review-suggestion className="space-y-3">
          {stage.adjust ? (
            <>
              <Said name={name}>
                <p>{stage.adjust.text}</p>
                <p className="mt-2 text-sm text-muted">
                  Đổi tên thói quen thành: <strong className="text-ink">“{stage.adjust.newTitle}”</strong>
                </p>
              </Said>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => apply(stage.adjust!)} disabled={pending} className={cn(btn.primary, "px-5 py-2")}>
                  {pending ? "Đang lưu…" : "Chọn cách này"}
                </button>
                <button type="button" onClick={close} disabled={pending} className={btn.ghost}>
                  Không, giữ như cũ
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Lúc này {name} chưa nghĩ được gợi ý. Bạn có thể tự chọn một cách nhỏ dưới đây:</p>
              <ul className="space-y-2">
                {ADJUST_TIPS.map((t) => (
                  <li key={t.kind} className="rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                    <strong className="block">{t.title}</strong>
                    {t.text}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={close} className={cn(btn.secondary, "px-5 py-2")}>
                Xong
              </button>
            </>
          )}
        </div>
      )}

      {stage.step === "applied" && (
        <div className="space-y-3">
          <Said name={name}>
            <p>
              Đã đổi thành <strong>“{stage.title}”</strong>. Thử vài ngày rồi mình cùng nhìn lại nhé.
            </p>
          </Said>
          <button type="button" onClick={close} className={cn(btn.secondary, "px-5 py-2")}>
            Xong
          </button>
        </div>
      )}

      {stage.step === "crisis" && (
        <div role="alert" className="space-y-3 rounded-3xl border border-danger/30 bg-danger-soft p-4 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2">
          <Markdown>{stage.text}</Markdown>
          <Link href="/giup-do" className={cn(btn.danger, "px-5")}>
            <PhoneIcon size={16} /> Cần giúp ngay
          </Link>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}

/** Lời trợ lý: hình nhân vật nhỏ và bong bóng thoại. */
function Said({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CharacterAvatar size={36} float={false} className="mt-1 shrink-0" />
      <div className="min-w-0 flex-1 rounded-3xl rounded-tl-md bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
        <span className="sr-only">{name} nói: </span>
        {children}
      </div>
    </div>
  );
}
