import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { stepsLoop } from "@/lib/loop-content";
import { StepsView } from "./StepsView";

export const metadata: Metadata = { title: "Việc nhỏ" };

/** Bước 3 của vòng hỗ trợ: thử một việc nhỏ, và "Muốn kể với ai?" (gắn với chuyện bận lòng nếu có). */
export default async function TinyStepsPage({ searchParams }: PageProps<"/viec-nho">) {
  const profile = await requireProfile();
  const { chuyen } = await searchParams;
  const worryId = typeof chuyen === "string" && z.uuid().safeParse(chuyen).success ? chuyen : null;
  const loop = await stepsLoop(profile, worryId);
  // chưa có nội dung nào được bật cho lớp này
  if (!loop) redirect("/home");
  return <StepsView loop={loop} />;
}
