"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { answerFollowup, removeWorry, saveWorry, type FollowupResult, type SaveWorryResult } from "@/lib/worries";
import type { WorryInput } from "@/lib/worries-shared";

/** Học sinh bấm "Lưu lại" ở bước kể chuyện bận lòng (sau check-in). */
export async function saveWorryFromCheckin(input: WorryInput): Promise<SaveWorryResult> {
  const profile = await requireProfile();
  const result = await saveWorry(profile, { topic: String(input.topic), level: Number(input.level), note: input.note ? String(input.note) : undefined }, "checkin");
  if (result.ok) {
    revalidatePath("/home");
    revalidatePath("/me");
  }
  return result;
}

/** Học sinh bấm "Đúng" khi Mây hỏi "Có phải bạn đang lo chuyện…?" trong lúc trò chuyện. */
export async function saveWorryFromChat(input: { topic: string; level: number }): Promise<SaveWorryResult> {
  const profile = await requireProfile();
  const result = await saveWorry(profile, { topic: String(input.topic), level: Number(input.level) }, "chat");
  if (result.ok) {
    revalidatePath("/home");
    revalidatePath("/me");
  }
  return result;
}

/** Học sinh trả lời "Mây hỏi thăm" hoặc tự cập nhật một chuyện trong Hành trình. */
export async function answerWorryFollowup(worryId: string, level: number, feeling: string): Promise<FollowupResult> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(worryId).success) return { ok: false, error: "Không tìm thấy chuyện này." };
  // không làm mới trang ngay: thẻ cần ở lại để hiện lời Mây và lối đi tiếp (trang tự làm mới khi học sinh bấm xong)
  return answerFollowup(profile, worryId, Number(level), String(feeling));
}

/** Học sinh xóa một chuyện bận lòng trong Hành trình. */
export async function deleteWorry(worryId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(worryId).success) return { ok: false, error: "Không tìm thấy chuyện này." };
  const result = await removeWorry(profile, worryId);
  if (result.ok) {
    revalidatePath("/me/hanh-trinh");
    revalidatePath("/home");
  }
  return result;
}
