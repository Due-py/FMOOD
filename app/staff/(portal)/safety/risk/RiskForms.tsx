"use client";

import { useState, useTransition } from "react";
import { saveSettingAction, testRiskMessage } from "@/app/actions/admin";
import { SaveBar, StringListEditor, textarea, useAction } from "@/components/admin/AdminUI";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { SafetyDetail } from "@/lib/safety/check";
import { STRESS_LABEL } from "@/lib/safety/signals";

const LEVEL: Record<string, { label: string; cls: string }> = {
  none: { label: "Bình thường", cls: "bg-mint" },
  concern: { label: "Đáng lo", cls: "bg-butter" },
  urgent: { label: "Khẩn cấp", cls: "bg-danger text-white" },
};

export function RiskTester() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SafetyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <form
        action={() =>
          startTransition(async () => {
            setError(null);
            const res = await testRiskMessage(text);
            if (res.ok) setResult(res.detail);
            else setError(res.error);
          })
        }
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="VD: dạo này mình chẳng thiết gì nữa"
          aria-label="Câu cần thử"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
        />
        <button type="submit" disabled={pending || !text.trim()} className={btn.primary}>
          {pending ? "Đang chấm…" : "Thử"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2">
            Kết quả:
            <span className={cn("rounded-full px-3 py-1 text-sm font-bold", LEVEL[result.level].cls)}>{LEVEL[result.level].label}</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Layer name="Bộ lọc cụm từ" r={result.layers.keyword} />
            <Layer name="AI phân loại" r={result.layers.classifier} />
            <Layer name="Moderation (dự phòng)" r={result.layers.moderation} />
          </div>
        </div>
      )}
    </div>
  );
}

function Layer({ name, r }: { name: string; r: SafetyDetail["layers"]["moderation"] }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3 text-sm">
      <p className="font-semibold">{name}</p>
      {r === "error" ? (
        <p className="text-danger">Lỗi khi gọi</p>
      ) : r === "skipped" ? (
        <p className="text-muted">Không cần dùng</p>
      ) : (
        <>
          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold", LEVEL[r.level].cls)}>{LEVEL[r.level].label}</span>
          {r.stress && <span className="ml-2 text-xs text-muted">Căng thẳng {STRESS_LABEL[r.stress]} (không đổi mức nguy cơ)</span>}
          {r.reasons.map((x) => (
            <p key={x} className="mt-1 text-xs text-muted">
              {x}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

export function PhrasesForm({ initial }: { initial: { urgent: string[]; concern: string[] } }) {
  const [urgent, setUrgent] = useState(initial.urgent);
  const [concern, setConcern] = useState(initial.concern);
  const { pending, status, run } = useAction();

  return (
    <form action={() => run(() => saveSettingAction("safety.phrases", { urgent, concern }))} className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-danger">Khẩn cấp: AI không tự trả lời, báo thầy cô ngay</p>
        <StringListEditor values={urgent} onChange={setUrgent} placeholder="Thêm cụm từ khẩn cấp" />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Đáng lo: Trợ lý vẫn trả lời, hiện thẻ hỗ trợ, báo thầy cô mức theo dõi</p>
        <StringListEditor values={concern} onChange={setConcern} placeholder="Thêm cụm từ đáng lo" />
      </div>
      <SaveBar pending={pending} status={status} settingKey="safety.phrases" />
    </form>
  );
}

export function ClassifierForm({ initial }: { initial: string }) {
  const [prompt, setPrompt] = useState(initial);
  const { pending, status, run } = useAction();
  return (
    <form action={() => run(() => saveSettingAction("safety.classifier", { prompt }))} className="space-y-3">
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={14} className={textarea} aria-label="Tiêu chí AI phân loại" />
      <SaveBar pending={pending} status={status} settingKey="safety.classifier" />
    </form>
  );
}

