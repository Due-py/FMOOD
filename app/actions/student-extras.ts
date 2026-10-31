"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { TEST_IDS, testDuration, type TestMeta } from "@/lib/bai-do";
import { awardBadge } from "@/lib/badges";
import { dayKey } from "@/lib/dates";
import { getGarden } from "@/lib/garden";
import { getTodayReflection } from "@/lib/reflection";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import type { RiskLevel } from "@/lib/safety/keywords";
import { TEST_ALERT_PREFIX } from "@/lib/staff-privacy";
import { isQuestionShown, shortQuestion, validateAnswers, type SurveyAnswers } from "@/lib/surveys";
import { surveyForStudent } from "@/lib/surveys-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { contentForProfile } from "@/lib/support-content-server";

type Result = { ok: true } | { ok: false; error: string };

// ───────────────────────── Câu hỏi suy ngẫm ─────────────────────────

/**
 * Lưu câu trả lời suy ngẫm. Câu trả lời được kiểm tra an toàn giống trò chuyện:
 * có dấu hiệu nguy hiểm thì báo thầy cô phụ trách (chỉ gửi đúng câu trả lời đó).
 * Ghi bằng quyền server để học sinh không bỏ qua được bước kiểm tra này.
 */
export async function answerReflection(answer: string): Promise<{ ok: true; risk: RiskLevel } | { ok: false; error: string }> {
  const profile = await requireProfile();
  const text = answer.trim();
  if (!text) return { ok: false, error: "Viết vài chữ thôi cũng được nhé." };
  if (text.length > 1000) return { ok: false, error: "Tối đa 1000 ký tự." };

  const today = await getTodayReflection(profile.id);
  if (!today.question) return { ok: false, error: "Hôm nay chưa có câu hỏi." };

  // câu hỏi làm bối cảnh, để không báo nhầm vì từ ngữ trong câu hỏi
  const safety = await checkMessage(text, [{ role: "assistant", content: today.question.text }]);
  if (safety.level !== "none") {
    await createAlert({
      profile,
      type: "lesson_risk",
      severity: safety.level === "urgent" ? "urgent" : "watch",
      excerpt: `Câu hỏi suy ngẫm: ${today.question.text}
Trả lời: ${text}`,
      reasons: safety.reasons,
    });
  }

  const { error } = await createAdminClient().from("reflection_answers").upsert(
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
  return { ok: true, risk: safety.level };
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

/**
 * Thu hoạch cây đã nở hoa: đưa vào bộ sưu tập và bắt đầu cây mới.
 * Lần đầu thì trao huy hiệu "Người làm vườn" (`badge` chỉ có khi huy hiệu đang hiện được với lớp này).
 */
export async function harvestPlant(): Promise<{ ok: true; badge?: { name: string; emoji: string } } | { ok: false; error: string }> {
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
  if (!(await awardBadge(profile.id, "nguoi-lam-vuon"))) return { ok: true };
  const badge = (await contentForProfile(profile, ["badge"])).find((b) => b.key === "badge.nguoi-lam-vuon");
  return { ok: true, badge: badge ? { name: String(badge.data.name), emoji: String(badge.data.emoji) } : undefined };
}

// ───────────────────────── Khảo sát và bài đo ─────────────────────────

export type SurveySubmitResult =
  | { ok: true; risk: RiskLevel; teacherNotified: boolean; crisis: string | null }
  | { ok: false; error: string };

/**
 * Gửi phiếu khảo sát hoặc bài đo kỹ năng. Câu tự trả lời được kiểm tra an toàn giống trò chuyện:
 * nguy hiểm thì báo phòng tham vấn (khẩn) và hiện ngay câu trả lời soạn sẵn cho học sinh; đáng lo thì
 * ghi cảnh báo theo dõi. Cảnh báo chỉ kèm đúng câu hỏi và câu trả lời đó (phiếu ghi rõ ngoại lệ này).
 * Bài đo ghi thêm thời gian làm bài, số lần dán chữ bị chặn, câu tự kể có dùng AI (không có chữ học sinh viết).
 */
export async function submitSurvey(
  surveyId: string,
  answers: SurveyAnswers,
  info: { startedAt?: string | null; pasteBlocked?: number } = {},
): Promise<SurveySubmitResult> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(surveyId).success) return { ok: false, error: "Phiếu này không còn mở." };
  const found = await surveyForStudent(profile, surveyId);
  if (!found) return { ok: false, error: "Phiếu này không còn mở." };
  if (found.answered) return { ok: false, error: "Bạn đã trả lời phiếu này rồi." };
  const kind = found.survey.kind ?? "survey";

  // chỉ giữ câu trả lời cho đúng các câu hỏi trong phiếu (câu có điều kiện mà không được hỏi thì bỏ)
  const clean: SurveyAnswers = {};
  for (const q of found.survey.questions) {
    const a = answers[q.id];
    if (a !== undefined && a !== "") clean[q.id] = q.type === "scale" ? Number(a) : String(a).trim();
  }
  for (const q of found.survey.questions) if (!isQuestionShown(q, clean)) delete clean[q.id];
  const invalid = validateAnswers(found.survey.questions, clean, kind);
  if (invalid) return { ok: false, error: invalid };

  // câu hỏi làm bối cảnh, để không báo nhầm vì từ ngữ trong đề
  const written = found.survey.questions.filter((q) => q.type === "text" && typeof clean[q.id] === "string");
  const checks = await Promise.all(
    written.map(async (q) => ({
      q,
      answer: clean[q.id] as string,
      safety: await checkMessage(clean[q.id] as string, [{ role: "assistant", content: q.text }]),
    })),
  );
  const risky = checks.filter((c) => c.safety.level !== "none");
  const risk: RiskLevel = risky.some((c) => c.safety.level === "urgent") ? "urgent" : risky.length ? "concern" : "none";
  let teacherNotified = false;
  if (risky.length) {
    teacherNotified = await createAlert({
      profile,
      type: "survey_risk",
      severity: risk === "urgent" ? "urgent" : "watch",
      // bài đo: đoạn trích có dấu riêng để chỉ phòng tham vấn đọc (admin không đọc), không kèm tên phiếu (lần, đề)
      excerpt: risky
        .map((c) => `${kind === "test" ? TEST_ALERT_PREFIX : `Phiếu “${found.survey.title}”`} · ${shortQuestion(c.q.text)}\nTrả lời: ${c.answer}`)
        .join("\n\n"),
      reasons: [...new Set(risky.flatMap((c) => c.safety.reasons))],
    });
  }

  const row: Record<string, unknown> = { survey_id: surveyId, user_id: profile.id, class_id: profile.class_id, answers: clean };
  const meta: TestMeta | null =
    kind === "test"
      ? {
          started_at: info.startedAt && !Number.isNaN(Date.parse(info.startedAt)) ? new Date(info.startedAt).toISOString() : null,
          duration_s: testDuration(info.startedAt, new Date()),
          pasted_blocked: Math.max(0, Math.min(999, Math.floor(Number(info.pasteBlocked) || 0))),
          ai_use: typeof clean[TEST_IDS.aiUse] === "string" ? (clean[TEST_IDS.aiUse] as string) : null,
        }
      : null;
  const db = createAdminClient();
  let { error } = await db.from("survey_responses").insert(meta ? { ...row, meta } : row);
  // chưa chạy migration 0018 (chưa có cột meta): vẫn lưu bài làm
  if (meta && error && (error.code === "42703" || error.code === "PGRST204")) ({ error } = await db.from("survey_responses").insert(row));
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Bạn đã trả lời phiếu này rồi." : "Chưa gửi được. Thử lại nhé." };
  }
  // nhật ký hoạt động: chỉ mã phiếu ngắn, không có câu trả lời
  logActivity(profile, kind === "test" ? "test_submit" : "survey_submit", surveyId.slice(0, 8));
  revalidatePath("/home");
  revalidatePath("/bai-do");
  return {
    ok: true,
    risk,
    teacherNotified,
    crisis: risk === "urgent" ? crisisWithStatus(await crisisResponse(), teacherNotified) : null,
  };
}
