"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { motion } from "motion/react";
import { saveCheckin, type CheckinResult } from "@/app/actions/checkin";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { EMOTIONS, MAX_EMOTIONS_PER_CHECKIN } from "@/lib/emotions";
import { celebrate } from "@/lib/celebrate";

export function CheckinFlow({ supportCard }: { supportCard: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<Extract<CheckinResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setError(null);
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
        // chỉ ăn mừng khi cảm xúc tích cực / trung tính (buồn thì Mây ở bên, không bắn pháo giấy)
        if (!res.negative) setTimeout(() => celebrate(null, 90), 250);
      } else setError(res.error);
    });
  }

  if (result) {
    return (
      <div className="animate-[fadein_.35s_ease]">
        <div className="flex flex-col items-center pt-6 text-center">
          <May size={150} mood={result.mood} />
          <SpeechBubble className="mt-4 max-w-sm rounded-bl-3xl text-base">{result.reply}</SpeechBubble>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {selected.map((id) => {
              const e = EMOTIONS.find((x) => x.id === id)!;
              return (
                <span key={id} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
                  {e.emoji} {e.label}
                </span>
              );
            })}
          </div>
        </div>

        {result.teacherNotified && <div className="mt-8">{supportCard}</div>}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/chat/new"
            className={cn(
              "rounded-[var(--radius-card)] p-5 transition hover:-translate-y-0.5",
              result.negative ? "bg-sky" : "bg-butter",
            )}
          >
            <span className="text-2xl" aria-hidden>
              💬
            </span>
            <p className="mt-4 font-display text-lg font-bold tracking-tight">
              {result.negative ? "Kể Mây nghe thêm nhé?" : "Kể Mây nghe chuyện vui?"}
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
      </div>
    );
  }

  return (
    <div>
      <Link href="/home" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Trang chủ
      </Link>
      <div className="flex items-center gap-3">
        <May size={84} mood={selected.length ? "happy" : "calm"} />
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
              <motion.span
                className="text-4xl leading-none"
                aria-hidden
                animate={active ? { y: [0, -10, 0], rotate: [0, -12, 10, 0] } : { y: 0, rotate: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {e.emoji}
              </motion.span>
              <span className="text-sm font-semibold">{e.label}</span>
            </motion.button>
          );
        })}
      </div>

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
