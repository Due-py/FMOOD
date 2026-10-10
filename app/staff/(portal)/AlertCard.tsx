"use client";

import { useState, useTransition } from "react";
import { updateAlert } from "@/app/actions/staff";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { AlertRow } from "@/lib/staff";

const TYPE_LABEL: Record<AlertRow["type"], string> = {
  chat_risk: "Trong trò chuyện với Mây",
  negative_streak: "Cảm xúc nặng lòng nhiều ngày liền",
  lesson_risk: "Trong bài tập ở thư viện",
  help_request: "Học sinh nhờ thầy cô giúp",
};

const STATUS_LABEL: Record<AlertRow["status"], string> = {
  new: "Mới",
  seen: "Đang xử lý",
  resolved: "Đã xong",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "numeric",
  }).format(new Date(iso));
}

export function AlertCard({ alert }: { alert: AlertRow }) {
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(alert.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const urgent = alert.severity === "urgent";

  function update(status: AlertRow["status"], withNote?: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateAlert(alert.id, { status, note: withNote });
      if (!res.ok) setError(res.error);
      else setNoteOpen(false);
    });
  }

  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border bg-surface p-5",
        urgent && alert.status !== "resolved" ? "border-danger/50" : "border-line",
        alert.status === "resolved" && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            urgent ? "bg-danger text-white" : "bg-butter text-ink",
          )}
        >
          {urgent ? "⚠ Khẩn cấp" : "Theo dõi"}
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
          {STATUS_LABEL[alert.status]}
        </span>
        <span className="ml-auto text-xs text-muted">{formatDateTime(alert.created_at)}</span>
      </div>

      <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
        {alert.full_name ?? alert.nickname}
        {alert.full_name && <span className="font-sans text-sm font-normal text-muted"> · biệt danh “{alert.nickname}”</span>}
      </h3>
      <p className="text-sm text-muted">
        {alert.class_name ? `Lớp ${alert.class_name}` : "Không còn gắn lớp"} · {TYPE_LABEL[alert.type]}
        {!alert.student_id && " · học sinh đã xóa tài khoản"}
      </p>

      {alert.excerpt && (
        <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
          “{alert.excerpt}”
        </blockquote>
      )}
      {alert.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {alert.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {alert.handled_by_name && alert.handled_at && (
        <p className="mt-3 text-xs text-muted">
          {alert.handled_by_name} cập nhật lúc {formatDateTime(alert.handled_at)}
          {alert.note && <span className="mt-1 block whitespace-pre-wrap text-sm text-ink">Ghi chú: {alert.note}</span>}
        </p>
      )}

      {noteOpen && (
        <div className="mt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Đã làm gì để hỗ trợ em? (chỉ thầy cô thấy)"
            className={input}
            aria-label="Ghi chú xử lý"
          />
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {alert.status === "new" && (
          <button type="button" disabled={pending} onClick={() => update("seen")} className={btn.secondary}>
            Tôi đang xử lý
          </button>
        )}
        {alert.status !== "resolved" &&
          (noteOpen ? (
            <button type="button" disabled={pending} onClick={() => update("resolved", note)} className={btn.primary}>
              Lưu và đánh dấu đã xong
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => setNoteOpen(true)} className={btn.primary}>
              Đã xong…
            </button>
          ))}
        {alert.status === "resolved" && (
          <button type="button" disabled={pending} onClick={() => update("seen")} className={btn.ghost}>
            Mở lại
          </button>
        )}
      </div>
    </article>
  );
}
