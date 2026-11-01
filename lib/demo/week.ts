// LỚP MẪU "7 NGÀY" cho chế độ trình diễn (hàm thuần: cùng hạt giống + cùng "bây giờ" → cùng dữ liệu).
// 20 bạn bắt đầu dùng F-Mood Demo 2.1 từ 7 ngày trước: ghi tâm trạng, trò chuyện với Sóc / Cú / Kiến,
// kể chuyện bận lòng, làm việc nhỏ, luyện 4 kỹ năng (H-M-T-G-N, góp ý, sửa lần 2), nhờ thầy cô.
// Mỗi bạn có một "kiểu" để số liệu trông thật: bạn chăm, bạn lo thi, bạn ngại hỏi, bạn ít dùng, bạn bỏ dở sau 2 ngày…
//
// Khác lớp mẫu 30 ngày (generate.ts): đăng nhập được bằng mã lớp + biệt danh + mật khẩu chung (scripts/demo/tao-lop-7-ngay.ts).
// KHÔNG có bài đo: phiếu bài đo dùng chung cả trường (một phiếu cho mỗi lần đo, mỗi đề), tạo phiếu mẫu sẽ chặn tạo phiếu thật.
// KHÔNG có câu nguy hiểm thật: mọi dòng chữ là chuyện thường ngày; week.test.ts cho mọi dòng chữ qua bộ lọc từ khóa an toàn.
import { addDays, dayKey } from "@/lib/dates";
import { legacyFromSubskill } from "@/lib/sel/legacy";
import { PRACTICE_CASES, SKILLS, type SkillId } from "@/lib/skills";
import { isStale, nextCheckAt, nextWorryState, type Feeling, type WorryStatus } from "@/lib/worries-shared";
import { DEMO_CODE_PREFIX } from "./shared";

export const WEEK_DAYS = 7;
export const WEEK_CLASS = { key: "8E", name: "8E (mẫu · 7 ngày)", grade: 8, teacher: "Cô Mai (mẫu)" } as const;

export type WeekInput = {
  now: Date;
  seed?: number;
  newId: () => string;
  /** cây trong khu vườn đang bật */
  plantIds: string[];
  /** việc nhỏ lớp thử thấy được: mã nội dung, chủ đề (null = dùng chung), mã HD */
  actions: { key: string; topic: string | null; code: string | null }[];
  /** mã bài thư viện đang đăng */
  lessons: string[];
  /** tư vấn viên mẫu đã có (sổ ghi dữ liệu mẫu) */
  counselorId: string;
  counselorName: string;
};

type Story = "chăm" | "thi" | "bạn bè" | "ngại hỏi" | "ít dùng" | "bỏ dở" | "nhân vật" | "muộn";
type Character = "soc" | "cu" | "kien";
type Row = Record<string, unknown>;

export type WeekStudent = {
  id: string;
  key: string;
  nickname: string;
  full_name: string;
  story: Story;
  join: number;
  created_at: string;
  garden_plant_id: string | null;
  chat_style: { character: Character; length: string; guidance: string; motivation: string } | null;
};

export type WeekData = {
  classRow: { id: string; code: string; name: string; grade: number; homeroom_teacher_id: string };
  teacher: { id: string; nickname: string };
  students: WeekStudent[];
  checkins: Row[];
  conversations: Row[];
  messages: Row[];
  message_feedback: Row[];
  worries: Row[];
  worry_checks: Row[];
  support_activity: Row[];
  badges_earned: Row[];
  habits: Row[];
  habit_logs: Row[];
  reflection_answers: Row[];
  help_requests: Row[];
  practice_sessions: Row[];
  practice_attempts: Row[];
  content_opens: Row[];
  student_activity_log: Row[];
  admin_audit: Row[];
};

// ───────── Số ngẫu nhiên có hạt giống ─────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
type Rng = () => number;
const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];
const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

// ───────── 20 bạn ─────────

/** Biệt danh dễ gõ khi đăng nhập trình diễn; kiểu của từng bạn. */
export const WEEK_PEOPLE: { nickname: string; story: Story }[] = [
  { nickname: "Mây Hồng", story: "chăm" },
  { nickname: "Gấu Bông", story: "chăm" },
  { nickname: "Cá Vàng", story: "chăm" },
  { nickname: "Bút Chì", story: "chăm" },
  { nickname: "Lá Xanh", story: "chăm" },
  { nickname: "Sao Băng", story: "thi" },
  { nickname: "Hạt Tiêu", story: "thi" },
  { nickname: "Bánh Mì", story: "thi" },
  { nickname: "Mèo Ú", story: "bạn bè" },
  { nickname: "Thỏ Trắng", story: "bạn bè" },
  { nickname: "Ốc Nhỏ", story: "ngại hỏi" },
  { nickname: "Chim Non", story: "ngại hỏi" },
  { nickname: "Củ Cải", story: "ít dùng" },
  { nickname: "Kẹo Gừng", story: "ít dùng" },
  { nickname: "Nấm Lùn", story: "ít dùng" },
  { nickname: "Dế Mèn", story: "bỏ dở" },
  { nickname: "Bông Gòn", story: "bỏ dở" },
  { nickname: "Tí Hon", story: "nhân vật" },
  { nickname: "Vịt Vàng", story: "nhân vật" },
  { nickname: "Ngọc Trai", story: "muộn" },
];

// ───────── Nội dung chữ (chuyện thường ngày) ─────────

const POSITIVE = ["vui", "hao-hung", "binh-yen", "biet-on"];
const NEUTRAL = ["binh-thuong", "met"];
const NEGATIVE: Record<string, string[]> = {
  "hoc-tap": ["lo-lang", "cang-thang", "met"],
  "ban-be": ["buon", "co-don", "tuc-gian"],
  "ban-than": ["met", "lo-lang", "buon"],
};

const USER_LINES: Record<string, string[]> = {
  "hoc-tap": [
    "Thứ Hai kiểm tra Toán mà mình chưa ôn xong chương phân thức",
    "Bài tập Văn nhiều quá, làm mãi chưa xong",
    "Mình sợ bị gọi lên bảng môn Lý",
    "Tối nay có ba bài phải nộp, không biết làm bài nào trước",
  ],
  "ban-be": ["Hôm nay mình với bạn thân giận nhau", "Làm bài nhóm mà các bạn không nghe ý mình", "Giờ ra chơi mình thấy hơi lạc lõng"],
  "ban-than": ["Dạo này mình khó ngủ", "Mình hay thức khuya xem điện thoại", "Mình thấy mình chậm hơn các bạn"],
  vui: ["Hôm nay mình được điểm 9 môn Sử!", "Cuối tuần mình được đi chơi với cả nhà", "Mình vừa làm xong hết bài tập trước 9 giờ"],
};
const FOLLOW_LINES = ["Ừ, đúng là vậy", "Chắc tại mình chưa biết bắt đầu từ đâu", "Mình thử rồi nhưng vẫn rối", "Cảm ơn nha, để mình thử"];

/** Câu trả lời mẫu theo giọng từng nhân vật (Sóc ấm áp, Cú điềm tĩnh, Kiến gọn gàng). */
const REPLIES: Record<Character, string[]> = {
  soc: [
    "Nghe bạn kể là thấy bạn đang lo lắm rồi. Phần nào làm bạn thấy khó nhất?",
    "Cảm ơn bạn đã kể với Sóc. Lúc đó bạn thấy trong người thế nào?",
    "Sóc vui cùng bạn nè! Điều gì làm bạn thấy vui nhất hôm nay?",
    "Mình thử chia nhỏ việc ra nhé: việc nào gần hạn nhất?",
  ],
  cu: [
    "Mình cùng nhìn lại từng phần nhé. Chuyện gì đã xảy ra trước?",
    "Bạn nghĩ điều gì đang làm mình lo nhất? Có cách nhìn nào khác không?",
    "Cú nghe rồi. Nếu bạn của bạn gặp chuyện này, bạn sẽ khuyên bạn ấy thế nào?",
    "Hay mình thử viết ra hai cách làm rồi so sánh xem cách nào hợp hơn?",
  ],
  kien: [
    "Rõ rồi. Mình làm từng bước: bước đầu tiên bạn làm được ngay là gì?",
    "Kiến gợi ý: thở chậm 4 nhịp, rồi làm câu dễ nhất trước.",
    "Bạn chọn một việc nhỏ làm trong 10 phút nhé. Xong thì báo Kiến!",
    "Tốt lắm. Lần sau gặp lại chuyện này, bạn sẽ làm gì đầu tiên?",
  ],
};
const WORRY_NOTES: Record<string, string[]> = {
  "hoc-tap": ["Kiểm tra Toán thứ Hai, mình chưa ôn xong", "Sợ bị gọi lên bảng môn Lý"],
  "ban-be": ["Mình với bạn thân giận nhau từ hôm thứ Ba", "Bài nhóm các bạn không nghe ý mình"],
  "ban-than": ["Dạo này mình hay thức khuya"],
};
const REFLECTION_QUESTIONS = ["Hôm nay điều gì làm bạn mỉm cười?", "Một việc nhỏ bạn làm tốt hôm nay là gì?", "Hôm nay bạn đã chăm sóc bản thân bằng cách nào?"];
const REFLECTION_ANSWERS = ["Được bạn cho mượn vở chép bài", "Mình làm xong bài tập trước 9 giờ tối", "Đi bộ với mẹ sau bữa tối", "Mình đã giơ tay phát biểu môn Sinh"];
const HABIT_CHOICES = [
  { title: "Đọc sách 10 phút", icon: "📖" },
  { title: "Đi ngủ trước 22h30", icon: "🌙" },
  { title: "Dọn góc học tập", icon: "🧹" },
];

// ───────── Bài luyện: bài làm lần 1, góp ý, lần 2 (đúng ô của từng kỹ năng) ─────────

type PracticeText = { caseCode: string; v1: Record<string, string>; v2: Record<string, string>; good: string; fix: string; question: string; nextTry: string };

/** Bài luyện mẫu chỉ có cho 4 mô-đun Demo 2 (dữ liệu trình diễn soạn trước 01/11); 5 mô-đun mới chưa có bài mẫu. */
type DemoSkill = "recognize_feelings_thoughts" | "calm_in_the_moment" | "plan_step_by_step" | "ask_for_help";

export const PRACTICE_TEXTS: Record<DemoSkill, PracticeText[]> = {
  recognize_feelings_thoughts: [
    {
      caseCode: "TL05",
      v1: { event: "Mình bị cô nhắc vì vở ghi thiếu bài, buồn ghê", feeling: "Buồn", thought: "Mình kém" },
      v2: {
        event: "Cô nhắc mình vì vở ghi thiếu bài hôm thứ Ba, bạn cùng bàn thì được khen",
        feeling: "Buồn, mặt nóng lên, không muốn mở vở",
        thought: "Mình lúc nào cũng cẩu thả hơn bạn",
        check: "Không chắc đúng: mình chỉ thiếu một bài vì hôm đó nghỉ ốm, các bài khác vẫn đủ",
      },
      good: "Bạn đã kể đúng sự việc và gọi tên được cảm xúc.",
      fix: "Phần sự việc đang lẫn cảm xúc (buồn ghê); thử tách riêng và viết rõ hơn suy nghĩ.",
      question: "Điều bạn nghĩ có chắc đúng không, có bằng chứng nào khác không?",
      nextTry: "Lần sau thấy buồn vì bị nhắc, mình viết ra 1 câu sự việc trước",
    },
    {
      caseCode: "TL03",
      v1: { event: "Mình biết câu trả lời nhưng không giơ tay", feeling: "Hồi hộp, tim đập nhanh", thought: "Nhỡ sai thì cả lớp cười" },
      v2: {
        event: "Giờ Sinh cô hỏi, mình biết câu trả lời nhưng không giơ tay",
        feeling: "Hồi hộp, tim đập nhanh, cúi mặt xuống",
        thought: "Nhỡ sai thì cả lớp cười mình",
        check: "Lần trước bạn Lan trả lời sai, cô chỉ sửa nhẹ, không ai cười",
      },
      good: "Bạn ghi được cả cảm giác trong cơ thể, rất rõ.",
      fix: "Thử kiểm tra lại suy nghĩ \"cả lớp cười\" bằng một lần thật đã xảy ra.",
      question: "Lần gần nhất có bạn trả lời sai, chuyện gì đã xảy ra?",
      nextTry: "Giờ Sinh tuần sau mình thử giơ tay một lần",
    },
    {
      caseCode: "TL06",
      v1: { event: "Mình ở nhóm toàn bạn giỏi", feeling: "Lo", thought: "Mình sẽ làm cả nhóm chậm" },
      v2: {
        event: "Mình được xếp vào nhóm Toán có ba bạn học giỏi",
        feeling: "Lo, ngại nói, ngồi im cả tiết",
        thought: "Mình sẽ làm cả nhóm chậm lại",
        check: "Chưa chắc: hôm qua mình vẫn giải đúng câu 2, nhóm cũng cần người ghi bài",
      },
      good: "Bạn nhận ra được việc mình làm khi lo (ngồi im), rất tốt.",
      fix: "Phần sự việc nên nói rõ hơn: nhóm nào, lúc nào.",
      question: "Bạn đã góp được việc gì cho nhóm rồi?",
      nextTry: "Buổi nhóm tới mình nhận phần ghi bài và nói ít nhất một ý",
    },
  ],
  // tình huống TL58–TL63 (Duy soạn 01/11) thay cho TL01, TL07, TL10
  calm_in_the_moment: [
    {
      caseCode: "TL58",
      v1: { goal: "Để ôn bài", method: "Thở", next: "Học" },
      v2: {
        goal: "Để đọc lại hai bài Sinh cho vào đầu",
        method: "Thở hộp 4 nhịp, làm 4 lần, khoảng 2 phút",
        next: "Đọc đề cương bài 12 trước vì ngắn hơn",
        fit: "Khá hợp, mình sẽ dùng trước giờ kiểm tra",
      },
      good: "Bạn chọn đúng một cách cụ thể để bình tĩnh lại.",
      fix: "Ghi rõ cách làm và làm trong bao lâu; việc tiếp theo nên là một việc nhỏ cụ thể.",
      question: "Sau khi bình tĩnh, bạn mở bài nào trước?",
      nextTry: "Trước giờ kiểm tra thứ Hai mình thở hộp 4 lần",
    },
    {
      caseCode: "TL59",
      v1: { goal: "Để làm tiếp bài hình", method: "Đi uống nước", next: "Làm lại" },
      v2: {
        goal: "Để làm tiếp bài hình mà không bực",
        method: "Đứng dậy uống nước, vươn vai 2 phút",
        next: "Vẽ lại hình cho to và ghi các dữ kiện đã cho",
        fit: "Hợp, mình hay bực khi bài khó",
      },
      good: "Bạn biết nghỉ ngắn rồi quay lại, đúng tinh thần kỹ năng này.",
      fix: "Việc đầu tiên sau khi bình tĩnh nên rõ hơn \"làm lại\".",
      question: "Khi quay lại bàn, bạn làm bước nào của bài hình trước?",
      nextTry: "Bài khó quá 15 phút thì mình nghỉ 2 phút rồi vẽ lại hình",
    },
    {
      caseCode: "TL63",
      v1: { goal: "Để học tiếp", method: "Nghỉ", next: "Học lại" },
      v2: {
        goal: "Để đọc tiếp bài Anh mà nhớ được",
        method: "Đứng dậy rửa mặt, vươn vai, nghỉ 10 phút không xem điện thoại",
        next: "Đọc lại đoạn đó một lần và gạch 3 ý chính",
        fit: "Hợp, hôm nào học thêm về muộn mình sẽ nghỉ trước rồi mới học",
      },
      good: "Bạn nhận ra mình đang mệt và cần nghỉ, rất thực tế.",
      fix: "Ghi rõ nghỉ bằng cách nào, bao lâu và việc đầu tiên khi quay lại.",
      question: "Khi quay lại bàn, bạn đọc phần nào trước?",
      nextTry: "Hôm nào mệt mình nghỉ 10 phút rồi mới mở sách",
    },
  ],
  plan_step_by_step: [
    {
      caseCode: "TL09",
      v1: { tasks: "Ba bài hạn thứ Sáu", options: "Làm hết tối nay", order: "Toán trước", first: "Làm Toán" },
      v2: {
        tasks: "Toán (bài tập chương 2), Văn (dàn ý), Sử (sơ đồ) đều nộp thứ Sáu; tối nay và tối mai mỗi tối có 1 tiếng rưỡi",
        options: "Cách 1: mỗi tối làm một bài rưỡi. Cách 2: tối nay làm Toán và dàn ý Văn, tối mai làm Sử",
        order: "Toán trước vì nhiều bài nhất và mình còn nhớ cách làm",
        first: "Làm câu 1 và 2 bài Toán lúc 19h30",
        backup: "Nếu không kịp, sơ đồ Sử làm vào giờ ra chơi thứ Năm",
      },
      good: "Bạn liệt kê đủ các việc cần làm.",
      fix: "Cần ít nhất hai cách làm để so sánh, và ghi thời gian bạn có.",
      question: "Nếu tối nay có việc đột xuất, bạn dời bài nào?",
      nextTry: "Tuần sau có nhiều bài cùng hạn mình viết ra hai cách rồi mới chọn",
    },
    {
      caseCode: "TL08",
      v1: { tasks: "Bài đọc Anh dài", options: "Tra từ điển; hỏi bạn", order: "Tra từ trước", first: "Tra từ" },
      v2: {
        tasks: "Bài đọc Anh 2 đoạn, mai nộp, tối nay có 45 phút",
        options: "Cách 1: tra hết từ mới rồi mới đọc. Cách 2: đọc lướt tìm ý chính trước, chỉ tra từ ở câu hỏi",
        order: "Cách 2 trước vì nhanh hơn, còn thời gian thì tra thêm",
        first: "Đọc câu đầu mỗi đoạn lúc 20h",
        backup: "Nếu vẫn không hiểu thì sáng mai hỏi bạn Minh trước giờ vào lớp",
      },
      good: "Bạn đã nghĩ ra hai cách khác nhau.",
      fix: "Ghi rõ lý do chọn cách nào trước và lúc nào bắt đầu.",
      question: "Cách nào giúp bạn kịp nộp hơn?",
      nextTry: "Bài đọc dài thì mình đọc lướt tìm ý chính trước",
    },
    {
      caseCode: "TL10",
      v1: { tasks: "Bài tập Lý", options: "Học ngay; học sau 9 giờ", order: "Học ngay", first: "Mở sách" },
      v2: {
        tasks: "Bài tập Lý 5 câu, mai có tiết; tối nay rảnh từ 19h đến 21h",
        options: "Cách 1: học ngay sau bữa tối. Cách 2: xem điện thoại 20 phút rồi mới học",
        order: "Cách 1 vì nếu cầm điện thoại thì mình hay quên giờ",
        first: "Làm câu 1 lúc 19h15, điện thoại để ngoài phòng khách",
        backup: "Không kịp thì làm 3 câu dễ, câu khó hỏi cô đầu giờ",
      },
      good: "Bạn so sánh được hai cách và biết vì sao chọn.",
      fix: "Bước đầu tiên nên ghi rõ giờ bắt đầu.",
      question: "Điều gì dễ làm bạn bỏ dở nhất?",
      nextTry: "Tối nào cũng bắt đầu bài khó nhất trước 19h30",
    },
  ],
  ask_for_help: [
    {
      caseCode: "TL11",
      v1: { stuck: "Không hiểu bài", who: "Cô Toán", request: "Cô giảng lại giúp em" },
      v2: {
        stuck: "Em chưa hiểu cách quy đồng phân thức bài tuần trước, em đã xem lại vở và ví dụ trong sách",
        who: "Cô Toán, giờ ra chơi tiết 3, hỏi riêng ở bàn cô",
        request: "Em chưa hiểu cách quy đồng phân thức ạ. Em đã xem lại ví dụ trong sách nhưng vẫn sai bước tìm mẫu chung. Cô chỉ giúp em bước đó được không ạ?",
      },
      good: "Bạn chọn đúng người có thể giúp.",
      fix: "Lời nhờ nên nói rõ chỗ vướng và việc bạn đã thử.",
      question: "Bạn muốn cô giúp đúng bước nào?",
      nextTry: "Thứ Ba mình hỏi cô Toán giờ ra chơi",
    },
    {
      caseCode: "TL12",
      v1: { stuck: "Bị điểm kém", who: "Thầy chủ nhiệm", request: "Thầy cho em ôn lại" },
      v2: {
        stuck: "Em được 5 điểm bài kiểm tra Hóa, sai nhiều ở phần cân bằng phương trình, em đã làm lại 3 câu sai",
        who: "Cô Hóa, sau tiết Hóa thứ Năm",
        request: "Em được 5 điểm bài kiểm tra vừa rồi ạ. Em đã làm lại 3 câu sai nhưng vẫn chưa chắc phần cân bằng. Cô gợi ý giúp em nên ôn lại dạng bài nào được không ạ?",
      },
      good: "Bạn dám nhắc đến điểm kém, đó là bước khó nhất.",
      fix: "Nên nhờ đúng thầy cô dạy môn đó và nói rõ bạn đã thử gì.",
      question: "Nếu cô hỏi \"em sai ở đâu\", bạn sẽ trả lời thế nào?",
      nextTry: "Sau tiết Hóa thứ Năm mình hỏi cô",
    },
    {
      caseCode: "TL04",
      v1: { stuck: "Sợ làm sai phần của nhóm", who: "Nhóm trưởng", request: "Bạn xem giúp mình" },
      v2: {
        stuck: "Mình làm phần số liệu của bài nhóm Địa, sợ tính sai tỉ lệ, đã tự kiểm lại một lần",
        who: "Bạn nhóm trưởng, nhắn tin tối nay",
        request: "Mình làm xong phần số liệu rồi nhưng chưa chắc phần tỉ lệ. Mình đã tính lại một lần. Bạn xem giúp mình bảng số 2 trước thứ Sáu được không?",
      },
      good: "Lời nhờ của bạn lịch sự và có thời hạn rõ.",
      fix: "Ghi thêm bạn đã tự kiểm tra gì để người giúp biết bắt đầu từ đâu.",
      question: "Bạn muốn nhóm trưởng xem phần nào trước?",
      nextTry: "Lần sau làm bài nhóm mình nhờ kiểm tra sớm 2 ngày",
    },
  ],
};

const ROLEPLAY = [
  { role: "student", text: "Thưa cô, em chưa hiểu bước tìm mẫu chung ạ." },
  { role: "teacher", text: "Ừ, em làm thử câu nào rồi? Cho cô xem bước em đang làm nhé. (vai thầy cô, mẫu)" },
  { role: "student", text: "Em làm câu 2, em không biết lấy mẫu nào ạ." },
  { role: "teacher", text: "Tốt, em hỏi rõ thế là cô biết giúp ngay. Mình phân tích mẫu thành nhân tử trước nhé. (mẫu)" },
] as const;

// ───────── Bộ tạo ─────────

export function buildWeek(input: WeekInput): WeekData {
  const { now, newId } = input;
  const seed = input.seed ?? 20261031;
  const today = dayKey(now);
  const nowMs = now.getTime();

  /** Ngày thứ t (0 = 7 ngày trước, 7 = hôm nay). */
  const dayOf = (t: number) => addDays(today, t - WEEK_DAYS);
  /** Một lúc trong ngày t (giờ Việt Nam); không bao giờ ở tương lai. */
  const stamp = (t: number, hour: number, minute = 0) => {
    const iso = new Date(`${dayOf(t)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`).getTime();
    return iso <= nowMs - 60_000 ? new Date(iso).toISOString() : null;
  };
  const plus = (iso: string, minutes: number) => new Date(Math.min(Date.parse(iso) + minutes * 60_000, nowMs - 60_000)).toISOString();
  const isWeekend = (t: number) => {
    const [y, m, d] = dayOf(t).split("-").map(Number);
    const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return w === 0 || w === 6;
  };

  const rngCode = mulberry32(seed ^ 0x77);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const teacher = { id: newId(), nickname: WEEK_CLASS.teacher };
  const classRow = {
    id: newId(),
    code: `${DEMO_CODE_PREFIX}${WEEK_CLASS.key}-${Array.from({ length: 4 }, () => pick(rngCode, alphabet.split(""))).join("")}`,
    name: WEEK_CLASS.name,
    grade: WEEK_CLASS.grade,
    homeroom_teacher_id: teacher.id,
  };
  const data: WeekData = {
    classRow,
    teacher,
    students: [],
    checkins: [],
    conversations: [],
    messages: [],
    message_feedback: [],
    worries: [],
    worry_checks: [],
    support_activity: [],
    badges_earned: [],
    habits: [],
    habit_logs: [],
    reflection_answers: [],
    help_requests: [],
    practice_sessions: [],
    practice_attempts: [],
    content_opens: [],
    student_activity_log: [],
    admin_audit: [],
  };

  // ── 20 bạn: lớp vào app tối ngày đầu (buổi hướng dẫn qua Zoom), một bạn vào muộn ──
  WEEK_PEOPLE.forEach((p, i) => {
    const rng = mulberry32(seed ^ hash(`hs-${i}`));
    const join = p.story === "muộn" ? 3 : 0;
    const character: Character = p.story === "nhân vật" ? (i % 2 ? "kien" : "cu") : rng() < 0.15 ? pick(rng, ["cu", "kien"] as const) : "soc";
    data.students.push({
      id: newId(),
      key: `${WEEK_CLASS.key}-${String(i + 1).padStart(2, "0")}`,
      nickname: p.nickname,
      full_name: `Học sinh mẫu ${WEEK_CLASS.key}-${String(i + 1).padStart(2, "0")}`,
      story: p.story,
      join,
      created_at: stamp(join, 19, 30 + (i % 20)) as string,
      garden_plant_id: input.plantIds.length ? input.plantIds[i % input.plantIds.length] : null,
      chat_style:
        character === "soc"
          ? null
          : { character, length: pick(rng, ["ngan", "vua"]), guidance: pick(rng, ["thang", "chi_ra", "suy_ngam"]), motivation: pick(rng, ["deu_dan", "tu_lo"]) },
    });
  });

  const firsts = new Map<string, Map<string, string>>();
  const first = (userId: string, badge: string, at: string) => {
    const m = firsts.get(userId) ?? new Map<string, string>();
    if (!m.has(badge) || Date.parse(at) < Date.parse(m.get(badge) as string)) m.set(badge, at);
    firsts.set(userId, m);
  };
  const log = (s: WeekStudent, kind: string, at: string, ref: string | null = null) =>
    data.student_activity_log.push({ user_id: s.id, class_id: classRow.id, kind, ref, created_at: at });
  const activity = (s: WeekStudent, kind: string, at: string, ref: string | null = null, worry_id: string | null = null) =>
    data.support_activity.push({ id: newId(), user_id: s.id, kind, ref, worry_id, day: dayKey(at), created_at: at });
  const actionsFor = (topic: string | null) => {
    const own = input.actions.filter((a) => a.topic === topic);
    return own.length ? own : input.actions.filter((a) => a.topic === null);
  };
  /** Học sinh mở rồi làm một việc nhỏ (gắn với chuyện bận lòng nếu có). */
  const tinyAction = (s: WeekStudent, rng: Rng, at: string, topic: string | null, worryId: string | null) => {
    const pool = actionsFor(topic);
    if (!pool.length) return;
    const a = pick(rng, pool);
    data.content_opens.push({ user_id: s.id, kind: "tiny_action", ref: a.key, created_at: at });
    const done = plus(at, between(rng, 3, 12));
    activity(s, "tiny_action_done", done, a.key, worryId);
    log(s, "action_done", done, a.code ?? a.key);
    first(s.id, "thu-viec-nho", done);
  };

  /** Chuyện bận lòng, đi qua đúng quy tắc hỏi lại của app (worries-shared). */
  const worry = (
    s: WeekStudent,
    rng: Rng,
    o: { at: string; topic: string; level: number; source: "checkin" | "chat"; path: { level: number; feeling: Feeling }[]; action?: boolean; told?: "parent" | "teacher" | "friend" },
  ) => {
    const id = newId();
    let state = { status: "open" as WorryStatus, levelStart: o.level, levelNow: o.level, checksCount: 0, nextCheckAt: nextCheckAt(new Date(o.at)) as Date | null };
    let updated = o.at;
    activity(s, "worry_saved", o.at, null, id);
    first(s.id, "dam-ke", o.at);
    if (o.action) tinyAction(s, rng, plus(o.at, between(rng, 5, 30)), o.topic, id);
    if (o.told) {
      const at = plus(o.at, between(rng, 60 * 18, 60 * 30));
      if (Date.parse(at) < nowMs - 120_000) {
        activity(s, "told", at, o.told, id);
        first(s.id, "cay-cau", at);
      }
    }
    for (const p of o.path) {
      if (state.status !== "open" || !state.nextCheckAt) break;
      // app chỉ hỏi khi đã tới hạn: trả lời trong buổi tối của ngày tới hạn
      const at = new Date(state.nextCheckAt.getTime() + between(rng, 30, 300) * 60_000).toISOString();
      if (Date.parse(at) > nowMs - 60_000) break;
      const next = nextWorryState(state, { level: p.level, feeling: p.feeling }, new Date(at));
      data.worry_checks.push({ id: newId(), worry_id: id, user_id: s.id, level: p.level, feeling: p.feeling, created_at: at });
      activity(s, "followup_answered", at, null, id);
      first(s.id, "quay-lai-hoi-tham", at);
      if (next.levelDropped) first(s.id, "nhe-long-hon", at);
      state = next;
      updated = at;
    }
    if (isStale(state, now)) state = { ...state, status: "stale" };
    data.worries.push({
      id,
      user_id: s.id,
      topic: o.topic,
      note: rng() < 0.6 ? pick(rng, WORRY_NOTES[o.topic] ?? WORRY_NOTES["hoc-tap"]) : null,
      level_start: o.level,
      level_now: state.levelNow,
      status: state.status,
      next_check_at: state.nextCheckAt?.toISOString() ?? null,
      checks_count: state.checksCount,
      source: o.source,
      created_at: o.at,
      updated_at: updated,
    });
    return id;
  };

  /** Một cuộc trò chuyện 2–3 lượt với nhân vật bạn ấy chọn; có thể có thẻ gợi ý kỹ năng và lượt chấm 👍/👎. */
  const chat = (s: WeekStudent, rng: Rng, at: string, topic: string, o: { source: string; guess?: boolean; skillCard?: SkillId; turns?: number }) => {
    const conv = newId();
    const character = s.chat_style?.character ?? "soc";
    const opening = pick(rng, USER_LINES[topic] ?? USER_LINES.vui);
    const turns = o.turns ?? between(rng, 2, 3);
    let t = at;
    log(s, "chat_start", t, o.source);
    for (let k = 0; k < turns; k++) {
      data.messages.push({ id: newId(), conversation_id: conv, role: "user", content: k === 0 ? opening : pick(rng, FOLLOW_LINES), created_at: t });
      log(s, "chat_message", t);
      t = plus(t, 1);
      const reply = { id: newId(), conversation_id: conv, role: "assistant", content: pick(rng, REPLIES[character]), created_at: t };
      data.messages.push(reply);
      if (rng() < 0.25) {
        const up = rng() < 0.85;
        data.message_feedback.push({ message_id: reply.id, user_id: s.id, rating: up ? 1 : -1, reason: up ? null : pick(rng, ["too_long", "not_helpful"]), created_at: t, updated_at: t });
      }
      t = plus(t, between(rng, 1, 4));
    }
    if (o.guess && topic !== "vui") activity(s, rng() < 0.85 ? "topic_guess_yes" : "topic_guess_no", plus(at, 2), topic);
    if (o.skillCard) {
      activity(s, "card_shown", t, `subskill:${o.skillCard}`);
      if (rng() < 0.6) activity(s, "card_clicked", plus(t, 1), `subskill:${o.skillCard}`);
    } else if (rng() < 0.3) {
      activity(s, "card_shown", t, "end");
      if (rng() < 0.5) activity(s, "card_clicked", plus(t, 1), "end:stop");
    }
    data.conversations.push({ id: conv, user_id: s.id, title: opening, source: o.source, created_at: at, updated_at: t });
  };

  /** Một bài luyện đi qua các bước H-M-T-G-N như trên trang Luyện kỹ năng. */
  const practice = (
    s: WeekStudent,
    rng: Rng,
    t: number,
    skill: DemoSkill,
    o: { outcome: "completed" | "in_progress" | "paused"; feedback?: boolean; revise?: boolean; followup?: "helped" | "hard" | "not_yet"; roleplay?: boolean; text?: number },
  ) => {
    const start = stamp(t, between(rng, 19, 21), between(rng, 0, 45));
    if (!start) return;
    const text = PRACTICE_TEXTS[skill][o.text ?? between(rng, 0, PRACTICE_TEXTS[skill].length - 1)];
    const id = newId();
    const caseCode = text.caseCode;
    log(s, "practice_open", start, `${skill}|${caseCode}`);
    let at = plus(start, between(rng, 4, 8));
    const ai: Record<string, number> = {};
    let step = "M";
    let state = o.outcome === "paused" ? "paused" : "in_progress";
    let feedbackCount = 0;
    let completedAt: string | null = null;
    let nextTry: string | null = null;
    if (o.outcome !== "paused") {
      const firstAnswers = o.revise ? text.v1 : text.v2;
      const attempt1: Row = { id: newId(), session_id: id, user_id: s.id, version: 1, answers: firstAnswers, feedback: null, roleplay: null, created_at: at };
      data.practice_attempts.push(attempt1);
      activity(s, "practice_done", at, skill);
      log(s, "practice_submit", at, skill);
      step = "G";
      if (o.feedback) {
        at = plus(at, between(rng, 1, 3));
        attempt1.feedback = { kind: "ai", good: text.good, fix: text.fix, question: text.question };
        feedbackCount = 1;
        activity(s, "practice_feedback", at, skill);
        log(s, "practice_feedback", at, skill);
      }
      let final = attempt1;
      if (o.revise) {
        at = plus(at, between(rng, 4, 9));
        final = { id: newId(), session_id: id, user_id: s.id, version: 2, answers: text.v2, feedback: null, roleplay: null, created_at: at };
        data.practice_attempts.push(final);
        activity(s, "practice_revised", at, skill);
        log(s, "practice_revise", at, skill);
      }
      if (o.roleplay && skill === "ask_for_help") {
        final.roleplay = ROLEPLAY.map((r) => ({ ...r }));
        ai.roleplay = 2;
      }
      if (o.outcome === "completed") {
        at = plus(at, between(rng, 2, 5));
        step = "N";
        state = "completed";
        completedAt = at;
        nextTry = text.nextTry;
        ai.reaction = 1;
        activity(s, "practice_completed", at, skill);
        log(s, "practice_complete", at, skill);
      } else {
        state = rng() < 0.5 ? "need_hint" : "in_progress";
        step = o.feedback ? "G" : "T";
      }
    }
    const row: Row = {
      id,
      user_id: s.id,
      // ghi như máy chủ ghi (lib/practice/server.ts insertSession): cột subskill, cột skill cũ cho 4 mô-đun có mã cũ
      subskill: skill,
      skill: legacyFromSubskill(skill),
      case_code: caseCode,
      own_situation: null,
      step,
      state,
      hint_count: o.outcome === "completed" ? between(rng, 0, 1) : between(rng, 0, 2),
      feedback_count: feedbackCount,
      stall_count: 0,
      ai_uses: ai,
      bridge: null,
      next_try: nextTry,
      completed_at: completedAt,
      created_at: start,
      updated_at: at,
      followup_used: null,
      next_time: null,
      followup_at: null,
    };
    // hỏi lại "đã dùng thật chưa" 1–3 ngày sau khi hoàn thành (Bước 4)
    if (completedAt && o.followup) {
      const fu = plus(completedAt, between(rng, 26, 50) * 60);
      if (Date.parse(fu) < nowMs - 120_000) {
        row.followup_used = o.followup;
        row.followup_at = fu;
        row.next_time = o.followup === "hard" ? "Lần sau mình sẽ làm sớm hơn một chút" : null;
        log(s, "practice_followup", fu, o.followup);
      }
    }
    data.practice_sessions.push(row);
  };

  const lessonOpen = (s: WeekStudent, rng: Rng, at: string) => {
    if (!input.lessons.length) return;
    data.content_opens.push({ user_id: s.id, kind: "lesson", ref: pick(rng, input.lessons), created_at: at });
  };

  // ── Hoạt động từng bạn ──
  for (const s of data.students) {
    const rng = mulberry32(seed ^ hash(s.key));
    const active = (t: number) => t >= s.join && (s.story !== "bỏ dở" || t <= 2);
    const p = { chăm: 0.85, thi: 0.75, "bạn bè": 0.7, "ngại hỏi": 0.65, "ít dùng": 0.3, "bỏ dở": 0.9, "nhân vật": 0.7, muộn: 0.8 }[s.story];
    const dip: { from: number; to: number; topic: string } | null =
      s.story === "thi" ? { from: 1, to: 4, topic: "hoc-tap" } : s.story === "bạn bè" ? { from: 2, to: 4, topic: "ban-be" } : null;

    // buổi hướng dẫn tối ngày đầu: cả lớp đăng nhập, ghi tâm trạng lần đầu, chọn nhân vật
    for (let t = s.join; t <= WEEK_DAYS; t++) {
      if (!active(t)) continue;
      const onboarding = t === s.join;
      const prob = onboarding ? 1 : isWeekend(t) ? p * 0.5 : p;
      if (rng() >= prob) continue;
      const loginAt = onboarding ? plus(s.created_at, between(rng, 1, 4)) : stamp(t, between(rng, 6, 21), between(rng, 0, 50));
      if (!loginAt) continue;
      log(s, "login", loginAt);
      const at = plus(loginAt, between(rng, 1, 5));
      const inDip = dip && t >= dip.from && t <= dip.to;
      const roll = rng();
      const group = inDip ? (roll < 0.7 ? "negative" : "neutral") : roll < 0.6 ? "positive" : roll < 0.85 ? "neutral" : "negative";
      const pool = group === "positive" ? POSITIVE : group === "neutral" ? NEUTRAL : NEGATIVE[dip?.topic ?? pick(rng, Object.keys(NEGATIVE))];
      const emotions = [pick(rng, pool)];
      if (rng() < 0.3) {
        const extra = pick(rng, group === "negative" ? [...pool, "met"] : POSITIVE);
        if (!emotions.includes(extra)) emotions.push(extra);
      }
      data.checkins.push({ id: newId(), user_id: s.id, emotions, created_at: at });
      log(s, "checkin", at);
      first(s.id, "goi-ten-cam-xuc", at);
      if (onboarding && s.chat_style) {
        const c = s.chat_style;
        activity(s, "style_changed", plus(at, 3), `${c.character}|${c.length}|${c.guidance}|${c.motivation}`);
      }
      if (rng() < (s.story === "ít dùng" ? 0.15 : 0.35)) lessonOpen(s, rng, plus(at, between(rng, 2, 20)));
      if (rng() < 0.12) log(s, "help_button", plus(at, 4));
    }

    const at = (t: number, h1 = 19, h2 = 21) => (active(t) ? stamp(t, between(rng, h1, h2), between(rng, 0, 50)) : null);
    const does = (t: number, fn: (when: string) => void, h1?: number, h2?: number) => {
      const when = at(t, h1, h2);
      if (when) fn(when);
    };

    switch (s.story) {
      case "chăm": {
        const order = [...(["recognize_feelings_thoughts", "calm_in_the_moment", "plan_step_by_step", "ask_for_help"] as DemoSkill[])].sort(() => rng() - 0.5);
        practice(s, rng, 1, order[0], { outcome: "completed", feedback: true, revise: true, followup: "helped" });
        practice(s, rng, 3, order[1], { outcome: "completed", feedback: true, revise: rng() < 0.6, followup: pick(rng, ["helped", "hard"]) });
        practice(s, rng, 5, order[2], { outcome: "completed", feedback: rng() < 0.7, revise: false, followup: "not_yet" });
        if (rng() < 0.6) practice(s, rng, 6, order[3], { outcome: rng() < 0.5 ? "completed" : "in_progress", feedback: true, revise: true, roleplay: true });
        if (rng() < 0.6) does(between(rng, 1, 6), (w) => chat(s, rng, w, "vui", { source: pick(rng, ["home", "checkin"]) }));
        break;
      }
      case "thi": {
        does(1, (w) => {
          chat(s, rng, w, "hoc-tap", { source: "checkin", guess: true, skillCard: "calm_in_the_moment" });
          worry(s, rng, {
            at: plus(w, 15),
            topic: "hoc-tap",
            level: between(rng, 3, 4),
            source: "chat",
            path: [{ level: 2, feeling: "better" }, { level: 1, feeling: "better" }],
            action: true,
            told: rng() < 0.5 ? "parent" : undefined,
          });
        });
        practice(s, rng, 2, "calm_in_the_moment", { outcome: "completed", feedback: true, revise: true, followup: "helped", text: 0 });
        practice(s, rng, 4, "plan_step_by_step", { outcome: "completed", feedback: true, revise: true, followup: pick(rng, ["helped", "hard"]), text: 0 });
        if (rng() < 0.5) practice(s, rng, 6, "recognize_feelings_thoughts", { outcome: "in_progress", feedback: false });
        does(5, (w) => chat(s, rng, w, "hoc-tap", { source: "worry" }));
        break;
      }
      case "bạn bè": {
        does(2, (w) => {
          chat(s, rng, w, "ban-be", { source: "home", guess: true, skillCard: "recognize_feelings_thoughts", turns: 3 });
          worry(s, rng, { at: plus(w, 20), topic: "ban-be", level: 3, source: "chat", path: [{ level: 2, feeling: "better" }], told: "friend" });
        });
        practice(s, rng, 3, "recognize_feelings_thoughts", { outcome: "completed", feedback: true, revise: true, followup: "helped", text: 0 });
        practice(s, rng, 5, "ask_for_help", { outcome: "completed", feedback: true, revise: false, text: 2 });
        break;
      }
      case "ngại hỏi": {
        practice(s, rng, 1, "ask_for_help", { outcome: "completed", feedback: true, revise: true, roleplay: true, followup: "helped", text: 0 });
        does(3, (w) => {
          const by = s.key.endsWith("11") ? "teacher" : "counselor";
          const helpAt = plus(w, 0);
          const repliedAt = plus(helpAt, between(rng, 40, 180));
          const replied = Date.parse(repliedAt) < nowMs - 120_000;
          const who = by === "teacher" ? teacher : { id: input.counselorId, nickname: input.counselorName };
          data.help_requests.push({
            id: newId(),
            student_id: s.id,
            class_id: classRow.id,
            nickname: s.nickname,
            full_name: s.full_name,
            to_role: by,
            when_pref: by === "teacher" ? "break" : "after_school",
            note: by === "teacher" ? "Cô giảng lại giúp em phần quy đồng phân thức được không ạ" : "Mình muốn hỏi cách bớt run khi bị gọi lên bảng",
            status: replied ? "replied" : "new",
            reply: replied ? (by === "teacher" ? "Giờ ra chơi tiết 3 em lên bàn cô nhé." : "Chiều thứ Năm 16h30 em ghé phòng tham vấn nhé.") : null,
            replied_by: replied ? who.id : null,
            replied_by_name: replied ? who.nickname : null,
            replied_at: replied ? repliedAt : null,
            created_at: helpAt,
          });
          log(s, "help_request", helpAt, by);
          if (replied) data.admin_audit.push({ actor_id: who.id, actor_name: who.nickname, action: "Trả lời lời nhờ giúp", detail: null, created_at: repliedAt });
        });
        practice(s, rng, 5, "calm_in_the_moment", { outcome: rng() < 0.6 ? "completed" : "in_progress", feedback: true, revise: false });
        break;
      }
      case "ít dùng":
        practice(s, rng, between(rng, 1, 4), pick(rng, ["recognize_feelings_thoughts", "calm_in_the_moment"] as DemoSkill[]), { outcome: rng() < 0.5 ? "in_progress" : "paused" });
        if (rng() < 0.6) does(between(rng, 2, 6), (w) => chat(s, rng, w, pick(rng, ["ban-than", "vui"]), { source: "home", guess: true, turns: 2 }));
        break;
      case "bỏ dở":
        practice(s, rng, 1, pick(rng, ["recognize_feelings_thoughts", "calm_in_the_moment", "plan_step_by_step"] as DemoSkill[]), { outcome: "paused" });
        does(1, (w) => worry(s, rng, { at: w, topic: "hoc-tap", level: 3, source: "checkin", path: [] }));
        break;
      case "nhân vật": {
        for (const [t, topic] of [[1, "ban-than"], [3, "hoc-tap"], [5, "vui"], [6, "hoc-tap"]] as const) {
          does(t, (w) => chat(s, rng, w, topic, { source: pick(rng, ["home", "starter", "checkin"]), guess: true, skillCard: topic === "hoc-tap" ? "plan_step_by_step" : undefined }), 20, 22);
        }
        practice(s, rng, 3, "plan_step_by_step", { outcome: "completed", feedback: true, revise: true, followup: "hard", text: 2 });
        practice(s, rng, 6, "calm_in_the_moment", { outcome: "completed", feedback: false, revise: false, text: 2 });
        break;
      }
      case "muộn":
        practice(s, rng, 4, "recognize_feelings_thoughts", { outcome: "completed", feedback: true, revise: true, text: 2 });
        practice(s, rng, 6, "plan_step_by_step", { outcome: "in_progress", feedback: true });
        break;
    }

    // thói quen riêng và câu trả lời suy ngẫm (riêng tư) của vài bạn chăm
    if (["chăm", "thi", "nhân vật"].includes(s.story) && rng() < 0.5) {
      const h = pick(rng, HABIT_CHOICES);
      const hid = newId();
      const startT = Math.max(s.join + 1, 1);
      const created = stamp(startT, 20, 10);
      if (created) {
        data.habits.push({ id: hid, user_id: s.id, title: h.title, icon: h.icon, archived: false, challenge_id: null, created_at: created });
        for (let t = startT; t <= WEEK_DAYS; t++) {
          const tick = stamp(t, 21, 0);
          if (tick && rng() < 0.6) data.habit_logs.push({ habit_id: hid, day: dayOf(t), created_at: tick });
        }
      }
    }
    for (const c of data.checkins.filter((x) => x.user_id === s.id)) {
      if (rng() < 0.15) {
        const created = c.created_at as string;
        data.reflection_answers.push({ id: newId(), user_id: s.id, question_text: pick(rng, REFLECTION_QUESTIONS), day: dayKey(created), answer: pick(rng, REFLECTION_ANSWERS), created_at: plus(created, 10) });
      }
    }
  }

  // mỗi ngày một câu suy ngẫm: giữ câu đầu tiên của ngày
  const seenDay = new Set<string>();
  data.reflection_answers = data.reflection_answers.filter((r) => {
    const k = `${r.user_id}|${r.day}`;
    if (seenDay.has(k)) return false;
    seenDay.add(k);
    return true;
  });

  // GVCN mẫu xem trang lớp vài lần (nhật ký thầy cô)
  for (const t of [1, 3, 5]) {
    const when = stamp(t, 7, 20);
    if (when) data.admin_audit.push({ actor_id: teacher.id, actor_name: teacher.nickname, action: "Xem tổng quan lớp", detail: WEEK_CLASS.name, created_at: when });
  }

  for (const [user_id, m] of firsts) for (const [badge_key, earned_at] of m) data.badges_earned.push({ user_id, badge_key, earned_at });
  data.student_activity_log.sort((a, b) => Date.parse(a.created_at as string) - Date.parse(b.created_at as string));
  return data;
}

/** Bài luyện mẫu có đủ ô bắt buộc và đúng mã tình huống của kỹ năng (dùng trong test). */
export function practiceTextProblems(): string[] {
  const problems: string[] = [];
  for (const [skill, texts] of Object.entries(PRACTICE_TEXTS) as [DemoSkill, PracticeText[]][]) {
    const required = SKILLS[skill].fields.filter((f) => f.required).map((f) => f.key);
    const known = new Set(SKILLS[skill].fields.map((f) => f.key));
    for (const t of texts) {
      const c = PRACTICE_CASES.find((x) => x.code === t.caseCode);
      if (!c?.skills.includes(skill)) problems.push(`${skill} ${t.caseCode}: tình huống không thuộc kỹ năng`);
      for (const v of [t.v1, t.v2]) {
        for (const k of required) if (!v[k]?.trim()) problems.push(`${skill} ${t.caseCode}: thiếu ô ${k}`);
        for (const k of Object.keys(v)) if (!known.has(k)) problems.push(`${skill} ${t.caseCode}: ô lạ ${k}`);
      }
    }
  }
  return problems;
}
