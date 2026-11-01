"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordCardClick } from "@/app/actions/chat-style";
import { createHabit } from "@/app/actions/habits";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { CardKind, ReplyCards } from "@/lib/ai/reply-cards";
import { subskillHref } from "@/lib/sel/casel";
import { SKILLS } from "@/lib/skills";

/**
 * Thẻ gợi ý dưới câu trả lời (Bước 10.4): mục tiêu → "Thêm vào thói quen" / "Để sau"; kỹ năng → mở bài luyện;
 * dừng → "Dừng ở đây" / "Nói tiếp". Không tự tạo gì khi học sinh chưa bấm. Mỗi lần bấm chỉ đếm (loại thẻ + nút).
 */
export function ReplyCardsView({ cards, onContinue }: { cards: ReplyCards; onContinue: () => void }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<CardKind[]>([]);
  const [goal, setGoal] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const hide = (k: CardKind) => setHidden((h) => [...h, k]);
  const click = (k: CardKind, action: string, skill?: string) => void recordCardClick(k, action, skill);

  const showGoal = cards.goal && !hidden.includes("goal");
  const showSkill = cards.skill && !hidden.includes("skill");
  const showEnd = cards.end && !hidden.includes("end");
  if (!showGoal && !showSkill && !showEnd) return null;

  return (
    <div className="ml-10 mt-2 space-y-2" aria-label="Gợi ý">
      {showGoal && cards.goal && (
        <div className="animate-[fadein_.3s_ease] rounded-3xl border border-line bg-butter p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">🎯 Mục tiêu nhỏ</p>
          <p className="mt-1 font-display font-bold">{cards.goal.title}</p>
          <p className="text-sm">{cards.goal.description}</p>
          {goal ? (
            <p role="status" className={cn("mt-3 text-sm font-semibold", goal.ok ? "" : "text-danger")}>
              {goal.text}{" "}
              {goal.ok && (
                <Link href="/habits" className="underline underline-offset-2">
                  Xem thói quen
                </Link>
              )}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className={cn(btn.primary, "px-4 py-2 text-sm")}
                onClick={() =>
                  startTransition(async () => {
                    const goalTitle = cards.goal!.title;
                    const res = await createHabit({ title: goalTitle, icon: "🎯" });
                    if (res.ok) click("goal", "add");
                    setGoal(res.ok ? { ok: true, text: "Đã thêm vào thói quen ✓" } : { ok: false, text: res.error });
                  })
                }
              >
                {pending ? "Đang thêm…" : "Thêm vào thói quen"}
              </button>
              <button
                type="button"
                className={cn(btn.ghost, "text-sm")}
                onClick={() => {
                  click("goal", "later");
                  hide("goal");
                }}
              >
                Để sau
              </button>
            </div>
          )}
        </div>
      )}

      {showSkill && cards.skill && (
        <Link
          href={subskillHref(cards.skill.id)}
          onClick={() => click("skill", "open", cards.skill!.id)}
          className="flex animate-[fadein_.3s_ease] items-center gap-3 rounded-3xl border border-line bg-sky p-4 transition hover:border-brand"
        >
          <span aria-hidden className="text-2xl">
            {SKILLS[cards.skill.id].emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Luyện kỹ năng</span>
            <span className="block font-display font-bold">{cards.skill.name}</span>
          </span>
          <span aria-hidden className="text-lg">
            →
          </span>
        </Link>
      )}

      {showEnd && cards.end && (
        <div className="animate-[fadein_.3s_ease] rounded-3xl border border-line bg-mint p-4">
          <p className="text-sm">{cards.end.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(btn.primary, "px-4 py-2 text-sm")}
              onClick={() => {
                click("end", "stop");
                router.push("/home");
              }}
            >
              Dừng ở đây
            </button>
            <button
              type="button"
              className={cn(btn.ghost, "text-sm")}
              onClick={() => {
                click("end", "continue");
                hide("end");
                onContinue();
              }}
            >
              Nói tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
