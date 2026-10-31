// BỘ ĐIỀU PHỐI SEL TRONG TRÒ CHUYỆN (hàm thuần, có test: engine.test.ts).
// Theo Hồ sơ bàn giao "SEL Dialogue Engine" của giáo viên tư vấn (31/10) và báo cáo đánh giá 31/10, mục F.
//
// Cách làm giống bài luyện (lib/practice/state.ts) và bảng quy tắc an toàn (lib/safety/signals.ts):
//  1. AI NHẬN DIỆN lượt mới (cùng lời gọi AI an toàn, lib/safety/check.ts): học sinh vừa nói ra cảm xúc / cơ thể /
//     suy nghĩ / sự việc nào, muốn giải pháp, từ chối, vẫn sợ, đã thử, muốn nhờ người lớn, đổi chủ đề…
//  2. HÀM NÀY (quy tắc xác định) cập nhật trạng thái và chọn MỘT bước cho lượt này.
//  3. AI VIẾT LỜI theo đúng bước đó (một dòng "LƯỢT NÀY" thêm vào cuối lời dặn).
// Chữ AI viết không bao giờ đổi trạng thái. Trạng thái chỉ lưu điều HỌC SINH TỰ NÓI (không lưu suy luận của AI),
// mỗi ý tối đa 80 ký tự; lưu cùng cuộc trò chuyện (conversations.sel_state), xóa cùng cuộc trò chuyện.
// An toàn luôn đứng trước: mức đáng lo / khẩn cấp bỏ qua mọi bước SEL.
//
// MỜI VÀO MẠCH (Duy chọn 31/10 tối, "cách C"): mặc định là trò chuyện thường (chào hỏi, chuyện vui, chuyện phiếm không bị
// dẫn theo các bước). Khi học sinh kể một chuyện khó, trợ lý lắng nghe rồi hỏi xin phép "cùng gỡ từng bước hay chỉ muốn
// kể cho nhẹ lòng"; đồng ý mới vào mạch. Tự xin cách làm, muốn nhờ người lớn hoặc kể đã thử thì vào thẳng (đó đã là lời
// mời). Không nhận lời thì lắng nghe như bạn, không mời lại ngay. Đã đồng ý một lần thì chuyện khó sau vào thẳng.
//
// BA LỚP HIỂU (Duy chọn 31/10 khuya, theo góp ý "5 cải tiến"):
//  - điều học sinh ĐÃ NÓI (`known`): AI nhận diện chỉ chép lại lời học sinh, không suy luận;
//  - điều học sinh ĐÃ XÁC NHẬN (`confirmed`): sau bước "tóm tắt", học sinh nói đúng rồi;
//  - điều AI SUY LUẬN: KHÔNG lưu. Lời dặn ghi rõ ý nào đã xác nhận, ý nào chưa.
// Cách đã chọn, bước nhỏ đã chốt và việc đã thử được nhớ NGUYÊN VĂN (không chỉ "đã chọn") để lượt sau nhìn lại đúng việc đó.
// Mỗi bước có nhãn năng lực CASEL và kỹ năng K1–K4 (MOVE_SKILL) để thống kê và đánh giá; học sinh không thấy nhãn.
import type { RiskLevel } from "@/lib/safety/keywords";
import type { SkillCode } from "@/lib/skills";

export const SEL_MOVES = [
  "an-toan",
  "ho-tro-nguoi-lon",
  "dung-hoi",
  "theo-chu-de-moi",
  "loi-nho",
  "phan-tu",
  "dua-lua-chon",
  "chot-buoc-nho",
  "chap-nhan",
  "cong-nhan-su-viec",
  "lam-ro-cam-xuc",
  "hoi-co-the",
  "hoi-suy-nghi",
  "tom-tat",
  "hoi-lai",
  "xin-phep-xem-lai",
  "xem-lai-suy-nghi",
  "moi-vao",
  "lang-nghe",
  "mo",
] as const;
export type SelMove = (typeof SEL_MOVES)[number];

export const MOVE_LABEL: Record<SelMove, string> = {
  "an-toan": "Chuyển an toàn",
  "ho-tro-nguoi-lon": "Gợi ý người lớn (chuyện đáng lo)",
  "dung-hoi": "Dừng hỏi",
  "theo-chu-de-moi": "Theo chuyện mới",
  "loi-nho": "Chuẩn bị lời nhờ",
  "phan-tu": "Nhìn lại việc đã thử",
  "dua-lua-chon": "Đưa lựa chọn ứng phó",
  "chot-buoc-nho": "Chốt bước nhỏ",
  "chap-nhan": "Chấp nhận cảm xúc",
  "cong-nhan-su-viec": "Công nhận chuyện đã xảy ra",
  "lam-ro-cam-xuc": "Gọi tên cảm xúc",
  "hoi-co-the": "Nhận biết cơ thể",
  "hoi-suy-nghi": "Nhận ra suy nghĩ",
  "tom-tat": "Tóm tắt, hỏi mình hiểu đúng không",
  "hoi-lai": "Hỏi lại chỗ hiểu chưa đúng",
  "xin-phep-xem-lai": "Xin phép xem lại suy nghĩ",
  "xem-lai-suy-nghi": "Tách sự việc và dự đoán",
  "moi-vao": "Mời cùng gỡ từng bước",
  "lang-nghe": "Chỉ lắng nghe",
  mo: "Trò chuyện mở",
};

/** Năm năng lực SEL theo CASEL. */
export const CASEL = ["tu-nhan-thuc", "tu-quan-ly", "nhan-thuc-xa-hoi", "ky-nang-quan-he", "ra-quyet-dinh"] as const;
export type Casel = (typeof CASEL)[number];
export const CASEL_LABEL: Record<Casel, string> = {
  "tu-nhan-thuc": "Tự nhận thức",
  "tu-quan-ly": "Tự quản lý",
  "nhan-thuc-xa-hoi": "Nhận thức xã hội",
  "ky-nang-quan-he": "Kỹ năng quan hệ",
  "ra-quyet-dinh": "Ra quyết định có trách nhiệm",
};

/**
 * Nhãn của từng bước: năng lực CASEL bước đó luyện và kỹ năng F-Mood (K1 Nhận ra mình đang thế nào, K2 Làm dịu cảm xúc,
 * K3 Gỡ rối từng bước, K4 Tìm người giúp mình). Bước điều phối / an toàn không luyện kỹ năng nào: mảng rỗng, null.
 * Chỉ dùng cho thống kê và đánh giá, không hiện cho học sinh.
 */
export const MOVE_SKILL: Record<SelMove, { casel: Casel[]; skill: SkillCode | null }> = {
  "an-toan": { casel: [], skill: null },
  "ho-tro-nguoi-lon": { casel: ["ky-nang-quan-he"], skill: "K4" },
  "dung-hoi": { casel: [], skill: null },
  "theo-chu-de-moi": { casel: [], skill: null },
  "loi-nho": { casel: ["ky-nang-quan-he", "ra-quyet-dinh"], skill: "K4" },
  "phan-tu": { casel: ["tu-quan-ly", "ra-quyet-dinh"], skill: "K3" },
  "dua-lua-chon": { casel: ["tu-quan-ly", "ra-quyet-dinh"], skill: "K3" },
  "chot-buoc-nho": { casel: ["ra-quyet-dinh", "tu-quan-ly"], skill: "K3" },
  "chap-nhan": { casel: ["tu-quan-ly"], skill: "K2" },
  "cong-nhan-su-viec": { casel: ["tu-nhan-thuc"], skill: "K1" },
  "lam-ro-cam-xuc": { casel: ["tu-nhan-thuc"], skill: "K1" },
  "hoi-co-the": { casel: ["tu-nhan-thuc"], skill: "K1" },
  "hoi-suy-nghi": { casel: ["tu-nhan-thuc"], skill: "K1" },
  "tom-tat": { casel: ["tu-nhan-thuc"], skill: "K1" },
  "hoi-lai": { casel: ["tu-nhan-thuc"], skill: "K1" },
  "xin-phep-xem-lai": { casel: ["tu-nhan-thuc", "tu-quan-ly"], skill: "K2" },
  "xem-lai-suy-nghi": { casel: ["tu-nhan-thuc", "tu-quan-ly"], skill: "K2" },
  "moi-vao": { casel: [], skill: null },
  "lang-nghe": { casel: [], skill: null },
  mo: { casel: [], skill: null },
};

/** Điều AI nhận diện được trong TIN MỚI của học sinh (chuỗi rỗng = không có). */
export type SelExtract = {
  /** học sinh đang kể một chuyện khó với mình (cảm xúc khó chịu, việc làm mình khó xử); chào hỏi, chuyện vui, chuyện phiếm là false */
  difficulty: boolean;
  /** từ cảm xúc học sinh tự nói ra (lo, sợ, xấu hổ, buồn…) */
  emotion: string;
  /** từ cảm xúc có thể mang nhiều nghĩa hoặc chung chung (xấu hổ, khó chịu, tệ, không ổn): cần hỏi lại, chưa tính là đã biết */
  emotion_vague: boolean;
  /** học sinh nói chưa biết / không phân biệt được mình đang thấy gì */
  emotion_unsure: boolean;
  /** biểu hiện cơ thể học sinh tả (tim đập nhanh, tay run, đầu óc trống rỗng…) */
  body: string;
  /** suy nghĩ / điều học sinh đoán sẽ xảy ra */
  thought: string;
  /** suy nghĩ đó là dự đoán điều chưa xảy ra */
  thought_is_prediction: boolean;
  /** sự việc đã xảy ra */
  event: string;
  /** chuyện tiêu cực đã THẬT SỰ xảy ra với chính học sinh (từng bị cười, bị chê…) */
  happened_to_me: boolean;
  /** đồng ý với điều trợ lý vừa nói lại hoặc vừa xin phép */
  confirms: boolean;
  /** không đồng ý ("không phải", "không muốn") */
  declines: boolean;
  wants_solution: boolean;
  /** không muốn trả lời, muốn thôi hỏi */
  refuses: boolean;
  /** hiểu rồi nhưng vẫn sợ / vẫn không dám */
  still_afraid: boolean;
  /** vừa chọn một cách trợ lý đưa ra */
  chose_option: boolean;
  /** nội dung cách vừa chọn (chọn theo số thứ tự thì chép lại cách trợ lý đã đưa) */
  chosen_text: string;
  /** bước nhỏ học sinh vừa đồng ý làm (đồng ý bước trợ lý đề xuất thì chép lại bước đó) */
  agreed_step: string;
  /** việc học sinh kể đã thử */
  tried_text: string;
  /** cách học sinh nói không muốn làm */
  rejected_option: string;
  /** đã thử một việc: được hay chưa được */
  tried: "none" | "worked" | "not_worked";
  /** muốn nhờ thầy cô / người lớn, muốn người lớn biết */
  wants_adult: boolean;
  /** chuyển sang chuyện khác hẳn */
  topic_shift: boolean;
};

export const EMPTY_EXTRACT: SelExtract = {
  difficulty: false,
  emotion: "",
  emotion_vague: false,
  emotion_unsure: false,
  body: "",
  thought: "",
  thought_is_prediction: false,
  event: "",
  happened_to_me: false,
  confirms: false,
  declines: false,
  wants_solution: false,
  refuses: false,
  still_afraid: false,
  chose_option: false,
  chosen_text: "",
  agreed_step: "",
  tried_text: "",
  rejected_option: "",
  tried: "none",
  wants_adult: false,
  topic_shift: false,
};

/** Trạng thái một cuộc trò chuyện. `known`: chỉ điều học sinh TỰ NÓI (không có suy luận của AI). */
type Known = { emotion?: string; body?: string; thought?: string; event?: string };
const KNOWN_KEYS = ["emotion", "body", "thought", "event"] as const;

export type SelState = {
  v: 1;
  /** điều học sinh đã nói (nguyên ý học sinh, không có suy luận của AI) */
  known: Known;
  /** bản `known` học sinh đã xác nhận ở bước tóm tắt; một ý là "đã xác nhận" khi giống hệt ý đang có trong `known` */
  confirmed: Known;
  prediction: boolean;
  happened: boolean;
  consent: "yes" | "no" | null;
  rejected: string[];
  chosen: boolean;
  /** cách học sinh đã chọn, nguyên văn (null: chưa chọn) */
  choice: string | null;
  /** bước nhỏ đã chốt, nguyên văn */
  step: string | null;
  /** việc đã thử và kết quả (tối đa 3, cũ trước) */
  tried: { what: string; result: "worked" | "not_worked" }[];
  /** "tro-chuyen": trò chuyện thường; "da-moi": vừa hỏi có muốn cùng gỡ từng bước; "trong-mach": học sinh đã đồng ý */
  mode: "tro-chuyen" | "da-moi" | "trong-mach";
  /** đã đồng ý vào mạch ít nhất một lần trong cuộc trò chuyện này: chuyện khó sau vào thẳng, không hỏi lại */
  agreed: boolean;
  /** số lượt đã qua (không bị cắt như `moves`) */
  turns: number;
  /** lượt học sinh không nhận lời mời (để không mời lại ngay); null = chưa */
  declinedAt: number | null;
  /** các bước đã đi, cũ trước (tối đa 30) */
  moves: SelMove[];
};

export const EMPTY_STATE: SelState = {
  v: 1,
  known: {},
  confirmed: {},
  prediction: false,
  happened: false,
  consent: null,
  rejected: [],
  chosen: false,
  choice: null,
  step: null,
  tried: [],
  mode: "tro-chuyen",
  agreed: false,
  turns: 0,
  declinedAt: null,
  moves: [],
};

/** Trạng thái khi học sinh đã đồng ý vào mạch (bộ thử mạch SEL bắt đầu từ đây). */
export const IN_FLOW_STATE: SelState = { ...EMPTY_STATE, mode: "trong-mach", agreed: true };

/** Không nhận lời mời thì bao nhiêu lượt sau mới được mời lại. */
export const INVITE_COOLDOWN = 4;
const MODES: SelState["mode"][] = ["tro-chuyen", "da-moi", "trong-mach"];

const MAX_TEXT = 80;
/** Các bước cho thấy đã cùng tìm hiểu suy nghĩ hoặc đã tới lúc ứng phó (điều kiện để xét "vẫn sợ"). */
const EXPLORED: SelMove[] = ["hoi-suy-nghi", "tom-tat", "xin-phep-xem-lai", "xem-lai-suy-nghi", "cong-nhan-su-viec", "chap-nhan", "dua-lua-chon", "chot-buoc-nho", "phan-tu"];
const clip = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
const count = (s: SelState, m: SelMove) => s.moves.filter((x) => x === m).length;
/** Đã biết ít nhất hai ý và còn ý chưa được xác nhận: tới lúc tóm tắt. */
const needsSummary = (s: SelState) => {
  const keys = KNOWN_KEYS.filter((k) => s.known[k]);
  return keys.length >= 2 && keys.some((k) => s.confirmed[k] !== s.known[k]);
};
/** Tin mới có nói thêm ý nào không (học sinh vừa sửa lại cho đúng). */
const saysMore = (x: SelExtract) => KNOWN_KEYS.some((k) => x[k].trim()) && !(x.emotion.trim() && !x.body && !x.thought && !x.event && (x.emotion_vague || x.emotion_unsure));

/** Đọc trạng thái đã lưu (sai dạng thì bắt đầu lại, không lỗi). */
export function parseState(raw: unknown): SelState {
  if (!raw || typeof raw !== "object" || (raw as { v?: unknown }).v !== 1) return EMPTY_STATE;
  const r = raw as Partial<SelState>;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? clip(v) : undefined);
  const knownOf = (o: unknown) => {
    const k = (o && typeof o === "object" ? o : {}) as Known;
    return Object.fromEntries(KNOWN_KEYS.map((key) => [key, text(k[key])]).filter(([, v]) => v !== undefined)) as Known;
  };
  const kept = knownOf(r.known);
  const moves = Array.isArray(r.moves) ? r.moves.filter((m): m is SelMove => (SEL_MOVES as readonly string[]).includes(m as string)).slice(-30) : [];
  // trạng thái lưu trước khi có lời mời: cuộc trò chuyện đã đi vào các bước thì coi như đã đồng ý
  const legacyInFlow = r.mode === undefined && moves.some((m) => m !== "mo");
  return {
    v: 1,
    known: kept,
    confirmed: knownOf(r.confirmed),
    prediction: r.prediction === true,
    happened: r.happened === true,
    consent: r.consent === "yes" || r.consent === "no" ? r.consent : null,
    rejected: Array.isArray(r.rejected) ? r.rejected.filter((x): x is string => typeof x === "string").map(clip).slice(-5) : [],
    chosen: r.chosen === true,
    choice: text(r.choice) ?? null,
    step: text(r.step) ?? null,
    tried: Array.isArray(r.tried)
      ? r.tried
          .filter((t): t is SelState["tried"][number] => Boolean(t) && typeof t.what === "string" && (t.result === "worked" || t.result === "not_worked"))
          .map((t) => ({ what: clip(t.what), result: t.result }))
          .slice(-3)
      : [],
    mode: MODES.includes(r.mode as SelState["mode"]) ? (r.mode as SelState["mode"]) : legacyInFlow ? "trong-mach" : "tro-chuyen",
    agreed: r.agreed === true || legacyInFlow,
    turns: typeof r.turns === "number" && r.turns >= 0 ? Math.floor(r.turns) : moves.length,
    declinedAt: typeof r.declinedAt === "number" ? r.declinedAt : null,
    moves,
  };
}

/** Ghép điều học sinh vừa nói vào trạng thái (ý mới thay ý cũ cùng loại). */
function merge(s: SelState, x: SelExtract, last: SelMove | undefined): SelState {
  // đổi chuyện: bỏ các ý của chuyện cũ, giữ chế độ và lời đồng ý
  const base = x.topic_shift ? { ...EMPTY_STATE, moves: s.moves, mode: s.mode, agreed: s.agreed, turns: s.turns, declinedAt: s.declinedAt } : s;
  const known = { ...base.known };
  // từ cảm xúc mơ hồ ("xấu hổ" có thể là sợ bị đánh giá…) chưa tính là đã biết: hỏi lại cho rõ (góp ý tư vấn 31/10)
  if (x.emotion.trim() && !x.emotion_vague && !x.emotion_unsure) known.emotion = clip(x.emotion);
  if (x.body.trim()) known.body = clip(x.body);
  if (x.thought.trim()) known.thought = clip(x.thought);
  if (x.event.trim()) known.event = clip(x.event);
  let consent = base.consent;
  if (last === "xin-phep-xem-lai" && x.confirms) consent = "yes";
  if (last === "xin-phep-xem-lai" && x.declines) consent = "no";
  // học sinh nói "đúng rồi" sau bản tóm tắt: các ý đang có thành đã xác nhận
  const confirmed = last === "tom-tat" && x.confirms && !x.declines ? { ...known } : base.confirmed;
  const chose = x.chose_option || (last === "dua-lua-chon" && x.confirms);
  const choice = chose && x.chosen_text.trim() ? clip(x.chosen_text) : base.choice;
  const step = x.agreed_step.trim() ? clip(x.agreed_step) : base.step;
  // việc đã thử: lời học sinh kể; không kể rõ thì là bước đã chốt / cách đã chọn
  const what = x.tried_text.trim() ? clip(x.tried_text) : (step ?? choice ?? "");
  const tried = x.tried !== "none" && what ? [...base.tried, { what, result: x.tried }].slice(-3) : base.tried;
  return {
    ...base,
    known,
    confirmed,
    choice,
    step,
    tried,
    prediction: base.prediction || (x.thought_is_prediction && Boolean(known.thought)),
    happened: base.happened || x.happened_to_me,
    consent,
    rejected: x.rejected_option.trim() ? [...base.rejected, clip(x.rejected_option)].slice(-5) : base.rejected,
    chosen: base.chosen || chose,
  };
}

/**
 * Một lượt: cập nhật trạng thái và chọn bước. `risk` là mức nguy cơ của bảng quy tắc an toàn.
 * Thứ tự quy tắc là thứ tự ưu tiên (báo cáo 31/10, mục F.3).
 */
export function selStep(state: SelState, extract: SelExtract, risk: RiskLevel): { move: SelMove; state: SelState } {
  // trả lời lời mời ("gỡ từng bước hay chỉ kể") là chọn cách trò chuyện, không phải chọn cách ứng phó hay xin cách làm
  // (thử thật 31/10: "ừ, mình muốn cùng gỡ từng bước" bị hiểu là đã chọn một cách, rồi là muốn giải pháp ngay)
  const x =
    state.mode === "da-moi"
      ? { ...extract, chose_option: false, chosen_text: "", wants_solution: extract.wants_solution && !extract.confirms }
      : extract;
  const last = state.moves.at(-1);
  const s = merge(state, x, last);
  // bước trong mạch (học sinh đã đồng ý)
  const pick = (): SelMove => {
    if (x.refuses) return "dung-hoi";
    if (x.topic_shift) return "theo-chu-de-moi";
    if (x.wants_adult) return "loi-nho";
    if (x.tried !== "none") return last === "phan-tu" ? "dua-lua-chon" : "phan-tu";
    if (x.rejected_option.trim()) return "dua-lua-chon";
    // "vẫn sợ" chỉ có nghĩa khi đã cùng tìm hiểu suy nghĩ (nói sợ lần đầu là lúc khám phá, chưa phải lúc chấp nhận)
    if (x.still_afraid && s.moves.some((m) => EXPLORED.includes(m))) return last === "chap-nhan" ? "chot-buoc-nho" : "chap-nhan";
    if (x.chose_option || (last === "dua-lua-chon" && x.confirms)) return "chot-buoc-nho";
    if (x.wants_solution) return "dua-lua-chon";
    if (x.happened_to_me && last !== "cong-nhan-su-viec") return "cong-nhan-su-viec";
    // bản tóm tắt chưa đúng: học sinh đã sửa luôn thì tóm tắt lại, chưa thì hỏi chỗ nào chưa đúng
    if (last === "tom-tat" && x.declines) return saysMore(x) && count(s, "tom-tat") < 2 ? "tom-tat" : "hoi-lai";
    if (last === "hoi-lai" && count(s, "tom-tat") < 2) return "tom-tat";
    if (last === "xin-phep-xem-lai") return s.consent === "yes" ? "xem-lai-suy-nghi" : s.consent === "no" ? "chap-nhan" : "xin-phep-xem-lai";
    // tiến trình theo điều còn thiếu; đã biết thì không hỏi lại, hỏi đủ số lần thì đi tiếp
    // gọi tên cảm xúc: tối đa 2 lần, và không quay lại khi học sinh đã kể sang cơ thể hay suy nghĩ
    if (!s.known.emotion && !s.known.body && !s.known.thought && count(s, "lam-ro-cam-xuc") < 2) return "lam-ro-cam-xuc";
    if (!s.known.body && !s.known.thought && count(s, "hoi-co-the") < 1) return "hoi-co-the";
    if (!s.known.thought && count(s, "hoi-suy-nghi") < 2) return "hoi-suy-nghi";
    // nói lại điều đã nghe và hỏi "mình hiểu đúng không" trước khi xem lại suy nghĩ hay đưa cách ứng phó
    if (needsSummary(s) && count(s, "tom-tat") < 2) return "tom-tat";
    if (s.prediction && !s.happened && s.consent === null && count(s, "xin-phep-xem-lai") < 1) return "xin-phep-xem-lai";
    if (s.consent === "yes" && count(s, "xem-lai-suy-nghi") < 1) return "xem-lai-suy-nghi";
    if (!s.chosen && count(s, "dua-lua-chon") < 2) return "dua-lua-chon";
    if (s.chosen && count(s, "chot-buoc-nho") < 1) return "chot-buoc-nho";
    return "mo";
  };
  // cổng vào mạch: an toàn trước, rồi trò chuyện thường / đã mời / trong mạch
  const gate = (): { move: SelMove; patch: Partial<SelState> } => {
    if (risk === "urgent") return { move: "an-toan", patch: {} };
    if (risk === "concern") return { move: "ho-tro-nguoi-lon", patch: {} };
    const enter = { mode: "trong-mach" as const, agreed: true };
    if (s.mode === "trong-mach") {
      // đổi sang chuyện không khó: theo chuyện mới và về trò chuyện thường
      if (x.topic_shift && !x.difficulty) return { move: "theo-chu-de-moi", patch: { mode: "tro-chuyen" } };
      return { move: pick(), patch: {} };
    }
    if (s.mode === "da-moi") {
      if (x.confirms || x.wants_solution) return { move: pick(), patch: enter };
      // không nhận lời, hoặc kể tiếp mà không nói có: lắng nghe, chưa mời lại
      return { move: "lang-nghe", patch: { mode: "tro-chuyen", declinedAt: s.turns } };
    }
    if (x.refuses) return { move: "dung-hoi", patch: {} };
    // tự xin cách làm, muốn nhờ người lớn, kể đã thử: đó đã là lời mời
    if (x.wants_solution || x.wants_adult || x.tried !== "none") return { move: pick(), patch: enter };
    if (x.difficulty) {
      if (s.agreed) return { move: pick(), patch: { mode: "trong-mach" } };
      const cooling = s.declinedAt !== null && s.turns - s.declinedAt < INVITE_COOLDOWN;
      return cooling ? { move: "mo", patch: {} } : { move: "moi-vao", patch: { mode: "da-moi" } };
    }
    return { move: "mo", patch: {} };
  };
  const { move, patch } = gate();
  return { move, state: { ...s, ...patch, turns: s.turns + 1, moves: [...s.moves, move].slice(-30) } };
}

const INSTRUCTION: Record<SelMove, string> = {
  "an-toan": "",
  "ho-tro-nguoi-lon": "",
  mo: "",
  "moi-vao":
    "Bạn ấy vừa kể một chuyện khó. Lượt này CHỈ lắng nghe và ghi nhận cảm xúc thật ngắn: không phân tích, không hỏi chi tiết, không đưa cách làm. Rồi hỏi MỘT câu xin phép để bạn ấy chọn: muốn cùng gỡ chuyện này từng bước, hay chỉ muốn kể cho nhẹ lòng thôi. Nói rõ chọn cách nào cũng được.",
  "lang-nghe":
    "Bạn ấy chưa muốn gỡ từng bước: tôn trọng điều đó, lắng nghe như một người bạn, phản hồi cảm xúc, không dẫn theo các bước, không đưa cách làm khi chưa được hỏi, không mời lại. Có thể hỏi MỘT câu mở để bạn ấy kể tiếp nếu muốn (ví dụ \"bạn muốn kể thêm không?\"); không hỏi để phân tích cảm xúc, cơ thể hay suy nghĩ.",
  "lam-ro-cam-xuc":
    "Giúp bạn ấy gọi tên cảm xúc: hỏi MỘT câu, đưa 2–3 lựa chọn CHỈ gồm cảm xúc (ví dụ lo, sợ, xấu hổ, buồn, thất vọng) và cho phép \"chưa rõ\". Không đưa suy nghĩ hay biểu hiện cơ thể vào các lựa chọn này.",
  "hoi-co-the":
    "Hỏi MỘT câu về biểu hiện cơ thể lúc đó (tim đập nhanh, mặt nóng, tay run, đầu óc trống rỗng…), cho phép \"không rõ\". Nếu cần, nói ngắn đây là phản ứng thường gặp khi lo, không phải bệnh.",
  "hoi-suy-nghi": "Hỏi MỘT câu về điều bạn ấy nghĩ hoặc đoán sẽ xảy ra lúc đó. Không tự đoán suy nghĩ thay bạn ấy.",
  "tom-tat":
    "Nói lại thật ngắn, bằng chính lời bạn ấy, những ý bạn ấy đã kể ở dưới (chỉ các ý đó, KHÔNG thêm điều bạn ấy chưa nói, không đoán nguyên nhân). Rồi hỏi MỘT câu: mình hiểu vậy có đúng không, có chỗ nào cần sửa không.",
  "hoi-lai":
    "Bạn ấy nói mình hiểu chưa đúng: xin lỗi ngắn, không bào chữa, không đoán lại. Hỏi MỘT câu: chỗ nào mình hiểu chưa đúng, hoặc bạn ấy muốn nói lại thế nào.",
  "xin-phep-xem-lai":
    "Bạn ấy đang lo trước một điều chưa xảy ra. Hỏi xin phép bằng MỘT câu: có muốn cùng tách điều đã thật sự xảy ra với điều đang lo sẽ xảy ra không. Chưa phân tích khi chưa được đồng ý.",
  "xem-lai-suy-nghi":
    "Bạn ấy đã đồng ý: cùng tách \"điều đã thật sự xảy ra\" với \"điều đang đoán\", nhẹ nhàng, không tranh luận, không chứng minh bạn ấy nghĩ sai. Kết thúc bằng MỘT câu hỏi để bạn ấy tự nhận ra.",
  "cong-nhan-su-viec":
    "Bạn ấy kể một chuyện đã thật sự xảy ra với mình: công nhận đó là chuyện thật, không bảo nghĩ lại, không nói \"có thể chỉ là tưởng tượng\". Hỏi MỘT câu: chuyện đó xảy ra một lần hay vẫn còn lặp lại; nếu bạn ấy đã nói rõ là lặp lại (hay, ngày nào cũng, toàn…) thì không hỏi lại điều đó mà hỏi nó ảnh hưởng tới bạn ấy thế nào.",
  "chap-nhan":
    "Bạn ấy vẫn sợ hoặc vẫn chưa dám: nói rằng nỗi sợ có thể vẫn còn và không cần hết sợ mới thử. Không thuyết phục, không nói \"đừng sợ\", \"hãy tự tin\". Hỏi MỘT câu xem bạn ấy có muốn chọn một bước rất nhỏ không.",
  "dua-lua-chon":
    "Đưa 2–3 cách ứng phó ngắn, khác nhau (ví dụ làm dịu cơ thể, chuẩn bị trước, tập với một người tin cậy), mỗi cách một dòng, để bạn ấy TỰ CHỌN; không chọn thay. Hỏi MỘT câu: bạn muốn thử cách nào.",
  "chot-buoc-nho":
    "Cùng chốt MỘT bước nhỏ, vừa sức, cụ thể (làm gì, lúc nào) theo cách bạn ấy đã chọn. Nhắc lần sau có thể tự hỏi: mình đã thử được gì, cảm xúc trước và sau khác nhau thế nào. Hỏi MỘT câu xem bước này có vừa sức không.",
  "phan-tu":
    "Bạn ấy vừa kể đã thử một việc (xem \"Việc bạn ấy đã thử\" ở dưới, nói đúng tên việc đó): ghi nhận việc đã làm, chưa làm được vẫn là đã cố gắng, không phán xét. Hỏi MỘT câu để nhìn lại lúc đó chuyện gì xảy ra, điều gì giúp / cản trở, hoặc lần sau muốn điều chỉnh gì. Lượt này chưa đưa cách mới.",
  "loi-nho":
    "Bạn ấy muốn nhờ thầy cô hoặc người lớn: hướng dẫn mở lời bằng khung tự điền ngắn (không viết hộ cả lời nhờ), nhắc có nút \"Cần giúp\" để tự gửi lời hẹn. Hỏi MỘT câu: bạn ấy muốn người đó biết đến đâu.",
  "dung-hoi": "Bạn ấy không muốn trả lời: tôn trọng, KHÔNG đặt câu hỏi nào trong lượt này. Nói ngắn rằng có thể dừng ở đây hoặc quay lại lúc nào cũng được.",
  "theo-chu-de-moi": "Bạn ấy vừa chuyển sang chuyện khác: đi theo chuyện mới, không kéo về chuyện cũ. Bắt đầu bằng ghi nhận cảm xúc, hỏi MỘT câu.",
};

/** Bước được phép hiện thẻ gợi ý kỹ năng (SKILL): chỉ khi đã tới lúc chọn cách ứng phó, không ở lượt đầu. */
export const SKILL_CARD_MOVES: SelMove[] = ["dua-lua-chon", "chot-buoc-nho", "loi-nho", "phan-tu"];

/** Số câu hỏi tối đa trong lượt (bộ kiểm tra đầu ra cắt phần hỏi thêm). */
export const maxQuestions = (move: SelMove | null): number => (move === "dung-hoi" ? 0 : 1);

/** Dòng "LƯỢT NÀY" thêm vào cuối lời dặn (rỗng: không thêm). */
export function moveInstruction(move: SelMove, s: SelState): string {
  const what = INSTRUCTION[move];
  if (!what) return "";
  const k = s.known;
  const NAME: Record<(typeof KNOWN_KEYS)[number], string> = { emotion: "cảm xúc", body: "cơ thể", thought: "suy nghĩ", event: "sự việc" };
  const facts = KNOWN_KEYS.filter((key) => k[key]).map(
    (key) => `${NAME[key]}: "${k[key]}" (${s.confirmed[key] === k[key] ? "đã xác nhận" : "bạn ấy nói, chưa xác nhận"})`,
  );
  const result = { worked: "làm được / có ích", not_worked: "chưa được" } as const;
  return [
    `LƯỢT NÀY (bộ điều phối SEL chọn, làm đúng bước này; vẫn theo mọi quy tắc ở trên): ${what}`,
    facts.length ? `Bạn ấy đã tự nói (không hỏi lại những ý này, không thêm điều bạn ấy chưa nói): ${facts.join("; ")}.` : "",
    s.choice ? `Cách bạn ấy đã chọn: "${s.choice}".` : "",
    s.step ? `Bước nhỏ đã chốt: "${s.step}".` : "",
    s.tried.length ? `Việc bạn ấy đã thử: ${s.tried.map((t) => `"${t.what}" (${result[t.result]})`).join("; ")}.` : "",
    s.rejected.length ? `Bạn ấy đã không muốn: ${s.rejected.map((r) => `"${r}"`).join(", ")}. Không đưa lại các cách này hay cách gần giống.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
