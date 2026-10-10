import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { gardenPlants } from "@/lib/admin-data";
import { PageHeader } from "@/components/PageHeader";
import { PlantEditor } from "./PlantEditor";

export const metadata: Metadata = { title: "Khu vườn" };

export default async function GardenAdminPage() {
  await requireStaff(["admin"]);
  const plants = await gardenPlants();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nội dung" title="Khu vườn">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Học sinh nhận 💧 1 giọt nước mỗi lần làm một thói quen và mỗi ngày có check-in. Cây lớn qua từng giai đoạn
          theo số giọt nước, nở hoa thì thu hoạch vào bộ sưu tập. Đặt số giọt vừa phải để học sinh thấy tiến bộ trong
          1–3 tuần.
        </p>
      </PageHeader>

      <div className="space-y-4">
        {plants.map((p) => (
          <PlantEditor key={p.id} plant={p} />
        ))}
        <PlantEditor plant={null} />
      </div>
    </div>
  );
}
