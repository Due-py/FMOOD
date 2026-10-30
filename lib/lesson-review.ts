import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Exercise } from "@/lib/exercises";

// DUYỆT BÀI THƯ VIỆN (trang thầy cô, admin và phòng tham vấn): mỗi bài ghi nguồn, ai duyệt, duyệt ngày nào.
// Đọc bằng quyền máy chủ (cả bài chưa đăng), trang đã tự chặn vai trò.

export type ReviewLesson = {
  id: string;
  slug: string;
  title: string;
  grade: number | null;
  topic: string;
  emoji: string;
  source: string;
  published: boolean;
  /** bài GVCN soạn cho lớp mình (null = bài chung) */
  author_name: string | null;
  body: string;
  exercises: Exercise[];
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  updated_at: string;
};

const BASE = "id, slug, title, grade, topic, emoji, source, published, author_name, body, exercises, updated_at";

/** Mọi bài, kèm trạng thái duyệt. `ready = false` khi chưa chạy migration 0015 (chưa có cột duyệt). */
export async function lessonsForReview(): Promise<{ ready: boolean; items: ReviewLesson[] }> {
  const db = createAdminClient();
  const order = (q: ReturnType<ReturnType<typeof db.from>["select"]>) => q.order("grade", { nullsFirst: true }).order("sort_order");
  const { data, error } = await order(db.from("lessons").select(`${BASE}, reviewed_by_name, reviewed_at`));
  if (error?.code === "42703") {
    const { data: old } = await order(db.from("lessons").select(BASE));
    return { ready: false, items: ((old ?? []) as unknown as ReviewLesson[]).map((l) => ({ ...l, reviewed_by_name: null, reviewed_at: null })) };
  }
  return { ready: true, items: (data ?? []) as unknown as ReviewLesson[] };
}

/** Sửa nội dung bài thì phải duyệt lại: các cột này được xóa khi admin lưu bài. */
export const CLEAR_REVIEW = { reviewed_by: null, reviewed_by_name: null, reviewed_at: null };
