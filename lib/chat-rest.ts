// NHẮC NGHỈ KHI TRÒ CHUYỆN LÂU (kế hoạch Demo 3, mục 4.4; thuộc Demo 2.1). Dùng chung cho máy chủ, trình duyệt và test.
// Thời gian trò chuyện trong ngày được tính ở MÁY CHỦ từ giờ gửi các tin nhắn (không dựa vào đồng hồ trên máy học sinh).
// Lời nhắc chỉ là một dòng nhẹ nhàng: không khóa ô nhắn, không khóa nút "Cần giúp".

/** Sau bao nhiêu phút trò chuyện trong một ngày thì nhắc nghỉ. */
export const REST_AFTER_MINUTES = 20;
/** Hai tin cách nhau quá lâu thì chỉ tính tối đa ngần này phút (bỏ khoảng học sinh rời đi rồi quay lại). */
export const GAP_CAP_MINUTES = 5;

/**
 * Số phút trò chuyện từ danh sách giờ gửi tin (của mọi cuộc trò chuyện trong ngày, cả học sinh lẫn trợ lý).
 * Cộng khoảng cách giữa hai tin liền nhau, mỗi khoảng tối đa GAP_CAP_MINUTES phút.
 */
export function chatMinutes(timestamps: string[]): number {
  const times = timestamps
    .map((t) => Date.parse(t))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  let ms = 0;
  for (let i = 1; i < times.length; i++) ms += Math.min(times[i] - times[i - 1], GAP_CAP_MINUTES * 60_000);
  return Math.floor(ms / 60_000);
}

export const needsRest = (minutes: number) => minutes >= REST_AFTER_MINUTES;

/**
 * Tình trạng sau tin nhắn mới nhất: số phút, có nhắc không, và có phải tin này vừa làm vượt mốc 20 phút không
 * (để chỉ đếm một lần "đã thấy lời nhắc" mỗi ngày, không đếm lại ở mọi tin sau đó).
 */
export function restStatus(timestamps: string[]): { minutes: number; remind: boolean; crossed: boolean } {
  const sorted = [...timestamps].sort((a, b) => Date.parse(a) - Date.parse(b));
  const minutes = chatMinutes(sorted);
  const remind = needsRest(minutes);
  return { minutes, remind, crossed: remind && !needsRest(chatMinutes(sorted.slice(0, -1))) };
}

/** Lời nhắc nghỉ (trình duyệt hiện, kèm tên nhân vật). */
export function restLine(name: string, minutes: number): string {
  return `Hôm nay bạn đã trò chuyện với ${name} khoảng ${minutes} phút rồi. Mình nghỉ mắt một chút nhé: đứng dậy vươn vai, uống nước, hoặc nói chuyện với người thân. Khi cần, bạn vẫn nhắn được và nút “Cần giúp” luôn mở.`;
}
