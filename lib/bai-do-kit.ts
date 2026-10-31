// Dựng phiếu bài đo từ đề trong bộ đo (ho-so-du-thi/3-kiem-thu/bo-do-ky-nang/). Phần thuần, không đọc file
// hay cơ sở dữ liệu: scripts/bai-do/tao-phieu.ts đọc file rồi gọi vào đây; test kiểm tra đủ câu.
import { AI_USE_OPTIONS, AI_USE_QUESTION, TEST_IDS, type TestForm, type TestRound } from "./bai-do";
import type { SurveyQuestion } from "./surveys";

/** Bỏ dấu nhấn mạnh của Markdown (**đậm**, *nghiêng*), giữ chữ. */
export function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").trim();
}

type Situation = { n: number; context: string[]; questions: { id: string; text: string }[] };

/** Đọc đề (1-bai-tinh-huong-de-A.md / de-B.md): lời dặn đầu bài và 4 tình huống, mỗi tình huống có các câu 1a, 1b… */
export function parseTestForm(md: string): { intro: string; situations: Situation[] } {
  const lines = md.split(/\r?\n/);
  const intro = lines
    .filter((l) => l.startsWith(">"))
    .map((l) => plain(l.replace(/^>\s?/, "")))
    .filter(Boolean)
    .join("\n");

  const situations: Situation[] = [];
  let current: Situation | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const head = line.match(/^###\s+Tình huống\s+(\d)/u);
    if (head) {
      current = { n: Number(head[1]), context: [], questions: [] };
      situations.push(current);
      continue;
    }
    if (!current || !line || /^_+$/.test(line) || line === "---") continue;
    if (line.startsWith("*Cảm ơn em")) {
      current = null;
      continue;
    }
    const q = line.match(/^\*\*(\d[a-z])\.\*\*\s*(.+)$/u);
    if (q) current.questions.push({ id: q[1], text: plain(q[2]) });
    else if (current.questions.length === 0) current.context.push(line.startsWith("- ") ? `• ${plain(line.slice(2))}` : plain(line));
  }
  return { intro, situations };
}

type ExtraQuestions = {
  selfRating: { id: string; text: string }[];
  scale: { min: string; max: string };
  hv1: { text: string; options: string[] };
  hv2: { text: string; options: string[] };
};

/** Đọc TĐ1–TĐ4, HV1, HV2 trong 3-cau-hoi-them-vao-phieu.md. */
export function parseExtraQuestions(md: string): ExtraQuestions {
  const lines = md.split(/\r?\n/).map((l) => l.trim());
  const selfRating = lines
    .map((l) => l.match(/^- \*\*\[TĐ(\d)\]\*\*\s*(.+)$/u))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    // bỏ phần ghi kỹ năng trong ngoặc: phiếu phát cho học sinh không có phần này
    .map((m) => ({ id: `TD${m[1]}`, text: plain(m[2].replace(/\s*\*\([^)]*\)\*\s*$/u, "")) }));

  const scaleLine = lines.find((l) => /^Lựa chọn: 1 /u.test(l)) ?? "";
  const scaleParts = scaleLine.replace(/^Lựa chọn:\s*/u, "").split("·").map((s) => s.trim().replace(/^\d\s+/, ""));

  const hv = (n: 1 | 2) => {
    const i = lines.findIndex((l) => l.startsWith(`- **[HV${n}]**`));
    if (i === -1) throw new Error(`Không thấy câu HV${n}`);
    const text = plain(
      lines[i]
        .replace(`- **[HV${n}]**`, "")
        .replace(/\*\(chỉ hỏi khi[^)]*\)\*/u, "")
        .trim(),
    );
    const optLine = lines.slice(i + 1).find((l) => l.startsWith("Lựa chọn:")) ?? "";
    const options = optLine.replace(/^Lựa chọn:\s*/u, "").split("·").map((s) => plain(s)).filter(Boolean);
    return { text, options };
  };

  return { selfRating, scale: { min: scaleParts[0] ?? "", max: scaleParts[scaleParts.length - 1] ?? "" }, hv1: hv(1), hv2: hv(2) };
}

/** Các lựa chọn HV1 tính là "từ 1 lần trở lên" (HV2 chỉ hỏi khi chọn một trong số này). */
export function hv1AtLeastOnce(options: string[]): string[] {
  return options.filter((o) => /lần/u.test(o) && !/^Chưa/u.test(o));
}

/** Toàn bộ câu hỏi của một phiếu bài đo: (DD ở lần 2) + 9 câu tình huống + TĐ1–TĐ4 + HV1, HV2 + câu dùng AI. */
export function buildTestQuestions(formMd: string, extraMd: string, round: TestRound): SurveyQuestion[] {
  const { situations } = parseTestForm(formMd);
  const extra = parseExtraQuestions(extraMd);
  const out: SurveyQuestion[] = [];
  const base = { required: false, options: [] as string[], minLabel: "", maxLabel: "" };

  if (round === 2) {
    out.push({ ...base, id: TEST_IDS.readBefore, type: "choice", text: "Trước hôm nay, em đã từng đọc đề này chưa?", required: true, options: ["Chưa", "Rồi"] });
  }
  for (const s of situations) {
    s.questions.forEach((q, i) => {
      // câu đầu của mỗi tình huống kèm đoạn tả tình huống (đoạn trên, cách một dòng trống)
      const text = i === 0 ? `Tình huống ${s.n}\n${s.context.join("\n")}\n\n${q.id}. ${q.text}` : `${q.id}. ${q.text}`;
      out.push({ ...base, id: q.id, type: "text", text });
    });
  }
  extra.selfRating.forEach((q, i) => {
    const text = i === 0 ? `Phần cuối. Những câu sau đúng với em tới mức nào?\n\n${q.text}` : q.text;
    out.push({ ...base, id: q.id, type: "scale", text, minLabel: extra.scale.min, maxLabel: extra.scale.max });
  });
  out.push({ ...base, id: "HV1", type: "choice", text: `Trong 2 tuần vừa qua…\n\n${extra.hv1.text}`, options: extra.hv1.options });
  out.push({
    ...base,
    id: "HV2",
    type: "choice",
    text: extra.hv2.text,
    options: extra.hv2.options,
    showIf: { id: "HV1", in: hv1AtLeastOnce(extra.hv1.options) },
  });
  out.push({ ...base, id: TEST_IDS.aiUse, type: "choice", text: AI_USE_QUESTION, required: true, options: AI_USE_OPTIONS });
  return out;
}

export function testTitle(round: TestRound, form: TestForm): string {
  return `Bài đo kỹ năng · Lần ${round} · Đề ${form}`;
}
