import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { isTestOnlyClass } from "@/lib/bai-do-server";
import { currentAssistant } from "@/lib/assistant";
import { AssistantProvider } from "@/components/mascot/AssistantContext";
import { PrivacyPromise } from "@/components/PrivacyPromise";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Làm quen với F-Mood" };

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboarded_at) redirect("/home");
  // lớp "chỉ làm bài đo": không giới thiệu app, vào thẳng trang bài đo
  if (await isTestOnlyClass(profile.class_id)) redirect("/bai-do");
  // trang này nằm ngoài layout học sinh: tự đặt nhân vật trò chuyện (mặc định admin đặt, ban đầu là Sóc)
  const { key, name, emoji } = await currentAssistant();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 sm:px-6">
      <AssistantProvider value={{ key, name, emoji }}>
        <Onboarding nickname={profile.nickname} />
        <PrivacyPromise />
      </AssistantProvider>
    </main>
  );
}
