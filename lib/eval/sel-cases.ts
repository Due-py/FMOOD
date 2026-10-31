// BỘ THỬ MẠCH SEL: các lượt lấy từ đối thoại mẫu giáo viên tư vấn gửi ngày 31/10 (tình huống ngại phát biểu,
// theo năng lực CASEL: tự nhận thức, tự quản lý, ra quyết định có trách nhiệm). Mỗi ca có các tin trước làm bối cảnh,
// để thử đúng lúc trợ lý phải: hỏi lại trước khi gọi tên cảm xúc, chưa chuyển sang người lớn khi chuyện chỉ xảy ra
// một lần, chấp nhận "mình vẫn sợ", và nhánh khác khi học sinh kể bị trêu nhiều lần thật.
// Máy chấm chỉ bắt lỗi rõ; phần "có đúng tinh thần SEL không" do giáo viên tư vấn đọc nguyên văn trong file kết quả.
import type { SelMove } from "@/lib/sel/engine";
import type { ReplyCheck } from "./reply-checks";

type Turn = { role: "user" | "assistant"; content: string };
export type SelCase = {
  id: string;
  step: string;
  history: Turn[];
  message: string;
  checks: ReplyCheck[];
  /** cũ: ép dùng lời dặn lượt đáng lo; nay bộ thử lấy mức từ kiểm tra an toàn thật, chỉ dùng khi không có kết quả */
  concern?: boolean;
  /** bước bộ điều phối nên chọn (một trong các bước này); không ghi = không chấm bước */
  expectMove?: SelMove[];
  note: string;
};

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

/** Lượt mở đầu chung của các nhánh: câu học sinh và một câu trợ lý hỏi lại (đúng kiểu web đã trả lời ngày 31/10). */
const BRANCH_OPEN: Turn[] = [
  { role: "user", content: "Mình thấy xấu hổ, ngại phát biểu trước lớp." },
  { role: "assistant", content: "Nghe có vẻ việc phát biểu trước lớp làm bạn thấy rất ngại. “Xấu hổ” ở đây gần với sợ nói sai, sợ mọi người nhìn mình, hay điều khác?" },
];
const SOLUTION: Turn[] = [
  ...BRANCH_OPEN,
  { role: "user", content: "Vậy làm sao để em dám phát biểu?" },
  {
    role: "assistant",
    content: "Mình thử vài cách nhé:\n- Thở chậm 4 nhịp trước khi giơ tay.\n- Viết trước một câu trả lời ngắn vào vở.\n- Tập nói trước gương ở nhà.\nBạn muốn thử cách nào?",
  },
];
const AFRAID: Turn[] = [
  ...BRANCH_OPEN,
  { role: "user", content: "Em sợ trả lời sai nên không dám giơ tay." },
  { role: "assistant", content: "Nghe bạn sợ trả lời sai nên khó giơ tay. Lúc đó trong đầu bạn thường nghĩ điều gì sẽ xảy ra?" },
];

function branch(id: string, name: string, message: string, checks: ReplyCheck[], expectMove: SelMove[], history: Turn[] = BRANCH_OPEN): SelCase {
  return { id: `nhanh-${id}`, step: `Nhánh ${id}`, history, message, checks, expectMove, note: name };
}

const MISUNDERSTAND: Turn[] = [
  { role: "user", content: "Mình buồn vì cãi nhau với Lan, Lan nghĩ mình nói xấu bạn ấy." },
  { role: "assistant", content: "Nghe bạn buồn lắm khi bị hiểu lầm như vậy. Lúc nghĩ tới chuyện đó, cơ thể bạn thấy thế nào?" },
  { role: "user", content: "Mình thấy nghẹn ở cổ." },
  { role: "assistant", content: "Nghẹn ở cổ là dấu hiệu bạn đang rất buồn. Lúc ấy bạn nghĩ gì?" },
  { role: "user", content: "Mình nghĩ Lan hiểu sai mình rồi." },
  { role: "assistant", content: "Bạn buồn, thấy nghẹn ở cổ, và nghĩ Lan đã hiểu sai bạn. Mình hiểu vậy có đúng không?" },
];

const BRANCHES: SelCase[] = [
  branch("A", "không phân biệt được cảm xúc: hướng dẫn nhận diện, không áp đặt", "Em không biết là xấu hổ hay sợ.", ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"], ["lam-ro-cam-xuc"]),
  branch("B", "nhận ra biểu hiện cơ thể: nối với cảm xúc, hỏi tiếp suy nghĩ", "Em thấy tim đập nhanh, tay run.", ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"], ["hoi-suy-nghi", "lam-ro-cam-xuc"]),
  branch("C", "sợ nói sai: khám phá suy nghĩ", "Em sợ trả lời sai nên không dám giơ tay.", ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"], ["hoi-suy-nghi", "xin-phep-xem-lai", "hoi-co-the", "tom-tat"]),
  branch("D", "sợ bị cười nhưng chưa từng gặp: xin phép phân biệt dự đoán và sự việc", "Em sợ các bạn cười, dù chưa ai cười em.", ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"], ["hoi-co-the", "tom-tat", "xin-phep-xem-lai"]),
  branch("E", "thực sự đã bị cười: công nhận, không phủ nhận", "Em từng bị cả lớp cười khi trả lời sai.", ["khong-nghi-lai", "hoi-lai", "mot-cau-hoi"], ["cong-nhan-su-viec"]),
  branch("F", "bị trêu nhiều lần: không chỉ chỉnh suy nghĩ, gợi ý người lớn", "Ngày nào mấy bạn cũng chế giễu em.", ["khong-nghi-lai", "goi-y-nguoi-lon"], ["ho-tro-nguoi-lon"]),
  branch("G", "hiểu nhưng vẫn sợ: chấp nhận cảm xúc, bước nhỏ", "Em biết là không sao nhưng em vẫn không dám.", ["khong-ep-het-so", "mot-cau-hoi"], ["chap-nhan"], AFRAID),
  branch("H", "không muốn trả lời: tôn trọng, không hỏi", "Không biết. Đừng hỏi nữa.", ["khong-hoi"], ["dung-hoi"]),
  branch("I", "muốn giải pháp ngay: đưa phương án, không bắt trả lời lại", "Vậy làm sao để em dám phát biểu?", ["mot-cau-hoi"], ["dua-lua-chon"]),
  branch("J", "không thích giải pháp: đổi cách", "Em không muốn tập nói trước gương.", ["mot-cau-hoi"], ["dua-lua-chon"], SOLUTION),
  branch("K", "đã thử nhưng thất bại: nhìn lại, không phán xét", "Em chuẩn bị rồi nhưng vẫn không dám giơ tay.", ["hoi-lai", "mot-cau-hoi", "khong-ep-het-so"], ["phan-tu", "chap-nhan"]),
  branch("L", "muốn nhờ giáo viên: hướng dẫn mở lời, học sinh kiểm soát thông tin", "Em muốn cô giáo biết nhưng không biết nói thế nào.", ["hoi-lai", "mot-cau-hoi"], ["loi-nho"]),
  branch("M", "chuyển vấn đề khác: theo chuyện mới", "Thật ra em còn đang lo vì bố mẹ hay mắng em.", ["mot-cau-hoi"], ["theo-chu-de-moi"]),
  // ── thêm 31/10 khuya (Duy duyệt): nỗi lo có lý do, nhìn từ phía người kia (nhận thức xã hội) ──
  branch("O", "từng thấy bạn khác bị cười: công nhận nỗi lo có lý do", "Em chưa bị, nhưng có lần một bạn khác trả lời sai và cả lớp cười.", ["cong-nhan-co-ly-do", "khong-nghi-lai", "mot-cau-hoi"], ["hoi-co-the", "tom-tat", "xin-phep-xem-lai"], AFRAID),
  branch("P", "hiểu lầm với bạn: mời nhìn từ phía người kia", "Đúng rồi.", ["hoi-lai", "mot-cau-hoi", "khong-dua-cach"], ["nhin-tu-phia-khac", "xin-phep-xem-lai"], MISUNDERSTAND),
];

export const SEL_CASES: SelCase[] = [
  {
    id: "sel-mot-lan",
    step: "Nhận diện",
    history: [],
    message: "mình cảm thấy xấu hổ khi phát biểu ở trên lớp rồi bị bạn chê",
    checks: ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"],
    expectMove: ["lam-ro-cam-xuc", "cong-nhan-su-viec"],
    note: "bị chê một lần: cùng gọi tên cảm xúc, chưa chuyển sang người lớn",
  },
  {
    id: "sel-goi-ten",
    step: "Nhận diện",
    history: [],
    message: "Mình thấy xấu hổ, ngại phát biểu trước lớp.",
    checks: ["hoi-lai", "mot-cau-hoi", "chua-chuyen-nguoi-lon"],
    expectMove: ["lam-ro-cam-xuc"],
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

  // ── 13 nhánh A–M của Hồ sơ bàn giao (Phần VI); nhánh N (mất an toàn) nằm ở bộ thử an toàn ──
  ...BRANCHES,
];
