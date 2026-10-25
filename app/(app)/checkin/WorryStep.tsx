"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { motion } from "motion/react";
import { saveWorryFromCheckin } from "@/app/actions/worries";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { LevelPicker } from "@/components/LevelPicker";
import { NOTE_MAX } from "@/lib/worries-shared";

export type LoopTopic = { key: string; label: string; emoji: string };
export type LoopBadge = { key: string; name: string; emoji: string; description: string };
/** Nội dung vòng hỗ trợ học sinh này được thấy (đã lọc theo trạng thái và lớp thử). */
export type LoopContent = {
  topics: LoopTopic[];
  askTopic: string;
  askLevel: string;
  savedLines: string[];
  badges: Record<string, LoopBadge>;
  /** có việc nhỏ hoặc câu mở lời hiện được */
  hasSteps: boolean;
};

// mỗi chủ đề một màu pastel của F-Mood
export const TOPIC_TONE: Record<string, string> = {
  "hoc-tap": "bg-butter",
  "ban-be": "bg-peach",
  "gia-dinh": "bg-mint",
  "ban-than": "bg-lilac",
  "mang-xa-hoi": "bg-sky",
};

/** Mây nói một câu (chỉ một Mây trên màn hình). */
function MaySays({ children, mood = "caring" }: { children: ReactNode; mood?: "caring" | "worried" | "cheer" }) {
  return (
    <div className="flex items-end gap-3">
      <May size={72} mood={mood} float={false} />
      <SpeechBubble className="mb-2 flex-1 space-y-1.5">{children}</SpeechBubble>
    </div>
  );
}

/**
 * Bước "chuyện bận lòng" sau check-in: chọn chủ đề → chọn mức lo (thang thời tiết) →
 * (tùy chọn) viết một dòng → lưu. Chỉ lưu khi học sinh bấm "Lưu lại".
 * `intro` là lời Mây vừa đáp check-in; `badges` là huy hiệu mới nhận trong lượt này (hiện một lần ở cuối).
 */
export function WorryStep({
  loop,
  intro,
  badges,
  onBadge,
  onSkip,
  supportCard,
}: {
  loop: LoopContent;
  intro: string;
  badges: LoopBadge[];
  onBadge: (badge: LoopBadge) => void;
  onSkip: () => void;
  supportCard: ReactNode;
}) {
  const [topic, setTopic] = useState<LoopTopic | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ risk: string; line: string; worryId: string } | null>(null);
  const [pending, start] = useTransition();

  if (saved) {
    return (
      <div className="animate-[fadein_.35s_ease] space-y-4">
        <MaySays mood={saved.risk === "none" ? "cheer" : "worried"}>
          <p>{saved.line}</p>
        </MaySays>
        <BadgesCard badges={badges} />
        {saved.risk !== "none" && supportCard}
        <NextSteps worryId={saved.worryId} hasSteps={loop.hasSteps} />
      </div>
    );
  }

  if (!topic) {
    return (
      <section aria-label="Chuyện đang làm bạn bận lòng" className="animate-[fadein_.35s_ease] space-y-4">
        <MaySays>
          <p>{intro}</p>
          <p className="font-semibold">{loop.askTopic}</p>
        </MaySays>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {loop.topics.map((t) => (
            <motion.button
              key={t.key}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setTopic(t)}
              className={cn(
                "flex min-h-24 flex-col items-start justify-between rounded-3xl p-4 text-left transition hover:-translate-y-0.5",
                TOPIC_TONE[t.key] ?? "bg-surface-2",
              )}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {t.emoji}
              </span>
              <span className="mt-3 font-semibold">{t.label}</span>
            </motion.button>
          ))}
        </div>
        <button type="button" onClick={onSkip} className={cn(btn.ghost, "-ml-3")}>
          Để sau
        </button>
      </section>
    );
  }

  return (
    <form
      aria-label="Bạn lo nhiều hay ít"
      className="animate-[fadein_.35s_ease] space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!level) {
          setError("Chọn một đám mây gần đúng nhất nhé.");
          return;
        }
        setError(null);
        start(async () => {
          const res = await saveWorryFromCheckin({ topic: topic.key, level, note });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          const badge = loop.badges["dam-ke"];
          if (res.firstTime && badge) onBadge(badge);
          const line = loop.savedLines[Math.floor(Math.random() * loop.savedLines.length)] ?? "Cảm ơn bạn đã kể.";
          setSaved({ risk: res.risk, line, worryId: res.worryId });
        });
      }}
    >
      <MaySays>
        <p>{loop.askLevel}</p>
      </MaySays>

      <button
        type="button"
        onClick={() => setTopic(null)}
        className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold", TOPIC_TONE[topic.key] ?? "bg-surface-2")}
        aria-label={`Chủ đề: ${topic.label}. Bấm để đổi chủ đề`}
      >
        <span aria-hidden>{topic.emoji}</span> {topic.label}
        <span className="text-muted">· đổi</span>
      </button>

      <LevelPicker
        value={level}
        onChange={(v) => {
          setLevel(v);
          setError(null);
        }}
      />

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Chuyện là… (không bắt buộc)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          rows={2}
          placeholder="Ví dụ: mai kiểm tra toán mà mình chưa ôn xong"
          className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/20"
        />
        <span className="mt-1 block text-xs text-muted">Chỉ mình bạn xem được. Nếu có điều nguy hiểm, thầy cô sẽ được báo để giúp bạn.</span>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Đang lưu…" : "Lưu lại"}
        </button>
        <button type="button" onClick={onSkip} className={btn.ghost}>
          Để sau
        </button>
      </div>
    </form>
  );
}

/** Mọi huy hiệu mới nhận trong lượt này, gom trong một thẻ. */
export function BadgesCard({ badges }: { badges: LoopBadge[] }) {
  if (!badges.length) return null;
  return (
    <motion.section
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="rounded-[var(--radius-card)] bg-butter p-4"
      role="status"
      aria-label="Huy hiệu mới"
    >
      <p className="text-sm text-muted">{badges.length > 1 ? `${badges.length} huy hiệu mới` : "Huy hiệu mới"}</p>
      <ul className="mt-2 space-y-3">
        {badges.map((b) => (
          <li key={b.key} className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface text-2xl shadow-sm" aria-hidden>
              {b.emoji}
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-tight tracking-tight">{b.name}</span>
              <span className="block text-sm">{b.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

/** Sau khi lưu chuyện bận lòng: kể Mây nghe, thử việc nhỏ, kể với người thật, hoặc để sau. */
export function NextSteps({ worryId, hasSteps }: { worryId: string; hasSteps: boolean }) {
  const tiles = [
    { href: `/chat/new?chuyen=${worryId}`, emoji: "💬", title: "Kể Mây nghe thêm", text: "Trò chuyện riêng tư, không phán xét.", tone: "bg-sky" },
    ...(hasSteps
      ? [
          { href: `/viec-nho?chuyen=${worryId}`, emoji: "🌱", title: "Thử một việc nhỏ", text: "2–5 phút để thấy nhẹ hơn một chút.", tone: "bg-mint" },
          { href: `/viec-nho?chuyen=${worryId}#ke-voi-ai`, emoji: "🌉", title: "Muốn kể với ai?", text: "Vài câu để bắt đầu nói với bố mẹ, thầy cô.", tone: "bg-lilac" },
        ]
      : []),
    { href: "/home", emoji: "🏡", title: "Thôi để sau", text: "Vài hôm nữa Mây sẽ hỏi thăm bạn chuyện này.", tone: "bg-butter" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tiles.map((t) => (
        <Link key={t.title} href={t.href} className={cn("rounded-[var(--radius-card)] p-5 transition hover:-translate-y-0.5", t.tone)}>
          <span className="text-2xl" aria-hidden>
            {t.emoji}
          </span>
          <p className="mt-3 font-display text-lg font-bold tracking-tight">{t.title}</p>
          <p className="text-sm text-muted">{t.text}</p>
        </Link>
      ))}
    </div>
  );
}
