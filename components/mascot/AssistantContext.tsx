"use client";

import { createContext, useContext, type ReactNode } from "react";
import { assistantInfo, FALLBACK_CHARACTER, type AssistantInfo } from "@/lib/ai/chat-style";

// NHÂN VẬT TRÒ CHUYỆN CỦA NGƯỜI ĐANG XEM (Bước 9.0): layout học sinh đặt nhân vật học sinh đã chọn
// (chưa chọn thì nhân vật mặc định admin đặt), trang thầy cô đặt nhân vật mặc định.
// Thành phần ở trình duyệt đọc tên bằng useAssistant(); ngoài các layout đó thì dùng Sóc.

const AssistantContext = createContext<AssistantInfo>(assistantInfo(FALLBACK_CHARACTER));

export function AssistantProvider({ value, children }: { value: AssistantInfo; children: ReactNode }) {
  return <AssistantContext value={value}>{children}</AssistantContext>;
}

/** Nhân vật đang trò chuyện với học sinh: { key, name, emoji }. */
export function useAssistant(): AssistantInfo {
  return useContext(AssistantContext);
}
