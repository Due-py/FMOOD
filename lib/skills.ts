// BỐN KỸ NĂNG ỨNG PHÓ VÀ NGÂN HÀNG TÌNH HUỐNG LUYỆN (Demo 2 bổ sung, kế hoạch Demo 3 Bước 1)
// Dùng chung cho trang Luyện kỹ năng, bộ điều phối, góp ý của trợ lý, thẻ gợi ý kỹ năng và bảng điều khiển.
// File này dùng chung cho máy chủ và trình duyệt (không đọc cơ sở dữ liệu).
//
// Câu "Hiểu" và "Mẫu" là nội dung soạn sẵn (cô Thúy duyệt), trợ lý AI không viết lại.
// Mẫu luôn ở tình huống KHÁC hoặc là khung có chỗ trống: đó là làm mẫu, không phải làm hộ.

export type SkillCode = "K1" | "K2" | "K3" | "K4";

export const SKILL_CODES: SkillCode[] = ["K1", "K2", "K3", "K4"];

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
  code: SkillCode;
  /** tên kỹ năng (theo báo cáo) */
  name: string;
  /** tên trợ lý dùng khi gợi ý kỹ năng (thẻ SKILL), phải khớp nguyên văn */
  suggestName: string;
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
  /** việc nhỏ (mã HD) gốc từ Demo 2 thuộc kỹ năng này */
  actions: string[];
};

export const SKILLS: Record<SkillCode, Skill> = {
  K1: {
    code: "K1",
    name: "Nhận diện",
    suggestName: "Nhận ra mình đang thế nào",
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
    actions: ["HD01", "HD02", "HD13"],
  },
  K2: {
    code: "K2",
    name: "Điều tiết",
    suggestName: "Làm dịu cảm xúc",
    emoji: "🌬️",
    tagline: "Chọn và thử một cách giúp mình bình tĩnh lại, xem cách nào hợp với mình",
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
    actions: ["HD07", "HD09", "HD04", "HD22"],
  },
  K3: {
    code: "K3",
    name: "Giải quyết vấn đề",
    suggestName: "Gỡ rối từng bước",
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
      // P0 (phản biện 31/10): K3 phải có HAI PHƯƠNG ÁN, nghĩ ít nhất hai cách rồi mới chọn thứ tự.
      // Bài K3 lưu trước khi có ô này (chỉ có ở máy thử, trang Luyện kỹ năng chưa triển khai lên web): vẫn đọc được
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
    actions: ["HD03", "HD11", "HD12", "HD27"],
  },
  K4: {
    code: "K4",
    name: "Tìm kiếm hỗ trợ",
    suggestName: "Tìm người giúp mình",
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
    actions: ["HD05", "HD28"],
  },
};

export function isSkillCode(v: unknown): v is SkillCode {
  return typeof v === "string" && (SKILL_CODES as string[]).includes(v);
}

/** Kỹ năng của một việc nhỏ theo mã HD (dữ liệu cũ chưa có trường `skill`). */
export function skillOfAction(code: string | null | undefined): SkillCode | null {
  if (!code) return null;
  for (const s of SKILL_CODES) if (SKILLS[s].actions.includes(code)) return s;
  return null;
}

/** Danh sách tên kỹ năng trợ lý được phép gợi ý (thẻ SKILL), theo thứ tự K1–K4. */
export function suggestableSkillNames(enabled: SkillCode[] = SKILL_CODES): string[] {
  return enabled.map((c) => SKILLS[c].suggestName);
}

/**
 * Tên cũ (đặt 31/10 sáng, đổi 31/10 tối vì gắn vào một tình huống học tập thay vì gọi tên nhóm kỹ năng).
 * Chỉ để thẻ trong tin nhắn đã lưu trước khi đổi tên vẫn mở đúng bài; trợ lý không được gợi ý tên cũ.
 */
const LEGACY_SUGGEST_NAMES: Record<string, SkillCode> = {
  "Bình tĩnh lại trước khi làm bài": "K2",
  "Sắp xếp việc khi có nhiều bài": "K3",
  "Nhờ thầy cô khi chưa hiểu bài": "K4",
};

/** Tìm kỹ năng theo tên trợ lý gợi ý; chỉ khớp NGUYÊN VĂN (bỏ khoảng trắng hai đầu), kể cả tên cũ. */
export function skillBySuggestName(name: string): SkillCode | null {
  const n = name.trim();
  for (const s of SKILL_CODES) if (SKILLS[s].suggestName === n) return s;
  return LEGACY_SUGGEST_NAMES[n] ?? null;
}

export type PracticeCase = {
  /** TL01–TL12 */
  code: string;
  /** biểu hiện ưu tiên (Bảng 9 báo cáo) */
  sign: string;
  situation: string;
  skills: SkillCode[];
};

/** Ngân hàng 12 tình huống luyện (Phụ lục D báo cáo). Khác bề mặt với bài tình huống đo kỹ năng. */
export const PRACTICE_CASES: PracticeCase[] = [
  { code: "TL01", sign: "Lo trước kiểm tra", situation: "Mai kiểm tra Sinh, còn hai bài chưa ôn, cứ mở sách lại thấy rối.", skills: ["K1", "K2"] },
  { code: "TL02", sign: "Lo trước kiểm tra", situation: "Biết hôm nay có thể bị gọi lên bảng kiểm tra miệng đầu giờ.", skills: ["K2"] },
  { code: "TL03", sign: "Sợ sai", situation: "Biết câu trả lời nhưng không dám giơ tay vì sợ sai trước lớp.", skills: ["K1", "K2"] },
  { code: "TL04", sign: "Sợ sai", situation: "Làm bài nhóm, sợ phần mình làm sai khiến cả nhóm bị điểm kém.", skills: ["K1", "K4"] },
  { code: "TL05", sign: "Tự ti", situation: "Bạn cùng bàn được khen vở sạch, mình bị nhắc vì ghi thiếu bài.", skills: ["K1"] },
  { code: "TL06", sign: "Tự ti", situation: "Được xếp nhóm với các bạn học giỏi, thấy mình không theo kịp.", skills: ["K1", "K4"] },
  { code: "TL07", sign: "Chán khi bài khó", situation: "Bài hình học làm 30 phút không ra, muốn bỏ.", skills: ["K2", "K3"] },
  { code: "TL08", sign: "Chán khi bài khó", situation: "Bài đọc Tiếng Anh nhiều từ mới, đọc mãi không hiểu.", skills: ["K2", "K3"] },
  { code: "TL09", sign: "Trì hoãn", situation: "Ba bài cùng hạn thứ Sáu, đến tối thứ Tư vẫn chưa bắt đầu.", skills: ["K3"] },
  { code: "TL10", sign: "Trì hoãn", situation: "Ngồi vào bàn học nhưng cứ cầm điện thoại lên xem.", skills: ["K2", "K3"] },
  { code: "TL11", sign: "Ngại nhờ giúp", situation: "Không hiểu bài từ tuần trước, sợ hỏi thì bị cho là không chú ý.", skills: ["K4"] },
  { code: "TL12", sign: "Ngại nhờ giúp", situation: "Bị điểm kém, muốn xin thầy cô cách ôn lại nhưng ngại.", skills: ["K4"] },
];

export function casesForSkill(skill: SkillCode): PracticeCase[] {
  return PRACTICE_CASES.filter((c) => c.skills.includes(skill));
}

export function caseByCode(code: string | null | undefined): PracticeCase | null {
  return PRACTICE_CASES.find((c) => c.code === code) ?? null;
}
