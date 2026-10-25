// CHUẨN HÓA TIN NHẮN TRƯỚC KHI DÒ TỪ KHÓA
// Học sinh hay gõ không dấu, viết tắt (teencode), kéo dài chữ ("chếttttt").
// Hàm này đưa mọi cách viết về một dạng chung: chữ thường, không dấu, đã mở viết tắt,
// các từ cách nhau đúng một dấu cách. Ví dụ: "K mún sốnggg nữa" → "khong muon song nua".

/** Bỏ dấu tiếng Việt: "Không muốn sống" → "khong muon song". */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

// Viết tắt / teencode phổ biến (tính trên chữ đã bỏ dấu).
const TEENCODE: Record<string, string> = {
  k: "khong", ko: "khong", kh: "khong", kg: "khong", khg: "khong", khog: "khong", hok: "khong",
  hong: "khong", hk: "khong", khum: "khong", hem: "khong",
  mk: "minh", mik: "minh", mjk: "minh", mh: "minh", mjnh: "minh", mih: "minh",
  tui: "toi", t: "toi", e: "em",
  j: "gi", dc: "duoc", dk: "duoc",
  mun: "muon", nx: "nua", ns: "noi", vs: "voi", bt: "biet", bik: "biet",
  ng: "nguoi", mn: "moi nguoi", wa: "qua", lun: "luon", r: "roi", ik: "di",
  chit: "chet",
};

// Chữ có dấu mà bỏ dấu sẽ trùng với chữ nguy hiểm: giữ nguyên dấu.
// Ví dụ "từ từ" (chậm thôi) không được thành "tu tu" (dễ nhầm với "tự tử").
const KEEP_ACCENT = new Set(["từ"]);

// Chữ có dấu viết kiểu teencode, cần đổi trước khi bỏ dấu ("chớt" → "chết").
const ACCENTED_TEENCODE: Record<string, string> = { chớt: "chet" };

/**
 * Dạng chuẩn để dò từ khóa. "tự tử" / "tự sát" (có dấu) được gộp thành một chữ "tutu"
 * để phân biệt với "tu tu" không dấu (có thể là "từ từ").
 */
export function normalizeForMatch(text: string): string {
  const lower = text.toLowerCase().normalize("NFC").replace(/tự\s*(?:tử|sát)/g, " tutu ");
  const out: string[] = [];
  for (const token of lower.split(/[^\p{L}\p{N}]+/u)) {
    if (!token) continue;
    // kéo dài chữ: "chếttttt" → "chết"
    const raw = token.replace(/(\p{L})\1{2,}/gu, "$1");
    if (ACCENTED_TEENCODE[raw]) {
      out.push(ACCENTED_TEENCODE[raw]);
      continue;
    }
    if (KEEP_ACCENT.has(raw)) {
      out.push(raw);
      continue;
    }
    // "nuaa" → "nua"
    const plain = fold(raw).replace(/([a-z])\1$/, "$1");
    out.push(TEENCODE[plain] ?? plain);
  }
  return out.join(" ");
}
