"use client";

import { useState, useTransition } from "react";
import { requestHelpNow } from "@/app/actions/help";
import { ShieldIcon } from "@/components/ui/icons";
import { btn, card, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Nút báo thầy cô: thầy cô chủ nhiệm và phòng tham vấn sẽ liên hệ với bạn. */
export function HelpRequest() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "already" | "error">("idle");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (status === "sent" || status === "already") {
    return (
      <p role="status" className={cn(card, "flex items-start gap-3")}>
        <ShieldIcon size={20} className="mt-0.5 shrink-0 text-brand-strong dark:text-brand" />
        <span>
          {status === "sent" ? "Đã báo thầy cô." : "Thầy cô đã nhận được lời nhờ của bạn rồi."} Thầy cô chủ nhiệm và phòng
          tham vấn sẽ tìm gặp bạn sớm nhất có thể. Nếu đang nguy hiểm, đừng chờ: gọi <strong>115</strong> hoặc{" "}
          <strong>111</strong> ngay.
        </span>
      </p>
    );
  }

  return (
    <form
      className={cn(card, "space-y-3")}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestHelpNow(note);
          if (res.ok) setStatus(res.already ? "already" : "sent");
          else {
            setStatus("error");
            setError(res.error);
          }
        });
      }}
    >
      <h2 className="font-display text-lg font-bold">Nhờ thầy cô liên hệ với mình</h2>
      <p className="text-sm text-muted">
        Thầy cô chủ nhiệm và phòng tham vấn sẽ được báo ngay. Lời nhắn là không bắt buộc.
      </p>
      <label className="block">
        <span className="sr-only">Lời nhắn cho thầy cô (không bắt buộc)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Ví dụ: em đang ở nhà, em cần nói chuyện với cô"
          className={cn(input, "resize-none")}
        />
      </label>
      {status === "error" && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btn.danger, "w-full py-3")}>
        {pending ? "Đang báo…" : "Báo thầy cô ngay"}
      </button>
    </form>
  );
}
