import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { EmergencyForm } from "./EmergencyForm";

export const metadata: Metadata = { title: "Khẩn cấp" };

export default async function EmergencyPage() {
  await requirePage("/staff/safety/emergency");
  const [crisis, meta] = await Promise.all([getSetting("safety.crisis"), getSettingMeta("safety.crisis")]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="An toàn" title="Khẩn cấp">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Khi phát hiện dấu hiệu nguy hiểm, AI <strong>không tự trả lời</strong>. Học sinh thấy đúng câu soạn sẵn dưới đây,
          kèm thẻ số điện thoại hỗ trợ. Nội dung này nên được giáo viên hướng dẫn duyệt.
          {meta.updatedBy && ` Sửa lần cuối bởi ${meta.updatedBy}.`}
        </p>
      </PageHeader>
      <EmergencyForm key={JSON.stringify(crisis)} initial={crisis} />
      <SettingHistory settingKey="safety.crisis" />
    </div>
  );
}
