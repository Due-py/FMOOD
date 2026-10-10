// Các sự kiện server gửi về trình duyệt khi trò chuyện (mỗi dòng một JSON).
export type ChatEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "crisis"; text: string }
  | { type: "support"; teacherNotified: boolean }
  /** câu trả lời đã lưu: id thật để gắn phản hồi 👍/👎 */
  | { type: "saved"; messageId: string }
  | { type: "suggestions"; items: string[] }
  | { type: "error"; message: string }
  | { type: "done" };
