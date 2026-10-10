import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { lessonById } from "@/lib/admin-data";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { LessonEditor } from "./LessonEditor";

export const metadata: Metadata = { title: "Soạn bài học" };

export default async function LessonEditPage({ params }: PageProps<"/staff/content/lessons/[id]">) {
  await requireStaff(["admin"]);
  const { id } = await params;
  const lesson = id === "new" ? null : z.uuid().safeParse(id).success ? await lessonById(id) : null;
  if (id !== "new" && !lesson) notFound();

  return (
    <div>
      <Link href="/staff/content/lessons" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Thư viện bài học
      </Link>
      <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight">{lesson ? "Sửa bài học" : "Bài học mới"}</h1>
      <LessonEditor lesson={lesson} />
    </div>
  );
}
