import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getMemories } from "@/lib/may-memory";
import { getChatPreferences } from "@/lib/personalize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Concern } from "@/lib/may-memory-shared";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "@/components/ui/icons";
import { btn, card } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ChatMemory } from "../ChatMemory";
import { ConcernList, MemoryList } from "./MemoryManager";

export const metadata: Metadata = { title: "Những điều Mây ghi nhớ" };

export default async function MemoryPage() {
  const profile = await requireProfile();
  const [memories, { data: concerns }, prefs] = await Promise.all([
    getMemories(profile.id),
    // cả điều đã ổn, để bạn xem lại hành trình của mình
    createAdminClient()
      .from("student_concerns")
      .select("id, title, intensity, status, next_check_at, last_checked_at, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    getChatPreferences(profile.id),
  ]);

  return (
    <div>
      <Link href="/me" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Tôi
      </Link>
      <PageHeader eyebrow="Chỉ mình bạn xem được" title="Những điều Mây ghi nhớ về bạn" />

      <div className="fm-stagger space-y-4">
        <section className={card}>
          <h2 className="font-display text-xl font-bold tracking-tight">Điều Mây nhớ</h2>
          <p className="mb-4 text-sm text-muted">
            Mây dùng những điều này ở mọi cuộc trò chuyện. Sửa hoặc xóa lúc nào cũng được, xóa xong Mây sẽ không dùng nữa.
          </p>
          <MemoryList memories={memories} />
        </section>

        <section className={card}>
          <h2 className="font-display text-xl font-bold tracking-tight">Điều bận lòng</h2>
          <p className="mb-4 text-sm text-muted">
            Những chuyện bạn đã cho Mây lưu. Cứ vài hôm Mây sẽ hỏi thăm lại, cho đến khi bạn thấy ổn.
          </p>
          <ConcernList concerns={(concerns ?? []) as Concern[]} />
        </section>

        <section className={card}>
          <h2 className="font-display text-xl font-bold tracking-tight">Cách trò chuyện</h2>
          <p className="mb-3 text-sm text-muted">Mây điều chỉnh theo phản hồi 👍/👎 của riêng bạn.</p>
          <ChatMemory reasons={prefs.reasons} ups={prefs.ups} downs={prefs.downs} />
        </section>

        <p className="px-2 text-center text-xs text-muted">
          Thầy cô không xem được trang này. Nếu bạn đang gặp chuyện quá sức, hãy kể với thầy cô hoặc gọi 111.
        </p>
      </div>
    </div>
  );
}
