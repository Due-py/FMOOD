import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Exercise } from "@/lib/exercises";
import { EMPTY_LESSON_CASEL, type LessonCasel } from "@/lib/lesson-casel";

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
} & LessonCasel;

const BASE = "id, slug, title, grade, topic, emoji, source, published, author_name, body, exercises, updated_at";

const CASEL_COLUMNS = "casel_primary, casel_related, casel_items, subskill, learning_objective";

/**
 * Mọi bài, kèm trạng thái duyệt và khung CASEL. `ready = false` khi chưa chạy 0015 (chưa có cột duyệt);
 * `caselReady = false` khi chưa chạy 0026 (chưa có cột CASEL): trang báo rõ, không ẩn lỗi.
 */
export async function lessonsForReview(): Promise<{ ready: boolean; caselReady: boolean; items: ReviewLesson[] }> {
  const db = createAdminClient();
  const order = (q: ReturnType<ReturnType<typeof db.from>["select"]>) => q.order("grade", { nullsFirst: true }).order("sort_order");
  const full = await order(db.from("lessons").select(`${BASE}, reviewed_by_name, reviewed_at, ${CASEL_COLUMNS}`));
  if (!full.error) return { ready: true, caselReady: true, items: (full.data ?? []) as unknown as ReviewLesson[] };
  if (full.error.code !== "42703") return { ready: true, caselReady: true, items: [] };
  console.warn("[F-Mood] Chưa có cột CASEL của bài đọc (chạy 0026_casel_ky_nang.sql)");
  const { data, error } = await order(db.from("lessons").select(`${BASE}, reviewed_by_name, reviewed_at`));
  if (error?.code === "42703") {
    const { data: old } = await order(db.from("lessons").select(BASE));
    return { ready: false, caselReady: false, items: ((old ?? []) as unknown as ReviewLesson[]).map((l) => ({ ...l, ...EMPTY_LESSON_CASEL, reviewed_by_name: null, reviewed_at: null })) };
  }
  return { ready: true, caselReady: false, items: ((data ?? []) as unknown as ReviewLesson[]).map((l) => ({ ...l, ...EMPTY_LESSON_CASEL })) };
}

/** Số bài chưa duyệt (số trên mục "Duyệt bài thư viện" của thanh bên). 0 khi chưa chạy migration 0015. */
export async function countUnreviewedLessons(): Promise<number> {
  const { count, error } = await createAdminClient().from("lessons").select("id", { count: "exact", head: true }).is("reviewed_at", null);
  return error ? 0 : (count ?? 0);
}

/** Sửa nội dung bài thì phải duyệt lại: các cột này được xóa khi admin lưu bài. */
export const CLEAR_REVIEW = { reviewed_by: null, reviewed_by_name: null, reviewed_at: null };
