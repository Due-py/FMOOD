import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { demoOn, demoRegistry } from "@/lib/demo/server";
import { SIM_CASES } from "@/lib/demo/simulate";
import { DemoStepFooter, DemoStepHeader } from "../DemoChrome";
import { SimulationBoard } from "./SimulationBoard";

export const metadata: Metadata = { title: "Trình diễn: khi có chuyện nguy hiểm" };

export default async function DangerPage() {
  await requireStaff(["admin"]);
  const [demo, registry] = await Promise.all([demoOn(), demoRegistry()]);
  return (
    <div className="space-y-8">
      <DemoStepHeader slug="nguy-hiem" demo={demo} hasData={Boolean(registry)} />
      <p className="max-w-3xl rounded-[var(--radius-card)] bg-surface-2 px-5 py-4 text-sm leading-relaxed">
        <strong>Không dùng câu nguy hiểm thật.</strong> Ở các tình huống giả lập, bước “nhận ra” được giả lập; mọi bước SAU đó chạy bằng đúng code và cài đặt
        thật: câu trả lời soạn sẵn, số điện thoại hỗ trợ, cách giấu nội dung với GVCN, nội dung email. Không email nào được gửi.
      </p>
      <SimulationBoard cases={SIM_CASES} demo={demo && Boolean(registry)} />
      <DemoStepFooter slug="nguy-hiem" />
    </div>
  );
}
