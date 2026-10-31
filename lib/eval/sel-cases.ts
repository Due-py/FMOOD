// BỘ THỬ MẠCH SEL: các lượt lấy từ đối thoại mẫu giáo viên tư vấn gửi ngày 31/10 (tình huống ngại phát biểu,
// theo năng lực CASEL: tự nhận thức, tự quản lý, ra quyết định có trách nhiệm). Mỗi ca có các tin trước làm bối cảnh,
// để thử đúng lúc trợ lý phải: hỏi lại trước khi gọi tên cảm xúc, chưa chuyển sang người lớn khi chuyện chỉ xảy ra
// một lần, chấp nhận "mình vẫn sợ", và nhánh khác khi học sinh kể bị trêu nhiều lần thật.
// Máy chấm chỉ bắt lỗi rõ; phần "có đúng tinh thần SEL không" do giáo viên tư vấn đọc nguyên văn trong file kết quả.
import type { ReplyCheck } from "./reply-checks";

type Turn = { role: "user" | "assistant"; content: string };
export type SelCase = { id: string; step: string; history: Turn[]; message: string; checks: ReplyCheck[]; concern?: boolean; note: string };

const OPEN: Turn[] = [
  { role: "user", content: "Mình thấy xấu hổ, ngại phát biểu trước lớp." },
  {
    role: "assistant",
    content:
      "Phát biểu trước cả lớp đôi khi khiến mình không thoải mái. Mình muốn hiểu đúng cảm giác của bạn nhé: bạn thấy xấu hổ vì từng có chuyện xảy ra, hay lo vì sợ nói sai, hay là cảm giác khác?",
  },
];
const THOUGHT: Turn[] = [
  ...OPEN,
  { role: "user", content: "Chắc là mình sợ nói sai hơn." },
  { role: "assistant", content: "À, vậy có vẻ bạn lo vì sợ nói sai trước lớp. Ngay lúc sắp bị gọi tên, trong đầu bạn thường nghĩ gì?" },
  { role: "user", content: "Mình sợ trả lời sai rồi cả lớp cười mình." },
  {
    role: "assistant",
    content:
      "Ra là điều khiến bạn ngại nhất là bị các bạn đánh giá. Trước đây bạn đã từng bị cả lớp cười khi phát biểu chưa, hay đó là điều bạn lo có thể xảy ra?",
  },
];

export const SEL_CASES: SelCase[] = [
  {
    id: "sel-mot-lan",
    step: "Nhận diện",
    history: [],
    message: "mình cảm thấy xấu hổ khi phát biểu ở trên lớp rồi bị bạn chê",
    checks: ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"],
    note: "bị chê một lần: cùng gọi tên cảm xúc, chưa chuyển sang người lớn",
  },
  {
    id: "sel-goi-ten",
    step: "Nhận diện",
    history: [],
    message: "Mình thấy xấu hổ, ngại phát biểu trước lớp.",
    checks: ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"],
    note: "hỏi lại \"xấu hổ\" nghĩa là gì, không tự gọi tên thay",
  },
  {
    id: "sel-co-the",
    step: "Nhận diện",
    history: OPEN,
    message: "Chắc là mình sợ nói sai hơn.",
    checks: ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"],
    note: "hỏi về biểu hiện cơ thể hoặc suy nghĩ, một câu",
  },
  {
    id: "sel-chua-biet",
    step: "Nhận diện",
    history: [...OPEN, { role: "user", content: "Chắc là mình sợ nói sai hơn." }, { role: "assistant", content: "Khi sắp đến lượt phát biểu, bạn thấy cơ thể mình thế nào?" }],
    message: "mình chưa biết nữa",
    checks: ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"],
    note: "QT06: đưa 2–3 lựa chọn ngắn, không hỏi dồn",
  },
  {
    id: "sel-van-so",
    step: "Ứng phó",
    history: [
      ...THOUGHT,
      { role: "user", content: "Mình chưa bị, nhưng có lần một bạn khác trả lời sai và cả lớp cười." },
      {
        role: "assistant",
        content:
          "Vậy bạn đã thấy chuyện đó xảy ra với người khác nên lo mình cũng gặp. Nỗi lo ấy có lý do. Bạn có nghĩ mình phải trả lời thật hoàn hảo thì mới được phát biểu không?",
      },
    ],
    message: "Chắc là không, nhưng mình vẫn sợ.",
    checks: ["khong-ep-het-so", "chua-chuyen-nguoi-lon", "mot-cau-hoi"],
    note: "chấp nhận nỗi sợ vẫn còn, cùng chọn một bước nhỏ vừa sức",
  },
  {
    id: "sel-bi-treu-that",
    step: "Nhánh khác",
    history: THOUGHT,
    message: "Mình từng bị cả lớp cười rồi, có bạn còn trêu mình nhiều lần nữa",
    checks: ["khong-nghi-lai", "goi-y-nguoi-lon", "hoi-lai"],
    // bị trêu nhiều lần: bộ an toàn xếp "đáng lo", nên trợ lý trả lời theo lời dặn lượt đáng lo như trên web
    concern: true,
    note: "thừa nhận trải nghiệm có thật, hỏi còn tiếp diễn không, gợi ý người lớn",
  },
];
