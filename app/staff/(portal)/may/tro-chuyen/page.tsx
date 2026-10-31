import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getStyleSettings } from "@/lib/assistant";
import { getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { ChatStyleForms } from "./ChatStyleForms";

export const metadata: Metadata = { title: "Tùy chọn trò chuyện" };

/**
 * Nhân vật và tùy chọn trò chuyện (kế hoạch Demo 3, Bước 9.5): giọng điệu, câu giới thiệu từng nhân vật; câu chữ các mức;
 * mức mặc định từng nhóm. Tên, emoji nhân vật và giới hạn độ dài cố định trong mã (chỉ hiện để xem).
 */
export default async function ChatStylePage() {
  await requirePage("/staff/may/tro-chuyen");
  const [styles, meta] = await Promise.all([getStyleSettings(), getSettingMeta("style.characters")]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Trợ lý AI" title="Tùy chọn trò chuyện">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Học sinh chọn người trò chuyện (Sóc, Cú, Kiến) và cách trò chuyện ngay ở đầu trang Trò chuyện. Lựa chọn chỉ đổi giọng văn và
          độ dài, không đổi quy tắc: nguyên tắc an toàn, QT, HL và giới hạn khóa luôn thắng. Học sinh chưa chọn thì dùng mức mặc định
          ở đây; câu khẩn cấp soạn sẵn không đổi theo nhân vật.
          {meta.updatedBy && ` Nhân vật sửa lần cuối bởi ${meta.updatedBy}.`}
        </p>
      </PageHeader>
      <ChatStyleForms
        initial={styles}
        histories={{
          characters: <SettingHistory settingKey="style.characters" />,
          lengths: <SettingHistory settingKey="style.lengths" />,
          guidance: <SettingHistory settingKey="style.guidance" />,
          motivation: <SettingHistory settingKey="style.motivation" />,
        }}
      />
    </div>
  );
}
