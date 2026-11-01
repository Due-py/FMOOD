"use client";

import Link from "next/link";
import { CASEL, CASEL5, subskillHref, subskillsByCompetency } from "@/lib/sel/casel";
import { SKILL_IDS, SKILLS } from "@/lib/skills";
import type { ChatStyle } from "@/lib/ai/chat-style";
import type { SelPanel } from "@/lib/sel/practice-offer";
import { ChevronDownIcon, ClockIcon, NoteIcon, PlusIcon, SettingsIcon, TargetIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { DeleteConversationButton } from "../DeleteConversationButton";
import { ChatPanelBody } from "./ChatPracticeParts";
import { ChatStyleForm } from "./ChatStyleSheet";

/**
 * PANEL PHẢI TRANG HỌC CÙNG AI (Duy 01/11): 4 thẻ.
 *  - Ghi chú: "Trong cuộc trò chuyện này" (điều học sinh đã xác nhận / đã chọn); tự mở khi bắt đầu trò chuyện.
 *  - Kỹ năng: các bài luyện của trang Kỹ năng, theo 5 nhóm năng lực.
 *  - Lịch sử: các cuộc trò chuyện cũ (trước đây là trang /chat).
 *  - Cài đặt: "Trò chuyện theo cách của bạn" (độ dài, cách dẫn dắt, động lực; đổi nhân vật ở tên nhân vật đầu trang).
 * Máy tính rộng: nằm trong panel phải; nhỏ hơn: trong ngăn kéo mở bằng nút "Thêm" ở đầu trang.
 * Duy 01/11 (panel quá nổi, làm mất tập trung vào khung trò chuyện): panel cùng nền với trang, icon một màu, thanh thẻ dính
 * khi cuộn; thu gọn LÊN TRÊN (nút ⌃ cuối thanh thẻ, hoặc bấm lại thẻ đang mở): chỉ còn thanh thẻ ở góc trên, bấm thẻ nào
 * mở thẻ đó; nhớ bằng cookie. Cỡ chữ mọi thẻ như nhau: tiêu đề 14px in hoa, nhóm 12px in hoa, mục 14px.
 */
export type ChatTab = "ghi-chu" | "ky-nang" | "lich-su" | "cai-dat";
export type ChatHistoryItem = { id: string; title: string; when: string };

// icon nét mảnh một màu (trước là emoji nhiều màu, làm panel nổi hơn khung trò chuyện)
const TABS: { key: ChatTab; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { key: "ghi-chu", label: "Ghi chú", Icon: NoteIcon },
  { key: "ky-nang", label: "Kỹ năng", Icon: TargetIcon },
  { key: "lich-su", label: "Lịch sử", Icon: ClockIcon },
  { key: "cai-dat", label: "Cài đặt", Icon: SettingsIcon },
];

/** chấm báo Ghi chú có điều mới khi học sinh chưa xem */
const Dot = () => <span aria-hidden className="absolute right-1.5 top-1 size-2 rounded-full bg-brand-strong" />;

export function ChatSideTabs({
  tab,
  onTab,
  panel,
  history,
  currentId,
  style,
  onStyleSaved,
  idPrefix,
  fold,
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
  /**
   * panel phải: thanh thẻ dính đầu panel, có nút thu gọn lên trên; bấm lại thẻ đang mở cũng thu gọn; đang thu gọn thì bấm
   * thẻ nào mở thẻ đó. `dot`: Ghi chú có điều mới mà chưa xem (chỉ hiện khi thu gọn). Ngăn kéo: không truyền.
   */
  fold?: { collapsed: boolean; dot: boolean; onCollapse: () => void; onExpand: (t: ChatTab | null) => void };
}) {
  const collapsed = fold?.collapsed ?? false;
  return (
    <div>
      <div className={cn("flex items-center gap-1", fold && "sticky top-0 z-10 -mx-5 bg-bg/90 px-3 pb-2 pt-5 backdrop-blur-xl", fold && !collapsed && "border-b border-line")}>
        <div role="tablist" aria-label="Trong trang trò chuyện" className="grid flex-1 grid-cols-4 gap-1">
          {TABS.map(({ key, label, Icon }) => {
            const active = !collapsed && tab === key;
            return (
              <button
                key={key}
                id={`${idPrefix}-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={collapsed ? undefined : `${idPrefix}-panel`}
                onClick={() => (!fold ? onTab(key) : collapsed ? fold.onExpand(key) : tab === key ? fold.onCollapse() : onTab(key))}
                title={fold && active ? `${label} (bấm lần nữa để thu gọn)` : label}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-semibold transition",
                  active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
                )}
              >
                <Icon size={18} />
                {label}
                {collapsed && key === "ghi-chu" && fold?.dot && (
                  <>
                    <Dot />
                    <span className="sr-only">(có ghi chú mới)</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {fold && (
          <button
            type="button"
            onClick={() => (collapsed ? fold.onExpand(null) : fold.onCollapse())}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Mở panel" : "Thu gọn panel"}
            title={collapsed ? "Mở panel" : "Thu gọn panel"}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <ChevronDownIcon size={20} className={cn("transition-transform", !collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab}`} className={cn("mt-4", fold && "animate-[fadein_.2s_ease]")}>
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
              {/* cùng cỡ với tiêu đề thẻ Ghi chú; đổi nhân vật nằm ở tên nhân vật đầu trang */}
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Trò chuyện theo cách của bạn</h2>
              <p className="mt-1 text-sm text-muted">Chỉ đổi giọng văn và độ dài. Áp dụng từ tin nhắn tiếp theo.</p>
              <ChatStyleForm key={style.character + style.length + style.guidance + style.motivation} value={style} onSaved={onStyleSaved} />
            </>
          )}
        </div>
      )}
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
