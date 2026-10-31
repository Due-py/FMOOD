// CẢM XÚC VỪA CHECK-IN ĐI VÀO TRÒ CHUYỆN (hàm thuần, có test: checkin-context.test.ts). Duy chọn 31/10 khuya.
// Học sinh bấm "Kể … nghe thêm" ngay sau check-in: trò chuyện biết bạn ấy vừa TỰ CHỌN cảm xúc nào, để trợ lý không hỏi lại
// "bạn đang thấy thế nào" và bộ điều phối SEL coi đó là cảm xúc bạn ấy đã nói (bỏ qua bước gọi tên cảm xúc).
// Chỉ dùng lần check-in trong CHECKIN_WINDOW_MIN phút gần nhất (mở trò chuyện lâu sau đó thì cảm xúc có thể đã khác).
import { getEmotion, isUnsure } from "@/lib/emotions";

export const CHECKIN_WINDOW_MIN = 120;

export function checkinContext(emotions: string[]): { line: string; emotion: string | null } {
  if (!emotions.length) return { line: "", emotion: null };
  if (isUnsure(emotions)) {
    return {
      line: 'BỐI CẢNH: ngay trước khi trò chuyện, bạn ấy vừa ghi tâm trạng là "Chưa rõ" (chưa gọi tên được cảm xúc). Không hỏi dồn bạn ấy đang thấy thế nào; nói cho bạn ấy biết chưa gọi tên được cũng không sao.',
      emotion: null,
    };
  }
  const labels = emotions.map((id) => getEmotion(id)?.label).filter((l): l is string => Boolean(l));
  if (!labels.length) return { line: "", emotion: null };
  return {
    line: `BỐI CẢNH: ngay trước khi trò chuyện, bạn ấy vừa tự chọn khi ghi tâm trạng: ${labels.join(", ")}. Không hỏi lại "bạn đang thấy thế nào"; có thể nhắc nhẹ tới các cảm xúc đó.`,
    emotion: labels.map((l) => l.toLowerCase()).join(", "),
  };
}

/** Lần check-in còn dùng được cho trò chuyện vừa mở (trong CHECKIN_WINDOW_MIN phút). */
export function freshCheckin(atIso: string, now: Date = new Date()): boolean {
  const age = now.getTime() - Date.parse(atIso);
  return age >= 0 && age <= CHECKIN_WINDOW_MIN * 60_000;
}
