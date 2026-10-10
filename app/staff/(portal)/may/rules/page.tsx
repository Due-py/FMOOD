import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { RulesForm } from "./RulesForm";

export const metadata: Metadata = { title: "Lời dặn" };

export default async function RulesPage() {
  await requireStaff(["admin"]);
  const [rules, persona, meta] = await Promise.all([getSetting("ai.rules"), getSetting("ai.persona"), getSettingMeta("ai.rules")]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Mây" title="Lời dặn">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          “Luật chơi” Mây luôn làm theo: vai trò và những điều không bao giờ làm. Phần tính cách, cách xưng hô nằm ở mục
          Nhân vật. Hai luật chống “dụ” phá luật luôn được giữ cố định, không sửa được.
          {meta.updatedBy && ` Sửa lần cuối bởi ${meta.updatedBy}.`}
        </p>
      </PageHeader>
      <RulesForm initial={rules.text} persona={persona} />
    </div>
  );
}
