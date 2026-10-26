import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { SupportCard } from "@/components/SupportCard";
import { HelpRequest } from "./HelpRequest";
import { TalkRequest } from "./TalkRequest";

export const metadata: Metadata = { title: "Cần giúp ngay" };

/** Trang luôn mở được từ nút "Cần giúp" ở mọi trang: số gọi khẩn cấp + báo thầy cô + hẹn nói chuyện (không gấp). */
export default async function HelpPage() {
  const profile = await requireProfile();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="fm-rise">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Cần người giúp ngay?</h1>
        <p className="mt-2 text-muted">
          Nếu bạn hoặc bạn bè đang gặp nguy hiểm, hãy gọi <strong className="text-ink">115</strong> hoặc nói ngay với
          người lớn gần nhất. Bạn không phải tự mình vượt qua chuyện này.
        </p>
      </header>
      <SupportCard tone="urgent" helpLink={false} />
      <HelpRequest />
      <TalkRequest hasClass={Boolean(profile.class_id)} />
    </div>
  );
}
