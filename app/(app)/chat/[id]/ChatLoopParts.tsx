"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { answerTopicGuess } from "@/app/actions/support-steps";
import { saveWorryFromChat } from "@/app/actions/worries";
import { BadgesCard, type LoopBadge } from "@/app/(app)/checkin/WorryStep";
import { DifficultyConfirm } from "@/components/DifficultyConfirm";
import { LevelPicker } from "@/components/LevelPicker";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { TOPIC_NO_ASK } from "@/lib/chat-loop";
import { MascotArt } from "@/components/mascot/MascotArt";
import { floating, ticket } from "./chat-ui";
import type { ChatLoop } from "@/lib/loop-content";

export type TopicGuess = { topic: string; label: string; emoji: string };
/** Chuyện bận lòng cuộc trò chuyện đang gắn với (để trợ lý biết đang nói về chuyện gì). */
export type ChatWorry = { id: string; topic: string; level: number; difficulty: string | null };

const ASKED_KEY = (conversationId: string) => `fmood-hoi-chu-de:${conversationId}`;
const SUMMARY_KEY = (conversationId: string) => `fmood-hoi-kho-khan:${conversationId}`;

function flag(key: string | null, set = false): boolean {
  if (!key) return false;
  try {
    if (set) localStorage.setItem(key, "1");
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Mỗi cuộc trò chuyện trợ lý chỉ hỏi "Có phải bạn đang lo chuyện…?" một lần. */
export function alreadyAsked(conversationId: string | null): boolean {
  return flag(conversationId ? ASKED_KEY(conversationId) : null);
}

/** Mỗi cuộc trò chuyện trợ lý tự xin xác nhận khó khăn một lần (bấm "… hiểu chưa đúng" thì vẫn hỏi lại). */
export function summaryAsked(conversationId: string | null, mark = false): boolean {
  return flag(conversationId ? SUMMARY_KEY(conversationId) : null, mark);
}

const pickLine = (lines: string[], fallback: string) => lines[Math.floor(Math.random() * lines.length)] ?? fallback;

/**
 * Chọn chủ đề + mức lo rồi lưu thành chuyện bận lòng (kèm khó khăn đã xác nhận nếu có).
 * Chỉ lưu khi học sinh tự bấm "Lưu lại".
 */
function SaveWorryForm({
  loop,
  topic,
  difficulty,
  onSaved,
}: {
  loop: ChatLoop;
  topic: string;
  difficulty: string | null;
  onSaved: (worry: ChatWorry, result: { line: string; badges: LoopBadge[] }) => void;
}) {
  const { name } = useAssistant();
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!level) {
          setError("Chọn một đám mây gần đúng nhất nhé.");
          return;
        }
        start(async () => {
          const res = await saveWorryFromChat({ topic, level, difficulty });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          const badge = loop.badges["dam-ke"];
          onSaved(
            { id: res.worryId, topic, level, difficulty },
            { line: pickLine(loop.savedLines, "Cảm ơn bạn đã kể."), badges: res.firstTime && badge ? [badge] : [] },
          );
        });
      }}
    >
      {loop.askLevel && <p className="text-sm">{loop.askLevel}</p>}
      <LevelPicker
        name={`level-${topic}`}
        value={level}
        onChange={(v) => {
          setLevel(v);
          setError(null);
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btn.primary, "px-5 py-2")}>
        {pending ? "Đang lưu…" : `Lưu lại để ${name} hỏi thăm sau`}
      </button>
    </form>
  );
}

function SavedWorry({ loop, result, worryId }: { loop: ChatLoop; result: { line: string; badges: LoopBadge[] }; worryId: string }) {
  return (
    <div className="ml-[42px] mt-2 space-y-2">
      <p className="w-fit max-w-full rounded-[22px] rounded-bl-md bg-surface px-4 py-2.5 shadow-soft">{result.line}</p>
      <BadgesCard badges={result.badges} />
      {loop.hasSteps && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/viec-nho?chuyen=${worryId}`} className="inline-flex min-h-11 items-center rounded-full bg-c2 px-4 text-sm font-bold text-c2-ink transition hover:shadow-[0_0_0_2px_var(--c2-mid)]">
            🌱 Thử một việc nhỏ
          </Link>
          <Link href={`/viec-nho?chuyen=${worryId}#ke-voi-ai`} className="inline-flex min-h-11 items-center rounded-full bg-c1 px-4 text-sm font-bold text-c1-ink transition hover:shadow-[0_0_0_2px_var(--c1-mid)]">
            🌉 Muốn kể với ai?
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Thẻ trợ lý hỏi lại chủ đề đã đoán. "Đúng rồi" thì chọn mức lo và lưu thành chuyện bận lòng.
 * "Không phải" thì trợ lý HỎI LẠI đúng ra là chuyện gì: chọn chủ đề khác (trợ lý nói lại "mình hiểu là…, đúng chưa?")
 * hoặc kể lại để trợ lý hiểu theo ý mới. Chỉ lưu khi học sinh tự bấm.
 */
export function TopicGuessCard({
  guess,
  loop,
  conversationId,
  difficulty,
  onRetell,
  onWorrySaved,
}: {
  guess: TopicGuess;
  loop: ChatLoop;
  conversationId: string | null;
  /** khó khăn học sinh đã xác nhận trong cuộc trò chuyện này (lưu kèm khi lưu chuyện) */
  difficulty: string | null;
  onRetell: () => void;
  onWorrySaved: (worry: ChatWorry) => void;
}) {
  const { name } = useAssistant();
  // ask: trợ lý đoán · reask: hỏi lại sau "Không phải" · confirm: nói lại chủ đề mới · level: chọn mức lo
  const [state, setState] = useState<"ask" | "reask" | "confirm" | "level" | "saved" | "retold">("ask");
  const [topic, setTopic] = useState(guess.topic);
  const [result, setResult] = useState<{ line: string; badges: LoopBadge[]; worryId: string } | null>(null);

  useEffect(() => {
    if (conversationId) flag(ASKED_KEY(conversationId), true);
  }, [conversationId]);

  const info = (key: string) => loop.topics[key] ?? { label: guess.label, emoji: guess.emoji };

  if (state === "saved" && result) return <SavedWorry loop={loop} result={result} worryId={result.worryId} />;
  if (state === "retold") return <p className="ml-[42px] mt-2 text-sm text-muted">Bạn kể lại ở ô bên dưới nhé, mình nghe đây.</p>;

  return (
    <section aria-label={`${name} hỏi chủ đề`} className={cn(ticket, "mt-2 max-w-[540px] sm:ml-[42px]")}>
      {state === "ask" && (
        <>
          <p className="font-semibold">
            <span aria-hidden>{guess.emoji} </span>
            Có phải bạn đang lo chuyện {guess.label.toLowerCase()} không?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setState("level");
                void answerTopicGuess(guess.topic, true);
              }}
              className={cn(btn.primary, "px-5 py-2")}
            >
              Đúng rồi
            </button>
            <button
              type="button"
              onClick={() => {
                setState("reask");
                void answerTopicGuess(guess.topic, false);
              }}
              className={btn.secondary}
            >
              Không phải
            </button>
          </div>
        </>
      )}

      {state === "reask" && (
        <>
          <p className="font-semibold">{TOPIC_NO_ASK}</p>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Chọn chủ đề đúng hơn">
            {Object.entries(loop.topics)
              .filter(([key]) => key !== guess.topic)
              .map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTopic(key);
                    setState("confirm");
                  }}
                  className="min-h-11 rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-semibold transition hover:bg-brand-soft hover:shadow-[0_0_0_2px_var(--brand)]"
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setState("retold");
                onRetell();
              }}
              className={btn.secondary}
            >
              Kể lại cho {name}
            </button>
            <button type="button" onClick={() => setState("retold")} className={btn.ghost}>
              Thôi, kể tiếp
            </button>
          </div>
        </>
      )}

      {state === "confirm" && (
        <>
          <p className="font-semibold">
            <span aria-hidden>{info(topic).emoji} </span>
            Vậy mình hiểu là bạn đang lo chuyện {info(topic).label.toLowerCase()}. Đúng chưa?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setState("level")} className={cn(btn.primary, "px-5 py-2")}>
              Đúng rồi
            </button>
            <button type="button" onClick={() => setState("reask")} className={btn.secondary}>
              Chưa đúng
            </button>
          </div>
        </>
      )}

      {state === "level" && (
        <>
          <p className="font-semibold">
            <span aria-hidden>{info(topic).emoji} </span>
            Chuyện {info(topic).label.toLowerCase()}
          </p>
          <SaveWorryForm
            loop={loop}
            topic={topic}
            difficulty={difficulty}
            onSaved={(worry, r) => {
              setResult({ ...r, worryId: worry.id });
              setState("saved");
              onWorrySaved(worry);
            }}
          />
        </>
      )}
    </section>
  );
}

/**
 * Câu trợ lý tóm tắt khó khăn sau một lượt (QT03, QT05): học sinh bấm "Đúng rồi" hoặc sửa / kể lại.
 * Đã gắn chuyện bận lòng: lưu thành khó khăn đã xác nhận. Chưa gắn: trợ lý dùng trong cuộc trò chuyện này,
 * và học sinh có thể lưu thành chuyện bận lòng để được hỏi thăm sau.
 */
export function SummaryCard({
  text,
  loop,
  worry,
  onConfirmed,
  onRetell,
  onWorrySaved,
}: {
  text: string;
  loop: ChatLoop | null;
  worry: ChatWorry | null;
  onConfirmed: (text: string) => void;
  onRetell: () => void;
  onWorrySaved: (worry: ChatWorry) => void;
}) {
  const { name } = useAssistant();
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ line: string; badges: LoopBadge[]; worryId: string } | null>(null);
  const chips = worry && loop ? (loop.topics[worry.topic]?.difficulties ?? []) : [];

  if (saved && loop) return <SavedWorry loop={loop} result={saved} worryId={saved.worryId} />;
  return (
    <div className="mt-2 max-w-[540px] space-y-2 sm:ml-[42px]">
      <DifficultyConfirm
        text={text}
        worryId={worry?.id ?? null}
        source="chat"
        chips={chips}
        onRetell={onRetell}
        onConfirmed={(t) => {
          setConfirmed(t);
          onConfirmed(t);
        }}
      />
      {/* chưa gắn chuyện bận lòng: cho lưu lại để trợ lý hỏi thăm sau (không bắt buộc) */}
      {confirmed && !worry && loop && (
        <section aria-label={`Lưu lại để ${name} hỏi thăm`} className={ticket}>
          <p className="font-semibold">Bạn muốn lưu chuyện này để vài hôm nữa {name} hỏi thăm không? Chọn chủ đề gần đúng nhất.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(loop.topics).map(([key, t]) => (
              <button
                key={key}
                type="button"
                aria-pressed={topic === key}
                onClick={() => setTopic(key)}
                className={cn(
                  "min-h-11 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition",
                  topic === key ? "border-brand-edge bg-brand-soft" : "border-transparent bg-surface-2 hover:bg-brand-soft",
                )}
              >
                <span aria-hidden>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
          {topic && (
            <SaveWorryForm
              key={topic}
              loop={loop}
              topic={topic}
              difficulty={confirmed}
              onSaved={(w, r) => {
                setSaved({ ...r, worryId: w.id });
                onWorrySaved(w);
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Nút ⋯ cạnh 👍/👎 của câu trả lời mới nhất: bấm mới mở ba lựa chọn, học sinh luôn được sửa, bỏ qua hoặc dừng.
 * (Duy góp ý 31/10: ba nút hiện sẵn dưới mỗi câu trả lời phiền và vướng.) Esc hoặc bấm ra ngoài thì đóng.
 */
export function ChatControls({ onMisunderstood, onSkip, onStop, busy }: { onMisunderstood: () => void; onSkip: () => void; onStop: () => void; busy: boolean }) {
  const { name } = useAssistant();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const item = "flex min-h-11 w-full items-center rounded-[14px] px-3 text-left text-sm font-semibold transition hover:bg-surface-2 disabled:opacity-50";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Thêm lựa chọn"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Thêm lựa chọn"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="group grid size-11 place-items-center rounded-full"
      >
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full text-[17px] font-extrabold leading-none tracking-wider transition",
            open ? "bg-surface text-ink shadow-soft" : "text-muted group-hover:bg-surface group-hover:text-ink",
          )}
        >
          ⋯
        </span>
      </button>
      {open && (
        <div role="menu" aria-label="Điều khiển trò chuyện" className={cn(floating, "absolute left-0 top-full z-20 mt-1 w-[230px] animate-[fadein_.15s_ease]")}>
          <button type="button" role="menuitem" disabled={busy} onClick={pick(onMisunderstood)} className={item}>
            🤔 {name} hiểu chưa đúng
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={pick(onSkip)} className={item}>
            ⏭ Bỏ qua
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={pick(onStop)} className={item}>
            ✋ Dừng
          </button>
        </div>
      )}
    </div>
  );
}

/** Danh sách câu điền vào chỗ trống cho bạn chưa biết bắt đầu nói gì (mẫu: nhân vật nhỏ + lời dặn, ô bơ nhạt hai cột). */
export function FillBlankPanel({ sentences, onPick, onClose }: { sentences: string[]; onPick: (s: string) => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="Câu gợi ý để bắt đầu" className="rounded-[26px] bg-surface p-3.5 shadow-[0_14px_40px_rgb(61_52_80/0.16)] dark:ring-1 dark:ring-line">
      <div className="mb-2.5 flex items-center gap-2.5">
        <MascotArt size={34} className="-my-1" />
        <p className="flex-1 text-[15px] font-bold leading-snug">Chọn một câu rồi điền vào chỗ ___ nhé</p>
        <button type="button" onClick={onClose} className="min-h-9 rounded-full bg-bg px-3 text-[13px] font-bold text-muted transition hover:text-ink">
          Đóng
        </button>
      </div>
      <ul className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {sentences.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="size-full min-h-11 rounded-2xl bg-brand-soft px-3 py-2 text-left text-sm transition hover:bg-brand hover:text-brand-ink"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
