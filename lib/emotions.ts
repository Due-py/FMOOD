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

/**
 * "Chưa rõ" (HD01): cho bạn chưa gọi tên được cảm xúc của mình. Chọn riêng, không đi cùng cảm xúc khác.
 * Tính là trung tính (không làm ngày đó thành "nặng lòng"); chọn "Chưa rõ" thì trợ lý không hỏi dồn.
 */
export const UNSURE: Emotion = { id: "chua-ro", label: "Chưa rõ", emoji: "🤔", group: "neutral", color: "#c8c2b4" };

export function isUnsure(ids: string[]): boolean {
  return ids.includes(UNSURE.id);
}

const BY_ID = new Map([...EMOTIONS, UNSURE].map((e) => [e.id, e]));

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
 * MỘT QUY TẮC "NẶNG LÒNG" cho mọi chỗ (Duy chọn 31/10 khuya; trước đó lượt check-in và ngày dùng hai quy tắc khác nhau):
 * cảm xúc nặng lòng chiếm ÍT NHẤT MỘT NỬA số cảm xúc đã chọn. "Lo lắng", "Vui + Lo lắng", "Lo lắng + Mệt" là nặng lòng;
 * "Vui + Bình yên + Lo lắng" thì không. "Chưa rõ" là trung tính.
 * Dùng cho: lời đáp và việc tự mở bước "chuyện bận lòng" sau check-in, màu ngày trên lịch, chuỗi ngày nặng lòng (cảnh báo
 * thầy cô), các chỉ số tâm trạng của lớp và trang Tổng quan.
 */
export function isNegative(ids: string[]): boolean {
  const c = countGroups(ids);
  return c.negative > 0 && c.negative >= c.positive + c.neutral;
}

/** Nhóm của một lần ghi (hoặc một ngày): nặng lòng theo quy tắc trên; còn lại có tích cực là tích cực, không thì trung tính. */
export function dominantGroup(ids: string[]): EmotionGroup {
  if (isNegative(ids)) return "negative";
  return countGroups(ids).positive > 0 ? "positive" : "neutral";
}

/**
 * Một học sinh ghi tâm trạng nhiều lần trong một ngày: ngày đó tính theo LẦN GHI GẦN NHẤT, không cộng dồn
 * (Duy chọn 31/10 khuya; trước đó cộng dồn nên ngày ghi 3 lần nặng gấp 3). `user` và `at` (ISO) của mỗi dòng.
 * Số lượt ghi vẫn đếm đủ ở chỗ khác; hàm này chỉ dùng khi tính tâm trạng.
 */
export function latestPerDay<T>(rows: T[], user: (r: T) => string, at: (r: T) => string, day: (iso: string) => string): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const key = `${user(r)}|${day(at(r))}`;
    const cur = best.get(key);
    if (!cur || at(r) > at(cur)) best.set(key, r);
  }
  return [...best.values()];
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
