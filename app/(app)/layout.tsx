import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/TabBar";
import { resolveAvatar } from "@/lib/avatar-server";
import { isTestOnlyClass } from "@/lib/bai-do-server";
import { currentAssistant } from "@/lib/assistant";
import { AssistantProvider } from "@/components/mascot/AssistantContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  // lớp "chỉ làm bài đo" (lớp so sánh): mọi trang học sinh chuyển về trang bài đo
  if (await isTestOnlyClass(profile.class_id)) redirect("/bai-do");
  if (!profile.onboarded_at) redirect("/onboarding");
  // nhân vật học sinh đã chọn (chưa chọn thì nhân vật mặc định admin đặt): mọi trang học sinh dùng tên này
  const { key, name, emoji } = await currentAssistant();

  return (
    <AssistantProvider value={{ key, name, emoji }}>
      {/* menu trái (≥ 768px) chiếm 76px, từ 1024px là 220px; điện thoại: thanh trên + thanh dưới (kế hoạch V2 mục 10.2).
          Nội dung nằm sát menu trái (không căn giữa); trang có panel phải thì từ 1280px chừa đúng độ rộng panel (--right-panel-w)
          cho panel neo mép phải. Thường 300px. Học cùng AI (panel 4 thẻ, nhiều chữ hơn): khung chat giữ 768px dễ đọc, panel lấy
          phần còn lại = 100vw − menu 220 − lề 64 − chat 768 (≈ 1060), kẹp 320–440px: 1280 → 320 (chat 676), 1440 → 380, ≥ 1500 → 440.
          Panel thu gọn (data-collapsed) chỉ còn dải icon 64px. */}
      <div className="[--right-panel-w:300px] has-[[data-chat-page]]:[--right-panel-w:clamp(320px,calc(100vw_-_1060px),440px)] has-[[data-right-panel][data-collapsed]]:[--right-panel-w:64px] md:pl-[76px] lg:pl-[220px] xl:has-[[data-right-panel]]:pr-[var(--right-panel-w)]">
        <TabBar avatar={await resolveAvatar(profile.avatar)} />
        <main className="w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-8 has-[[data-chat-page]]:max-w-none">
          {/* chuyển trang mượt (hiệu ứng mờ dần của trình duyệt) */}
          <ViewTransition>{children}</ViewTransition>
        </main>
      </div>
    </AssistantProvider>
  );
}
