"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { saveWorryFromChat } from "@/app/actions/worries";
import { BadgesCard, type LoopBadge } from "@/app/(app)/checkin/WorryStep";
import { LevelPicker } from "@/components/LevelPicker";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { ChatLoop } from "@/lib/loop-content";

export type TopicGuess = { topic: string; label: string; emoji: string };

const ASKED_KEY = (conversationId: string) => `fmood-hoi-chu-de:${conversationId}`;

/** Mỗi cuộc trò chuyện Mây chỉ hỏi "Có phải bạn đang lo chuyện…?" một lần. */
export function alreadyAsked(conversationId: string | null): boolean {
  if (!conversationId) return false;
  try {
    return localStorage.getItem(ASKED_KEY(conversationId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Thẻ Mây hỏi lại chủ đề đã đoán. Bấm "Đúng" thì chọn mức lo và lưu thành chuyện bận lòng;
 * bấm "Không phải" thì thôi. Chỉ lưu khi học sinh tự bấm.
 */
export function TopicGuessCard({ guess, loop, conversationId }: { guess: TopicGuess; loop: ChatLoop; conversationId: string | null }) {
  const [state, setState] = useState<"ask" | "level" | "saved" | "no">("ask");
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ line: string; badges: LoopBadge[]; worryId: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!conversationId) return;
    try {
      localStorage.setItem(ASKED_KEY(conversationId), "1");
    } catch {}
  }, [conversationId]);

  if (state === "no") {
    return <p className="ml-10 mt-2 text-sm text-muted">Được rồi, mình nghe bạn kể tiếp nhé.</p>;
  }
  if (state === "saved" && result) {
    return (
      <div className="ml-10 mt-2 space-y-2">
        <p className="rounded-3xl rounded-bl-md bg-surface px-4 py-2.5">{result.line}</p>
        <BadgesCard badges={result.badges} />
        {loop.hasSteps && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/viec-nho?chuyen=${result.worryId}`} className="rounded-full bg-mint px-4 py-2 text-sm font-semibold">
              🌱 Thử một việc nhỏ
            </Link>
            <Link href={`/viec-nho?chuyen=${result.worryId}#ke-voi-ai`} className="rounded-full bg-lilac px-4 py-2 text-sm font-semibold">
              🌉 Muốn kể với ai?
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Mây hỏi chủ đề" className="ml-10 mt-2 rounded-3xl border-2 border-dashed border-line bg-surface/60 p-4">
      <p className="font-semibold">
        <span aria-hidden>{guess.emoji} </span>
        Có phải bạn đang lo chuyện {guess.label.toLowerCase()} không?
      </p>
      {state === "ask" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setState("level")} className={cn(btn.primary, "px-5 py-2")}>
            Đúng rồi
          </button>
          <button type="button" onClick={() => setState("no")} className={btn.secondary}>
            Không phải
          </button>
        </div>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!level) {
              setError("Chọn một đám mây gần đúng nhất nhé.");
              return;
            }
            start(async () => {
              const res = await saveWorryFromChat({ topic: guess.topic, level });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              const badge = loop.badges["dam-ke"];
              setResult({
                line: loop.savedLines[Math.floor(Math.random() * loop.savedLines.length)] ?? "Cảm ơn bạn đã kể.",
                badges: res.firstTime && badge ? [badge] : [],
                worryId: res.worryId,
              });
              setState("saved");
            });
          }}
        >
          {loop.askLevel && <p className="text-sm">{loop.askLevel}</p>}
          <LevelPicker
            name={`level-${guess.topic}`}
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
            {pending ? "Đang lưu…" : "Lưu lại để Mây hỏi thăm sau"}
          </button>
        </form>
      )}
    </section>
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
