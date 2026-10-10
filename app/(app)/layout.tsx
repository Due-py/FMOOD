import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/TabBar";
import { resolveAvatar } from "@/lib/avatar-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (!profile.onboarded_at) redirect("/onboarding");

  return (
    <div className="md:pt-20">
      <TabBar avatar={await resolveAvatar(profile.avatar)} />
      <main className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 sm:px-6 md:pb-16 md:pt-12">
        {/* chuyển trang mượt (hiệu ứng mờ dần của trình duyệt) */}
        <ViewTransition>{children}</ViewTransition>
      </main>
    </div>
  );
}
