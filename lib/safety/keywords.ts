// LỚP 1: BỘ LỌC TỪ KHÓA
// Chạy trên máy chủ, không cần mạng, để vẫn bắt được câu nguy hiểm khi AI gặp lỗi.
// Giáo viên có thể đọc và bổ sung các cụm từ bên dưới.
//
// Tin nhắn được chuẩn hóa trước khi so (xem normalize.ts): bỏ dấu, mở viết tắt
// ("k mún sống nữa" → "khong muon song nua"). Vì vậy các mẫu dưới đây viết KHÔNG DẤU.
//
// Lưu ý: tiếng Việt hay nói quá ("mệt muốn chết", "bài khó muốn chết", "chán chết"),
// nên chỉ đưa vào đây những cụm từ RÕ RÀNG. Câu mơ hồ, nói vòng vo để lớp AI xử lý.
// Mỗi mẫu mới cần thêm câu thử (cả câu nên bắt và câu nói quá không được bắt) vào keywords.test.ts.

import { normalizeForMatch } from "./normalize";

export type RiskLevel = "none" | "concern" | "urgent";

type Rule = { level: Exclude<RiskLevel, "none">; reason: string; patterns: RegExp[] };

/** Chủ ngữ ngôi thứ nhất (đã bỏ dấu): mình, tôi, tao, tớ, em, con, cháu, tui (→ toi). */
const I = String.raw`(?:minh|toi|tao|to|em|con|chau)`;
/** Ý định: muốn, định, sẽ, nghĩ tới... */
const INTENT = String.raw`(?:muon|dinh|se|tinh|quyet dinh|nghi den|nghi toi|nghi ve|lam sao de|cach de|cach)`;

const re = (s: string) => new RegExp(s);

const RULES: Rule[] = [
  {
    level: "urgent",
    reason: "Nhắc tới ý định tự tử / tự làm hại bản thân",
    patterns: [
      // "tự tử", "tự sát" có dấu được gộp thành "tutu"; "tu sat" không dấu gần như chỉ có một nghĩa
      /\btutu\b/,
      /\btu sat\b/,
      // "tu tu" không dấu có thể là "từ từ": cần chữ chỉ ý định đứng trước, và "tu tu" phải đứng cuối câu
      // hoặc đi với "cho xong / that"; còn "tu tu hoc lai", "tu tu thoi" là "từ từ" (dần dần)
      re(String.raw`\b${INTENT} (?:chuyen |viec )?tu tu(?: (?:cho xong|di cho xong|that)\b|$)`),
      /\b(?:suicide|unalive|kms|kill myself|end my life)\b/,
      /\btu (?:lam )?(?:hai|dau|hanh ha) (?:ban than|minh|chinh minh|chinh ban than|than the)\b/,
      /\brach (?:tay|co tay|da|nguoi)\b/,
      /\bcat co tay\b/,
      /\btreo co\b/,
      /\bnhay (?:lau|song|xuong song|xuong ho|tu tang|xuong tu tang)\b/,
      re(String.raw`\b${INTENT} nhay cau\b`),
      /\buong (?:het|ca lo|ca vi|ca hop|that nhieu|qua lieu|mot dong) thuoc\b/,
      /\b(?:khong|chang) (?:con )?(?:muon|thiet) song(?: nua| tiep|$)/,
      /\b(?:khong|chang) (?:con )?muon (?:tinh day|thuc day|thuc giac|ton tai)(?: nua|$)/,
      re(String.raw`\b(?:se|muon|dinh|quyet dinh|tinh) ket thuc (?:moi chuyen|tat ca|moi thu|cuoc doi|cuoc song|ban than|doi minh)\b`),
      /\bket thuc (?:cuoc doi|cuoc song|doi minh)\b/,
      /\b(?:khong|chang) con ly do (?:gi )?de (?:song|co|co gang|tiep tuc)\b/,
      // "mình muốn chết" (chủ ngữ đứng sát) — "mệt muốn chết", "bài khó muốn chết" không khớp
      re(String.raw`\b${I} (?:that su |chi |that |rat |cung |thuc su )?muon (?:chet|die)\b(?! cuoi| vi (?:xau ho|que|ngai|cuoi))`),
      /(?:^|\b(?:nhieu luc|co luc|nhieu khi|co khi|dao nay|gio) )chi muon chet\b(?! cuoi)/,
      re(String.raw`\b${I} (?:chet|die) di cho (?:xong|roi)\b`),
      /\bbien mat (?:mai mai|vinh vien|khoi the gioi|khoi cuoc doi|khoi cuoc song)\b/,
      /\bthu tuyet menh\b/,
      /\bviet (?:xong )?thu tam biet (?:cho|gui) (?:bo me|ca nha|gia dinh|moi nguoi|bo|me|ba)\b/,
    ],
  },
  {
    level: "urgent",
    reason: "Nhắc tới bị bạo lực, xâm hại hoặc bị ép gửi ảnh riêng tư",
    patterns: [
      /\bbi (?:\w+ )?(?:danh dap|bao hanh|hanh ha)\b/,
      /\bbi xam hai\b/,
      /\bbi (?:\w+ )?(?:so soang|sam so|hiep|cuong hiep|lam nhuc)\b/,
      /\bbi ep (?:quan he|chup anh|coi|gui anh|quay clip|lam chuyen)\b/,
      /\b(?:doi|bat|ep|du) (?:\w+ )?(?:gui|chup|quay) (?:anh|clip|video|hinh) (?:nong|rieng tu|khoa than|nude|ho hang)\b/,
      /\bdoa (?:tung|phat tan|dang) (?:anh|clip|video|hinh) (?:nong|rieng tu|khoa than|nude|ho hang)\b/,
    ],
  },
  {
    level: "concern",
    reason: "Nhắc tới bị bắt nạt, đe dọa, cô lập hoặc bị đánh",
    patterns: [
      /\bbi bat nat\b/,
      /\bbi (?:\w+ ){0,3}(?:de doa|tong tien|kho de|chan duong)\b/,
      /\bbi doa\b/,
      // "bị (bố) đánh" — trừ "bị đánh giá / thức / vần / rơi / thua…"
      /\bbi (?:bo |me |ba |cha |anh |chi |ban |ho |no |chu |duong )?danh(?! (?:gia|thuc|van|may|bai|dau|lua|trao|thue|so|truot|roi|cap|bong|phan|thua|tieng|nhau|rang|son|ban|dan|trong|xe|co))\b/,
      /\b(?:hay|thuong|lai|cu|toan|suot ngay) danh (?:minh|em|con|toi|tao)\b/,
      /\bbi (?:co lap|tay chay|cho ra ria|noi xau|che anh|body shame|bodyshame)\b/,
      /\bdoa (?:tung|phat tan) (?:tin|bi mat|chuyen)\b/,
    ],
  },
  {
    level: "concern",
    reason: "Nhắc tới buồn bã, tuyệt vọng kéo dài",
    patterns: [
      /\b(?:dem nao|toi nao|ngay nao) (?:\w+ )?cung khoc\b/,
      /\bkhoc (?:moi|hang|ca) (?:dem|toi|ngay)\b/,
      re(String.raw`\b${I} (?:chi )?la (?:mot )?ganh nang\b`),
      /\bganh nang (?:cua|cho) (?:ca nha|gia dinh|moi nguoi|bo me)\b/,
      /\bsong (?:de )?lam gi(?: nua)?\b/,
      /\b(?:so|khong dam) ve nha\b/,
      /\bmoc hong (?:cho )?non\b/,
    ],
  },
];

export type ExtraPhrases = { urgent: string[]; concern: string[] };

/**
 * @param extra cụm từ admin thêm trên web (so khớp nguyên cụm, không phân biệt hoa thường,
 *              có dấu hay không dấu đều được)
 */
export function keywordCheck(
  text: string,
  extra: ExtraPhrases = { urgent: [], concern: [] },
): { level: RiskLevel; reasons: string[] } {
  const normalized = normalizeForMatch(text);
  const nfc = text.toLowerCase().normalize("NFC");
  let level: RiskLevel = "none";
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      reasons.push(rule.reason);
      level = maxLevel(level, rule.level);
    }
  }
  for (const lvl of ["urgent", "concern"] as const) {
    const hit = extra[lvl].find((p) => {
      const phrase = p.trim().toLowerCase().normalize("NFC");
      if (!phrase) return false;
      // cụm có dấu: so nguyên văn; thêm bản không dấu để bắt cả cách gõ không dấu
      return nfc.includes(phrase) || ` ${normalized} `.includes(` ${normalizeForMatch(phrase)} `);
    });
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
