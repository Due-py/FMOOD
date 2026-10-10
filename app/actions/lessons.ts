"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { gradeAnswer, validateExerciseAnswer, type ExerciseAnswer } from "@/lib/exercises";
import type { Lesson } from "@/lib/lessons";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage } from "@/lib/safety/check";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SubmitResult =
  | { ok: true; correct: boolean | null; risk: "none" | "concern" | "urgent"; teacherNotified: boolean }
  | { ok: false; error: string };

async function findExercise(lessonId: string, exerciseId: string) {
  if (!z.uuid().safeParse(lessonId).success) return null;
  // đọc bằng quyền học sinh: chỉ thấy bài đã đăng
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, slug, title, exercises")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();
  const lesson = data as Pick<Lesson, "id" | "slug" | "title" | "exercises"> | null;
  const exercise = lesson?.exercises.find((e) => e.id === exerciseId);
  return lesson && exercise ? { lesson, exercise } : null;
}

/**
 * Lưu câu trả lời bài tập. Câu tự viết được kiểm tra an toàn giống trò chuyện:
 * có dấu hiệu nguy hiểm thì gắn cờ và báo thầy cô phụ trách (chỉ gửi đúng câu trả lời đó).
 */
export async function submitExercise(lessonId: string, exerciseId: string, answer: ExerciseAnswer): Promise<SubmitResult> {
  const profile = await requireProfile();
  const found = await findExercise(lessonId, exerciseId);
  if (!found) return { ok: false, error: "Không tìm thấy bài tập." };
  const { lesson, exercise } = found;

  const clean = typeof answer === "string" ? answer.trim() : answer;
  const invalid = validateExerciseAnswer(exercise, clean);
  if (invalid) return { ok: false, error: invalid };

  let risk: "none" | "concern" | "urgent" = "none";
  let teacherNotified = false;
  if (exercise.type === "text") {
    // câu hỏi của bài tập làm bối cảnh, để không báo nhầm vì từ ngữ trong đề bài
    const safety = await checkMessage(clean as string, [{ role: "assistant", content: exercise.prompt }]);
    risk = safety.level;
    if (risk !== "none") {
      teacherNotified = await createAlert({
        profile,
        type: "lesson_risk",
        severity: risk === "urgent" ? "urgent" : "watch",
        excerpt: `Bài “${lesson.title}” · ${exercise.prompt}\nTrả lời: ${clean as string}`,
        reasons: safety.reasons,
      });
    }
  }

  // ghi bằng quyền server để học sinh không tự sửa cờ an toàn
  const { error } = await createAdminClient()
    .from("lesson_responses")
    .upsert(
      {
        user_id: profile.id,
        lesson_id: lesson.id,
        exercise_id: exercise.id,
        answer: clean,
        flagged: risk !== "none",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id,exercise_id" },
    );
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };

  revalidatePath(`/library/${lesson.slug}`);
  return { ok: true, correct: gradeAnswer(exercise, clean as ExerciseAnswer), risk, teacherNotified };
}

/** Học sinh bấm "Nhờ thầy cô": gửi yêu cầu hỗ trợ tới GVCN và phòng tham vấn. */
export async function requestTeacherHelp(
  lessonId: string,
  exerciseId: string,
  note: string,
): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  const profile = await requireProfile();
  const found = await findExercise(lessonId, exerciseId);
  if (!found) return { ok: false, error: "Không tìm thấy bài tập." };
  const { lesson, exercise } = found;
  const text = note.trim().slice(0, 500);

  // tránh gửi trùng: đã nhờ cho bài này trong 24 giờ qua và chưa xong thì thôi
  const { data: recent } = await createAdminClient()
    .from("alerts")
    .select("id")
    .eq("student_id", profile.id)
    .eq("type", "help_request")
    .neq("status", "resolved")
    .ilike("excerpt", `Bài “${lesson.title}”%`)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
    .limit(1);
  if (recent?.length) return { ok: true, already: true };

  // lời nhắn cũng được kiểm tra an toàn
  let severity: "watch" | "urgent" = "watch";
  const reasons = ["Học sinh tự bấm “Nhờ thầy cô” khi làm bài tập"];
  if (text) {
    const safety = await checkMessage(text, [{ role: "assistant", content: exercise.prompt }]);
    if (safety.level === "urgent") severity = "urgent";
    reasons.push(...safety.reasons);
  }

  const ok = await createAlert({
    profile,
    type: "help_request",
    severity,
    excerpt: `Bài “${lesson.title}” · ${exercise.prompt}${text ? `\nLời nhắn: ${text}` : ""}`,
    reasons,
  });
  return ok ? { ok: true, already: false } : { ok: false, error: "Chưa gửi được. Thử lại nhé." };
}

