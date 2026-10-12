"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteMemory } from "@/app/actions/memory";
import type { ChatAttachment } from "@/lib/chat-events";
import { ArrowUpRight } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Thẻ đi kèm câu trả lời của Mây: đã ghi nhớ, điều bận lòng, bài tập gợi ý. */
export function ChatAttachments({ items }: { items: ChatAttachment[] }) {
  return (
    <div className="ml-10 mt-2 space-y-2">
      {items.map((item, i) => {
        switch (item.type) {
          case "memory":
            return <MemoryNote key={`${item.id}-${i}`} id={item.id} content={item.content} />;
          case "concern":
            return (
              <p key={`${item.id}-${i}`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-lilac px-3 py-1.5 text-xs">
                <span aria-hidden>🗂️</span>
                <span className="min-w-0 truncate">
                  {item.action === "saved" ? "Đã lưu vào điều bận lòng" : "Đã cập nhật điều bận lòng"}: “{item.title}” · {item.intensity}/10
                  {item.status === "better" ? " · đã đỡ hơn" : item.status === "resolved" ? " · đã ổn" : ""}
                </span>
                <Link href="/me/ghi-nho" className="shrink-0 font-semibold underline-offset-2 hover:underline">
                  Xem
                </Link>
              </p>
            );
          case "exercise":
            return (
              <div key={`${item.slug}-${item.exerciseId}-${i}`} className="max-w-md rounded-3xl border-2 border-brand/30 bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bài tập Mây gợi ý</p>
                <p className="mt-1 font-display text-lg font-bold leading-snug tracking-tight">
                  <span aria-hidden>{item.emoji}</span> {item.lessonTitle}
                </p>
                <p className="mt-1 line-clamp-3 text-sm text-muted">{item.prompt}</p>
                <Link
                  href={`/library/${item.slug}#bai-tap-${item.exerciseId}`}
                  data-cursor-label="Làm bài"
                  className={cn(btn.primary, "mt-3")}
                >
                  Làm bài này <ArrowUpRight size={16} />
                </Link>
              </div>
            );
        }
      })}
    </div>
  );
}

/** "📌 Mây đã ghi nhớ: …" kèm nút Bỏ (xóa ngay khỏi bộ nhớ của Mây). */
function MemoryNote({ id, content }: { id: string; content: string }) {
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-butter px-3 py-1.5 text-xs">
      <span aria-hidden>📌</span>
      <span className={cn("min-w-0 truncate", removed && "line-through opacity-60")}>
        {removed ? "Đã bỏ" : "Mây đã ghi nhớ"}: {content}
      </span>
      {!removed && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteMemory(id);
              if (res.ok) setRemoved(true);
            })
          }
          className="shrink-0 font-semibold underline-offset-2 hover:underline disabled:opacity-50"
        >
          Bỏ
        </button>
      )}
    </p>
  );
}
