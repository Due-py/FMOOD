"use client";

import { useState } from "react";
import { deleteEvalCase, runEval, runReplyEval, saveEvalCase } from "@/app/actions/admin";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { SuiteRow } from "@/lib/eval/safety-suite";

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

/** Một dòng của bộ thử an toàn gộp (lib/eval/safety-suite.ts), không kèm lịch sử tin nhắn (chỉ số tin trước đó). */
export type CaseRowData = Omit<SuiteRow, "history"> & { afterTurns: number };

/** Bộ thử an toàn gộp: mỗi nhóm một khối, cột "Được thêm bởi"; câu thầy cô thêm đổi mức / xóa được, thêm câu mới ở cuối. */
export function CaseTable({ rows }: { rows: CaseRowData[] }) {
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const items = rows.filter((r) => r.group === g);
        const own = items[0]?.source === "trang";
        return (
          <details key={g} open={own} className="rounded-2xl border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {g} <span className="font-normal text-muted">· {items.length} câu{own ? "" : ` · ${items[0]?.by} · ${items[0]?.date}`}</span>
            </summary>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Câu thử</th>
                    <th className="px-2 py-2 font-semibold">Mức mong đợi</th>
                    <th className="px-2 py-2 font-semibold">Được thêm bởi</th>
                    <th className="px-2 py-2 font-semibold">Ngày</th>
                    {own && <th className="px-2 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((r) => (
                    <CaseRow key={r.key} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
      <AddCase />
    </div>
  );
}

function AddCase() {
  const [input_, setInput] = useState("");
  const [expected, setExpected] = useState("none");
  const [note, setNote] = useState("");
  const { pending, status, run } = useAction();
  return (
    <div>
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

function CaseRow({ r }: { r: CaseRowData }) {
  const { pending, status, run } = useAction();
  const level = LEVELS.find((l) => l.value === r.expected)!;
  const own = r.source === "trang";
  return (
    <tr className={cn(own && (!r.active || r.duplicate) && "opacity-60")}>
      <td className="px-4 py-2">
        {r.input}
        {r.afterTurns > 0 && <span className="ml-2 text-xs text-muted">· sau {r.afterTurns} tin</span>}
        {r.note && <span className="ml-2 text-xs text-muted">· {r.note}</span>}
        {r.duplicate && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">trùng câu có sẵn · không chạy lại</span>}
        {own && !r.active && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">đang tắt</span>}
        {status && !status.ok && <StatusText status={status} />}
      </td>
      <td className="px-2 py-2">
        {own ? (
          <select
            value={r.expected}
            disabled={pending}
            aria-label="Đổi mức mong đợi"
            onChange={(e) => run(() => saveEvalCase(r.dbId!, { input: r.input, expected: e.target.value, note: r.note ?? "" }))}
            className="rounded-full border border-line bg-surface px-2 py-1 text-xs"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn("inline-block w-24 rounded-full px-2 py-1 text-center text-xs font-bold", level.cls)}>{level.label}</span>
        )}
      </td>
      <td className="px-2 py-2 text-xs">{r.by}</td>
      <td className="px-2 py-2 text-xs tabular-nums">{r.date}</td>
      {own && (
        <td className="px-2 py-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm("Xóa câu thử này?") && run(() => deleteEvalCase(r.dbId!), "Đã xóa.")}
            className="rounded-full border border-danger/30 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
          >
            Xóa
          </button>
        </td>
      )}
    </tr>
  );
}
