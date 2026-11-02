import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/permissions";
import { allLessons } from "@/lib/admin-data";
import { topicBg } from "@/lib/lessons";
import { PageHeader } from "@/components/PageHeader";
import { PlusIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ImportLessonsButton } from "./ImportLessonsButton";

export const metadata: Metadata = { title: "Thư viện bài học" };

export default async function LessonsAdminPage({ searchParams }: PageProps<"/staff/content/lessons">) {
  await requirePage("/staff/content/lessons");
  const { lop } = await searchParams;
  const all = await allLessons();
  const grades = [...new Set(all.map((l) => l.grade))].sort((a, b) => (a ?? 0) - (b ?? 0));
  const grade = typeof lop === "string" ? lop : "";
  const lessons = grade ? all.filter((l) => String(l.grade ?? "khac") === grade) : all;

  // nhóm theo khối + chủ đề, giữ thứ tự
  const groups = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = `${l.grade ? `C${l.grade}` : "Mọi lớp"} · ${l.topic}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nội dung"
        title="Thư viện bài học"
        action={
          <Link href="/staff/content/lessons/new" className={btn.primary}>
            <PlusIcon size={18} /> Bài mới
          </Link>
        }
      >
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {all.length} bài, {all.reduce((s, l) => s + l.exercises.length, 0)} bài tập. Học sinh thấy bài ở trang Luyện kỹ năng khi bài
          đã đăng, đã duyệt và đã gắn năng lực CASEL (ở trang Duyệt bài thư viện). Nội dung từ sách có bản quyền cần được tóm tắt, diễn đạt lại và ghi nguồn.
        </p>
      </PageHeader>

      {all.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface-2 p-8 text-center">
          <p className="font-semibold">Chưa có bài học nào.</p>
          <p className="mt-1 text-sm text-muted">Tạo bài mới, hoặc nhập các bài có sẵn trong dự án (bài mẫu và bài chia từ sách Oxford 6–8).</p>
          <div className="mt-4 flex justify-center">
            <ImportLessonsButton />
          </div>
        </div>
      ) : (
        <>
          <nav aria-label="Lọc theo lớp" className="flex flex-wrap gap-2">
            {[{ v: "", label: `Tất cả (${all.length})` }, ...grades.map((g) => ({ v: String(g ?? "khac"), label: g ? `C${g} (${all.filter((l) => l.grade === g).length})` : "Mọi lớp" }))].map((t) => (
              <Link
                key={t.v}
                href={t.v ? `/staff/content/lessons?lop=${t.v}` : "/staff/content/lessons"}
                aria-current={grade === t.v ? "page" : undefined}
                className={cn("rounded-full px-4 py-2 text-sm font-semibold", grade === t.v ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink")}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {[...groups].map(([title, items]) => (
            <section key={title}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                {items.map((l) => (
                  <li key={l.id}>
                    <Link href={`/staff/content/lessons/${l.id}`} className={cn("flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2", !l.published && "opacity-60")}>
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl text-xl", topicBg(l.topic))} aria-hidden>
                        {l.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {[l.unit, `${l.exercises.length} bài tập`, l.published ? null : "Bản nháp"].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="text-sm text-muted">
            <ImportLessonsButton subtle />
          </div>
        </>
      )}
    </div>
  );
}
