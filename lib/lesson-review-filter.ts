// BỘ LỌC TRANG "DUYỆT BÀI THƯ VIỆN" (hàm thuần, có test: lesson-review-filter.test.ts). Chạy ở trình duyệt, không đọc cơ sở dữ liệu.
import { fold } from "@/lib/safety/normalize";

export type FilterableLesson = {
  title: string;
  body: string;
  grade: number | null;
  topic: string;
  source: string;
  published: boolean;
  author_name: string | null;
};

export type LessonFilter = {
  /** tìm theo tên bài hoặc nội dung (không phân biệt dấu) */
  q: string;
  /** "" = mọi lớp; "chung" = bài không gắn lớp */
  grade: string;
  topic: string;
  source: "" | "co" | "chua";
  kind: "" | "chung" | "gvcn";
  published: "" | "da" | "chua";
};

export const EMPTY_FILTER: LessonFilter = { q: "", grade: "", topic: "", source: "", kind: "", published: "" };

export function filterLessons<T extends FilterableLesson>(items: T[], f: LessonFilter): T[] {
  const q = fold(f.q.trim());
  return items.filter((l) => {
    if (q && !fold(`${l.title}\n${l.body}`).includes(q)) return false;
    if (f.grade === "chung" ? l.grade !== null : f.grade && String(l.grade) !== f.grade) return false;
    if (f.topic && l.topic !== f.topic) return false;
    if (f.source === "co" && !l.source.trim()) return false;
    if (f.source === "chua" && l.source.trim()) return false;
    if (f.kind === "chung" && l.author_name) return false;
    if (f.kind === "gvcn" && !l.author_name) return false;
    if (f.published === "da" && !l.published) return false;
    if (f.published === "chua" && l.published) return false;
    return true;
  });
}

/** Các lựa chọn cho ô lọc lấy từ chính danh sách bài (lớp, chủ đề đang có). */
export function filterOptions(items: FilterableLesson[]): { grades: string[]; topics: string[]; hasUngraded: boolean } {
  const grades = [...new Set(items.map((l) => l.grade).filter((g): g is number => g !== null))].sort((a, b) => a - b).map(String);
  const topics = [...new Set(items.map((l) => l.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  return { grades, topics, hasUngraded: items.some((l) => l.grade === null) };
}

export const isFiltering = (f: LessonFilter) => Object.values(f).some((v) => v !== "");
