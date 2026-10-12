import "server-only";
import type { Exercise } from "@/lib/exercises";
import { embed } from "@/lib/kb";
import { createAdminClient } from "@/lib/supabase/admin";

// CHỌN BÀI TẬP PHÙ HỢP để Mây gợi ý (công cụ goi_y_bai_tap).
// So khớp ý nghĩa (embedding) giữa chủ đề Mây đưa ra và từng bài tập trong
// thư viện, ưu tiên đúng khối lớp của học sinh và bài chưa làm.

export type PickedExercise = {
  slug: string;
  exerciseId: string;
  lessonTitle: string;
  emoji: string;
  prompt: string;
  summary: string;
};

type Candidate = PickedExercise & { lessonId: string; grade: number | null; text: string };

// embedding của từng bài tập, giữ trong bộ nhớ của tiến trình (khóa = nội dung)
const vectors = new Map<string, number[]>();

async function candidates(): Promise<Candidate[]> {
  const { data } = await createAdminClient()
    .from("lessons")
    .select("id, slug, title, summary, topic, emoji, grade, exercises")
    .eq("published", true);
  return (data ?? []).flatMap((l) =>
    ((l.exercises ?? []) as Exercise[])
      // câu kiểm tra kiến thức (có đáp án đúng) không phải "hoạt động" để gợi ý
      .filter((ex) => ex.answer === undefined)
      .map((ex) => ({
        lessonId: l.id as string,
        slug: l.slug as string,
        exerciseId: ex.id,
        lessonTitle: l.title as string,
        emoji: (l.emoji as string) || "📘",
        prompt: ex.prompt,
        summary: (l.summary as string) ?? "",
        grade: l.grade as number | null,
        text: `${l.title}. Chủ đề: ${l.topic}. ${l.summary ?? ""} Bài tập: ${ex.prompt}`,
      })),
  );
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na * nb) || 1);
}

export async function pickExercise(userId: string, topic: string): Promise<PickedExercise | null> {
  const db = createAdminClient();
  const [list, { data: me }, { data: done }] = await Promise.all([
    candidates(),
    db.from("profiles").select("classes(grade)").eq("id", userId).maybeSingle(),
    db.from("lesson_responses").select("lesson_id, exercise_id").eq("user_id", userId),
  ]);
  if (!list.length) return null;

  const grade = (me?.classes as unknown as { grade: number | null } | null)?.grade ?? null;
  const doneKeys = new Set((done ?? []).map((d) => `${d.lesson_id}/${d.exercise_id}`));

  const missing = list.filter((c) => !vectors.has(c.text));
  const [queryVec, ...newVecs] = await embed([topic, ...missing.map((c) => c.text)]);
  missing.forEach((c, i) => vectors.set(c.text, newVecs[i]));

  let best: Candidate | null = null;
  let bestScore = -Infinity;
  for (const c of list) {
    let score = cosine(queryVec, vectors.get(c.text)!);
    if (grade && c.grade === grade) score += 0.05;
    if (doneKeys.has(`${c.lessonId}/${c.exerciseId}`)) score -= 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (!best) return null;
  const { slug, exerciseId, lessonTitle, emoji, prompt, summary } = best;
  return { slug, exerciseId, lessonTitle, emoji, prompt, summary };
}
