"use client";

import { useState } from "react";
import { saveSettingAction } from "@/app/actions/admin";
import { Field, SaveBar, Section, useAction } from "@/components/admin/AdminUI";
import { MayPlayground } from "@/components/admin/MayPlayground";
import { May } from "@/components/mascot/May";
import { input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { Persona } from "@/lib/ai/prompts";

const EMOJI_OPTIONS: { value: Persona["emoji"]; label: string; example: string }[] = [
  { value: "none", label: "Không dùng", example: "Nghe có vẻ bạn đang mệt." },
  { value: "light", label: "Thỉnh thoảng", example: "Nghe có vẻ bạn đang mệt ☁️" },
  { value: "more", label: "Nhiều hơn", example: "Ôi, nghe mệt ghê 🥺 Mây ở đây nè 💚" },
];

export function PersonaForm({ initial }: { initial: Persona }) {
  const [p, setP] = useState<Persona>(initial);
  const { pending, status, run } = useAction();
  const set = <K extends keyof Persona>(k: K, v: Persona[K]) => setP((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-6">
      <form action={() => run(() => saveSettingAction("ai.persona", p))}>
        <Section title="Tính cách" description="Tên hiển thị trong giao diện học sinh vẫn là Mây. Tên ở đây là tên AI tự xưng khi trò chuyện.">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-sky p-4">
              <May size={90} mood="happy" />
              <p className="font-display text-lg font-bold">{p.name || "…"}</p>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên AI tự xưng">
                  <input value={p.name} onChange={(e) => set("name", e.target.value)} maxLength={20} className={input} />
                </Field>
                <Field label="Độ dài tối đa mỗi câu trả lời" hint="Học sinh thích câu ngắn. Nên để 60–100 từ.">
                  <span className="flex items-center gap-2">
                    <input
                      type="range"
                      min={30}
                      max={200}
                      step={10}
                      value={p.maxWords}
                      onChange={(e) => set("maxWords", Number(e.target.value))}
                      className="flex-1 accent-[var(--brand)]"
                    />
                    <span className="w-16 text-right text-sm font-semibold">{p.maxWords} từ</span>
                  </span>
                </Field>
              </div>
              <Field label="Tính cách">
                <textarea value={p.personality} onChange={(e) => set("personality", e.target.value)} rows={2} maxLength={300} className={input} />
              </Field>
              <Field label="Cách xưng hô">
                <input value={p.address} onChange={(e) => set("address", e.target.value)} maxLength={150} className={input} />
              </Field>
            </div>
          </div>

          <p className="mb-2 mt-5 text-sm font-semibold">Dùng emoji</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {EMOJI_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={p.emoji === o.value}
                onClick={() => set("emoji", o.value)}
                className={cn(
                  "rounded-2xl border-2 p-3 text-left transition",
                  p.emoji === o.value ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                )}
              >
                <span className="block font-semibold">{o.label}</span>
                <span className="block text-sm text-muted">{o.example}</span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <SaveBar pending={pending} status={status} settingKey="ai.persona" />
          </div>
        </Section>
      </form>

      <MayPlayground persona={p} />
    </div>
  );
}
