"use client";

import Link from "next/link";
import { useEffect } from "react";
import { recordCardClick } from "@/app/actions/chat-style";
import type { OfferSkill, SelPanel } from "@/lib/sel/practice-offer";
import { isPanelEmpty } from "@/lib/sel/practice-offer";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { MascotArt } from "@/components/mascot/MascotArt";
import { SKILLS } from "@/lib/skills";
import { panelCard, skillTone, ticket } from "./chat-ui";

/**
 * Thẻ "Muốn luyện một kỹ năng không?" (kế hoạch V2 mục 4). Máy chủ gắn khi học sinh đã đồng ý gỡ từng bước; chỉ GỢI Ý tối đa 2
 * kỹ năng, học sinh tự chọn. Bấm chọn chỉ mở trang chọn tình huống của kỹ năng đó (?tu=chat): không mang lời chat,
 * không tạo bài trước khi học sinh bấm "Bắt đầu". "Chưa biết chọn gì" mở danh sách Kỹ năng; "Tiếp tục trò chuyện" ẩn thẻ.
 * Dưới mỗi kỹ năng: bài đọc thư viện đã duyệt nối với kỹ năng đó (nếu có), máy chủ gắn.
 */
export function PracticeOfferCard({ skills, onContinue }: { skills: OfferSkill[]; onContinue: () => void }) {
  // mẫu tro-chuyen-dang-noi.html: thẻ "vé" viền đứt, ô 🎯 nghiêng, mỗi kỹ năng một hàng pastel theo nhóm năng lực
  return (
    <section aria-label="Gợi ý luyện kỹ năng" className={cn(ticket, "mt-3 max-w-[540px] animate-[fadein_.3s_ease] sm:ml-[42px]")}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-12 shrink-0 -rotate-6 place-items-center rounded-[17px] bg-brand-soft text-[25px]">
          🎯
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-tight sm:text-xl">Muốn luyện một kỹ năng không?</p>
          <p className="mt-px text-[13.5px] text-muted">Đây chỉ là gợi ý. Bạn chọn, hoặc cứ trò chuyện tiếp nhé.</p>
        </div>
      </div>
      {skills.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {skills.map((s) => (
            <li key={s.id} className={skillTone(s.id)}>
              <Link
                href={`/ky-nang/${s.slug}?tu=chat`}
                onClick={() => void recordCardClick("skill", "open", s.id).catch(() => {})}
                className="flex min-h-11 items-center gap-2.5 rounded-[18px] bg-tint p-2 font-bold text-tink transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_0_0_2px_var(--tmid)] motion-reduce:hover:translate-y-0"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-surface text-[21px]">
                  {SKILLS[s.id].emoji}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{s.name}</span>
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface font-extrabold">
                  →
                </span>
              </Link>
              {/* bài đọc đã duyệt nối với kỹ năng này (cùng kiểu nút bài đọc ở trang Luyện kỹ năng) */}
              {s.readings && s.readings.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1 text-[13px] text-muted">
                  <span>📖 Bài đọc:</span>
                  {s.readings.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/library/${r.slug}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sky px-3 py-1.5 text-[13px] font-bold text-sky-ink transition hover:shadow-[0_0_0_2px_var(--c3-mid)]"
                    >
                      <span aria-hidden>{r.emoji}</span> {r.title}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <Link href="/ky-nang" className={cn(btn.primary, "px-4 py-2 text-sm")}>
          {skills.length ? "Chưa biết chọn gì" : "Chọn kỹ năng"}
        </Link>
        <button type="button" onClick={onContinue} className="min-h-11 px-1 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
          Tiếp tục trò chuyện
        </button>
      </div>
    </section>
  );
}

/** Nội dung panel "Trong cuộc trò chuyện này": chỉ điều học sinh đã xác nhận / đã chọn (lib/sel/practice-offer.ts selPanel). */
export function ChatPanelBody({ panel }: { panel: SelPanel | null }) {
  if (!panel || isPanelEmpty(panel)) {
    // mẫu: nhân vật nhỏ "nói" lời nhắc trong bong bóng tím nhạt
    return (
      <div className="mt-3 flex items-start gap-2.5">
        <MascotArt size={52} className="-mt-1" />
        <p className="rounded-2xl rounded-bl-[4px] bg-c1 px-3 py-2.5 text-[13.5px]">
          Khi bạn xác nhận điều mình kể, chọn một cách hay chốt một bước nhỏ, mình ghi lại ở đây nha 📌
        </p>
      </div>
    );
  }
  // mỗi điều một ô pastel có biểu tượng; nhãn nhỏ đậm cùng màu
  return (
    <>
      <div className="mt-3 space-y-3">
        {panel.confirmed.length > 0 && (
          <Block title="Bạn đã xác nhận">
            {panel.confirmed.map((c) => (
              <Note key={c.label} {...(CONFIRMED_LOOK[c.label] ?? { tone: "tone-3", emoji: "📌" })} label={c.label}>
                “{c.text}”
              </Note>
            ))}
          </Block>
        )}
        {panel.choice && (
          <Block title="Cách bạn chọn">
            <Note tone="tone-2" emoji="🧭">
              “{panel.choice}”
            </Note>
          </Block>
        )}
        {panel.step && (
          <Block title="Bước nhỏ bạn chốt">
            <Note tone="tone-5" emoji="👣">
              “{panel.step}”
            </Note>
          </Block>
        )}
        {panel.tried.length > 0 && (
          <Block title="Đã thử">
            {panel.tried.map((t) => (
              <Note key={t.what} tone={t.worked ? "tone-2" : "tone-4"} emoji={t.worked ? "✅" : "🔁"} label={t.worked ? "có ích" : "chưa ổn"}>
                “{t.what}”
              </Note>
            ))}
          </Block>
        )}
      </div>
      <Link href="/ky-nang" className={panelCard.link}>
        Xem kỹ năng và bài đọc liên quan <span aria-hidden>→</span>
      </Link>
    </>
  );
}

/** màu + biểu tượng theo loại điều đã xác nhận (nhãn từ lib/sel/practice-offer.ts) */
const CONFIRMED_LOOK: Record<string, { tone: string; emoji: string }> = {
  "Chuyện xảy ra": { tone: "tone-3", emoji: "📌" },
  "Cảm xúc": { tone: "tone-4", emoji: "💭" },
  "Điều bạn nghĩ": { tone: "tone-1", emoji: "💡" },
  "Cơ thể": { tone: "tone-2", emoji: "🫀" },
};

function Note({ tone, emoji, label, children }: { tone: string; emoji: string; label?: string; children: React.ReactNode }) {
  return (
    <li className={cn(tone, "flex items-start gap-2.5 rounded-2xl bg-tint py-2 pl-2 pr-3 text-sm leading-snug")}>
      <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-surface text-base">
        {emoji}
      </span>
      <span className="min-w-0 pt-px">
        {label && <span className="block text-xs font-bold text-tink">{label}</span>}
        {children}
      </span>
    </li>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={panelCard.group}>{title}</h3>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

/** Panel trên điện thoại / màn vừa (< 1280px): ngăn kéo từ dưới lên, mở bằng nút "Thêm"; bên trong là 4 thẻ của panel phải. */
// Duy 01/11 (cửa sổ hẹp trông xấu: thẻ trắng 512px nổi giữa màn, hàng "Đóng" riêng): từ 640px là ngăn kéo trượt ra từ
// mép phải, cao hết màn, rộng 360px, nền kem như ngăn kéo khu Kỹ năng; điện thoại là tấm kéo lên từ dưới, rộng hết màn, có
// vạch kéo. Thanh thẻ + nút ✕ chung một hàng, dính khi cuộn (ChatSideTabs onClose). Esc hoặc bấm ra ngoài thì đóng.
export function ChatPanelSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 animate-[fadein_.15s_ease] bg-ink/25 dark:bg-black/50 xl:hidden" role="dialog" aria-modal="true" aria-label="Ghi chú, kỹ năng, lịch sử, cài đặt" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[26px] bg-bg px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgb(61_52_80/0.2)] sm:inset-y-0 sm:left-auto sm:max-h-none sm:w-[min(380px,90vw)] sm:rounded-l-[26px] sm:rounded-tr-none sm:px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-11 rounded-full bg-line sm:hidden" />
        {children}
      </div>
    </div>
  );
}
