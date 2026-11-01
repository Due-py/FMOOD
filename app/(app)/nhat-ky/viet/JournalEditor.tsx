"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { deleteJournalEntry, saveJournalEntry, suggestJournalNext, type SaveJournalResult } from "@/app/actions/journal";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { ArrowLeft } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { JournalEntry } from "@/lib/journal";
import { BODY_MAX, JOURNAL_KINDS, KIND_LABEL, startBody, type JournalKind, type JournalPrompt } from "@/lib/journal-shared";
import { subskillHref } from "@/lib/sel/casel";
import { SKILLS } from "@/lib/skills";

type Tab = "tat-ca" | JournalKind;
/** "free": viết tự do, không dùng mẫu */
type Picked = JournalPrompt | "free" | null;

/**
 * Viết một trang nhật ký: chọn mẫu (gợi ý theo check-in hôm nay; lọc Câu mở đầu / Câu hỏi nổi bật) hoặc viết tự do,
 * "Gợi ý mình viết tiếp" (ý 4), lưu. Sau khi lưu: thẻ hỗ trợ khi đáng lo / khẩn cấp (ý 1), mời kể với trợ lý khi trang
 * kể chuyện khó (ý 2), bài luyện hợp với chuyện vừa viết (ý 5). Sửa / xóa trang đã viết.
 */
export function JournalEditor({
  prompts,
  suggested,
  entry,
  initialPromptId,
  supportCards,
}: {
  prompts: JournalPrompt[];
  suggested: string[];
  entry: JournalEntry | null;
  initialPromptId: string | null;
  supportCards: { urgent: ReactNode; gentle: ReactNode; gentleNotified: ReactNode };
}) {
  const { name } = useAssistant();
  const router = useRouter();
  const initial = initialPromptId ? (prompts.find((p) => p.id === initialPromptId) ?? null) : null;
  const [picked, setPicked] = useState<Picked>(entry ? "free" : initial);
  const [body, setBody] = useState(entry?.body ?? (initial ? startBody(initial) : ""));
  const [tab, setTab] = useState<Tab>("tat-ca");
  const [next, setNext] = useState<{ question: string; careful: boolean } | null>(null);
  const [result, setResult] = useState<Extract<SaveJournalResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const promptText = entry ? entry.prompt_text : picked && picked !== "free" ? picked.text : "";

  function pick(p: Picked) {
    setPicked(p);
    setBody(p && p !== "free" ? startBody(p) : "");
    setNext(null);
    setError(null);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveJournalEntry({ id: entry?.id ?? null, promptId: picked && picked !== "free" ? picked.id : null, body });
      if (res.ok) setResult(res);
      else setError(res.error);
    });
  }

  const back = (
    <Link href="/nhat-ky" className={cn(btn.ghost, "-ml-3 mb-2")}>
      <ArrowLeft size={18} /> Nhật ký
    </Link>
  );

  // ── sau khi lưu ──
  if (result) {
    return (
      <div className="animate-[fadein_.35s_ease] space-y-4">
        {back}
        {result.crisis ? (
          <>
            <p role="alert" className="rounded-[var(--radius-card)] bg-danger-soft p-5 whitespace-pre-line">
              {result.crisis.text}
            </p>
            {supportCards.urgent}
          </>
        ) : result.concern ? (
          <>
            <p className="rounded-[var(--radius-card)] bg-surface-2 p-5">Cảm ơn bạn đã viết ra. Trang này đã được lưu. Bạn không phải tự mang chuyện này một mình đâu.</p>
            {result.concern.notified ? supportCards.gentleNotified : supportCards.gentle}
          </>
        ) : (
          <p className="rounded-[var(--radius-card)] bg-mint p-5 font-semibold">Đã lưu vào nhật ký của bạn. ✨</p>
        )}

        {result.talk && (
          <Link href={`/chat/new?tu=nhat-ky&nk=${result.id}`} className="block rounded-[var(--radius-card)] bg-sky p-5 transition hover:-translate-y-0.5">
            <span className="text-2xl" aria-hidden>
              💬
            </span>
            <p className="mt-3 font-display text-lg font-bold tracking-tight">Muốn kể với {name} về chuyện này không?</p>
            <p className="text-sm text-muted">{name} sẽ đọc trang nhật ký này để hiểu chuyện, bạn không cần kể lại từ đầu. Không muốn thì bỏ qua nhé.</p>
          </Link>
        )}

        {result.skill && (
          <Link href={subskillHref(result.skill)} className="block rounded-[var(--radius-card)] border-2 border-dashed border-brand/40 p-5 transition hover:border-brand">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Luyện kỹ năng hợp với chuyện này</p>
            <p className="mt-1 font-display text-lg font-bold tracking-tight">
              {SKILLS[result.skill].emoji} {SKILLS[result.skill].name}
            </p>
            <p className="text-sm text-muted">{SKILLS[result.skill].tagline}</p>
          </Link>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/nhat-ky" className={btn.secondary}>
            Về nhật ký
          </Link>
          <Link href="/nhat-ky/viet" className={btn.secondary}>
            Viết trang khác
          </Link>
        </div>
      </div>
    );
  }

  // ── chọn mẫu ──
  if (!picked) {
    const sugg = suggested.map((id) => prompts.find((p) => p.id === id)).filter((p): p is JournalPrompt => Boolean(p));
    const shown = tab === "tat-ca" ? prompts : prompts.filter((p) => p.kind === tab);
    return (
      <div>
        {back}
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Bắt đầu từ đâu?</h1>
        <p className="mt-1 text-muted">Chọn một câu để mở đầu, hoặc viết tự do.</p>

        {sugg.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-muted">Gợi ý cho hôm nay</h2>
            <div className="flex flex-wrap gap-2">
              {sugg.map((p) => (
                <button key={p.id} type="button" onClick={() => pick(p)} className="rounded-full border-2 border-brand/40 bg-brand-soft px-4 py-2 text-left text-sm font-semibold transition hover:border-brand">
                  {p.emoji} {p.text}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Loại mẫu câu">
          {(["tat-ca", ...JOURNAL_KINDS] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold transition", tab === t ? "border-transparent bg-butter" : "border-line bg-surface hover:bg-surface-2")}
            >
              {t === "tat-ca" ? "Tất cả" : KIND_LABEL[t]}
            </button>
          ))}
        </div>

        <ul className="mt-3 space-y-2">
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:bg-surface-2">
                <span className="text-2xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{p.text}</span>
                  <span className="text-xs text-muted">{KIND_LABEL[p.kind]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => pick("free")} className="mt-3 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-3 text-left transition hover:bg-surface-2">
          <span className="text-2xl" aria-hidden>
            📝
          </span>
          <span className="font-semibold">Viết tự do, không dùng mẫu</span>
        </button>
      </div>
    );
  }

  // ── viết ──
  return (
    <div>
      {back}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {entry ? "Sửa trang nhật ký" : picked === "free" ? "Viết tự do" : `${picked.emoji} ${picked.text}`}
        </h1>
        {!entry && (
          <button type="button" onClick={() => pick(null)} className={btn.ghost}>
            Đổi mẫu
          </button>
        )}
      </div>
      {entry?.prompt_text && <p className="mt-1 text-sm font-semibold text-brand-strong dark:text-brand">{entry.prompt_text}</p>}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={BODY_MAX}
        rows={10}
        autoFocus
        aria-label="Nội dung trang nhật ký"
        placeholder="Viết bất cứ điều gì bạn muốn…"
        className={cn(input, "mt-4 min-h-56 resize-y leading-relaxed")}
      />
      <p className="mt-1 text-right text-xs text-muted">
        {body.length}/{BODY_MAX}
      </p>

      {next &&
        (next.careful ? (
          <p className="mt-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm">
            Nghe như bạn đang có chuyện rất nặng lòng. Nếu cần người thật ngay, bấm <strong>“Cần giúp”</strong> ở góc trên nhé. Bạn vẫn có thể lưu trang này.
          </p>
        ) : (
          <p className="mt-2 rounded-2xl rounded-bl-md bg-sky px-4 py-3 text-sm">
            <strong>{name}:</strong> {next.question}
          </p>
        ))}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => start(async () => setNext(await suggestJournalNext(promptText, body)))} className={btn.secondary}>
          💭 Gợi ý mình viết tiếp
        </button>
        <button type="button" disabled={pending || !body.trim()} onClick={save} className={cn(btn.primary, "flex-1")}>
          {pending ? "Đang lưu…" : "Lưu trang này"}
        </button>
      </div>

      {entry && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirm("Xóa trang nhật ký này? Không lấy lại được.") &&
            start(async () => {
              const res = await deleteJournalEntry(entry.id);
              if (res.ok) router.push("/nhat-ky");
              else setError(res.error);
            })
          }
          className="mt-6 text-sm font-semibold text-danger hover:underline"
        >
          Xóa trang này
        </button>
      )}
    </div>
  );
}
