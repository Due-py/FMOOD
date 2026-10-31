import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/permissions";
import { effectData } from "@/lib/effect/data";
import { demoOn } from "@/lib/demo/server";
import { demoSurveys } from "@/lib/demo/surveys";
import { listClasses } from "@/lib/staff";
import { isTestClass } from "@/lib/support-content-server";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { EffectReport } from "./EffectReport";

export const metadata: Metadata = { title: "Kết quả: app có giúp được không?" };

export default async function EffectPage() {
  const profile = await requirePage("/staff/research/hieu-qua");
  const [data, classes, demo] = await Promise.all([effectData(), listClasses(profile), demoOn()]);
  // lớp thật đang dùng F-Mood: gợi ý sẵn nhóm "dùng F-Mood" khi đọc file khảo sát.
  // Đang trình diễn: lớp mẫu, và phiếu khảo sát mẫu (có lớp mẫu không dùng app).
  const appClasses: string[] = [];
  if (demo) appClasses.push(...classes.map((c) => c.name));
  else for (const c of classes) if (!(await isTestClass(c.id))) appClasses.push(c.name);

  return (
    <div>
      <Link href="/staff/research" className={cn(btn.ghost, "-ml-3 mb-2 print:hidden")}>
        <ArrowLeft size={18} /> Kết quả nghiên cứu
      </Link>
      <EffectReport
        metrics={data.metrics}
        excludedTestStudents={data.excludedTestStudents}
        runs={data.runs}
        generatedAt={data.generatedAt}
        appClasses={appClasses}
        demoSurvey={demo ? demoSurveys() : null}
      />
    </div>
  );
}
