"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { getGarden } from "@/lib/garden";
import { getTodayReflection } from "@/lib/reflection";
import { validateAnswers, type SurveyAnswers } from "@/lib/surveys";
import { surveyForStudent } from "@/lib/surveys-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

// ───────────────────────── Câu hỏi suy ngẫm ─────────────────────────

export async function answerReflection(answer: string): Promise<Result> {
  const profile = await requireProfile();
  const text = answer.trim();
  if (!text) return { ok: false, error: "Viết vài chữ thôi cũng được nhé." };
  if (text.length > 1000) return { ok: false, error: "Tối đa 1000 ký tự." };

  const today = await getTodayReflection(profile.id);
  if (!today.question) return { ok: false, error: "Hôm nay chưa có câu hỏi." };

  const supabase = await createClient();
  const { error } = await supabase.from("reflection_answers").upsert(
    {
      user_id: profile.id,
      question_id: today.question.id || null,
      question_text: today.question.text,
      day: dayKey(),
      answer: text,
    },
    { onConflict: "user_id,day" },
  );
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  revalidatePath("/home");
  revalidatePath("/me");
  return { ok: true };
}

// ───────────────────────── Khu vườn ─────────────────────────

export async function choosePlant(plantId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(plantId).success) return { ok: false, error: "Cây không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ garden_plant_id: plantId }).eq("id", profile.id);
  if (error) return { ok: false, error: "Chưa đổi được cây." };
  revalidatePath("/garden");
  revalidatePath("/home");
  return { ok: true };
}

/** Thu hoạch cây đã nở hoa: đưa vào bộ sưu tập và bắt đầu cây mới. */
export async function harvestPlant(): Promise<Result> {
  const profile = await requireProfile();
  const garden = await getGarden(profile.id);
  if (!garden.plant || !garden.canHarvest) return { ok: false, error: "Cây chưa nở hoa đâu." };

  const last = garden.plant.stages[garden.plant.stages.length - 1];
  // ghi bằng quyền server để học sinh không tự tạo "thu hoạch" giả
  const { error } = await createAdminClient().from("garden_harvests").insert({
    user_id: profile.id,
    plant_name: garden.plant.name,
    plant_emoji: last.emoji,
    points_used: Math.max(1, last.points),
  });
  if (error) return { ok: false, error: "Chưa thu hoạch được. Thử lại nhé." };
  revalidatePath("/garden");
  revalidatePath("/home");
  return { ok: true };
}

// ───────────────────────── Khảo sát ─────────────────────────

export async function submitSurvey(surveyId: string, answers: SurveyAnswers): Promise<Result> {
  const profile = await requireProfile();
  const found = await surveyForStudent(profile, surveyId);
  if (!found) return { ok: false, error: "Phiếu này không còn mở." };
  if (found.answered) return { ok: false, error: "Bạn đã trả lời phiếu này rồi." };

  // chỉ giữ câu trả lời cho đúng các câu hỏi trong phiếu
  const clean: SurveyAnswers = {};
  for (const q of found.survey.questions) {
    const a = answers[q.id];
    if (a !== undefined && a !== "") clean[q.id] = q.type === "scale" ? Number(a) : String(a).trim();
  }
  const invalid = validateAnswers(found.survey.questions, clean);
  if (invalid) return { ok: false, error: invalid };

  const { error } = await createAdminClient().from("survey_responses").insert({
    survey_id: surveyId,
    user_id: profile.id,
    class_id: profile.class_id,
    answers: clean,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Bạn đã trả lời phiếu này rồi." : "Chưa gửi được. Thử lại nhé." };
  }
  revalidatePath("/home");
  return { ok: true };
}
