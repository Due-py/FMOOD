// NGÂN HÀNG MẪU CỦA CÁC MÔ-ĐUN LUYỆN (bước Mẫu) VÀ PHẦN "BÀI TỐT CẦN CÓ" (bước Hiểu). Hàm thuần, có test: skill-samples.test.ts.
//
// Vì sao có ngân hàng mẫu (Duy hỏi 31/10: "lần nào cũng mấy mẫu này"):
//  - Mỗi kỹ năng 3–5 mẫu, mỗi mẫu là chuyện của MỘT BẠN KHÁC, gắn một biểu hiện (lo kiểm tra, sợ sai, bực với bạn…).
//    App chọn mẫu GẦN LOẠI với chuyện của học sinh nhưng KHÁC BỐI CẢNH (không trùng môn học), và đổi mẫu ở lần luyện sau.
//  - Không để AI viết mẫu đầu tiên: mẫu là học liệu cần người duyệt; mẫu càng giống chuyện của học sinh càng dễ bị chép
//    (thành làm hộ); và khi AI lỗi (hết tiền, mất mạng) học sinh vẫn cần mẫu. AI chỉ viết thêm "ví dụ khác" khi bấm nút.
//  - Mỗi dòng mẫu khớp đúng một ô học sinh sẽ viết (cùng thứ tự với SKILLS[k].fields) và có câu "vì sao dòng này tốt",
//    theo đúng tiêu chí trợ lý dùng để góp ý (SKILLS[k].criteria), để học sinh biết đích TRƯỚC khi viết.
//
// NỘI DUNG LÀ BẢN NHÁP do AI lập trình soạn ngày 31/10, CHỜ CÔ THÚY DUYỆT (phiếu duyệt:
// ho-so-du-thi/2-xay-dung/mau-ky-nang-cho-duyet_2026-10-31.md). Mẫu đầu tiên của mỗi kỹ năng là mẫu cũ (SKILLS[k].example),
// viết lại cho khớp từng ô.
import { fold } from "@/lib/safety/normalize";
import { PRACTICE_CASES, SKILLS, type SkillId } from "@/lib/skills";

/** Biểu hiện của tình huống (dùng để chọn mẫu gần loại). */
export const SAMPLE_SIGNS = ["lo-kiem-tra", "so-sai", "tu-ti", "chan-bai-kho", "tri-hoan", "ngai-nho", "ban-be", "gia-dinh"] as const;
export type SampleSign = (typeof SAMPLE_SIGNS)[number];

export type SampleLine = { text: string; why: string };
/** Một mẫu: `lines[i]` ứng với ô thứ i của kỹ năng (SKILLS[k].fields[i]). */
export type SkillSample = { id: string; sign: SampleSign; situation: string; lines: SampleLine[] };
/** Cặp so sánh "chưa tốt → tốt hơn" cho ô khó nhất của kỹ năng. */
export type SampleContrast = { field: string; weak: string; better: string; why: string };

/** Tên ngắn của từng ô (nhãn trên dòng mẫu), cùng thứ tự với SKILLS[k].fields. */
export const FIELD_SHORT: Record<SkillId, string[]> = {
  recognize_feelings_thoughts: ["Chuyện đã xảy ra", "Mình thấy", "Mình đang nghĩ", "Kiểm tra suy nghĩ"],
  calm_in_the_moment: ["Mình thấy", "Cách ứng phó", "Việc đầu tiên", "Hợp không, dùng lúc nào"],
  plan_step_by_step: ["Các việc và thời gian", "Các cách làm", "Làm trước, vì sao", "Bước đầu", "Nếu không kịp"],
  ask_for_help: ["Vướng ở đâu, đã thử gì", "Nhờ ai, lúc nào, cách nào", "Lời nhờ"],
  see_other_side: ["Chuyện xảy ra", "Các cách hiểu", "Điều mình chưa biết", "Câu hỏi để kiểm tra"],
  notice_peer_stress: ["Dấu hiệu mình thấy", "Câu hỏi han", "Việc nhỏ giúp được", "Khi nào nhờ người lớn"],
  listen_to_peer: ["Câu mở lời", "Câu nhắc lại", "Câu hỏi mở", "Điều mình tránh nói"],
  resolve_group_conflict: ["Chuyện bất đồng", "Câu Mình thấy… mình muốn…", "Hai cách chung", "Cách chốt"],
  say_no_to_pressure: ["Lời rủ", "Hệ quả nếu đồng ý", "Câu từ chối", "Đề xuất khác"],
  know_my_strengths: ["Việc mình đã làm được", "Điểm mạnh", "Bằng chứng", "Dùng cho việc khó"],
  growth_mindset: ["Câu mình đang nghĩ", "Viết lại", "Cách học khác", "Mốc tiến bộ"],
  set_small_goal: ["Điều mình muốn", "Mục tiêu nhỏ", "Mỗi ngày", "Theo dõi"],
  start_when_reluctant: ["Việc đang ngại", "Bước khởi động", "Chỗ xao nhãng", "Phần thưởng"],
  weigh_consequences: ["Phải chọn", "Các lựa chọn", "Hậu quả", "Mình chọn"],
  check_information: ["Thông tin", "Biết chắc và nghe nói", "Cách kiểm tra", "Chia sẻ không"],
  show_gratitude: ["Ai, việc gì", "Ý nghĩa", "Lời cảm ơn", "Lúc và cách"],
};

const RECOGNIZE_WHY = [
  "Chỉ kể việc đã xảy ra (ai, làm gì, lúc nào), không có lời chê bản thân.",
  "Có đủ 3 loại: cảm xúc, dấu hiệu cơ thể, việc mình làm lúc đó.",
  "Viết nguyên câu đang nghĩ trong đầu, để trong ngoặc kép.",
  "Nhận ra đó là điều mình đoán, và tìm một điều cho thấy nó chưa chắc đúng.",
];
const CALM_WHY = [
  "Gọi tên cảm xúc và có ít nhất một dấu hiệu cơ thể lúc đó.",
  "Cách hợp với cảm xúc đó, làm được ngay tại chỗ, có làm thế nào và bao lâu hoặc mấy lần.",
  "Một việc đầu tiên cụ thể, nhỏ, bắt tay vào được ngay.",
  "Tự xem cách này có hợp không và lần sau dùng lúc nào.",
];
const PLAN_WHY = [
  "Liệt kê các việc kèm hạn, và thời gian thật mình có.",
  "Có ít nhất hai cách khác nhau thật sự để so sánh.",
  "Chọn một cách và nói lý do (hạn sớm nhất, nhiều việc nhất…).",
  "Bước đầu nhỏ, cụ thể, có giờ bắt đầu.",
  "Biết trước sẽ dời hay bớt việc gì, hoặc báo ai nếu không kịp.",
];
const HELP_WHY = [
  "Nói đúng chỗ chưa hiểu và việc mình đã tự thử.",
  "Chọn người giúp được, lúc và cách hỏi hợp với mình.",
  "Lời nhờ 2–4 câu: chưa hiểu gì, đã thử gì, muốn được giúp gì.",
];
// 5 mô-đun mới (Duy duyệt 01/11): nguyên văn ho-so-du-thi/2-xay-dung/bai-luyen-moi/noi-dung.json
const OTHER_SIDE_WHY = [
  "Chỉ kể việc người kia làm hoặc nói, chưa gán ý xấu cho họ.",
  "Có 2 cách hiểu khác nhau thật sự, trong đó có một cách không trách người kia.",
  "Nhận ra điều mình chưa biết, nên chưa vội kết luận.",
  "Câu hỏi nhẹ nhàng, hỏi thẳng người kia, không buộc tội, có để ý tới tâm trạng hay hoàn cảnh của họ.",
];
const NOTICE_WHY = [
  "Kể điều thấy và nghe được, không đoán bệnh, không gán tính cách cho bạn.",
  "Câu ngắn, nhẹ nhàng: nói điều mình để ý rồi hỏi han, để bạn tự chọn kể hay không.",
  "Việc nhỏ, làm được ngay, đi cùng bạn chứ không làm thay hay gánh hộ.",
  "Biết lúc nào cần người lớn và gọi được tên người cụ thể; không hứa giữ bí mật.",
];
const LISTEN_WHY = [
  "Mở lời ngắn, cho bạn thấy mình đang nghe, chưa vội khuyên.",
  "Nhắc lại cả chuyện bạn kể và cảm xúc của bạn, bằng lời của mình, có hỏi lại xem đúng chưa.",
  "Câu hỏi mở, không trả lời bằng có hay không được, để bạn kể tiếp.",
  "Biết câu nào nghe như phán xét, so sánh hay xem nhẹ, và vì sao nên tránh.",
];
const CONFLICT_WHY = [
  "Kể việc đang bất đồng và ý muốn của cả hai bên, không chê người kia.",
  "Có đủ cảm xúc, lý do và một đề nghị cụ thể; nói về mình, không đổ lỗi.",
  "Hai cách khác nhau thật sự, mỗi cách đều có phần ý của cả hai bên.",
  "Có cách chốt công bằng và việc tiếp theo rõ: ai làm gì, khi nào.",
];
const SAY_NO_WHY = [
  "Kể rõ lời rủ: ai rủ, rủ làm gì, lúc nào.",
  "Nghĩ trước hệ quả cụ thể cho mình và cho người khác, không chỉ \"sẽ không tốt\".",
  "Câu từ chối có chữ \"không\" rõ ràng, ngắn, không chê hay giảng đạo lý cho bạn.",
  "Đề xuất khác làm được, vẫn giữ được tình bạn hoặc giúp được bạn theo cách khác.",
];
// 7 mô-đun đợt 2 (01/11, chờ Duy và cô Thúy duyệt)
const STRENGTH_WHY = [
  "Kể một việc thật, cụ thể, có lúc và có kết quả.",
  "Gọi tên một cách làm hay thói quen, không phải lời khen chung.",
  "Có việc cụ thể cho thấy mình thật sự có điểm mạnh đó.",
  "Chọn một việc đang khó và nói rõ sẽ dùng điểm mạnh thế nào.",
];
const GROWTH_WHY = [
  "Viết nguyên câu tự phán xét đang có trong đầu, để trong ngoặc kép.",
  "Câu viết lại có \"chưa… nhưng nếu…\", vẫn nhận là đang khó.",
  "Một cách học khác cụ thể, làm được, không chỉ \"cố hơn\".",
  "Mốc so với chính mình trước đây, có thời gian cụ thể.",
];
const GOAL_WHY = [
  "Nói điều mình thật sự muốn thay đổi.",
  "Có làm gì, bao nhiêu, đến khi nào; đủ nhỏ để làm được.",
  "Việc mỗi ngày cụ thể, có lúc làm.",
  "Có cách đánh dấu, và biết làm gì khi lỡ một ngày.",
];
const START_WHY = [
  "Nói rõ việc gì và vì sao ngại, để biết chỗ cần gỡ.",
  "Bước nhỏ, làm được ngay trong vài phút, là việc làm cụ thể.",
  "Biết thứ hay kéo mình đi và để nó ra xa, ở chỗ cụ thể.",
  "Phần thưởng nhỏ, đến sau khi làm, rồi quay lại làm tiếp.",
];
const WEIGH_WHY = [
  "Nói rõ đang phải chọn giữa những gì.",
  "Có ít nhất hai lựa chọn khác nhau thật sự.",
  "Mỗi cách có hậu quả cho mình và cho người khác, cả lúc này và về sau.",
  "Chọn một cách, lý do dựa trên hậu quả đã nghĩ.",
];
const CHECK_WHY = [
  "Nói rõ tin gì và nghe, đọc được ở đâu.",
  "Tách điều mình thấy tận mắt với điều chỉ là nghe kể hay đoán.",
  "Kiểm tra từ người hay nguồn đáng tin, có cách cụ thể.",
  "Quyết định chia sẻ có lý do, nghĩ tới người được nhắc tới trong tin.",
];
const THANKS_WHY = [
  "Nêu đúng người và việc cụ thể họ đã làm, có lúc nào.",
  "Nói việc đó giúp gì cho mình và mình thấy thế nào.",
  "Lời cảm ơn nêu việc cụ thể và điều mình quý ở người đó.",
  "Chọn lúc và cách nói hợp với người đó.",
];
const lines = (why: string[], texts: string[]): SampleLine[] => texts.map((text, i) => ({ text, why: why[i] }));

export const SKILL_SAMPLES: Record<SkillId, SkillSample[]> = {
  recognize_feelings_thoughts: [
    {
      id: "nhan-ra-len-bang",
      sign: "so-sai",
      situation: "Một bạn bị cô gọi lên bảng mà làm sai trước lớp.",
      lines: lines(RECOGNIZE_WHY, [
        "Mình làm sai câu 2 trên bảng, cô cho về chỗ.",
        "Xấu hổ, mặt nóng, về chỗ cúi mặt không muốn nhìn ai.",
        "\"Cả lớp chắc cười mình.\"",
        "Đó là điều mình đoán; lúc về chỗ mình không thấy ai cười cả.",
      ]),
    },
    {
      id: "nhan-ra-de-cuong-su",
      sign: "lo-kiem-tra",
      situation: "Một bạn tối trước hôm kiểm tra Sử mở đề cương thấy còn nhiều phần chưa thuộc.",
      lines: lines(RECOGNIZE_WHY, [
        "Tối nay mình mở đề cương Sử, còn 3 bài chưa thuộc.",
        "Lo, tim đập nhanh, cứ lật sách qua lại mà không đọc vào chữ nào.",
        "\"Mai chắc chắn mình bị điểm kém.\"",
        "Đó là điều mình đoán; lần trước mình cũng lo như vậy mà vẫn được 7 điểm.",
      ]),
    },
    {
      id: "nhan-ra-chu-xau",
      sign: "ban-be",
      situation: "Một bạn bị bạn cùng bàn nói to là chữ mình xấu trong giờ học.",
      lines: lines(RECOGNIZE_WHY, [
        "Trong giờ Văn, bạn cùng bàn nói to: \"chữ cậu xấu thế\".",
        "Bực, mặt nóng, mình gấp vở lại và không nói gì nữa.",
        "\"Bạn ấy cố tình làm mình mất mặt.\"",
        "Mình chưa biết bạn ấy nghĩ gì; mình có thể nói là mình không thích câu đó.",
      ]),
    },
    {
      id: "nhan-ra-lam-cham",
      sign: "tu-ti",
      situation: "Một bạn thấy bạn cùng nhóm làm bài nhanh hơn mình nhiều.",
      lines: lines(RECOGNIZE_WHY, [
        "Trong giờ Toán, bạn cùng nhóm làm xong 5 bài, mình mới xong 2.",
        "Buồn, nặng người, mình úp vở lại và ngồi im.",
        "\"Mình kém hơn mọi người.\"",
        "Đó là suy nghĩ; mình chậm ở dạng bài này, còn hôm qua mình làm phần hình nhanh.",
      ]),
    },
    {
      id: "nhan-ra-dien-thoai",
      sign: "gia-dinh",
      situation: "Một bạn bị mẹ nhắc cất điện thoại khi đang ngồi học buổi tối.",
      lines: lines(RECOGNIZE_WHY, [
        "9 giờ tối, mẹ nhắc mình cất điện thoại khi mình đang làm bài.",
        "Khó chịu, thở mạnh, mình đóng cửa phòng lại.",
        "\"Mẹ không tin mình.\"",
        "Mình chưa chắc; có thể mẹ lo mình thức khuya. Mình có thể nói với mẹ mình định học tới mấy giờ.",
      ]),
    },
  ],
  calm_in_the_moment: [
    {
      id: "lam-diu-thuyet-trinh",
      sign: "so-sai",
      situation: "Một bạn sắp phải thuyết trình trước lớp sau giờ ra chơi.",
      lines: lines(CALM_WHY, [
        "Hồi hộp, tim đập nhanh, tay lạnh, cứ đọc đi đọc lại câu mở đầu.",
        "Hít thở hộp: hít vào đếm 4, giữ 4, thở ra 4, làm 4 lần.",
        "Đọc thầm câu mở đầu một lần rồi mới đứng lên.",
        "Khá hợp; lần sau mình dùng trước giờ kiểm tra miệng.",
      ]),
    },
    {
      id: "lam-diu-tay-run",
      sign: "lo-kiem-tra",
      situation: "Một bạn vừa nhận đề kiểm tra Toán thì thấy tay run, đọc không vào.",
      lines: lines(CALM_WHY, [
        "Lo, tay run, đọc đề mà chữ cứ trôi đi.",
        "Đặt bút xuống, thở chậm: hít vào 4, thở ra 6, làm 5 lần (khoảng 1 phút).",
        "Đọc lướt cả đề, đánh dấu câu dễ nhất và làm câu đó trước.",
        "Hợp; lần sau mình làm ngay khi vừa nhận đề.",
      ]),
    },
    {
      id: "lam-diu-bai-hoa",
      sign: "chan-bai-kho",
      situation: "Một bạn làm bài Hóa 20 phút không ra, bực muốn bỏ.",
      lines: lines(CALM_WHY, [
        "Bực, người nóng lên, muốn gập vở bỏ bài.",
        "Đứng dậy uống nước, vươn vai 2 phút, không cầm điện thoại.",
        "Đọc lại đề, gạch chân những gì đề đã cho.",
        "Khá hợp; lần sau dùng khi một bài quá 15 phút chưa ra.",
      ]),
    },
    {
      id: "lam-diu-thu-vien",
      sign: "ban-be",
      situation: "Một bạn đang ôn bài ở thư viện thì bàn bên gõ bút liên tục, thấy rất bực.",
      lines: lines(CALM_WHY, [
        "Bực, nhíu mày, đọc mãi một dòng không vào.",
        "Thở chậm 10 nhịp, thả lỏng vai; vẫn bực thì nói nhỏ nhờ bạn ấy dừng gõ.",
        "Đọc lại đoạn đang dở từ đầu câu.",
        "Hợp; lần sau mình dùng khi bị làm phiền lúc đang học.",
      ]),
    },
  ],
  plan_step_by_step: [
    {
      id: "go-roi-on-thi",
      sign: "lo-kiem-tra",
      situation: "Một bạn có 4 môn cần ôn cho tuần kiểm tra học kỳ, mỗi tối có khoảng 2 tiếng.",
      lines: lines(PLAN_WHY, [
        "Toán (thi thứ Hai), Văn (thứ Ba), Anh (thứ Tư), Sử (thứ Năm); mỗi tối 2 tiếng.",
        "Cách 1: mỗi tối ôn đều 2 môn. Cách 2: ôn môn thi sớm trước, môn thi sau để cuối tuần.",
        "Chọn cách 2, Toán trước vì thi sớm nhất và còn nhiều dạng bài.",
        "Làm lại 3 bài trong đề cương Toán, bắt đầu lúc 19 giờ tối nay.",
        "Nếu không kịp: để phần Sử sang chiều Chủ nhật.",
      ]),
    },
    {
      id: "go-roi-slide-dia",
      sign: "tri-hoan",
      situation: "Một bạn có phần thuyết trình nhóm môn Địa nộp thứ Sáu nhưng chưa bắt đầu.",
      lines: lines(PLAN_WHY, [
        "Phần slide Địa của mình (4 trang), nộp thứ Sáu; tối nay và tối mai, mỗi tối 1 tiếng.",
        "Cách 1: tối nay làm hết 4 trang. Cách 2: tối nay tìm số liệu, tối mai làm slide.",
        "Chọn cách 2 vì tìm số liệu lâu nhất, làm trước cho chắc.",
        "Mở sách Địa, chép 3 số liệu chính, bắt đầu lúc 20 giờ.",
        "Nếu không kịp: nhắn nhóm trưởng xin thêm một ngày cho phần hình ảnh.",
      ]),
    },
    {
      id: "go-roi-van-nghe",
      sign: "ban-be",
      situation: "Một bạn vừa có bài tập nộp mai, vừa hứa tối nay tập văn nghệ với lớp.",
      lines: lines(PLAN_WHY, [
        "Bài tập 6 câu (nộp mai), tập văn nghệ 1 tiếng; tối nay có 2 tiếng rưỡi.",
        "Cách 1: đi tập trước rồi về làm bài. Cách 2: làm bài 1 tiếng trước rồi đi tập.",
        "Chọn cách 2 vì bài phải nộp mai, làm trước sẽ đỡ lo khi đi tập.",
        "Làm câu 1 và câu 2 lúc 18 giờ 30, sau bữa tối.",
        "Nếu không kịp: báo bạn lớp trưởng là mình đến muộn 15 phút.",
      ]),
    },
  ],
  ask_for_help: [
    {
      id: "nho-giup-chia-thap-phan",
      sign: "ngai-nho",
      situation: "Một bạn chưa hiểu cách đặt tính chia số thập phân ở bài tập Toán.",
      lines: lines(HELP_WHY, [
        "Chưa hiểu bước dời dấu phẩy khi chia số thập phân; đã xem lại ví dụ trong sách nhưng vẫn ra sai.",
        "Cô dạy Toán, giờ ra chơi, hỏi riêng ở bàn cô.",
        "\"Em chưa hiểu bước dời dấu phẩy khi chia số thập phân. Em đã xem lại ví dụ trong sách nhưng vẫn ra sai. Cô chỉ giúp em bước đó được không ạ?\"",
      ]),
    },
    {
      id: "nho-giup-luc-ke",
      sign: "tu-ti",
      situation: "Một bạn không theo kịp phần thực hành khi làm nhóm môn Vật lý.",
      lines: lines(HELP_WHY, [
        "Chưa biết đọc số trên lực kế; đã xem bạn làm 2 lần nhưng chưa tự làm được.",
        "Bạn nhóm trưởng, ngay trong giờ thực hành, hỏi nhỏ.",
        "\"Mình chưa đọc được số trên lực kế. Mình xem bạn làm rồi mà vẫn chưa chắc. Bạn chỉ mình làm một lần nữa được không?\"",
      ]),
    },
    {
      id: "nho-giup-dan-y",
      sign: "gia-dinh",
      situation: "Một bạn bị trừ điểm bài Văn vì thiếu ý, muốn nhờ chị gái chỉ cách lập dàn ý.",
      lines: lines(HELP_WHY, [
        "Bài Văn bị trừ điểm vì thiếu ý; đã đọc lời phê nhưng chưa biết lập dàn ý thế nào.",
        "Chị gái học lớp 11, tối thứ Bảy, nói trực tiếp ở nhà.",
        "\"Chị ơi, bài Văn của em bị trừ điểm vì thiếu ý. Em đọc lời phê rồi mà chưa biết lập dàn ý. Chị chỉ em cách lập dàn ý một bài được không?\"",
      ]),
    },
  ],
  see_other_side: [
    {
      id: "ngk-an-sang",
      sign: "ban-be",
      situation: "Một bạn thấy bạn thân đi ăn sáng ở căng tin với nhóm khác mà không rủ mình.",
      lines: lines(OTHER_SIDE_WHY, [
        "Sáng thứ Hai, bạn thân đi ăn sáng ở căng tin với mấy bạn lớp bên, không rủ mình.",
        "Có thể bạn ấy gặp các bạn kia ở cổng nên đi luôn. Cũng có thể bạn ấy nghĩ mình đã ăn ở nhà rồi.",
        "Mình chưa biết bạn ấy có tìm mình trước đó không.",
        "\"Sáng nay mình tìm bạn mà không thấy. Bạn có bận gì không? Mai mình đi ăn cùng nhé?\"",
      ]),
    },
    {
      id: "ngk-phieu-diem",
      sign: "gia-dinh",
      situation: "Một bạn đưa phiếu điểm giữa kỳ cho mẹ, mẹ xem xong im lặng cả buổi tối.",
      lines: lines(OTHER_SIDE_WHY, [
        "Tối qua mình đưa phiếu điểm cho mẹ, mẹ xem xong không nói gì cả buổi.",
        "Có thể mẹ mệt sau giờ làm. Cũng có thể mẹ đang lo và chưa biết nói với mình thế nào.",
        "Mình chưa biết mẹ nghĩ gì về phiếu điểm, vì mẹ chưa nói câu nào.",
        "\"Mẹ ơi, mẹ xem phiếu điểm của con rồi, mẹ thấy thế nào ạ?\"",
      ]),
    },
    {
      id: "ngk-muon-vo",
      sign: "lo-kiem-tra",
      situation: "Một bạn hỏi mượn vở ghi trước giờ kiểm tra Sử thì bạn cùng bàn nói \"không\" rất cộc.",
      lines: lines(OTHER_SIDE_WHY, [
        "Đầu giờ, mình hỏi mượn vở ghi Sử, bạn cùng bàn nói \"không\" rồi quay đi.",
        "Có thể bạn ấy đang ôn dở và cần vở ngay. Cũng có thể bạn ấy đang lo bài kiểm tra nên nói vội.",
        "Mình chưa biết bạn ấy bực mình hay chỉ đang vội.",
        "\"Lúc nãy bạn đang ôn dở à? Ôn xong bạn cho mình mượn một lúc được không?\"",
      ]),
    },
    {
      id: "ngk-bai-ve",
      sign: "tu-ti",
      situation: "Một bạn đưa bài vẽ cho bạn cùng nhóm xem, bạn ấy chỉ nói \"cũng được\" rồi làm việc khác.",
      lines: lines(OTHER_SIDE_WHY, [
        "Giờ Mỹ thuật, mình đưa bài vẽ cho bạn cùng nhóm xem, bạn ấy nói \"cũng được\" rồi quay đi.",
        "Có thể bạn ấy đang vội làm bài của mình. Cũng có thể bạn ấy thấy có chỗ cần sửa nhưng ngại nói.",
        "Mình chưa biết \"cũng được\" là khen hay là chưa thích.",
        "\"Lúc nãy bạn đang vội à? Bạn thấy bài mình có chỗ nào nên sửa không, nói thật cũng được.\"",
      ]),
    },
  ],
  notice_peer_stress: [
    {
      id: "qt-truoc-gio-hoa",
      sign: "lo-kiem-tra",
      situation: "Một bạn thấy bạn cùng bàn lật đề cương liên tục trước giờ kiểm tra Hóa và nói \"mình quên hết rồi\".",
      lines: lines(NOTICE_WHY, [
        "Bạn ấy lật đề cương liên tục, cắn bút, nói \"mình quên hết rồi\", không ăn sáng như mọi hôm.",
        "\"Mình thấy bạn đang lo bài Hóa. Bạn muốn nói chút không, hay ngồi yên một lúc?\"",
        "Rủ bạn ấy thở chậm cùng mình 4 nhịp, rồi hỏi nhau 3 câu dễ trong đề cương.",
        "Nếu lần kiểm tra nào bạn ấy cũng lo đến mức không làm được bài, mình sẽ rủ bạn ấy nói với cô chủ nhiệm hoặc phòng tham vấn.",
      ]),
    },
    {
      id: "qt-hoc-them",
      sign: "chan-bai-kho",
      situation: "Một bạn thấy bạn thân mấy hôm nay ngáp suốt, nộp bài muộn, nói tối nào cũng học thêm đến 10 giờ.",
      lines: lines(NOTICE_WHY, [
        "Ba hôm nay bạn ấy ngáp suốt giờ, nộp bài muộn hai lần, nói \"tối nào cũng học thêm đến 10 giờ\".",
        "\"Mấy hôm nay bạn trông mệt lắm. Lịch học thêm có nặng quá không?\"",
        "Cho bạn ấy xem vở ghi bài hôm nay, và rủ làm chung một bài khó trong giờ ra chơi.",
        "Nếu bạn ấy mệt mãi không đỡ, mình rủ bạn ấy nói với bố mẹ hoặc cô chủ nhiệm. Nếu bạn ấy nói điều làm mình lo, mình tự nói với cô ngay.",
      ]),
    },
    {
      id: "qt-doi-tuyen",
      sign: "tu-ti",
      situation: "Một bạn thấy bạn trong đội tuyển Tiếng Anh, sau buổi thi thử, cứ nói \"mình kém nhất đội\".",
      lines: lines(NOTICE_WHY, [
        "Sau buổi thi thử, bạn ấy nói \"mình kém nhất đội, chắc không nên thi nữa\" mấy lần, rồi ngồi im.",
        "\"Mình nghe bạn nói vậy mấy lần rồi. Bài thi thử hôm nay làm bạn buồn à?\"",
        "Ngồi nghe bạn ấy kể, rồi rủ cùng xem lại một câu sai để mai hỏi cô.",
        "Nếu bạn ấy cứ buồn như vậy nhiều ngày, mình sẽ nói với cô dạy đội tuyển hoặc cô chủ nhiệm để cô hỏi han bạn ấy.",
      ]),
    },
    {
      id: "qt-chuyen-nha",
      sign: "gia-dinh",
      situation: "Một bạn thấy bạn cùng lớp mấy hôm nay mắt thâm, ngồi một mình, bảo nhà đang chuyển chỗ ở nên ngủ muộn.",
      lines: lines(NOTICE_WHY, [
        "Mấy hôm nay bạn ấy mắt thâm, giờ ra chơi ngồi một mình, bảo nhà đang chuyển chỗ ở nên tối ngủ muộn.",
        "\"Chuyển nhà chắc mệt lắm nhỉ. Hôm nay bạn ra chơi cùng nhóm mình không?\"",
        "Cho bạn ấy mượn vở chép bài, và giữ một chỗ cho bạn ấy ngồi cùng nhóm.",
        "Nếu bạn ấy kể chuyện ở nhà làm bạn ấy sợ, hoặc buồn mãi không đỡ, mình sẽ nói với cô chủ nhiệm hoặc phòng tham vấn.",
      ]),
    },
  ],
  listen_to_peer: [
    {
      id: "ln-doi-tuyen-anh",
      sign: "lo-kiem-tra",
      situation: "Một bạn kể sắp thi chọn đội tuyển Tiếng Anh, tối nào cũng khó ngủ.",
      lines: lines(LISTEN_WHY, [
        "\"Mình đang nghe đây. Bạn cứ kể, mình không vội đâu.\"",
        "\"Tức là còn một tuần nữa thi, tối nào bạn cũng nằm mãi không ngủ được, nên bạn vừa lo vừa mệt, đúng không?\"",
        "\"Lúc nằm không ngủ được, bạn hay nghĩ tới điều gì nhất?\"",
        "Tránh nói \"Lo gì, bạn giỏi thế cơ mà\" vì nghe như mình gạt đi nỗi lo của bạn ấy.",
      ]),
    },
    {
      id: "ln-sinh-nhat",
      sign: "ban-be",
      situation: "Một bạn kể không được mời đến sinh nhật của một bạn trong lớp, thấy hụt hẫng.",
      lines: lines(LISTEN_WHY, [
        "\"Trông bạn buồn buồn. Có chuyện gì thì kể mình nghe nhé.\"",
        "\"Mấy bạn trong nhóm đều được mời mà bạn thì không, nên bạn thấy hụt hẫng và hơi bị bỏ rơi, phải không?\"",
        "\"Điều gì trong chuyện này làm bạn buồn nhất?\"",
        "Tránh nói \"Kệ đi, mình cũng chẳng ưa bạn ấy\" vì như vậy là nói xấu người khác và chưa nghe hết chuyện.",
      ]),
    },
    {
      id: "ln-hoc-them",
      sign: "gia-dinh",
      situation: "Một bạn kể bố mẹ muốn bạn ấy học thêm một buổi tối nữa, bạn ấy thấy mệt mà không dám nói.",
      lines: lines(LISTEN_WHY, [
        "\"Bạn kể đi, mình nghe hết rồi mình mới nói.\"",
        "\"Bạn đã học thêm 3 buổi rồi, giờ bố mẹ muốn thêm một buổi nữa, nên bạn thấy mệt mà lại ngại nói với bố mẹ, đúng không?\"",
        "\"Nếu được nói với bố mẹ, bạn muốn bố mẹ hiểu điều gì?\"",
        "Tránh nói \"Bố mẹ mình còn khắt khe hơn\" vì đem chuyện của mình ra so là lấy mất lượt kể của bạn ấy.",
      ]),
    },
    {
      id: "ln-quen-loi",
      sign: "so-sai",
      situation: "Một bạn kể vừa thuyết trình môn Địa thì quên lời, đứng im một lúc trước lớp.",
      lines: lines(LISTEN_WHY, [
        "\"Mình ngồi đây với bạn. Bạn muốn kể lại không?\"",
        "\"Bạn chuẩn bị kỹ mà lên đến nơi lại quên mất phần giữa, nên bạn thấy tiếc và ngại với cả lớp, đúng không?\"",
        "\"Lúc đứng trên đó, bạn thấy thế nào?\"",
        "Tránh nói \"Ai chả thế, có gì đâu\" vì bạn ấy sẽ thấy cảm xúc của mình không được để ý.",
      ]),
    },
  ],
  resolve_group_conflict: [
    {
      id: "bd-bao-tuong",
      sign: "ban-be",
      situation: "Một bạn trong nhóm làm báo tường muốn vẽ tay, còn bạn khác muốn in ảnh màu cho nhanh.",
      lines: lines(CONFLICT_WHY, [
        "Mình muốn vẽ tay báo tường cho có dấu ấn của lớp; một bạn trong nhóm muốn in ảnh màu cho nhanh và đẹp.",
        "\"Mình thấy hơi tiếc vì báo in thì lớp nào cũng giống nhau. Mình muốn có ít nhất một phần do lớp mình tự vẽ.\"",
        "Cách 1: in ảnh làm nền, vẽ tay tiêu đề và khung. Cách 2: chia đôi tờ báo, một nửa in, một nửa vẽ.",
        "Cả nhóm giơ tay chọn một cách; bạn kia in ảnh trước thứ Tư, mình vẽ tiêu đề tối thứ Tư.",
      ]),
    },
    {
      id: "bd-hen-lam",
      sign: "tri-hoan",
      situation: "Một bạn muốn làm bài nhóm ngay chiều thứ Bảy, còn bạn kia muốn để tối Chủ nhật mới làm.",
      lines: lines(CONFLICT_WHY, [
        "Bài nhóm nộp sáng thứ Hai. Mình muốn làm chiều thứ Bảy; bạn cùng nhóm muốn để tối Chủ nhật vì thứ Bảy bạn ấy bận.",
        "\"Mình thấy lo vì để tối Chủ nhật thì lỡ có lỗi là không kịp sửa. Mình muốn làm xong phần chính trước tối Chủ nhật.\"",
        "Cách 1: mỗi người làm phần mình ở nhà trong thứ Bảy, tối Chủ nhật chỉ ghép lại. Cách 2: họp online sáng Chủ nhật 1 tiếng.",
        "Chọn cách 1; mình gửi phần của mình trước 21 giờ thứ Bảy, bạn ấy gửi trước trưa Chủ nhật.",
      ]),
    },
    {
      id: "bd-thi-nghiem",
      sign: "so-sai",
      situation: "Một bạn muốn tự làm hết phần thực hành Sinh vì sợ cả nhóm làm sai, còn các bạn khác cũng muốn được làm.",
      lines: lines(CONFLICT_WHY, [
        "Giờ thực hành Sinh, mình muốn tự làm hết vì sợ nhóm làm sai; hai bạn kia cũng muốn được làm.",
        "\"Mình thấy lo vì lần trước nhóm mình bị trừ điểm do làm đổ mẫu. Mình muốn cả nhóm làm cẩn thận từng bước.\"",
        "Cách 1: mỗi người làm một bước, người khác đọc hướng dẫn để kiểm tra. Cách 2: mình làm mẫu bước đầu, các bạn làm các bước sau.",
        "Chọn cách 1; nhóm trưởng chia bước ngay đầu giờ, ai xong bước nào thì đánh dấu vào phiếu.",
      ]),
    },
    {
      id: "bd-chia-viec",
      sign: "tu-ti",
      situation: "Một bạn chỉ được nhóm giao việc in tài liệu, thấy mình không được tin tưởng.",
      lines: lines(CONFLICT_WHY, [
        "Nhóm chia việc làm bài thuyết trình; mình chỉ được giao in tài liệu, còn mình muốn làm cả phần nội dung.",
        "\"Mình thấy hơi buồn vì chỉ được giao in tài liệu. Mình muốn làm một phần nội dung, vì mình cũng đã đọc kỹ bài.\"",
        "Cách 1: mình làm 1 trang nội dung và vẫn lo in. Cách 2: mình soạn câu hỏi cho phần hỏi đáp cuối buổi.",
        "Hỏi ý cả nhóm, chọn cách 1; mình gửi trang của mình cho nhóm trưởng xem trước tối thứ Năm.",
      ]),
    },
  ],
  say_no_to_pressure: [
    {
      id: "kh-chep-btvn",
      sign: "tri-hoan",
      situation: "Một bạn được bạn thân nhắn xin ảnh chụp bài tập về nhà để chép nộp vì chưa làm.",
      lines: lines(SAY_NO_WHY, [
        "10 giờ tối, bạn thân nhắn xin ảnh chụp bài tập Lý của mình để chép, sáng mai nộp.",
        "Nếu cô thấy hai bài giống nhau, cả hai bị trừ điểm; bạn ấy vẫn chưa hiểu bài cho bài kiểm tra sắp tới.",
        "\"Không, bài này mình không gửi đâu. Mình không muốn hai đứa bị trừ điểm.\"",
        "\"Sáng mai đến sớm 15 phút, mình giảng cho bạn câu khó nhất nhé.\"",
      ]),
    },
    {
      id: "kh-biet-danh",
      sign: "ban-be",
      situation: "Một bạn được mấy bạn trong nhóm chat rủ đặt biệt danh để trêu một bạn trong lớp.",
      lines: lines(SAY_NO_WHY, [
        "Tối qua, trong nhóm chat, mấy bạn rủ mình cùng đặt biệt danh để trêu một bạn hay im lặng trong lớp.",
        "Bạn kia sẽ buồn và ngại đến lớp; nếu cô biết, cả nhóm bị nhắc; mình cũng sẽ thấy áy náy.",
        "\"Thôi, mình không tham gia đâu. Trêu kiểu này bạn ấy buồn lắm.\"",
        "\"Mình bàn chuyện đi đá cầu Chủ nhật đi.\" Giờ ra chơi mình rủ bạn kia chơi cùng.",
      ]),
    },
    {
      id: "kh-chau-cay",
      sign: "so-sai",
      situation: "Một bạn được rủ không nhận lỗi làm vỡ chậu cây của lớp, cứ nói là không biết.",
      lines: lines(SAY_NO_WHY, [
        "Giờ ra chơi, mình với một bạn đùa nhau làm vỡ chậu cây của lớp; bạn ấy rủ cứ nói là không biết.",
        "Lớp có thể bị trừ điểm thi đua; bạn khác có thể bị nghi oan; mình sẽ lo mãi.",
        "\"Không, mình không giấu đâu. Mình làm vỡ thì mình nhận.\"",
        "\"Mình cùng lên nói với cô chủ nhiệm, rồi xin cô cho trồng lại cây nhé.\"",
      ]),
    },
    {
      id: "kh-hoc-nhom",
      sign: "gia-dinh",
      situation: "Một bạn được rủ nói với bố mẹ là đi học nhóm để đi chơi trung tâm thương mại.",
      lines: lines(SAY_NO_WHY, [
        "Thứ Bảy, nhóm bạn rủ mình nói với bố mẹ là đi học nhóm, thực ra là đi chơi trung tâm thương mại.",
        "Nếu bố mẹ biết, lần sau bố mẹ khó tin mình; bài nhóm thật thì vẫn chưa làm.",
        "\"Không, mình không nói dối bố mẹ đâu.\"",
        "\"Hay mình học nhóm 1 tiếng trước, rồi mình xin bố mẹ cho đi chơi luôn.\"",
      ]),
    },
  ],
  // ───── 7 mô-đun đợt 2 (01/11, chờ duyệt) ─────
  know_my_strengths: [
    {
      id: "dm-bao-tuong",
      sign: "tu-ti",
      situation: "Một bạn được chọn vẽ minh họa cho báo tường nhưng thấy mình học kém hơn các bạn trong nhóm.",
      lines: lines(STRENGTH_WHY, [
        "Tháng trước mình vẽ xong tranh minh họa cho báo tường dù phải vẽ lại phần nền ba lần.",
        "Mình kiên trì, vẽ hỏng thì sửa tiếp chứ không bỏ.",
        "Ba tối liền mình ngồi sửa phần nền, đến khi cả nhóm đều thấy được.",
        "Bài hình học làm chưa ra, mình sẽ thử lại theo cách khác ba lần trước khi hỏi bạn.",
      ]),
    },
    {
      id: "dm-bai-hat",
      sign: "lo-kiem-tra",
      situation: "Một bạn sắp kiểm tra Sử, nghĩ mình học thuộc kém nên chắc làm không được.",
      lines: lines(STRENGTH_WHY, [
        "Học kỳ trước mình thuộc lời cả bài hát tiếng Anh để hát ở lễ khai giảng.",
        "Mình nhớ tốt khi chia nhỏ ra và ôn lại nhiều lần.",
        "Mỗi tối mình hát 2 câu, một tuần là thuộc cả bài.",
        "Bài Sử, mỗi tối mình ôn 2 mốc thời gian, sáng hôm sau tự hỏi lại.",
      ]),
    },
    {
      id: "dm-xe-dap",
      sign: "chan-bai-kho",
      situation: "Một bạn làm bài Vật lý khó mãi không ra, nghĩ mình không có đầu óc học môn này.",
      lines: lines(STRENGTH_WHY, [
        "Tuần trước mình tự lắp lại được xích xe đạp bị tuột mà không cần nhờ ai.",
        "Mình chịu quan sát và thử từng bước một.",
        "Mình xem xích tuột ở đâu, thử lắp ba cách rồi mới được.",
        "Bài Vật lý, mình sẽ ghi ra từng dữ kiện và thử từng công thức một, thay vì nhìn cả bài rồi nản.",
      ]),
    },
  ],
  growth_mindset: [
    {
      id: "td-da-cau",
      sign: "chan-bai-kho",
      situation: "Một bạn tập đá cầu mãi không tâng được quá 3 quả, nói \"mình vụng, không chơi được\".",
      lines: lines(GROWTH_WHY, [
        "\"Mình vụng, mình không bao giờ chơi được đá cầu.\"",
        "\"Mình chưa tâng được quá 3 quả, nhưng nếu tập đều thì có thể tâng được nhiều hơn.\"",
        "Thay vì cố tâng thật nhiều, mỗi ngày mình tập 10 phút và đếm số lần tâng liên tiếp.",
        "Sau 2 tuần, mình xem số lần tâng liên tiếp có nhiều hơn 3 quả không.",
      ]),
    },
    {
      id: "td-van",
      sign: "tu-ti",
      situation: "Một bạn thấy bạn cùng bàn viết văn hay, nghĩ \"mình không có năng khiếu Văn\".",
      lines: lines(GROWTH_WHY, [
        "\"Mình không có năng khiếu, viết văn kiểu gì cũng dở.\"",
        "\"Mình chưa viết được mở bài hay, nhưng nếu đọc bài mẫu và tập viết thì sẽ khá lên.\"",
        "Thay vì viết một mạch cả bài, mình viết mở bài trước rồi nhờ bạn đọc góp ý một câu.",
        "Cuối tháng, mình so bài mới với bài đầu tháng xem mở bài có rõ hơn không.",
      ]),
    },
    {
      id: "td-tu-vung",
      sign: "lo-kiem-tra",
      situation: "Một bạn bị điểm thấp bài kiểm tra Tiếng Anh đầu kỳ, nghĩ \"học cũng vậy thôi\".",
      lines: lines(GROWTH_WHY, [
        "\"Mình kém tiếng Anh rồi, học cũng vậy thôi.\"",
        "\"Mình chưa nhớ được nhiều từ mới, nhưng nếu học mỗi ngày một ít thì sẽ nhớ hơn.\"",
        "Thay vì chép mỗi từ 10 lần, mỗi tối mình học 5 từ bằng thẻ, sáng hôm sau tự kiểm tra.",
        "Sau 2 tuần, mình tự kiểm tra lại 20 từ đã học, xem nhớ được bao nhiêu.",
      ]),
    },
  ],
  set_small_goal: [
    {
      id: "mt-doc-sach",
      sign: "tri-hoan",
      situation: "Một bạn muốn đọc sách nhiều hơn nhưng tháng nào cũng để dở cuốn đang đọc.",
      lines: lines(GOAL_WHY, [
        "Mình muốn đọc hết một cuốn truyện thay vì để dở.",
        "Trong 2 tuần, mỗi tối mình đọc 10 trang cuốn truyện đang đọc.",
        "Lúc 9 giờ 30 tối, trước khi ngủ, mình đọc 10 trang và để điện thoại ngoài bàn học.",
        "Mỗi tối đánh dấu vào tờ lịch dán ở bàn; lỡ một hôm thì hôm sau vẫn đọc 10 trang, không đọc bù gấp đôi.",
      ]),
    },
    {
      id: "mt-toan",
      sign: "lo-kiem-tra",
      situation: "Một bạn muốn bớt lo môn Toán trước kỳ thi học kỳ.",
      lines: lines(GOAL_WHY, [
        "Mình muốn bớt sợ mỗi lần gặp bài Toán dạng mới.",
        "Trong 2 tuần, mỗi ngày mình làm 2 bài Toán trong đề cương, tổng cộng 28 bài.",
        "Sau bữa tối, lúc 8 giờ, mình làm 2 bài trong 30 phút.",
        "Mỗi tối ghi số bài đã làm vào cuối vở; lỡ một hôm thì cuối tuần làm bù 2 bài.",
      ]),
    },
    {
      id: "mt-phat-bieu",
      sign: "so-sai",
      situation: "Một bạn muốn mạnh dạn phát biểu hơn trong giờ học.",
      lines: lines(GOAL_WHY, [
        "Mình muốn bớt ngại giơ tay khi mình biết câu trả lời.",
        "Trong 1 tuần, mỗi ngày mình giơ tay phát biểu ít nhất một lần.",
        "Ở tiết mình thấy dễ nhất trong ngày, mình chọn một câu chắc chắn để giơ tay.",
        "Cuối ngày đánh dấu vào góc vở; hôm nào chưa giơ tay thì hôm sau thử ở tiết mình thích nhất.",
      ]),
    },
  ],
  start_when_reluctant: [
    {
      id: "bd-thu-hoach",
      sign: "tri-hoan",
      situation: "Một bạn phải viết bài thu hoạch sau buổi tham quan bảo tàng nhưng cứ để đến mai.",
      lines: lines(START_WHY, [
        "Bài thu hoạch 2 trang; mình ngại vì không biết mở đầu thế nào.",
        "Chỉ ghi ra 3 thứ mình nhớ nhất ở bảo tàng, chưa cần viết thành câu.",
        "Để điện thoại ở phòng khách cho đến khi ghi xong 3 ý.",
        "Ghi xong 3 ý thì nghỉ 5 phút ăn hoa quả, rồi viết tiếp đoạn đầu.",
      ]),
    },
    {
      id: "bd-hoa",
      sign: "chan-bai-kho",
      situation: "Một bạn phải làm 10 câu bài tập Hóa, nhìn cả trang là muốn gập vở.",
      lines: lines(START_WHY, [
        "10 câu bài tập Hóa; mình ngại vì nhìn cả trang thấy dài và khó.",
        "Chỉ làm câu 1 và câu 2, hai câu dễ nhất, trong 5 phút.",
        "Tắt thông báo trò chơi, cất máy tính bảng vào ngăn kéo.",
        "Làm xong 2 câu thì đứng dậy uống nước, vươn vai 3 phút rồi làm tiếp câu 3.",
      ]),
    },
    {
      id: "bd-thuyet-trinh",
      sign: "so-sai",
      situation: "Một bạn phải tập thuyết trình cho tiết Sinh học mà cứ né, sợ nói vấp.",
      lines: lines(START_WHY, [
        "Tập thuyết trình 3 phút; mình ngại vì sợ nghe giọng mình nói vấp.",
        "Chỉ đọc to câu mở đầu một lần trước gương.",
        "Đóng cửa phòng, tắt tivi để tập cho yên.",
        "Đọc xong câu mở đầu thì tự vẽ một ngôi sao vào lịch tập, rồi đọc tiếp đoạn hai.",
      ]),
    },
  ],
  weigh_consequences: [
    {
      id: "hq-xem-phim",
      sign: "ban-be",
      situation: "Một bạn được rủ đi xem phim tối thứ Bảy, nhưng sáng Chủ nhật có buổi học thêm mà bài tập chưa làm.",
      lines: lines(WEIGH_WHY, [
        "Tối thứ Bảy đi xem phim với bạn, hay ở nhà làm bài tập cho buổi học thêm.",
        "Cách 1: đi xem phim, về làm bài đến khuya. Cách 2: làm bài chiều thứ Bảy rồi tối đi xem phim. Cách 3: ở nhà, hẹn bạn tuần sau.",
        "Cách 1 thì sáng mai mình buồn ngủ, bài làm vội. Cách 2 thì phải bỏ buổi đá bóng chiều nhưng tối vẫn vui với bạn. Cách 3 thì bạn có thể hơi buồn.",
        "Cách 2, vì vẫn đi chơi được mà không phải thức khuya hay làm bài vội.",
      ]),
    },
    {
      id: "hq-thuc-khuya",
      sign: "lo-kiem-tra",
      situation: "Một bạn đêm trước ngày thi đang phân vân thức khuya ôn tiếp hay đi ngủ sớm.",
      lines: lines(WEIGH_WHY, [
        "Đêm trước ngày thi Sử, nên thức đến 1 giờ ôn tiếp hay đi ngủ lúc 10 giờ.",
        "Cách 1: thức ôn đến 1 giờ. Cách 2: ôn lại dàn ý 30 phút rồi ngủ lúc 10 giờ.",
        "Cách 1 thì nhớ thêm vài ý nhưng sáng mai mệt, dễ quên khi làm bài, bố mẹ cũng lo. Cách 2 thì ôn ít hơn nhưng đầu óc tỉnh táo khi thi.",
        "Cách 2, vì ngủ đủ giúp mình nhớ những gì đã ôn và làm bài tỉnh táo hơn.",
      ]),
    },
    {
      id: "hq-coc-cua-me",
      sign: "gia-dinh",
      situation: "Một bạn lỡ tay làm vỡ chiếc cốc mẹ thích khi rửa bát, phân vân có nên nói với mẹ không.",
      lines: lines(WEIGH_WHY, [
        "Lỡ tay làm vỡ chiếc cốc mẹ thích, nên nói thật với mẹ hay giấu đi.",
        "Cách 1: dọn đi, không nói gì. Cách 2: nói ngay với mẹ và xin lỗi. Cách 3: đợi mẹ hỏi rồi mới nói.",
        "Cách 1 thì mẹ sẽ tìm cốc, có thể biết chuyện và buồn vì mình giấu. Cách 2 thì mình có thể bị nhắc, nhưng mẹ tin mình hơn. Cách 3 thì mình cứ lo suốt.",
        "Cách 2, vì nói thật thì mình đỡ lo hơn và mẹ vẫn tin mình.",
      ]),
    },
  ],
  check_information: [
    {
      id: "kt-nghi-hoc",
      sign: "ban-be",
      situation: "Một bạn đọc được trong nhóm chat lớp tin \"mai được nghỉ học vì trường mất điện\".",
      lines: lines(CHECK_WHY, [
        "Tối qua có người nhắn trong nhóm chat lớp \"mai nghỉ học vì trường mất điện\", không ghi ai báo.",
        "Biết chắc: có tin nhắn đó trong nhóm. Mới nghe nói: trường mất điện và cả lớp được nghỉ.",
        "Xem nhóm phụ huynh có thông báo của cô chủ nhiệm không, hoặc nhờ mẹ hỏi cô.",
        "Chưa chia sẻ tiếp, vì nếu tin sai thì các bạn nghỉ học mà không biết.",
      ]),
    },
    {
      id: "kt-de-ly",
      sign: "lo-kiem-tra",
      situation: "Một bạn nghe mấy bạn lớp bên nói \"đề kiểm tra Lý tuần sau toàn bài khó ngoài sách\".",
      lines: lines(CHECK_WHY, [
        "Giờ ra chơi, mấy bạn lớp bên nói đề kiểm tra Lý tuần sau toàn bài khó ngoài sách.",
        "Biết chắc: tuần sau có kiểm tra Lý. Mới nghe nói: đề toàn bài khó, ngoài sách.",
        "Hỏi thầy dạy Lý xem bài kiểm tra gồm những phần nào.",
        "Không nhắn lại vào nhóm lớp, vì tin chưa chắc chỉ làm cả lớp lo thêm.",
      ]),
    },
    {
      id: "kt-chuyen-truong",
      sign: "tu-ti",
      situation: "Một bạn thấy trong nhóm chat có người nói một bạn cùng lớp sắp chuyển trường vì học kém.",
      lines: lines(CHECK_WHY, [
        "Trong nhóm chat có người nhắn \"nghe nói bạn H. sắp chuyển trường vì học kém\".",
        "Biết chắc: bạn H. nghỉ học hai hôm nay. Mới nghe nói: chuyển trường, và vì học kém.",
        "Không hỏi dò cả lớp; nếu lo cho bạn H., mình nhắn hỏi thăm riêng bạn ấy.",
        "Không chia sẻ, vì đây là chuyện riêng của bạn H. và tin sai có thể làm bạn ấy buồn.",
      ]),
    },
  ],
  show_gratitude: [
    {
      id: "co-vo-ghi-bai",
      sign: "ban-be",
      situation: "Một bạn được bạn cùng bàn chụp vở ghi bài gửi cho trong tuần bị ốm phải nghỉ học.",
      lines: lines(THANKS_WHY, [
        "Tuần trước mình ốm nghỉ 3 ngày, bạn cùng bàn tối nào cũng chụp vở ghi bài gửi cho mình.",
        "Nhờ vậy mình theo kịp bài, không bị hổng; mình thấy được quan tâm.",
        "\"Cảm ơn bạn tuần trước tối nào cũng chụp vở gửi mình. Nhờ bạn mà mình không bị hổng bài. Bạn chu đáo thật đấy.\"",
        "Nói trực tiếp sáng mai lúc vào lớp, kèm một gói bánh nhỏ.",
      ]),
    },
    {
      id: "co-me",
      sign: "gia-dinh",
      situation: "Một bạn thấy mẹ tối nào cũng để phần cơm và mang sữa cho mình trong mấy tuần ôn thi.",
      lines: lines(THANKS_WHY, [
        "Mấy tuần ôn thi, tối nào mẹ cũng để phần cơm và mang cho mình cốc sữa lúc 9 giờ.",
        "Nhờ vậy mình học được lâu mà không đói, mình thấy mẹ lo cho mình.",
        "\"Con cảm ơn mẹ mấy tuần nay tối nào cũng để phần cơm và mang sữa cho con. Con biết mẹ cũng mệt mà vẫn đợi con.\"",
        "Nói với mẹ lúc ăn cơm tối nay, rồi rửa bát giúp mẹ.",
      ]),
    },
    {
      id: "co-giang-lai",
      sign: "ngai-nho",
      situation: "Một bạn được cô ở lại giảng lại bài sau giờ học khi mình ngại hỏi trước lớp.",
      lines: lines(THANKS_WHY, [
        "Hôm thứ Ba, cô dạy Toán ở lại 10 phút sau giờ học giảng lại cho mình bài phân thức.",
        "Nhờ vậy mình làm được bài tập về nhà, bớt sợ môn Toán; mình thấy cô không chê mình chậm.",
        "\"Em cảm ơn cô hôm thứ Ba đã ở lại giảng lại bài cho em. Nhờ cô mà em làm được bài về nhà rồi ạ.\"",
        "Nói với cô sau tiết Toán ngày mai, hoặc viết vào tờ giấy nhỏ kẹp trong vở nộp bài.",
      ]),
    },
  ],
};

/** Cặp so sánh cho ô khó nhất của mỗi kỹ năng (hiện ở bước Hiểu). */
export const SKILL_CONTRAST: Record<SkillId, SampleContrast> = {
  recognize_feelings_thoughts: {
    field: "Chuyện đã xảy ra",
    weak: "Mình dốt, lần nào cũng điểm kém.",
    better: "Mình được 4 điểm bài kiểm tra Anh hôm thứ Ba.",
    why: "\"Mình dốt\" là lời nhận xét về bản thân, không phải sự việc. Nó là suy nghĩ, viết ở ô \"Mình đang nghĩ\".",
  },
  calm_in_the_moment: {
    field: "Mình thấy",
    weak: "Thấy không ổn.",
    better: "Lo, tim đập nhanh, tay run, đọc đề không vào.",
    why: "\"Không ổn\" chưa nói mình đang thấy gì. Gọi tên cảm xúc và dấu hiệu cơ thể thì mới chọn được cách ứng phó hợp: lo thì thở chậm, bực thì tạm dừng, mệt thì nghỉ.",
  },
  plan_step_by_step: {
    field: "Các cách làm",
    weak: "Cố làm hết trong tối nay.",
    better: "Cách 1: làm hết tối nay. Cách 2: tối nay làm Toán, tối mai làm Văn.",
    why: "Chỉ có một cách thì chưa có gì để chọn. Nghĩ ít nhất hai cách rồi mới chọn.",
  },
  ask_for_help: {
    field: "Lời nhờ",
    weak: "\"Cô ơi em không hiểu gì hết.\"",
    better: "\"Em chưa hiểu bước tìm mẫu chung. Em đã làm lại 2 bài nhưng vẫn sai. Cô chỉ giúp em bước đó được không ạ?\"",
    why: "Câu chung chung khiến thầy cô không biết giúp chỗ nào. Nói rõ chỗ vướng thì được giúp đúng và nhanh.",
  },
  see_other_side: {
    field: "Các cách hiểu",
    weak: "Bạn ấy lười, chẳng coi nhóm ra gì.",
    better: "Có thể bạn ấy quên vì tuần này nhiều bài. Cũng có thể bạn ấy chưa hiểu phần việc của mình nên ngại hỏi.",
    why: "\"Bạn ấy lười\" là một lời đoán, lại là lời chê. Nghĩ ít nhất 2 khả năng thì mình chưa vội giận, và biết cần hỏi gì.",
  },
  notice_peer_stress: {
    field: "Câu hỏi han",
    weak: "\"Có gì đâu mà buồn, điểm kém thôi mà.\"",
    better: "\"Mình thấy bạn im cả buổi. Bạn ổn không? Muốn kể thì mình nghe.\"",
    why: "\"Có gì đâu\" làm bạn thấy chuyện của mình bị xem nhẹ. Nói điều mình để ý rồi hỏi han, để bạn tự chọn kể hay không.",
  },
  listen_to_peer: {
    field: "Câu nhắc lại",
    weak: "\"Mình hiểu mà. Lần sau chuẩn bị kỹ hơn là được.\"",
    better: "\"Bạn đã tập mấy hôm mà lên vẫn quên lời, nên bạn thấy tiếc và ngại, đúng không?\"",
    why: "\"Mình hiểu mà\" rồi khuyên ngay thì bạn chưa biết mình có được hiểu đúng không. Nhắc lại chuyện và cảm xúc, rồi hỏi lại, để bạn thấy mình đang được nghe.",
  },
  resolve_group_conflict: {
    field: "Câu Mình thấy… mình muốn…",
    weak: "\"Bạn lúc nào cũng tự quyết hết, chẳng nghe ai.\"",
    better: "\"Mình thấy hơi buồn vì ý của mình chưa được nghe. Mình muốn mỗi người nói ý mình 2 phút rồi cả nhóm cùng chọn.\"",
    why: "\"Bạn lúc nào cũng…\" là trách người kia, dễ thành cãi nhau. Nói mình thấy gì, vì sao và muốn gì thì người kia dễ nghe hơn.",
  },
  say_no_to_pressure: {
    field: "Câu từ chối",
    weak: "\"Ừm… để mình xem đã.\"",
    better: "\"Không, cái này mình không làm đâu. Mình vẫn là bạn của bạn mà.\"",
    why: "\"Để xem đã\" làm bạn kia nghĩ còn rủ tiếp được. Nói \"không\" rõ, ngắn, không chê bạn thì lời từ chối dễ được nghe hơn.",
  },
  // 7 mô-đun đợt 2 (01/11, chờ duyệt)
  know_my_strengths: {
    field: "Điểm mạnh",
    weak: "Mình cũng được.",
    better: "Mình kiên trì: vẽ hỏng thì sửa tiếp, ba tối liền mới xong.",
    why: "\"Mình cũng được\" chưa nói mình mạnh ở đâu. Gọi tên một cách làm cụ thể thì mới dùng lại được cho việc khác.",
  },
  growth_mindset: {
    field: "Viết lại",
    weak: "Mình sẽ cố gắng hơn.",
    better: "\"Mình chưa nhớ được công thức, nhưng nếu mỗi tối làm 2 bài thì sẽ nhớ hơn.\"",
    why: "\"Cố gắng hơn\" chưa nói mình đang ở đâu và đi tiếp thế nào. Câu có \"chưa… nhưng nếu…\" cho thấy mình đang học dở, chưa phải không thể.",
  },
  set_small_goal: {
    field: "Mục tiêu nhỏ",
    weak: "Mình sẽ học chăm hơn.",
    better: "Trong 2 tuần, mỗi tối mình làm 2 bài trong đề cương.",
    why: "\"Học chăm hơn\" không đo được, nên khó biết mình đã làm được chưa. Mục tiêu tốt nói rõ làm gì, bao nhiêu, đến khi nào.",
  },
  start_when_reluctant: {
    field: "Bước khởi động",
    weak: "Ngồi vào làm cho xong.",
    better: "Chỉ chép đề câu 1 và gạch chân dữ kiện, trong 5 phút.",
    why: "\"Làm cho xong\" vẫn là cả việc to, nên càng ngại. Bước khởi động tốt nhỏ đến mức thấy làm được ngay.",
  },
  weigh_consequences: {
    field: "Hậu quả",
    weak: "Cách nào cũng được.",
    better: "Cách 1 thì sáng mai mình mệt, bài làm vội. Cách 2 thì phải bỏ đá bóng nhưng tối vẫn đi chơi được.",
    why: "\"Cách nào cũng được\" là chưa nghĩ tới chuyện sẽ xảy ra. Đoán trước hậu quả của từng cách thì mới có lý do để chọn.",
  },
  check_information: {
    field: "Biết chắc và nghe nói",
    weak: "Chắc là thật, nhiều người nói thế mà.",
    better: "Biết chắc: có tin nhắn trong nhóm. Mới nghe nói: trường mất điện, cả lớp được nghỉ.",
    why: "Nhiều người nhắc lại chưa làm tin thành đúng. Tách điều mình biết chắc với điều mới nghe nói thì mới biết cần kiểm tra gì.",
  },
  show_gratitude: {
    field: "Lời cảm ơn",
    weak: "\"Cảm ơn nhé.\"",
    better: "\"Cảm ơn bạn tuần trước chụp vở gửi mình. Nhờ bạn mà mình không bị hổng bài.\"",
    why: "\"Cảm ơn nhé\" ngắn quá nên người kia không biết mình cảm ơn chuyện gì. Nêu việc cụ thể và việc đó giúp mình thế nào thì lời cảm ơn mới tới được người nghe.",
  },
};

const CASE_SIGN: Record<string, SampleSign> = {
  "Lo trước kiểm tra": "lo-kiem-tra",
  "Sợ sai": "so-sai",
  "Tự ti": "tu-ti",
  "Chán khi bài khó": "chan-bai-kho",
  "Trì hoãn": "tri-hoan",
  "Ngại nhờ giúp": "ngai-nho",
  // TL13–TL57 (mô-đun mới và đợt 2)
  "Bạn bè": "ban-be",
  "Gia đình": "gia-dinh",
};

/**
 * Mô-đun mà mọi chuyện đều xoay quanh bạn bè (5 mô-đun mới): lời học sinh gần như luôn có chữ "bạn", nên đoán theo chữ
 * sẽ luôn ra "ban-be" và luôn ưu tiên cùng một mẫu (ghi chú C2 của bản nháp). Với các mô-đun này: có tình huống mẫu TL
 * thì lấy biểu hiện của tình huống; tự kể thì đoán theo chữ nhưng BỎ "ban-be" (không đoán được thì chỉ xoay vòng mẫu).
 */
export const PEER_TOPIC_SKILLS: readonly SkillId[] = [
  "see_other_side",
  "notice_peer_stress",
  "listen_to_peer",
  "resolve_group_conflict",
  "say_no_to_pressure",
  // đợt 2: chuyện cũng hầu như luôn có chữ "bạn"
  "check_information",
  "show_gratitude",
];

/** Đoán biểu hiện từ lời học sinh (so bằng chữ đã bỏ dấu). Không đoán được thì null. Thứ tự là thứ tự ưu tiên. */
const SIGN_WORDS: [SampleSign, RegExp][] = [
  ["gia-dinh", /\b(bo|me|ba|anh trai|chi gai|em trai|em gai|o nha|gia dinh)\b/],
  ["ban-be", /\b(ban|dua|no|nhom|ca lop|treu|che|buc minh|buc|noi xau|ben canh)\b/],
  ["so-sai", /\b(sai|gio tay|phat bieu|len bang|thuyet trinh|goi ten)\b/],
  ["ngai-nho", /\b(chua hieu|khong hieu|hoi thay|hoi co|nho)\b/],
  ["tri-hoan", /\b(chua bat dau|de mai|dien thoai|luoi|tri hoan|nop)\b/],
  ["chan-bai-kho", /\b(kho qua|khong ra|bai kho|chan)\b/],
  ["lo-kiem-tra", /\b(kiem tra|thi|on bai|de cuong)\b/],
  ["tu-ti", /\b(kem hon|gioi hon|thua|tu ti|cham hon)\b/],
];

export function sampleSignOf(situation: string | null, caseCode: string | null, skill?: SkillId): SampleSign | null {
  if (caseCode) {
    const c = PRACTICE_CASES.find((x) => x.code === caseCode);
    if (c && CASE_SIGN[c.sign]) return CASE_SIGN[c.sign];
  }
  if (!situation) return null;
  const t = ` ${fold(situation)} `;
  const peerTopic = Boolean(skill && PEER_TOPIC_SKILLS.includes(skill));
  for (const [sign, re] of SIGN_WORDS) if (!(peerTopic && sign === "ban-be") && re.test(t)) return sign;
  return null;
}

const SUBJECTS = ["toan", "van", "anh", "sinh", "ly", "vat ly", "hoa", "su", "dia", "tin", "cong nghe", "gdcd", "the duc", "am nhac", "my thuat"];
/** Môn học được nhắc trong câu (chữ đã bỏ dấu). */
export function subjectsIn(text: string): Set<string> {
  const t = ` ${fold(text).replace(/[^a-z0-9]+/g, " ")} `;
  return new Set(SUBJECTS.filter((s) => t.includes(` ${s} `)));
}

/**
 * Mẫu cho một bài luyện: ưu tiên mẫu cùng biểu hiện với chuyện của học sinh, bỏ mẫu trùng môn học với chuyện đó
 * (khác bối cảnh để học sinh không chép), rồi xoay vòng theo `rank` (số bài cùng kỹ năng học sinh đã mở trước bài này)
 * để lần luyện sau gặp mẫu khác. Cùng đầu vào luôn ra cùng mẫu (tải lại trang không đổi mẫu).
 */
export function pickSample(skill: SkillId, o: { situation: string | null; caseCode: string | null; rank: number }): SkillSample {
  const bank = SKILL_SAMPLES[skill];
  const sign = sampleSignOf(o.situation, o.caseCode, skill);
  const mine = o.situation ? subjectsIn(o.situation) : new Set<string>();
  const differentSubject = (s: SkillSample) => ![...subjectsIn(`${s.situation} ${s.lines.map((l) => l.text).join(" ")}`)].some((x) => mine.has(x));
  const pool = bank.filter(differentSubject);
  const usable = pool.length ? pool : bank;
  const ordered = [...usable.filter((s) => s.sign === sign), ...usable.filter((s) => s.sign !== sign)];
  return ordered[Math.abs(o.rank) % ordered.length];
}

/** Ví dụ AI viết có dùng lại chi tiết của học sinh không (trùng môn học, hoặc trùng một cụm 4 chữ liền). */
export function reusesStudentDetails(example: { situation: string; lines: string[] }, studentSituation: string | null): boolean {
  if (!studentSituation) return false;
  const text = `${example.situation} ${example.lines.join(" ")}`;
  const mine = subjectsIn(studentSituation);
  if ([...subjectsIn(text)].some((s) => mine.has(s))) return true;
  const words = fold(studentSituation).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const hay = ` ${fold(text).replace(/[^a-z0-9]+/g, " ")} `;
  for (let i = 0; i + 4 <= words.length; i++) if (hay.includes(` ${words.slice(i, i + 4).join(" ")} `)) return true;
  return false;
}

/** Số dòng mẫu phải bằng số ô của kỹ năng (dùng trong test). */
export const fieldCount = (skill: SkillId) => SKILLS[skill].fields.length;
