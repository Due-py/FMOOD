import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { journeyLoop } from "@/lib/loop-content";
import { skillJourney } from "@/lib/practice/review";
import { practiceJourney } from "@/lib/practice/server";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { PageHeader } from "@/components/PageHeader";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { JourneyView } from "./JourneyView";
import { SkillJourney } from "./SkillJourney";

export const metadata: Metadata = { title: "Hành trình của mình" };

/** Bước 5 của vòng hỗ trợ: thấy mình tiến bộ, chỉ so với chính mình trước đây. */
export default async function JourneyPage() {
  const profile = await requireProfile();
  const [loop, practice] = await Promise.all([journeyLoop(profile), practiceJourney(profile.id)]);
  // mục 4.3: hành trình theo kỹ năng K1–K4 (chỉ của chính bạn)
  const skills = skillJourney(practice.rows);
  // chưa có nội dung vòng hỗ trợ nào được bật cho lớp này và chưa luyện kỹ năng nào
  if (!loop && !practice.rows.length) redirect("/me");

  return (
    <div className="space-y-6">
      <Link href="/me" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Tôi
      </Link>
      <PageHeader eyebrow="Chỉ so với chính bạn" title="Hành trình của mình" />
      <div className="flex items-end gap-3">
        <CharacterAvatar size={72} mood="caring" float={false} />
        <SpeechBubble className="mb-2 flex-1">
          {loop?.worries.length || practice.rows.length
            ? "Đây là những bước bạn đã đi. Mình không so bạn với ai cả, chỉ với chính bạn hôm trước thôi."
            : "Khi bạn kể một chuyện bận lòng lúc check-in hay lúc trò chuyện, mình sẽ ghi lại ở đây để cùng xem nó thay đổi thế nào."}
        </SpeechBubble>
      </div>
      {practice.ready && <SkillJourney skills={skills} />}
      {loop && <JourneyView loop={loop} />}
    </div>
  );
}
