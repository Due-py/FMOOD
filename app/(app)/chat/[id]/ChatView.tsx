"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import { setFeedback } from "@/app/actions/chat";
import { setChatLength } from "@/app/actions/memory";
import { CHAT_LENGTHS, type ChatAttachment, type ChatEvent, type ChatLength } from "@/lib/chat-events";
import { ChatAttachments } from "./ChatAttachments";
import { FEEDBACK_REASONS, REASON_KEYS, type FeedbackReason } from "@/lib/feedback";
import { May } from "@/components/mascot/May";
import { ArrowLeft, SendIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { DeleteConversationButton } from "../DeleteConversationButton";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** câu trả lời soạn sẵn khi có dấu hiệu nguy hiểm */
  crisis?: boolean;
  /** hiện thẻ hỗ trợ ngay sau tin nhắn này */
  support?: boolean;
  error?: boolean;
  /** id thật trong cơ sở dữ liệu (để gắn phản hồi 👍/👎) */
  dbId?: string;
  feedback?: { rating: 1 | -1; reason: FeedbackReason | null } | null;
  /** gợi ý trả lời nhanh */
  suggestions?: string[];
  /** thẻ đi kèm: Mây vừa ghi nhớ / lưu điều bận lòng / gợi ý bài tập */
  attachments?: ChatAttachment[];
};

export function ChatView({
  conversationId: initialId,
  initialMessages,
  nickname,
  supportCards,
  starters,
  initialDraft = "",
  chatLength: initialLength,
  autoOpen = false,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
  nickname: string;
  supportCards: { urgent: ReactNode; gentle: ReactNode };
  /** câu gợi ý mở đầu (admin sửa trong Câu hỏi & gợi ý) */
  starters: string[];
  /** câu soạn sẵn trong ô nhập (ví dụ khi mở từ bài tập) */
  initialDraft?: string;
  /** độ dài câu trả lời học sinh đã chọn */
  chatLength: ChatLength;
  /** Mây chủ động mở lời (vừa check-in / có điều bận lòng đến hạn hỏi thăm) */
  autoOpen?: boolean;
}) {
  const [conversationId, setConversationId] = useState(initialId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(autoOpen);
  const [length, setLength] = useState<ChatLength>(initialLength);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const opened = useRef(false);

  // Mây mở lời trước (chỉ một lần, kể cả khi React chạy effect hai lần lúc phát triển)
  useEffect(() => {
    if (!autoOpen || opened.current) return;
    opened.current = true;
    void stream({ opener: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  function patchLast(update: (m: ChatMessage) => ChatMessage) {
    setMessages((cur) => {
      const copy = [...cur];
      copy[copy.length - 1] = update(copy[copy.length - 1]);
      return copy;
    });
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    setDraft("");
    setMessages((cur) => [...cur, { id: `u-${Date.now()}`, role: "user", content: message }]);
    await stream({ conversationId, message });
  }

  /** Gửi yêu cầu tới Mây và hiện câu trả lời dần dần (tin nhắn thường hoặc lời mở đầu). */
  async function stream(body: { conversationId: string | null; message: string } | { opener: true }) {
    setSending(true);
    setWaiting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // không còn gì để Mây mở lời (ví dụ đã mở ở tab khác): để trống như bình thường
      if ("opener" in body && res.status === 409) return;
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Chưa gửi được tin nhắn. Thử lại nhé.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let started = false;
      const startAssistant = (content = "", crisis = false) => {
        started = true;
        setWaiting(false);
        setMessages((cur) => [...cur, { id: `a-${Date.now()}`, role: "assistant", content, crisis }]);
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatEvent;
          switch (event.type) {
            case "meta":
              if (!conversationId) {
                setConversationId(event.conversationId);
                // đổi URL mà không tải lại trang để giữ nguyên cuộc trò chuyện đang hiện
                window.history.replaceState(null, "", `/chat/${event.conversationId}`);
              }
              break;
            case "delta":
              if (!started) startAssistant(event.text);
              else patchLast((m) => ({ ...m, content: m.content + event.text }));
              break;
            case "crisis":
              startAssistant(event.text, true);
              break;
            case "support":
              patchLast((m) => ({ ...m, support: true }));
              break;
            case "saved":
              patchLast((m) => ({ ...m, dbId: event.messageId }));
              break;
            case "suggestions":
              patchLast((m) => ({ ...m, suggestions: event.items }));
              break;
            case "attachment":
              // Mây có thể dùng công cụ trước khi viết chữ nào
              if (!started) startAssistant();
              patchLast((m) => ({ ...m, attachments: [...(m.attachments ?? []), event.item] }));
              break;
            case "error":
              if (!started) startAssistant(event.message);
              patchLast((m) => ({ ...m, error: true, content: m.content || event.message }));
              break;
          }
        }
      }
    } catch (error) {
      setMessages((cur) => [
        ...cur,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: error instanceof Error ? error.message : "Có lỗi xảy ra. Thử lại nhé.",
          error: true,
        },
      ]);
    } finally {
      setWaiting(false);
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col md:min-h-[calc(100dvh-5rem)]">
      <header className="sticky top-0 z-10 md:top-20 -mx-4 mb-2 flex items-center gap-2 bg-bg/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Link href="/chat" className={cn(btn.ghost, "-ml-3 px-3")} aria-label="Danh sách trò chuyện">
          <ArrowLeft size={20} />
        </Link>
        <May size={40} float={false} mood={waiting ? "calm" : "happy"} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight tracking-tight">Mây</p>
          <p className="text-xs text-muted">{waiting ? "đang nghĩ…" : "bạn đồng hành AI"}</p>
        </div>
        <div role="radiogroup" aria-label="Độ dài câu trả lời của Mây" className="flex gap-0.5 rounded-full bg-surface-2 p-0.5">
          {CHAT_LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={length === l.value}
              title={`Mây trả lời ${l.label.toLowerCase()}`}
              onClick={() => {
                setLength(l.value);
                void setChatLength(l.value);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition sm:px-3",
                length === l.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        {conversationId && <DeleteConversationButton id={conversationId} goBack />}
      </header>

      <div className="flex-1 space-y-3 pb-4">
        {messages.length === 0 && !waiting && (
          <div className="flex flex-col items-center py-6 text-center">
            <May size={120} mood="happy" />
            <p className="mt-4 max-w-sm text-lg font-medium">
              Chào {nickname}! Hôm nay có chuyện gì muốn kể Mây nghe không?
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition hover:border-brand hover:bg-brand-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          return (
            <div key={m.id}>
              {(m.content || !m.attachments?.length) && <Bubble message={m} />}
              {!!m.attachments?.length && <ChatAttachments items={m.attachments} />}
              {m.role === "assistant" && m.dbId && !m.crisis && !m.error && (
                <FeedbackBar
                  messageId={m.dbId}
                  initial={m.feedback ?? null}
                  onChange={(feedback) =>
                    setMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, feedback } : x)))
                  }
                />
              )}
              {m.support && (
                <div className="mt-3">{m.crisis ? supportCards.urgent : supportCards.gentle}</div>
              )}
              {isLast && !sending && m.role === "assistant" && !!m.suggestions?.length && (
                <div className="mt-3 flex flex-wrap justify-end gap-2" aria-label="Gợi ý trả lời">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="animate-[fadein_.3s_ease] rounded-full border border-brand/40 bg-brand-soft px-4 py-2 text-sm font-medium text-brand-strong transition hover:border-brand hover:bg-brand hover:text-brand-ink dark:text-brand"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {waiting && (
          <div className="flex items-end gap-2">
            <May size={30} float={false} mood="calm" />
            <div className="flex gap-1 rounded-3xl rounded-bl-md bg-surface px-4 py-3.5" aria-label="Mây đang trả lời">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="typing-dot size-2 rounded-full bg-muted"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex items-end gap-2 rounded-[1.75rem] border border-line bg-surface p-2 shadow-lg md:bottom-4"
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Nhắn cho Mây…"
          aria-label="Tin nhắn"
          className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted/70"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Gửi"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink transition hover:bg-brand-strong disabled:opacity-40"
        >
          <SendIcon size={20} />
        </button>
      </form>
    </div>
  );
}

type Feedback = { rating: 1 | -1; reason: FeedbackReason | null } | null;

/** 👍 / 👎 dưới câu trả lời của Mây. 👎 thì hỏi nhanh lý do để Mây điều chỉnh. */
function FeedbackBar({
  messageId,
  initial,
  onChange,
}: {
  messageId: string;
  initial: Feedback;
  onChange: (f: Feedback) => void;
}) {
  const [fb, setFb] = useState<Feedback>(initial);
  const [askReason, setAskReason] = useState(false);
  const [thanks, setThanks] = useState(false);

  function save(next: Feedback) {
    setFb(next);
    onChange(next);
    void setFeedback(messageId, next?.rating ?? null, next?.reason ?? null);
  }

  return (
    <div className="ml-10 mt-1">
      <div className="flex items-center gap-1">
        <ThumbButton
          label="Câu trả lời hay"
          active={fb?.rating === 1}
          onClick={() => {
            setAskReason(false);
            const next = fb?.rating === 1 ? null : { rating: 1 as const, reason: null };
            save(next);
            setThanks(Boolean(next));
          }}
        >
          👍
        </ThumbButton>
        <ThumbButton
          label="Câu trả lời chưa tốt"
          active={fb?.rating === -1}
          onClick={() => {
            if (fb?.rating === -1) {
              save(null);
              setAskReason(false);
              setThanks(false);
            } else {
              save({ rating: -1, reason: null });
              setAskReason(true);
              setThanks(false);
            }
          }}
        >
          👎
        </ThumbButton>
        {thanks && !askReason && (
          <span className="animate-[fadein_.3s_ease] text-xs text-muted">Cảm ơn bạn! Mây sẽ ghi nhớ.</span>
        )}
      </div>
      {askReason && (
        <div className="mt-1.5 animate-[fadein_.3s_ease] rounded-2xl bg-surface-2 p-3">
          <p className="mb-2 text-xs font-semibold text-muted">Điều gì chưa ổn? (không bắt buộc)</p>
          <div className="flex flex-wrap gap-1.5">
            {REASON_KEYS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={fb?.reason === r}
                onClick={() => {
                  save({ rating: -1, reason: r });
                  setAskReason(false);
                  setThanks(true);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  fb?.reason === r ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-brand-soft",
                )}
              >
                {FEEDBACK_REASONS[r].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThumbButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-sm transition",
        active ? "bg-brand-soft ring-1 ring-brand" : "opacity-50 grayscale hover:bg-surface-2 hover:opacity-100 hover:grayscale-0",
      )}
    >
      {children}
    </button>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-brand px-4 py-2.5 text-brand-ink">
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <May size={30} float={false} mood={message.crisis ? "worried" : "happy"} />
      <div
        className={cn(
          "max-w-[85%] rounded-3xl rounded-bl-md px-4 py-2.5 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2 [&_ul+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1",
          message.crisis
            ? "border border-danger/30 bg-danger-soft"
            : message.error
              ? "bg-surface-2 text-muted"
              : "bg-surface",
        )}
      >
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}
