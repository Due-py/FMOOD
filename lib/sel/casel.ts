// KHUNG NĂNG LỰC DUY NHẤT CỦA F-MOOD: CASEL 5 (bản 2020). Duy chốt 01/11/2026 (kế hoạch V2, mục 11–12).
// Thuật ngữ (Duy yêu cầu làm rõ): SEL (giáo dục cảm xúc và kỹ năng xã hội) là LĨNH VỰC giáo dục; CASEL 5 là MỘT KHUNG CỤ THỂ
// trong lĩnh vực đó (5 nhóm năng lực của tổ chức CASEL). Viết "năng lực CASEL 5", không viết "năng lực SEL" như thể là tên khung.
// Câu chữ năng lực, định nghĩa và kỹ năng thành phần theo bản tiếng Việt "Khung Giáo dục Cảm xúc của CASEL"
// (An Hòa Well-being; Trà My dịch, Chiêu Anh hiệu đính), đối chiếu bản gốc www.casel.org/what-is-SEL.
// Ví dụ học đường và biểu hiện quan sát được do F-Mood soạn cho lớp 8 (Duy duyệt), không phải lời CASEL.
// Khóa (self_awareness…, SA1…) bền: lưu trong cơ sở dữ liệu và nhật ký. Tên hiển thị chỉ lấy ở đây.
// Mã kỹ năng cũ (K1–K4) KHÔNG có ở file này: chỉ ở lib/sel/legacy.ts.

export const CASEL5 = ["self_awareness", "self_management", "social_awareness", "relationship_skills", "responsible_decision_making"] as const;
export type Casel = (typeof CASEL5)[number];

export type CaselItem = {
  /** mã bền, ví dụ "SA3" */
  code: string;
  /** câu chữ bản dịch An Hòa; rỗng = bản dịch không có dòng riêng (chỉ giữ để đối chiếu bản gốc) */
  vi: string;
  /** câu gốc CASEL 2020 */
  en: string;
};

export type CaselCompetency = {
  key: Casel;
  /** tên theo tiêu đề bản dịch An Hòa */
  name: string;
  en: string;
  /** một câu dễ hiểu cho học sinh lớp 8 (F-Mood soạn) */
  plain: string;
  /** định nghĩa đầy đủ theo bản dịch */
  definition: string;
  items: CaselItem[];
  /** ví dụ học đường lớp 8 (F-Mood soạn) */
  schoolExample: string;
  /** biểu hiện quan sát được (F-Mood soạn), dùng cho tiêu chí góp ý */
  observable: string[];
};

export const CASEL: Record<Casel, CaselCompetency> = {
  self_awareness: {
    key: "self_awareness",
    name: "Nhận thức bản thân",
    en: "Self-awareness",
    plain: "Hiểu mình đang cảm thấy và nghĩ gì",
    definition:
      "Các khả năng hiểu được cảm xúc, suy nghĩ và giá trị của mình và cách chúng ảnh hưởng đến hành vi trong các bối cảnh khác nhau. Điều này bao gồm các khả năng nhận diện thế mạnh và giới hạn của bản thân với cảm giác tự tin và có cơ sở vững chắc.",
    items: [
      { code: "SA1", vi: "Tích hợp bản sắc cá nhân và xã hội", en: "Integrating personal and social identities" },
      { code: "SA2", vi: "Xác định nguồn lực cá nhân, văn hóa và ngôn ngữ", en: "Identifying personal, cultural, and linguistic assets" },
      { code: "SA3", vi: "Xác định cảm xúc của bản thân", en: "Identifying one's emotions" },
      { code: "SA4", vi: "Thể hiện sự trung thực và chính trực", en: "Demonstrating honesty and integrity" },
      { code: "SA5", vi: "Kết nối cảm xúc, giá trị và suy nghĩ", en: "Linking feelings, values, and thoughts" },
      { code: "SA6", vi: "Kiểm chứng lại các định kiến và thành kiến", en: "Examining prejudices and biases" },
      { code: "SA7", vi: "Trải nghiệm hiệu quả bản thân (self-efficacy)", en: "Experiencing self-efficacy" },
      { code: "SA8", vi: "Có tư duy phát triển", en: "Having a growth mindset" },
      { code: "SA9", vi: "Phát triển mối quan tâm và mục đích sống", en: "Developing interests and a sense of purpose" },
    ],
    schoolExample: "Biết mình đang lo trước bài kiểm tra vì chưa ôn, không phải vì \"mình dốt\".",
    observable: ["Gọi đúng tên cảm xúc", "Tách chuyện đã xảy ra khỏi lời tự phán xét", "Nói được một thế mạnh và một giới hạn của mình"],
  },
  self_management: {
    key: "self_management",
    name: "Quản trị bản thân",
    en: "Self-management",
    plain: "Bình tĩnh lại và chọn bước nhỏ khi căng thẳng",
    definition:
      "Các khả năng quản lý cảm xúc, suy nghĩ và hành vi của bản thân một cách hiệu quả trong nhiều tình huống khác nhau và đạt được mục tiêu và nguyện vọng. Điều này bao gồm khả năng trì hoãn sự hài lòng, quản lý căng thẳng và cảm thấy có động lực & quyền tự quyết để hoàn thành các mục tiêu chung/cá nhân.",
    items: [
      { code: "SM1", vi: "Quản lý cảm xúc của bản thân", en: "Managing one's emotions" },
      { code: "SM2", vi: "Xác định và sử dụng các chiến lược quản lý căng thẳng", en: "Identifying and using stress management strategies" },
      { code: "SM3", vi: "Thể hiện tính tự kỷ luật và tự tạo động lực", en: "Exhibiting self-discipline and self-motivation" },
      { code: "SM4", vi: "Đặt mục tiêu cá nhân và tập thể", en: "Setting personal and collective goals" },
      { code: "SM5", vi: "Sử dụng các kỹ năng tổ chức và lên kế hoạch", en: "Using planning and organizational skills" },
      // bản dịch không có dòng riêng cho ý này (Duy chọn giữ đúng 6 dòng của bản dịch, 01/11): không hiện, chỉ để đối chiếu
      { code: "SM6", vi: "", en: "Showing the courage to take initiative" },
      { code: "SM7", vi: "Thể hiện sự chủ động cá nhân và trong tập thể", en: "Demonstrating personal and collective agency" },
    ],
    schoolExample: "Thở chậm 4 nhịp trước khi lên bảng; chia đề cương thành 3 phần, mỗi tối một phần.",
    observable: ["Chọn được một cách quản lý căng thẳng tại chỗ (không né tránh) và làm thử", "Đặt được một bước nhỏ có giờ"],
  },
  social_awareness: {
    key: "social_awareness",
    name: "Nhận thức xã hội",
    en: "Social awareness",
    plain: "Hiểu cảm xúc và góc nhìn của người khác",
    definition:
      "Các khả năng hiểu các quan điểm và thấu cảm với người khác, bao gồm những người đến từ những nền tảng, văn hóa và bối cảnh khác nhau. Điều này bao gồm khả năng có lòng trắc ẩn với người khác, hiểu các chuẩn mực xã hội và lịch sử rộng hơn để cư xử trong các bối cảnh khác nhau, đồng thời nhận ra các nguồn lực và sự hỗ trợ của gia đình, trường học và cộng đồng.",
    items: [
      { code: "SO1", vi: "Nhìn nhận quan điểm của người khác", en: "Taking others' perspectives" },
      { code: "SO2", vi: "Nhận ra thế mạnh của người khác", en: "Recognizing strengths in others" },
      { code: "SO3", vi: "Thể hiện sự thấu cảm và lòng trắc ẩn", en: "Demonstrating empathy and compassion" },
      { code: "SO4", vi: "Bày tỏ sự quan tâm đến cảm xúc của người khác", en: "Showing concern for the feelings of others" },
      { code: "SO5", vi: "Hiểu và bày tỏ lòng biết ơn", en: "Understanding and expressing gratitude" },
      { code: "SO6", vi: "Xác định những chuẩn mực xã hội đa dạng, bao gồm những chuẩn mực phi lý", en: "Identifying diverse social norms, including unjust ones" },
      { code: "SO7", vi: "Nhận biết nhu cầu và cơ hội theo từng tình huống", en: "Recognizing situational demands and opportunities" },
      { code: "SO8", vi: "Hiểu sự ảnh hưởng của các tổ chức/hệ thống lên hành vi", en: "Understanding the influences of organizations and systems on behavior" },
    ],
    schoolExample: "Bạn cùng nhóm chưa làm phần việc: thay vì nghĩ \"bạn lười\", thử nghĩ thêm \"có thể bạn đang có chuyện\".",
    observable: ["Nêu ít nhất 2 cách hiểu khác nhau về hành động của người khác", "Nói một câu bày tỏ quan tâm", "Kể được một nguồn hỗ trợ ở trường"],
  },
  relationship_skills: {
    key: "relationship_skills",
    name: "Kỹ năng tương quan",
    en: "Relationship skills",
    plain: "Nói điều mình cần, lắng nghe, nhờ giúp đỡ",
    definition:
      "Các khả năng thiết lập và duy trì các mối quan hệ hỗ trợ và lành mạnh cũng như điều hướng quan hệ hiệu quả với các nhóm và cá nhân đa dạng. Điều này bao gồm các khả năng giao tiếp rõ ràng, lắng nghe tích cực, hợp tác, làm việc cộng tác để giải quyết vấn đề và thương lượng mâu thuẫn mang tính xây dựng, điều hướng sắp đặt với các cơ hội và nhu cầu văn hóa, xã hội khác nhau, cung cấp khả năng lãnh đạo, và tìm kiếm hoặc đề nghị giúp đỡ khi cần thiết.",
    items: [
      { code: "RS1", vi: "Giao tiếp hiệu quả", en: "Communicating effectively" },
      { code: "RS2", vi: "Phát triển các mối quan hệ tích cực", en: "Developing positive relationships" },
      { code: "RS3", vi: "Thể hiện năng lực văn hóa", en: "Demonstrating cultural competency" },
      { code: "RS4", vi: "Thực hành làm việc nhóm và hợp tác giải quyết vấn đề", en: "Practicing teamwork and collaborative problem-solving" },
      { code: "RS5", vi: "Giải quyết mâu thuẫn mang tính xây dựng", en: "Resolving conflicts constructively" },
      { code: "RS6", vi: "Chống lại áp lực xã hội tiêu cực", en: "Resisting negative social pressure" },
      { code: "RS7", vi: "Thể hiện khả năng lãnh đạo trong nhóm", en: "Showing leadership in groups" },
      { code: "RS8", vi: "Tìm kiếm hoặc cung cấp sự hỗ trợ khi cần thiết", en: "Seeking or offering support and help when needed" },
      { code: "RS9", vi: "Bảo vệ quyền lợi của người khác", en: "Standing up for the rights of others" },
    ],
    schoolExample: "Nói với bạn cùng nhóm: \"Mình lo nhóm nộp trễ, mình chia lại việc được không?\"",
    observable: ["Câu nói có cảm xúc, nhu cầu và đề nghị cụ thể", "Nhắc lại được ý của bạn (lắng nghe tích cực)", "Từ chối kèm một đề xuất khác", "Lời nhờ rõ ràng, đúng người"],
  },
  responsible_decision_making: {
    key: "responsible_decision_making",
    name: "Đưa ra quyết định có trách nhiệm",
    en: "Responsible decision-making",
    plain: "Cân nhắc lựa chọn và hậu quả trước khi làm",
    definition:
      "Các khả năng tạo ra các lựa chọn mang tính xây dựng và quan tâm về hành vi cá nhân và tương tác xã hội trong các tình huống khác nhau. Điều này bao gồm khả năng cân nhắc các chuẩn mực đạo đức và các mối quan tâm về sự an toàn, đánh giá lợi ích và hậu quả của các hành động khác nhau đối với sức khỏe tinh thần và thể chất của cá nhân, xã hội và tập thể.",
    items: [
      { code: "RD1", vi: "Thể hiện sự tò mò và cởi mở", en: "Demonstrating curiosity and open-mindedness" },
      { code: "RD2", vi: "Học cách đưa ra phán đoán hợp lý sau khi phân tích thông tin, dữ liệu, dữ kiện", en: "Learning how to make a reasoned judgment after analyzing information, data, and facts" },
      { code: "RD3", vi: "Xác định các giải pháp cho những vấn đề cá nhân và xã hội", en: "Identifying solutions for personal and social problems" },
      { code: "RD4", vi: "Dự đoán và đánh giá hậu quả của các hành động của một người", en: "Anticipating and evaluating the consequences of one's actions" },
      { code: "RD5", vi: "Nhận biết các kỹ năng tư duy phản biện hữu ích cả trong và ngoài trường học", en: "Recognizing how critical thinking skills are useful both inside and outside of school" },
      { code: "RD6", vi: "Phản ánh vai trò của mình trong việc thúc đẩy sức khỏe tinh thần và thể chất của cá nhân, gia đình và cộng đồng", en: "Reflecting on one's role to promote personal, family, and community well-being" },
      { code: "RD7", vi: "Đánh giá các tác động cá nhân, giữa các cá nhân, cộng đồng và thể chế", en: "Evaluating personal, interpersonal, community, and institutional impacts" },
    ],
    schoolExample: "Ba bài nộp thứ Sáu: liệt kê, so 2 cách sắp xếp, chọn một cách có lý do và có phương án dự phòng.",
    observable: ["Nêu ít nhất 2 phương án và hậu quả của từng phương án", "Chọn có lý do, có tính đến an toàn"],
  },
};

export const CASEL_LIST: CaselCompetency[] = CASEL5.map((k) => CASEL[k]);

export function isCasel(v: unknown): v is Casel {
  return typeof v === "string" && (CASEL5 as readonly string[]).includes(v);
}

/** Kỹ năng thành phần hiện cho học sinh (bỏ dòng bản dịch không có). */
export const visibleItems = (c: Casel): CaselItem[] => CASEL[c].items.filter((i) => i.vi);

const ITEM_INDEX = new Map(CASEL_LIST.flatMap((c) => c.items.map((i) => [i.code, { ...i, competency: c.key }] as const)));
export function caselItem(code: string): (CaselItem & { competency: Casel }) | null {
  return ITEM_INDEX.get(code) ?? null;
}

// ───────── Kỹ năng thành phần F-Mood luyện được (danh mục mở) ─────────

export type SubskillId =
  | "recognize_feelings_thoughts"
  | "calm_in_the_moment"
  | "plan_step_by_step"
  | "ask_for_help"
  | "see_other_side"
  | "notice_peer_stress"
  | "listen_to_peer"
  | "resolve_group_conflict"
  | "say_no_to_pressure"
  // đợt 2 (01/11, Duy: mỗi nhóm năng lực 3–4 bài)
  | "know_my_strengths"
  | "growth_mindset"
  | "set_small_goal"
  | "start_when_reluctant"
  | "weigh_consequences"
  | "check_information"
  | "show_gratitude";

export type Subskill = {
  id: SubskillId;
  /** đường dẫn /ky-nang/<slug> */
  slug: string;
  /** tên học sinh thấy */
  name: string;
  primary: Casel;
  related: Casel[];
  /** mã kỹ năng thành phần CASEL 2020 */
  items: string[];
  /** MỘT mục tiêu luyện chính, quan sát được */
  objective: string;
};

export const SUBSKILLS: Subskill[] = [
  {
    id: "recognize_feelings_thoughts",
    slug: "nhan-ra-cam-xuc",
    name: "Nhận ra cảm xúc và suy nghĩ của mình",
    primary: "self_awareness",
    related: ["self_management"],
    items: ["SA3", "SA5"],
    objective: "Tách chuyện đã xảy ra khỏi suy nghĩ, gọi tên cảm xúc và kiểm tra suy nghĩ đó.",
  },
  {
    id: "calm_in_the_moment",
    slug: "lam-diu-cam-xuc",
    // Duy đổi tên 01/11 (trước: "Làm dịu cảm xúc ngay tại chỗ"); giữ đường dẫn cũ để link không gãy
    name: "Nhận biết cảm xúc và chọn cách ứng phó",
    primary: "self_management",
    related: ["self_awareness"],
    items: ["SM1", "SM2"],
    objective: "Nhận biết mình đang thấy gì, chọn và làm thử một cách ứng phó hợp với lúc đó, kèm một bước tiếp theo cụ thể.",
  },
  {
    id: "plan_step_by_step",
    slug: "go-roi-tung-buoc",
    name: "Gỡ rối và lên kế hoạch từng bước",
    primary: "responsible_decision_making",
    related: ["self_management"],
    items: ["RD3", "RD4", "SM5"],
    objective: "So ít nhất 2 phương án, chọn một cách có lý do, đặt bước nhỏ có giờ và có phương án dự phòng.",
  },
  {
    id: "ask_for_help",
    slug: "mo-loi-nho-giup",
    name: "Mở lời nhờ người giúp",
    primary: "relationship_skills",
    related: ["self_awareness", "responsible_decision_making"],
    items: ["RS8", "RS1"],
    objective: "Viết và tập nói một lời nhờ rõ ràng, đúng người, đúng lúc.",
  },
  {
    id: "see_other_side",
    slug: "nhin-tu-phia-nguoi-khac",
    name: "Nhìn chuyện từ phía người khác",
    primary: "social_awareness",
    related: ["relationship_skills"],
    items: ["SO1", "SO4"],
    objective: "Nêu ít nhất 2 cách hiểu về hành động của người khác và một câu hỏi để kiểm tra.",
  },
  {
    id: "notice_peer_stress",
    slug: "nhan-ra-ban-ap-luc",
    name: "Nhận ra khi bạn đang áp lực",
    primary: "social_awareness",
    related: ["relationship_skills"],
    items: ["SO3", "SO4", "RS8"],
    objective: "Nhận ra dấu hiệu, nói một câu quan tâm phù hợp và biết lúc cần nhờ người lớn.",
  },
  {
    id: "listen_to_peer",
    slug: "lang-nghe-ban",
    name: "Lắng nghe bạn đang áp lực",
    primary: "relationship_skills",
    related: ["social_awareness"],
    items: ["RS1", "SO3"],
    objective: "Lắng nghe không ngắt lời, nhắc lại ý của bạn và không phán xét.",
  },
  {
    id: "resolve_group_conflict",
    slug: "giai-quyet-bat-dong",
    name: "Giải quyết bất đồng khi làm nhóm",
    primary: "relationship_skills",
    related: ["responsible_decision_making"],
    items: ["RS5", "RS4"],
    objective: "Nói được cảm xúc, nhu cầu, đề nghị và cùng tìm một phương án chung.",
  },
  {
    id: "say_no_to_pressure",
    slug: "noi-khong-voi-ap-luc",
    name: "Nói \"không\" với áp lực tiêu cực",
    primary: "relationship_skills",
    related: ["responsible_decision_making"],
    items: ["RS6", "RD4"],
    objective: "Từ chối rõ ràng, giữ được quan hệ và đưa ra một phương án khác.",
  },
  // ───── đợt 2 (01/11): Duy yêu cầu mỗi nhóm năng lực có 3–4 bài; nội dung chờ Duy và cô Thúy duyệt ─────
  {
    id: "know_my_strengths",
    slug: "nhan-ra-diem-manh",
    name: "Nhận ra điểm mạnh của mình",
    primary: "self_awareness",
    related: ["self_management"],
    items: ["SA2", "SA7"],
    objective: "Kể một việc mình đã làm được, gọi tên điểm mạnh đã giúp mình và dùng điểm mạnh đó cho một việc đang khó.",
  },
  {
    id: "growth_mindset",
    slug: "tin-minh-tien-bo",
    name: "Tin rằng mình có thể tiến bộ",
    primary: "self_awareness",
    related: ["self_management"],
    items: ["SA8", "SA7"],
    objective: "Đổi một câu \"mình không thể\" thành \"mình chưa… nhưng nếu…\", kèm một cách học khác và một mốc tự thấy tiến bộ.",
  },
  {
    id: "set_small_goal",
    slug: "dat-muc-tieu-nho",
    name: "Đặt mục tiêu nhỏ và theo dõi",
    primary: "self_management",
    related: ["responsible_decision_making"],
    items: ["SM4", "SM5", "SM3"],
    objective: "Đặt một mục tiêu nhỏ, đo được, có hạn, kèm việc làm mỗi ngày và cách tự theo dõi.",
  },
  {
    id: "start_when_reluctant",
    slug: "bat-dau-viec-dang-ngai",
    name: "Bắt đầu việc mình đang ngại",
    primary: "self_management",
    related: ["self_awareness"],
    items: ["SM3", "SM1"],
    objective: "Chọn một bước khởi động thật nhỏ, để xa một thứ gây xao nhãng và bắt tay vào việc đang ngại.",
  },
  {
    id: "weigh_consequences",
    slug: "can-nhac-hau-qua",
    name: "Cân nhắc hậu quả trước khi chọn",
    primary: "responsible_decision_making",
    related: ["social_awareness"],
    items: ["RD3", "RD4", "RD7"],
    objective: "Nêu ít nhất 2 lựa chọn, đoán hậu quả của từng lựa chọn cho mình và cho người khác, rồi chọn một cách có lý do.",
  },
  {
    id: "check_information",
    slug: "kiem-tra-thong-tin",
    name: "Kiểm tra thông tin trước khi tin và chia sẻ",
    primary: "responsible_decision_making",
    related: ["social_awareness"],
    items: ["RD2", "RD5", "RD7"],
    objective: "Tách điều biết chắc với điều mới nghe nói, nêu một cách kiểm tra và quyết định có chia sẻ hay không, có lý do.",
  },
  {
    id: "show_gratitude",
    slug: "cam-on-va-ghi-nhan",
    name: "Cảm ơn và ghi nhận người khác",
    primary: "social_awareness",
    related: ["relationship_skills"],
    items: ["SO5", "SO2", "SO7"],
    objective: "Nhận ra một việc tốt cụ thể người khác đã làm cho mình và cảm ơn có nêu việc đó, ý nghĩa của nó với mình.",
  },
];

const BY_ID = new Map(SUBSKILLS.map((s) => [s.id, s] as const));
const BY_SLUG = new Map(SUBSKILLS.map((s) => [s.slug, s] as const));

export function isSubskillId(v: unknown): v is SubskillId {
  return typeof v === "string" && BY_ID.has(v as SubskillId);
}
export const subskill = (id: SubskillId): Subskill => BY_ID.get(id)!;
export const subskillBySlug = (slug: string): Subskill | null => BY_SLUG.get(slug) ?? null;
export const subskillHref = (id: SubskillId) => `/ky-nang/${subskill(id).slug}`;

/** Kỹ năng thành phần xếp theo năng lực chính (trang Kỹ năng). */
export function subskillsByCompetency(ids: readonly SubskillId[] = SUBSKILLS.map((s) => s.id)): Record<Casel, Subskill[]> {
  const out = Object.fromEntries(CASEL5.map((c) => [c, [] as Subskill[]])) as Record<Casel, Subskill[]>;
  for (const id of ids) out[subskill(id).primary].push(subskill(id));
  return out;
}
