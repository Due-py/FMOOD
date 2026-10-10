"use client";

import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { previewReply } from "@/app/actions/admin";
import { May } from "@/components/mascot/May";
import { btn } from "@/components/ui/styles";
import type { Persona } from "@/lib/ai/prompts";

/** Sân thử: gửi một câu cho Mây bằng nhân vật / lời dặn đang soạn (chưa lưu). Không lưu lại gì. */
export function MayPlayground({ persona, rules }: { persona?: Persona; rules?: string }) {
  const [message, setMessage] = useState("Dạo này mình áp lực chuyện thi quá");
  const [result, setResult] = useState<{ reply: string; scenarios: string[]; knowledge: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-[var(--radius-card)] bg-sky p-5">
      <p className="font-display text-lg font-bold tracking-tight">Thử nói chuyện</p>
      <p className="text-sm text-muted">Dùng nội dung đang soạn ở trên (chưa cần lưu). Không lưu, không tạo cảnh báo.</p>
      <form
        action={() =>
          startTransition(async () => {
            setError(null);
            const res = await previewReply({ persona, rules, message });
            if (res.ok) setResult(res);
            else setError(res.error);
          })
        }
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Tin nhắn thử"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
        />
        <button type="submit" disabled={pending || !message.trim()} className={btn.primary}>
          {pending ? "Mây đang nghĩ…" : "Gửi thử"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-4">
          <div className="flex items-end gap-2">
            <May size={34} float={false} />
            <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed [&_p+p]:mt-2">
              <Markdown>{result.reply}</Markdown>
            </div>
          </div>
          {(result.scenarios.length > 0 || result.knowledge.length > 0) && (
            <p className="mt-2 text-xs text-muted">
              {result.scenarios.length > 0 && <>Kịch bản dùng: {result.scenarios.join(", ")}. </>}
              {result.knowledge.length > 0 && <>Tài liệu tham khảo: {[...new Set(result.knowledge)].join(", ")}.</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
