"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Markdown from "react-markdown";
import { deleteClassLesson, restoreClassLesson, saveClassLesson } from "@/app/actions/class-content";
import { useUndo } from "@/components/staff/Undo";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { ClassLesson } from "@/lib/class-content";
import { classLabel, LESSON_EMOJIS } from "@/lib/class-tools";
import { ExercisesEditor } from "../../content/lessons/[id]/ExercisesEditor";

const STARTER = `## Mở đầu
Viết vài câu kể một tình huống quen thuộc với các em.

## Cùng tìm hiểu
- Ý thứ nhất
- Ý thứ hai

## Thử ngay
Một việc nhỏ các em làm được trong 5 phút.`;

/** Nút chèn định dạng: thầy cô không cần nhớ ký hiệu. */
const FORMATS = [
  { label: "Tiêu đề nhỏ", before: "\n## ", after: "" },
  { label: "In đậm", before: "**", after: "**" },
  { label: "Gạch đầu dòng", before: "\n- ", after: "" },
];

export function ClassLessonEditor({ lesson, classes }: { lesson: ClassLesson | null; classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const offerUndo = useUndo();
  const body = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState({
    classId: lesson?.class_id ?? classes[0].id,
    title: lesson?.title ?? "",
    summary: lesson?.summary ?? "",
    emoji: lesson?.emoji ?? "📘",
    body: lesson?.body ?? STARTER,
    exercises: lesson?.exercises ?? [],
  });
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const published = lesson?.published ?? false;

  function insert(before: string, after: string) {
    const el = body.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const next = value.slice(0, a) + before + value.slice(a, b) + after + value.slice(b);
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, b + before.length);
    });
  }

  function save(publish: boolean, message: string) {
    setError(null);
    start(async () => {
      const res = await saveClassLesson(lesson?.id ?? null, { ...form, published: publish });
      if (!res.ok) return setError(res.error);
      offerUndo(message);
      if (!lesson) router.replace(`/staff/bai-cho-lop/${res.id}`);
      else router.refresh();
    });
  }

  function remove() {
    if (!lesson || !confirm(`Xóa bài “${lesson.title}”?`)) return;
    start(async () => {
      const res = await deleteClassLesson(lesson.id);
      if (!res.ok) return setError(res.error);
      offerUndo(`Đã xóa “${lesson.title}”`, () => restoreClassLesson(res.snapshot));
      router.replace("/staff/bai-cho-lop");
    });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Biểu tượng</legend>
        <div className="flex flex-wrap gap-2">
          {LESSON_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={form.emoji === e}
              aria-label={`Biểu tượng ${e}`}
              onClick={() => set("emoji", e)}
              className={cn("flex size-11 items-center justify-center rounded-2xl text-xl", form.emoji === e ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-2")}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Tên bài</span>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="VD: Khi bị điểm kém" className={input} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Một câu giới thiệu (không bắt buộc)</span>
        <input value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} className={input} />
      </label>

      {classes.length > 1 && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Lớp nhận bài</span>
          <select value={form.classId} onChange={(e) => set("classId", e.target.value)} className={input}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c.name)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm font-semibold">Nội dung bài</span>
          {!preview &&
            FORMATS.map((f) => (
              <button key={f.label} type="button" onClick={() => insert(f.before, f.after)} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold">
                {f.label}
              </button>
            ))}
          <button type="button" onClick={() => setPreview(!preview)} className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg">
            {preview ? "Quay lại soạn" : "Xem như học sinh"}
          </button>
        </div>
        {preview ? (
          <div className="lesson-body min-h-64 rounded-2xl border border-line bg-surface px-5 py-3 text-[17px]">
            <Markdown>{form.body || "_Chưa có nội dung_"}</Markdown>
          </div>
        ) : (
          <textarea ref={body} value={form.body} onChange={(e) => set("body", e.target.value)} rows={16} className={cn(input, "font-[inherit] leading-relaxed")} aria-label="Nội dung bài" />
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">Câu hỏi luyện tập (không bắt buộc, tối đa 5)</p>
        <p className="mb-3 text-xs text-muted">Câu trả lời của các em là riêng tư, thầy cô không đọc được. Câu tự viết được kiểm tra an toàn như khi trò chuyện với Mây.</p>
        <ExercisesEditor value={form.exercises} onChange={(v) => set("exercises", v)} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {published ? (
          <button type="button" disabled={pending} onClick={() => save(true, "Đã lưu bài.")} className={btn.primary}>
            {pending ? "Đang lưu…" : "Lưu bài"}
          </button>
        ) : (
          <>
            <button type="button" disabled={pending} onClick={() => save(true, "Đã đăng bài cho lớp.")} className={btn.primary}>
              {pending ? "Đang lưu…" : "Đăng cho lớp"}
            </button>
            <button type="button" disabled={pending} onClick={() => save(false, "Đã lưu nháp. Lớp chưa thấy bài này.")} className={btn.secondary}>
              Lưu nháp
            </button>
          </>
        )}
        {lesson && lesson.responses === 0 && (
          <button type="button" disabled={pending} onClick={remove} className={cn(btn.ghost, "ml-auto text-danger hover:bg-danger-soft hover:text-danger")}>
            Xóa bài
          </button>
        )}
      </div>
    </form>
  );
}
