"use client";

import { useState } from "react";
import { deleteReflectionQuestion, saveReflectionQuestion, saveSettingAction } from "@/app/actions/admin";
import { SaveBar, StatusText, StringListEditor, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function StartersForm({ initial }: { initial: string[] }) {
  const [items, setItems] = useState(initial);
  const { pending, status, run } = useAction();
  return (
    <form action={() => run(() => saveSettingAction("chat.starters", { items }))} className="space-y-4">
      <StringListEditor values={items} onChange={setItems} max={8} placeholder="VD: Mình đang lo về kỳ thi" />
      <p className="text-xs text-muted">Tối đa 8 câu, mỗi câu tối đa 60 ký tự.</p>
      <SaveBar pending={pending} status={status} settingKey="chat.starters" />
    </form>
  );
}

type Question = { id: string; text: string; active: boolean; sort_order: number };

export function ReflectionManager({ questions }: { questions: Question[] }) {
  const [draft, setDraft] = useState("");
  const { pending, status, run } = useAction();

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {questions.map((q, i) => (
          <QuestionRow key={q.id} q={q} index={i} />
        ))}
      </ul>
      <form
        action={() =>
          run(
            () => saveReflectionQuestion(null, { text: draft, active: true, sort_order: (questions.at(-1)?.sort_order ?? 0) + 1 }),
            "Đã thêm câu hỏi.",
            () => setDraft(""),
          )
        }
        className="mt-3 flex gap-2"
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Thêm câu hỏi mới…" maxLength={200} className={cn(input, "min-w-0 flex-1")} />
        <button type="submit" disabled={pending || !draft.trim()} className={btn.primary}>
          Thêm
        </button>
      </form>
      <div className="mt-2">
        <StatusText status={status} />
      </div>
    </div>
  );
}

function QuestionRow({ q, index }: { q: Question; index: number }) {
  const [text, setText] = useState(q.text);
  const [editing, setEditing] = useState(false);
  const { pending, status, run } = useAction();
  const save = (patch: Partial<Question>) => run(() => saveReflectionQuestion(q.id, { text, active: q.active, sort_order: q.sort_order, ...patch }));

  return (
    <li className={cn("flex flex-wrap items-center gap-3 bg-surface p-3", !q.active && "opacity-60")}>
      <span className="w-6 text-center text-sm text-muted">{index + 1}</span>
      {editing ? (
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} className={cn(input, "min-w-0 flex-1 py-2")} autoFocus />
      ) : (
        <p className="min-w-0 flex-1">{q.text}</p>
      )}
      <div className="flex gap-1">
        {editing ? (
          <button type="button" disabled={pending} onClick={() => { save({}); setEditing(false); }} className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink">
            Lưu
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-2">
            Sửa
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => save({ active: !q.active })} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-2">
          {q.active ? "Tạm ẩn" : "Dùng lại"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm("Xóa câu hỏi này?") && run(() => deleteReflectionQuestion(q.id), "Đã xóa.")}
          className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft"
        >
          Xóa
        </button>
      </div>
      {status && !status.ok && <StatusText status={status} />}
    </li>
  );
}
