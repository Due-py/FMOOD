"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { undoAlert, updateAlert } from "@/app/actions/staff";
import { useUndo } from "@/components/staff/Undo";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { AlertRow } from "@/lib/staff";
import { classLabel } from "@/lib/class-tools";

const TYPE_LABEL: Record<AlertRow["type"], string> = {
  chat_risk: "Trong trò chuyện với Mây",
  negative_streak: "Cảm xúc nặng lòng nhiều ngày liền",
  lesson_risk: "Trong bài tập / câu hỏi suy ngẫm",
  help_request: "Học sinh nhờ thầy cô giúp",
  worry_worse: "Mây hỏi thăm: học sinh thấy nặng hơn",
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

/** Ai đang lo cảnh báo này, nói bằng lời thường. */
function whoIsHandling(alert: AlertRow, selfId: string) {
  if (alert.status === "resolved") return `Đã xong${alert.handled_by_name ? ` · ${alert.handled_by_name}` : ""}`;
  if (alert.status === "seen") return alert.handled_by === selfId ? "Bạn đang xử lý" : `${alert.handled_by_name ?? "Thầy cô"} đang xử lý`;
  return "Chưa ai nhận";
}

export function AlertCard({ alert, selfId }: { alert: AlertRow; selfId: string }) {
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(alert.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const offerUndo = useUndo();
  const urgent = alert.severity === "urgent";
  const name = alert.full_name ?? alert.nickname;

  function update(status: AlertRow["status"], done: string, withNote?: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateAlert(alert.id, { status, note: withNote });
      if (!res.ok) return setError(res.error);
      setNoteOpen(false);
      offerUndo(`${done}: ${name}`, () => undoAlert(alert.id, res.undo));
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
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", urgent ? "bg-danger text-white" : "bg-butter text-ink")}>
          {urgent ? "⚠ Khẩn cấp" : "Cần để ý"}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            alert.status === "new" ? "bg-peach text-ink" : "bg-surface-2 text-muted",
          )}
        >
          {whoIsHandling(alert, selfId)}
        </span>
        <span className="ml-auto text-xs text-muted">{formatDateTime(alert.created_at)}</span>
      </div>

      <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
        {name}
        {alert.full_name && <span className="font-sans text-sm font-normal text-muted"> · biệt danh “{alert.nickname}”</span>}
      </h3>
      <p className="text-sm text-muted">
        {alert.class_name ? classLabel(alert.class_name) : "Không còn gắn lớp"} · {TYPE_LABEL[alert.type]}
        {!alert.student_id && " · học sinh đã xóa tài khoản"}
      </p>

      {alert.contentHidden ? (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          🔒 Nội dung chỉ phòng tham vấn đọc. Thầy cô để ý hỏi han em nhẹ nhàng; phòng tham vấn sẽ liên hệ khi cần thầy cô phối hợp.
        </p>
      ) : (
        <>
          {alert.excerpt && (
            <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">“{alert.excerpt}”</blockquote>
          )}
          {alert.reasons.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {alert.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
          {alert.note && <p className="mt-3 whitespace-pre-wrap text-sm">Ghi chú: {alert.note}</p>}
          {alert.otherAlerts > 0 && alert.student_id && (
            <Link href={`/staff/alerts?hoc-sinh=${alert.student_id}`} className="mt-2 inline-block text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
              Em này có {alert.otherAlerts} cảnh báo khác · xem cả quá trình
            </Link>
          )}
        </>
      )}

      {noteOpen && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Đã làm gì để hỗ trợ em? (chỉ phòng tham vấn và admin thấy)"
          className={cn(input, "mt-3")}
          aria-label="Ghi chú xử lý"
        />
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!alert.contentHidden && (
        <div className="mt-4 flex flex-wrap gap-2">
          {alert.status === "new" && (
            <button type="button" disabled={pending} onClick={() => update("seen", "Đã nhận xử lý")} className={btn.primary}>
              Tôi nhận
            </button>
          )}
          {alert.status !== "resolved" &&
            (noteOpen ? (
              <>
                <button type="button" disabled={pending} onClick={() => update("resolved", "Đã đánh dấu xong", note)} className={btn.primary}>
                  Lưu và đánh dấu xong
                </button>
                <button type="button" onClick={() => setNoteOpen(false)} className={btn.ghost}>
                  Thôi
                </button>
              </>
            ) : (
              <button type="button" disabled={pending} onClick={() => setNoteOpen(true)} className={btn.secondary}>
                Đã xong…
              </button>
            ))}
          {alert.status === "resolved" && (
            <button type="button" disabled={pending} onClick={() => update("seen", "Đã mở lại")} className={btn.ghost}>
              Mở lại
            </button>
          )}
        </div>
      )}
    </article>
  );
}
