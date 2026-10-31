"use client";

import { CHARACTERS, type CharacterKey } from "@/lib/ai/chat-style";
import type { MascotMood } from "@/lib/mascot";
import { useAssistant } from "./AssistantContext";

type Props = {
  mood?: MascotMood;
  size?: number;
  float?: boolean;
  className?: string;
  /** nhân vật cụ thể; bỏ trống thì dùng nhân vật của người đang xem (AssistantProvider) */
  character?: CharacterKey;
};

/** Màu nền ô tròn và dấu nhỏ ở góc theo tâm trạng (thay cho nét mặt của linh vật cũ). */
const MOOD_STYLE: Record<MascotMood, { bg: string; badge: string | null; label: string }> = {
  happy: { bg: "bg-butter", badge: null, label: "vui vẻ" },
  calm: { bg: "bg-sky", badge: null, label: "bình yên" },
  sad: { bg: "bg-lilac", badge: "💧", label: "đồng cảm" },
  worried: { bg: "bg-peach", badge: "💭", label: "lo lắng" },
  sleepy: { bg: "bg-lilac", badge: "💤", label: "buồn ngủ" },
  cheer: { bg: "bg-mint", badge: "✨", label: "reo vui" },
  caring: { bg: "bg-peach", badge: "💗", label: "quan tâm" },
};

/**
 * Hình đại diện của nhân vật trò chuyện (Sóc, Cú, Kiến): emoji trong ô tròn màu nhạt.
 * Cùng cách dùng với linh vật cũ: size (chiều rộng, px), mood, float.
 */
export function CharacterAvatar({ mood = "happy", size = 120, float = true, className = "", character }: Props) {
  const mine = useAssistant();
  const c = character ? { name: CHARACTERS[character].name, emoji: CHARACTERS[character].emoji } : mine;
  const style = MOOD_STYLE[mood] ?? MOOD_STYLE.happy;
  return (
    <span
      role="img"
      aria-label={`${c.name} (${style.label})`}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      className={`${float ? "may-float" : ""} relative inline-flex shrink-0 select-none items-center justify-center rounded-full leading-none ring-1 ring-line ${style.bg} ${className}`}
    >
      <span aria-hidden>{c.emoji}</span>
      {style.badge && size >= 40 && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 leading-none" style={{ fontSize: Math.max(12, size * 0.22) }}>
          {style.badge}
        </span>
      )}
    </span>
  );
}
