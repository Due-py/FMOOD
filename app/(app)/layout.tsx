import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/TabBar";
import { resolveAvatar } from "@/lib/avatar-server";
import { isTestOnlyClass } from "@/lib/bai-do-server";
import { currentAssistant } from "@/lib/assistant";
import { AssistantProvider } from "@/components/mascot/AssistantContext";
import { dayKey, startOfDayIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  // lớp "chỉ làm bài đo" (lớp so sánh): mọi trang học sinh chuyển về trang bài đo
  if (await isTestOnlyClass(profile.class_id)) redirect("/bai-do");
  if (!profile.onboarded_at) redirect("/onboarding");
  // nhân vật học sinh đã chọn (chưa chọn thì nhân vật mặc định admin đặt): mọi trang học sinh dùng tên này
  const { key, name, emoji } = await currentAssistant();
  // hôm nay đã ghi tâm trạng chưa: header chỉ hiện nút "Check-in" khi chưa ghi
  const { count } = await (await createClient())
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", startOfDayIso(dayKey()));

  return (
    <AssistantProvider value={{ key, name, emoji }}>
      <div className="md:pt-20">
        <TabBar avatar={await resolveAvatar(profile.avatar)} checkedToday={(count ?? 0) > 0} />
        <main className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 sm:px-6 md:pb-16 md:pt-12">
          {/* chuyển trang mượt (hiệu ứng mờ dần của trình duyệt) */}
          <ViewTransition>{children}</ViewTransition>
        </main>
      </div>
    </AssistantProvider>
  );
}
