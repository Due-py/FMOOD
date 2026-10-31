// KIỂM TRA CÂU TRẢ LỜI CỦA TRỢ LÝ TRƯỚC KHI HIỆN (hàm thuần, không gọi AI nên gần như không tốn thời gian).
// Chặn những câu AI có thể viết sai mà lời dặn đã cấm: hứa đã báo thầy cô (QT11), chẩn đoán bệnh,
// nói tên thuốc, hứa giữ bí mật tuyệt đối, xin thông tin cá nhân, hướng dẫn tự làm hại,
// và LÀM HỘ bài của chính học sinh (khong-lam-ho, kế hoạch Demo 3 mục 2.4: cần tin nhắn của học sinh để so).
import { fold } from "./normalize";

export type GuardReason =
  | "hua-da-bao"
  | "chan-doan"
  | "ten-thuoc"
  | "hua-bi-mat"
  | "xin-thong-tin"
  | "huong-dan-nguy-hiem"
  | "lam-ho";

const RULES: { reason: GuardReason; pattern: RegExp }[] = [
  {
    // "mình đã báo cô chủ nhiệm", "thầy cô đang đến", "mình đã gọi người giúp bạn"
    reason: "hua-da-bao",
    pattern:
      /(mình|tớ|Sóc|Cú|Kiến)\s+(đã|vừa|sẽ)\s+(báo|gửi|nhắn|gọi|chuyển lời|kể)\s+(cho\s+|với\s+)?(thầy|cô|giáo viên|phòng tham vấn|tư vấn viên|bố mẹ|ba mẹ|người lớn|ai đó|người giúp)|(thầy cô|thầy|cô|người lớn|ai đó|người)\s+(đang|sẽ)\s+(đến|tới)\s+(ngay|giúp|với)/iu,
  },
  {
    reason: "chan-doan",
    pattern:
      /(bạn|cậu|em)\s+(đang\s+|có thể\s+|chắc là\s+|có lẽ\s+)?(bị|mắc|có dấu hiệu|có triệu chứng)\s+(của\s+)?(bệnh\s+)?(trầm cảm|rối loạn|tâm thần|tự kỷ|adhd|tăng động|lưỡng cực)/iu,
  },
  {
    reason: "ten-thuoc",
    pattern: /(thuốc ngủ|thuốc an thần|thuốc chống trầm cảm|seduxen|diazepam|xanax|prozac|sertraline|fluoxetine)/iu,
  },
  {
    reason: "hua-bi-mat",
    pattern: /(giữ bí mật tuyệt đối|không (ai|bao giờ có ai) biết (được )?đâu|mình hứa (sẽ )?không (nói|kể) với ai)/iu,
  },
  {
    reason: "xin-thong-tin",
    pattern:
      /(cho mình|gửi mình|nói mình|bạn (hãy )?cho mình)\s+(biết\s+|xin\s+)?(số điện thoại|địa chỉ( nhà)?|họ tên thật|tên thật|tên trường)/iu,
  },
  {
    reason: "huong-dan-nguy-hiem",
    pattern: /(cách|liều|bao nhiêu viên)\s.{0,20}(tự tử|tự sát|tự làm đau|tự làm hại|cắt tay)/iu,
  },
];

/** Câu thay thế khi câu trả lời bị chặn: thừa nhận, không giả vờ như không có gì. */
export const BLOCKED_REPLY =
  "Mình xin lỗi, câu trả lời vừa rồi của mình chưa phù hợp nên mình đã ẩn đi. Bạn kể tiếp cho mình nghe nhé? Nếu cần người thật, bạn bấm “Cần giúp” ở góc trên.";

/** Câu thay thế khi câu trả lời là bản làm hộ: nói rõ vì sao và mời học sinh tự làm, có khung giúp. */
export const LAM_HO_REPLY =
  "Mình không làm thay bài của bạn được, vì tự làm thì bạn mới luyện được kỹ năng. Mình có thể đưa một khung có chỗ trống, hoặc hỏi vài câu để bạn tự làm từng bước. Bạn muốn cách nào?";

/**
 * Kiểm tra câu trả lời. `studentMessage` (không bắt buộc): tin nhắn hoặc bài làm của học sinh,
 * có thì kiểm tra thêm câu trả lời có phải bản làm hộ không (lamHo).
 */
export function guardReply(text: string, studentMessage?: string): { ok: boolean; reasons: GuardReason[] } {
  const reasons = RULES.filter((r) => r.pattern.test(text)).map((r) => r.reason);
  if (studentMessage && lamHo(studentMessage, text)) reasons.push("lam-ho");
  return { ok: reasons.length === 0, reasons };
}

/** Câu thay thế hợp với lý do bị chặn. */
export function blockedReplyFor(reasons: GuardReason[]): string {
  return reasons.length === 1 && reasons[0] === "lam-ho" ? LAM_HO_REPLY : BLOCKED_REPLY;
}

// ───────── KHÔNG LÀM HỘ (khong-lam-ho) ─────────
// Ranh giới (kế hoạch Demo 3, mục Nguyên tắc): mẫu ở tình huống KHÁC hoặc khung có chỗ trống (___) là làm mẫu.
// Bản đã điền xong cho ĐÚNG tình huống của học sinh (kế hoạch của chính bạn ấy, lời nhờ cho đúng bài bạn ấy
// đang vướng, lời giải bài bạn ấy đang làm) là làm hộ. Hàm thuần, chỉ dựa vào chữ, không gọi AI.

export type LamHoKind = "thoi-gian-bieu" | "bai-lam" | "loi-nho";

// tên môn (chữ có dấu); bỏ trước các từ ghép dễ nhầm: "học sinh", "sử dụng", "lý do", "tin nhắn"…
// tên nhiều chữ đứng trước ("ngữ văn", "anh văn" trước "văn")
const SUBJECTS = ["ngữ văn", "anh văn", "tiếng anh", "vật lý", "vật lí", "lịch sử", "tin học", "công nghệ", "toán", "văn", "lý", "lí", "hóa", "hoá", "sinh", "sử", "địa", "gdcd", "khtn"];
const NOT_SUBJECT =
  /(học sinh|sinh nhật|sinh hoạt|sinh ra|nảy sinh|xảy ra|sử dụng|lý do|lí do|xử lý|xử lí|quản lý|hợp lý|hợp lí|tâm lý|tâm lí|địa chỉ|địa điểm|hóa ra|hoá ra|biến hóa|văn phòng|tin nhắn|tin tưởng|thông tin|tự tin|tin là)/giu;
const SUBJECT_ALIAS: Record<string, string> = { "ngữ văn": "văn", "anh văn": "tiếng anh", "vật lý": "lý", "vật lí": "lý", lí: "lý", hoá: "hóa", "lịch sử": "sử", "tin học": "tin" };

function subjectsIn(text: string): Set<string> {
  let t = text.toLowerCase().normalize("NFC").replace(NOT_SUBJECT, " ");
  const found = new Set<string>();
  // lấy xong thì xóa để không đếm hai lần ("ngữ văn" rồi mới tới "văn")
  for (const s of SUBJECTS) {
    const re = new RegExp(`(^|[^\\p{L}])${s}(?=[^\\p{L}]|$)`, "giu");
    if (re.test(t)) {
      found.add(SUBJECT_ALIAS[s] ?? s);
      t = t.replace(re, "$1 ");
    }
  }
  return found;
}

/** Số giờ cụ thể khác nhau trong câu: 19h, 19h30, 19:30, 7 giờ, 7g30, 20 giờ 15. */
export function clockTimes(text: string): number {
  const set = new Set<string>();
  // "Bước 1:" không phải giờ: dạng có dấu hai chấm phải có phút
  for (const m of text.matchAll(/(?<![\d:])(\d{1,2})\s*(?:(?:h|g|giờ)\s*(\d{2})?|:(\d{2}))(?![\p{L}\d])/giu)) {
    const h = Number(m[1]);
    if (h > 24) continue;
    set.add(`${h}:${m[2] ?? m[3] ?? "00"}`);
  }
  return set.size;
}

/** Học sinh đòi làm thay: "viết hộ", "làm giùm", "giải giúp", "lập hộ", "soạn dùm" (cả khi gõ không dấu). */
export function asksToDoFor(studentMessage: string): boolean {
  return /(^|[^a-z])(viet|lam|giai|lap|soan|chep)\s+(ho|gium|dum|giup|thay)([^a-z]|$)/.test(fold(studentMessage));
}

const OTHER_SITUATION = /(ví dụ|chẳng hạn|giả sử|một bạn|bạn khác|bạn kia)/iu;
const HAS_BLANK = /_{3,}|…\s*…|\.{6,}/u;
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * Câu trả lời có phải bản làm hộ cho đúng việc của học sinh không.
 * - thoi-gian-bieu: có từ 3 giờ cụ thể trở lên, cho đúng các môn học sinh vừa kể (hoặc học sinh đòi lập hộ)
 * - bai-lam: học sinh đòi làm hộ mà câu trả lời là bài đã viết xong (dài) hoặc lời giải có đáp số
 * - loi-nho: học sinh đòi viết hộ tin nhắn / lời nhờ mà câu trả lời là lời nhắn hoàn chỉnh gửi thầy cô
 * Không chặn khung có chỗ trống (___) và mẫu ở tình huống khác (không trùng môn, không đòi làm hộ).
 */
export function lamHo(studentMessage: string, reply: string): LamHoKind | null {
  const asked = asksToDoFor(studentMessage);
  const blanks = HAS_BLANK.test(reply);

  const times = clockTimes(reply);
  if (times >= 3) {
    const mine = subjectsIn(studentMessage);
    const shared = [...subjectsIn(reply)].filter((s) => mine.has(s)).length;
    // trùng môn học sinh vừa kể: làm hộ kể cả khi gọi là "ví dụ"; chưa kể môn nào mà đòi lập hộ: làm hộ trừ khi rõ là mẫu cho bạn khác
    if (mine.size > 0 && shared >= Math.min(2, mine.size)) return "thoi-gian-bieu";
    if (asked && mine.size === 0 && !OTHER_SITUATION.test(reply)) return "thoi-gian-bieu";
  }
  if (!asked || blanks) return null;

  const studentFolded = fold(studentMessage);
  if (/(tin nhan|loi nhan|loi nho|thu |email|mail|don xin|nhan cho (co|thay)|noi voi (co|thay))/.test(studentFolded)) {
    if (/(thưa|em chào|kính gửi|em xin chào)\s+(thầy|cô)|(thầy|cô)\s+ơi[,!]?\s+em|(^|[^\p{L}])em\s[^.!?\n]{3,120}(được không ạ|ạ[.!])/iu.test(reply)) return "loi-nho";
  }
  const lines = reply.split("\n").filter((l) => /=/.test(l)).length;
  if (lines >= 2 || /(đáp số|vậy\s+\p{L}{1,3}\s*=|kết quả là\s*\d)/iu.test(reply)) return "bai-lam";
  if (words(reply) >= 120) return "bai-lam";
  return null;
}

/**
 * Vị trí cắt an toàn để gửi dần: hết câu cuối cùng trong đoạn chữ (dấu . ! ? … hoặc xuống dòng).
 * Gửi theo từng câu đã kiểm tra thì học sinh vẫn thấy chữ hiện dần mà không thấy câu sai.
 */
export function lastSentenceEnd(text: string): number {
  let end = -1;
  for (const m of text.matchAll(/[.!?…\n]+["”)\]]*\s/gu)) end = (m.index ?? 0) + m[0].length;
  return end;
}
