// Các sự kiện server gửi về trình duyệt khi trò chuyện (mỗi dòng một JSON).
export type ChatEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "crisis"; text: string }
  | { type: "support"; teacherNotified: boolean }
  /** câu trả lời đã lưu: id thật để gắn phản hồi 👍/👎 */
  | { type: "saved"; messageId: string }
  | { type: "suggestions"; items: string[] }
  /** thẻ đi kèm câu trả lời: Mây vừa ghi nhớ / lưu điều bận lòng / gợi ý bài tập */
  | { type: "attachment"; item: ChatAttachment }
  | { type: "error"; message: string }
  | { type: "done" };

export type ChatAttachment =
  | { type: "memory"; id: string; content: string }
  | { type: "concern"; id: string; title: string; intensity: number; action: "saved" | "updated"; status: string }
  | { type: "exercise"; slug: string; exerciseId: string; lessonTitle: string; emoji: string; prompt: string };

export type ChatLength = "short" | "medium" | "long";

export const CHAT_LENGTHS: { value: ChatLength; label: string }[] = [
  { value: "short", label: "Ngắn" },
  { value: "medium", label: "Vừa" },
  { value: "long", label: "Chi tiết" },
];

export function isChatLength(v: unknown): v is ChatLength {
  return v === "short" || v === "medium" || v === "long";
}
