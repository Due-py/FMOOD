"use client";

import { useState } from "react";
import { deleteJournalPrompt, moveJournalPrompt, saveJournalPrompt } from "@/app/actions/journal-admin";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { JOURNAL_KINDS, KIND_LABEL, PROMPT_MAX, type JournalKind } from "@/lib/journal-shared";

export type AdminPrompt = { id: string; kind: JournalKind; text: string; emoji: string; active: boolean; sort_order: number; uses: number };
type Tab = "tat-ca" | JournalKind;

/** Lọc theo loại, đổi thứ tự bằng mũi tên, sửa / tạm ẩn / xóa, thêm mẫu mới. */
export function JournalPromptManager({ prompts }: { prompts: AdminPrompt[] }) {
  const [tab, setTab] = useState<Tab>("tat-ca");
  const [draft, setDraft] = useState({ kind: "mo-dau" as JournalKind, emoji: "", text: "" });
  const { pending, status, run } = useAction();
  const shown = tab === "tat-ca" ? prompts : prompts.filter((p) => p.kind === tab);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Loại mẫu câu">
        {(["tat-ca", ...JOURNAL_KINDS] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold transition", tab === t ? "border-transparent bg-butter" : "border-line bg-surface hover:bg-surface-2")}
          >
            {t === "tat-ca" ? `Tất cả (${prompts.length})` : `${KIND_LABEL[t]} (${prompts.filter((p) => p.kind === t).length})`}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {shown.map((p) => (
          <PromptRow key={p.id} p={p} first={prompts[0]?.id === p.id} last={prompts.at(-1)?.id === p.id} />
        ))}
      </ul>

      <form
        action={() =>
          run(
            () => saveJournalPrompt(null, { ...draft, active: true, sort_order: (prompts.at(-1)?.sort_order ?? 0) + 10 }),
            "Đã thêm mẫu câu.",
            () => setDraft({ ...draft, emoji: "", text: "" }),
          )
        }
        className="mt-4 flex flex-wrap gap-2"
      >
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as JournalKind })} aria-label="Loại" className={cn(input, "w-auto py-2")}>
          {JOURNAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="🙂" maxLength={16} aria-label="Biểu tượng" className={cn(input, "w-20 py-2 text-center")} />
        <input
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder={draft.kind === "mo-dau" ? "VD: Điều làm mình mỉm cười hôm nay là…" : "VD: Gần đây ai đã giúp bạn? Bạn muốn nói gì với người đó?"}
          maxLength={PROMPT_MAX}
          aria-label="Mẫu câu"
          className={cn(input, "min-w-0 flex-1 py-2")}
        />
        <button type="submit" disabled={pending || draft.text.trim().length < 3} className={btn.primary}>
          Thêm
        </button>
      </form>
      <div className="mt-2">
        <StatusText status={status} />
      </div>
    </div>
  );
}

function PromptRow({ p, first, last }: { p: AdminPrompt; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p.text);
  const [emoji, setEmoji] = useState(p.emoji);
  const { pending, status, run } = useAction();
  const save = (patch: Partial<AdminPrompt>) => run(() => saveJournalPrompt(p.id, { kind: p.kind, text, emoji, active: p.active, sort_order: p.sort_order, ...patch }));
  const small = "rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-2";

  return (
    <li className={cn("flex flex-wrap items-center gap-3 bg-surface p-3", !p.active && "opacity-60")}>
      <span className="flex flex-col">
        <button type="button" aria-label="Lên trên" disabled={pending || first} onClick={() => run(() => moveJournalPrompt(p.id, "up"))} className="px-1 text-muted hover:text-ink disabled:opacity-30">
          ▲
        </button>
        <button type="button" aria-label="Xuống dưới" disabled={pending || last} onClick={() => run(() => moveJournalPrompt(p.id, "down"))} className="px-1 text-muted hover:text-ink disabled:opacity-30">
          ▼
        </button>
      </span>
      {editing ? (
        <>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={16} aria-label="Biểu tượng" className={cn(input, "w-16 py-2 text-center")} />
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={PROMPT_MAX} aria-label="Mẫu câu" className={cn(input, "min-w-0 flex-1 py-2")} autoFocus />
        </>
      ) : (
        <>
          <span className="w-8 text-center text-2xl" aria-hidden>
            {p.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{p.text}</span>
            <span className="text-xs text-muted">
              <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">{KIND_LABEL[p.kind]}</span> · Đã dùng {p.uses} lần
              {!p.active && " · đang ẩn"}
            </span>
          </span>
        </>
      )}
      <div className="flex gap-1">
        {editing ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              save({});
              setEditing(false);
            }}
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink"
          >
            Lưu
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className={small}>
            Sửa
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => save({ active: !p.active })} className={small}>
          {p.active ? "Tạm ẩn" : "Dùng lại"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm("Xóa mẫu câu này? Các trang đã viết vẫn giữ chữ của mẫu.") && run(() => deleteJournalPrompt(p.id), "Đã xóa.")}
          className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft"
        >
          Xóa
        </button>
      </div>
      {status && !status.ok && <StatusText status={status} />}
    </li>
  );
}
