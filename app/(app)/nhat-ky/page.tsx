import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import { journalEntries, journalPrompts } from "@/lib/journal";
import { JourneyShell } from "@/components/JourneyShell";
import { btn, card, cardHover } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { PrivacyNote, WeekReviewCard } from "./JournalParts";

export const metadata: Metadata = { title: "Nhật ký" };

/** Nhật ký của học sinh: các trang đã viết (mới trước), nút viết trang mới, "Nhìn lại tuần". Xem lib/journal-shared.ts. */
export default async function JournalPage() {
  const profile = await requireProfile();
  const [{ ready }, entries] = await Promise.all([journalPrompts(), journalEntries(profile.id)]);

  return (
    <JourneyShell active="/nhat-ky">
      <div className="mb-6">
        <PrivacyNote />
      </div>

      {!ready ? (
        <div role="status" className="rounded-[var(--radius-card)] bg-surface-2 p-5">
          <p className="font-semibold">Nhật ký chưa sẵn sàng.</p>
          <p className="mt-1 text-sm text-muted">Thầy cô đang chuẩn bị, bạn quay lại sau nhé.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Link href="/nhat-ky/viet" className={cn(btn.primary, "w-full py-4 text-lg")}>
            ✍️ Viết trang mới
          </Link>

          <WeekReviewCard />

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Các trang đã viết</h2>
            {entries.length === 0 ? (
              <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Chưa có trang nào. Chọn một câu mở đầu và viết vài dòng thôi cũng được.</p>
            ) : (
              <ul className="space-y-3">
                {entries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/nhat-ky/viet?id=${e.id}`} className={cn(card, cardHover, "block")}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {formatDate(e.created_at)} · {formatTime(e.created_at)}
                      </p>
                      {e.prompt_text && <p className="mt-1 text-sm font-semibold text-brand-strong dark:text-brand">{e.prompt_text}</p>}
                      <p className="mt-1 line-clamp-3 whitespace-pre-line">{e.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </JourneyShell>
  );
}
