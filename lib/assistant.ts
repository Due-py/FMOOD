import "server-only";
import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth";
import {
  assistantInfo,
  normalizeStyle,
  type AssistantInfo,
  type CharacterKey,
  type ChatStyle,
} from "@/lib/ai/chat-style";
import { getStyleSettings } from "@/lib/ai/style-settings";
import { createClient } from "@/lib/supabase/server";

// NHÂN VẬT TRÒ CHUYỆN CỦA MỖI HỌC SINH (kế hoạch Demo 3, Bước 9.0–9.1)
// Thứ tự chọn: lựa chọn của chính học sinh (profiles.chat_style) → nhân vật mặc định admin đặt → Sóc.
// Dùng ở máy chủ: lời dặn cho AI, tên hiện trên trang; trang ở trình duyệt nhận qua AssistantProvider.

/** Cài đặt 4 nhóm lựa chọn: nằm ở lib/ai/style-settings.ts (không kéo theo phần đăng nhập), giữ tên cũ ở đây. */
export { getStyleSettings };

/**
 * Lựa chọn đã lưu của một học sinh (thô, chưa kiểm tra). Đọc bằng quyền của chính học sinh (RLS: chỉ chủ tài khoản đọc);
 * chưa chạy migration 0020 (chưa có cột) hay đọc lỗi thì null.
 */
const savedStyle = cache(async (userId: string): Promise<unknown> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("chat_style").eq("id", userId).maybeSingle();
  if (error) return null;
  return (data as { chat_style?: unknown } | null)?.chat_style ?? null;
});

/** Lựa chọn trò chuyện của học sinh, đã kiểm tra (giá trị lạ → mặc định của nhóm đó). */
export async function studentStyle(userId: string): Promise<ChatStyle> {
  const [raw, settings] = await Promise.all([savedStyle(userId), getStyleSettings()]);
  return normalizeStyle(raw, settings);
}

/** Học sinh đã tự chọn nhân vật chưa (chưa chọn thì đổi nhân vật mặc định trên trang admin sẽ đổi theo). */
export async function hasOwnStyle(userId: string): Promise<boolean> {
  const raw = await savedStyle(userId);
  return Boolean(raw && typeof raw === "object" && "character" in raw);
}

/** Nhân vật mặc định do admin đặt (trang không có học sinh đăng nhập: trang thầy cô, trang giới thiệu). */
export async function defaultCharacter(): Promise<CharacterKey> {
  return (await getStyleSettings()).characters.default;
}

/**
 * Nhân vật của người đang xem: học sinh thì theo lựa chọn của bạn ấy; thầy cô, chưa đăng nhập thì nhân vật mặc định.
 * Kèm câu giới thiệu admin soạn.
 */
export const currentAssistant = cache(async (): Promise<AssistantInfo & { intro: string }> => {
  const [profile, settings] = await Promise.all([getCurrentProfile(), getStyleSettings()]);
  const key = profile?.role === "student" ? (await studentStyle(profile.id)).character : settings.characters.default;
  return { ...assistantInfo(key), intro: settings.characters.items[key].intro };
});

/** Tên nhân vật (dùng trong câu chữ ở máy chủ). */
export async function assistantName(): Promise<string> {
  return (await currentAssistant()).name;
}
