"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import { setFeedback } from "@/app/actions/chat";
import type { ChatEvent } from "@/lib/chat-events";
import { FEEDBACK_REASONS, REASON_KEYS, type FeedbackReason } from "@/lib/feedback";
import { May } from "@/components/mascot/May";
import { ArrowLeft, SendIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { HelpButton } from "@/components/HelpButton";
import type { ChatLoop } from "@/lib/loop-content";
import { DeleteConversationButton } from "../DeleteConversationButton";
import { alreadyAsked, FillBlankPanel, TopicGuessCard, type TopicGuess } from "./ChatLoopParts";

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
  /** Mây đoán học sinh đang lo chuyện gì (hiện thẻ hỏi lại dưới câu trả lời) */
  guess?: TopicGuess;
};

export function ChatView({
  conversationId: initialId,
  initialMessages,
  nickname,
  supportCards,
  starters,
  initialDraft = "",
  loop = null,
  worry = null,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
  nickname: string;
  supportCards: { urgent: ReactNode; gentle: ReactNode };
  /** câu gợi ý mở đầu (admin sửa trong Câu hỏi & gợi ý) */
  starters: string[];
  /** câu soạn sẵn trong ô nhập (ví dụ khi mở từ bài tập) */
  initialDraft?: string;
  /** nội dung vòng hỗ trợ học sinh này được thấy (null = chưa bật) */
  loop?: ChatLoop | null;
  /** chuyện bận lòng vừa lưu, mở trò chuyện để kể thêm */
  worry?: { id: string; topic: string; level: number } | null;
}) {
  const [conversationId, setConversationId] = useState(initialId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [blanksOpen, setBlanksOpen] = useState(false);
  // vừa chọn câu điền chỗ trống: sau khi ô nhập có chữ mới thì chọn sẵn chỗ ___ đầu tiên
  const [selectBlank, setSelectBlank] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  useEffect(() => {
    if (!selectBlank) return;
    setSelectBlank(false);
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const at = el.value.indexOf("___");
    if (at >= 0) el.setSelectionRange(at, at + 3);
  }, [selectBlank, draft]);

  function patch(id: string, update: (m: ChatMessage) => ChatMessage) {
    setMessages((cur) => cur.map((m) => (m.id === id ? update(m) : m)));
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    setDraft("");
    setSending(true);
    setWaiting(true);
    setMessages((cur) => [...cur, { id: `u-${Date.now()}`, role: "user", content: message }]);

    // mã cuộc trò chuyện của lượt này (cuộc trò chuyện mới chỉ có mã khi máy chủ gửi "meta")
    let convId = conversationId;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message, worryId: worry?.id ?? null }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Chưa gửi được tin nhắn. Thử lại nhé.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // câu trả lời của lượt này (sửa theo id, vì học sinh có thể đã nhắn tiếp khi gợi ý chưa về)
      const assistantId = `a-${Date.now()}`;
      let started = false;
      const startAssistant = (content = "", crisis = false) => {
        started = true;
        setWaiting(false);
        setMessages((cur) => [...cur, { id: assistantId, role: "assistant", content, crisis }]);
      };
      const patchReply = (update: (m: ChatMessage) => ChatMessage) => patch(assistantId, update);
      // trả lời xong thì cho nhắn tiếp ngay, không cần đợi gợi ý trả lời nhanh
      const unlock = () => {
        setWaiting(false);
        setSending(false);
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
              convId = event.conversationId;
              if (!conversationId) {
                setConversationId(event.conversationId);
                // đổi URL mà không tải lại trang để giữ nguyên cuộc trò chuyện đang hiện
                window.history.replaceState(null, "", `/chat/${event.conversationId}`);
              }
              break;
            case "delta":
              if (!started) startAssistant(event.text);
              else patchReply((m) => ({ ...m, content: m.content + event.text }));
              break;
            case "crisis":
              startAssistant(event.text, true);
              break;
            case "support":
              patchReply((m) => ({ ...m, support: true }));
              unlock();
              break;
            case "saved":
              patchReply((m) => ({ ...m, dbId: event.messageId }));
              unlock();
              break;
            case "topic_guess":
              if (loop && !alreadyAsked(convId)) {
                const guess = { topic: event.topic, label: event.label, emoji: event.emoji };
                patchReply((m) => ({ ...m, guess }));
              }
              break;
            case "suggestions":
              patchReply((m) => ({ ...m, suggestions: event.items }));
              break;
            case "error":
              if (!started) startAssistant(event.message);
              patchReply((m) => ({ ...m, error: true, content: m.content || event.message }));
              unlock();
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

  const worryTopic = worry && loop ? loop.topics[worry.topic] : null;
  // biết chủ đề thì dùng câu mở đầu theo chủ đề, không thì dùng câu chung thầy cô soạn
  const openers = worry && loop?.starters[worry.topic]?.length ? loop.starters[worry.topic] : starters;
  const blanks = loop?.fillBlanks ?? [];

  /** Đưa câu điền chỗ trống vào ô nhập; chỗ ___ đầu tiên được chọn sẵn (xem selectBlank) để gõ đè. */
  function pickBlank(sentence: string) {
    setBlanksOpen(false);
    setDraft(sentence);
    setSelectBlank(true);
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
        <HelpButton className="md:hidden" />
        {conversationId && <DeleteConversationButton id={conversationId} goBack />}
      </header>

      <div className="flex-1 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <May size={120} mood={worry ? "caring" : "happy"} />
            <p className="mt-4 max-w-sm text-lg font-medium">
              {worryTopic
                ? `Mình nhớ bạn vừa kể đang bận lòng chuyện ${worryTopic.label.toLowerCase()}. Kể mình nghe thêm nhé, bắt đầu từ đâu cũng được.`
                : `Chào ${nickname}! Hôm nay có chuyện gì muốn kể mình nghe không?`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {openers.map((s) => (
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
            {blanks.length > 0 && (
              <button type="button" onClick={() => setBlanksOpen(true)} className={cn(btn.ghost, "mt-3 text-sm")}>
                💡 Mình chưa biết nói gì…
              </button>
            )}
          </div>
        )}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          return (
            <div key={m.id}>
              <Bubble message={m} />
              {m.role === "assistant" && m.dbId && !m.crisis && !m.error && (
                <FeedbackBar
                  messageId={m.dbId}
                  initial={m.feedback ?? null}
                  onChange={(feedback) =>
                    setMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, feedback } : x)))
                  }
                />
              )}
              {m.guess && loop && <TopicGuessCard guess={m.guess} loop={loop} conversationId={conversationId} />}
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
        {blanksOpen && (
          <div className="absolute inset-x-0 bottom-full mb-2">
            <FillBlankPanel sentences={blanks} onPick={pickBlank} onClose={() => setBlanksOpen(false)} />
          </div>
        )}
        {blanks.length > 0 && (
          <button
            type="button"
            onClick={() => setBlanksOpen((o) => !o)}
            aria-label="Mình chưa biết nói gì: xem câu gợi ý"
            aria-expanded={blanksOpen}
            title="Mình chưa biết nói gì…"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl transition hover:bg-surface-2"
          >
            💡
          </button>
        )}
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
