"use client";

import type { ReactNode } from "react";
import Markdown from "react-markdown";

export type SupportCards = { urgent: ReactNode; urgentNotified: ReactNode };

/**
 * "Chuyển an toàn": bài luyện dừng, trợ lý không nói gì thêm; chỉ hiện câu soạn sẵn (thầy cô duyệt, mục An toàn → Khẩn cấp)
 * và thẻ hỗ trợ, giống hệt khi gặp trong trò chuyện.
 */
export function CrisisNotice({ text, notified, cards }: { text: string; notified: boolean; cards: SupportCards }) {
  return (
    <div role="alert" className="space-y-4">
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft p-5 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2 [&_ul+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
        <Markdown>{text}</Markdown>
      </div>
      {notified ? cards.urgentNotified : cards.urgent}
    </div>
  );
}
