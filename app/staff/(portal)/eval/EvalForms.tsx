"use client";

import { useState } from "react";
import { deleteEvalCase, runEval, runReplyEval, saveEvalCase } from "@/app/actions/admin";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

type Case = { id: string; input: string; expected: string; note: string | null; active: boolean };

const LEVELS = [
  { value: "none", label: "Bình thường", cls: "bg-mint" },
  { value: "concern", label: "Đáng lo", cls: "bg-butter" },
  { value: "urgent", label: "Khẩn cấp", cls: "bg-danger text-white" },
];

export function RunButton({ count }: { count: number }) {
  const { pending, status, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || count === 0}
        onClick={() => run(runEval, "Đã chạy xong.")}
        className={btn.primary}
      >
        {pending ? `Đang chạy ${count} câu…` : `🧪 Chạy bộ thử (${count} câu)`}
      </button>
      <StatusText status={status} />
    </div>
  );
}

export function RunReplyButton({ count }: { count: number }) {
  const { pending, status, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending} onClick={() => run(runReplyEval, "Đã chạy xong.")} className={btn.secondary}>
        {pending ? `Đang hỏi trợ lý ${count} câu…` : `💬 Chạy bộ thử câu trả lời (${count} câu)`}
      </button>
      <StatusText status={status} />
    </div>
  );
}

export function CaseList({ cases }: { cases: Case[] }) {
  const [input_, setInput] = useState("");
  const [expected, setExpected] = useState("none");
  const [note, setNote] = useState("");
  const { pending, status, run } = useAction();

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {cases.map((c) => (
          <CaseRow key={c.id} c={c} />
        ))}
      </ul>
      <form
        action={() =>
          run(() => saveEvalCase(null, { input: input_, expected, note }), "Đã thêm câu thử.", () => {
            setInput("");
            setNote("");
          })
        }
        className="grid gap-2 rounded-2xl bg-surface-2 p-3 sm:grid-cols-[1fr_auto_10rem_auto]"
      >
        <input value={input_} onChange={(e) => setInput(e.target.value)} placeholder="Câu thử mới…" aria-label="Câu thử" className={input} />
        <select value={expected} onChange={(e) => setExpected(e.target.value)} aria-label="Mức mong đợi" className={input}>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" aria-label="Ghi chú" className={input} />
        <button type="submit" disabled={pending || !input_.trim()} className={btn.primary}>
          Thêm
        </button>
      </form>
      <StatusText status={status} />
    </div>
  );
}

function CaseRow({ c }: { c: Case }) {
  const { pending, status, run } = useAction();
  const level = LEVELS.find((l) => l.value === c.expected)!;
  return (
    <li className="flex flex-wrap items-center gap-3 bg-surface p-3">
      <span className={cn("w-24 shrink-0 rounded-full px-2 py-1 text-center text-xs font-bold", level.cls)}>{level.label}</span>
      <p className="min-w-0 flex-1 text-sm">
        {c.input}
        {c.note && <span className="ml-2 text-xs text-muted">· {c.note}</span>}
      </p>
      <select
        value={c.expected}
        disabled={pending}
        aria-label="Đổi mức mong đợi"
        onChange={(e) => run(() => saveEvalCase(c.id, { input: c.input, expected: e.target.value, note: c.note ?? "" }))}
        className="rounded-full border border-line bg-surface px-2 py-1 text-xs"
      >
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("Xóa câu thử này?") && run(() => deleteEvalCase(c.id), "Đã xóa.")}
        className="rounded-full border border-danger/30 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
      >
        Xóa
      </button>
      {status && !status.ok && <StatusText status={status} />}
    </li>
  );
}
