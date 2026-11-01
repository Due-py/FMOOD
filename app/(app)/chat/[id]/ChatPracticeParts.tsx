"use client";

import Link from "next/link";
import { recordCardClick } from "@/app/actions/chat-style";
import type { OfferSkill, SelPanel } from "@/lib/sel/practice-offer";
import { isPanelEmpty } from "@/lib/sel/practice-offer";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/**
 * Thẻ "Muốn luyện một kỹ năng không?" (kế hoạch V2 mục 4). Máy chủ gắn khi học sinh đã đồng ý gỡ từng bước; chỉ GỢI Ý tối đa 2
 * kỹ năng, học sinh tự chọn. Bấm chọn chỉ mở trang chọn tình huống của kỹ năng đó (?tu=chat): không mang lời chat,
 * không tạo bài trước khi học sinh bấm "Bắt đầu". "Chưa biết chọn gì" mở danh sách Kỹ năng; "Tiếp tục trò chuyện" ẩn thẻ.
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
    return <p className="text-sm text-muted">Khi bạn xác nhận điều mình kể, chọn một cách hay chốt một bước nhỏ, mình ghi lại ở đây.</p>;
  }
  return (
    <div className="space-y-3 text-sm">
      {panel.confirmed.length > 0 && (
        <Block title="Bạn đã xác nhận">
          <ul className="space-y-1">
            {panel.confirmed.map((c) => (
              <li key={c.label}>
                <span className="text-muted">{c.label}: </span>“{c.text}”
              </li>
            ))}
          </ul>
        </Block>
      )}
      {panel.choice && <Block title="Cách bạn chọn">“{panel.choice}”</Block>}
      {panel.step && <Block title="Bước nhỏ bạn chốt">“{panel.step}”</Block>}
      {panel.tried.length > 0 && (
        <Block title="Đã thử">
          <ul className="space-y-1">
            {panel.tried.map((t) => (
              <li key={t.what}>
                “{t.what}” · {t.worked ? "có ích" : "chưa ổn"}
              </li>
            ))}
          </ul>
        </Block>
      )}
      <Link href="/ky-nang" className="inline-block font-semibold text-brand-strong underline underline-offset-4">
        Xem kỹ năng và bài đọc liên quan
      </Link>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** Panel trên điện thoại / màn vừa: ngăn kéo từ dưới lên, mở bằng nút "Ghi chú". */
export function ChatPanelSheet({ panel, onClose }: { panel: SelPanel | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:hidden" role="dialog" aria-modal="true" aria-label="Trong cuộc trò chuyện này" onClick={onClose}>
      <div
        className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Trong cuộc trò chuyện này</h2>
          <button type="button" onClick={onClose} className={cn(btn.ghost, "min-h-11 px-3")}>
            Đóng
          </button>
        </div>
        <ChatPanelBody panel={panel} />
      </div>
    </div>
  );
}
