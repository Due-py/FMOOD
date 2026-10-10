// Danh sách cảm xúc dùng chung cho check-in, lịch và biểu đồ.
// Thêm/bớt cảm xúc ở đây là đủ, các màn hình khác tự cập nhật theo.

export type EmotionGroup = "positive" | "neutral" | "negative";

export type Emotion = {
  id: string;
  label: string;
  emoji: string;
  group: EmotionGroup;
  /** màu dùng cho lịch tháng */
  color: string;
};

export const EMOTIONS: Emotion[] = [
  { id: "vui", label: "Vui", emoji: "😄", group: "positive", color: "#f7c948" },
  { id: "hao-hung", label: "Hào hứng", emoji: "🤩", group: "positive", color: "#f59f3a" },
  { id: "binh-yen", label: "Bình yên", emoji: "😌", group: "positive", color: "#5cc98a" },
  { id: "biet-on", label: "Biết ơn", emoji: "🥰", group: "positive", color: "#f28cb1" },
  { id: "binh-thuong", label: "Bình thường", emoji: "🙂", group: "neutral", color: "#a7b0a9" },
  { id: "met", label: "Mệt", emoji: "😴", group: "neutral", color: "#9aa7c7" },
  { id: "buon", label: "Buồn", emoji: "😢", group: "negative", color: "#5b8def" },
  { id: "lo-lang", label: "Lo lắng", emoji: "😟", group: "negative", color: "#8f7ae5" },
  { id: "cang-thang", label: "Căng thẳng", emoji: "😣", group: "negative", color: "#c46ad8" },
  { id: "tuc-gian", label: "Tức giận", emoji: "😠", group: "negative", color: "#e5534b" },
  { id: "co-don", label: "Cô đơn", emoji: "🥺", group: "negative", color: "#5f6b8a" },
];

export const MAX_EMOTIONS_PER_CHECKIN = 5;

const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

export function getEmotion(id: string): Emotion | undefined {
  return BY_ID.get(id);
}

export function isValidEmotion(id: string): boolean {
  return BY_ID.has(id);
}

export const GROUP_LABEL: Record<EmotionGroup, string> = {
  positive: "Tích cực",
  neutral: "Trung tính",
  negative: "Nặng lòng",
};

/** màu biểu đồ theo nhóm (biến CSS, đổi theo sáng/tối, đã kiểm tra mù màu) */
export const GROUP_COLOR: Record<EmotionGroup, string> = {
  positive: "var(--series-pos)",
  neutral: "var(--series-neu)",
  negative: "var(--series-neg)",
};

/** Đếm số lần mỗi nhóm cảm xúc xuất hiện trong danh sách id. */
export function countGroups(ids: string[]): Record<EmotionGroup, number> {
  const counts: Record<EmotionGroup, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const id of ids) {
    const e = BY_ID.get(id);
    if (e) counts[e.group] += 1;
  }
  return counts;
}

/**
 * Tông phản hồi của Mây sau check-in. Hễ có cảm xúc nặng lòng (và không ít hơn
 * cảm xúc tích cực) thì Mây đáp lại theo hướng đồng cảm.
 */
export function dominantGroup(ids: string[]): EmotionGroup {
  const c = countGroups(ids);
  if (c.negative > 0 && c.negative >= c.positive) return "negative";
  if (c.positive > 0) return "positive";
  return "neutral";
}

/**
 * Một ngày bị coi là "tiêu cực" khi số cảm xúc nặng lòng nhiều hơn
 * tổng số cảm xúc còn lại trong ngày đó.
 */
export function isNegativeDay(ids: string[]): boolean {
  const c = countGroups(ids);
  return c.negative > c.positive + c.neutral;
}

/** Cảm xúc xuất hiện nhiều nhất (dùng tô màu lịch). */
export function dominantEmotion(ids: string[]): Emotion | undefined {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = 0;
  for (const [id, n] of counts) {
    if (n > bestCount) {
      best = id;
      bestCount = n;
    }
  }
  return best ? BY_ID.get(best) : undefined;
}
