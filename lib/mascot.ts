// Lời thoại cố định của nhân vật trò chuyện (dùng chung cho Sóc, Cú, Kiến; không gọi tên nhân vật) và tâm trạng của hình nhân vật.
import type { EmotionGroup } from "@/lib/emotions";

export type MascotMood = "happy" | "calm" | "sad" | "worried" | "sleepy" | "cheer" | "caring";

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function greeting(hour: number): string {
  if (hour < 5) return "Khuya rồi đó";
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function moodForHour(hour: number): MascotMood {
  if (hour < 5 || hour >= 23) return "sleepy";
  return "happy";
}

export const REMIND_CHECKIN = [
  "Hôm nay bạn thấy thế nào? Kể mình nghe chỉ mất chưa tới 1 phút thôi.",
  "Mình chưa biết hôm nay của bạn ra sao. Check-in một chút nhé?",
  "Ghé check-in một cái, để mình hiểu bạn hơn nha.",
];

export const ALREADY_CHECKED_IN = [
  "Cảm ơn bạn đã ghé hôm nay. Muốn check-in thêm lúc nào cũng được.",
  "Cảm xúc thay đổi trong ngày là chuyện bình thường. Mình luôn ở đây.",
];

/** Lời trợ lý đáp lại sau khi check-in, theo tông cảm xúc. */
export const CHECKIN_REPLY: Record<EmotionGroup, { mood: MascotMood; lines: string[] }> = {
  positive: {
    mood: "cheer",
    lines: [
      "Tuyệt quá! Mình vui lây với bạn luôn.",
      "Nghe thích ghê! Nhớ giữ lại cảm giác này nha.",
      "Một ngày đáng nhớ đó. Cảm ơn bạn đã kể mình nghe!",
    ],
  },
  neutral: {
    mood: "calm",
    lines: [
      "Cảm ơn bạn đã chia sẻ. Ngày bình thường cũng là một ngày ổn rồi.",
      "Mình ghi lại rồi nhé. Nghỉ ngơi một chút nếu thấy mệt nha.",
    ],
  },
  negative: {
    mood: "sad",
    lines: [
      "Cảm ơn bạn đã thật lòng với cảm xúc của mình. Điều đó không dễ đâu.",
      "Có vẻ hôm nay hơi nặng nề. Bạn không phải một mình đâu.",
      "Mình nghe rồi. Cảm thấy như vậy là bình thường, và nó sẽ qua.",
    ],
  },
};

/** Học sinh chọn "Chưa rõ": ghi nhận, không hỏi thêm, không ép tìm nguyên nhân. */
export const UNSURE_LINES = [
  "Chưa gọi tên được cũng không sao đâu. Cảm xúc có lúc lẫn lộn lắm. Mình ghi lại là “chưa rõ” nhé.",
  "Mình ghi lại là “chưa rõ” rồi. Bạn không cần giải thích gì cả.",
];

export function unsureReply() {
  return { mood: "calm" as MascotMood, line: pick(UNSURE_LINES) };
}

export function checkinReply(group: EmotionGroup) {
  const reply = CHECKIN_REPLY[group];
  return { mood: reply.mood, line: pick(reply.lines) };
}

export function remindLine(alreadyCheckedIn: boolean): string {
  return pick(alreadyCheckedIn ? ALREADY_CHECKED_IN : REMIND_CHECKIN);
}

/** Lời động viên khi chuỗi thói quen bị đứt. */
export const RESTART_LINES = [
  "Đứt chuỗi không sao cả. Hôm nay là ngày tuyệt vời để bắt đầu lại!",
  "Ai cũng có lúc lỡ nhịp. Bắt đầu lại từ ngày 1 nhé, mình cổ vũ bạn.",
  "Quan trọng là bạn quay lại. Bắt đầu lại nào!",
];

export function restartLine(seed: number): string {
  return RESTART_LINES[seed % RESTART_LINES.length];
}
