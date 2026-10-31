"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { motion } from "motion/react";
import { saveCheckin, type CheckinResult } from "@/app/actions/checkin";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { EMOTIONS, getEmotion, MAX_EMOTIONS_PER_CHECKIN, UNSURE } from "@/lib/emotions";
import { BadgesCard, WorryStep, type LoopBadge, type LoopContent } from "./WorryStep";

export function CheckinFlow({ supportCard, loop }: { supportCard: ReactNode; loop: LoopContent | null }) {
  const { name } = useAssistant();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<Extract<CheckinResult, { ok: true }> | null>(null);
  // bước "chuyện bận lòng": tự mở khi cảm xúc nặng lòng chiếm đa số, hoặc khi học sinh tự bấm
  const [worryOpen, setWorryOpen] = useState(false);
  // huy hiệu mới nhận trong lượt này: hiện một lần, gom chung một thẻ
  const [badges, setBadges] = useState<LoopBadge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setError(null);
    // "Chưa rõ" chọn riêng: bấm nó thì bỏ các cảm xúc khác, bấm cảm xúc khác thì bỏ "Chưa rõ"
    if (id === UNSURE.id) {
      setSelected(selected.includes(id) ? [] : [id]);
      return;
    }
    if (selected.includes(UNSURE.id)) {
      setSelected([id]);
      return;
    }
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else if (selected.length >= MAX_EMOTIONS_PER_CHECKIN) {
      setError(`Chọn tối đa ${MAX_EMOTIONS_PER_CHECKIN} cảm xúc thôi nhé.`);
    } else {
      setSelected([...selected, id]);
    }
  }

  function submit() {
    startTransition(async () => {
      const res = await saveCheckin(selected);
      if (res.ok) {
        setResult(res);
        const first = loop?.badges["goi-ten-cam-xuc"];
        setBadges(res.firstBadge && first ? [first] : []);
        // "Chưa rõ": không tự mở bước kể chuyện, không hỏi dồn
        setWorryOpen(Boolean(loop) && res.negative && !res.unsure);
      }
      else setError(res.error);
    });
  }

  if (result) {
    return (
      <div className="animate-[fadein_.35s_ease]">
        {/* đang kể chuyện bận lòng: chỉ một hình nhân vật (ở bước bên dưới), ở đây chỉ còn cảm xúc vừa chọn */}
        <div className={cn("flex flex-col items-center text-center", worryOpen ? "pt-2" : "pt-6")}>
          {!worryOpen && (
            <>
              <CharacterAvatar size={150} mood={result.mood} />
              <SpeechBubble className="mt-4 max-w-sm rounded-bl-3xl text-base">{result.reply}</SpeechBubble>
            </>
          )}
          <div className={cn("flex flex-wrap justify-center gap-2", !worryOpen && "mt-5")}>
            {selected.map((id) => {
              const e = getEmotion(id)!;
              return (
                <span key={id} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
                  {e.emoji} {e.label}
                </span>
              );
            })}
          </div>
        </div>

        {!worryOpen && badges.length > 0 && (
          <div className="mt-6">
            <BadgesCard badges={badges} />
          </div>
        )}

        {result.teacherNotified && <div className="mt-8">{supportCard}</div>}

        {loop && worryOpen ? (
          <div className="mt-5">
            <WorryStep
              loop={loop}
              intro={result.reply}
              badges={badges}
              onBadge={(b) => setBadges((cur) => (cur.some((x) => x.key === b.key) ? cur : [...cur, b]))}
              onSkip={() => setWorryOpen(false)}
              supportCard={supportCard}
            />
          </div>
        ) : (
          <>
            {result.unsure && (
              <div className="mt-6 rounded-[var(--radius-card)] bg-surface-2 p-4 text-sm">
                <p>Lúc nào muốn, bạn có thể chọn một từ gần nhất. Không muốn thì cứ để vậy.</p>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setSelected([]);
                  }}
                  className={cn(btn.secondary, "mt-3")}
                >
                  Chọn một từ gần nhất
                </button>
              </div>
            )}
            {loop && !result.unsure && (
              <button
                type="button"
                onClick={() => setWorryOpen(true)}
                className="mt-8 flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line p-4 text-left transition hover:border-ink/30"
              >
                <span className="text-2xl" aria-hidden>
                  💭
                </span>
                <span>
                  <span className="block font-semibold">Có chuyện đang làm mình bận lòng</span>
                  <span className="block text-sm text-muted">Kể ngắn thôi, vài hôm nữa {name} sẽ hỏi thăm bạn.</span>
                </span>
              </button>
            )}
            {/* đang vui hoặc bình thường: mời luyện trước một kỹ năng (không bắt buộc, không bấm là bỏ qua) */}
            {!result.negative && !result.unsure && (
              <Link
                href="/luyen"
                className="mt-4 flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-brand/40 p-4 text-left transition hover:border-brand"
              >
                <span className="text-2xl" aria-hidden>
                  🎯
                </span>
                <span>
                  <span className="block font-semibold">Muốn luyện trước một kỹ năng không?</span>
                  <span className="block text-sm text-muted">Lúc đang ổn là lúc luyện dễ nhất. Không bắt buộc đâu.</span>
                </span>
              </Link>
            )}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/chat/new?tu=tam-trang"
                className={cn(
                  "rounded-[var(--radius-card)] p-5 transition hover:-translate-y-0.5",
                  result.negative ? "bg-sky" : "bg-butter",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
                <p className="mt-4 font-display text-lg font-bold tracking-tight">
                  {result.negative ? `Kể ${name} nghe thêm nhé?` : `Kể ${name} nghe chuyện vui?`}
                </p>
                <p className="text-sm text-muted">Trò chuyện riêng tư, không phán xét.</p>
              </Link>
              <Link href="/home" className="rounded-[var(--radius-card)] bg-mint p-5 transition hover:-translate-y-0.5">
                <span className="text-2xl" aria-hidden>
                  🏡
                </span>
                <p className="mt-4 font-display text-lg font-bold tracking-tight">Về trang chủ</p>
                <p className="text-sm text-muted">Xem thói quen hôm nay của bạn.</p>
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Link href="/home" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Trang chủ
      </Link>
      <div className="flex items-center gap-3">
        <CharacterAvatar size={84} mood={selected.length ? "happy" : "calm"} />
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Bạn đang thấy thế nào?</h1>
          <p className="mt-1 text-muted">Chọn một hoặc vài cảm xúc (tối đa {MAX_EMOTIONS_PER_CHECKIN}).</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {EMOTIONS.map((e) => {
          const active = selected.includes(e.id);
          return (
            <motion.button
              key={e.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.25 }}
              aria-pressed={active}
              onClick={() => toggle(e.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-3xl border-2 px-2 py-4 transition-colors",
                active ? "border-transparent" : "border-line bg-surface hover:bg-surface-2",
              )}
              style={active ? { backgroundColor: `${e.color}33`, borderColor: e.color } : undefined}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {e.emoji}
              </span>
              <span className="text-sm font-semibold">{e.label}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        aria-pressed={selected.includes(UNSURE.id)}
        onClick={() => toggle(UNSURE.id)}
        className={cn(
          "mt-2.5 flex w-full items-center gap-3 rounded-3xl border-2 border-dashed px-4 py-3 text-left transition-colors",
          selected.includes(UNSURE.id) ? "border-ink/40 bg-surface-2" : "border-line hover:bg-surface-2",
        )}
      >
        <span className="text-3xl leading-none" aria-hidden>
          {UNSURE.emoji}
        </span>
        <span>
          <span className="block font-semibold">{UNSURE.label}</span>
          <span className="block text-sm text-muted">Mình chưa gọi tên được cảm xúc lúc này</span>
        </span>
      </motion.button>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-24 mt-6 md:bottom-6">
        <button
          type="button"
          onClick={submit}
          disabled={selected.length === 0 || pending}
          className={cn(btn.primary, "w-full py-4 text-lg shadow-lg")}
        >
          {pending ? "Đang lưu…" : selected.length ? `Xong (${selected.length})` : "Chọn cảm xúc của bạn"}
        </button>
      </div>
    </div>
  );
}
