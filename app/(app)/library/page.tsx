import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getLessons, topicBg } from "@/lib/lessons";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { RoundArrow } from "@/components/ui/ArrowLink";
import { Tilt } from "@/components/motion/Tilt";
import { card, cardHover } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Thư viện" };

const GRADES = [
  { value: "tat-ca", label: "Tất cả" },
  { value: "6", label: "Lớp 6" },
  { value: "7", label: "Lớp 7" },
  { value: "8", label: "Lớp 8" },
];

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const { lop } = await searchParams;
  const all = await getLessons();

  // mặc định mở đúng khối của lớp học sinh (nếu có bài cho khối đó)
  let grade = typeof lop === "string" ? lop : "";
  if (!grade) {
    const profile = await requireProfile();
    const { data: cls } = profile.class_id
      ? await (await createClient()).from("classes").select("grade").eq("id", profile.class_id).maybeSingle()
      : { data: null };
    grade = cls?.grade && all.some((l) => l.grade === cls.grade) ? String(cls.grade) : "tat-ca";
  }
  // bài không ghi lớp hiện ở mọi khối
  const lessons = grade === "tat-ca" ? all : all.filter((l) => l.grade === null || String(l.grade) === grade);

  // nhóm theo khối + chủ đề, giữ nguyên thứ tự xuất hiện
  const topics = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = grade === "tat-ca" && l.grade ? `Lớp ${l.grade} · ${l.topic}` : l.topic;
    topics.set(key, [...(topics.get(key) ?? []), l]);
  }

  return (
    <>
      <PageHeader eyebrow="Well-being cho học sinh" title="Thư viện" />

      <nav aria-label="Lọc theo lớp" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {GRADES.map((g) => (
          <Link
            key={g.value}
            href={`/library?lop=${g.value}`}
            aria-current={grade === g.value ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              grade === g.value ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {g.label}
          </Link>
        ))}
      </nav>

      {lessons.length === 0 ? (
        <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">
          Chưa có bài học nào cho lớp này. Bài sẽ được bổ sung sớm!
        </p>
      ) : (
        <div className="space-y-8">
          {[...topics].map(([topic, items]) => (
            <section key={topic}>
              <h2 className="mb-3 font-display text-xl font-bold tracking-tight">{topic}</h2>
              <ul className="fm-stagger grid gap-3 sm:grid-cols-2">
                {items.map((l) => (
                  <li key={l.slug}>
                    <Tilt className="h-full">
                    <Link
                      href={`/library/${l.slug}`}
                      data-cursor-label="Đọc bài"
                      className={cn(card, cardHover, "flex h-full flex-col")}
                    >
                      <div className="flex items-start justify-between">
                        <span className={cn("fm-wiggle-hover flex size-12 items-center justify-center rounded-full text-2xl", topicBg(l.topic))} aria-hidden>
                          {l.emoji}
                        </span>
                        <RoundArrow />
                      </div>
                      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
                        {[l.grade ? `Lớp ${l.grade}` : null, l.unit].filter(Boolean).join(" · ")}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold leading-snug tracking-tight">{l.title}</h3>
                      <p className="mt-1 text-sm text-muted">{l.summary}</p>
                      {l.exercises.length > 0 && (
                        <p className="mt-3 w-fit rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold transition group-hover:bg-surface">
                          ✏️ {l.exercises.length} bài tập
                        </p>
                      )}
                    </Link>
                    </Tilt>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
