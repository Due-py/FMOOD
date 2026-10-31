import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { demoOn } from "@/lib/demo/server";
import { DemoStepFooter, DemoStepHeader } from "../DemoChrome";
import { TracePlayground } from "./TracePlayground";

export const metadata: Metadata = { title: "Trình diễn: Trợ lý hiểu tin nhắn thế nào" };

export default async function TracePage() {
  await requirePage("/staff/trinh-dien");
  const demo = await demoOn();
  return (
    <div className="space-y-8">
      {/* phần này không cần dữ liệu mẫu */}
      <DemoStepHeader slug="may-nghi" demo={demo} hasData />
      <TracePlayground />
      <DemoStepFooter slug="may-nghi" />
    </div>
  );
}
