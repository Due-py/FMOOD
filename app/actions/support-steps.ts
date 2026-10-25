"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { completeTinyAction, markTold, type StepResult } from "@/lib/support-steps";

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
