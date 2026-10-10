import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, dayKey } from "@/lib/dates";
import { May } from "@/components/mascot/May";
import { PageHeader } from "@/components/PageHeader";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowUpRight, PlusIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { DeleteConversationButton } from "./DeleteConversationButton";

export const metadata: Metadata = { title: "Trò chuyện" };

export default async function ChatListPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const today = dayKey();

  return (
    <>
      <PageHeader
        eyebrow="Riêng tư giữa bạn và Mây"
        title="Trò chuyện"
        action={
          <Link href="/chat/new" className={btn.primary}>
            <PlusIcon size={18} /> Mới
          </Link>
        }
      />

      {!conversations || conversations.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <May size={130} mood="happy" />
          <SpeechBubble className="mt-4 max-w-sm rounded-bl-3xl">
            Có chuyện gì muốn kể không? Vui, buồn hay chẳng biết gọi tên là gì, Mây đều nghe hết.
          </SpeechBubble>
          <Link href="/chat/new" className={`${btn.primary} mt-6`}>
            Bắt đầu trò chuyện
          </Link>
        </div>
      ) : (
        <ul className="fm-stagger space-y-2">
          {conversations.map((c) => (
            <li key={c.id} className="group flex items-center gap-2 rounded-3xl border border-line bg-surface pr-2 transition hover:bg-surface-2">
              <Link href={`/chat/${c.id}`} data-cursor-label="Mở" className="flex min-w-0 flex-1 items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky text-lg" aria-hidden>
                  💬
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.title}</span>
                  <span className="text-sm text-muted">
                    {dayKey(c.updated_at) === today ? `Hôm nay, ${formatTime(c.updated_at)}` : formatDate(c.updated_at)}
                  </span>
                </span>
                <ArrowUpRight size={18} className="text-muted" />
              </Link>
              <DeleteConversationButton id={c.id} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-muted">
        Mây là AI nên đôi khi có thể trả lời chưa đúng. Thầy cô không đọc được trò chuyện của bạn,
        trừ đoạn có dấu hiệu nguy hiểm.
      </p>
    </>
  );
}
