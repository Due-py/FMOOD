"use client";

import { useState } from "react";
import { saveSettingAction } from "@/app/actions/admin";
import { SaveBar, Section, textarea, useAction } from "@/components/admin/AdminUI";
import { MayPlayground } from "@/components/admin/MayPlayground";
import { buildCompanionPrompt, type Persona } from "@/lib/ai/prompts";

export function RulesForm({ initial, persona }: { initial: string; persona: Persona }) {
  const [text, setText] = useState(initial);
  const { pending, status, run } = useAction();

  return (
    <div className="space-y-6">
      <form action={() => run(() => saveSettingAction("ai.rules", { text }))}>
        <Section title="Vai trò và giới hạn" description="Viết thành từng gạch đầu dòng ngắn, rõ ràng. Mỗi lần sửa nên thử nói chuyện ở dưới.">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} className={textarea} aria-label="Lời dặn" />
          <div className="mt-4">
            <SaveBar pending={pending} status={status} settingKey="ai.rules" />
          </div>
        </Section>
      </form>

      <MayPlayground rules={text} />

      <details className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <summary className="cursor-pointer font-semibold">Xem lời dặn đầy đủ Mây nhận được</summary>
        <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 font-mono text-xs leading-relaxed">
          {buildCompanionPrompt({ persona, rules: text }, "(biệt danh học sinh)")}
        </pre>
      </details>
    </div>
  );
}
