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
import { MOOD_LEVELS, moodFromEmotions } from "@/lib/mood";
import { MoodChip } from "@/components/mood/MoodIcons";
import { BadgesCard, WorryStep, type LoopBadge, type LoopContent } from "./WorryStep";

/** `last`: lần ghi gần nhất hôm nay (null: hôm nay chưa ghi). */
export function CheckinFlow({
  supportCard,
  loop,
  last,
}: {
  supportCard: ReactNode;
  loop: LoopContent | null;
  last: { time: string; emotions: string[]; count: number } | null;
}) {
  const { name } = useAssistant();
  const [selected, setSelected] = useState<string[]>([]);
  // nhóm tâm trạng 1–5 suy ra từ cảm xúc đã chọn (mỗi cảm xúc xếp sẵn một nhóm, lib/mood.ts); không chọn mức riêng
  const mood = moodFromEmotions(selected);
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
        <div className={cn("flex flex-col items-center text-center", worryOpen ? "pt-2" : "pt-2 md:pt-4")}>
          {!worryOpen && (
            <>
              <CharacterAvatar size={112} mood={result.mood} />
              <SpeechBubble className="mt-3 max-w-sm rounded-bl-3xl text-base">{result.reply}</SpeechBubble>
            </>
          )}
          <div className={cn("flex flex-wrap justify-center gap-2", !worryOpen && "mt-3")}>
            {mood && (
              <span className="rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm">
                <MoodChip level={mood} size={28} label />
              </span>
            )}
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
          <div className="mt-4">
            <BadgesCard badges={badges} />
          </div>
        )}

        {result.teacherNotified && <div className="mt-5">{supportCard}</div>}

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
              <div className="mt-4 rounded-[var(--radius-card)] bg-surface-2 p-4 text-sm">
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
                className="mt-5 flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line px-4 py-3 text-left transition hover:border-ink/30"
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
                href="/ky-nang"
                className="mt-3 flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-brand/40 px-4 py-3 text-left transition hover:border-brand"
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/chat/new?tu=tam-trang"
                className={cn(
                  "rounded-[var(--radius-card)] p-4 transition hover:-translate-y-0.5",
                  result.negative ? "bg-sky" : "bg-butter",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
                <p className="mt-2 font-display text-lg font-bold tracking-tight">
                  {result.negative ? `Kể ${name} nghe thêm nhé?` : `Kể ${name} nghe chuyện vui?`}
                </p>
                <p className="text-sm text-muted">Trò chuyện riêng tư, không phán xét.</p>
              </Link>
              <Link href="/home" className="rounded-[var(--radius-card)] bg-mint p-4 transition hover:-translate-y-0.5">
                <span className="text-2xl" aria-hidden>
                  🏡
                </span>
                <p className="mt-2 font-display text-lg font-bold tracking-tight">Về trang chủ</p>
                <p className="text-sm text-muted">Xem thói quen hôm nay của bạn.</p>
              </Link>
            </div>
            <Link href="/tam-trang" className={cn(btn.ghost, "mt-3 w-full justify-center")}>
              📈 Xem biểu đồ tâm trạng của mình
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* gọn một màn hình (1280×800): đầu trang nhỏ, cảm xúc là nút viên thuốc xếp hàng ngang theo nhóm */}
      <Link href="/home" className={cn(btn.ghost, "-ml-3 min-h-11 md:min-h-0 md:py-1.5")}>
        <ArrowLeft size={18} /> Trang chủ
      </Link>
      <div className="mt-1 flex items-center gap-3">
        <CharacterAvatar size={52} mood={selected.length ? "happy" : "calm"} float={false} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Bạn đang thấy thế nào?</h1>
          <p className="text-sm text-muted">Chọn một hoặc vài cảm xúc (tối đa {MAX_EMOTIONS_PER_CHECKIN}).</p>
        </div>
      </div>

      {last && (
        <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
          Hôm nay bạn đã ghi lúc <strong>{last.time}</strong>:{" "}
          {last.emotions
            .map((id) => getEmotion(id))
            .filter(Boolean)
            .map((e) => `${e!.emoji} ${e!.label}`)
            .join(" · ")}
          {last.count > 1 && ` (${last.count} lần)`}.{" "}
          <span className="text-muted">Đổi thì ghi lại nhé, lịch tính lần gần nhất.</span>
        </p>
      )}

      {/* cảm xúc xếp theo 5 nhóm, từ Tuyệt vời tới Rất tệ; nhóm của lần ghi là trung bình các cảm xúc đã chọn.
          Từ 640px: tên nhóm ở cột trái, cảm xúc cùng hàng bên phải */}
      <div className="mt-4 space-y-3 sm:space-y-2">
        {[...MOOD_LEVELS].reverse().map((lv) => (
          <section key={lv.value} aria-label={lv.label} className="sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start sm:gap-3">
            <MoodChip level={lv.value} size={26} label className="text-sm sm:mt-2" />
            <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-0 sm:gap-2">
              {EMOTIONS.filter((e) => e.level === lv.value).map((e) => {
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
                      "inline-flex min-h-11 items-center gap-1 rounded-full border-2 py-1.5 pl-2 pr-3 text-sm font-semibold transition-colors sm:gap-1.5 sm:pl-2.5 sm:pr-3.5",
                      active ? "border-transparent" : "border-line bg-surface hover:bg-surface-2",
                    )}
                    style={active ? { backgroundColor: `color-mix(in srgb, var(--mood-${lv.value}) 18%, var(--surface))`, borderColor: `var(--mood-${lv.value})` } : undefined}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {e.emoji}
                    </span>
                    {e.label}
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        aria-pressed={selected.includes(UNSURE.id)}
        onClick={() => toggle(UNSURE.id)}
        className={cn(
          "mt-3 flex min-h-11 w-full items-center gap-2 rounded-full border-2 border-dashed px-3 py-1.5 text-left text-sm transition-colors sm:w-auto sm:pr-5",
          selected.includes(UNSURE.id) ? "border-ink/40 bg-surface-2" : "border-line hover:bg-surface-2",
        )}
      >
        <span className="text-xl leading-none" aria-hidden>
          {UNSURE.emoji}
        </span>
        <span>
          <span className="font-semibold">{UNSURE.label}</span>
          <span className="text-muted"> · Mình chưa gọi tên được cảm xúc lúc này</span>
        </span>
      </motion.button>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* nền đặc dưới nút: khi nút nổi (điện thoại cuộn) và đang mờ, không lộ cảm xúc phía sau */}
      <div className="sticky bottom-24 mt-4 rounded-full bg-bg md:bottom-4">
        <button
          type="button"
          onClick={submit}
          disabled={selected.length === 0 || pending}
          className={cn(btn.primary, "flex w-full items-center justify-center gap-2 py-3 text-base shadow-lg")}
        >
          {pending ? (
            "Đang lưu…"
          ) : selected.length ? (
            <>
              Xong ({selected.length})
              {mood && <span className="text-sm font-semibold opacity-80">· {MOOD_LEVELS[mood - 1].label}</span>}
            </>
          ) : (
            "Chọn cảm xúc của bạn"
          )}
        </button>
      </div>
    </div>
  );
}
