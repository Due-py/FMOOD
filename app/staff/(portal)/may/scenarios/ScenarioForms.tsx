"use client";

import { useState, useTransition } from "react";
import { deleteScenario, saveScenario, testScenarios } from "@/app/actions/admin";
import { Field, StatusText, StringListEditor, textarea, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { Scenario } from "@/lib/scenarios";

export function ScenarioTester() {
  const [text, setText] = useState("");
  const [titles, setTitles] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() =>
        startTransition(async () => {
          const res = await testScenarios(text);
          if (res.ok) setTitles(res.titles);
        })
      }
      className="rounded-[var(--radius-card)] bg-sky p-5"
    >
      <p className="font-semibold">Câu này khớp kịch bản nào?</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="VD: mai thi toán mà mình học không vào" aria-label="Câu thử" className={cn(input, "flex-1")} />
        <button type="submit" disabled={pending || !text.trim()} className={btn.secondary}>
          Kiểm tra
        </button>
      </div>
      {titles && (
        <p className="mt-2 text-sm">
          {titles.length ? <>Khớp: <strong>{titles.join(", ")}</strong></> : "Không khớp kịch bản nào, Mây sẽ trả lời theo lời dặn chung."}
        </p>
      )}
    </form>
  );
}

export function ScenarioEditor({ scenario }: { scenario: Scenario | null }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(scenario?.title ?? "");
  const [triggers, setTriggers] = useState<string[]>(scenario?.triggers ?? []);
  const [guidance, setGuidance] = useState(scenario?.guidance ?? "");
  const [active, setActive] = useState(scenario?.active ?? true);
  const { pending, status, run } = useAction();

  if (!scenario && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(btn.secondary, "w-full py-4")}>
        + Thêm kịch bản
      </button>
    );
  }

  return (
    <form
      action={() =>
        run(
          () => saveScenario(scenario?.id ?? null, { title, triggers, guidance, active }),
          scenario ? "Đã lưu." : "Đã thêm kịch bản.",
          () => {
            if (!scenario) {
              setOpen(false);
              setTitle("");
              setTriggers([]);
              setGuidance("");
            }
          },
        )
      }
      className={cn("space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-5", !active && "opacity-70")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl" aria-hidden>
          🧭
        </span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Tên chủ đề" aria-label="Tên chủ đề" className={cn(input, "max-w-sm font-semibold")} />
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Đang dùng
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Cụm từ nhận diện</p>
        <StringListEditor values={triggers} onChange={setTriggers} max={30} placeholder="VD: điểm kém" />
      </div>
      <Field label="Hướng dẫn cho Mây" hint="Viết như dặn một người bạn: nên hỏi gì, nên gợi ý gì, tránh nói gì, khi nào khuyên tìm người lớn.">
        <textarea value={guidance} onChange={(e) => setGuidance(e.target.value)} rows={5} maxLength={3000} className={textarea} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Đang lưu…" : scenario ? "Lưu" : "Thêm"}
        </button>
        {scenario ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`Xóa kịch bản "${scenario.title}"?`) && run(() => deleteScenario(scenario.id), "Đã xóa.")}
            className={cn(btn.ghost, "text-danger hover:bg-danger-soft hover:text-danger")}
          >
            Xóa
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
            Hủy
          </button>
        )}
        <StatusText status={status} />
      </div>
    </form>
  );
}
