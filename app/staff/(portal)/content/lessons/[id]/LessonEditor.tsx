"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { deleteLesson, saveLesson } from "@/app/actions/admin";
import { Field, SaveBar, textarea, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { Lesson } from "@/lib/lessons";
import { ExercisesEditor } from "./ExercisesEditor";

/** Tạo đường dẫn không dấu từ tên bài, ví dụ "Gọi tên cảm xúc" → "goi-ten-cam-xuc". */
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function LessonEditor({ lesson }: { lesson: Lesson | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: lesson?.title ?? "",
    slug: lesson?.slug ?? "",
    summary: lesson?.summary ?? "",
    grade: lesson?.grade ? String(lesson.grade) : "",
    unit: lesson?.unit ?? "",
    topic: lesson?.topic ?? "",
    emoji: lesson?.emoji ?? "📘",
    sort_order: String(lesson?.sort_order ?? 100),
    source: lesson?.source ?? "",
    body: lesson?.body ?? "",
    published: lesson?.published ?? true,
    exercises: lesson?.exercises ?? [],
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(lesson));
  const [tab, setTab] = useState<"write" | "preview">("write");
  const { pending, status, run } = useAction();
  const [deleting, startDelete] = useTransition();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      action={() =>
        run(
          () => saveLesson(lesson?.id ?? null, form),
          "Đã lưu bài học.",
          (res) => {
            if (!lesson && "id" in res) router.replace(`/staff/content/lessons/${res.id}`);
          },
        )
      }
      className="space-y-5"
    >
      <div className="grid gap-3 sm:grid-cols-[5rem_1fr]">
        <Field label="Biểu tượng">
          <input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} className={cn(input, "text-center text-2xl")} maxLength={8} />
        </Field>
        <Field label="Tên bài">
          <input
            value={form.title}
            required
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            className={input}
          />
        </Field>
      </div>
      <Field label="Tóm tắt một câu">
        <input value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} className={input} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Lớp">
          <select value={form.grade} onChange={(e) => set("grade", e.target.value)} className={input}>
            <option value="">Mọi lớp</option>
            {[6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chủ đề">
          <input value={form.topic} required onChange={(e) => set("topic", e.target.value)} placeholder="VD: Hiểu cảm xúc" className={input} />
        </Field>
        <Field label="Bài / chương">
          <input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="VD: Bài 3" className={input} />
        </Field>
        <Field label="Thứ tự">
          <input value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} type="number" min={0} className={input} />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Nội dung (Markdown)</span>
          <div role="tablist" className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn("rounded-full px-3 py-1 font-semibold", tab === t ? "bg-surface shadow-sm" : "text-muted")}
              >
                {t === "write" ? "Soạn" : "Xem trước"}
              </button>
            ))}
          </div>
        </div>
        {tab === "write" ? (
          <>
            <textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={18} className={textarea} aria-label="Nội dung bài" />
            <p className="mt-1 text-xs text-muted">
              ## Tiêu đề mục · **chữ đậm** · - gạch đầu dòng · 1. danh sách số · &gt; ô ghi chú
            </p>
          </>
        ) : (
          <div className="lesson-body min-h-64 rounded-2xl border border-line bg-surface px-5 py-3 text-[17px]">
            <Markdown>{form.body || "_Chưa có nội dung_"}</Markdown>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Bài tập luyện tập</p>
        <p className="mb-3 text-xs text-muted">
          Hiện cuối bài, mỗi bài tập có nút “Mình cần giúp” (gợi ý / hỏi Mây / nhờ thầy cô). Câu trả lời tự viết được kiểm tra
          an toàn như trò chuyện.
        </p>
        <ExercisesEditor value={form.exercises} onChange={(v) => set("exercises", v)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nguồn" hint="VD: Tóm tắt từ Well-being 7 (Oxford), Bài 3">
          <input value={form.source} onChange={(e) => set("source", e.target.value)} className={input} />
        </Field>
        <Field label="Đường dẫn" hint={`Học sinh xem tại /library/${form.slug || "…"}`}>
          <input
            value={form.slug}
            required
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            className={cn(input, "font-mono text-sm")}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="size-5 accent-[var(--brand)]" />
        <span>
          <span className="font-semibold">Đăng bài</span>
          <span className="block text-sm text-muted">Bỏ chọn để lưu dạng nháp, học sinh chưa thấy.</span>
        </span>
      </label>

      <SaveBar pending={pending} status={status} label={lesson ? "Lưu bài" : "Tạo bài"} />

      {lesson && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (confirm(`Xóa bài "${lesson.title}"?`)) {
              startDelete(async () => {
                const res = await deleteLesson(lesson.id);
                if (res.ok) router.replace("/staff/content/lessons");
              });
            }
          }}
          className={cn(btn.ghost, "-ml-4 text-danger hover:bg-danger-soft hover:text-danger")}
        >
          Xóa bài này
        </button>
      )}
    </form>
  );
}
