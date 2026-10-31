"use client";

import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { previewReply } from "@/app/actions/admin";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { StyleComboPicker } from "@/components/admin/StyleComboPicker";
import { btn } from "@/components/ui/styles";
import { defaultStyle, LENGTH_CAPS, type ChatStyle, type StyleSettings } from "@/lib/ai/chat-style";
import { parseReplyCards, splitBubbles, type ReplyCards } from "@/lib/ai/reply-cards";

type Parts = { rules?: string; safety?: string; talk?: string; cards?: string };

/**
 * Sân thử: gửi một câu cho trợ lý bằng lời dặn / tùy chọn đang soạn (chưa lưu), với một tổ hợp nhân vật và lựa chọn
 * admin chọn. Câu trả lời hiện như học sinh thấy: chia bong bóng theo mức độ dài, thẻ gợi ý tách riêng. Không lưu gì.
 */
export function MayPlayground({ parts, styles }: { parts?: Parts; styles?: StyleSettings }) {
  const [message, setMessage] = useState("Dạo này mình áp lực chuyện thi quá");
  const [style, setStyle] = useState<ChatStyle>(() => defaultStyle(styles));
  const [result, setResult] = useState<{ reply: string; scenarios: string[]; knowledge: string[]; style: ChatStyle } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = result ? parseReplyCards(result.reply) : null;

  return (
    <div className="rounded-[var(--radius-card)] bg-sky p-5">
      <p className="font-display text-lg font-bold tracking-tight">Thử nói chuyện</p>
      <p className="text-sm text-muted">
        Dùng nội dung đang soạn ở trên (chưa cần lưu) với tổ hợp chọn bên dưới. Không lưu, không tạo cảnh báo.
      </p>
      <StyleComboPicker value={style} onChange={setStyle} className="mt-3" />
      <form
        action={() =>
          startTransition(async () => {
            setError(null);
            const res = await previewReply({ parts, styles, style, message });
            if (res.ok) setResult({ ...res, style });
            else setError(res.error);
          })
        }
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Tin nhắn thử"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
        />
        <button type="submit" disabled={pending || !message.trim()} className={btn.primary}>
          {pending ? "Đang nghĩ…" : "Gửi thử"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {result && shown && (
        <div className="mt-4 space-y-2">
          {splitBubbles(shown.text, LENGTH_CAPS[result.style.length].messages).map((b, i) => (
            <div key={i} className="flex items-end gap-2">
              <CharacterAvatar size={34} float={false} character={result.style.character} className={i === 0 ? "" : "invisible"} />
              <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed [&_p+p]:mt-2">
                <Markdown>{b}</Markdown>
              </div>
            </div>
          ))}
          <CardPreview cards={shown.cards} />
          <p className="text-xs text-muted">
            {shown.text.split(/\s+/).filter(Boolean).length} từ · giới hạn {LENGTH_CAPS[result.style.length].words} từ,{" "}
            {LENGTH_CAPS[result.style.length].messages} tin nhắn.
            {result.scenarios.length > 0 && <> Kịch bản dùng: {result.scenarios.join(", ")}.</>}
            {result.knowledge.length > 0 && <> Tài liệu tham khảo: {[...new Set(result.knowledge)].join(", ")}.</>}
          </p>
        </div>
      )}
    </div>
  );
}

/** Thẻ gợi ý trong câu trả lời thử (chỉ để xem, không bấm được). */
function CardPreview({ cards }: { cards: ReplyCards }) {
  const items = [
    cards.goal && `🎯 Thẻ mục tiêu: ${cards.goal.title} – ${cards.goal.description}`,
    cards.skill && `🧩 Thẻ kỹ năng: ${cards.skill.name}`,
    cards.end && `👋 Thẻ dừng: ${cards.end.text}`,
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <ul className="ml-11 space-y-1">
      {items.map((t) => (
        <li key={t as string} className="rounded-2xl border border-dashed border-line bg-surface/70 px-3 py-2 text-sm">
          {t}
        </li>
      ))}
    </ul>
  );
}
