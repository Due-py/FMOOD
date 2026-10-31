"use client";

import { useRef, useState } from "react";
import Markdown from "react-markdown";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { TraceEvent, TraceStep } from "@/lib/demo/trace";

const EXAMPLES = [
  "Mai kiểm tra Toán mà mình chưa ôn kịp, lo quá",
  "Hôm nay mình với bạn thân giận nhau",
  "Bài kiểm tra khó muốn xỉu luôn á 😵",
  "mk ko bik nói vs ai chuyện ở nhà",
];

type Info = { title: string; what: string; group: "safety" | "understand" | "answer" | "after" };
const STEPS: Record<TraceStep, Info> = {
  normalize: { title: "Chuẩn hóa chữ", what: "Bỏ dấu, mở viết tắt (mk → mình, ko → không) để không bỏ sót khi bạn gõ tắt.", group: "safety" },
  keyword: { title: "Bộ lọc từ khóa", what: "Chạy ngay trên máy chủ, không cần mạng. Câu rõ ràng là nguy hiểm thì báo ngay.", group: "safety" },
  classifier: { title: "AI phân loại an toàn", what: "Một AI riêng chỉ làm một việc: chấm mức nguy hiểm, có xét câu nói quá.", group: "safety" },
  decision: { title: "Quyết định", what: "Lấy mức CAO nhất của các lớp. Không chắc thì coi là cần để ý.", group: "safety" },
  crisis: { title: "Câu trả lời soạn sẵn", what: "Khẩn cấp thì không để AI tự trả lời.", group: "answer" },
  topic: { title: "Đoán chủ đề", what: "So với cụm từ thầy cô đặt cho từng chủ đề (không gọi AI).", group: "understand" },
  scenarios: { title: "Hướng dẫn theo chủ đề", what: "Lời dặn thầy cô viết sẵn cho chủ đề này.", group: "understand" },
  knowledge: { title: "Tìm trong tài liệu", what: "Tìm đoạn tài liệu đã duyệt gần nghĩa nhất.", group: "understand" },
  prompt: { title: "Ghép lời dặn cho AI", what: "Tính cách + lời dặn + luật cố định + chủ đề + tài liệu.", group: "answer" },
  reply: { title: "Trợ lý trả lời", what: "AI viết câu trả lời theo lời dặn vừa ghép.", group: "answer" },
  checks: { title: "Máy chấm câu trả lời", what: "Cùng máy chấm của bộ thử câu trả lời.", group: "after" },
  suggestions: { title: "Gợi ý trả lời nhanh", what: "Vài câu ngắn để bạn bấm nhắn tiếp.", group: "after" },
  privacy: { title: "Lưu gì, ai thấy gì", what: "Trong trình diễn: không lưu gì.", group: "after" },
};
const GROUP_TONE = { safety: "bg-peach", understand: "bg-sky", answer: "bg-mint", after: "bg-lilac" };
const GROUP_LABEL = { safety: "An toàn trước", understand: "Hiểu bạn đang nói gì", answer: "Trả lời", after: "Kiểm tra lại" };
const LEVEL_TONE: Record<string, string> = { none: "bg-mint", concern: "bg-butter", urgent: "bg-danger text-white" };

type State = { status: "running" | "done"; ms?: number; data?: Record<string, unknown> };

export function TracePlayground() {
  const [message, setMessage] = useState(EXAMPLES[0]);
  const [steps, setSteps] = useState<[TraceStep, State][]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const started = useRef(0);
  const [total, setTotal] = useState<number | null>(null);

  async function run(text = message) {
    setMessage(text);
    setSteps([]);
    setReply("");
    setError(null);
    setTotal(null);
    setRunning(true);
    started.current = performance.now();
    try {
      const res = await fetch("/api/demo/trace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      if (!res.ok || !res.body) {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Chưa chạy được.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as TraceEvent;
          if (ev.type === "start") setSteps((s) => (s.some(([k]) => k === ev.step) ? s : [...s, [ev.step, { status: "running" }]]));
          else if (ev.type === "done") setSteps((s) => s.map(([k, v]) => (k === ev.step ? [k, { status: "done", ms: ev.ms, data: ev.data }] : [k, v])));
          else if (ev.type === "delta") setReply((r) => r + ev.text);
          else if (ev.type === "error") setError(ev.message);
        }
      }
    } catch {
      setError("Mất kết nối giữa chừng. Thử lại nhé.");
    } finally {
      setRunning(false);
      setTotal(Math.round(performance.now() - started.current));
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) void run();
        }}
        className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.4)] ring-1 ring-line"
      >
        <label htmlFor="trace-input" className="font-display text-lg font-bold">
          Gõ một câu như một bạn học sinh
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="trace-input" value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} className={cn(input, "flex-1 text-lg")} />
          <button type="submit" disabled={running || !message.trim()} className={cn(btn.primary, "text-lg")}>
            {running ? "Trợ lý đang nghĩ…" : "Xem trợ lý nghĩ"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" disabled={running} onClick={() => void run(x)} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-sky">
              {x}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Không lưu tin nhắn, không tạo cảnh báo, không gửi email. Đừng gõ câu nguy hiểm thật: phần nguy hiểm xem ở trang sau (giả lập).</p>
      </form>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {steps.length > 0 && (
        <ol className="relative space-y-3" aria-live="polite">
          {steps.map(([step, st], i) => (
            <StepCard key={step} n={i + 1} step={step} state={st} reply={reply} />
          ))}
        </ol>
      )}
      {total !== null && !running && steps.length > 0 && (
        <p className="text-center text-sm text-muted">
          Cả {steps.length} bước mất {(total / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây. Khi trò chuyện thật, kiểm tra an toàn và soạn câu
          trả lời chạy CÙNG LÚC, nhưng câu trả lời bị giữ lại tới khi biết là an toàn.
        </p>
      )}
    </div>
  );
}

function StepCard({ n, step, state, reply }: { n: number; step: TraceStep; state: State; reply: string }) {
  const info = STEPS[step];
  const d = state.data ?? {};
  return (
    <li className={cn("rounded-[var(--radius-card)] p-4 transition-all duration-500 sm:p-5", state.status === "running" ? "bg-surface ring-2 ring-ink/10" : GROUP_TONE[info.group])}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full font-display font-extrabold",
            state.status === "running" ? "animate-pulse bg-ink/10" : "bg-surface/80",
          )}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-display text-lg font-bold leading-tight">{info.title}</p>
            <p className="text-xs font-semibold text-muted">
              {GROUP_LABEL[info.group]}
              {state.status === "done" && state.ms ? ` · ${state.ms.toLocaleString("vi-VN")} ms` : ""}
              {state.status === "running" ? " · đang chạy…" : ""}
            </p>
          </div>
          <p className="text-sm text-muted">{info.what}</p>
          {state.status === "done" && <StepBody step={step} d={d} reply={reply} />}
          {step === "reply" && state.status === "running" && reply && <ReplyBubble text={reply} />}
        </div>
      </div>
    </li>
  );
}

function Level({ level, label }: { level: string; label: string }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-bold", LEVEL_TONE[level])}>{label}</span>;
}

function ReplyBubble({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-end gap-2">
      <CharacterAvatar size={40} float={false} />
      <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed [&_p+p]:mt-2">
        <Markdown>{text}</Markdown>
      </div>
    </div>
  );
}

function StepBody({ step, d, reply }: { step: TraceStep; d: Record<string, unknown>; reply: string }) {
  const box = "mt-2 rounded-2xl bg-surface/80 px-3 py-2 text-sm";
  switch (step) {
    case "normalize":
      return <p className={cn(box, "font-mono")}>{String(d.text)}</p>;
    case "keyword":
    case "decision":
      return (
        <div className={box}>
          <Level level={String(d.level)} label={String(d.label)} />
          {(d.reasons as string[]).length > 0 && <span className="ml-2">{(d.reasons as string[]).join(" · ")}</span>}
          {step === "keyword" && d.level === "none" && <span className="ml-2 text-muted">Không khớp cụm từ nguy hiểm nào.</span>}
          {step === "decision" && d.level === "none" && <span className="ml-2">Trợ lý trả lời bình thường, không báo ai.</span>}
          {step === "decision" && d.level === "concern" && <span className="ml-2">Trợ lý trả lời nhẹ nhàng hơn, hiện số hỗ trợ, báo thầy cô (cần để ý).</span>}
          {step === "decision" && d.level === "urgent" && <span className="ml-2">Dùng câu soạn sẵn và báo thầy cô NGAY.</span>}
        </div>
      );
    case "classifier":
      if (d.skipped) return <p className={box}>Bỏ qua: từ khóa đã rõ là khẩn cấp, không chờ AI.</p>;
      if (d.error) return <p className={box}>AI không trả lời → tạm coi là cần để ý (không bao giờ coi là ổn).</p>;
      return (
        <div className={box}>
          <Level level={String(d.level)} label={String(d.label)} />
          {(d.reasons as string[]).length > 0 && <span className="ml-2">{(d.reasons as string[]).join(" · ")}</span>}
        </div>
      );
    case "crisis":
      return <ReplyBubble text={String(d.text)} />;
    case "topic":
      return d.none ? (
        <p className={box}>Không đoán chủ đề nào (trợ lý sẽ không hỏi “Có phải bạn đang lo chuyện…?”).</p>
      ) : (
        <p className={box}>
          <strong>
            {String(d.emoji)} {String(d.label)}
          </strong>{" "}
          · khớp: {(d.triggers as string[]).map((t) => `“${t}”`).join(", ")}
          <span className="block text-muted">Trợ lý sẽ hỏi: “Có phải bạn đang lo chuyện {String(d.label).toLowerCase()}?”</span>
        </p>
      );
    case "scenarios":
      return <p className={box}>{(d.titles as string[]).length ? (d.titles as string[]).join(", ") : "Không có hướng dẫn nào khớp."}</p>;
    case "knowledge": {
      const hits = d.hits as { title: string; similarity: number; excerpt: string }[];
      return hits.length ? (
        <ul className={cn(box, "space-y-1")}>
          {hits.map((h, i) => (
            <li key={i}>
              <strong>{h.title}</strong> <span className="text-muted">· giống {h.similarity}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={box}>Không có đoạn tài liệu nào đủ gần.</p>
      );
    }
    case "prompt":
      return (
        <div className={box}>
          <ul className="space-y-0.5">
            {(d.parts as { name: string; detail: string }[]).map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong> <span className="text-muted">· {p.detail}</span>
              </li>
            ))}
          </ul>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold">Xem toàn bộ lời dặn ({Number(d.chars).toLocaleString("vi-VN")} ký tự)</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">{String(d.full)}</pre>
          </details>
        </div>
      );
    case "reply":
      return <ReplyBubble text={reply || String(d.text)} />;
    case "checks":
      return (
        <ul className={cn(box, "grid gap-1 sm:grid-cols-2")}>
          {(d.checks as { label: string; ok: boolean }[]).map((c) => (
            <li key={c.label}>
              {c.ok ? "✅" : "❌"} {c.label}
            </li>
          ))}
        </ul>
      );
    case "suggestions":
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {(d.items as string[]).map((x) => (
            <span key={x} className="rounded-full bg-surface px-3 py-1 text-sm">
              {x}
            </span>
          ))}
        </div>
      );
    case "privacy":
      return (
        <ul className={cn(box, "space-y-1")}>
          <li>💬 Khi dùng thật: tin nhắn lưu riêng cho bạn ấy. Thầy cô và admin không đọc được.</li>
          {d.level === "none" ? (
            <li>🔕 Không có dấu hiệu gì: không ai được báo.</li>
          ) : (
            <li>🛟 Có dấu hiệu: tư vấn viên đọc được ĐÚNG đoạn này để xử lý; GVCN chỉ biết là có cảnh báo; email không kèm nội dung.</li>
          )}
          <li>🎬 Trong trình diễn: không lưu gì cả.</li>
        </ul>
      );
    default:
      return null;
  }
}
