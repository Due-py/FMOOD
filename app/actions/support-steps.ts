"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { completeTinyAction, markTold, recordActionChoice, recordTopicGuess, type StepResult } from "@/lib/support-steps";

const worryId = (id: string | null) => (id && z.uuid().safeParse(id).success ? id : null);

/** Học sinh bấm "Mình làm xong rồi" ở một việc nhỏ. */
export async function finishTinyAction(actionKey: string, forWorry: string | null): Promise<StepResult> {
  const profile = await requireProfile();
  const res = await completeTinyAction(profile, String(actionKey), worryId(forWorry));
  if (res.ok) revalidatePath("/me");
  return res;
}

/** Học sinh bấm "Mình đã kể rồi" sau khi chọn kể với ai. */
export async function toldSomeone(who: string, forWorry: string | null): Promise<StepResult> {
  const profile = await requireProfile();
  const res = await markTold(profile, String(who), worryId(forWorry));
  if (res.ok) revalidatePath("/me");
  return res;
}

/** Học sinh bấm "Đúng rồi" / "Không phải" khi trợ lý đoán chủ đề (dữ liệu đo hiệu quả). */
export async function answerTopicGuess(topic: string, correct: boolean): Promise<void> {
  const profile = await requireProfile();
  await recordTopicGuess(profile, String(topic), correct === true);
}

/** Học sinh bấm "Bỏ qua việc này" (việc nhỏ không hợp). */
export async function skipTinyAction(actionKey: string, forWorry: string | null): Promise<void> {
  const profile = await requireProfile();
  await recordActionChoice(profile, String(actionKey), worryId(forWorry), { skipped: true });
}

/** Học sinh trả lời câu nhìn lại sau khi làm việc nhỏ: có ích / chưa hợp / chưa biết. */
export async function reflectTinyAction(actionKey: string, forWorry: string | null, reflection: string): Promise<void> {
  const profile = await requireProfile();
  await recordActionChoice(profile, String(actionKey), worryId(forWorry), { reflection: String(reflection) });
}
