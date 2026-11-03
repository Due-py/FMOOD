"use client";

import Link from "next/link";
import { CASEL, CASEL5, subskillHref, subskillsByCompetency } from "@/lib/sel/casel";
import { SKILL_IDS, SKILLS } from "@/lib/skills";
import { CHARACTERS, type ChatStyle } from "@/lib/ai/chat-style";
import type { SelPanel } from "@/lib/sel/practice-offer";
import { ChevronDownIcon, ClockIcon, CloseIcon, NoteIcon, PlusIcon, SettingsIcon, TargetIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { btn } from "@/components/ui/styles";
import { DeleteConversationButton } from "../DeleteConversationButton";
import { ChatPanelBody } from "./ChatPracticeParts";
import { ChatStyleForm } from "./ChatStyleSheet";
import { PANEL_BG, panelCard } from "./chat-ui";

/**
 * PANEL PHẢI TRANG HỌC CÙNG AI (Duy 01/11): 4 thẻ.
 *  - Ghi chú: "Trong cuộc trò chuyện này" (điều học sinh đã xác nhận / đã chọn); tự mở khi bắt đầu trò chuyện.
 *  - Kỹ năng: các bài luyện của trang Kỹ năng, theo 5 nhóm năng lực.
 *  - Lịch sử: các cuộc trò chuyện cũ (trước đây là trang /chat).
 *  - Cài đặt: "Trò chuyện theo cách của bạn" (độ dài, cách dẫn dắt, động lực; đổi nhân vật ở tên nhân vật đầu trang).
 * Máy tính rộng: nằm trong panel phải; nhỏ hơn: trong ngăn kéo mở bằng nút "Thêm" ở đầu trang.
 * Duy 01/11 (panel quá nổi, làm mất tập trung vào khung trò chuyện): panel cùng nền với trang, icon một màu, thanh thẻ dính
 * khi cuộn; thu gọn LÊN TRÊN (nút ⌃ cuối thanh thẻ, hoặc bấm lại thẻ đang mở): chỉ còn thanh thẻ ở góc trên, bấm thẻ nào
 * mở thẻ đó; nhớ bằng cookie. Cỡ chữ, bố cục 4 thẻ theo một chuẩn chung (side-styles.ts).
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
const Dot = () => <span aria-hidden className="absolute right-1.5 top-1 size-2.5 rounded-full bg-c1-ink ring-2 ring-surface" />;

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
  onClose,
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
  /** ngăn kéo (dưới 1280px): nút ✕ cuối thanh thẻ, cùng một hàng (không có hàng "Đóng" riêng) */
  onClose?: () => void;
}) {
  const collapsed = fold?.collapsed ?? false;
  return (
    <div>
      {/* nền hàng thẻ theo nền chứa nó: panel đang mở nền trắng; thu gọn và ngăn kéo nền kem */}
      {/* mẫu Duy duyệt 02/11: thanh thẻ là một thẻ trắng bo tròn bóng mềm, thẻ đang mở nền bơ; icon vẫn một màu (Duy 01/11) */}
      <div className={cn("sticky top-0 z-10 -mx-1 flex items-center gap-1.5 px-1 pb-3 pt-5", fold && !collapsed ? PANEL_BG : "bg-bg")}>
        <div role="tablist" aria-label="Trong trang trò chuyện" className="grid flex-1 grid-cols-4 gap-[3px] rounded-[20px] bg-surface p-[5px] shadow-soft dark:ring-1 dark:ring-line">
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
                  // nhãn luôn một dòng (panel hẹp nhất 300px: mỗi thẻ ≈ 54px)
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-[15px] px-0.5 text-xs font-bold transition",
                  active ? "bg-brand text-brand-ink" : "text-muted hover:bg-bg hover:text-ink",
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
            className="grid size-11 shrink-0 place-items-center rounded-[14px] text-muted transition hover:bg-surface hover:text-ink hover:shadow-soft"
          >
            <ChevronDownIcon size={20} className={cn("transition-transform", !collapsed && "rotate-180")} />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Đóng" title="Đóng" className="grid size-11 shrink-0 place-items-center rounded-[14px] text-muted transition hover:bg-surface hover:text-ink hover:shadow-soft">
            <CloseIcon size={20} />
          </button>
        )}
      </div>


      {!collapsed && (
        <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab}`} className={cn(panelCard.card, fold && "animate-[fadein_.2s_ease]")}>
          {tab === "ghi-chu" && (
            <>
              <TabHead title="Trong cuộc trò chuyện này" desc="Điều bạn đã xác nhận, đã chọn hay đã thử." />
              <ChatPanelBody panel={panel} />
            </>
          )}
          {tab === "ky-nang" && <SkillList />}
          {tab === "lich-su" && <HistoryList history={history} currentId={currentId} />}
          {tab === "cai-dat" && (
            <>
              {/* đổi nhân vật nằm ở tên nhân vật đầu trang */}
              <TabHead title="Trò chuyện theo cách của bạn" desc={`Giọng văn và độ dài, áp dụng từ tin sau. Đổi nhân vật ở tên ${CHARACTERS[style.character].name} phía trên nhé.`} />
              <ChatStyleForm key={style.character + style.length + style.guidance + style.motivation} value={style} onSaved={onStyleSaved} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Đầu mỗi thẻ: tiêu đề chữ tròn + một dòng mô tả (chat-ui.ts) */
function TabHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className={panelCard.title}>{title}</h2>
      <p className={panelCard.desc}>{desc}</p>
    </div>
  );
}

/**
 * Các bài luyện theo 5 nhóm năng lực (như trang Kỹ năng); mở bài kèm ?tu=chat để ghi nguồn.
 * Mẫu 02/11: mỗi nhóm một khối pastel theo màu nhóm, tên thân thiện to + tên chính thức nhỏ; mỗi bài một ô trắng.
 */
function SkillList() {
  const groups = subskillsByCompetency(SKILL_IDS);
  return (
    <>
      <TabHead title="Luyện một kỹ năng" desc={`${SKILL_IDS.length} bài theo 5 nhóm năng lực.`} />
      <div className="mt-1">
        {CASEL5.map((c) => (
          <section key={c} className={cn(`tone-${CASEL[c].tone}`, "mt-2.5 rounded-[20px] bg-tint p-2.5")}>
            <h3 className="mx-0.5 mb-1.5 flex items-center gap-2 font-display text-base font-bold leading-tight text-tink">
              <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-surface text-base">
                {CASEL[c].emoji}
              </span>
              <span>{CASEL[c].name}</span>
            </h3>
            <ul className="space-y-1.5">
              {groups[c].map((s) => (
                <li key={s.id}>
                  <Link
                    href={`${subskillHref(s.id)}?tu=chat`}
                    className="flex min-h-11 items-center gap-2.5 rounded-[14px] bg-surface px-2.5 py-2 text-[13.5px] font-semibold leading-snug transition hover:shadow-[0_0_0_2px_var(--tmid)]"
                  >
                    <span aria-hidden className="w-[22px] shrink-0 text-center text-[17px]">
                      {SKILLS[s.id as keyof typeof SKILLS].emoji}
                    </span>
                    <span className="min-w-0">{s.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Link href="/ky-nang" className={panelCard.link}>
        Mở trang Luyện kỹ năng <span aria-hidden>→</span>
      </Link>
    </>
  );
}

function HistoryList({ history, currentId }: { history: ChatHistoryItem[]; currentId: string | null }) {
  return (
    <>
      <TabHead title="Các cuộc trò chuyện" desc={history.length ? `${history.length} cuộc gần đây, mới nhất ở trên.` : "Chưa có cuộc trò chuyện nào."} />
      <Link href="/chat/new" className={cn(btn.primary, "mt-3 w-full px-4 py-2 text-sm")}>
        <PlusIcon size={16} /> Trò chuyện mới
      </Link>
      {history.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {history.map((c) => (
            <li
              key={c.id}
              className={cn("flex items-center gap-1 rounded-2xl pr-1 transition", c.id === currentId ? "bg-c1" : "bg-bg hover:bg-surface-2")}
            >
              <Link href={`/chat/${c.id}`} aria-current={c.id === currentId ? "page" : undefined} className="min-w-0 flex-1 rounded-2xl py-2 pl-3 text-sm">
                <span className="block truncate font-bold">{c.title}</span>
                <span className="block text-xs text-muted">{c.when}</span>
              </Link>
              <DeleteConversationButton
                id={c.id}
                goBack={c.id === currentId}
                className="size-11 text-muted hover:bg-surface hover:text-danger"
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
