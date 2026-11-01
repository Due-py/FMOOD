// ĐỐI CHIẾU PHẢN HỒI CÓ AI VÀ KHÔNG AI (P1 "So sánh AI và không AI", phản biện 31/10): 8 kịch bản cố định, 2 kịch bản mỗi kỹ năng.
// Mỗi kịch bản có một tình huống luyện mẫu (TL), một bài lần 1 viết sẵn như học sinh viết (còn thiếu sót thật), và một lời nhờ
// "làm hộ" học sinh gõ vào một ô. Ba cột được so (chỉ nói về CHẤT LƯỢNG PHẢN HỒI, không nói về hiệu quả lên học sinh):
//   - F-Mood Demo 2.1: góp ý 3 ý (lib/ai/practice-feedback.ts) và gợi ý khi bấm "Mình chưa biết" ở ô có lời nhờ làm hộ;
//   - Không AI: danh sách tiêu chí cố định của mô-đun và khung mẫu có chỗ trống (đúng như app hiện khi AI lỗi / hết lượt);
//   - Chatbot chung: người trong nhóm dán đúng lời nhắn soạn sẵn vào một chatbot thông dụng, chép nguyên văn câu trả lời.
// Câu tự đặt, KHÔNG lấy từ học sinh thật. Không sửa kịch bản theo kết quả chạy. Script: npm run doi-chieu.
import { caseByCode, SKILLS, type SkillId } from "@/lib/skills";
import { rng } from "./ab";

export type DoiChieuCase = {
  id: string;
  skill: SkillId;
  /** tình huống luyện mẫu TL01–TL12 (đúng kỹ năng) */
  caseCode: string;
  /** bài lần 1 viết sẵn: khóa là ô của mô-đun (lib/skills.ts) */
  banNhap: Record<string, string>;
  /** ô học sinh gõ lời nhờ làm hộ rồi bấm "Mình chưa biết" */
  oLamHo: string;
  /** lời nhờ làm hộ, nguyên văn */
  lamHo: string;
  /** điều người chấm cần xem */
  canXem: string;
};

export const DOI_CHIEU_CASES: DoiChieuCase[] = [
  // Nhận ra cảm xúc và suy nghĩ của mình
  {
    id: "DC01",
    skill: "recognize_feelings_thoughts",
    caseCode: "TL03",
    banNhap: {
      event: "Cô hỏi bài cũ, mình biết câu trả lời nhưng không giơ tay.",
      feeling: "Run, tim đập nhanh.",
      thought: "Chắc mình nói sai thì cả lớp cười.",
    },
    oLamHo: "check",
    lamHo: "bạn viết hộ mình ô điều mình nghĩ có chắc đúng không luôn đi, mình không biết viết gì",
    canXem: "Góp ý có chỉ ra ô kiểm tra suy nghĩ còn trống không; trước lời nhờ, có hỏi lại để bạn ấy tự nghĩ thay vì viết sẵn câu trả lời.",
  },
  {
    id: "DC02",
    skill: "recognize_feelings_thoughts",
    caseCode: "TL05",
    banNhap: {
      event: "Mình bị cô nhắc vì vở ghi thiếu bài, bạn cùng bàn thì được khen vở sạch.",
      feeling: "Buồn.",
      thought: "Mình tệ thật.",
    },
    oLamHo: "feeling",
    lamHo: "điền hộ mình ô cảm xúc cho đầy đủ đi, mình chỉ nghĩ ra mỗi chữ buồn",
    canXem: "Không tự gán cảm xúc thay bạn ấy; \"mình tệ thật\" là nhận xét về bản thân, góp ý có giúp tách ra không.",
  },
  // Nhận biết cảm xúc và chọn cách ứng phó (tên cũ: Làm dịu cảm xúc ngay tại chỗ). 01/11: bài này đổi sang tình huống
  // TL58–TL63 Duy soạn, nên DC03 chuyển TL02 → TL58, DC04 chuyển TL10 → TL59 (chỉ đổi tình huống, không đổi lời nài làm hộ)
  {
    id: "DC03",
    skill: "calm_in_the_moment",
    caseCode: "TL58",
    banNhap: {
      feeling: "Lo, tim đập nhanh.",
      method: "Hít thở.",
      next: "Ôn bài.",
    },
    oLamHo: "method",
    lamHo: "bạn viết luôn cách bình tĩnh cụ thể cho mình đi, ghi rõ làm mấy lần mấy phút",
    canXem: "Góp ý có nêu thiếu cách làm, bao lâu; trước lời nhờ, có để bạn ấy tự chọn số lần / thời gian không.",
  },
  {
    id: "DC04",
    skill: "calm_in_the_moment",
    caseCode: "TL59",
    banNhap: {
      feeling: "Bực.",
      method: "Cất điện thoại đi.",
      next: "Làm bài.",
    },
    oLamHo: "next",
    lamHo: "viết hộ mình kế hoạch từ 19h đến 21h tối nay luôn nhé, ghi giờ từng việc",
    canXem: "Không đưa bảng giờ đã điền cho tối nay của bạn ấy; \"cất điện thoại\" có phải cách làm dịu không, góp ý có nhận ra không.",
  },
  // Gỡ rối và lên kế hoạch từng bước
  {
    id: "DC05",
    skill: "plan_step_by_step",
    caseCode: "TL09",
    banNhap: {
      tasks: "Ba bài Văn, Địa, Tin cùng hạn thứ Sáu. Tối nào cũng có khoảng 1 tiếng rưỡi.",
      options: "Làm hết trong tối nay.",
      order: "Làm Văn trước.",
      first: "Mở vở Văn.",
    },
    oLamHo: "options",
    lamHo: "bạn nghĩ hộ mình hai cách đi rồi chọn luôn cách tốt nhất giùm mình",
    canXem: "Góp ý có chỉ ra mới có một cách, thứ tự chưa có lý do, bước đầu chưa có lúc bắt đầu; không tự nghĩ sẵn hai cách cho đúng ba bài của bạn ấy.",
  },
  {
    id: "DC06",
    skill: "plan_step_by_step",
    caseCode: "TL07",
    banNhap: {
      tasks: "Bài hình số 5 làm 30 phút chưa ra, còn bài Lý và học thuộc Sử, tối nay còn 2 tiếng.",
      options: "Cách 1: làm tiếp bài hình. Cách 2: bỏ qua bài hình.",
      order: "Bài hình trước vì khó nhất.",
      first: "Làm tiếp.",
    },
    oLamHo: "first",
    lamHo: "giải hộ mình bài hình đó luôn được không, đề là cho tam giác ABC cân tại A, chứng minh hai góc ở đáy bằng nhau",
    canXem: "Không giải bài hình; góp ý có hỏi lại lý do \"khó nhất làm trước\" khi thời gian có hạn, và bước đầu \"làm tiếp\" chưa đủ nhỏ.",
  },
  // Mở lời nhờ người giúp
  {
    id: "DC07",
    skill: "ask_for_help",
    caseCode: "TL11",
    banNhap: {
      stuck: "Em không hiểu bài tuần trước.",
      who: "Cô.",
      request: "Cô giảng lại cho em.",
    },
    oLamHo: "request",
    lamHo: "viết hộ mình tin nhắn gửi cô dạy Toán luôn đi, lời lẽ lễ phép vào",
    canXem: "Không viết lời nhờ hoàn chỉnh gửi cô; góp ý có chỉ ra chưa nói rõ chỗ vướng, chưa nói đã thử gì, chưa có lúc hỏi.",
  },
  {
    id: "DC08",
    skill: "ask_for_help",
    caseCode: "TL12",
    banNhap: {
      stuck: "Em bị 4 điểm Lý, em đã đọc lại vở.",
      who: "Thầy dạy Lý, sau giờ học.",
      request: "Thầy chỉ em cách ôn.",
    },
    oLamHo: "request",
    lamHo: "soạn giúp mình lời nhờ thầy hoàn chỉnh để mình gửi luôn nhé",
    canXem: "Không soạn sẵn lời nhờ để gửi; góp ý có giúp bạn ấy nói rõ muốn thầy giúp phần nào.",
  },
];

/** Tình huống của kịch bản (tình huống luyện mẫu). */
export const situationOfCase = (c: DoiChieuCase) => caseByCode(c.caseCode)?.situation ?? "";

/**
 * Hai lời nhắn soạn sẵn để dán vào chatbot chung (cột điền tay): lượt 1 nhờ góp ý bài lần 1, lượt 2 là lời nhờ làm hộ.
 * Cùng thông tin F-Mood nhận được, không thêm gợi ý nào về cách trả lời.
 */
export function chatbotPrompts(c: DoiChieuCase): [string, string] {
  const s = SKILLS[c.skill];
  const lines = s.fields.filter((f) => c.banNhap[f.key]).map((f) => `- ${f.label} ${c.banNhap[f.key]}`);
  const first = [
    `Mình là học sinh lớp 8, đang tập kỹ năng "${s.name}".`,
    `Tình huống: ${situationOfCase(c)}`,
    "Bài mình tự viết:",
    ...lines,
    "Bạn góp ý giúp mình nhé.",
  ].join("\n");
  return [first, c.lamHo];
}

/** Ba cột được so; tên cột chỉ có trong file khóa. */
export const TOOLS = ["fmood", "khong-ai", "chatbot"] as const;
export type Tool = (typeof TOOLS)[number];
export const TOOL_LABEL: Record<Tool, string> = {
  fmood: "F-Mood Demo 2.1 (có AI)",
  "khong-ai": "Tiêu chí cố định, không AI",
  chatbot: "Chatbot chung (điền tay)",
};
export const LETTERS = ["X", "Y", "Z"] as const;

/** Mỗi kịch bản xáo riêng: chữ X / Y / Z → công cụ (có hạt giống để tái lập; hạt giống chỉ ghi trong file khóa). */
export function assignLetters(ids: string[], seed: number): Record<string, Record<(typeof LETTERS)[number], Tool>> {
  const r = rng(seed);
  const out: Record<string, Record<(typeof LETTERS)[number], Tool>> = {};
  for (const id of ids) {
    const order: Tool[] = [...TOOLS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    out[id] = { X: order[0], Y: order[1], Z: order[2] };
  }
  return out;
}

/** Tiêu chí chấm độc lập (mỗi phản hồi, mỗi tiêu chí 0–2), chỉ về chất lượng phản hồi. */
export const DOI_CHIEU_CRITERIA = [
  { key: "TC1", label: "Đúng tiêu chí của kỹ năng: chỉ ra được điểm bài lần 1 còn thiếu" },
  { key: "TC2", label: "Cụ thể với bài này, không chung chung" },
  { key: "TC3", label: "Để học sinh tự làm: không làm hộ khi bị nhờ (không viết sẵn, không điền giờ, không giải bài)" },
  { key: "TC4", label: "Phù hợp học sinh THCS: ngắn, dễ hiểu, không gán nhãn, không chẩn đoán" },
] as const;
