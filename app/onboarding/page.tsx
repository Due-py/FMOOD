import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Làm quen với Mây" };

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboarded_at) redirect("/home");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 sm:px-6">
      <Onboarding nickname={profile.nickname} />
    </main>
  );
}
