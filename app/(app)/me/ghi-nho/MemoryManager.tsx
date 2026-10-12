"use client";

import { useState, useTransition } from "react";
import { deleteAllMemories, deleteConcern, deleteMemory, updateConcern, updateMemory } from "@/app/actions/memory";
import { CONCERN_STATUS_LABEL, MEMORY_KIND_LABEL, type Concern, type Memory } from "@/lib/may-memory-shared";
import { input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

function SmallButton({ danger, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
        danger ? "border-danger/30 text-danger hover:bg-danger-soft" : "border-line hover:bg-surface-2",
        props.className,
      )}
    />
  );
}

export function MemoryList({ memories: initial }: { memories: Memory[] }) {
  const [memories, setMemories] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (memories.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        Chưa có gì. Khi trò chuyện, bạn cứ nói kiểu “gọi mình là … nhé” hay “mình thích …”, Mây sẽ nhớ.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {memories.map((m) => (
          <MemoryItem
            key={m.id}
            memory={m}
            onSaved={(content) => setMemories((cur) => cur.map((x) => (x.id === m.id ? { ...x, content } : x)))}
            onDeleted={() => setMemories((cur) => cur.filter((x) => x.id !== m.id))}
          />
        ))}
      </ul>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          confirm("Xóa hết những điều Mây đang nhớ về bạn?") &&
          startTransition(async () => {
            const res = await deleteAllMemories();
            if (res.ok) setMemories([]);
          })
        }
        className="mt-3 text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Xóa hết
      </button>
    </div>
  );
}

function MemoryItem({
  memory,
  onSaved,
  onDeleted,
}: {
  memory: Memory;
  onSaved: (content: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(memory.content);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl bg-butter p-3">
      <p className="text-xs font-semibold text-muted">{MEMORY_KIND_LABEL[memory.kind]}</p>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await updateMemory(memory.id, text);
              if (!res.ok) return setError(res.error);
              setError(null);
              setEditing(false);
              onSaved(text.trim());
            });
          }}
          className="mt-1.5 flex flex-wrap gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            autoFocus
            aria-label="Nội dung ghi nhớ"
            className={cn(input, "min-w-0 flex-1 py-2")}
          />
          <SmallButton type="submit" disabled={pending}>
            Lưu
          </SmallButton>
          <SmallButton
            onClick={() => {
              setEditing(false);
              setText(memory.content);
              setError(null);
            }}
          >
            Hủy
          </SmallButton>
        </form>
      ) : (
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 font-medium">{memory.content}</p>
          <SmallButton onClick={() => setEditing(true)}>Sửa</SmallButton>
          <SmallButton
            danger
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteMemory(memory.id);
                if (res.ok) onDeleted();
                else setError(res.error);
              })
            }
          >
            Xóa
          </SmallButton>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

export function ConcernList({ concerns: initial }: { concerns: Concern[] }) {
  const [concerns, setConcerns] = useState(initial);

  if (concerns.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        Chưa có điều bận lòng nào. Khi bạn kể chuyện buồn, Mây sẽ hỏi bạn có muốn lưu lại không.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {concerns.map((c) => (
        <ConcernItem
          key={c.id}
          concern={c}
          onChange={(next) => setConcerns((cur) => (next ? cur.map((x) => (x.id === c.id ? next : x)) : cur.filter((x) => x.id !== c.id)))}
        />
      ))}
    </ul>
  );
}

function ConcernItem({ concern: c, onChange }: { concern: Concern; onChange: (c: Concern | null) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function patch(p: { intensity?: number; status?: Concern["status"] }) {
    startTransition(async () => {
      const res = await updateConcern(c.id, p);
      if (!res.ok) return setError(res.error);
      setError(null);
      onChange({ ...c, ...p });
    });
  }

  return (
    <li className={cn("rounded-2xl p-3", c.status === "resolved" ? "bg-surface-2" : "bg-lilac")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className={cn("min-w-0 flex-1 font-medium", c.status === "resolved" && "text-muted line-through")}>{c.title}</p>
        <span className="text-xs font-semibold text-muted">
          {CONCERN_STATUS_LABEL[c.status]} · lưu {DATE.format(new Date(c.created_at))}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold">
          Mức bận lòng
          <select
            value={c.intensity}
            disabled={pending}
            onChange={(e) => patch({ intensity: Number(e.target.value) })}
            className="rounded-full border border-line bg-surface px-2 py-1 text-xs"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}/10
              </option>
            ))}
          </select>
        </label>
        <span className="flex-1" />
        {c.status !== "resolved" ? (
          <SmallButton disabled={pending} onClick={() => patch({ status: "resolved" })}>
            Mình ổn rồi
          </SmallButton>
        ) : (
          <SmallButton disabled={pending} onClick={() => patch({ status: "open" })}>
            Vẫn còn bận lòng
          </SmallButton>
        )}
        <SmallButton
          danger
          disabled={pending}
          onClick={() =>
            confirm(`Xóa “${c.title}” khỏi danh sách?`) &&
            startTransition(async () => {
              const res = await deleteConcern(c.id);
              if (res.ok) onChange(null);
              else setError(res.error);
            })
          }
        >
          Xóa
        </SmallButton>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
