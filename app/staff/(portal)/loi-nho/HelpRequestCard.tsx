"use client";

import { useEffect, useState, useTransition } from "react";
import { markHelpSeen, replyHelpRequest, setHelpRequestDone, undoHelpRequest } from "@/app/actions/help-inbox";
import { useUndo } from "@/components/staff/Undo";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { HELP_STATUS_LABEL, partsOf, replyTemplates, TO_LABEL, WHEN_LABEL, type HelpRequest } from "@/lib/help-requests-shared";
import { classLabel } from "@/lib/class-tools";

function when(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(
    new Date(iso),
  );
}

export function HelpRequestCard({ request: r }: { request: HelpRequest }) {
  const templates = replyTemplates(r.to_role, r.when_pref, r.with_buddy === true);
  // thầy cô vừa thấy lời nhờ này: ghi "thầy cô đã xem" để học sinh biết (chỉ người được nhờ ghi được, máy chủ kiểm tra)
  useEffect(() => {
    if (!r.seen_at && r.status === "new") void markHelpSeen([r.id]);
  }, [r.id, r.seen_at, r.status]);
  const [reply, setReply] = useState(r.reply ?? "");
  const [editing, setEditing] = useState(r.status === "new");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const offerUndo = useUndo();
  const name = r.full_name ?? r.nickname;

  function act(fn: () => ReturnType<typeof replyHelpRequest>, done: string) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error);
      setEditing(false);
      offerUndo(`${done}: ${name}`, () => undoHelpRequest(r.id, res.undo));
    });
  }

  return (
    <article className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5", r.status === "done" && "opacity-75")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", r.status === "new" ? "bg-butter" : "bg-surface-2 text-muted")}>
          {HELP_STATUS_LABEL[r.status]}
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">Gửi {TO_LABEL[r.to_role].toLowerCase()}</span>
        <span className="ml-auto text-xs text-muted">{when(r.created_at)}</span>
      </div>

      <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
        {name}
        {r.full_name && <span className="font-sans text-sm font-normal text-muted"> · biệt danh “{r.nickname}”</span>}
      </h3>
      <p className="text-sm text-muted">
        {r.class_name ? classLabel(r.class_name) : "Chưa vào lớp"} · Muốn gặp: <strong className="text-ink">{WHEN_LABEL[r.when_pref].toLowerCase()}</strong>
      </p>
      {partsOf(r).length > 0 && (
        <dl className="mt-3 space-y-2 rounded-2xl bg-surface-2 px-4 py-3 text-[15px]">
          {partsOf(r).map((p) => (
            <div key={p.label}>
              <dt className="text-xs font-semibold text-muted">{p.label.replace("Mình", "Em")}</dt>
              <dd className="whitespace-pre-wrap">{p.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {r.with_buddy && <p className="mt-2 text-sm font-semibold">🧑‍🤝‍🧑 Em muốn rủ một bạn đi cùng khi gặp thầy cô</p>}

      {r.reply && !editing && (
        <p className="mt-3 rounded-2xl bg-mint px-4 py-3 text-sm">
          <span className="font-semibold">{r.replied_by_name ?? "Thầy cô"} đã trả lời:</span> {r.reply}
        </p>
      )}

      {editing && r.status !== "done" && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold">Bấm một câu có sẵn, hoặc tự viết:</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t} type="button" onClick={() => setReply(t)} className="rounded-2xl bg-butter px-3 py-2 text-left text-sm hover:brightness-95">
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Lời đáp cho em (em sẽ thấy ở trang chủ)"
            aria-label={`Trả lời ${name}`}
            className={input}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {r.status !== "done" &&
          (editing ? (
            <button
              type="button"
              disabled={pending || !reply.trim()}
              onClick={() => act(() => replyHelpRequest(r.id, reply), "Đã gửi lời đáp")}
              className={btn.primary}
            >
              {pending ? "Đang gửi…" : "Gửi trả lời"}
            </button>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={btn.ghost}>
              Sửa lời đáp
            </button>
          ))}
        {r.status !== "done" && (
          <button type="button" disabled={pending} onClick={() => act(() => setHelpRequestDone(r.id, true), "Đã đánh dấu xong")} className={btn.secondary}>
            Đã gặp em, xong
          </button>
        )}
        {r.status === "done" && (
          <button type="button" disabled={pending} onClick={() => act(() => setHelpRequestDone(r.id, false), "Đã mở lại")} className={btn.ghost}>
            Mở lại
          </button>
        )}
      </div>
    </article>
  );
}
