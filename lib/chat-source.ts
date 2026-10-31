// CUỘC TRÒ CHUYỆN BẮT ĐẦU TỪ ĐÂU (kế hoạch Demo 3, 13.1). Dùng chung cho trình duyệt, máy chủ và test.
// Chỉ ghi lối vào, không ghi nội dung. Cột conversations.source (migration 0019).

export const CONVERSATION_SOURCES = ["checkin", "worry", "practice", "home", "starter", "other"] as const;
export type ConversationSource = (typeof CONVERSATION_SOURCES)[number];

export const SOURCE_LABEL: Record<ConversationSource, string> = {
  checkin: "Sau khi ghi tâm trạng",
  worry: "Từ chuyện bận lòng",
  practice: "Từ bài luyện",
  home: "Từ trang chủ",
  starter: "Bấm câu mở đầu",
  other: "Lối khác",
};

/** Giá trị tham số ?tu= trên đường dẫn /chat/new → nguồn. */
const FROM_PARAM: Record<string, ConversationSource> = {
  "tam-trang": "checkin",
  checkin: "checkin",
  "trang-chu": "home",
  home: "home",
  luyen: "practice",
  practice: "practice",
};

/**
 * Nguồn của một cuộc trò chuyện mới, theo đường dẫn mở trang /chat/new:
 * có ?chuyen= (mở từ chuyện bận lòng) → worry; có ?tu=... → theo bảng trên; còn lại → other.
 */
export function sourceFromParams(params: { tu?: unknown; chuyen?: unknown }): ConversationSource {
  if (typeof params.chuyen === "string" && params.chuyen) return "worry";
  if (typeof params.tu === "string" && params.tu in FROM_PARAM) return FROM_PARAM[params.tu];
  return "other";
}

/**
 * Nguồn gửi lên khi gửi tin đầu tiên. Bấm câu mở đầu được tính là "starter" khi học sinh không đến từ
 * một việc cụ thể (trang chủ, lối khác); đến từ check-in, chuyện bận lòng, bài luyện thì giữ lối vào đó.
 */
export function firstMessageSource(entry: ConversationSource, viaStarter: boolean): ConversationSource {
  return viaStarter && (entry === "home" || entry === "other") ? "starter" : entry;
}

export function isConversationSource(v: unknown): v is ConversationSource {
  return typeof v === "string" && (CONVERSATION_SOURCES as readonly string[]).includes(v);
}
