import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { exerciseSchema, type Exercise } from "@/lib/exercises";
import { createClient } from "@/lib/supabase/server";
import type { LessonCasel } from "@/lib/lesson-casel";

// Bài học lưu ở bảng `lessons`, admin soạn trên web (Nội dung → Thư viện bài học).
// Thư mục content/lessons/ chỉ còn dùng để NHẬP bài mẫu ban đầu.

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  grade: number | null;
  unit: string;
  topic: string;
  emoji: string;
  sort_order: number;
  source: string;
  body: string;
  published: boolean;
  exercises: Exercise[];
};

const COLUMNS = "id, slug, title, summary, grade, unit, topic, emoji, sort_order, source, body, published, exercises";
/** Danh sách bài: không lấy nội dung bài (phần nặng nhất), để Trang chủ và Thư viện mở nhanh hơn. */
const LIST_COLUMNS = "id, slug, title, summary, grade, unit, topic, emoji, sort_order, source, published, exercises";

export type LessonCard = Omit<Lesson, "body">;

/** Ai đã duyệt bài, ngày nào (có sau migration 0015; chưa chạy thì là null). */
export type LessonReview = { reviewed_by_name: string | null; reviewed_at: string | null };

// HỌC SINH CHỈ THẤY BÀI ĐÃ ĐĂNG VÀ ĐÃ DUYỆT (Duy chọn 31/10 khuya). Bài chưa duyệt (kể cả bài vừa sửa, vì sửa là
// mất dấu duyệt) không hiện ở Thư viện, Trang chủ, việc nhỏ, trò chuyện hỏi bài, và không nộp được bài tập.
// Chưa chạy migration 0015 (chưa có cột duyệt) thì chỉ lọc theo "đã đăng" như trước.

/** Bài học sinh được thấy (đã đăng và đã duyệt), không kèm nội dung bài. */
export const getLessons = cache(async (): Promise<LessonCard[]> => {
  const supabase = await createClient();
  const query = (reviewed: boolean) => {
    const q = supabase.from("lessons").select(LIST_COLUMNS).eq("published", true);
    return (reviewed ? q.not("reviewed_at", "is", null) : q).order("grade", { ascending: true, nullsFirst: true }).order("sort_order");
  };
  let { data, error } = await query(true);
  if (error?.code === "42703") ({ data, error } = await query(false));
  return (data ?? []) as LessonCard[];
});

/** Một bài học sinh được thấy (đã đăng và đã duyệt), đủ nội dung, kèm người duyệt và ngày duyệt. */
export const getLesson = cache(async (slug: string): Promise<(Lesson & LessonReview) | undefined> => {
  const supabase = await createClient();
  const query = (cols: string) => supabase.from("lessons").select(cols).eq("slug", slug).eq("published", true).maybeSingle();
  let { data, error } = await query(`${COLUMNS}, reviewed_by_name, reviewed_at`);
  // chưa chạy migration 0015: chưa có cột duyệt
  if (error?.code === "42703") ({ data, error } = await query(COLUMNS));
  else if (data && !(data as unknown as LessonReview).reviewed_at) return undefined;
  if (!data) return undefined;
  const row = data as unknown as Lesson & Partial<LessonReview>;
  return { ...row, reviewed_by_name: row.reviewed_by_name ?? null, reviewed_at: row.reviewed_at ?? null };
});

export type CaselLessonCard = LessonCard & LessonCasel & { casel_primary: NonNullable<LessonCasel["casel_primary"]> };

/**
 * Bài đọc cho trang Kỹ năng: đã đăng, đã duyệt VÀ đã được người duyệt gắn năng lực CASEL chính (0026).
 * Bài chưa gắn không hiện ở đây (không đoán nhóm, không có khối "chưa xếp nhóm" trước học sinh).
 * Chưa chạy 0026 thì không có bài nào (ghi cảnh báo ở máy chủ); cổng phát hành yêu cầu chạy 0026 trước.
 */
export const getCaselLessons = cache(async (): Promise<CaselLessonCard[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(`${LIST_COLUMNS}, casel_primary, casel_related, casel_items, subskill, learning_objective`)
    .eq("published", true)
    .not("reviewed_at", "is", null)
    .not("casel_primary", "is", null)
    .order("grade", { ascending: true, nullsFirst: true })
    .order("sort_order");
  if (error) {
    console.warn("[F-Mood] Đọc bài đọc theo CASEL lỗi (đã chạy 0026_casel_ky_nang.sql chưa?)", error.code, error.message);
    return [];
  }
  return (data ?? []) as unknown as CaselLessonCard[];
});

export const LESSON_COLUMNS = COLUMNS;

const TOPIC_BG = ["bg-butter", "bg-sky", "bg-peach", "bg-lilac", "bg-mint"];

/** Màu thẻ cố định theo chủ đề. */
export function topicBg(topic: string): string {
  let hash = 0;
  for (const ch of topic) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TOPIC_BG[hash % TOPIC_BG.length];
}

/** Đọc các bài mẫu trong content/lessons/*.md (để admin nhập vào cơ sở dữ liệu). */
export async function readLessonFiles(): Promise<Omit<Lesson, "id">[]> {
  const dir = path.join(process.cwd(), "content/lessons");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  return Promise.all(
    files.map(async (file) => {
      const { data, content } = matter(await readFile(path.join(dir, file), "utf8"));
      return {
        slug: file.replace(/\.md$/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        title: String(data.title ?? file),
        summary: String(data.summary ?? ""),
        grade: data.grade ? Number(data.grade) : null,
        unit: String(data.unit ?? ""),
        topic: String(data.topic ?? "Khác"),
        emoji: String(data.emoji ?? "📘"),
        sort_order: Number(data.order ?? 100),
        source: String(data.source ?? ""),
        body: content.trim(),
        published: true,
        exercises: [],
      };
    }),
  );
}

/** Đọc các bài chia từ sách trong content/lessons/oxford/*.json. Bài nào sai cấu trúc thì bỏ qua và báo lỗi. */
export async function readLessonJson(): Promise<{ lessons: Omit<Lesson, "id">[]; errors: string[] }> {
  const dir = path.join(process.cwd(), "content/lessons/oxford");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return { lessons: [], errors: [] };
  }
  const lessons: Omit<Lesson, "id">[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const items = JSON.parse(await readFile(path.join(dir, file), "utf8")) as Record<string, unknown>[];
    for (const it of items) {
      const exercises = Array.isArray(it.exercises) ? it.exercises : [];
      const parsed = exercises.map((e) => exerciseSchema.safeParse(e));
      const bad = parsed.find((p) => !p.success);
      if (bad && !bad.success) {
        errors.push(`${file} › ${String(it.slug)}: ${bad.error.issues[0]?.message}`);
        continue;
      }
      lessons.push({
        slug: String(it.slug),
        title: String(it.title),
        summary: String(it.summary ?? ""),
        grade: it.grade ? Number(it.grade) : null,
        unit: String(it.unit ?? ""),
        topic: String(it.topic ?? "Khác"),
        emoji: String(it.emoji ?? "📘"),
        sort_order: Number(it.sort_order ?? 100),
        source: String(it.source ?? ""),
        body: String(it.body ?? ""),
        published: true,
        exercises: parsed.map((p) => (p.success ? p.data : null)).filter((e): e is Exercise => e !== null),
      });
    }
  }
  return { lessons, errors };
}
