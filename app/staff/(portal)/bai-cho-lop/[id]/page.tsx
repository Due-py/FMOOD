import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePage } from "@/lib/permissions";
import { classLessonById } from "@/lib/class-content";
import { listClasses } from "@/lib/staff";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ClassLessonEditor } from "./ClassLessonEditor";

export const metadata: Metadata = { title: "Soạn bài cho lớp" };

export default async function ClassLessonEditPage({ params }: PageProps<"/staff/bai-cho-lop/[id]">) {
  const profile = await requirePage("/staff/bai-cho-lop");
  const { id } = await params;
  const isNew = id === "moi";
  if (!isNew && !z.uuid().safeParse(id).success) notFound();
  const [lesson, classes] = await Promise.all([isNew ? null : classLessonById(profile, id), listClasses(profile)]);
  if (!isNew && !lesson) notFound();
  if (!classes.length) notFound();

  return (
    <div>
      <Link href="/staff/bai-cho-lop" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Bài cho lớp
      </Link>
      <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight">{lesson ? "Sửa bài" : "Bài mới cho lớp"}</h1>
      <ClassLessonEditor lesson={lesson} classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
