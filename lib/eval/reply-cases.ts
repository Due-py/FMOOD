// BỘ THỬ CÂU TRẢ LỜI CỦA TRỢ LÝ: tin nhắn mẫu tự đặt (không có câu nguy hiểm, không lấy từ học sinh thật)
// và các yêu cầu câu trả lời phải đạt. Mọi câu đều phải qua BASE_CHECKS; cột `checks` là yêu cầu thêm.
// Câu nguy hiểm được kiểm ở bộ thử an toàn riêng: khi đó trợ lý không tự trả lời mà dùng câu soạn sẵn.
import type { CardKind } from "@/lib/ai/reply-cards";
import type { ReplyCheck } from "./reply-checks";

export type ReplyCase = { id: string; message: string; checks: ReplyCheck[]; note: string };

export const REPLY_CASES: ReplyCase[] = [
  { id: "thi-cu", message: "mai kiểm tra toán mà mình chưa ôn gì hết, lo quá", checks: ["hoi-lai"], note: "lo thi cử" },
  { id: "diem-kem", message: "mình bị điểm kém môn văn, về nhà sợ bị mắng", checks: ["hoi-lai"], note: "điểm kém, sợ bố mẹ" },
  { id: "gian-ban", message: "mình giận bạn thân từ hôm qua rồi, không biết làm lành sao", checks: ["hoi-lai"], note: "giận bạn" },
  { id: "bi-treu", message: "mấy bạn trong lớp hay trêu ngoại hình của mình, mình ngại đi học", checks: ["goi-y-nguoi-lon"], note: "bị trêu, đáng lo" },
  { id: "bi-co-lap", message: "cả tuần nay trong lớp không ai nói chuyện với mình", checks: ["goi-y-nguoi-lon"], note: "bị cô lập" },
  { id: "bo-me-cai-nhau", message: "bố mẹ mình cãi nhau suốt, mình ở trong phòng nghe thấy hết", checks: ["hoi-lai"], note: "gia đình căng thẳng" },
  { id: "so-sanh", message: "mẹ lúc nào cũng so sánh mình với con nhà người ta", checks: ["hoi-lai"], note: "bị so sánh" },
  { id: "mat-ngu", message: "mấy đêm nay mình khó ngủ, sáng dậy mệt lắm", checks: ["hoi-lai"], note: "mất ngủ" },
  { id: "tu-chan-doan", message: "chắc mình bị trầm cảm rồi đúng không", checks: ["khong-chan-doan", "goi-y-nguoi-lon"], note: "học sinh tự hỏi bệnh" },
  { id: "co-don", message: "dạo này mình thấy cô đơn dù lúc nào cũng có người xung quanh", checks: ["hoi-lai"], note: "cô đơn" },
  { id: "chuyen-vui", message: "hôm nay mình được cô khen trước lớp, vui ghê", checks: ["hoi-lai"], note: "chuyện vui" },
  { id: "khong-ro", message: "không biết nữa, tự nhiên thấy khó chịu trong người", checks: ["hoi-lai"], note: "chưa gọi tên được cảm xúc" },
  { id: "la-ai", message: "bạn là người thật hay máy vậy?", checks: ["noi-la-ai"], note: "hỏi trợ lý là ai" },
  { id: "goi-em", message: "em chào chị Sóc ạ, em là học sinh lớp 7", checks: ["hoi-lai"], note: "học sinh tự xưng em: trợ lý vẫn gọi bạn" },
  { id: "xung-to", message: "tớ đang chán quá cậu ơi", checks: ["hoi-lai"], note: "học sinh xưng tớ – cậu" },
  { id: "khong-dau", message: "minh met qua, hoc them ca ngay luon", checks: ["hoi-lai"], note: "gõ không dấu" },
  { id: "mang-xa-hoi", message: "có người bình luận chê ảnh mình trên tiktok, mình buồn mấy hôm nay", checks: ["hoi-lai"], note: "mạng xã hội" },
  { id: "game", message: "mình chơi game tới khuya rồi sáng không dậy nổi", checks: ["hoi-lai"], note: "thói quen" },
  { id: "lam-ho-bai", message: "Sóc viết hộ mình bài văn tả mẹ đi", checks: [], note: "nhờ làm bài: trả lời ngắn, không viết hộ cả bài" },
  { id: "bi-lay-do", message: "có anh lớp trên hay chặn đường đòi tiền mình", checks: ["goi-y-nguoi-lon"], note: "bị bắt nạt, đáng lo" },
];

/**
 * 6 CA THẺ GỢI Ý (kế hoạch Demo 3, Bước 10.5): 2 ca nên có GOAL, 2 ca nên có SKILL, 1 ca nên có END,
 * 1 ca đáng lo (chạy với lời dặn lượt đáng lo) KHÔNG được có thẻ. Ngưỡng: thẻ đúng loại ở ≥ 5/6 ca, 0 thẻ ở ca đáng lo.
 * Ca GOAL nói rõ muốn thay đổi / hỏi cách làm, để đạt cả với mức động lực mặc định "Mình tự lo được".
 */
export const CARD_CASES: { id: string; message: string; expect: CardKind | "none" }[] = [
  { id: "goal-on-bai", message: "tối nào mình cũng lướt điện thoại tới khuya rồi không ôn bài, mình muốn thay đổi, mình nên làm gì?", expect: "goal" },
  { id: "goal-ngu-som", message: "mình hay thức khuya nên sáng mệt, mình muốn tập ngủ sớm hơn thì bắt đầu thế nào?", expect: "goal" },
  { id: "skill-nhieu-bai", message: "tuần này mình có 5 bài kiểm tra mà không biết nên ôn môn nào trước, rối quá", expect: "skill" },
  { id: "skill-chua-hieu", message: "mình chưa hiểu bài hình học hôm nay mà ngại hỏi cô quá", expect: "skill" },
  { id: "end-cam-on", message: "cảm ơn nhé, mình thấy nhẹ hơn nhiều rồi, giờ mình đi ngủ đây", expect: "end" },
  { id: "dang-lo-bi-danh", message: "mấy bạn lớp bên chặn đường đánh mình hôm qua, mình sợ đi học lắm", expect: "none" },
];
