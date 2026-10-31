import "server-only";
import { cache } from "react";
import { normalizeStyleSettings, type StyleSettings } from "@/lib/ai/chat-style";
import { getSetting } from "@/lib/settings";

// Cài đặt 4 nhóm lựa chọn trò chuyện (nhân vật, độ dài, cách dẫn dắt, động lực). Tách khỏi lib/assistant.ts để lời dặn
// (prompt-config) và các script bộ thử không kéo theo phần đăng nhập (lib/auth dùng next/navigation, không chạy ngoài Next).

/** Cài đặt 4 nhóm lựa chọn (đã ghép với mặc định từng mục). */
export const getStyleSettings = cache(async (): Promise<StyleSettings> => {
  const [characters, lengths, guidance, motivation] = await Promise.all([
    getSetting("style.characters"),
    getSetting("style.lengths"),
    getSetting("style.guidance"),
    getSetting("style.motivation"),
  ]);
  return normalizeStyleSettings({ characters, lengths, guidance, motivation });
});
