// NHỮNG ĐIỀU MÂY GHI NHỚ + ĐIỀU BẬN LÒNG: phần dùng chung (không gọi cơ sở dữ liệu)

export type MemoryKind = "address" | "interest" | "style" | "other";

export type Memory = { id: string; kind: MemoryKind; content: string; created_at: string };

export type ConcernStatus = "open" | "better" | "resolved";

export type Concern = {
  id: string;
  title: string;
  intensity: number;
  status: ConcernStatus;
  next_check_at: string | null;
  last_checked_at: string | null;
  created_at: string;
};

export const MEMORY_KINDS: MemoryKind[] = ["address", "interest", "style", "other"];

export const MEMORY_KIND_LABEL: Record<MemoryKind, string> = {
  address: "Cách xưng hô",
  interest: "Sở thích, điều quan tâm",
  style: "Cách trò chuyện bạn thích",
  other: "Điều khác",
};

export const CONCERN_STATUS_LABEL: Record<ConcernStatus, string> = {
  open: "Đang bận lòng",
  better: "Đã đỡ hơn",
  resolved: "Đã ổn",
};

/** Tối đa số điều Mây nhớ về một bạn (cũ nhất bị thay khi đầy). */
export const MAX_MEMORIES = 30;
/** Sau bao nhiêu ngày Mây hỏi thăm lại một điều bận lòng. */
export const FOLLOW_UP_DAYS = 3;

const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/** Phần thêm vào lời dặn: những gì Mây biết về riêng bạn này. */
export function memoryPrompt(memories: Pick<Memory, "kind" | "content">[], concerns: Concern[]): string {
  let out = "";
  if (memories.length) {
    out += "\n\nĐIỀU MÂY ĐÃ GHI NHỚ VỀ BẠN NÀY (bạn ấy xem và xóa được trong mục Tôi):";
    for (const m of memories) out += `\n- ${MEMORY_KIND_LABEL[m.kind]}: ${m.content}`;
    out +=
      "\nDùng tự nhiên khi phù hợp, đừng liệt kê lại. Cách xưng hô đã ghi nhớ được ưu tiên hơn biệt danh và cách xưng hô mặc định. Cách trò chuyện bạn ấy thích được ưu tiên áp dụng.";
  }
  const open = concerns.filter((c) => c.status !== "resolved");
  if (open.length) {
    out += "\n\nĐIỀU BẬN LÒNG BẠN ẤY ĐÃ CHO MÂY LƯU (chỉ nhắc khi liên quan; id dùng cho công cụ cap_nhat_dieu_ban_long):";
    for (const c of open) {
      out += `\n- [${c.id}] "${c.title}": mức ${c.intensity}/10, ${c.status === "better" ? "đã đỡ hơn" : "đang bận lòng"}, lưu ngày ${DATE.format(new Date(c.created_at))}`;
    }
  }
  return out;
}

/** Lượt trước của Mây có hỏi xin phép lưu không (chặn việc tự lưu khi chưa được đồng ý). */
export function askedPermission(lastAssistant: string | undefined): boolean {
  return Boolean(
    lastAssistant &&
      /(ghi|lưu)[^?]{0,80}(bận lòng|danh sách|hỏi thăm)|(bận lòng|danh sách|hỏi thăm)[^?]{0,80}(ghi|lưu)/i.test(lastAssistant),
  );
}
