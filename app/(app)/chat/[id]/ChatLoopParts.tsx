"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { answerTopicGuess } from "@/app/actions/support-steps";
import { saveWorryFromChat } from "@/app/actions/worries";
import { BadgesCard, type LoopBadge } from "@/app/(app)/checkin/WorryStep";
import { DifficultyConfirm } from "@/components/DifficultyConfirm";
import { LevelPicker } from "@/components/LevelPicker";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { TOPIC_NO_ASK } from "@/lib/chat-loop";
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
    <div className="ml-10 mt-2 space-y-2">
      <p className="rounded-3xl rounded-bl-md bg-surface px-4 py-2.5">{result.line}</p>
      <BadgesCard badges={result.badges} />
      {loop.hasSteps && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/viec-nho?chuyen=${worryId}`} className="rounded-full bg-mint px-4 py-2 text-sm font-semibold">
            🌱 Thử một việc nhỏ
          </Link>
          <Link href={`/viec-nho?chuyen=${worryId}#ke-voi-ai`} className="rounded-full bg-lilac px-4 py-2 text-sm font-semibold">
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
  if (state === "retold") return <p className="ml-10 mt-2 text-sm text-muted">Bạn kể lại ở ô bên dưới nhé, mình nghe đây.</p>;

  return (
    <section aria-label={`${name} hỏi chủ đề`} className="ml-10 mt-2 rounded-3xl border-2 border-dashed border-line bg-surface/60 p-4">
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
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold transition hover:border-brand hover:bg-brand-soft"
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
    <div className="ml-10 mt-2 space-y-2">
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
        <section aria-label={`Lưu lại để ${name} hỏi thăm`} className="rounded-3xl border-2 border-dashed border-line bg-surface/60 p-4">
          <p className="font-semibold">Bạn muốn lưu chuyện này để vài hôm nữa {name} hỏi thăm không? Chọn chủ đề gần đúng nhất.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(loop.topics).map(([key, t]) => (
              <button
                key={key}
                type="button"
                aria-pressed={topic === key}
                onClick={() => setTopic(key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  topic === key ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-brand-soft",
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

/** Ba nút dưới câu trả lời mới nhất của trợ lý: học sinh luôn được sửa, bỏ qua hoặc dừng. */
export function ChatControls({ onMisunderstood, onSkip, onStop, busy }: { onMisunderstood: () => void; onSkip: () => void; onStop: () => void; busy: boolean }) {
  const { name } = useAssistant();
  const cls = "rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold transition hover:border-ink/30 disabled:opacity-50";
  return (
    <div className="ml-10 mt-2 flex flex-wrap gap-1.5" aria-label="Điều khiển trò chuyện">
      <button type="button" disabled={busy} onClick={onMisunderstood} className={cls}>
        🤔 {name} hiểu chưa đúng
      </button>
      <button type="button" disabled={busy} onClick={onSkip} className={cls}>
        ⏭ Bỏ qua
      </button>
      <button type="button" disabled={busy} onClick={onStop} className={cls}>
        ✋ Dừng
      </button>
    </div>
  );
}

/** Danh sách câu điền vào chỗ trống cho bạn chưa biết bắt đầu nói gì. */
export function FillBlankPanel({ sentences, onPick, onClose }: { sentences: string[]; onPick: (s: string) => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="Câu gợi ý để bắt đầu" className="rounded-3xl border border-line bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-semibold">Chọn một câu rồi điền vào chỗ ___</p>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
          Đóng
        </button>
      </div>
      <ul className="max-h-60 space-y-1.5 overflow-y-auto">
        {sentences.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="w-full rounded-2xl bg-surface-2 px-3 py-2 text-left text-sm transition hover:bg-brand-soft"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
