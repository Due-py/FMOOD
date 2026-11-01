"use client";

import Link from "next/link";
import { useEffect } from "react";
import { recordCardClick } from "@/app/actions/chat-style";
import type { OfferSkill, SelPanel } from "@/lib/sel/practice-offer";
import { isPanelEmpty } from "@/lib/sel/practice-offer";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { side } from "./side-styles";

/**
 * Thẻ "Muốn luyện một kỹ năng không?" (kế hoạch V2 mục 4). Máy chủ gắn khi học sinh đã đồng ý gỡ từng bước; chỉ GỢI Ý tối đa 2
 * kỹ năng, học sinh tự chọn. Bấm chọn chỉ mở trang chọn tình huống của kỹ năng đó (?tu=chat): không mang lời chat,
 * không tạo bài trước khi học sinh bấm "Bắt đầu". "Chưa biết chọn gì" mở danh sách Kỹ năng; "Tiếp tục trò chuyện" ẩn thẻ.
 * Dưới mỗi kỹ năng: bài đọc thư viện đã duyệt nối với kỹ năng đó (nếu có), máy chủ gắn.
 */
export function PracticeOfferCard({ skills, onContinue }: { skills: OfferSkill[]; onContinue: () => void }) {
  return (
    <section aria-label="Gợi ý luyện kỹ năng" className="mt-3 max-w-[85%] animate-[fadein_.3s_ease] rounded-[var(--radius-card)] border border-brand-edge bg-surface p-4">
      <p className="font-semibold">Muốn luyện một kỹ năng không?</p>
      <p className="text-sm text-muted">Đây chỉ là gợi ý. Bạn chọn, hoặc cứ trò chuyện tiếp.</p>
      {skills.length > 0 && (
        <ul className="mt-3 space-y-2">
          {skills.map((s) => (
            <li key={s.id}>
              <Link
                href={`/ky-nang/${s.slug}?tu=chat`}
                onClick={() => void recordCardClick("skill", "open", s.id).catch(() => {})}
                className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-brand-soft px-3 py-2 font-semibold text-brand-strong transition hover:brightness-95"
              >
                {s.name}
                <span aria-hidden>→</span>
              </Link>
              {/* bài đọc đã duyệt nối với kỹ năng này (cùng kiểu nút bài đọc ở trang Luyện kỹ năng) */}
              {s.readings && s.readings.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
                  <span className="text-sm text-muted">Bài đọc:</span>
                  {s.readings.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/library/${r.slug}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sky px-3 py-1.5 text-sm font-semibold text-sky-ink transition hover:brightness-95"
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href="/ky-nang" className={cn(btn.secondary, "px-4 py-2 text-sm")}>
          {skills.length ? "Chưa biết chọn gì" : "Chọn kỹ năng"}
        </Link>
        <button type="button" onClick={onContinue} className="min-h-11 px-2 text-sm text-muted underline underline-offset-4 hover:text-ink">
          Tiếp tục trò chuyện
        </button>
      </div>
    </section>
  );
}

/** Nội dung panel "Trong cuộc trò chuyện này": chỉ điều học sinh đã xác nhận / đã chọn (lib/sel/practice-offer.ts selPanel). */
export function ChatPanelBody({ panel }: { panel: SelPanel | null }) {
  if (!panel || isPanelEmpty(panel)) {
    return <p className={cn(side.text, "text-muted")}>Khi bạn xác nhận điều mình kể, chọn một cách hay chốt một bước nhỏ, mình ghi lại ở đây.</p>;
  }
  // cùng chuẩn với các thẻ khác (side-styles.ts): tên nhóm 12px in hoa, mỗi điều một dòng 14px, chữ phụ 12px
  return (
    <>
      <div className="space-y-4">
        {panel.confirmed.length > 0 && (
          <Block title="Bạn đã xác nhận">
            {panel.confirmed.map((c) => (
              <li key={c.label} className={cn(side.text, "py-1.5")}>
                <span className={side.rowSub}>{c.label}</span>“{c.text}”
              </li>
            ))}
          </Block>
        )}
        {panel.choice && (
          <Block title="Cách bạn chọn">
            <li className={cn(side.text, "py-1.5")}>“{panel.choice}”</li>
          </Block>
        )}
        {panel.step && (
          <Block title="Bước nhỏ bạn chốt">
            <li className={cn(side.text, "py-1.5")}>“{panel.step}”</li>
          </Block>
        )}
        {panel.tried.length > 0 && (
          <Block title="Đã thử">
            {panel.tried.map((t) => (
              <li key={t.what} className={cn(side.text, "py-1.5")}>
                “{t.what}”<span className={side.rowSub}>{t.worked ? "có ích" : "chưa ổn"}</span>
              </li>
            ))}
          </Block>
        )}
      </div>
      <Link href="/ky-nang" className={cn(side.action, "mt-3")}>
        Xem kỹ năng và bài đọc liên quan <span aria-hidden>→</span>
      </Link>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={side.group}>{title}</h3>
      <ul className={side.list}>{children}</ul>
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
    <div className="fixed inset-0 z-50 animate-[fadein_.15s_ease] bg-ink/25 xl:hidden" role="dialog" aria-modal="true" aria-label="Ghi chú, kỹ năng, lịch sử, cài đặt" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[1.5rem] bg-bg px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:inset-y-0 sm:left-auto sm:max-h-none sm:w-[min(360px,90vw)] sm:rounded-l-[1.5rem] sm:rounded-tr-none sm:border-l sm:border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        {children}
      </div>
    </div>
  );
}
