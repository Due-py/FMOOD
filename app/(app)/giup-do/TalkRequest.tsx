"use client";

import { useState, useTransition } from "react";
import { askToTalk } from "@/app/actions/help";
import { noteSelfAsk } from "@/app/actions/review";
import { btn, card, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import {
  composeSelfAsk,
  PART_MAX,
  PARTS,
  SELF_ASK_LABEL,
  TO_LABEL,
  WHEN_LABEL,
  type HelpParts,
  type HelpRequest,
  type HelpToRole,
  type HelpWhen,
} from "@/lib/help-requests-shared";
import { HelpProgress } from "./HelpProgress";

/**
 * Không gấp: lời nhờ thầy cô chủ nhiệm hoặc phòng tham vấn (HD05, QT10).
 * Viết 3 ý → XEM TRƯỚC đúng những gì thầy cô sẽ đọc → sửa → bấm "Gửi" mới gửi.
 * "Soạn để tự hỏi" (mục 5.1): soạn 3 ý thành lời để tự nói / tự nhắn thầy cô; chỉ sao chép trên máy, KHÔNG gửi,
 * không lưu, và "đã sao chép" không bao giờ được tính là "đã gửi". Gửi rồi thì thấy lời nhờ đang ở đâu.
 */
export function TalkRequest({
  hasClass,
  prefill,
  waiting,
  selfAsk = false,
}: {
  hasClass: boolean;
  /** điền sẵn từ chuyện bận lòng, bài luyện K4 hoặc tên bài học; học sinh sửa được */
  prefill: { difficulty: string; tried: string; want?: string };
  /** lời nhờ đang chờ của học sinh (để thấy trạng thái) */
  waiting: HelpRequest[];
  /** mở sẵn cách "Soạn để tự hỏi" (người nhận: thầy cô bộ môn) */
  selfAsk?: boolean;
}) {
  // "subject": thầy cô bộ môn, học sinh tự hỏi (không có hộp lời nhờ, không gửi qua hệ thống)
  const [toRole, setToRole] = useState<HelpToRole | "subject">(selfAsk ? "subject" : hasClass ? "teacher" : "counselor");
  const [when, setWhen] = useState<HelpWhen>("break");
  const [parts, setParts] = useState<{ difficulty: string; tried: string; want: string }>({ want: "", ...prefill });
  const [withBuddy, setWithBuddy] = useState(false);
  // "self": xem lời soạn để tự hỏi (từ người nhận "tự hỏi", hoặc bấm "Soạn để tự hỏi" cạnh nút Gửi)
  const [step, setStep] = useState<"write" | "preview" | "self">("write");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<{ already: boolean; urgent: boolean; at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const clean: HelpParts = { difficulty: parts.difficulty.trim(), tried: parts.tried.trim() || null, want: parts.want.trim() };
  const sendTo: HelpToRole = toRole === "subject" ? (hasClass ? "teacher" : "counselor") : toRole;
  const recipient = TO_LABEL[sendTo];

  if (sent) {
    return (
      <section role="status" aria-label="Lời nhờ đã gửi" className={cn(card, "space-y-3 bg-lilac")}>
        <p className="font-display text-lg font-bold">{sent.already ? "Bạn đã gửi lời nhờ này rồi, đang chờ thầy cô." : "Đã gửi lời nhờ."}</p>
        {!sent.already && (
          <HelpProgress steps={[{ key: "sent", label: "Đã gửi", at: sent.at }, { key: "seen", label: "Thầy cô đã xem", at: null }, { key: "replied", label: "Thầy cô đã trả lời", at: null }]} />
        )}
        <p className="text-sm">
          {recipient} sẽ trả lời bạn ở trang chủ. Thầy cô có thể chưa xem ngay; khi thầy cô mở lời nhờ, ở đây sẽ hiện “Thầy cô đã xem”.
          {sent.urgent && " Nếu bạn đang gặp nguy hiểm, đừng chờ: gọi 111 hoặc 115 ngay, hoặc tìm người lớn gần nhất."}
        </p>
      </section>
    );
  }

  if (step === "self") {
    const who = toRole === "subject" ? "thầy cô bộ môn" : recipient.toLowerCase();
    return (
      <section id="hen-gap" aria-label="Lời nhờ để tự hỏi" className={cn(card, "scroll-mt-24 space-y-4")}>
        <div>
          <h2 className="font-display text-lg font-bold">Soạn để tự hỏi</h2>
          <p className="text-sm text-muted">
            Lời này để bạn tự nói hoặc tự nhắn {who}. F-Mood <strong>không gửi</strong> và không lưu lời này.
          </p>
        </div>
        <p className="whitespace-pre-wrap rounded-3xl border border-line bg-surface p-4">{composeSelfAsk(clean)}</p>
        <p className="text-sm text-muted">Mẹo: hỏi lúc thầy cô không vội (giờ ra chơi, cuối giờ). Có thể rủ một bạn đi cùng cho đỡ ngại.</p>
        {copied && (
          <p role="status" className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
            Đã sao chép. <strong>Lời nhờ này CHƯA được gửi</strong>: bạn tự nói hoặc tự nhắn cho thầy cô nhé.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn.primary}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(composeSelfAsk(clean));
                // chỉ đếm số lần sao chép (không gửi, không lưu chữ); một lần mỗi lần soạn
                if (!copied) void noteSelfAsk().catch(() => {});
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Sao chép lại" : "Sao chép"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCopied(false);
              setStep("write");
            }}
            className={btn.secondary}
          >
            Sửa lại
          </button>
          <button
            type="button"
            onClick={() => {
              setCopied(false);
              if (toRole === "subject") setToRole(sendTo);
              setStep("preview");
            }}
            className={btn.ghost}
          >
            Gửi qua F-Mood thay vì tự hỏi
          </button>
        </div>
      </section>
    );
  }

  if (step === "preview") {
    return (
      <section id="hen-gap" aria-label="Xem trước lời nhờ" className={cn(card, "scroll-mt-24 space-y-4")}>
        <div>
          <h2 className="font-display text-lg font-bold">Xem trước lời nhờ</h2>
          <p className="text-sm text-muted">Đây đúng là những gì {recipient.toLowerCase()} sẽ đọc. Lời nhờ CHƯA được gửi cho tới khi bạn bấm “Gửi”.</p>
        </div>
        <div className="space-y-2 rounded-3xl border border-line bg-surface p-4">
          <p className="text-sm">
            <strong>Gửi:</strong> {recipient} · <strong>Lúc tiện:</strong> {WHEN_LABEL[when].toLowerCase()}
          </p>
          {PARTS.map((p) => {
            const value = clean[p.key];
            return value ? (
              <p key={p.key}>
                <span className="block text-xs font-semibold text-muted">{p.label}</span>
                {value}
              </p>
            ) : null;
          })}
          {withBuddy && <p className="text-sm font-semibold">🧑‍🤝‍🧑 Mình muốn rủ một bạn đi cùng khi gặp thầy cô</p>}
        </div>
        <p className="text-sm text-muted">Cuộc trò chuyện với trợ lý AI và chuyện bạn kể trong app KHÔNG được gửi kèm.</p>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className={btn.primary}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await askToTalk({ toRole: sendTo, when, difficulty: clean.difficulty, tried: clean.tried ?? "", want: clean.want, withBuddy });
                if (res.ok) setSent({ already: res.already, urgent: res.urgent, at: new Date().toISOString() });
                else setError(res.error);
              });
            }}
          >
            {pending ? "Đang gửi…" : `Gửi cho ${recipient.toLowerCase()}`}
          </button>
          <button type="button" disabled={pending} onClick={() => setStep("write")} className={btn.secondary}>
            Sửa lại
          </button>
          {/* đặt cạnh nút Gửi: soạn thành lời để tự hỏi trực tiếp, không gửi */}
          <button type="button" disabled={pending} onClick={() => setStep("self")} className={btn.ghost}>
            Soạn để tự hỏi
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      id="hen-gap"
      className={cn(card, "scroll-mt-24 space-y-4")}
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.difficulty.length < 2 || clean.want.length < 2) {
          setError("Viết ngắn mình đang khó chỗ nào và muốn thầy cô giúp gì nhé.");
          return;
        }
        setError(null);
        setCopied(false);
        setStep(toRole === "subject" ? "self" : "preview");
      }}
    >
      <div>
        <h2 className="font-display text-lg font-bold">Không gấp? Nhờ thầy cô giúp</h2>
        <p className="text-sm text-muted">Viết 3 ý ngắn, xem trước rồi mới gửi. Thầy cô sẽ trả lời bạn ở trang chủ.</p>
      </div>

      {waiting.map((r) => (
        <div key={r.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
          <p className="mb-2 font-semibold">Lời nhờ đang chờ: gửi {TO_LABEL[r.to_role].toLowerCase()}</p>
          <HelpProgress request={r} />
        </div>
      ))}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Bạn muốn nhờ</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["teacher", "counselor", "subject"] as const)
            .filter((r) => hasClass || r !== "teacher")
            .map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={toRole === r}
                onClick={() => setToRole(r)}
                className={cn("rounded-2xl px-4 py-3 text-left font-semibold transition", toRole === r ? "bg-ink text-bg" : "bg-surface-2")}
              >
                {r === "teacher" ? "🧑‍🏫 " : r === "counselor" ? "🫶 " : "📚 "}
                {r === "subject" ? SELF_ASK_LABEL : TO_LABEL[r]}
              </button>
            ))}
        </div>
        {toRole === "subject" && (
          <p className="mt-2 text-sm text-muted">Bạn soạn lời nhờ rồi tự hỏi thầy cô bộ môn (nói trực tiếp hoặc tự nhắn). F-Mood không gửi lời này.</p>
        )}
      </fieldset>

      {PARTS.map((p) => (
        <label key={p.key} className="block">
          <span className="mb-1 block text-sm font-semibold">
            {p.label}
            {!p.required && <span className="font-normal text-muted"> (không bắt buộc)</span>}
          </span>
          <textarea
            value={parts[p.key]}
            onChange={(e) => setParts({ ...parts, [p.key]: e.target.value })}
            maxLength={PART_MAX}
            rows={2}
            placeholder={p.placeholder}
            className={cn(input, "resize-none")}
          />
        </label>
      ))}

      {toRole !== "subject" && (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Lúc nào tiện cho bạn</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(WHEN_LABEL) as HelpWhen[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={when === w}
                  onClick={() => setWhen(w)}
                  className={cn("rounded-full px-4 py-2 text-sm font-semibold", when === w ? "bg-ink text-bg" : "border border-line bg-surface")}
                >
                  {WHEN_LABEL[w]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <input type="checkbox" checked={withBuddy} onChange={(e) => setWithBuddy(e.target.checked)} className="mt-0.5 size-5 accent-[var(--brand)]" />
            <span>
              <span className="block font-semibold">Nhờ một bạn đi cùng</span>
              <span className="block text-sm text-muted">Bạn có thể rủ một người bạn đi cùng khi gặp thầy cô, cho đỡ ngại.</span>
            </span>
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <button type="submit" className={cn(btn.primary, "w-full")}>
        {toRole === "subject" ? "Soạn lời để tự hỏi" : "Xem trước lời nhờ"}
      </button>
    </form>
  );
}
