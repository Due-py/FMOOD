import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listClassLessons } from "@/lib/class-content";
import { listClasses } from "@/lib/staff";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { PageHeader } from "@/components/PageHeader";
import { PlusIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../NotReady";
import { LessonRowActions } from "./LessonRowActions";
import { classLabel } from "@/lib/class-tools";

export const metadata: Metadata = { title: "Bài cho lớp" };

export default async function ClassLessonsPage() {
  const profile = await requireStaff(["teacher", "admin"]);
  const [{ ready, items }, classes] = await Promise.all([listClassLessons(profile), listClasses(profile)]);
  const canWrite = classes.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lớp học"
        title="Bài cho lớp"
        action={
          ready && canWrite ? (
            <Link href="/staff/bai-cho-lop/moi" className={btn.primary}>
              <PlusIcon size={18} /> Soạn bài mới
            </Link>
          ) : undefined
        }
      >
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Bài ngắn thầy cô soạn riêng cho lớp mình. Học sinh lớp đó thấy bài trong Thư viện, mục “Bài của lớp mình”. Câu trả lời của
          các em là riêng tư; thầy cô chỉ thấy số bạn đã làm (từ {MIN_GROUP} bạn trở lên).
        </p>
      </PageHeader>

      {!ready ? (
        <NotReady />
      ) : !canWrite ? (
        <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Thầy cô chưa được gán lớp chủ nhiệm nào.</p>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-butter p-8 text-center">
          <p className="text-3xl" aria-hidden>
            📝
          </p>
          <p className="mt-2 font-semibold">Chưa có bài nào.</p>
          <p className="mt-1 text-sm text-muted">Một bài ngắn 5 phút đọc, kèm 1–2 câu hỏi là đủ.</p>
          <Link href="/staff/bai-cho-lop/moi" className={cn(btn.primary, "mt-4")}>
            Soạn bài đầu tiên
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-butter text-2xl" aria-hidden>
                {l.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/staff/bai-cho-lop/${l.id}`} className="font-display text-lg font-bold tracking-tight hover:underline">
                  {l.title}
                </Link>
                <p className="text-sm text-muted">
                  {classLabel(l.class_name ?? "")} ·{" "}
                  <span className={cn("font-semibold", l.published ? "text-brand-strong dark:text-brand" : "text-ink")}>
                    {l.published ? "Đã đăng" : "Nháp"}
                  </span>{" "}
                  · {l.responses >= MIN_GROUP ? `${l.responses} bạn đã làm` : l.responses > 0 ? `dưới ${MIN_GROUP} bạn đã làm` : "chưa ai làm"}
                  {profile.role === "admin" && l.author_name && ` · ${l.author_name}`}
                </p>
              </div>
              <LessonRowActions id={l.id} title={l.title} published={l.published} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
