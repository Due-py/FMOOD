"use client";

import { useState, useTransition } from "react";
import { requestHelpNow } from "@/app/actions/help";
import { ShieldIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { btnUrgent, CardHead, helpCard, helpInput } from "./fun";

/** Nút báo thầy cô: thầy cô chủ nhiệm và phòng tham vấn sẽ liên hệ với bạn. Giao diện vui: thẻ trắng, nút đỏ to (việc gấp). */
export function HelpRequest() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "already" | "error">("idle");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (status === "sent" || status === "already") {
    return (
      <div className={helpCard}>
        <p role="status" className="flex items-start gap-3 rounded-[1.4rem] bg-c2 px-4 py-3.5 text-sm">
          <ShieldIcon size={24} className="mt-0.5 shrink-0 text-c2-ink" />
          <span>
            <span className="block font-display text-base font-bold text-c2-ink">
              {status === "sent" ? "Đã báo thầy cô." : "Thầy cô đã nhận được lời nhờ của bạn rồi."}
            </span>
            Thầy cô chủ nhiệm và phòng tham vấn sẽ tìm gặp bạn sớm nhất có thể. Nếu đang nguy hiểm, đừng chờ: gọi <strong>115</strong> hoặc{" "}
            <strong>111</strong> ngay.
          </span>
        </p>
      </div>
    );
  }

  return (
    <form
      className={cn(helpCard, "space-y-3")}
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
      <CardHead
        emoji="🙋"
        tint="bg-danger-soft"
        title="Nhờ thầy cô liên hệ với mình"
        sub="Thầy cô chủ nhiệm và phòng tham vấn sẽ được báo ngay. Lời nhắn là không bắt buộc."
      />
      <label className="block">
        <span className="sr-only">Lời nhắn cho thầy cô (không bắt buộc)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Ví dụ: em đang ở nhà, em cần nói chuyện với cô"
          className={helpInput}
        />
      </label>
      {status === "error" && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnUrgent}>
        <span aria-hidden>🔔</span> {pending ? "Đang báo…" : "Báo thầy cô ngay"}
      </button>
    </form>
  );
}
