import "server-only";
import { dayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type TodayReflection = {
  day: string;
  question: { id: string; text: string } | null;
  answer: string | null;
};

/** Câu hỏi suy ngẫm hôm nay: xoay vòng theo ngày trong các câu đang dùng. */
export async function getTodayReflection(userId: string): Promise<TodayReflection> {
  const supabase = await createClient();
  const day = dayKey();
  const [{ data: questions }, { data: answer }] = await Promise.all([
    supabase.from("reflection_questions").select("id, text").eq("active", true).order("sort_order").order("created_at"),
    supabase.from("reflection_answers").select("question_text, answer").eq("user_id", userId).eq("day", day).maybeSingle(),
  ]);

  if (answer) return { day, question: { id: "", text: answer.question_text }, answer: answer.answer };
  if (!questions?.length) return { day, question: null, answer: null };
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return { day, question: questions[dayNumber % questions.length], answer: null };
}

export async function getRecentReflections(userId: string, limit = 7) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reflection_answers")
    .select("id, day, question_text, answer")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(limit);
  return data ?? [];
}
