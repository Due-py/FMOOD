// LỚP 1: BỘ LỌC TỪ KHÓA
// Chạy trên máy chủ, không cần mạng, để vẫn bắt được câu nguy hiểm khi AI gặp lỗi.
// Giáo viên có thể đọc và bổ sung các cụm từ bên dưới.
//
// Lưu ý: tiếng Việt hay nói quá ("mệt muốn chết", "đói chết mất"), nên chỉ đưa vào
// đây những cụm từ RÕ RÀNG. Các câu mơ hồ để lớp AI phân loại xử lý.

export type RiskLevel = "none" | "concern" | "urgent";

type Rule = { level: Exclude<RiskLevel, "none">; reason: string; patterns: RegExp[] };

const SUBJECT = "(?:mình|tôi|tao|tớ|em|con|cháu)";

const RULES: Rule[] = [
  {
    level: "urgent",
    reason: "Nhắc tới ý định tự tử / tự làm hại bản thân",
    patterns: [
      /tự\s*tử/,
      /tự\s*sát/,
      /tự\s*(?:làm\s*)?hại\s*(?:bản\s*thân|mình)/,
      /tự\s*làm\s*đau\s*(?:bản\s*thân|mình)/,
      /rạch\s*(?:tay|cổ\s*tay)/,
      /cắt\s*cổ\s*tay/,
      /treo\s*cổ/,
      /nhảy\s*(?:lầu|cầu|xuống\s*sông)/,
      /uống\s*(?:hết|cả\s*lọ|thật\s*nhiều)\s*thuốc/,
      /không\s*(?:muốn|thiết)\s*sống\s*(?:nữa|tiếp)/,
      /chẳng\s*(?:muốn|thiết)\s*sống/,
      /kết\s*thúc\s*(?:cuộc\s*đời|cuộc\s*sống|tất\s*cả)/,
      /(?:không\s*còn|chẳng\s*còn)\s*lý\s*do\s*(?:gì\s*)?để\s*sống/,
      new RegExp(SUBJECT + String.raw`\s*(?:thật\s*sự\s*|chỉ\s*)?muốn\s*chết`),
      /chết\s*đi\s*cho\s*(?:xong|rồi)/,
      /biến\s*mất\s*(?:mãi\s*mãi|vĩnh\s*viễn)/,
    ],
  },
  {
    level: "urgent",
    reason: "Nhắc tới bị bạo lực hoặc xâm hại",
    patterns: [
      /bị\s*(?:bố|mẹ|ba|cha|anh|chị|người\s*lớn|ai\s*đó|họ)?\s*(?:đánh\s*đập|bạo\s*hành)/,
      /bị\s*xâm\s*hại/,
      /bị\s*(?:sờ\s*soạng|sàm\s*sỡ|hiếp|cưỡng\s*hiếp)/,
      /bị\s*ép\s*(?:quan\s*hệ|chụp\s*ảnh|cởi)/,
    ],
  },
  {
    level: "concern",
    reason: "Nhắc tới bị bắt nạt, đe dọa hoặc bị đánh",
    patterns: [
      /bị\s*bắt\s*nạt/,
      /bị\s*(?:đe\s*dọa|tống\s*tiền)/,
      /bị\s*(?:bố|mẹ|ba|cha|anh|chị|bạn|họ)?\s*đánh(?!\s*giá|\s*thức|\s*vần|\s*máy|\s*bại)/,
      /bị\s*cô\s*lập/,
    ],
  },
];

export type ExtraPhrases = { urgent: string[]; concern: string[] };

/**
 * @param extra cụm từ admin thêm trên web (so khớp nguyên cụm, không phân biệt hoa thường)
 */
export function keywordCheck(
  text: string,
  extra: ExtraPhrases = { urgent: [], concern: [] },
): { level: RiskLevel; reasons: string[] } {
  const normalized = text.toLowerCase().normalize("NFC");
  let level: RiskLevel = "none";
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      reasons.push(rule.reason);
      level = maxLevel(level, rule.level);
    }
  }
  for (const lvl of ["urgent", "concern"] as const) {
    const hit = extra[lvl].find((p) => p.trim() && normalized.includes(p.trim().toLowerCase().normalize("NFC")));
    if (hit) {
      reasons.push(`Cụm từ admin thêm: "${hit.trim()}"`);
      level = maxLevel(level, lvl);
    }
  }
  return { level, reasons };
}

const ORDER: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };

export function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return ORDER[a] >= ORDER[b] ? a : b;
}

/** Tóm tắt các nhóm cụm từ có sẵn trong code (để hiện cho admin xem). */
export const BUILT_IN_RULES = RULES.map((r) => ({ level: r.level, reason: r.reason, count: r.patterns.length }));
