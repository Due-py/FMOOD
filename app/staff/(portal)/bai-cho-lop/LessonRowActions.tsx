"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setClassLessonPublished } from "@/app/actions/class-content";
import { useUndo } from "@/components/staff/Undo";
import { btn } from "@/components/ui/styles";

/** Đăng / ẩn một bài ngay trong danh sách, có Hoàn tác. */
export function LessonRowActions({ id, title, published }: { id: string; title: string; published: boolean }) {
  const [pending, start] = useTransition();
  const offerUndo = useUndo();
  return (
    <div className="flex gap-2">
      <Link href={`/staff/bai-cho-lop/${id}`} className={btn.secondary}>
        Sửa
      </Link>
      <button
        type="button"
        disabled={pending}
        className={published ? btn.ghost : btn.primary}
        onClick={() =>
          start(async () => {
            const res = await setClassLessonPublished(id, !published);
            if (!res.ok) return offerUndo(res.error);
            offerUndo(published ? `Đã ẩn “${title}” khỏi lớp` : `Đã đăng “${title}” cho lớp`, () => setClassLessonPublished(id, published));
          })
        }
      >
        {published ? "Ẩn khỏi lớp" : "Đăng cho lớp"}
      </button>
    </div>
  );
}
