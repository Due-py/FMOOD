// ĐỔI TÊN "MÂY" TRONG NỘI DUNG ĐÃ LƯU (kế hoạch Demo 3, Bước 9.0) – hàm thuần, dùng cho scripts/doi-ten-tro-ly.ts.
// Chỉ đổi chữ "Mây" viết hoa đứng riêng thành một từ (tên linh vật cũ); "mây" viết thường (đám mây thật) giữ nguyên.
// Mặc định thay bằng "mình" (lời thoại của trợ lý tự xưng), đầu câu viết hoa "Mình".

const NAME = /(^|[^\p{L}])Mây(?![\p{L}])/gu;

/** Thay "Mây" trong một chuỗi; `to` là từ thay thế (mặc định "mình"). Đầu câu thì viết hoa chữ đầu. */
export function renameAssistant(text: string, to = "mình"): string {
  return text.replace(NAME, (_m, before: string, offset: number) => {
    const head = text.slice(0, offset + before.length);
    const sentenceStart = /(^|[.!?…:]\s*|\n\s*|["“«(]\s*)$/u.test(head);
    const word = sentenceStart ? to.charAt(0).toUpperCase() + to.slice(1) : to;
    return `${before}${word}`;
  });
}

/** Đổi mọi chuỗi trong một giá trị JSON (đối tượng, mảng lồng nhau). Trả về giá trị mới và số chỗ đã đổi. */
export function renameInJson(value: unknown, to = "mình"): { value: unknown; changes: { path: string; before: string; after: string }[] } {
  const changes: { path: string; before: string; after: string }[] = [];
  const walk = (v: unknown, path: string): unknown => {
    if (typeof v === "string") {
      const after = renameAssistant(v, to);
      if (after !== v) changes.push({ path, before: v, after });
      return after;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, path ? `${path}.${k}` : k)]));
    return v;
  };
  return { value: walk(value, ""), changes };
}
