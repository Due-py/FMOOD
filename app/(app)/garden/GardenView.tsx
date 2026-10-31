"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { choosePlant, harvestPlant } from "@/app/actions/student-extras";
import { SpeechBubble } from "@/components/SpeechBubble";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { GardenState } from "@/lib/garden";

export function GardenView({ garden }: { garden: GardenState }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { plant, progress, stageIndex, nextStage, canHarvest } = garden;

  if (!plant) {
    return <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Khu vườn đang được chuẩn bị. Quay lại sau nhé!</p>;
  }

  const stage = plant.stages[stageIndex];
  const from = stage.points;
  const to = nextStage?.points ?? stage.points;
  const pct = nextStage ? Math.round(((progress - from) / Math.max(1, to - from)) * 100) : 100;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-b from-sky to-mint p-6 text-center">
        <p className="text-sm font-semibold text-muted">{plant.name}</p>
        <motion.div
          key={stage.emoji}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="my-4 text-[7rem] leading-none"
          aria-label={`${plant.name}: ${stage.label}`}
        >
          {stage.emoji}
        </motion.div>
        <p className="font-display text-2xl font-extrabold tracking-tight">{stage.label}</p>

        <div className="mx-auto mt-4 max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-surface/70" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {nextStage
              ? `💧 ${progress - from}/${to - from} giọt · còn ${to - progress} giọt nữa để “${nextStage.label}”`
              : "Cây đã lớn hết cỡ!"}
          </p>
        </div>

        {canHarvest && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await harvestPlant();
                setMessage(
                  !res.ok
                    ? res.error
                    : `Đã thu hoạch ${plant.name}! Hãy trồng một cây mới nhé.${res.badge ? ` Bạn có huy hiệu mới: ${res.badge.emoji} ${res.badge.name}.` : ""}`,
                );
              })
            }
            className={cn(btn.primary, "mt-5")}
          >
            🧺 Thu hoạch vào bộ sưu tập
          </button>
        )}
        {message && <p role="status" className="mt-3 font-semibold">{message}</p>}
      </section>

      <div className="flex items-end gap-3">
        <CharacterAvatar size={70} mood="cheer" />
        <SpeechBubble className="mb-5 text-sm">
          Mỗi lần bạn <Link href="/habits" className="font-semibold underline">làm một thói quen</Link> hoặc{" "}
          <Link href="/checkin" className="font-semibold underline">check-in trong ngày</Link>, cây được thêm 💧 1 giọt nước.
          {garden.sources.supportSteps > 0 && " Kể chuyện, thử việc nhỏ hay quay lại hỏi thăm cũng tưới cây đó."}
        </SpeechBubble>
      </div>

      <section className={cn("grid gap-3", garden.sources.supportSteps > 0 ? "grid-cols-3" : "grid-cols-2")}>
        <div className="rounded-3xl bg-peach p-4">
          <p className="font-display text-3xl font-extrabold">{garden.sources.habitDone}</p>
          <p className="text-sm text-muted">lần làm thói quen</p>
        </div>
        <div className="rounded-3xl bg-butter p-4">
          <p className="font-display text-3xl font-extrabold">{garden.sources.checkinDays}</p>
          <p className="text-sm text-muted">ngày có check-in</p>
        </div>
        {garden.sources.supportSteps > 0 && (
          <Link href="/me/hanh-trinh" className="rounded-3xl bg-mint p-4 transition hover:-translate-y-0.5">
            <p className="font-display text-3xl font-extrabold">{garden.sources.supportSteps}</p>
            <p className="text-sm text-muted">giọt từ Hành trình</p>
          </Link>
        )}
      </section>

      {garden.plants.length > 1 && (
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Đổi loại cây</h2>
          <div className="grid grid-cols-3 gap-2">
            {garden.plants.map((p) => {
              const final = p.stages[p.stages.length - 1];
              const active = p.id === plant.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={pending || active}
                  aria-pressed={active}
                  onClick={() => startTransition(async () => void (await choosePlant(p.id)))}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm transition",
                    active ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                  )}
                >
                  <span className="text-3xl">{final.emoji}</span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-muted">{final.points} giọt</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Đổi cây vẫn giữ nguyên số giọt nước đang có.</p>
        </section>
      )}

      {garden.harvests.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Bộ sưu tập ({garden.harvests.length})</h2>
          <ul className="flex flex-wrap gap-2">
            {garden.harvests.map((h, i) => (
              <li key={i} title={`${h.plant_name} · ${new Date(h.created_at).toLocaleDateString("vi-VN")}`} className="flex size-12 items-center justify-center rounded-2xl bg-mint text-2xl">
                {h.plant_emoji}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
