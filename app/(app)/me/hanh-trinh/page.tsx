import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { journeyLoop } from "@/lib/loop-content";
import { May } from "@/components/mascot/May";
import { PageHeader } from "@/components/PageHeader";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { JourneyView } from "./JourneyView";

export const metadata: Metadata = { title: "Hành trình của mình" };

/** Bước 5 của vòng hỗ trợ: thấy mình tiến bộ, chỉ so với chính mình trước đây. */
export default async function JourneyPage() {
  const profile = await requireProfile();
  const loop = await journeyLoop(profile);
  // chưa có nội dung vòng hỗ trợ nào được bật cho lớp này
  if (!loop) redirect("/me");

  return (
    <div className="space-y-6">
      <Link href="/me" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Tôi
      </Link>
      <PageHeader eyebrow="Chỉ so với chính bạn" title="Hành trình của mình" />
      <div className="flex items-end gap-3">
        <May size={72} mood="caring" float={false} />
        <SpeechBubble className="mb-2 flex-1">
          {loop.worries.length
            ? "Đây là những bước bạn đã đi. Mình không so bạn với ai cả, chỉ với chính bạn hôm trước thôi."
            : "Khi bạn kể một chuyện bận lòng lúc check-in hay lúc trò chuyện, mình sẽ ghi lại ở đây để cùng xem nó thay đổi thế nào."}
        </SpeechBubble>
      </div>
      <JourneyView loop={loop} />
    </div>
  );
}
