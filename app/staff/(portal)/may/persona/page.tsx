import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { PersonaForm } from "./PersonaForm";

export const metadata: Metadata = { title: "Nhân vật" };

export default async function PersonaPage() {
  await requireStaff(["admin"]);
  const [persona, meta] = await Promise.all([getSetting("ai.persona"), getSettingMeta("ai.persona")]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Mây" title="Nhân vật">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tính cách và giọng nói của Mây khi trò chuyện với học sinh.
          {meta.updatedBy && ` Sửa lần cuối bởi ${meta.updatedBy}.`}
        </p>
      </PageHeader>
      <PersonaForm key={JSON.stringify(persona)} initial={persona} />
      <SettingHistory settingKey="ai.persona" />
    </div>
  );
}
