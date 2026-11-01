"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { parseStyleInput, styleRef } from "@/lib/ai/chat-style";
import type { CardKind } from "@/lib/ai/reply-cards";
import { isSkillId } from "@/lib/skills";
import { dayKey } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// NHÂN VẬT, TÙY CHỌN TRÒ CHUYỆN VÀ THẺ GỢI Ý CỦA HỌC SINH (kế hoạch Demo 3, Bước 9.4, 9.7, 10.4)
// Chỉ ghi số đếm để đo (mã tổ hợp, loại thẻ, nút đã bấm), không ghi nội dung tin nhắn hay nội dung thẻ.

type Result = { ok: true } | { ok: false; error: string };

const MISSING = new Set(["42703", "PGRST204"]);

/** Ghi một dòng đếm vào sổ hoạt động; chưa chạy 0020 (chưa có loại mới) thì bỏ qua, không báo lỗi cho học sinh. */
async function count(userId: string, kind: "style_changed" | "card_clicked", ref: string) {
  const { error } = await createAdminClient().from("support_activity").insert({ user_id: userId, kind, ref, day: dayKey() });
  if (error) console.warn("[F-Mood] Ghi số đếm trò chuyện lỗi", kind, error.message);
}

/**
 * Lưu lựa chọn trò chuyện (nhân vật, độ dài, cách dẫn dắt, động lực) vào hồ sơ của CHÍNH học sinh.
 * Ghi bằng quyền của học sinh: RLS chỉ cho sửa dòng của mình, và chỉ cột chat_style (migration 0020).
 * Áp dụng từ tin nhắn tiếp theo (máy chủ đọc lại mỗi lượt).
 */
export async function saveChatStyle(input: unknown): Promise<Result> {
  const profile = await requireProfile();
  const style = parseStyleInput(input);
  if (!style) return { ok: false, error: "Lựa chọn chưa hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ chat_style: style }).eq("id", profile.id);
  if (error) {
    if (MISSING.has(error.code)) return { ok: false, error: "App chưa lưu được lựa chọn này (cần cập nhật cơ sở dữ liệu). Bạn báo thầy cô nhé." };
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  await count(profile.id, "style_changed", styleRef(style));
  // trang Trò chuyện đang mở tự đổi tên nhân vật; các trang khác (dùng chung layout) đọc lại khi mở tới
  revalidatePath("/home");
  return { ok: true };
}

const CARD_ACTIONS: Record<CardKind, string[]> = { goal: ["add", "later"], skill: ["open"], end: ["stop", "continue"] };

/** Học sinh bấm một nút trên thẻ gợi ý: chỉ đếm (loại thẻ + nút; thẻ kỹ năng kèm id kỹ năng thành phần). */
export async function recordCardClick(kind: CardKind, action: string, skill?: string): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (!CARD_ACTIONS[kind]?.includes(action)) return { ok: false };
  const ref = kind === "skill" ? `subskill:${isSkillId(skill) ? skill : "?"}` : `${kind}:${action}`;
  await count(profile.id, "card_clicked", ref);
  return { ok: true };
}
