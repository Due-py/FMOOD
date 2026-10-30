// Biểu tượng cho thói quen (dùng chung cho server và trình duyệt).
// Học sinh chọn trong các nhóm có sẵn, hoặc tự gõ một emoji bất kỳ từ bàn phím điện thoại.

export const HABIT_ICON_GROUPS: { label: string; icons: string[] }[] = [
  { label: "Học tập", icons: ["📖", "✍️", "📚", "🧮", "🔬", "🌍", "🗣️", "💻"] },
  { label: "Sức khỏe", icons: ["💧", "🥗", "🍎", "😴", "🦷", "🚶", "🏃", "🧘"] },
  { label: "Vận động", icons: ["⚽", "🏀", "🏸", "🚴", "🏊", "🤸", "🧗", "💪"] },
  { label: "Sở thích", icons: ["🎨", "🎵", "🎸", "📷", "🧩", "🎮", "🍳", "🌱"] },
  { label: "Cảm xúc", icons: ["😊", "🙏", "💛", "🌈", "☀️", "🌙", "⭐", "🫶"] },
  { label: "Việc nhà", icons: ["🧹", "🛏️", "🧺", "🐶", "🐱", "🪴", "🗂️", "📵"] },
];

/** Biểu tượng có sẵn (thói quen cũ dùng các biểu tượng này). */
export const HABIT_ICONS = HABIT_ICON_GROUPS.flatMap((g) => g.icons);

/**
 * Một biểu tượng hợp lệ: có trong danh sách, hoặc đúng MỘT emoji học sinh tự gõ (không nhận chữ, số, nhiều emoji).
 */
export function isHabitIcon(value: string): boolean {
  const s = value.trim();
  if (HABIT_ICONS.includes(s)) return true;
  if (!s || s.length > 16) return false;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)];
  return graphemes.length === 1 && /\p{Extended_Pictographic}/u.test(s);
}
