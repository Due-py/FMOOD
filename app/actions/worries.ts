"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import {
  answerFollowup,
  recordDifficulty,
  removeWorry,
  saveWorry,
  type DifficultyResult,
  type FollowupResult,
  type SaveWorryResult,
} from "@/lib/worries";
import type { DifficultySource, RevisionAction, WorryInput } from "@/lib/worries-shared";

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

/**
 * Học sinh bấm "Đúng" khi Mây hỏi "Có phải bạn đang lo chuyện…?" trong lúc trò chuyện, rồi lưu.
 * `difficulty`: khó khăn học sinh vừa bấm "Đúng rồi" trong cuộc trò chuyện (nếu có) thành khó khăn đã xác nhận.
 */
export async function saveWorryFromChat(input: { topic: string; level: number; difficulty?: string | null }): Promise<SaveWorryResult> {
  const profile = await requireProfile();
  const result = await saveWorry(profile, { topic: String(input.topic), level: Number(input.level) }, "chat");
  if (result.ok && input.difficulty) {
    await recordDifficulty(profile, result.worryId, String(input.difficulty), "chat", "confirmed", false);
  }
  // KHÔNG revalidatePath: gọi từ trang trò chuyện, làm mới sẽ dựng lại khung chat và mất câu Mây đang trả lời.
  // Trang chủ, trang Tôi là trang động nên mở ra luôn đọc dữ liệu mới.
  return result;
}

/** Học sinh trả lời "Mây hỏi thăm" hoặc tự cập nhật một chuyện trong Hành trình (kèm "đã thử việc nhỏ chưa"). */
export async function answerWorryFollowup(
  worryId: string,
  level: number,
  feeling: string,
  tried: string | null = null,
  triedAction: string | null = null,
): Promise<FollowupResult> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(worryId).success) return { ok: false, error: "Không tìm thấy chuyện này." };
  // không làm mới trang ngay: thẻ cần ở lại để hiện lời Mây và lối đi tiếp (trang tự làm mới khi học sinh bấm xong)
  return answerFollowup(profile, worryId, Number(level), String(feeling), tried ? String(tried).slice(0, 20) : null, triedAction ? String(triedAction).slice(0, 80) : null);
}

const SOURCES: DifficultySource[] = ["chat", "checkin", "journey"];

/**
 * Học sinh bấm "Đúng rồi" (confirmed) hoặc "Chưa đúng" (rejected) với câu Mây hiểu về khó khăn của mình.
 * `ownWords`: câu do học sinh tự viết, tự sửa hoặc bấm chọn (được kiểm tra an toàn như tin nhắn).
 */
export async function confirmWorryDifficulty(
  worryId: string,
  text: string,
  source: string,
  action: string,
  ownWords: boolean,
): Promise<DifficultyResult> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(worryId).success) return { ok: false, error: "Không tìm thấy chuyện này." };
  if (!SOURCES.includes(source as DifficultySource) || (action !== "confirmed" && action !== "rejected")) {
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  // KHÔNG revalidatePath: thẻ này nằm cả trong khung trò chuyện (làm mới sẽ mất câu Mây đang trả lời);
  // trang Hành trình tự router.refresh() sau khi sửa.
  return recordDifficulty(profile, worryId, String(text), source as DifficultySource, action as RevisionAction, ownWords === true);
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
