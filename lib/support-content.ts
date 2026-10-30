// NỘI DUNG VÒNG HỖ TRỢ (chủ đề, câu hỏi, việc nhỏ, câu mở lời, huy hiệu, lời của Mây)
// Mỗi mục có 3 trạng thái do cô Thúy chọn trong trang thầy cô:
//   off  = Tắt (không ai thấy)
//   test = Chỉ lớp thử (lớp có classes.is_test)
//   on   = Bật cho mọi lớp
// File này dùng chung cho máy chủ và trình duyệt (không đọc cơ sở dữ liệu).
import { z } from "zod";

export type ContentStatus = "off" | "test" | "on";

export const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: "off", label: "Tắt" },
  { value: "test", label: "Chỉ lớp thử" },
  { value: "on", label: "Bật cho mọi lớp" },
];

export type ContentKind =
  | "topic"
  | "ask"
  | "starter"
  | "fill_blank"
  | "tiny_action"
  | "opener"
  | "badge"
  | "may_line"
  | "crisis_draft";

export type SupportItem = {
  id: string;
  key: string;
  kind: ContentKind;
  topic: string | null;
  sortOrder: number;
  data: Record<string, unknown>;
  status: ContentStatus;
  reviewedByName: string | null;
  reviewedAt: string | null;
};

/** Mục nội dung trong file mẫu (content/vong-ho-tro/noi-dung-mau.json). */
export type SeedItem = { key: string; kind: ContentKind; topic: string | null; sortOrder: number; data: Record<string, unknown> };

/** Học sinh của lớp này có thấy mục ở trạng thái này không. */
export function isVisible(status: ContentStatus, isTestClass: boolean): boolean {
  return status === "on" || (status === "test" && isTestClass);
}

const text = (max: number) => z.string().trim().min(2, "Chữ quá ngắn").max(max, `Tối đa ${max} ký tự`);

export const DATA_SCHEMAS: Record<ContentKind, z.ZodType<Record<string, unknown>>> = {
  topic: z.object({
    label: text(30),
    emoji: z.string().trim().min(1).max(8),
    triggers: z.array(text(40)).min(1, "Cần ít nhất một cụm từ nhận diện").max(40),
    /** khó khăn hay gặp, học sinh bấm chọn khi chưa muốn tự viết (rồi xác nhận "Đúng rồi") */
    difficulties: z.array(text(60)).max(8).optional(),
  }),
  ask: z.object({ step: z.enum(["checkin", "level", "followup"]), text: text(200) }),
  starter: z.object({ text: text(120) }),
  fill_blank: z.object({ text: text(120).refine((s) => s.includes("___"), "Câu điền chỗ trống cần có ___") }),
  tiny_action: z.object({
    /** mã hoạt động HD01, HD02… (HD06 là bước hỏi lại sau 3 ngày, không phải việc nhỏ) */
    code: z.string().trim().regex(/^HD\d{2}$/, "Mã dạng HD07").optional(),
    title: text(60),
    minutes: z.number().int().min(1, "Ít nhất 1 phút").max(10, "Tối đa 10 phút"),
    /** dùng khi nào (học sinh thấy) */
    when: text(160).optional(),
    /** cụm từ trong khó khăn đã xác nhận mà việc này hợp (để gợi ý theo khó khăn, không gọi AI) */
    cues: z.array(text(40)).max(20).optional(),
    steps: z.array(text(200)).min(1, "Cần ít nhất một bước").max(8),
    /** câu hỏi để học sinh nhìn lại sau khi làm */
    reflect: text(160).optional(),
    /** chỉ gợi ý khi mức lo không quá số này (ví dụ cùng xem lại suy nghĩ: chỉ khi mức lo ≤ 3) */
    maxLevel: z.number().int().min(1).max(5).optional(),
    /** nút đi tiếp: "help" = soạn lời nhờ thầy cô */
    linkTo: z.enum(["help"]).optional(),
    lessonSlug: z.string().trim().max(80).optional(),
  }),
  opener: z.object({ who: z.enum(["parent", "teacher", "friend"]), text: text(240) }),
  badge: z.object({ name: text(40), emoji: z.string().trim().min(1).max(8), description: text(160), how: text(160) }),
  may_line: z.object({
    moment: z.enum(["worry_saved", "action_done", "followup_better", "followup_same", "followup_worse", "badge"]),
    text: text(240),
  }),
  crisis_draft: z.object({ text: text(2000) }),
};

export function parseItemData(
  kind: ContentKind,
  data: unknown,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const parsed = DATA_SCHEMAS[kind].safeParse(data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ" };
}

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "textarea" | "list" | "number" | "select";
  options?: { value: string; label: string }[];
  /** để trống thì bỏ đi (không bắt buộc) */
  optional?: boolean;
};

const WHO = [
  { value: "parent", label: "Bố mẹ" },
  { value: "teacher", label: "Thầy cô" },
  { value: "friend", label: "Bạn thân" },
];

/** Tên từng loại và các ô để sửa (trang duyệt dựng form từ đây). */
export const KIND_INFO: Record<ContentKind, { label: string; hint: string; fields: FieldSpec[] }> = {
  topic: {
    label: "Chủ đề",
    hint: "Thẻ học sinh chọn khi kể chuyện đang làm mình bận lòng. Cụm từ nhận diện giúp Mây đoán chủ đề trong trò chuyện.",
    fields: [
      { name: "label", label: "Tên chủ đề", type: "text" },
      { name: "emoji", label: "Biểu tượng", type: "text" },
      { name: "triggers", label: "Cụm từ nhận diện (mỗi dòng một cụm)", type: "list" },
      { name: "difficulties", label: "Khó khăn hay gặp, để học sinh bấm chọn (mỗi dòng một câu)", type: "list", optional: true },
    ],
  },
  ask: {
    label: "Câu Mây hỏi",
    hint: "Câu Mây hỏi ở từng bước: sau check-in, khi chọn mức lo, khi hỏi lại sau vài ngày.",
    fields: [
      {
        name: "step",
        label: "Bước",
        type: "select",
        options: [
          { value: "checkin", label: "Sau check-in" },
          { value: "level", label: "Chọn mức lo" },
          { value: "followup", label: "Hỏi lại sau vài ngày" },
        ],
      },
      { name: "text", label: "Câu hỏi", type: "textarea" },
    ],
  },
  starter: {
    label: "Câu mở đầu trò chuyện",
    hint: "Câu học sinh bấm để bắt đầu nói chuyện với Mây, theo chủ đề.",
    fields: [{ name: "text", label: "Câu", type: "text" }],
  },
  fill_blank: {
    label: "Câu điền vào chỗ trống",
    hint: "Cho bạn chưa biết nói gì. Chỗ trống viết là ___.",
    fields: [{ name: "text", label: "Câu", type: "text" }],
  },
  tiny_action: {
    label: "Việc nhỏ",
    hint: "Việc 1–10 phút giúp thấy đỡ hơn một chút. Mây gợi ý theo khó khăn học sinh đã xác nhận (khớp cụm từ), rồi mới tới việc theo chủ đề.",
    fields: [
      { name: "code", label: "Mã hoạt động (HD..)", type: "text", optional: true },
      { name: "title", label: "Tên việc", type: "text" },
      { name: "minutes", label: "Số phút", type: "number" },
      { name: "when", label: "Dùng khi nào (học sinh thấy)", type: "text", optional: true },
      { name: "cues", label: "Hợp với khó khăn có cụm từ (mỗi dòng một cụm)", type: "list", optional: true },
      { name: "steps", label: "Các bước (mỗi dòng một bước)", type: "list" },
      { name: "reflect", label: "Câu nhìn lại sau khi làm", type: "text", optional: true },
      { name: "maxLevel", label: "Chỉ gợi ý khi mức lo không quá (để trống = luôn)", type: "number", optional: true },
      { name: "lessonSlug", label: "Mã bài học liên quan (không bắt buộc)", type: "text", optional: true },
    ],
  },
  opener: {
    label: "Câu mở lời với người lớn / bạn",
    hint: "Mây gợi ý để học sinh dám kể với bố mẹ, thầy cô hoặc bạn thân.",
    fields: [
      { name: "who", label: "Kể với", type: "select", options: WHO },
      { name: "text", label: "Câu mở lời", type: "textarea" },
    ],
  },
  badge: {
    label: "Huy hiệu",
    hint: "Dấu mốc nhận một lần, không đếm, không so sánh với bạn khác.",
    fields: [
      { name: "name", label: "Tên", type: "text" },
      { name: "emoji", label: "Biểu tượng", type: "text" },
      { name: "description", label: "Mô tả", type: "text" },
      { name: "how", label: "Cách nhận", type: "text" },
    ],
  },
  may_line: {
    label: "Lời của Mây",
    hint: "Câu Mây nói ở những lúc quan trọng trong vòng hỗ trợ.",
    fields: [
      {
        name: "moment",
        label: "Lúc",
        type: "select",
        options: [
          { value: "worry_saved", label: "Vừa kể chuyện bận lòng" },
          { value: "action_done", label: "Làm xong việc nhỏ" },
          { value: "followup_better", label: "Hỏi lại: đỡ hơn" },
          { value: "followup_same", label: "Hỏi lại: vẫn vậy" },
          { value: "followup_worse", label: "Hỏi lại: nặng hơn" },
          { value: "badge", label: "Nhận huy hiệu" },
        ],
      },
      { name: "text", label: "Lời Mây", type: "textarea" },
    ],
  },
  crisis_draft: {
    label: "Bản nháp câu trả lời khẩn cấp",
    hint: "Chỉ để đọc. Câu trả lời khẩn cấp đang dùng được sửa ở trang An toàn → Khẩn cấp.",
    fields: [{ name: "text", label: "Nội dung", type: "textarea" }],
  },
};

export const KIND_ORDER: ContentKind[] = [
  "topic",
  "ask",
  "starter",
  "fill_blank",
  "tiny_action",
  "opener",
  "may_line",
  "badge",
  "crisis_draft",
];

/** Những mục trong file mẫu chưa có trong cơ sở dữ liệu (không bao giờ ghi đè mục cô Thúy đã sửa / bật). */
export function planImport(items: SeedItem[], existingKeys: Set<string>) {
  return items
    .filter((i) => !existingKeys.has(i.key))
    .map((i) => ({ key: i.key, kind: i.kind, topic: i.topic, sort_order: i.sortOrder, data: i.data, status: "off" as ContentStatus }));
}
