"use client";

import { useRef, useState, useTransition } from "react";
import {
  addKbDocumentFromUpload,
  addKbText,
  createKbUpload,
  deleteKbDocument,
  saveSettingAction,
  setKbDocumentActive,
  testKbSearch,
  trainKb,
} from "@/app/actions/admin";
import { Field, SaveBar, StatusText, textarea, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { createClient } from "@/lib/supabase/browser";
import type { KbDoc } from "@/lib/admin-data";
import type { KnowledgeHit } from "@/lib/kb";

export function TrainAllButton({ disabled }: { disabled: boolean }) {
  const { pending, status, run } = useAction();
  return (
    <div className="text-center">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          confirm("Dạy lại Mây với toàn bộ tài liệu? Có thể mất vài phút với tài liệu dài.") &&
          run(trainKb, "Đã dạy lại xong.")
        }
        className={btn.primary}
      >
        {pending ? "Đang dạy lại…" : "🔁 Dạy lại tất cả"}
      </button>
      <div className="mt-1">
        <StatusText status={status} />
      </div>
    </div>
  );
}

export function AddDocument() {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function addFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Chọn một file.");
    if (file.size > 50 * 1024 * 1024) return setError("File tối đa 50MB.");
    setError(null);
    startTransition(async () => {
      setStep("Đang tải file lên…");
      const up = await createKbUpload(file.name);
      if (!up.ok) return void (setError(up.error), setStep(null));
      const { error: uploadError } = await createClient().storage.from("kb").uploadToSignedUrl(up.path, up.token, file);
      if (uploadError) return void (setError(`Tải lên thất bại: ${uploadError.message}`), setStep(null));

      setStep("Đang đọc chữ trong file…");
      const doc = await addKbDocumentFromUpload(up.path, title || file.name.replace(/\.[^.]+$/, ""), file.name);
      if (!doc.ok) return void (setError(doc.error), setStep(null));

      setStep("Đang dạy Mây tài liệu mới…");
      const trained = await trainKb(doc.id);
      setStep(trained.ok && !trained.errors.length ? `Xong! Đã chia thành ${trained.chunks} đoạn kiến thức.` : null);
      if (trained.ok && trained.errors.length) setError(trained.errors[0]);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function addText() {
    setError(null);
    startTransition(async () => {
      setStep("Đang lưu…");
      const doc = await addKbText(title, text);
      if (!doc.ok) return void (setError(doc.error), setStep(null));
      setStep("Đang dạy Mây tài liệu mới…");
      const trained = await trainKb(doc.id);
      setStep(trained.ok ? `Xong! Đã chia thành ${trained.chunks} đoạn kiến thức.` : null);
      setTitle("");
      setText("");
    });
  }

  return (
    <div className="space-y-3">
      <div role="tablist" className="inline-flex gap-1 rounded-full bg-surface-2 p-1 text-sm">
        {(["file", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("rounded-full px-4 py-1.5 font-semibold", mode === m ? "bg-surface shadow-sm" : "text-muted")}
          >
            {m === "file" ? "Tải file" : "Dán văn bản"}
          </button>
        ))}
      </div>
      <Field label="Tên tài liệu">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Well-being 7 (Oxford), Bài 1–4" maxLength={160} className={input} />
      </Field>
      {mode === "file" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold" />
          <button type="button" onClick={addFile} disabled={busy} className={btn.primary}>
            Thêm và dạy Mây
          </button>
        </div>
      ) : (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Dán nội dung tài liệu…" className={textarea} />
          <button type="button" onClick={addText} disabled={busy || !text.trim()} className={btn.primary}>
            Thêm và dạy Mây
          </button>
        </>
      )}
      {step && <p role="status" className="text-sm font-semibold text-brand-strong dark:text-brand">{step.startsWith("Xong") ? "✅ " : "⏳ "}{step}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

const STATUS_LABEL: Record<KbDoc["status"], { text: string; cls: string }> = {
  pending: { text: "Chưa dạy", cls: "bg-butter" },
  ready: { text: "Sẵn sàng", cls: "bg-mint" },
  error: { text: "Lỗi", cls: "bg-danger-soft text-danger" },
};

export function DocumentList({ docs }: { docs: KbDoc[] }) {
  if (!docs.length) return <p className="text-sm text-muted">Chưa có tài liệu nào.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {docs.map((d) => (
        <DocRow key={d.id} doc={d} />
      ))}
    </ul>
  );
}

function DocRow({ doc }: { doc: KbDoc }) {
  const { pending, status, run } = useAction();
  const s = STATUS_LABEL[doc.status];
  return (
    <li className={cn("flex flex-wrap items-center gap-3 bg-surface p-4", !doc.active && "opacity-60")}>
      <span className="text-2xl" aria-hidden>
        {doc.filename?.endsWith(".pdf") ? "📕" : "📄"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{doc.title}</p>
        <p className="text-xs text-muted">
          <span className={cn("mr-2 rounded-full px-2 py-0.5 font-semibold text-ink", s.cls)}>{s.text}</span>
          {doc.chars < 1000 ? `${doc.chars} ký tự` : `${Math.round(doc.chars / 1000)}k ký tự`} · {doc.chunk_count} đoạn{!doc.active && " · đang tắt"}
        </p>
        {doc.error && <p className="mt-1 text-xs text-danger">{doc.error}</p>}
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={pending} onClick={() => run(() => trainKb(doc.id), "Đã dạy lại.")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-2">
          {pending ? "…" : "Dạy lại"}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => setKbDocumentActive(doc.id, !doc.active))} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-2">
          {doc.active ? "Tắt" : "Bật"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm(`Xóa tài liệu "${doc.title}"?`) && run(() => deleteKbDocument(doc.id), "Đã xóa.")}
          className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft"
        >
          Xóa
        </button>
      </div>
      {status && !status.ok && <div className="w-full"><StatusText status={status} /></div>}
    </li>
  );
}

export function SearchTester() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <form
        action={() =>
          startTransition(async () => {
            setError(null);
            const res = await testKbSearch(q);
            if (res.ok) setHits(res.hits);
            else setError(res.error);
          })
        }
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: làm sao để bớt lo trước khi thi?" aria-label="Câu hỏi thử" className={cn(input, "flex-1")} />
        <button type="submit" disabled={pending || !q.trim()} className={btn.secondary}>
          {pending ? "Đang tìm…" : "Tìm"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {hits && (
        <ul className="mt-3 space-y-2">
          {hits.length === 0 && <li className="text-sm text-muted">Không tìm thấy đoạn nào đủ gần nghĩa.</li>}
          {hits.map((h, i) => (
            <li key={i} className="rounded-2xl bg-surface-2 p-3 text-sm">
              <p className="mb-1 flex justify-between text-xs font-semibold text-muted">
                <span>{h.title}</span>
                <span>độ gần {Math.round(h.similarity * 100)}%</span>
              </p>
              <p className="line-clamp-4 whitespace-pre-wrap">{h.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function KbConfigForm({ initial }: { initial: { enabled: boolean; matchCount: number; minSimilarity: number } }) {
  const [c, setC] = useState(initial);
  const { pending, status, run } = useAction();
  return (
    <form action={() => run(() => saveSettingAction("kb.config", c))} className="space-y-4">
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} className="size-5 accent-[var(--brand)]" />
        <span className="font-semibold">Cho Mây tra cứu kho kiến thức khi trò chuyện</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Số đoạn tham khảo mỗi lần: ${c.matchCount}`} hint="Nhiều hơn = đủ ý hơn nhưng chậm và tốn hơn.">
          <input type="range" min={1} max={8} value={c.matchCount} onChange={(e) => setC({ ...c, matchCount: Number(e.target.value) })} className="w-full accent-[var(--brand)]" />
        </Field>
        <Field label={`Độ gần tối thiểu: ${Math.round(c.minSimilarity * 100)}%`} hint="Cao hơn = chỉ dùng đoạn thật sát nghĩa.">
          <input type="range" min={0.1} max={0.9} step={0.05} value={c.minSimilarity} onChange={(e) => setC({ ...c, minSimilarity: Number(e.target.value) })} className="w-full accent-[var(--brand)]" />
        </Field>
      </div>
      <SaveBar pending={pending} status={status} settingKey="kb.config" />
    </form>
  );
}
