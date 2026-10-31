// Các sự kiện server gửi về trình duyệt khi trò chuyện (mỗi dòng một JSON).
export type ChatEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "crisis"; text: string }
  /** câu trả lời vừa hiện bị chặn khi kiểm tra: thay toàn bộ bằng câu này */
  | { type: "replace"; text: string }
  | { type: "support"; teacherNotified: boolean }
  /** câu trả lời đã lưu: id thật để gắn phản hồi 👍/👎 */
  | { type: "saved"; messageId: string }
  | { type: "suggestions"; items: string[] }
  /** trợ lý đoán học sinh đang lo chuyện gì (học sinh xác nhận thì mới lưu) */
  | { type: "topic_guess"; topic: string; label: string; emoji: string }
  /** câu trợ lý tóm tắt khó khăn, để học sinh bấm "Đúng rồi" hoặc sửa (chưa lưu gì cho tới khi học sinh bấm) */
  | { type: "summary"; text: string }
  /** đã trò chuyện ≥ 20 phút hôm nay (máy chủ đếm): trình duyệt hiện lời nhắc nghỉ, không khóa gì */
  | { type: "rest"; minutes: number }
  | { type: "error"; message: string }
  | { type: "done" };
