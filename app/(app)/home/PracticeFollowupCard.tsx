"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { answerPracticeFollowup, saveWorryNextTime, type ReviewResult } from "@/app/actions/review";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { MascotArt } from "@/components/mascot/MascotArt";
import { PhoneIcon } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NEXT_TIME_CHOICES, NEXT_TIME_MAX, NEXT_TIME_QUESTION, USED, USED_EMOJI, USED_QUESTION, type Used } from "@/lib/practice/review";
import type { PracticeFollowup } from "@/lib/practice/server";
import { SKILLS } from "@/lib/skills";

// NHÌN LẠI SAU 1–3 NGÀY (kế hoạch Demo 3, mục 4.1; thuộc Demo 2.1). Bài luyện: chỉ hỏi "Bạn đã dùng cách này thật chưa?"
// (bấm là lưu). Chuyện bận lòng: "Lần sau bạn sẽ chỉnh gì?", chọn nhanh, có ô viết tùy ý.
// Luôn bỏ qua được. Không chấm điểm, không trách khi "chưa có dịp".

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

/** Chữ ngắn trên nút (nhãn đầy đủ USED_LABEL vẫn dùng ở Hành trình). */
const USED_SHORT: Record<Used, string> = { helped: "Dùng rồi, có ích", hard: "Dùng rồi, còn khó", not_yet: "Chưa có dịp" };

/** Luyện xong cách đây mấy ngày, nói như học sinh nói. */
function whenLabel(daysAgo: number): string {
  if (daysAgo <= 1) return "hôm qua";
  if (daysAgo === 2) return "hôm kia";
  return `${daysAgo} ngày trước`;
}

/** Lời cảm ơn một dòng sau khi chọn: chưa có dịp thì không trách, còn khó thì động viên luyện thêm. */
const USED_THANKS: Record<Used, string> = {
  helped: "Cảm ơn bạn đã kể.",
  hard: "Còn khó là bình thường, luyện thêm sẽ dễ hơn.",
  not_yet: "Không sao, lúc cần thì mở lại bài nhé.",
};

/**
 * Thẻ trên Trang chủ: hỏi lại một bài luyện đã hoàn thành 1–3 ngày trước (Duy 01/11: giữ, nhưng gọn).
 * Nhắc lại bài (kỹ năng, tình huống, cách đã luyện hoặc việc định thử) để học sinh hiểu "cách này" là gì, rồi một câu hỏi,
 * ba nút, bấm là lưu; "Bỏ qua" thì thôi hỏi bài này. Không có ô viết.
 */
export function PracticeFollowupCard({ followup }: { followup: PracticeFollowup }) {
  const { name } = useAssistant();
  const skill = SKILLS[followup.skill];
  const [used, setUsed] = useState<Used | null>(null);
  const [done, setDone] = useState<"saved" | "skipped" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(pick: Used | null) {
    setError(null);
    setUsed(pick);
    start(async () => {
      const res = await answerPracticeFollowup(followup.id, { used: pick, choice: null, text: null, skip: !pick });
      if (res.ok) setDone(pick ? "saved" : "skipped");
      else setError("error" in res ? res.error : "Chưa lưu được, bạn thử lại nhé.");
    });
  }

  if (done === "skipped") return null;
  return (
    <section aria-label={`${name} hỏi lại bài luyện`} className="rounded-[26px] bg-surface px-4 py-4 shadow-soft sm:px-[18px] dark:border dark:border-line">
      <div className="flex items-center gap-2">
        <span aria-hidden className="flex shrink-0">
          <MascotArt size={30} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-bold text-muted">
          {name} hỏi lại bài bạn luyện {whenLabel(followup.daysAgo)}
        </p>
        {!done && (
          // viên nhỏ; vùng bấm nới ra trên dưới cho đủ 44px
          <button
            type="button"
            disabled={pending}
            onClick={() => send(null)}
            className="relative shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-muted transition after:absolute after:-inset-x-1 after:-inset-y-2.5 hover:text-ink disabled:opacity-50"
          >
            Bỏ qua
          </button>
        )}
      </div>

      {done === "saved" && used ? (
        <p role="status" className="mt-2.5 rounded-2xl bg-c2 px-3.5 py-2.5 text-sm">
          {USED_EMOJI[used]} {USED_THANKS[used]}{" "}
          <Link href="/hanh-trinh" className="font-semibold underline underline-offset-2">
            Xem trong Hành trình
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-2.5 space-y-1 rounded-[20px] bg-c5 px-3.5 py-3 text-sm">
            <p className="font-display text-[17px] font-bold leading-snug text-c5-ink">
              <span aria-hidden>{skill.emoji} </span>
              {skill.name}
            </p>
            {followup.situation && (
              <p className="line-clamp-2">
                <span className="text-muted">Tình huống: </span>
                {followup.situation}
              </p>
            )}
            <p className={followup.nextTry ? "line-clamp-2" : undefined}>
              {followup.nextTry ? (
                <>
                  <span className="text-muted">Việc bạn định thử: </span>“{followup.nextTry}”
                </>
              ) : (
                <>
                  <span className="text-muted">Cách đã luyện: </span>
                  {skill.tagline}
                </>
              )}
            </p>
          </div>
          <p className="mt-3.5 font-bold">{USED_QUESTION}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {USED.map((u) => (
              <button
                key={u}
                type="button"
                disabled={pending}
                aria-pressed={used === u}
                onClick={() => send(u)}
                className={cn(
                  "min-h-11 rounded-full border-2 bg-surface px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60",
                  used === u ? "border-brand-edge bg-brand-soft" : "border-line hover:border-brand-edge",
                )}
              >
                <span aria-hidden>{USED_EMOJI[u]} </span>
                {USED_SHORT[u]}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
