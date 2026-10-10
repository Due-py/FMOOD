"use client";

import { useState, useTransition } from "react";
import { pingAi, saveSettingAction } from "@/app/actions/admin";
import { Field, SaveBar, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";

const SUGGESTED = ["gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.4", "gpt-5.5", "gpt-5.6-terra"];

export function PingButtons({ chat, safety }: { chat: string; safety: string }) {
  const models = [...new Set([chat, safety])];
  return (
    <div className="flex flex-wrap gap-3">
      {models.map((m) => (
        <Ping key={m} model={m} />
      ))}
    </div>
  );
}

function Ping({ model }: { model: string }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="font-mono text-sm">{model}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await pingAi(model);
            setResult(r.ok ? { ok: true, text: `✅ Trả lời “${r.reply}” sau ${(r.latencyMs / 1000).toFixed(1)} s` } : { ok: false, text: `❌ ${r.error}` });
          })
        }
        className={`${btn.secondary} mt-2 py-1.5 text-sm`}
      >
        {pending ? "Đang thử…" : "Kiểm tra"}
      </button>
      {result && <p className={`mt-2 text-sm ${result.ok ? "" : "text-danger"}`}>{result.text}</p>}
    </div>
  );
}

export function ModelsForm({ initial }: { initial: { chat: string; safety: string } }) {
  const [m, setM] = useState(initial);
  const { pending, status, run } = useAction();
  return (
    <form action={() => run(() => saveSettingAction("ai.models", m))} className="space-y-4">
      <datalist id="model-suggestions">
        {SUGGESTED.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Model trò chuyện" hint="Model trả lời học sinh.">
          <input list="model-suggestions" value={m.chat} onChange={(e) => setM({ ...m, chat: e.target.value })} className={`${input} font-mono text-sm`} />
        </Field>
        <Field label="Model kiểm tra an toàn" hint="Model chấm mức nguy hiểm của từng tin nhắn.">
          <input list="model-suggestions" value={m.safety} onChange={(e) => setM({ ...m, safety: e.target.value })} className={`${input} font-mono text-sm`} />
        </Field>
      </div>
      <SaveBar pending={pending} status={status} settingKey="ai.models" />
    </form>
  );
}
