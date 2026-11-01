// CÁC MÔ-ĐUN LUYỆN KỸ NĂNG VÀ NGÂN HÀNG TÌNH HUỐNG LUYỆN (Demo 2 bổ sung, kế hoạch Demo 3 Bước 1; khung CASEL 5 từ 01/11)
// Dùng chung cho trang Luyện kỹ năng, bộ điều phối, góp ý của trợ lý và bảng điều khiển.
// File này dùng chung cho máy chủ và trình duyệt (không đọc cơ sở dữ liệu).
//
// Mỗi mô-đun luyện một KỸ NĂNG THÀNH PHẦN (lib/sel/casel.ts, SubskillId); tên hiển thị lấy ở casel.ts.
// Từ 01/11 cả 16 kỹ năng thành phần đều có mô-đun (4 mô-đun Demo 2 + 5 mô-đun mới Duy duyệt 01/11 + 7 mô-đun đợt 2 chờ duyệt).
// Thêm mô-đun cho kỹ năng thành phần khác = mở rộng SubskillId (casel.ts) + thêm một mục vào SKILLS và SKILL_IDS.
// Mã cũ (trước 01/11) chỉ còn ở lib/sel/legacy.ts.
//
// Câu "Hiểu" và "Mẫu" là nội dung soạn sẵn (cô Thúy duyệt), trợ lý AI không viết lại.
// Mẫu luôn ở tình huống KHÁC hoặc là khung có chỗ trống: đó là làm mẫu, không phải làm hộ.
import { subskill, type SubskillId } from "@/lib/sel/casel";

/** Kỹ năng thành phần đã có mô-đun luyện (từ 01/11: cả 16, mỗi nhóm năng lực 3–4 bài). */
export type SkillId =
  | "recognize_feelings_thoughts"
  | "calm_in_the_moment"
  | "plan_step_by_step"
  | "ask_for_help"
  | "see_other_side"
  | "notice_peer_stress"
  | "listen_to_peer"
  | "resolve_group_conflict"
  | "say_no_to_pressure"
  | "know_my_strengths"
  | "growth_mindset"
  | "set_small_goal"
  | "start_when_reluctant"
  | "weigh_consequences"
  | "check_information"
  | "show_gratitude";

export const SKILL_IDS: SkillId[] = [
  "recognize_feelings_thoughts",
  "calm_in_the_moment",
  "plan_step_by_step",
  "ask_for_help",
  "see_other_side",
  "notice_peer_stress",
  "listen_to_peer",
  "resolve_group_conflict",
  "say_no_to_pressure",
  "know_my_strengths",
  "growth_mindset",
  "set_small_goal",
  "start_when_reluctant",
  "weigh_consequences",
  "check_information",
  "show_gratitude",
];
// SkillId phải là tập con của SubskillId: gõ sai id thì lỗi biên dịch ở dòng này.
export const SKILL_SUBSKILLS: readonly SubskillId[] = SKILL_IDS;

export type SkillField = {
  /** khóa lưu trong bài làm */
  key: string;
  /** câu hỏi học sinh thấy ở ô viết */
  label: string;
  placeholder: string;
  /** ô bắt buộc để bài luyện được tính là "Hoàn thành" */
  required: boolean;
};

export type Skill = {
  id: SkillId;
  /** tên kỹ năng thành phần (lấy ở lib/sel/casel.ts) */
  name: string;
  emoji: string;
  /** một dòng mô tả trên thẻ ở trang Luyện kỹ năng */
  tagline: string;
  /** bước H – Hiểu: một câu vì sao cách này giúp được */
  understand: string;
  /** bước M – Mẫu: ví dụ ở tình huống khác, hoặc khung có chỗ trống */
  example: { situation: string; lines: string[] };
  /** bước T – Tự làm: các ô học sinh viết */
  fields: SkillField[];
  /** tiêu chí trợ lý dùng để góp ý; cũng là danh sách cố định khi AI lỗi */
  criteria: string[];
  /** mã kỹ năng thành phần CASEL 2020 của từng tiêu chí (cùng thứ tự với `criteria`) */
  criteriaCodes: string[];
  /** việc nhỏ (mã HD) gốc từ Demo 2 thuộc kỹ năng này */
  actions: string[];
  /**
   * Khung an toàn: chữ giao diện CỐ ĐỊNH (Duy duyệt, viết nhẹ đi 01/11), hiện ở bước Hiểu và Tự thử.
   * KHÔNG bao giờ đưa cho AI hay qua guardReply (chữ này cố ý chạm bộ lọc từ khóa).
   */
  safetyNote?: string;
  /**
   * Ưu tiên của góp ý (noi-dung.json feedbackPriority): khi ô `field` trống (hoặc có cụm `unmetIf`, so chữ đã bỏ dấu) thì
   * ý "fix" PHẢI nói về ô đó trước (phải có một trong các chữ `mustMention`); không thì dùng tiêu chí cố định.
   * `rule` được thêm nguyên văn vào lời dặn góp ý.
   */
  feedbackPriority?: { rule: string; field: string; mustMention: string[]; unmetIf: string[] };
};

export const SKILLS: Record<SkillId, Skill> = {
  recognize_feelings_thoughts: {
    id: "recognize_feelings_thoughts",
    name: subskill("recognize_feelings_thoughts").name,
    emoji: "🔍",
    tagline: "Gọi tên điều mình đang thấy, tách chuyện đã xảy ra với điều mình đang nghĩ",
    understand:
      "Khi gọi được tên điều mình đang thấy và tách được chuyện đã xảy ra với điều mình đang nghĩ, nỗi lo thường nhỏ lại và mình biết nên làm gì tiếp.",
    example: {
      situation: "Một bạn bị cô gọi lên bảng mà làm sai trước lớp.",
      lines: [
        "Chuyện đã xảy ra: mình làm sai câu 2 trên bảng.",
        "Mình thấy: xấu hổ, mặt nóng, về chỗ không muốn nhìn ai.",
        "Mình đang nghĩ: \"cả lớp chắc cười mình\".",
        "Đâu là suy nghĩ: \"cả lớp cười mình\" là điều mình đoán, chưa chắc đã đúng.",
      ],
    },
    fields: [
      { key: "event", label: "Chuyện gì đã xảy ra? (chỉ kể sự việc)", placeholder: "Ví dụ: hôm nay mình được ___ điểm bài ___", required: true },
      { key: "feeling", label: "Lúc đó bạn thấy thế nào? (cảm xúc, cơ thể, việc mình làm)", placeholder: "Ví dụ: buồn, nặng ngực, không muốn mở sách", required: true },
      { key: "thought", label: "Trong đầu bạn đang nghĩ gì?", placeholder: "Ví dụ: mình học dở môn này", required: true },
      { key: "check", label: "Điều bạn nghĩ có chắc là đúng không? Có cách nhìn nào khác không?", placeholder: "Ví dụ: đó là mình đoán, vì ___", required: false },
    ],
    criteria: [
      "Nêu sự việc cụ thể, tách khỏi lời nhận xét về bản thân",
      "Gọi tên được ít nhất 2 loại: cảm xúc, dấu hiệu cơ thể, việc mình làm",
      "Nêu được suy nghĩ đi kèm và nhận ra đó là suy nghĩ, chưa chắc đúng",
    ],
    criteriaCodes: ["SA5", "SA3", "SA5"],
    actions: ["HD01", "HD02", "HD13"],
  },
  calm_in_the_moment: {
    id: "calm_in_the_moment",
    name: subskill("calm_in_the_moment").name,
    emoji: "🌬️",
    tagline: "Nhận ra mình đang thấy gì, chọn một cách ứng phó hợp với lúc đó rồi làm tiếp",
    understand:
      "Khi đang hồi hộp, cơ thể cần vài phút để dịu lại; một cách làm dịu ngắn, làm được ngay tại chỗ giúp đầu óc rõ hơn để bắt đầu việc chính.",
    example: {
      situation: "Một bạn sắp phải thuyết trình trước lớp sau giờ ra chơi.",
      lines: [
        "Mình muốn bình tĩnh để: nói rõ được câu mở đầu.",
        "Cách mình chọn: hít thở hộp, hít vào đếm 4, giữ 4, thở ra 4, làm 4 lần.",
        "Sau đó mình sẽ: đọc thầm câu mở đầu một lần rồi mới đứng lên.",
        "Lần sau mình dùng khi: trước giờ kiểm tra miệng.",
      ],
    },
    fields: [
      { key: "goal", label: "Bạn muốn bình tĩnh lại để làm gì?", placeholder: "Ví dụ: để đọc đề cho rõ", required: true },
      { key: "method", label: "Bạn chọn cách nào, làm thế nào, trong bao lâu?", placeholder: "Ví dụ: ___, làm ___ lần / ___ phút", required: true },
      { key: "next", label: "Bình tĩnh hơn rồi, việc đầu tiên bạn làm là gì?", placeholder: "Ví dụ: đọc lướt cả đề rồi làm câu dễ trước", required: true },
      { key: "fit", label: "Cách này hợp với bạn không? Lần sau bạn dùng lúc nào?", placeholder: "Ví dụ: khá hợp, mình dùng trước giờ ___", required: false },
    ],
    criteria: [
      "Cách làm dịu làm được ngay tại chỗ, không phải né tránh",
      "Nói rõ làm thế nào và bao lâu hoặc mấy lần",
      "Có việc đầu tiên cụ thể sau khi đã bình tĩnh hơn",
    ],
    criteriaCodes: ["SM2", "SM2", "SM1"],
    actions: ["HD07", "HD09", "HD04", "HD22"],
  },
  plan_step_by_step: {
    id: "plan_step_by_step",
    name: subskill("plan_step_by_step").name,
    emoji: "🧩",
    tagline: "Tìm điều mình làm được, nghĩ vài cách, chọn một bước có thời điểm cụ thể",
    understand:
      "Khi có nhiều việc, nghĩ ra vài cách làm rồi chọn trước việc gấp nhất và chia thành bước nhỏ giúp bạn bắt đầu được ngay thay vì lo cả đống.",
    example: {
      situation: "Một bạn có 4 môn cần ôn cho tuần kiểm tra học kỳ, mỗi tối có khoảng 2 tiếng.",
      lines: [
        "Hai cách có thể làm: (1) ___ (ví dụ: mỗi tối ôn đều 2 môn), (2) ___ (ví dụ: ôn môn thi sớm trước, môn thi sau để cuối tuần).",
        "Việc làm trước: ___ vì ___ (ví dụ: môn thi sớm nhất, nên chọn cách 2).",
        "Bước đầu: ___ (ví dụ: làm lại 3 bài trong đề cương), bắt đầu lúc ___.",
        "Nếu không kịp: để ___ sang ___, hoặc báo ___.",
      ],
    },
    fields: [
      { key: "tasks", label: "Bạn có những việc gì, và có bao nhiêu thời gian?", placeholder: "Ví dụ: Toán nộp mai, Sử kiểm tra thứ Tư… tối nay có 1 tiếng", required: true },
      // P0 (phản biện 31/10): gỡ rối từng bước phải có HAI PHƯƠNG ÁN, nghĩ ít nhất hai cách rồi mới chọn thứ tự.
      // Bài lưu trước khi có ô này (chỉ có ở máy thử, trang Luyện kỹ năng chưa triển khai lên web): vẫn đọc được
      // (ô hiện "bỏ trống"); bài đã Hoàn thành giữ nguyên; bài chưa xong thì viết thêm ô này ở lần 2 mới xác nhận xong được.
      { key: "options", label: "Bạn có thể làm theo những cách nào? (ít nhất hai cách)", placeholder: "Ví dụ: Cách 1: ___. Cách 2: ___", required: true },
      { key: "order", label: "Bạn làm việc nào trước, vì sao?", placeholder: "Ví dụ: ___ trước vì ___", required: true },
      { key: "first", label: "Bước đầu tiên của việc đó là gì, bắt đầu lúc nào?", placeholder: "Ví dụ: làm ___ lúc ___", required: true },
      { key: "backup", label: "Nếu không kịp thì bạn sẽ làm gì?", placeholder: "Ví dụ: dời ___ sang ___ / báo ___", required: false },
    ],
    criteria: [
      "Nghĩ ra ít nhất hai cách làm khác nhau rồi mới chọn một cách",
      "Có thứ tự việc, có lý do, tính tới thời gian có",
      "Bước đầu cụ thể, đủ nhỏ, có lúc bắt đầu",
      "Có phương án khi không kịp: bỏ bớt hay dời việc nào, hoặc báo ai",
    ],
    criteriaCodes: ["RD3", "RD4", "SM5", "RD4"],
    actions: ["HD03", "HD11", "HD12", "HD27"],
  },
  ask_for_help: {
    id: "ask_for_help",
    name: subskill("ask_for_help").name,
    emoji: "🙋",
    tagline: "Nói rõ mình cần gì, chọn người phù hợp, chuẩn bị lời mở đầu",
    understand:
      "Câu hỏi càng rõ chỗ vướng, thầy cô càng giúp đúng và nhanh, và bạn cũng đỡ ngại hơn khi hỏi.",
    example: {
      situation: "Một bạn chưa hiểu cách đặt tính chia số thập phân ở bài tập Toán.",
      lines: [
        "Mình vướng ở: ___ (ví dụ: bước dời dấu phẩy).",
        "Mình đã thử: ___ (ví dụ: xem lại ví dụ trong sách nhưng vẫn ra sai).",
        "Mình nhờ: ___ (ví dụ: cô dạy Toán), lúc ___ (ví dụ: giờ ra chơi), cách ___ (hỏi riêng / nhắn tin).",
        "Lời nhờ: \"Em chưa hiểu ___. Em đã thử ___. Cô giảng lại giúp em ___ được không ạ?\"",
      ],
    },
    fields: [
      { key: "stuck", label: "Bạn đang vướng ở chỗ nào? Bạn đã thử gì?", placeholder: "Ví dụ: em chưa hiểu ___, em đã thử ___", required: true },
      { key: "who", label: "Bạn nhờ ai, lúc nào, bằng cách nào?", placeholder: "Ví dụ: cô ___, giờ ra chơi, hỏi riêng", required: true },
      { key: "request", label: "Viết lời nhờ của bạn (2–4 câu)", placeholder: "Em chưa hiểu ___. Em đã thử ___. Thầy/cô giúp em ___ được không ạ?", required: true },
    ],
    criteria: [
      "Nêu đúng điều chưa hiểu và việc đã thử",
      "Chọn người giúp được, có cách hoặc lúc hỏi hợp với mình",
      "Lời nhờ nói rõ muốn được giúp gì",
    ],
    criteriaCodes: ["RS1", "RS8", "RS1"],
    actions: ["HD05", "HD28"],
  },
  // ───── 5 mô-đun mới (Duy duyệt 01/11; nội dung nguyên văn: ho-so-du-thi/2-xay-dung/bai-luyen-moi/noi-dung.json) ─────
  see_other_side: {
    id: "see_other_side",
    name: subskill("see_other_side").name,
    emoji: "👀",
    tagline: "Nghĩ thêm một cách hiểu trước khi kết luận, rồi hỏi lại cho chắc",
    understand:
      "Khi đang lo bài vở, mình dễ đoán là người khác cố tình làm khó mình. Nghĩ thêm một cách hiểu rồi hỏi lại giúp bạn bớt bực, tránh giận nhầm và giữ được tình bạn.",
    example: {
      situation: "Một bạn thấy bạn thân đi ăn sáng ở căng tin với nhóm khác mà không rủ mình.",
      lines: [
        "Chuyện xảy ra: Sáng thứ Hai, bạn thân đi ăn sáng ở căng tin với mấy bạn lớp bên, không rủ mình.",
        "Các cách hiểu: Có thể bạn ấy gặp các bạn kia ở cổng nên đi luôn. Cũng có thể bạn ấy nghĩ mình đã ăn ở nhà rồi.",
        "Điều mình chưa biết: Mình chưa biết bạn ấy có tìm mình trước đó không.",
        "Câu hỏi để kiểm tra: \"Sáng nay mình tìm bạn mà không thấy. Bạn có bận gì không? Mai mình đi ăn cùng nhé?\"",
      ],
    },
    fields: [
      { key: "event", label: "Người kia đã làm gì hoặc nói gì? (chỉ kể điều bạn thấy, nghe)", placeholder: "Ví dụ: bạn ___ chưa gửi phần ___ dù đã hẹn tối qua", required: true },
      { key: "guesses", label: "Người đó có thể đang nghĩ hay cảm thấy gì? (ít nhất 2 khả năng khác nhau)", placeholder: "Ví dụ: Có thể ___. Cũng có thể ___", required: true },
      { key: "unknown", label: "Điều gì bạn chưa biết chắc về chuyện này?", placeholder: "Ví dụ: mình chưa biết hôm qua bạn ấy có bận gì không", required: false },
      { key: "question", label: "Bạn sẽ hỏi người đó câu gì để hiểu đúng hơn?", placeholder: "Ví dụ: Mình thấy ___, có chuyện gì không?", required: true },
    ],
    criteria: [
      "Kể đúng việc người kia làm hoặc nói, chưa gán ý xấu cho họ",
      "Nêu ít nhất 2 cách hiểu khác nhau, có một cách không trách người kia",
      "Nhận ra điều mình chưa biết chắc, chưa vội kết luận",
      "Có một câu hỏi nhẹ nhàng hỏi thẳng người kia, không buộc tội, có để ý tới cảm xúc hay hoàn cảnh của họ",
    ],
    criteriaCodes: ["SO1", "SO1", "SO1", "SO4"],
    actions: [],
  },
  notice_peer_stress: {
    id: "notice_peer_stress",
    name: subskill("notice_peer_stress").name,
    emoji: "💛",
    tagline: "Để ý khi bạn khác mọi ngày, hỏi han nhẹ nhàng, biết lúc cần nói với người lớn",
    understand:
      "Mùa kiểm tra, nhiều bạn cũng đang áp lực mà không nói ra. Một câu hỏi han đúng lúc giúp bạn ấy thấy có người để ý; còn chuyện nặng thì người lớn mới là người giúp được.",
    example: {
      situation: "Một bạn thấy bạn cùng bàn lật đề cương liên tục trước giờ kiểm tra Hóa và nói \"mình quên hết rồi\".",
      lines: [
        "Dấu hiệu mình thấy: Bạn ấy lật đề cương liên tục, cắn bút, nói \"mình quên hết rồi\", không ăn sáng như mọi hôm.",
        "Câu hỏi han: \"Mình thấy bạn đang lo bài Hóa. Bạn muốn nói chút không, hay ngồi yên một lúc?\"",
        "Việc nhỏ giúp được: Rủ bạn ấy thở chậm cùng mình 4 nhịp, rồi hỏi nhau 3 câu dễ trong đề cương.",
        "Khi nào nhờ người lớn: Nếu lần kiểm tra nào bạn ấy cũng lo đến mức không làm được bài, mình sẽ rủ bạn ấy nói với cô chủ nhiệm hoặc phòng tham vấn.",
      ],
    },
    fields: [
      { key: "signs", label: "Bạn thấy bạn ấy khác mọi ngày ở điểm nào? (lời nói, việc làm, nét mặt)", placeholder: "Ví dụ: cả buổi không nói, giờ ra chơi ngồi một mình", required: true },
      { key: "checkIn", label: "Bạn sẽ nói câu hỏi han nào với bạn ấy?", placeholder: "Ví dụ: Mình thấy hôm nay bạn ___. Bạn ổn không?", required: true },
      { key: "help", label: "Một việc nhỏ bạn có thể làm cùng bạn ấy là gì?", placeholder: "Ví dụ: ngồi cùng giờ ra chơi, rủ ôn chung ___", required: false },
      { key: "adult", label: "Khi nào bạn sẽ nói với người lớn, và nói với ai?", placeholder: "Ví dụ: nếu bạn ấy buồn nhiều ngày, hoặc nói điều làm mình lo, mình sẽ nói với ___", required: true },
    ],
    criteria: [
      "Nêu dấu hiệu cụ thể thấy hoặc nghe được (lời nói, việc làm, nét mặt), không đoán bệnh, không gán nhãn",
      "Câu hỏi han ngắn, nhẹ nhàng, nói điều mình để ý và để bạn tự chọn kể hay không, không xem nhẹ",
      "Việc giúp nhỏ, làm được ngay, đi cùng bạn chứ không hứa giữ bí mật hay gánh thay",
      "Biết lúc cần nói với người lớn và gọi được một người lớn cụ thể (thầy cô chủ nhiệm, phòng tham vấn, bố mẹ)",
    ],
    criteriaCodes: ["SO3", "SO4", "RS8", "RS8"],
    actions: [],
    safetyNote:
      "Có những chuyện bạn không cần giữ bí mật, dù bạn ấy nhờ: khi bạn ấy nói điều làm bạn lo cho sự an toàn của bạn ấy, hoặc kể bị ai đó làm tổn thương. Lúc đó, hãy kể với một người lớn bạn tin: thầy cô chủ nhiệm, phòng tham vấn của trường hoặc bố mẹ. Bạn không phải tự mình lo hết. Kể với người lớn là đang giúp bạn ấy. Bạn cũng có thể bấm \"Cần giúp\" để hẹn nói chuyện với thầy cô.",
    feedbackPriority: {
      rule: "Nếu ô \"Khi nào nhờ người lớn\" trống, ghi \"không cần\", hay hứa giữ bí mật, ý \"fix\" PHẢI nói về ô này trước mọi tiêu chí khác.",
      field: "adult",
      mustMention: ["người lớn", "thầy", "cô", "bố mẹ", "ba mẹ", "phòng tham vấn"],
      unmetIf: ["khong can", "giu bi mat", "khong noi voi ai", "khong ke voi ai"],
    },
  },
  listen_to_peer: {
    id: "listen_to_peer",
    name: subskill("listen_to_peer").name,
    emoji: "👂",
    tagline: "Nghe hết, nhắc lại ý bạn, hỏi để bạn kể tiếp, chưa vội khuyên",
    understand:
      "Khi đang áp lực, điều bạn mình cần trước tiên thường là có người nghe hết, chưa phải lời khuyên. Được nghe và được hiểu, bạn ấy bình tĩnh hơn để tự nghĩ cách.",
    example: {
      situation: "Một bạn kể sắp thi chọn đội tuyển Tiếng Anh, tối nào cũng khó ngủ.",
      lines: [
        "Câu mở lời: \"Mình đang nghe đây. Bạn cứ kể, mình không vội đâu.\"",
        "Câu nhắc lại: \"Tức là còn một tuần nữa thi, tối nào bạn cũng nằm mãi không ngủ được, nên bạn vừa lo vừa mệt, đúng không?\"",
        "Câu hỏi mở: \"Lúc nằm không ngủ được, bạn hay nghĩ tới điều gì nhất?\"",
        "Điều mình tránh nói: Tránh nói \"Lo gì, bạn giỏi thế cơ mà\" vì nghe như mình gạt đi nỗi lo của bạn ấy.",
      ],
    },
    fields: [
      { key: "opener", label: "Bạn sẽ mở lời thế nào để bạn ấy thấy bạn đang sẵn sàng nghe?", placeholder: "Ví dụ: Mình đang nghe đây, bạn cứ kể ___", required: true },
      { key: "reflect", label: "Nhắc lại điều bạn ấy kể và cảm xúc của bạn ấy, bằng lời của bạn", placeholder: "Ví dụ: Tức là ___, nên bạn thấy ___, đúng không?", required: true },
      { key: "openQuestion", label: "Viết một câu hỏi mở để bạn ấy kể thêm (không trả lời được bằng có hay không)", placeholder: "Ví dụ: Lúc đó bạn nghĩ gì? / Điều gì làm bạn thấy nặng nhất?", required: true },
      { key: "avoid", label: "Câu nào bạn sẽ tránh nói, vì sao?", placeholder: "Ví dụ: tránh nói \"___\" vì nghe như mình xem nhẹ chuyện của bạn ấy", required: false },
    ],
    criteria: [
      "Mở lời ngắn cho bạn thấy mình sẵn sàng nghe, không vội khuyên hay kể chuyện của mình",
      "Nhắc lại được ý chính và cảm xúc của bạn bằng lời của mình",
      "Có câu hỏi mở để bạn kể tiếp, không trả lời bằng có hay không",
      "Tránh lời phán xét, so sánh hay xem nhẹ chuyện của bạn",
    ],
    criteriaCodes: ["RS1", "RS1", "RS1", "SO3"],
    actions: [],
    safetyNote:
      "Lắng nghe không có nghĩa là phải giữ mọi bí mật. Nếu bạn của bạn nói điều làm bạn lo cho sự an toàn của bạn ấy, hãy kể với thầy cô chủ nhiệm, phòng tham vấn của trường hoặc bố mẹ. Bạn không phải tự mình lo hết.",
  },
  resolve_group_conflict: {
    id: "resolve_group_conflict",
    name: subskill("resolve_group_conflict").name,
    emoji: "🤝",
    tagline: "Nói điều mình thấy và muốn, cùng tìm cách cả nhóm đều làm được",
    understand:
      "Làm nhóm mà cãi nhau thì cả nhóm chậm và ai cũng mệt, nhất là khi sắp đến hạn nộp. Nói rõ mình thấy gì, muốn gì rồi cùng tìm cách chung giúp nhóm làm tiếp mà không ai bị bỏ lại.",
    example: {
      situation: "Một bạn trong nhóm làm báo tường muốn vẽ tay, còn bạn khác muốn in ảnh màu cho nhanh.",
      lines: [
        "Chuyện bất đồng: Mình muốn vẽ tay báo tường cho có dấu ấn của lớp; một bạn trong nhóm muốn in ảnh màu cho nhanh và đẹp.",
        "Câu Mình thấy… mình muốn…: \"Mình thấy hơi tiếc vì báo in thì lớp nào cũng giống nhau. Mình muốn có ít nhất một phần do lớp mình tự vẽ.\"",
        "Hai cách chung: Cách 1: in ảnh làm nền, vẽ tay tiêu đề và khung. Cách 2: chia đôi tờ báo, một nửa in, một nửa vẽ.",
        "Cách chốt: Cả nhóm giơ tay chọn một cách; bạn kia in ảnh trước thứ Tư, mình vẽ tiêu đề tối thứ Tư.",
      ],
    },
    fields: [
      { key: "issue", label: "Nhóm đang bất đồng chuyện gì? Mỗi bên muốn gì?", placeholder: "Ví dụ: mình muốn ___, còn bạn ___ muốn ___", required: true },
      { key: "iStatement", label: "Viết câu bạn sẽ nói: Mình thấy… vì… Mình muốn…", placeholder: "Mình thấy ___ vì ___. Mình muốn ___.", required: true },
      { key: "options", label: "Hai cách cả nhóm có thể cùng làm là gì?", placeholder: "Cách 1: ___. Cách 2: ___", required: true },
      { key: "agree", label: "Nhóm sẽ chốt thế nào, ai làm gì tiếp theo?", placeholder: "Ví dụ: cả nhóm giơ tay chọn / thử cách 1 trước; ___ làm ___ trước ___", required: false },
    ],
    criteria: [
      "Kể đúng chuyện bất đồng và nêu được ý muốn của cả hai bên, không chê người kia",
      "Câu nói có cảm xúc, lý do và một đề nghị cụ thể; nói về mình, không đổ lỗi",
      "Đưa ra ít nhất 2 cách chung, mỗi cách tính tới mong muốn của cả hai bên",
      "Có cách chốt công bằng và bước tiếp theo rõ: ai làm gì, khi nào",
    ],
    criteriaCodes: ["RS5", "RS5", "RS4", "RS4"],
    actions: [],
  },
  say_no_to_pressure: {
    id: "say_no_to_pressure",
    name: subskill("say_no_to_pressure").name,
    emoji: "✋",
    tagline: "Từ chối rõ ràng mà vẫn giữ tình bạn, kèm một đề nghị khác",
    understand:
      "Lời rủ của bạn bè dễ làm mình khó nói \"không\", nhất là khi đang mệt vì học. Nghĩ trước hệ quả và chuẩn bị sẵn một câu từ chối giúp bạn giữ được việc học mà vẫn giữ được bạn.",
    example: {
      situation: "Một bạn được bạn thân nhắn xin ảnh chụp bài tập về nhà để chép nộp vì chưa làm.",
      lines: [
        "Lời rủ: 10 giờ tối, bạn thân nhắn xin ảnh chụp bài tập Lý của mình để chép, sáng mai nộp.",
        "Hệ quả nếu đồng ý: Nếu cô thấy hai bài giống nhau, cả hai bị trừ điểm; bạn ấy vẫn chưa hiểu bài cho bài kiểm tra sắp tới.",
        "Câu từ chối: \"Không, bài này mình không gửi đâu. Mình không muốn hai đứa bị trừ điểm.\"",
        "Đề xuất khác: \"Sáng mai đến sớm 15 phút, mình giảng cho bạn câu khó nhất nhé.\"",
      ],
    },
    fields: [
      { key: "invite", label: "Bạn được rủ làm gì? Ai rủ, lúc nào?", placeholder: "Ví dụ: bạn ngồi cạnh rủ ___ trong giờ ___", required: true },
      { key: "consequence", label: "Nếu đồng ý, chuyện gì có thể xảy ra với bạn và với người khác?", placeholder: "Ví dụ: mình có thể bị ___; bạn ấy thì ___", required: true },
      { key: "refusal", label: "Viết câu từ chối của bạn (rõ ràng, không chê bạn)", placeholder: "Ví dụ: Không, mình không ___ đâu.", required: true },
      { key: "alternative", label: "Bạn đề nghị cách khác nào?", placeholder: "Ví dụ: Hay là mình ___ cùng nhau ___", required: true },
    ],
    criteria: [
      "Nêu được hệ quả cụ thể cho mình và cho người khác nếu đồng ý",
      "Câu từ chối rõ ràng, có \"không\" hoặc ý không, không vòng vo",
      "Giữ được tình bạn: không chê, không giảng đạo lý cho bạn",
      "Có một đề xuất khác làm được thay cho lời rủ",
    ],
    criteriaCodes: ["RD4", "RS6", "RS6", "RS6"],
    actions: [],
    safetyNote:
      "Nếu bị ép, bị đe dọa hoặc bị rủ làm điều có thể gây nguy hiểm, hãy kể ngay với thầy cô chủ nhiệm, phòng tham vấn của trường hoặc bố mẹ. Đó không phải chuyện bạn phải tự mình giải quyết.",
  },
  // ───── đợt 2 (01/11): 7 mô-đun để mỗi nhóm năng lực có 3–4 bài (Duy yêu cầu); nội dung chờ Duy và cô Thúy duyệt,
  // bản để duyệt: ho-so-du-thi/2-xay-dung/bai-luyen-moi/noi-dung-dot-2.json (tạo từ chính file này) ─────
  know_my_strengths: {
    id: "know_my_strengths",
    name: subskill("know_my_strengths").name,
    emoji: "🌟",
    tagline: "Tìm điểm mạnh từ việc mình đã làm được, rồi dùng nó cho việc đang khó",
    understand:
      "Khi đang thấy mình kém, mình dễ quên những gì mình đã làm được. Nhìn lại một việc đã làm tốt và gọi tên điểm mạnh giúp bạn có chỗ dựa để bắt đầu việc khó tiếp theo.",
    example: {
      situation: "Một bạn được chọn vẽ minh họa cho báo tường nhưng thấy mình học kém hơn các bạn trong nhóm.",
      lines: [
        "Việc mình đã làm được: Tháng trước mình vẽ xong tranh minh họa cho báo tường dù phải vẽ lại phần nền ba lần.",
        "Điểm mạnh: Mình kiên trì, vẽ hỏng thì sửa tiếp chứ không bỏ.",
        "Bằng chứng: Ba tối liền mình ngồi sửa phần nền, đến khi cả nhóm đều thấy được.",
        "Dùng cho việc khó: Bài hình học làm chưa ra, mình sẽ thử lại theo cách khác ba lần trước khi hỏi bạn.",
      ],
    },
    fields: [
      { key: "done", label: "Kể một việc gần đây bạn đã làm được (dù nhỏ)", placeholder: "Ví dụ: tuần trước mình ___ dù lúc đầu thấy ___", required: true },
      { key: "strength", label: "Điểm mạnh nào của bạn đã giúp bạn làm được việc đó?", placeholder: "Ví dụ: mình kiên trì / cẩn thận / biết hỏi khi chưa hiểu", required: true },
      { key: "evidence", label: "Điều gì cho thấy bạn có điểm mạnh đó? (một việc cụ thể)", placeholder: "Ví dụ: mình đã ___ ___ lần mới xong", required: true },
      { key: "use", label: "Bạn sẽ dùng điểm mạnh đó cho việc nào đang khó, dùng thế nào?", placeholder: "Ví dụ: với bài ___, mình sẽ ___", required: true },
    ],
    criteria: [
      "Kể một việc cụ thể mình đã làm được, không chỉ nói chung chung \"mình cũng được\"",
      "Gọi tên được một điểm mạnh là một cách làm hay thói quen, không phải lời khen chung",
      "Có bằng chứng: một việc cụ thể cho thấy mình có điểm mạnh đó",
      "Chọn được một việc đang khó và nói rõ sẽ dùng điểm mạnh đó thế nào",
    ],
    criteriaCodes: ["SA7", "SA2", "SA2", "SA7"],
    actions: [],
  },
  growth_mindset: {
    id: "growth_mindset",
    name: subskill("growth_mindset").name,
    emoji: "🌱",
    tagline: "Đổi \"mình không thể\" thành \"mình chưa… nhưng nếu…\" rồi thử một cách khác",
    understand:
      "Kết quả hôm nay chưa nói hết về mình. Khi coi cái khó là chỗ mình chưa làm được, bạn sẽ tìm cách học khác thay vì bỏ cuộc, và dễ thấy mình tiến bộ hơn.",
    example: {
      situation: "Một bạn tập đá cầu mãi không tâng được quá 3 quả, nói \"mình vụng, không chơi được\".",
      lines: [
        "Câu mình đang nghĩ: \"Mình vụng, mình không bao giờ chơi được đá cầu.\"",
        "Viết lại: \"Mình chưa tâng được quá 3 quả, nhưng nếu tập đều thì có thể tâng được nhiều hơn.\"",
        "Cách khác: Thay vì cố tâng thật nhiều, mỗi ngày mình tập 10 phút và đếm số lần tâng liên tiếp.",
        "Mốc tiến bộ: Sau 2 tuần, mình xem số lần tâng liên tiếp có nhiều hơn 3 quả không.",
      ],
    },
    fields: [
      { key: "fixed", label: "Câu \"mình không thể\" bạn đang nghĩ là gì?", placeholder: "Ví dụ: mình không bao giờ giỏi được môn ___", required: true },
      { key: "notYet", label: "Viết lại câu đó theo kiểu \"mình chưa… nhưng nếu…\"", placeholder: "Ví dụ: mình chưa ___, nhưng nếu ___ thì có thể ___", required: true },
      { key: "strategy", label: "Lần này bạn sẽ thử cách học khác nào?", placeholder: "Ví dụ: thay vì ___, mình sẽ ___", required: true },
      { key: "checkpoint", label: "Bao giờ và bằng cách nào bạn biết mình tiến bộ?", placeholder: "Ví dụ: sau ___ ngày, mình làm lại ___ và xem ___", required: false },
    ],
    criteria: [
      "Viết đúng câu tự phán xét đang nghĩ và nhận ra đó là suy nghĩ, chưa phải sự thật",
      "Câu viết lại có \"chưa\" hoặc ý đang trên đường học, không phủ nhận cái khó",
      "Có một cách học khác cụ thể, không chỉ \"cố gắng hơn\"",
      "Có mốc để tự thấy tiến bộ, so với chính mình trước đây, không so với bạn khác",
    ],
    criteriaCodes: ["SA8", "SA8", "SA7", "SA8"],
    actions: [],
  },
  set_small_goal: {
    id: "set_small_goal",
    name: subskill("set_small_goal").name,
    emoji: "🎯",
    tagline: "Biến điều mình muốn thành một mục tiêu nhỏ, rõ, có cách theo dõi",
    understand:
      "Mục tiêu lớn như \"học giỏi hơn\" khó biết bắt đầu từ đâu. Một mục tiêu nhỏ, đo được, có hạn giúp bạn biết hôm nay làm gì và thấy rõ mình đã đi được bao xa.",
    example: {
      situation: "Một bạn muốn đọc sách nhiều hơn nhưng tháng nào cũng để dở cuốn đang đọc.",
      lines: [
        "Điều mình muốn: Mình muốn đọc hết một cuốn truyện thay vì để dở.",
        "Mục tiêu nhỏ: Trong 2 tuần, mỗi tối mình đọc 10 trang cuốn truyện đang đọc.",
        "Mỗi ngày: Lúc 9 giờ 30 tối, trước khi ngủ, mình đọc 10 trang và để điện thoại ngoài bàn học.",
        "Theo dõi: Mỗi tối đánh dấu vào tờ lịch dán ở bàn; lỡ một hôm thì hôm sau vẫn đọc 10 trang, không đọc bù gấp đôi.",
      ],
    },
    fields: [
      { key: "wish", label: "Bạn muốn điều gì thay đổi trong việc học?", placeholder: "Ví dụ: mình muốn bớt sợ môn ___", required: true },
      { key: "goal", label: "Viết thành một mục tiêu nhỏ: làm gì, bao nhiêu, đến khi nào", placeholder: "Ví dụ: trong 2 tuần, mỗi ngày mình ___", required: true },
      { key: "daily", label: "Mỗi ngày bạn làm việc gì, lúc nào?", placeholder: "Ví dụ: sau bữa tối, mình ___ trong ___ phút", required: true },
      { key: "track", label: "Bạn theo dõi thế nào, và nếu lỡ một ngày thì làm gì?", placeholder: "Ví dụ: đánh dấu vào lịch; lỡ một hôm thì hôm sau ___", required: false },
    ],
    criteria: [
      "Mục tiêu nói rõ làm gì, bao nhiêu và đến khi nào",
      "Mục tiêu đủ nhỏ để làm được với thời gian thật mình có",
      "Có việc làm mỗi ngày cụ thể, có lúc làm",
      "Có cách tự theo dõi và biết làm gì khi lỡ một ngày, không bỏ hẳn",
    ],
    criteriaCodes: ["SM4", "SM4", "SM5", "SM3"],
    actions: [],
  },
  start_when_reluctant: {
    id: "start_when_reluctant",
    name: subskill("start_when_reluctant").name,
    emoji: "🚀",
    tagline: "Chọn một bước khởi động thật nhỏ, để xa chỗ xao nhãng, bắt tay vào trong 5 phút",
    understand:
      "Việc càng ngại thì càng dễ để đến mai. Phần khó nhất thường là mấy phút đầu: một bước khởi động thật nhỏ và để xa thứ gây xao nhãng giúp bạn bắt tay vào được, rồi làm tiếp sẽ dễ hơn.",
    example: {
      situation: "Một bạn phải viết bài thu hoạch sau buổi tham quan bảo tàng nhưng cứ để đến mai.",
      lines: [
        "Việc đang ngại: Bài thu hoạch 2 trang; mình ngại vì không biết mở đầu thế nào.",
        "Bước khởi động: Chỉ ghi ra 3 thứ mình nhớ nhất ở bảo tàng, chưa cần viết thành câu.",
        "Chỗ xao nhãng: Để điện thoại ở phòng khách cho đến khi ghi xong 3 ý.",
        "Phần thưởng: Ghi xong 3 ý thì nghỉ 5 phút ăn hoa quả, rồi viết tiếp đoạn đầu.",
      ],
    },
    fields: [
      { key: "task", label: "Bạn đang ngại việc gì? Vì sao ngại?", placeholder: "Ví dụ: bài ___, vì thấy dài / khó / chán", required: true },
      { key: "starter", label: "Bước khởi động thật nhỏ, làm được trong 5 phút là gì?", placeholder: "Ví dụ: chỉ mở vở và chép đề câu 1", required: true },
      { key: "distraction", label: "Thứ gì hay kéo bạn đi, bạn sẽ để nó ở đâu?", placeholder: "Ví dụ: điện thoại, để ở ___ trong lúc làm", required: true },
      { key: "reward", label: "Làm xong phần đầu, bạn tự thưởng điều gì nhỏ?", placeholder: "Ví dụ: nghỉ 5 phút, uống cốc nước ___", required: false },
    ],
    criteria: [
      "Nói rõ việc đang ngại và lý do ngại (dài, khó hay chán)",
      "Bước khởi động đủ nhỏ để làm ngay trong vài phút, là việc làm thật chứ không phải \"cố lên\"",
      "Có cách cụ thể để tránh một thứ gây xao nhãng",
      "Phần thưởng nhỏ, đến sau khi làm, rồi quay lại làm tiếp",
    ],
    criteriaCodes: ["SM1", "SM3", "SM3", "SM3"],
    actions: [],
  },
  weigh_consequences: {
    id: "weigh_consequences",
    name: subskill("weigh_consequences").name,
    emoji: "⚖️",
    tagline: "Nghĩ trước chuyện gì sẽ xảy ra với mình và người khác, rồi mới chọn",
    understand:
      "Lúc đang vội hay đang bực, mình dễ chọn cách nhanh nhất trước mắt. Dừng lại nghĩ xem mỗi cách sẽ dẫn tới đâu, cho mình và cho người khác, giúp bạn chọn được cách mà sau này không phải tiếc.",
    example: {
      situation: "Một bạn được rủ đi xem phim tối thứ Bảy, nhưng sáng Chủ nhật có buổi học thêm mà bài tập chưa làm.",
      lines: [
        "Phải chọn: Tối thứ Bảy đi xem phim với bạn, hay ở nhà làm bài tập cho buổi học thêm.",
        "Các lựa chọn: Cách 1: đi xem phim, về làm bài đến khuya. Cách 2: làm bài chiều thứ Bảy rồi tối đi xem phim. Cách 3: ở nhà, hẹn bạn tuần sau.",
        "Hậu quả: Cách 1 thì sáng mai mình buồn ngủ, bài làm vội. Cách 2 thì phải bỏ buổi đá bóng chiều nhưng tối vẫn vui với bạn. Cách 3 thì bạn có thể hơi buồn.",
        "Mình chọn: Cách 2, vì vẫn đi chơi được mà không phải thức khuya hay làm bài vội.",
      ],
    },
    fields: [
      { key: "decision", label: "Bạn đang phải chọn chuyện gì?", placeholder: "Ví dụ: tối nay nên ___ hay ___", required: true },
      { key: "options", label: "Bạn có những lựa chọn nào? (ít nhất hai)", placeholder: "Ví dụ: Cách 1: ___. Cách 2: ___", required: true },
      { key: "consequences", label: "Mỗi lựa chọn có thể dẫn tới điều gì, với bạn và với người khác?", placeholder: "Ví dụ: Cách 1 thì mình ___, còn ___ thì ___. Cách 2 thì ___", required: true },
      { key: "choice", label: "Bạn chọn cách nào, vì sao?", placeholder: "Ví dụ: mình chọn cách ___ vì ___", required: true },
    ],
    criteria: [
      "Nêu ít nhất hai lựa chọn khác nhau thật sự",
      "Đoán được hậu quả của từng lựa chọn, cả lúc này lẫn về sau",
      "Tính tới ảnh hưởng tới người khác, không chỉ tới mình",
      "Chọn một cách và nói được lý do dựa trên hậu quả đã nghĩ",
    ],
    criteriaCodes: ["RD3", "RD4", "RD7", "RD4"],
    actions: [],
  },
  check_information: {
    id: "check_information",
    name: subskill("check_information").name,
    emoji: "📰",
    tagline: "Tách điều biết chắc với điều mới nghe nói, kiểm tra rồi mới tin và chia sẻ",
    understand:
      "Tin nhắn trong nhóm lớp lan rất nhanh, kể cả tin chưa đúng. Tách điều mình biết chắc với điều mới nghe nói và hỏi lại người đáng tin giúp bạn không lo vô cớ, và không làm ai bị hiểu lầm vì tin sai.",
    example: {
      situation: "Một bạn đọc được trong nhóm chat lớp tin \"mai được nghỉ học vì trường mất điện\".",
      lines: [
        "Thông tin: Tối qua có người nhắn trong nhóm chat lớp \"mai nghỉ học vì trường mất điện\", không ghi ai báo.",
        "Biết chắc và nghe nói: Biết chắc: có tin nhắn đó trong nhóm. Mới nghe nói: trường mất điện và cả lớp được nghỉ.",
        "Cách kiểm tra: Xem nhóm phụ huynh có thông báo của cô chủ nhiệm không, hoặc nhờ mẹ hỏi cô.",
        "Chia sẻ không: Chưa chia sẻ tiếp, vì nếu tin sai thì các bạn nghỉ học mà không biết.",
      ],
    },
    fields: [
      { key: "info", label: "Bạn nghe hoặc đọc được thông tin gì, từ đâu?", placeholder: "Ví dụ: trong nhóm lớp có người nhắn ___", required: true },
      { key: "known", label: "Điều gì bạn biết chắc, điều gì mới chỉ là nghe nói?", placeholder: "Ví dụ: Biết chắc: ___. Mới nghe nói: ___", required: true },
      { key: "check", label: "Bạn kiểm tra thế nào: hỏi ai, hoặc xem ở đâu?", placeholder: "Ví dụ: hỏi cô chủ nhiệm / xem thông báo của trường", required: true },
      { key: "share", label: "Bạn có chia sẻ tiếp không? Vì sao?", placeholder: "Ví dụ: chưa chia sẻ vì ___", required: true },
    ],
    criteria: [
      "Nêu rõ thông tin và nơi mình nghe hoặc đọc được",
      "Tách được điều biết chắc với điều chỉ là nghe nói hay đoán",
      "Có một cách kiểm tra cụ thể từ người hay nguồn đáng tin",
      "Quyết định chia sẻ hay không có lý do, có nghĩ tới người được nhắc tới trong tin",
    ],
    criteriaCodes: ["RD2", "RD2", "RD5", "RD7"],
    actions: [],
  },
  show_gratitude: {
    id: "show_gratitude",
    name: subskill("show_gratitude").name,
    emoji: "🙏",
    tagline: "Để ý điều tốt người khác làm cho mình, cảm ơn cụ thể",
    understand:
      "Lúc áp lực, mình dễ chỉ thấy cái chưa được. Để ý điều tốt người khác đã làm và cảm ơn cụ thể giúp bạn thấy mình không một mình, và làm mối quan hệ với bạn bè, thầy cô, gia đình gần hơn.",
    example: {
      situation: "Một bạn được bạn cùng bàn chụp vở ghi bài gửi cho trong tuần bị ốm phải nghỉ học.",
      lines: [
        "Ai, việc gì: Tuần trước mình ốm nghỉ 3 ngày, bạn cùng bàn tối nào cũng chụp vở ghi bài gửi cho mình.",
        "Ý nghĩa: Nhờ vậy mình theo kịp bài, không bị hổng; mình thấy được quan tâm.",
        "Lời cảm ơn: \"Cảm ơn bạn tuần trước tối nào cũng chụp vở gửi mình. Nhờ bạn mà mình không bị hổng bài. Bạn chu đáo thật đấy.\"",
        "Lúc và cách: Nói trực tiếp sáng mai lúc vào lớp, kèm một gói bánh nhỏ.",
      ],
    },
    fields: [
      { key: "who", label: "Ai đã làm điều gì tốt cho bạn gần đây?", placeholder: "Ví dụ: bạn ___ đã ___ hôm ___", required: true },
      { key: "meaning", label: "Việc đó giúp gì cho bạn, bạn thấy thế nào?", placeholder: "Ví dụ: nhờ vậy mình ___, mình thấy ___", required: true },
      { key: "thanks", label: "Viết lời cảm ơn bạn sẽ nói hoặc nhắn", placeholder: "Ví dụ: Cảm ơn ___ vì đã ___. Nhờ vậy mình ___", required: true },
      { key: "how", label: "Bạn sẽ nói lúc nào, bằng cách nào?", placeholder: "Ví dụ: nói trực tiếp giờ ra chơi / viết vào tờ giấy nhỏ", required: false },
    ],
    criteria: [
      "Nêu đúng người và việc tốt cụ thể họ đã làm",
      "Nói được việc đó giúp gì cho mình hoặc làm mình thấy thế nào",
      "Lời cảm ơn nêu việc cụ thể và điều mình quý ở người đó, không chỉ \"cảm ơn nhé\"",
      "Chọn được lúc và cách nói hợp với người đó",
    ],
    criteriaCodes: ["SO5", "SO5", "SO2", "SO7"],
    actions: [],
  },
};

export function isSkillId(v: unknown): v is SkillId {
  return typeof v === "string" && (SKILL_IDS as string[]).includes(v);
}

/** Kỹ năng của một việc nhỏ theo mã HD (dữ liệu cũ chưa có trường `skill`). */
export function skillOfAction(code: string | null | undefined): SkillId | null {
  if (!code) return null;
  for (const s of SKILL_IDS) if (SKILLS[s].actions.includes(code)) return s;
  return null;
}

export type PracticeCase = {
  /** TL01–TL63 */
  code: string;
  /** tên thẻ tình huống hiện cho học sinh (tình huống Duy soạn, TL58–TL63); không có thì thẻ chỉ ghi biểu hiện */
  title?: string;
  /** hướng ứng phó để trợ lý gợi mở khi góp ý (Duy soạn): chỉ định hướng câu hỏi, không đọc nguyên văn, không đưa làm đáp án */
  coping?: string;
  /** biểu hiện ưu tiên (Bảng 9 báo cáo) */
  sign: string;
  situation: string;
  skills: SkillId[];
};

/** Ngân hàng tình huống luyện: TL01–TL12 (Phụ lục D báo cáo), TL13–TL27 (5 mô-đun mới), TL28–TL57 (đợt 2, 01/11), TL58–TL63 (Nhận biết cảm xúc và chọn cách ứng phó, Duy soạn). Khác bề mặt với bài tình huống đo kỹ năng. */
export const PRACTICE_CASES: PracticeCase[] = [
  { code: "TL01", sign: "Lo trước kiểm tra", situation: "Mai kiểm tra Sinh, còn hai bài chưa ôn, cứ mở sách lại thấy rối.", skills: ["recognize_feelings_thoughts"] },
  { code: "TL02", sign: "Lo trước kiểm tra", situation: "Biết hôm nay có thể bị gọi lên bảng kiểm tra miệng đầu giờ.", skills: [] },
  { code: "TL03", sign: "Sợ sai", situation: "Biết câu trả lời nhưng không dám giơ tay vì sợ sai trước lớp.", skills: ["recognize_feelings_thoughts"] },
  { code: "TL04", sign: "Sợ sai", situation: "Làm bài nhóm, sợ phần mình làm sai khiến cả nhóm bị điểm kém.", skills: ["recognize_feelings_thoughts", "ask_for_help"] },
  { code: "TL05", sign: "Tự ti", situation: "Bạn cùng bàn được khen vở sạch, mình bị nhắc vì ghi thiếu bài.", skills: ["recognize_feelings_thoughts"] },
  { code: "TL06", sign: "Tự ti", situation: "Được xếp nhóm với các bạn học giỏi, thấy mình không theo kịp.", skills: ["recognize_feelings_thoughts", "ask_for_help"] },
  { code: "TL07", sign: "Chán khi bài khó", situation: "Bài hình học làm 30 phút không ra, muốn bỏ.", skills: ["plan_step_by_step"] },
  { code: "TL08", sign: "Chán khi bài khó", situation: "Bài đọc Tiếng Anh nhiều từ mới, đọc mãi không hiểu.", skills: ["plan_step_by_step"] },
  { code: "TL09", sign: "Trì hoãn", situation: "Ba bài cùng hạn thứ Sáu, đến tối thứ Tư vẫn chưa bắt đầu.", skills: ["plan_step_by_step"] },
  { code: "TL10", sign: "Trì hoãn", situation: "Ngồi vào bàn học nhưng cứ cầm điện thoại lên xem.", skills: ["plan_step_by_step"] },
  { code: "TL11", sign: "Ngại nhờ giúp", situation: "Không hiểu bài từ tuần trước, sợ hỏi thì bị cho là không chú ý.", skills: ["ask_for_help"] },
  { code: "TL12", sign: "Ngại nhờ giúp", situation: "Bị điểm kém, muốn xin thầy cô cách ôn lại nhưng ngại.", skills: ["ask_for_help"] },
  // TL13–TL27: tình huống của 5 mô-đun mới (Duy duyệt 01/11); `sign` là nhãn tiếng Việt (signLabel trong noi-dung.json)
  { code: "TL13", sign: "Bạn bè", situation: "Bạn cùng nhóm chưa gửi phần việc của mình, sáng mai cả nhóm đã phải nộp.", skills: ["see_other_side", "resolve_group_conflict"] },
  { code: "TL14", sign: "Bạn bè", situation: "Bạn thân không trả lời tin nhắn của mình suốt từ sau giờ kiểm tra Toán.", skills: ["see_other_side"] },
  { code: "TL15", sign: "Lo trước kiểm tra", situation: "Cô giao thêm bài tập ngay tuần trước kỳ thi, mình nghĩ cô không hiểu lớp đang mệt.", skills: ["see_other_side"] },
  { code: "TL16", sign: "Tự ti", situation: "Bạn ngồi cạnh im lặng cả buổi sau khi bị điểm kém bài kiểm tra Văn.", skills: ["notice_peer_stress", "listen_to_peer"] },
  { code: "TL17", sign: "Chán khi bài khó", situation: "Bạn trong nhóm nói \"chắc mình bỏ học thêm cho rồi, học mãi không vào\".", skills: ["notice_peer_stress", "listen_to_peer"] },
  { code: "TL18", sign: "Lo trước kiểm tra", situation: "Bạn thân mấy hôm nay ngủ gật trong lớp, bảo tối nào cũng thức khuya ôn thi.", skills: ["notice_peer_stress"] },
  { code: "TL19", sign: "Gia đình", situation: "Bạn kể bị bố mẹ mắng vì điểm Toán thấp.", skills: ["listen_to_peer"] },
  { code: "TL20", sign: "Sợ sai", situation: "Bạn kể bị gọi lên bảng mà không làm được bài, sợ cả lớp nghĩ mình kém.", skills: ["listen_to_peer"] },
  { code: "TL21", sign: "Bạn bè", situation: "Bạn kể đang giận bạn thân vì một tin nhắn trong nhóm chat của lớp.", skills: ["listen_to_peer"] },
  { code: "TL22", sign: "Bạn bè", situation: "Nhóm cãi nhau xem ai làm slide, ai thuyết trình, trong khi sắp đến hạn nộp.", skills: ["resolve_group_conflict"] },
  { code: "TL23", sign: "Bạn bè", situation: "Một bạn trong nhóm muốn làm theo ý mình, không nghe ý của người khác.", skills: ["resolve_group_conflict"] },
  { code: "TL24", sign: "Trì hoãn", situation: "Nhóm hẹn họp online tối thứ Bảy nhưng hai bạn không vào, cả nhóm bắt đầu trách nhau.", skills: ["resolve_group_conflict", "see_other_side"] },
  { code: "TL25", sign: "Lo trước kiểm tra", situation: "Bạn ngồi cạnh rủ mình cho xem đáp án trong giờ kiểm tra 15 phút.", skills: ["say_no_to_pressure"] },
  { code: "TL26", sign: "Trì hoãn", situation: "Bạn rủ chơi game online đến khuya, đúng đêm trước ngày thi học kỳ.", skills: ["say_no_to_pressure"] },
  { code: "TL27", sign: "Sợ sai", situation: "Bạn rủ cùng nói với cô là quên vở ở nhà để khỏi bị kiểm tra bài cũ.", skills: ["say_no_to_pressure"] },
  // TL28–TL53: 7 mô-đun đợt 2 (01/11, chờ duyệt); TL54–TL57: thêm cho các mô-đun còn ít tình huống
  { code: "TL28", sign: "Tự ti", situation: "Được xếp thi chung nhóm với các bạn giỏi nhất lớp, thấy mình không có gì để đóng góp.", skills: ["know_my_strengths"] },
  { code: "TL29", sign: "Tự ti", situation: "Cô khen bạn khác đọc bài trôi chảy, mình nghĩ mình chẳng có gì nổi bật.", skills: ["know_my_strengths"] },
  { code: "TL30", sign: "Chán khi bài khó", situation: "Bị điểm kém hai bài Toán liền, bắt đầu nghĩ mình không hợp môn này.", skills: ["know_my_strengths", "growth_mindset"] },
  { code: "TL31", sign: "Lo trước kiểm tra", situation: "Sắp thuyết trình trước lớp, nghĩ mình nói kém nên chắc sẽ không ổn.", skills: ["know_my_strengths"] },
  { code: "TL32", sign: "Chán khi bài khó", situation: "Bài tập Tin học lập trình chạy lỗi mãi, mình nghĩ \"mình không hợp với máy tính\".", skills: ["growth_mindset"] },
  { code: "TL33", sign: "Tự ti", situation: "Các bạn đọc tiếng Anh trôi chảy, mình phát âm sai nên nghĩ mình không bao giờ nói được.", skills: ["growth_mindset"] },
  { code: "TL34", sign: "Sợ sai", situation: "Thi chạy ở giờ Thể dục về cuối, mình nghĩ \"mình chậm từ bé, tập cũng thế thôi\".", skills: ["growth_mindset"] },
  { code: "TL35", sign: "Trì hoãn", situation: "Đầu học kỳ hứa sẽ học từ vựng mỗi ngày, được ba hôm thì bỏ.", skills: ["set_small_goal"] },
  { code: "TL36", sign: "Lo trước kiểm tra", situation: "Còn ba tuần nữa thi học kỳ, muốn ôn sớm nhưng không biết bắt đầu từ đâu.", skills: ["set_small_goal"] },
  { code: "TL37", sign: "Chán khi bài khó", situation: "Muốn viết chữ đẹp hơn vì hay bị trừ điểm trình bày, nhưng tập vài hôm lại chán.", skills: ["set_small_goal"] },
  { code: "TL38", sign: "Trì hoãn", situation: "Muốn bớt dùng điện thoại buổi tối để ngủ sớm hơn, nhưng tối nào cũng lướt đến khuya.", skills: ["set_small_goal", "start_when_reluctant"] },
  { code: "TL39", sign: "Trì hoãn", situation: "Bài thuyết trình nhóm giao từ tuần trước, đến giờ phần của mình vẫn chưa động vào.", skills: ["start_when_reluctant"] },
  { code: "TL40", sign: "Chán khi bài khó", situation: "Đề cương Địa lý dài 6 trang, cứ mở ra là thấy ngán rồi gập lại.", skills: ["start_when_reluctant"] },
  { code: "TL41", sign: "Trì hoãn", situation: "Tối nào cũng định học sau một ván game, nhưng một ván thành ba ván.", skills: ["start_when_reluctant"] },
  { code: "TL42", sign: "Bạn bè", situation: "Bạn rủ đi chơi tối Chủ nhật, trong khi sáng thứ Hai có bài kiểm tra một tiết.", skills: ["weigh_consequences"] },
  { code: "TL43", sign: "Lo trước kiểm tra", situation: "Phân vân nên nhắn hỏi bạn đáp án bài tập về nhà, hay tự làm dù chưa chắc đúng.", skills: ["weigh_consequences"] },
  { code: "TL44", sign: "Gia đình", situation: "Mải học nên quên làm việc nhà bố mẹ dặn, phân vân nói thật hay bảo là đã làm rồi.", skills: ["weigh_consequences"] },
  { code: "TL45", sign: "Bạn bè", situation: "Thấy một bức ảnh chụp lúc một bạn trong lớp đang ngáp, phân vân có nên gửi vào nhóm chat cho vui không.", skills: ["weigh_consequences"] },
  { code: "TL46", sign: "Bạn bè", situation: "Trong nhóm chat lớp có người gửi ảnh chụp màn hình, nói một bạn đã chê cả nhóm sau lưng.", skills: ["check_information"] },
  { code: "TL47", sign: "Lo trước kiểm tra", situation: "Nghe đồn mai cô sẽ kiểm tra 15 phút bất ngờ, cả lớp nhắn nhau lo lắng.", skills: ["check_information"] },
  { code: "TL48", sign: "Bạn bè", situation: "Một tài khoản lạ nhắn tin bảo bấm vào đường link để nhận quà miễn phí.", skills: ["check_information"] },
  { code: "TL49", sign: "Chán khi bài khó", situation: "Đọc trên mạng một mẹo \"thuộc cả bài trong 5 phút\", muốn gửi ngay cho cả lớp.", skills: ["check_information"] },
  { code: "TL50", sign: "Bạn bè", situation: "Bạn trong nhóm làm thêm phần của mình hôm mình bận, nhóm vẫn nộp đúng hạn.", skills: ["show_gratitude"] },
  { code: "TL51", sign: "Ngại nhờ giúp", situation: "Thầy chủ nhiệm thấy mình buồn mấy hôm nên hỏi han, mình chưa kịp cảm ơn thầy.", skills: ["show_gratitude"] },
  { code: "TL52", sign: "Gia đình", situation: "Anh trai kèm mình học Tiếng Anh mỗi tối trong tuần thi, mình chưa cảm ơn lần nào.", skills: ["show_gratitude"] },
  { code: "TL53", sign: "Lo trước kiểm tra", situation: "Bạn cùng bàn rủ ôn chung và giảng cho mình phần khó trước kỳ thi.", skills: ["show_gratitude"] },
  { code: "TL54", sign: "Bạn bè", situation: "Bạn hay đùa nhất lớp mấy hôm nay ít nói, giờ ra chơi chỉ ngồi cúi mặt một chỗ.", skills: ["notice_peer_stress"] },
  { code: "TL55", sign: "Gia đình", situation: "Bạn cùng nhóm kể dạo này ở nhà ồn ào nên tối không học được, lên lớp hay ngủ gật.", skills: ["notice_peer_stress", "listen_to_peer"] },
  { code: "TL56", sign: "Bạn bè", situation: "Nhóm bạn rủ mình đặt biệt danh chê một bạn trong lớp rồi gửi vào nhóm chat.", skills: ["say_no_to_pressure"] },
  { code: "TL57", sign: "Trì hoãn", situation: "Bạn rủ nghỉ buổi học thêm chiều nay để đi chơi, bảo \"một buổi thôi mà\".", skills: ["say_no_to_pressure"] },
  // TL58–TL63: tình huống của "Nhận biết cảm xúc và chọn cách ứng phó" (Duy soạn 8 thẻ ngày 01/11, Claude chọn 6; bỏ
  // "Nhiều việc cùng lúc" vì trùng bài Gỡ rối từng bước và "Sợ giơ tay" vì trùng TL03). Chữ "em" đổi thành "mình".
  {
    code: "TL58",
    title: "Ngày mai kiểm tra",
    sign: "Lo trước kiểm tra",
    situation: "Mai kiểm tra, còn hai phần chưa ôn. Mình mở sách nhưng đầu cứ nghĩ “không kịp mất”, tim đập nhanh và khó tập trung.",
    coping: "Thử thở chậm, nhẹ nhàng; chọn một phần nhỏ để bắt đầu ôn.",
    skills: ["calm_in_the_moment"],
  },
  {
    code: "TL59",
    title: "Làm mãi chưa ra",
    sign: "Chán khi bài khó",
    situation: "Mình làm một bài toán khá lâu vẫn chưa ra. Người nóng lên, tay siết bút, mình muốn vò tờ giấy và bỏ bài.",
    coping: "Tạm đặt bút xuống, thả lỏng tay; sau đó thử cách khác hoặc hỏi một gợi ý.",
    skills: ["calm_in_the_moment"],
  },
  {
    code: "TL60",
    title: "Điểm thấp hơn mong đợi",
    sign: "Tự ti",
    situation: "Mình đã ôn bài nhưng điểm vẫn thấp hơn mong đợi. Mình cúi mặt, không muốn xem lại bài và nghĩ “mình cố cũng chẳng được”.",
    coping: "Gọi tên cảm xúc, cho mình một khoảng nghỉ; khi sẵn sàng, chọn một lỗi để tìm hiểu.",
    skills: ["calm_in_the_moment"],
  },
  {
    code: "TL61",
    title: "Bị góp ý trước nhóm",
    sign: "Bạn bè",
    situation: "Khi mình trình bày ý tưởng, một bạn nói: “Cách này không ổn đâu.” Mình nóng mặt, muốn nói lại thật gắt hoặc không tham gia nữa.",
    coping: "Tạm dừng trước khi đáp; nói cảm nhận và hỏi bạn góp ý cụ thể vào điểm nào.",
    skills: ["calm_in_the_moment"],
  },
  {
    code: "TL62",
    title: "Không được chọn",
    sign: "Bạn bè",
    situation: "Mình rất muốn thuyết trình nhưng nhóm chọn một bạn khác. Mình thấy hụt hẫng và chẳng muốn làm phần việc của mình nữa.",
    coping: "Nhận biết điều mình đang mong đợi; trao đổi về vai trò khác hoặc cơ hội thử lần sau.",
    skills: ["calm_in_the_moment"],
  },
  {
    code: "TL63",
    title: "Học mà không vào",
    sign: "Chán khi bài khó",
    situation: "Mình ngồi học sau một ngày nhiều hoạt động. Mắt díp lại, vai mỏi, đọc cùng một đoạn nhiều lần vẫn không nhớ và bắt đầu cáu với bản thân.",
    coping: "Nhận ra nhu cầu nghỉ ngơi; chọn cách nghỉ phù hợp và xem lại kế hoạch học.",
    skills: ["calm_in_the_moment"],
  },
];

export function casesForSkill(skill: SkillId): PracticeCase[] {
  return PRACTICE_CASES.filter((c) => c.skills.includes(skill));
}

export function caseByCode(code: string | null | undefined): PracticeCase | null {
  return PRACTICE_CASES.find((c) => c.code === code) ?? null;
}

/**
 * Mô-đun luyện mà bài làm nói về MỘT BẠN KHÁC đang áp lực (Duy quyết 01/11, mục 2): khi chữ học sinh viết chạm lớp an toàn,
 * vẫn báo thầy cô như mọi cảnh báo (cùng mức) nhưng ghi rõ "về một bạn khác", và câu khẩn cấp hiện cho học sinh là bản
 * dành cho người đang lo cho bạn (lib/safety/crisis-text.ts PEER_CRISIS_MESSAGE).
 */
export const PEER_RISK_SKILLS: readonly SkillId[] = ["notice_peer_stress", "listen_to_peer"];

export const isPeerRiskSkill = (skill: SkillId | null | undefined): boolean => Boolean(skill && PEER_RISK_SKILLS.includes(skill));

/** Nhãn ghi vào cảnh báo cho thầy cô khi học sinh viết về một bạn khác (chỉ các mô-đun PEER_RISK_SKILLS). */
export function peerAlertLabel(skill: SkillId | null | undefined): string | null {
  return skill && isPeerRiskSkill(skill) ? `Về một bạn khác (bài luyện: ${SKILLS[skill].name})` : null;
}
