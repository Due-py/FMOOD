"use client";

import { useState, useTransition } from "react";
import { confirmWorryDifficulty } from "@/app/actions/worries";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { cleanDifficulty, DIFFICULTY_MAX, type DifficultySource } from "@/lib/worries-shared";

/**
 * "Sóc hiểu là: … Đúng chưa?" (tên nhân vật học sinh chọn) (QT03, QT05). Học sinh bấm "Đúng rồi" thì câu này thành KHÓ KHĂN ĐÃ XÁC NHẬN
 * của chuyện bận lòng; "Chưa đúng" thì tự sửa câu (hoặc chọn câu có sẵn, hoặc kể lại cho trợ lý).
 * Mỗi lần xác nhận / chưa đúng đều được lưu vào lịch sử sửa. Chưa gắn chuyện bận lòng (worryId = null) thì
 * không lưu gì, chỉ báo lên để trợ lý dùng trong cuộc trò chuyện này.
 */
export function DifficultyConfirm({
  text: initial,
  worryId,
  source,
  ownWords: initialOwn = false,
  chips = [],
  askFirst = false,
  onConfirmed,
  onRetell,
  onSkip,
  className,
}: {
  /** câu trợ lý hiểu (trợ lý tóm tắt, hoặc dòng học sinh viết lúc kể); rỗng thì hỏi luôn "khó nhất là gì?" */
  text: string;
  worryId: string | null;
  source: DifficultySource;
  /** câu là lời của học sinh (tự viết / bấm chọn) */
  ownWords?: boolean;
  /** khó khăn hay gặp của chủ đề, để bấm chọn thay vì tự viết */
  chips?: string[];
  /** chưa có câu nào: mở ngay ô "khó nhất là gì?" */
  askFirst?: boolean;
  onConfirmed?: (text: string, risk: string) => void;
  /** "Kể lại cho …" (chỉ có trong trò chuyện) */
  onRetell?: () => void;
  onSkip?: () => void;
  className?: string;
}) {
  const { name } = useAssistant();
  const [text, setText] = useState(initial);
  const [own, setOwn] = useState(initialOwn);
  const [mode, setMode] = useState<"ask" | "edit" | "done">(askFirst || !initial ? "edit" : "ask");
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      let risk = "none";
      if (worryId) {
        const res = await confirmWorryDifficulty(worryId, text, source, "confirmed", own);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        risk = res.risk;
      }
      setMode("done");
      onConfirmed?.(text, risk);
    });
  }

  function notRight() {
    // lưu cả lần "chưa đúng" để thấy cách hiểu đã đổi thế nào (không chờ, không làm phiền học sinh nếu lỗi)
    if (worryId && text) void confirmWorryDifficulty(worryId, text, source, "rejected", own);
    setDraft(own ? text : "");
    setMode("edit");
  }

  if (mode === "done") {
    return (
      <p role="status" className={cn("rounded-3xl bg-mint px-4 py-3 text-sm", className)}>
        <span className="font-semibold">✓ Mình ghi nhận: </span>
        {text}
        <span className="mt-1 block text-muted">Mình sẽ dựa vào điều này để gợi ý cho đúng. Lúc nào thấy khác đi, bạn sửa được.</span>
      </p>
    );
  }

  if (mode === "edit") {
    return (
      <form
        aria-label="Khó khăn của bạn"
        className={cn("space-y-3 rounded-3xl border-2 border-dashed border-line bg-surface/60 p-4", className)}
        onSubmit={(e) => {
          e.preventDefault();
          const checked = cleanDifficulty(draft);
          if (!checked.ok) {
            setError(checked.error);
            return;
          }
          setError(null);
          setText(checked.value);
          setOwn(true);
          setMode("ask");
        }}
      >
        <p className="font-semibold">{initial && !askFirst ? "Đúng ra là gì? Bạn sửa lại giúp mình nhé." : "Điều làm bạn khó nhất là gì?"}</p>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Chọn câu gần đúng">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setText(c);
                  setOwn(true);
                  setError(null);
                  setMode("ask");
                }}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm transition hover:border-brand hover:bg-brand-soft"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={DIFFICULTY_MAX}
          rows={2}
          placeholder={chips.length ? "Hoặc tự viết ngắn…" : "Ví dụ: mình học rồi nhưng sợ vào phòng thi sẽ quên"}
          aria-label="Tự viết khó khăn của bạn"
          className={cn(input, "resize-none")}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={cn(btn.primary, "px-5 py-2")}>
            Xong
          </button>
          {onRetell && (
            <button type="button" onClick={onRetell} className={btn.secondary}>
              Kể lại cho {name}
            </button>
          )}
          {(onSkip || (initial && !askFirst)) && (
            <button type="button" onClick={() => (onSkip ? onSkip() : setMode("ask"))} className={btn.ghost}>
              {onSkip ? "Bỏ qua" : "Thôi, giữ câu cũ"}
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <section aria-label={`${name} hiểu là`} className={cn("rounded-3xl border-2 border-dashed border-line bg-surface/60 p-4", className)}>
      <p className="text-sm font-semibold text-muted">{name} hiểu là</p>
      <p className="mt-1 text-lg font-semibold leading-snug">“{text}”</p>
      <p className="mt-1 text-sm">Mình hiểu vậy đúng chưa?</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={confirm} className={cn(btn.primary, "px-5 py-2")}>
          {pending ? "Đang lưu…" : "Đúng rồi"}
        </button>
        <button type="button" disabled={pending} onClick={notRight} className={btn.secondary}>
          Chưa đúng
        </button>
        {onSkip && (
          <button type="button" disabled={pending} onClick={onSkip} className={btn.ghost}>
            Bỏ qua
          </button>
        )}
      </div>
    </section>
  );
}
