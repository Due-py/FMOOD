// GẮN KHUNG CASEL CHO BÀI ĐỌC (kế hoạch V2 mục 3.2, 5, 11.2; migration 0026). Dùng chung máy chủ và trình duyệt.
// Mỗi bài: một năng lực chính, các năng lực liên quan, mã kỹ năng thành phần CASEL 2020, (tùy chọn) kỹ năng thành phần F-Mood
// có bài luyện thật để hiện nút "Luyện cùng AI", và MỘT mục tiêu học tập quan sát được. Người duyệt gắn; không đoán tự động.
import { z } from "zod";
import { CASEL5, caselItem, isSubskillId, type Casel, type SubskillId } from "@/lib/sel/casel";

export type LessonCasel = {
  casel_primary: Casel | null;
  casel_related: Casel[];
  casel_items: string[];
  subskill: SubskillId | null;
  learning_objective: string | null;
};

export const EMPTY_LESSON_CASEL: LessonCasel = { casel_primary: null, casel_related: [], casel_items: [], subskill: null, learning_objective: null };

export const lessonCaselSchema = z
  .object({
    casel_primary: z.enum(CASEL5),
    casel_related: z.array(z.enum(CASEL5)).max(4),
    casel_items: z.array(z.string().refine((c) => caselItem(c) !== null, "Mã kỹ năng thành phần không có trong khung CASEL")).max(12),
    subskill: z.string().nullable().refine((v) => v === null || isSubskillId(v), "Kỹ năng không có trong danh mục"),
    learning_objective: z.string().trim().min(5, "Mục tiêu học tập cần ít nhất 5 ký tự").max(300, "Mục tiêu học tập tối đa 300 ký tự"),
  })
  .refine((v) => !v.casel_related.includes(v.casel_primary), { message: "Năng lực liên quan không trùng năng lực chính" });

/**
 * Gợi ý gắn CASEL cho các bài ưu tiên (kế hoạch V2 mục 5; 8 bài ưu tiên + 7 bài dự phòng), soạn từ nội dung và bài tập
 * của từng bài. Chỉ để điền sẵn ô cho người duyệt sửa rồi bấm lưu; không tự lưu, không tự duyệt.
 */
export const CASEL_SUGGESTIONS: Record<string, Omit<LessonCasel, "learning_objective"> & { learning_objective: string; priority: boolean }> = {
  "w8-2f-cang-thang-va-cach-nhin": { priority: true, casel_primary: "self_awareness", casel_related: ["self_management"], casel_items: ["SA3", "SA5"], subskill: "recognize_feelings_thoughts", learning_objective: "Viết một áp lực của mình thành hai phần \"Sự việc là…\" và \"Mình đang nghĩ là…\"." },
  "w8-2a-suy-nghi-co-ich-va-vo-ich": { priority: true, casel_primary: "self_awareness", casel_related: ["self_management"], casel_items: ["SA5", "SA8"], subskill: "recognize_feelings_thoughts", learning_objective: "Đổi một suy nghĩ vô ích sau điểm thấp thành một suy nghĩ có ích." },
  "w7-1c-cang-thang-va-co-the": { priority: true, casel_primary: "self_awareness", casel_related: ["self_management"], casel_items: ["SA3", "SM2"], subskill: "calm_in_the_moment", learning_objective: "Đánh dấu dấu hiệu cơ thể của mình khi căng thẳng và tự đánh giá sau 5 nhịp thở chậm." },
  "w8-2h-dat-cau-hoi-cho-noi-lo": { priority: true, casel_primary: "self_management", casel_related: ["self_awareness"], casel_items: ["SM1", "SA5"], subskill: "calm_in_the_moment", learning_objective: "Viết lại một nỗi lo về giờ học thành một câu thực tế hơn." },
  "w8-2d-dong-khung-lai-suy-nghi": { priority: true, casel_primary: "self_management", casel_related: ["self_awareness"], casel_items: ["SM1", "SM2"], subskill: "calm_in_the_moment", learning_objective: "Phân biệt lúc nên và không nên dùng câu \"Mình đang háo hức!\" rồi thử một lần." },
  "w8-2g-cach-nhin-ve-cang-thang": { priority: true, casel_primary: "self_management", casel_related: ["responsible_decision_making", "relationship_skills"], casel_items: ["SM2", "SA7"], subskill: "plan_step_by_step", learning_objective: "Chọn ít nhất hai cách tăng cảm giác \"mình làm được\" trước một bài kiểm tra cụ thể." },
  "w6-2e-hanh-lang-luong-tam": { priority: true, casel_primary: "responsible_decision_making", casel_related: ["self_management"], casel_items: ["RD4", "RD2"], subskill: "plan_step_by_step", learning_objective: "Viết ít nhất ba \"tiếng nói\" về một quyết định và chọn một cách có lý do." },
  "w8-3b-ban-do-cac-moi-quan-he": { priority: true, casel_primary: "relationship_skills", casel_related: ["self_awareness"], casel_items: ["RS2", "RS8"], subskill: null, learning_objective: "Nêu một người có thể nhờ khi áp lực và một việc làm để gắn bó hơn với người đó." },
  "w8-2b-nhan-dien-bay-suy-nghi": { priority: false, casel_primary: "self_awareness", casel_related: ["self_management"], casel_items: ["SA5"], subskill: "recognize_feelings_thoughts", learning_objective: "Gọi đúng tên bẫy suy nghĩ trong một câu cho sẵn và đánh dấu bẫy mình hay mắc." },
  "w8-2c-thoat-khoi-bay-suy-nghi": { priority: false, casel_primary: "self_management", casel_related: ["self_awareness"], casel_items: ["SM1", "SA5"], subskill: "calm_in_the_moment", learning_objective: "Viết một suy nghĩ thay thế hợp lý cho một tình huống bằng câu hỏi \"bằng chứng là gì?\"." },
  "w8-2i-suy-nghi-khong-phai-su-that": { priority: false, casel_primary: "self_awareness", casel_related: ["self_management"], casel_items: ["SA3", "SA5"], subskill: "recognize_feelings_thoughts", learning_objective: "Kể một tình huống làm mình bắt đầu lo và một câu tự nhắc cho lúc đó." },
  "w8-2e-quan-sat-suy-nghi": { priority: false, casel_primary: "self_management", casel_related: ["self_awareness"], casel_items: ["SM2"], subskill: "calm_in_the_moment", learning_objective: "Làm bài quan sát suy nghĩ 3 phút và mô tả một suy nghĩ cứ quay lại." },
  "w7-1e-cang-thang-tot": { priority: false, casel_primary: "self_management", casel_related: ["self_awareness"], casel_items: ["SM2", "SM5"], subskill: "plan_step_by_step", learning_objective: "Nhận ra mức căng thẳng của mình và nêu một việc nhỏ nhất để bắt đầu khi quá tải." },
  "w8-1a-giac-ngu-va-cam-xuc": { priority: false, casel_primary: "self_management", casel_related: ["self_awareness"], casel_items: ["SM3"], subskill: null, learning_objective: "Viết một thay đổi cụ thể về giấc ngủ cho tuần này." },
  "w8-3d-lang-nghe-tich-cuc": { priority: false, casel_primary: "relationship_skills", casel_related: ["social_awareness"], casel_items: ["RS1", "SO3"], subskill: "listen_to_peer", learning_objective: "Kể ba hành vi lắng nghe tích cực và thử một lần với một người bạn." },
};
