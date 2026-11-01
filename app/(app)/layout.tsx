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
          phần còn lại = 100vw − menu 220 − lề 64 − chat 768 − 20 (≈ 1080), kẹp 300–360px (Duy 01/11: hẹp lại một chút):
          1280 → 300 (chat 696), 1366 → 300, ≥ 1440 → 360.
          Panel thu gọn lên trên (chỉ còn thanh thẻ, data-collapsed) thì thôi chừa chỗ: khung chat trượt về giữa vùng rộng hơn
          (Duy 01/11). Thanh đầu khung chat chỉ có nút bên trái nên thanh thẻ ở góc phải không che gì. */}
      <div className="[--right-panel-w:300px] has-[[data-chat-page]]:[--right-panel-w:clamp(300px,calc(100vw_-_1080px),360px)] md:pl-[76px] lg:pl-[220px] xl:transition-[padding] xl:duration-300 xl:has-[[data-right-panel]:not([data-collapsed])]:pr-[var(--right-panel-w)]">
        <TabBar avatar={await resolveAvatar(profile.avatar)} />
        <main className="w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-8 has-[[data-chat-page]]:max-w-none">
          {/* Không bọc ViewTransition nữa (01/11): hiệu ứng mờ dần 0,35 giây làm nội dung thật hiện muộn sau khung
              "đang tải" (loading.tsx), đo trên máy: Kỹ năng 0,87 giây có hiệu ứng, 0,47 giây không có. Khung đang tải đã cho phản hồi ngay. */}
          {children}
        </main>
      </div>
    </AssistantProvider>
  );
}
