"use client";

import Link from "next/link";
import { CASEL, CASEL5, subskillHref, subskillsByCompetency } from "@/lib/sel/casel";
import { SKILL_IDS, SKILLS } from "@/lib/skills";
import type { ChatStyle } from "@/lib/ai/chat-style";
import type { SelPanel } from "@/lib/sel/practice-offer";
import { PlusIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { DeleteConversationButton } from "../DeleteConversationButton";
import { ChatPanelBody } from "./ChatPracticeParts";
import { ChatStyleForm } from "./ChatStyleSheet";

/**
 * PANEL PHẢI TRANG HỌC CÙNG AI (Duy 01/11): 4 thẻ.
 *  - Ghi chú: "Trong cuộc trò chuyện này" (điều học sinh đã xác nhận / đã chọn); tự mở khi bắt đầu trò chuyện.
 *  - Kỹ năng: các bài luyện của trang Kỹ năng, theo 5 nhóm năng lực.
 *  - Lịch sử: các cuộc trò chuyện cũ (trước đây là trang /chat).
 *  - Cài đặt: "Trò chuyện theo cách của bạn" (như khi bấm vào nhân vật).
 * Máy tính rộng: nằm trong panel phải; nhỏ hơn: trong ngăn kéo mở bằng nút "Thêm" ở đầu trang.
 */
export type ChatTab = "ghi-chu" | "ky-nang" | "lich-su" | "cai-dat";
export type ChatHistoryItem = { id: string; title: string; when: string };

const TABS: { key: ChatTab; label: string; icon: string }[] = [
  { key: "ghi-chu", label: "Ghi chú", icon: "📝" },
  { key: "ky-nang", label: "Kỹ năng", icon: "🎯" },
  { key: "lich-su", label: "Lịch sử", icon: "🕘" },
  { key: "cai-dat", label: "Cài đặt", icon: "⚙️" },
];

export function ChatSideTabs({
  tab,
  onTab,
  panel,
  history,
  currentId,
  style,
  onStyleSaved,
  idPrefix,
}: {
  tab: ChatTab;
  onTab: (t: ChatTab) => void;
  panel: SelPanel | null;
  history: ChatHistoryItem[];
  currentId: string | null;
  style: ChatStyle;
  onStyleSaved: (s: ChatStyle) => void;
  /** panel phải và ngăn kéo cùng có mặt trong trang: mỗi nơi một tiền tố id */
  idPrefix: string;
}) {
  return (
    <div>
      <div role="tablist" aria-label="Trong trang trò chuyện" className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`${idPrefix}-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`${idPrefix}-panel`}
            onClick={() => onTab(t.key)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-semibold transition",
              tab === t.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <span aria-hidden className="text-base leading-none">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab}`} className="mt-4">
        {tab === "ghi-chu" && (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Trong cuộc trò chuyện này</h2>
            <ChatPanelBody panel={panel} />
          </>
        )}
        {tab === "ky-nang" && <SkillList />}
        {tab === "lich-su" && <HistoryList history={history} currentId={currentId} />}
        {tab === "cai-dat" && (
          <>
            <h2 className="font-display text-lg font-bold tracking-tight">Trò chuyện theo cách của bạn</h2>
            <p className="mt-1 text-sm text-muted">Chỉ đổi giọng văn và độ dài. Áp dụng từ tin nhắn tiếp theo.</p>
            <ChatStyleForm key={style.character + style.length + style.guidance + style.motivation} value={style} onSaved={onStyleSaved} />
          </>
        )}
      </div>
    </div>
  );
}

/** Các bài luyện theo 5 nhóm năng lực (như trang Kỹ năng); mở bài kèm ?tu=chat để ghi nguồn. */
function SkillList() {
  const groups = subskillsByCompetency(SKILL_IDS);
  return (
    <div className="space-y-4">
      {CASEL5.map((c) => (
        <section key={c}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{CASEL[c].name}</h2>
          <ul className="mt-1.5 space-y-1">
            {groups[c].map((s) => (
              <li key={s.id}>
                <Link
                  href={`${subskillHref(s.id)}?tu=chat`}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold transition hover:bg-surface-2"
                >
                  <span aria-hidden>{SKILLS[s.id as keyof typeof SKILLS].emoji}</span>
                  <span className="min-w-0">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Link href="/ky-nang" className="inline-block text-sm font-semibold text-brand-strong underline underline-offset-4">
        Mở trang Kỹ năng
      </Link>
    </div>
  );
}

function HistoryList({ history, currentId }: { history: ChatHistoryItem[]; currentId: string | null }) {
  return (
    <div className="space-y-2">
      <Link href="/chat/new" className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-brand-edge px-3 text-sm font-semibold text-brand-strong transition hover:bg-brand-soft">
        <PlusIcon size={16} /> Trò chuyện mới
      </Link>
      {history.length === 0 ? (
        <p className="px-1 text-sm text-muted">Chưa có cuộc trò chuyện nào.</p>
      ) : (
        <ul className="space-y-1">
          {history.map((c) => (
            <li key={c.id} className={cn("flex items-center gap-1 rounded-xl pr-1 transition hover:bg-surface-2", c.id === currentId && "bg-surface-2")}>
              <Link href={`/chat/${c.id}`} aria-current={c.id === currentId ? "page" : undefined} className="min-w-0 flex-1 px-2 py-2">
                <span className="block truncate text-sm font-semibold">{c.title}</span>
                <span className="block text-xs text-muted">{c.when}</span>
              </Link>
              <DeleteConversationButton id={c.id} goBack={c.id === currentId} className="size-9" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
