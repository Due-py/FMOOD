"use client";

import { useState, useTransition } from "react";
import { askToTalk } from "@/app/actions/help";
import { btn, card, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { TO_LABEL, WHEN_LABEL, type HelpToRole, type HelpWhen } from "@/lib/help-requests-shared";

/** Không gấp: hẹn một lúc để nói chuyện với thầy cô chủ nhiệm hoặc phòng tham vấn. */
export function TalkRequest({ hasClass }: { hasClass: boolean }) {
  const [toRole, setToRole] = useState<HelpToRole>(hasClass ? "teacher" : "counselor");
  const [when, setWhen] = useState<HelpWhen>("break");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ already: boolean; urgent: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (result) {
    return (
      <p role="status" className={cn(card, "bg-lilac")}>
        <span className="block font-display text-lg font-bold">{result.already ? "Bạn đã hẹn rồi nè." : "Đã gửi lời hẹn."}</span>
        <span className="mt-1 block text-sm">
          {TO_LABEL[toRole]} sẽ trả lời bạn ở trang chủ.
          {result.urgent && " Nếu bạn đang gặp nguy hiểm, đừng chờ: gọi 111 hoặc 115 ngay, hoặc tìm người lớn gần nhất."}
        </span>
      </p>
    );
  }

  return (
    <form
      id="hen-gap"
      className={cn(card, "scroll-mt-24 space-y-4")}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await askToTalk({ toRole, when, note });
          if (res.ok) setResult({ already: res.already, urgent: res.urgent });
          else setError(res.error);
        });
      }}
    >
      <div>
        <h2 className="font-display text-lg font-bold">Không gấp? Hẹn nói chuyện với thầy cô</h2>
        <p className="text-sm text-muted">Chọn người và lúc tiện. Thầy cô sẽ trả lời bạn ở trang chủ.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Bạn muốn nói chuyện với</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["teacher", "counselor"] as const)
            .filter((r) => hasClass || r === "counselor")
            .map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={toRole === r}
                onClick={() => setToRole(r)}
                className={cn("rounded-2xl px-4 py-3 text-left font-semibold transition", toRole === r ? "bg-ink text-bg" : "bg-surface-2")}
              >
                {r === "teacher" ? "🧑‍🏫 " : "🫶 "}
                {TO_LABEL[r]}
              </button>
            ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Lúc nào tiện cho bạn</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(WHEN_LABEL) as HelpWhen[]).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={when === w}
              onClick={() => setWhen(w)}
              className={cn("rounded-full px-4 py-2 text-sm font-semibold", when === w ? "bg-ink text-bg" : "border border-line bg-surface")}
            >
              {WHEN_LABEL[w]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Muốn nói trước một chút? (không bắt buộc)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Ví dụ: em muốn hỏi về chuyện với bạn cùng bàn"
          className={cn(input, "resize-none")}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btn.primary, "w-full")}>
        {pending ? "Đang gửi…" : "Gửi lời hẹn"}
      </button>
    </form>
  );
}
