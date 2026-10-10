import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { allScenarios } from "@/lib/admin-data";
import { PageHeader } from "@/components/PageHeader";
import { MayPlayground } from "@/components/admin/MayPlayground";
import { ScenarioEditor, ScenarioTester } from "./ScenarioForms";

export const metadata: Metadata = { title: "Kịch bản" };

export default async function ScenariosPage() {
  await requireStaff(["admin"]);
  const scenarios = await allScenarios();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Mây" title="Kịch bản">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Hướng dẫn thầy cô soạn cho từng chủ đề hay gặp. Khi tin nhắn của học sinh có cụm từ nhận diện, Mây sẽ làm theo
          hướng dẫn đó thay vì tự nghĩ. Mỗi lần dùng tối đa 2 kịch bản khớp nhất.
        </p>
      </PageHeader>
      <ScenarioTester />
      <div className="space-y-4">
        {scenarios.map((s) => (
          <ScenarioEditor key={s.id} scenario={s} />
        ))}
        <ScenarioEditor scenario={null} />
      </div>
      <MayPlayground />
    </div>
  );
}
