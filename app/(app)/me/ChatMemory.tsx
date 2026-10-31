"use client";

import { useState, useTransition } from "react";
import { resetChatPreferences } from "@/app/actions/chat";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { FEEDBACK_REASONS, type FeedbackReason } from "@/lib/feedback";

/** Cho học sinh thấy trợ lý đã điều chỉnh gì theo phản hồi của mình, và xóa được. */
export function ChatMemory({
  reasons,
  ups,
  downs,
}: {
  reasons: { reason: FeedbackReason; count: number }[];
  ups: number;
  downs: number;
}) {
  const { name } = useAssistant();
  const [cleared, setCleared] = useState(false);
  const [pending, startTransition] = useTransition();

  if (cleared || ups + downs === 0) {
    return (
      <p className="text-sm text-muted">
        {cleared
          ? `Đã xóa. ${name} sẽ trò chuyện như ban đầu.`
          : `Chưa có gì. Hãy bấm 👍 hoặc 👎 dưới câu trả lời của ${name} để ${name} hiểu bạn thích trò chuyện thế nào.`}
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Bạn đã chấm {ups} 👍 và {downs} 👎 gần đây.
      </p>
      {reasons.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {reasons.map(({ reason }) => (
            <li key={reason} className="rounded-2xl bg-sky px-4 py-2.5 text-sm">
              Vì bạn hay chọn “{FEEDBACK_REASONS[reason].label}”, {name} đang cố gắng{" "}
              <strong>{ADJUST[reason]}</strong>.
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm">{name} sẽ giữ cách trò chuyện bạn thích.</p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          confirm(`Xóa mọi phản hồi 👍/👎? ${name} sẽ trò chuyện như ban đầu.`) &&
          startTransition(async () => {
            const res = await resetChatPreferences();
            if (res.ok) setCleared(true);
          })
        }
        className="mt-3 text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Xóa ghi nhớ
      </button>
    </div>
  );
}

const ADJUST: Record<FeedbackReason, string> = {
  too_long: "trả lời ngắn gọn hơn",
  misunderstood: "nhắc lại ý bạn để chắc đã hiểu đúng",
  too_many_questions: "hỏi ít lại, lắng nghe nhiều hơn",
  not_helpful: "đưa gợi ý cụ thể hơn khi phù hợp",
  tone: "nói chuyện tự nhiên, gần gũi hơn",
};
