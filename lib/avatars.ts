// Ảnh đại diện có sẵn (dùng chung cho server và trình duyệt).
// Nhóm "mood" (mã may-… có từ thời linh vật cũ, giữ nguyên mã để ảnh đã chọn vẫn hiện): khuôn mặt cảm xúc.

export type PresetAvatar = { id: string; kind: "mood" | "emoji"; emoji: string; bg: string; label: string };

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "may-happy", kind: "mood", emoji: "😊", bg: "bg-sky", label: "Vui vẻ" },
  { id: "may-cheer", kind: "mood", emoji: "🥳", bg: "bg-butter", label: "Reo vui" },
  { id: "may-calm", kind: "mood", emoji: "😌", bg: "bg-mint", label: "Bình yên" },
  { id: "may-sleepy", kind: "mood", emoji: "😴", bg: "bg-lilac", label: "Buồn ngủ" },
  { id: "may-worried", kind: "mood", emoji: "😟", bg: "bg-peach", label: "Lo lắng" },
  { id: "may-sad", kind: "mood", emoji: "🥺", bg: "bg-sky", label: "Đồng cảm" },
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
