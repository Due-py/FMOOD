// NGÂN HÀNG MẪU CỦA BỐN KỸ NĂNG (bước Mẫu) VÀ PHẦN "BÀI TỐT CẦN CÓ" (bước Hiểu). Hàm thuần, có test: skill-samples.test.ts.
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
import { PRACTICE_CASES, SKILLS, type SkillCode } from "@/lib/skills";

/** Biểu hiện của tình huống (dùng để chọn mẫu gần loại). */
export const SAMPLE_SIGNS = ["lo-kiem-tra", "so-sai", "tu-ti", "chan-bai-kho", "tri-hoan", "ngai-nho", "ban-be", "gia-dinh"] as const;
export type SampleSign = (typeof SAMPLE_SIGNS)[number];

export type SampleLine = { text: string; why: string };
/** Một mẫu: `lines[i]` ứng với ô thứ i của kỹ năng (SKILLS[k].fields[i]). */
export type SkillSample = { id: string; sign: SampleSign; situation: string; lines: SampleLine[] };
/** Cặp so sánh "chưa tốt → tốt hơn" cho ô khó nhất của kỹ năng. */
export type SampleContrast = { field: string; weak: string; better: string; why: string };

/** Tên ngắn của từng ô (nhãn trên dòng mẫu), cùng thứ tự với SKILLS[k].fields. */
export const FIELD_SHORT: Record<SkillCode, string[]> = {
  K1: ["Chuyện đã xảy ra", "Mình thấy", "Mình đang nghĩ", "Kiểm tra suy nghĩ"],
  K2: ["Bình tĩnh để", "Cách làm dịu", "Việc đầu tiên", "Hợp không, dùng lúc nào"],
  K3: ["Các việc và thời gian", "Các cách làm", "Làm trước, vì sao", "Bước đầu", "Nếu không kịp"],
  K4: ["Vướng ở đâu, đã thử gì", "Nhờ ai, lúc nào, cách nào", "Lời nhờ"],
};

const K1_WHY = [
  "Chỉ kể việc đã xảy ra (ai, làm gì, lúc nào), không có lời chê bản thân.",
  "Có đủ 3 loại: cảm xúc, dấu hiệu cơ thể, việc mình làm lúc đó.",
  "Viết nguyên câu đang nghĩ trong đầu, để trong ngoặc kép.",
  "Nhận ra đó là điều mình đoán, và tìm một điều cho thấy nó chưa chắc đúng.",
];
const K2_WHY = [
  "Nói rõ bình tĩnh lại để làm việc gì, không chỉ \"cho đỡ lo\".",
  "Cách làm được ngay tại chỗ, có làm thế nào và bao lâu hoặc mấy lần.",
  "Một việc đầu tiên cụ thể, nhỏ, bắt tay vào được ngay.",
  "Tự xem cách này có hợp không và lần sau dùng lúc nào.",
];
const K3_WHY = [
  "Liệt kê các việc kèm hạn, và thời gian thật mình có.",
  "Có ít nhất hai cách khác nhau thật sự để so sánh.",
  "Chọn một cách và nói lý do (hạn sớm nhất, nhiều việc nhất…).",
  "Bước đầu nhỏ, cụ thể, có giờ bắt đầu.",
  "Biết trước sẽ dời hay bớt việc gì, hoặc báo ai nếu không kịp.",
];
const K4_WHY = [
  "Nói đúng chỗ chưa hiểu và việc mình đã tự thử.",
  "Chọn người giúp được, lúc và cách hỏi hợp với mình.",
  "Lời nhờ 2–4 câu: chưa hiểu gì, đã thử gì, muốn được giúp gì.",
];
const lines = (why: string[], texts: string[]): SampleLine[] => texts.map((text, i) => ({ text, why: why[i] }));

export const SKILL_SAMPLES: Record<SkillCode, SkillSample[]> = {
  K1: [
    {
      id: "k1-len-bang",
      sign: "so-sai",
      situation: "Một bạn bị cô gọi lên bảng mà làm sai trước lớp.",
      lines: lines(K1_WHY, [
        "Mình làm sai câu 2 trên bảng, cô cho về chỗ.",
        "Xấu hổ, mặt nóng, về chỗ cúi mặt không muốn nhìn ai.",
        "\"Cả lớp chắc cười mình.\"",
        "Đó là điều mình đoán; lúc về chỗ mình không thấy ai cười cả.",
      ]),
    },
    {
      id: "k1-de-cuong-su",
      sign: "lo-kiem-tra",
      situation: "Một bạn tối trước hôm kiểm tra Sử mở đề cương thấy còn nhiều phần chưa thuộc.",
      lines: lines(K1_WHY, [
        "Tối nay mình mở đề cương Sử, còn 3 bài chưa thuộc.",
        "Lo, tim đập nhanh, cứ lật sách qua lại mà không đọc vào chữ nào.",
        "\"Mai chắc chắn mình bị điểm kém.\"",
        "Đó là điều mình đoán; lần trước mình cũng lo như vậy mà vẫn được 7 điểm.",
      ]),
    },
    {
      id: "k1-chu-xau",
      sign: "ban-be",
      situation: "Một bạn bị bạn cùng bàn nói to là chữ mình xấu trong giờ học.",
      lines: lines(K1_WHY, [
        "Trong giờ Văn, bạn cùng bàn nói to: \"chữ cậu xấu thế\".",
        "Bực, mặt nóng, mình gấp vở lại và không nói gì nữa.",
        "\"Bạn ấy cố tình làm mình mất mặt.\"",
        "Mình chưa biết bạn ấy nghĩ gì; mình có thể nói là mình không thích câu đó.",
      ]),
    },
    {
      id: "k1-lam-cham",
      sign: "tu-ti",
      situation: "Một bạn thấy bạn cùng nhóm làm bài nhanh hơn mình nhiều.",
      lines: lines(K1_WHY, [
        "Trong giờ Toán, bạn cùng nhóm làm xong 5 bài, mình mới xong 2.",
        "Buồn, nặng người, mình úp vở lại và ngồi im.",
        "\"Mình kém hơn mọi người.\"",
        "Đó là suy nghĩ; mình chậm ở dạng bài này, còn hôm qua mình làm phần hình nhanh.",
      ]),
    },
    {
      id: "k1-dien-thoai",
      sign: "gia-dinh",
      situation: "Một bạn bị mẹ nhắc cất điện thoại khi đang ngồi học buổi tối.",
      lines: lines(K1_WHY, [
        "9 giờ tối, mẹ nhắc mình cất điện thoại khi mình đang làm bài.",
        "Khó chịu, thở mạnh, mình đóng cửa phòng lại.",
        "\"Mẹ không tin mình.\"",
        "Mình chưa chắc; có thể mẹ lo mình thức khuya. Mình có thể nói với mẹ mình định học tới mấy giờ.",
      ]),
    },
  ],
  K2: [
    {
      id: "k2-thuyet-trinh",
      sign: "so-sai",
      situation: "Một bạn sắp phải thuyết trình trước lớp sau giờ ra chơi.",
      lines: lines(K2_WHY, [
        "Để nói rõ được câu mở đầu.",
        "Hít thở hộp: hít vào đếm 4, giữ 4, thở ra 4, làm 4 lần.",
        "Đọc thầm câu mở đầu một lần rồi mới đứng lên.",
        "Khá hợp; lần sau mình dùng trước giờ kiểm tra miệng.",
      ]),
    },
    {
      id: "k2-tay-run",
      sign: "lo-kiem-tra",
      situation: "Một bạn vừa nhận đề kiểm tra Toán thì thấy tay run, đọc không vào.",
      lines: lines(K2_WHY, [
        "Để đọc đề cho rõ, không bỏ sót câu.",
        "Đặt bút xuống, thở chậm: hít vào 4, thở ra 6, làm 5 lần (khoảng 1 phút).",
        "Đọc lướt cả đề, đánh dấu câu dễ nhất và làm câu đó trước.",
        "Hợp; lần sau mình làm ngay khi vừa nhận đề.",
      ]),
    },
    {
      id: "k2-bai-hoa",
      sign: "chan-bai-kho",
      situation: "Một bạn làm bài Hóa 20 phút không ra, bực muốn bỏ.",
      lines: lines(K2_WHY, [
        "Để quay lại bài mà không bực nữa.",
        "Đứng dậy uống nước, vươn vai 2 phút, không cầm điện thoại.",
        "Đọc lại đề, gạch chân những gì đề đã cho.",
        "Khá hợp; lần sau dùng khi một bài quá 15 phút chưa ra.",
      ]),
    },
    {
      id: "k2-thu-vien",
      sign: "ban-be",
      situation: "Một bạn đang ôn bài ở thư viện thì bàn bên gõ bút liên tục, thấy rất bực.",
      lines: lines(K2_WHY, [
        "Để đọc tiếp được trang sách đang dở.",
        "Thở chậm 10 nhịp, thả lỏng vai; vẫn bực thì nói nhỏ nhờ bạn ấy dừng gõ.",
        "Đọc lại đoạn đang dở từ đầu câu.",
        "Hợp; lần sau mình dùng khi bị làm phiền lúc đang học.",
      ]),
    },
  ],
  K3: [
    {
      id: "k3-on-thi",
      sign: "lo-kiem-tra",
      situation: "Một bạn có 4 môn cần ôn cho tuần kiểm tra học kỳ, mỗi tối có khoảng 2 tiếng.",
      lines: lines(K3_WHY, [
        "Toán (thi thứ Hai), Văn (thứ Ba), Anh (thứ Tư), Sử (thứ Năm); mỗi tối 2 tiếng.",
        "Cách 1: mỗi tối ôn đều 2 môn. Cách 2: ôn môn thi sớm trước, môn thi sau để cuối tuần.",
        "Chọn cách 2, Toán trước vì thi sớm nhất và còn nhiều dạng bài.",
        "Làm lại 3 bài trong đề cương Toán, bắt đầu lúc 19 giờ tối nay.",
        "Nếu không kịp: để phần Sử sang chiều Chủ nhật.",
      ]),
    },
    {
      id: "k3-slide-dia",
      sign: "tri-hoan",
      situation: "Một bạn có phần thuyết trình nhóm môn Địa nộp thứ Sáu nhưng chưa bắt đầu.",
      lines: lines(K3_WHY, [
        "Phần slide Địa của mình (4 trang), nộp thứ Sáu; tối nay và tối mai, mỗi tối 1 tiếng.",
        "Cách 1: tối nay làm hết 4 trang. Cách 2: tối nay tìm số liệu, tối mai làm slide.",
        "Chọn cách 2 vì tìm số liệu lâu nhất, làm trước cho chắc.",
        "Mở sách Địa, chép 3 số liệu chính, bắt đầu lúc 20 giờ.",
        "Nếu không kịp: nhắn nhóm trưởng xin thêm một ngày cho phần hình ảnh.",
      ]),
    },
    {
      id: "k3-van-nghe",
      sign: "ban-be",
      situation: "Một bạn vừa có bài tập nộp mai, vừa hứa tối nay tập văn nghệ với lớp.",
      lines: lines(K3_WHY, [
        "Bài tập 6 câu (nộp mai), tập văn nghệ 1 tiếng; tối nay có 2 tiếng rưỡi.",
        "Cách 1: đi tập trước rồi về làm bài. Cách 2: làm bài 1 tiếng trước rồi đi tập.",
        "Chọn cách 2 vì bài phải nộp mai, làm trước sẽ đỡ lo khi đi tập.",
        "Làm câu 1 và câu 2 lúc 18 giờ 30, sau bữa tối.",
        "Nếu không kịp: báo bạn lớp trưởng là mình đến muộn 15 phút.",
      ]),
    },
  ],
  K4: [
    {
      id: "k4-chia-thap-phan",
      sign: "ngai-nho",
      situation: "Một bạn chưa hiểu cách đặt tính chia số thập phân ở bài tập Toán.",
      lines: lines(K4_WHY, [
        "Chưa hiểu bước dời dấu phẩy khi chia số thập phân; đã xem lại ví dụ trong sách nhưng vẫn ra sai.",
        "Cô dạy Toán, giờ ra chơi, hỏi riêng ở bàn cô.",
        "\"Em chưa hiểu bước dời dấu phẩy khi chia số thập phân. Em đã xem lại ví dụ trong sách nhưng vẫn ra sai. Cô chỉ giúp em bước đó được không ạ?\"",
      ]),
    },
    {
      id: "k4-luc-ke",
      sign: "tu-ti",
      situation: "Một bạn không theo kịp phần thực hành khi làm nhóm môn Vật lý.",
      lines: lines(K4_WHY, [
        "Chưa biết đọc số trên lực kế; đã xem bạn làm 2 lần nhưng chưa tự làm được.",
        "Bạn nhóm trưởng, ngay trong giờ thực hành, hỏi nhỏ.",
        "\"Mình chưa đọc được số trên lực kế. Mình xem bạn làm rồi mà vẫn chưa chắc. Bạn chỉ mình làm một lần nữa được không?\"",
      ]),
    },
    {
      id: "k4-dan-y",
      sign: "gia-dinh",
      situation: "Một bạn bị trừ điểm bài Văn vì thiếu ý, muốn nhờ chị gái chỉ cách lập dàn ý.",
      lines: lines(K4_WHY, [
        "Bài Văn bị trừ điểm vì thiếu ý; đã đọc lời phê nhưng chưa biết lập dàn ý thế nào.",
        "Chị gái học lớp 11, tối thứ Bảy, nói trực tiếp ở nhà.",
        "\"Chị ơi, bài Văn của em bị trừ điểm vì thiếu ý. Em đọc lời phê rồi mà chưa biết lập dàn ý. Chị chỉ em cách lập dàn ý một bài được không?\"",
      ]),
    },
  ],
};

/** Cặp so sánh cho ô khó nhất của mỗi kỹ năng (hiện ở bước Hiểu). */
export const SKILL_CONTRAST: Record<SkillCode, SampleContrast> = {
  K1: {
    field: "Chuyện đã xảy ra",
    weak: "Mình dốt, lần nào cũng điểm kém.",
    better: "Mình được 4 điểm bài kiểm tra Anh hôm thứ Ba.",
    why: "\"Mình dốt\" là lời nhận xét về bản thân, không phải sự việc. Nó là suy nghĩ, viết ở ô \"Mình đang nghĩ\".",
  },
  K2: {
    field: "Cách làm dịu",
    weak: "Cố bình tĩnh lại.",
    better: "Thở chậm: hít vào 4, thở ra 6, làm 5 lần.",
    why: "\"Cố bình tĩnh\" chưa nói làm gì. Cách tốt có việc làm cụ thể và làm bao lâu hoặc mấy lần.",
  },
  K3: {
    field: "Các cách làm",
    weak: "Cố làm hết trong tối nay.",
    better: "Cách 1: làm hết tối nay. Cách 2: tối nay làm Toán, tối mai làm Văn.",
    why: "Chỉ có một cách thì chưa có gì để chọn. Nghĩ ít nhất hai cách rồi mới chọn.",
  },
  K4: {
    field: "Lời nhờ",
    weak: "\"Cô ơi em không hiểu gì hết.\"",
    better: "\"Em chưa hiểu bước tìm mẫu chung. Em đã làm lại 2 bài nhưng vẫn sai. Cô chỉ giúp em bước đó được không ạ?\"",
    why: "Câu chung chung khiến thầy cô không biết giúp chỗ nào. Nói rõ chỗ vướng thì được giúp đúng và nhanh.",
  },
};

const CASE_SIGN: Record<string, SampleSign> = {
  "Lo trước kiểm tra": "lo-kiem-tra",
  "Sợ sai": "so-sai",
  "Tự ti": "tu-ti",
  "Chán khi bài khó": "chan-bai-kho",
  "Trì hoãn": "tri-hoan",
  "Ngại nhờ giúp": "ngai-nho",
};

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

export function sampleSignOf(situation: string | null, caseCode: string | null): SampleSign | null {
  if (caseCode) {
    const c = PRACTICE_CASES.find((x) => x.code === caseCode);
    if (c && CASE_SIGN[c.sign]) return CASE_SIGN[c.sign];
  }
  if (!situation) return null;
  const t = ` ${fold(situation)} `;
  for (const [sign, re] of SIGN_WORDS) if (re.test(t)) return sign;
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
export function pickSample(skill: SkillCode, o: { situation: string | null; caseCode: string | null; rank: number }): SkillSample {
  const bank = SKILL_SAMPLES[skill];
  const sign = sampleSignOf(o.situation, o.caseCode);
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
export const fieldCount = (skill: SkillCode) => SKILLS[skill].fields.length;
