import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";
import type { Survey } from "@/lib/surveys";

const COLUMNS = "id, title, description, questions, class_ids, status, created_at";

/** Phiếu đang mở cho lớp của học sinh mà học sinh chưa trả lời. */
export async function pendingSurveys(profile: Profile): Promise<Survey[]> {
  const admin = createAdminClient();
  const [{ data: surveys }, { data: done }] = await Promise.all([
    admin.from("surveys").select(COLUMNS).eq("status", "open").order("created_at", { ascending: false }),
    admin.from("survey_responses").select("survey_id").eq("user_id", profile.id),
  ]);
  const answered = new Set((done ?? []).map((d) => d.survey_id));
  return ((surveys ?? []) as Survey[]).filter(
    (s) => !answered.has(s.id) && (!s.class_ids?.length || (profile.class_id !== null && s.class_ids.includes(profile.class_id))),
  );
}

/** Một phiếu học sinh được phép trả lời (đang mở, đúng lớp). */
export async function surveyForStudent(profile: Profile, surveyId: string): Promise<{ survey: Survey; answered: boolean } | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("surveys").select(COLUMNS).eq("id", surveyId).maybeSingle();
  const survey = data as Survey | null;
  if (!survey || survey.status !== "open") return null;
  if (survey.class_ids?.length && (!profile.class_id || !survey.class_ids.includes(profile.class_id))) return null;
  const { data: resp } = await admin
    .from("survey_responses")
    .select("id")
    .eq("survey_id", surveyId)
    .eq("user_id", profile.id)
    .maybeSingle();
  return { survey, answered: Boolean(resp) };
}
