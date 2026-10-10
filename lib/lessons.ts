import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { exerciseSchema, type Exercise } from "@/lib/exercises";
import { createClient } from "@/lib/supabase/server";

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

/** Bài đã đăng (học sinh đọc qua RLS). */
export const getLessons = cache(async (): Promise<Lesson[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select(COLUMNS)
    .eq("published", true)
    .order("grade", { ascending: true, nullsFirst: true })
    .order("sort_order");
  return (data ?? []) as Lesson[];
});

export async function getLesson(slug: string): Promise<Lesson | undefined> {
  return (await getLessons()).find((l) => l.slug === slug);
}

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
