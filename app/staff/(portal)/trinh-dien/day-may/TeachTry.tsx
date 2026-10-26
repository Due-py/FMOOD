"use client";

import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { tryTeaching } from "@/app/actions/demo";
import { May } from "@/components/mascot/May";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { TaughtReply } from "@/lib/demo/teach";

const PRESETS = [
  {
    extra: "Khi bạn kể bị trêu chọc hay bị cô lập, luôn gợi ý nhẹ nhàng kể với thầy cô chủ nhiệm hoặc phòng tham vấn.",
    message: "Mấy bạn trong lớp hay trêu mình, mình chẳng muốn đi học",
  },
  {
    extra: "Không làm bài tập hộ. Khi bạn nhờ viết bài, hỏi bạn đang kẹt ở đâu và gợi ý cách bắt đầu.",
    message: "Viết hộ mình bài văn tả mẹ 300 chữ đi",
  },
];

/** Dạy thử: thêm một lời dặn tạm, so câu trả lời trước / sau. Không lưu gì. */
export function TeachTry() {
  const [extra, setExtra] = useState(PRESETS[0].extra);
  const [message, setMessage] = useState(PRESETS[0].message);
  const [result, setResult] = useState<{ before: TaughtReply; after: TaughtReply } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setResult(null);
          start(async () => {
            const res = await tryTeaching(extra, message);
            if (res.ok) setResult({ before: res.before, after: res.after });
            else setError(res.error);
          });
        }}
        className="grid gap-3 lg:grid-cols-2"
      >
        <label className="block">
          <span className="font-semibold">Lời dặn thêm (tạm, không lưu)</span>
          <textarea value={extra} maxLength={300} rows={3} onChange={(e) => setExtra(e.target.value)} className={cn(input, "mt-1 resize-none")} />
        </label>
        <label className="block">
          <span className="font-semibold">Câu thử của một bạn</span>
          <textarea value={message} maxLength={300} rows={3} onChange={(e) => setMessage(e.target.value)} className={cn(input, "mt-1 resize-none")} />
        </label>
        <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
          <button type="submit" disabled={pending || !extra.trim() || !message.trim()} className={btn.primary}>
            {pending ? "Mây đang trả lời 2 lần…" : "Thử: trước và sau khi dặn"}
          </button>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setExtra(p.extra);
                setMessage(p.message);
                setResult(null);
              }}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-sky"
            >
              Ví dụ {i + 1}
            </button>
          ))}
        </div>
      </form>
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {result && (
        <div className="grid gap-3 lg:grid-cols-2" aria-live="polite">
          <Column title="Trước: lời dặn đang dùng" tone="bg-surface-2" r={result.before} />
          <Column title="Sau: thêm lời dặn mới" tone="bg-mint" r={result.after} />
        </div>
      )}
    </div>
  );
}

function Column({ title, tone, r }: { title: string; tone: string; r: TaughtReply }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] p-4", tone)}>
      <p className="font-display text-lg font-bold">{title}</p>
      <div className="mt-2 flex items-end gap-2">
        <May size={36} float={false} />
        <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed [&_p+p]:mt-2">
          <Markdown>{r.reply}</Markdown>
        </div>
      </div>
      <ul className="mt-3 grid gap-1 text-sm">
        {r.checks.map((c) => (
          <li key={c.label}>
            {c.ok ? "✅" : "❌"} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
