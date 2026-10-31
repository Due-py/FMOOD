"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import { setFeedback, stopChat } from "@/app/actions/chat";
import { CORRECTION_ASK, SKIP_MESSAGE, wantsSummary } from "@/lib/chat-loop";
import type { ChatEvent } from "@/lib/chat-events";
import { FEEDBACK_REASONS, REASON_KEYS, type FeedbackReason } from "@/lib/feedback";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { AssistantProvider } from "@/components/mascot/AssistantContext";
import { assistantInfo, CHARACTERS, LENGTH_CAPS, type ChatStyle, type CharacterKey } from "@/lib/ai/chat-style";
import { hasCards, parseReplyCards, splitBubbles, visibleReply } from "@/lib/ai/reply-cards";
import { ArrowLeft, SendIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { HelpButton } from "@/components/HelpButton";
import type { ChatLoop } from "@/lib/loop-content";
import { firstMessageSource, type ConversationSource } from "@/lib/chat-source";
import { restLine } from "@/lib/chat-rest";
import { DeleteConversationButton } from "../DeleteConversationButton";
import { ChatStyleSheet } from "./ChatStyleSheet";
import { ReplyCardsView } from "./ReplyCardsView";
import {
  alreadyAsked,
  ChatControls,
  FillBlankPanel,
  SummaryCard,
  summaryAsked,
  TopicGuessCard,
  type ChatWorry,
  type TopicGuess,
} from "./ChatLoopParts";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** câu trả lời soạn sẵn khi có dấu hiệu nguy hiểm */
  crisis?: boolean;
  /** hiện thẻ hỗ trợ ngay sau tin nhắn này */
  support?: boolean;
  /** cảnh báo đã được ghi thật cho thầy cô (chỉ khi đó thẻ hỗ trợ mới nói "đã được báo") */
  notified?: boolean;
  error?: boolean;
  /** id thật trong cơ sở dữ liệu (để gắn phản hồi 👍/👎) */
  dbId?: string;
  feedback?: { rating: 1 | -1; reason: FeedbackReason | null } | null;
  /** gợi ý trả lời nhanh */
  suggestions?: string[];
  /** trợ lý đoán học sinh đang lo chuyện gì (hiện thẻ hỏi lại dưới câu trả lời) */
  guess?: TopicGuess;
  /** câu trợ lý tóm tắt khó khăn, chờ học sinh bấm "Đúng rồi" / sửa */
  summary?: string;
  /** lời soạn sẵn hiện ngay trên máy (hỏi lại sau "… hiểu chưa đúng"), không gọi AI, không lưu */
  local?: boolean;
};

export function ChatView({
  conversationId: initialId,
  initialMessages,
  nickname,
  supportCards,
  starters,
  initialDraft = "",
  lesson = null,
  journalId = null,
  restMinutes = null,
  loop = null,
  worry: initialWorry = null,
  source = "other",
  chatStyle,
  intros,
  skills,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
  nickname: string;
  /** thẻ hỗ trợ: bản "notified" chỉ dùng khi máy chủ xác nhận đã ghi cảnh báo */
  supportCards: { urgent: ReactNode; gentle: ReactNode; urgentNotified: ReactNode; gentleNotified: ReactNode };
  /** câu gợi ý mở đầu (admin sửa trong Câu hỏi & gợi ý) */
  starters: string[];
  /** câu soạn sẵn trong ô nhập (ví dụ khi mở từ bài tập) */
  initialDraft?: string;
  /** nội dung vòng hỗ trợ học sinh này được thấy (null = chưa bật) */
  loop?: ChatLoop | null;
  /** chuyện bận lòng vừa lưu, mở trò chuyện để kể thêm */
  worry?: ChatWorry | null;
  /** trang này được mở từ đâu (ghi vào cuộc trò chuyện mới, để thống kê; không ghi nội dung) */
  source?: ConversationSource;
  /** lựa chọn trò chuyện của học sinh (nhân vật, độ dài, cách dẫn dắt, động lực), đã kiểm tra ở máy chủ */
  chatStyle: ChatStyle;
  /** câu giới thiệu của từng nhân vật (admin soạn) */
  intros: Record<CharacterKey, string>;
  /** tên kỹ năng trợ lý được phép gợi ý (thẻ SKILL phải khớp nguyên văn) */
  skills: string[];
  /** mở từ nút "Hỏi …" của một bài tập: mã bài và câu, gửi kèm mỗi tin để máy chủ đưa đề vào lời dặn (mục 5.3) */
  lesson?: { slug: string; exerciseId: string } | null;
  /** mở từ một trang nhật ký: máy chủ đọc trang đó làm bối cảnh (chỉ gửi ở tin đầu tiên) */
  journalId?: string | null;
  /** số phút đã trò chuyện hôm nay khi đã quá mốc nhắc nghỉ (mục 4.4), không thì null */
  restMinutes?: number | null;
}) {
  // đổi ở bảng chọn thì đổi ngay ở đầu trang; tin nhắn tiếp theo máy chủ đọc lựa chọn mới đã lưu
  const [style, setStyle] = useState<ChatStyle>(chatStyle);
  const [styleOpen, setStyleOpen] = useState(false);
  const character = CHARACTERS[style.character];
  const maxBubbles = LENGTH_CAPS[style.length].messages;
  const [conversationId, setConversationId] = useState(initialId);
  // chuyện bận lòng đang gắn (có thể lưu ngay trong lúc trò chuyện) và khó khăn đã xác nhận
  const [worry, setWorry] = useState<ChatWorry | null>(initialWorry);
  // khó khăn học sinh xác nhận khi chưa gắn chuyện bận lòng nào: trợ lý dùng trong cuộc trò chuyện này
  const [localDifficulty, setLocalDifficulty] = useState<string | null>(null);
  // vừa bấm "… hiểu chưa đúng": tin nhắn kế tiếp là lời kể lại
  const [correcting, setCorrecting] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  // nhắc nghỉ (máy chủ đếm phút): học sinh bấm "Để sau" thì không hiện lại trong lần mở trang này
  const [rest, setRest] = useState<number | null>(restMinutes);
  const [restDismissed, setRestDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  // cờ đổi ngay lập tức (không chờ vẽ lại): bấm "Dừng" / gửi tin khi trợ lý còn đang trả lời thì bỏ qua, để không lẫn thứ tự
  const busy = useRef(false);
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

  async function send(text: string, button: "skip" | null = null, viaStarter = false) {
    const message = text.trim();
    if (!message || sending || busy.current) return;
    busy.current = true;
    const turn = button ?? (correcting ? "correction" : null);
    const userTurns = messages.filter((m) => m.role === "user").length + 1;
    const wantSummary = wantsSummary({
      turn,
      linkedToWorry: Boolean(worry),
      hasConfirmed: Boolean(worry?.difficulty),
      userTurns,
      alreadyAsked: summaryAsked(conversationId),
      stopped: false,
    });

    setDraft("");
    setSending(true);
    setWaiting(true);
    setCorrecting(false);
    setStopped(false);
    setMessages((cur) => [...cur, { id: `u-${Date.now()}`, role: "user", content: message }]);

    // mã cuộc trò chuyện của lượt này (cuộc trò chuyện mới chỉ có mã khi máy chủ gửi "meta")
    let convId = conversationId;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message,
          worryId: worry?.id ?? null,
          turn,
          wantSummary,
          difficulty: worry ? null : localDifficulty,
          source: conversationId ? null : firstMessageSource(source, viaStarter),
          lesson,
          journalId: conversationId ? null : journalId,
        }),
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
        busy.current = false;
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
            case "replace":
              if (!started) startAssistant(event.text);
              else patchReply((m) => ({ ...m, content: event.text }));
              break;
            case "support":
              patchReply((m) => ({ ...m, support: true, notified: event.teacherNotified }));
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
            case "rest":
              setRest(event.minutes);
              break;
            case "summary":
              summaryAsked(convId, true);
              patchReply((m) => ({ ...m, summary: event.text }));
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
      busy.current = false;
      inputRef.current?.focus();
    }
  }

  /** "… hiểu chưa đúng": trợ lý hỏi lại ngay (câu soạn sẵn), tin nhắn kế tiếp được gửi kèm nút này. */
  function startCorrection() {
    setMessages((cur) => [...cur, { id: `l-${Date.now()}`, role: "assistant", content: CORRECTION_ASK, local: true }]);
    setCorrecting(true);
    inputRef.current?.focus();
  }

  /** "Dừng": trợ lý chào bằng câu soạn sẵn, không hỏi thêm; học sinh nhắn tiếp lúc nào cũng được. */
  async function stop() {
    if (!conversationId || sending || busy.current) return;
    busy.current = true;
    setSending(true);
    const res = await stopChat(conversationId);
    setSending(false);
    busy.current = false;
    if (res.ok) {
      setCorrecting(false);
      setStopped(true);
      setMessages((cur) => [...cur.map((m) => ({ ...m, suggestions: [] })), { id: `s-${Date.now()}`, role: "assistant", content: res.line }]);
    }
  }

  function linkWorry(w: ChatWorry) {
    setWorry(w);
    setLocalDifficulty(null);
  }

  const worryTopic = worry && loop ? loop.topics[worry.topic] : null;
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
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
    // các phần con (nút trong trò chuyện, thẻ xác nhận…) đọc tên nhân vật mới ngay khi học sinh đổi
    <AssistantProvider value={assistantInfo(style.character)}>
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col md:min-h-[calc(100dvh-5rem)]">
        <header className="sticky top-0 z-10 md:top-20 -mx-4 mb-2 flex items-center gap-2 bg-bg/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <Link href="/chat" className={cn(btn.ghost, "-ml-3 px-3")} aria-label="Danh sách trò chuyện">
            <ArrowLeft size={20} />
          </Link>
          {/* bấm vào nhân vật: mở bảng chọn nhân vật và cách trò chuyện */}
          <button
            type="button"
            onClick={() => setStyleOpen(true)}
            aria-haspopup="dialog"
            aria-label={`${character.name}: đổi nhân vật và cách trò chuyện`}
            className="-ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left transition hover:bg-surface-2"
          >
            <CharacterAvatar size={40} float={false} character={style.character} mood={waiting ? "calm" : "happy"} />
            <span className="min-w-0">
              <span className="block font-display text-lg font-bold leading-tight tracking-tight">
                {character.name} <span aria-hidden className="text-sm text-muted">▾</span>
              </span>
              <span className="block text-xs text-muted">{waiting ? "đang nghĩ…" : "bạn đồng hành AI · đổi cách trò chuyện"}</span>
            </span>
          </button>
          <HelpButton className="md:hidden" />
          {conversationId && <DeleteConversationButton id={conversationId} goBack />}
        </header>

        <div className="flex-1 space-y-3 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-6 text-center">
              <CharacterAvatar size={120} character={style.character} mood={worry ? "caring" : "happy"} />
              <p className="mt-4 max-w-sm text-lg font-medium">
                {worryTopic
                  ? `Mình nhớ bạn vừa kể đang bận lòng chuyện ${worryTopic.label.toLowerCase()}. Kể mình nghe thêm nhé, bắt đầu từ đâu cũng được.`
                  : `Chào ${nickname}! Hôm nay có chuyện gì muốn kể mình nghe không?`}
              </p>
              {/* câu giới thiệu của nhân vật (admin soạn) */}
              {!worryTopic && intros[style.character] && <p className="mt-2 max-w-sm text-sm">{intros[style.character]}</p>}
              {/* QT01: nói rõ đây là AI, làm được gì và không làm được gì, ngay đầu cuộc trò chuyện (không phụ thuộc câu admin soạn) */}
              <p className="mt-2 max-w-sm text-sm text-muted">
                {character.name} là một nhân vật AI, không phải người thật. Mình lắng nghe và gợi ý việc nhỏ, nhưng có thể nói chưa
                đúng và không thay được thầy cô hay bác sĩ. Khi cần người thật, bạn bấm “Cần giúp” nhé.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {openers.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s, null, true)}
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
            // đang viết dở: câu trả lời cuối, chưa lưu, đang gửi
            const streaming = isLast && sending && m.role === "assistant" && !m.dbId && !m.crisis && !m.error;
            // thẻ gợi ý: chỉ ở câu trả lời cuối đã lưu, không ở lượt có thẻ hỗ trợ (đáng lo, khẩn cấp)
            const cards =
              isLast && !sending && !stopped && m.role === "assistant" && m.dbId && !m.crisis && !m.error && !m.support && !m.local
                ? parseReplyCards(m.content, skills).cards
                : null;
            return (
              <div key={m.id}>
                <Bubble message={m} character={style.character} maxBubbles={maxBubbles} streaming={streaming} />
                {m.role === "assistant" && m.dbId && !m.crisis && !m.error && (
                  <FeedbackBar
                    name={character.name}
                    messageId={m.dbId}
                    initial={m.feedback ?? null}
                    onChange={(feedback) =>
                      setMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, feedback } : x)))
                    }
                    more={
                      // nút ⋯ (… hiểu chưa đúng / Bỏ qua / Dừng): chỉ ở câu trả lời mới nhất
                      m === lastAssistant && isLast && !sending && !stopped && !correcting && conversationId ? (
                        <ChatControls busy={sending} onMisunderstood={startCorrection} onSkip={() => send(SKIP_MESSAGE, "skip")} onStop={stop} />
                      ) : null
                    }
                  />
                )}
                {m.guess && loop && (
                  <TopicGuessCard
                    guess={m.guess}
                    loop={loop}
                    conversationId={conversationId}
                    difficulty={localDifficulty}
                    onRetell={startCorrection}
                    onWorrySaved={linkWorry}
                  />
                )}
                {m.summary && !stopped && (
                  <SummaryCard
                    text={m.summary}
                    loop={loop}
                    worry={worry}
                    onRetell={startCorrection}
                    onWorrySaved={linkWorry}
                    onConfirmed={(t) => {
                      if (worry) setWorry({ ...worry, difficulty: t });
                      else setLocalDifficulty(t);
                    }}
                  />
                )}
                {m.support && (
                  <div className="mt-3">
                    {m.crisis
                      ? m.notified
                        ? supportCards.urgentNotified
                        : supportCards.urgent
                      : m.notified
                        ? supportCards.gentleNotified
                        : supportCards.gentle}
                  </div>
                )}
                {cards && hasCards(cards) && <ReplyCardsView key={m.id} cards={cards} onContinue={() => inputRef.current?.focus()} />}
                {isLast && !sending && !stopped && m.role === "assistant" && !!m.suggestions?.length && (
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
              <CharacterAvatar size={30} float={false} character={style.character} mood="calm" />
              <div className="flex gap-1 rounded-3xl rounded-bl-md bg-surface px-4 py-3.5" aria-label={`${character.name} đang trả lời`}>
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

        {rest !== null && !restDismissed && (
          // chỉ là lời nhắc: ô nhắn và nút "Cần giúp" vẫn dùng được như thường
          <div role="status" className="mb-2 rounded-3xl bg-butter px-4 py-3 text-sm">
            <p>🌿 {restLine(character.name, rest)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/home" className={cn(btn.secondary, "px-4 py-2 text-sm")}>
                Mình nghỉ một chút
              </Link>
              <button type="button" onClick={() => setRestDismissed(true)} className={cn(btn.ghost, "px-3 py-2 text-sm")}>
                Để sau
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex items-end gap-2 rounded-[1.75rem] border border-line bg-surface p-2 shadow-lg md:bottom-4"
        >
          {correcting && !blanksOpen && (
            <p className="absolute inset-x-2 bottom-full mb-2 flex items-center justify-between rounded-full bg-butter px-4 py-1.5 text-xs font-semibold">
              Bạn đang kể lại cho {character.name} hiểu đúng hơn
              <button type="button" onClick={() => setCorrecting(false)} className="underline underline-offset-2">
                Thôi
              </button>
            </p>
          )}
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
            placeholder={correcting ? "Đúng ra là…" : `Nhắn cho ${character.name}…`}
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

        {styleOpen && (
          <ChatStyleSheet
            value={style}
            onClose={() => setStyleOpen(false)}
            onSaved={(next) => {
              setStyle(next);
              setStyleOpen(false);
            }}
          />
        )}
      </div>
    </AssistantProvider>
  );
}

type Feedback = { rating: 1 | -1; reason: FeedbackReason | null } | null;

/** 👍 / 👎 dưới câu trả lời của trợ lý. 👎 thì hỏi nhanh lý do để trợ lý điều chỉnh. `more`: nút ⋯ ở câu trả lời mới nhất. */
function FeedbackBar({
  name,
  messageId,
  initial,
  onChange,
  more,
}: {
  name: string;
  messageId: string;
  initial: Feedback;
  onChange: (f: Feedback) => void;
  more?: ReactNode;
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
        {more}
        {thanks && !askReason && (
          <span className="animate-[fadein_.3s_ease] text-xs text-muted">Cảm ơn bạn! {name} sẽ ghi nhớ.</span>
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

/**
 * Một tin nhắn. Câu trả lời của trợ lý: bỏ dòng thẻ gợi ý, rồi chia thành nhiều bong bóng theo dòng trống
 * (tối đa số tin của mức độ dài học sinh chọn; vẫn là một tin đã lưu nên 👍/👎 và xóa không đổi).
 */
function Bubble({ message, character, maxBubbles, streaming }: { message: ChatMessage; character: CharacterKey; maxBubbles: number; streaming: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-brand px-4 py-2.5 text-brand-ink">
          {message.content}
        </p>
      </div>
    );
  }
  const plain = message.crisis || message.error || message.local;
  const text = plain ? message.content : visibleReply(message.content, streaming);
  const parts = plain ? [text] : splitBubbles(text, maxBubbles);
  return (
    <div className="space-y-1.5">
      {parts.map((part, i) => (
        <div key={i} className="flex items-end gap-2">
          {/* hình nhân vật ở bong bóng cuối, như các ứng dụng nhắn tin */}
          <CharacterAvatar
            size={30}
            float={false}
            character={character}
            mood={message.crisis ? "worried" : "happy"}
            className={i === parts.length - 1 ? "" : "invisible"}
          />
          <div
            className={cn(
              "max-w-[85%] rounded-3xl px-4 py-2.5 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2 [&_ul+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1",
              i === parts.length - 1 ? "rounded-bl-md" : "",
              message.crisis
                ? "border border-danger/30 bg-danger-soft"
                : message.error
                  ? "bg-surface-2 text-muted"
                  : "bg-surface",
            )}
          >
            <Markdown>{part}</Markdown>
          </div>
        </div>
      ))}
    </div>
  );
}
