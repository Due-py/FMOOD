// MỘT CÂU HỎI MỖI LƯỢT (hàm thuần, có test). Lời dặn đã yêu cầu, đây là chốt chặn bằng code khi chạy thật:
// câu trả lời có nhiều câu hỏi hơn mức cho phép thì cắt từ đầu câu hỏi thừa. Dòng thẻ [GOAL / SKILL / END] không tính.
// Câu đặt trong ngoặc kép (câu gợi ý học sinh tự hỏi: “Mình đã thử được gì?”) không tính là câu hỏi cho học sinh.

const CARD_LINE = /^\s*\[(GOAL|SKILL|END):/;
const ENDS = new Set([".", "!", "?", "…", "\n"]);

/**
 * Vị trí cần cắt để câu văn còn tối đa `max` câu hỏi, hoặc -1 (không cần cắt).
 * Không cắt nếu phần còn lại không có chữ nào (thà để hai câu hỏi còn hơn trả lời rỗng).
 */
export function questionCutAt(text: string, max: number): number {
  let questions = 0;
  let sentenceStart = 0;
  let lineStart = 0;
  let inCard = CARD_LINE.test(text);
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n") {
      inQuote = false;
      lineStart = i + 1;
      inCard = CARD_LINE.test(text.slice(lineStart, text.indexOf("\n", lineStart) === -1 ? undefined : text.indexOf("\n", lineStart)));
      sentenceStart = i + 1;
      continue;
    }
    if (inCard) continue;
    if (c === "“" || c === "”" || c === '"') {
      inQuote = c === "“" ? true : c === "”" ? false : !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (c === "?") {
      questions++;
      if (questions > max) return /\p{L}/u.test(text.slice(0, sentenceStart)) ? sentenceStart : -1;
    }
    if (ENDS.has(c)) sentenceStart = i + 1;
  }
  return -1;
}

/** Dòng thẻ trong câu trả lời (giữ lại khi cắt câu văn). */
export function cardLines(text: string): string[] {
  return text.split("\n").filter((l) => CARD_LINE.test(l));
}

/** Cắt câu văn còn tối đa `max` câu hỏi, giữ nguyên các dòng thẻ ở cuối. */
export function limitQuestions(text: string, max: number): string {
  const cut = questionCutAt(text, max);
  if (cut === -1) return text;
  const cards = cardLines(text.slice(cut));
  return [text.slice(0, cut).trimEnd(), ...cards].join("\n");
}
