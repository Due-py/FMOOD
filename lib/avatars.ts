// Ảnh đại diện có sẵn (dùng chung cho server và trình duyệt).
import type { MascotMood } from "@/lib/mascot";

export type PresetAvatar =
  | { id: string; kind: "may"; mood: MascotMood; bg: string; label: string }
  | { id: string; kind: "emoji"; emoji: string; bg: string; label: string };

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "may-happy", kind: "may", mood: "happy", bg: "bg-sky", label: "Mây vui vẻ" },
  { id: "may-cheer", kind: "may", mood: "cheer", bg: "bg-butter", label: "Mây reo vui" },
  { id: "may-calm", kind: "may", mood: "calm", bg: "bg-mint", label: "Mây bình yên" },
  { id: "may-sleepy", kind: "may", mood: "sleepy", bg: "bg-lilac", label: "Mây buồn ngủ" },
  { id: "may-worried", kind: "may", mood: "worried", bg: "bg-peach", label: "Mây lo lắng" },
  { id: "may-sad", kind: "may", mood: "sad", bg: "bg-sky", label: "Mây đồng cảm" },
  { id: "cat", kind: "emoji", emoji: "🐱", bg: "bg-butter", label: "Mèo" },
  { id: "dog", kind: "emoji", emoji: "🐶", bg: "bg-peach", label: "Cún" },
  { id: "rabbit", kind: "emoji", emoji: "🐰", bg: "bg-lilac", label: "Thỏ" },
  { id: "fox", kind: "emoji", emoji: "🦊", bg: "bg-peach", label: "Cáo" },
  { id: "panda", kind: "emoji", emoji: "🐼", bg: "bg-mint", label: "Gấu trúc" },
  { id: "koala", kind: "emoji", emoji: "🐨", bg: "bg-sky", label: "Koala" },
  { id: "tiger", kind: "emoji", emoji: "🐯", bg: "bg-butter", label: "Hổ con" },
  { id: "frog", kind: "emoji", emoji: "🐸", bg: "bg-mint", label: "Ếch" },
  { id: "penguin", kind: "emoji", emoji: "🐧", bg: "bg-sky", label: "Chim cánh cụt" },
  { id: "owl", kind: "emoji", emoji: "🦉", bg: "bg-lilac", label: "Cú" },
  { id: "turtle", kind: "emoji", emoji: "🐢", bg: "bg-mint", label: "Rùa" },
  { id: "unicorn", kind: "emoji", emoji: "🦄", bg: "bg-lilac", label: "Kỳ lân" },
];

export const DEFAULT_AVATAR = "preset:may-happy";

export function presetById(id: string): PresetAvatar | undefined {
  return PRESET_AVATARS.find((p) => p.id === id);
}

/** Ảnh đại diện đã sẵn sàng để hiển thị (ảnh tải lên đã có đường dẫn ký sẵn). */
export type AvatarView = { kind: "preset"; id: string } | { kind: "image"; url: string };
