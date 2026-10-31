// NHÂN VẬT VÀ TÙY CHỌN TRÒ CHUYỆN (kế hoạch Demo 3, Bước 9)
// Học sinh chọn người trò chuyện (Sóc, Cú, Kiến) và cách trò chuyện: độ dài, cách dẫn dắt, động lực.
// Lựa chọn chỉ đổi GIỌNG VĂN và ĐỘ DÀI, không đổi quy tắc: an toàn, QT, HL và giới hạn khóa đứng sau và thắng khi mâu thuẫn.
// File này dùng chung cho máy chủ và trình duyệt (không đọc cơ sở dữ liệu).
//
// Admin sửa được: giọng điệu và câu giới thiệu của từng nhân vật, câu hướng dẫn từng mức, mức mặc định từng nhóm.
// Admin KHÔNG sửa được: tên, emoji của nhân vật, giới hạn độ dài (máy chủ giữ cố định ở LENGTH_CAPS).

// ───────────────────────── Nhân vật ─────────────────────────

export const CHARACTER_KEYS = ["soc", "cu", "kien"] as const;
export type CharacterKey = (typeof CHARACTER_KEYS)[number];

/** Tên và emoji cố định; `traits` là mô tả ngắn học sinh thấy khi chọn. */
export const CHARACTERS: Record<CharacterKey, { name: string; emoji: string; traits: string; tone: string }> = {
  soc: { name: "Sóc", emoji: "🐿️", traits: "Dí dỏm, vui vẻ, tràn năng lượng", tone: "bg-peach" },
  cu: { name: "Cú", emoji: "🦉", traits: "Thẳng thắn, sâu sắc, đi thẳng vấn đề", tone: "bg-lilac" },
  kien: { name: "Kiến", emoji: "🐜", traits: "Nhiệt tình, thực tế, hay gợi ý hành động", tone: "bg-mint" },
};

/** Nhân vật khi chưa có gì khác (admin chưa đặt mặc định, học sinh chưa chọn). */
export const FALLBACK_CHARACTER: CharacterKey = "soc";

/** Thông tin nhân vật gửi xuống giao diện. */
export type AssistantInfo = { key: CharacterKey; name: string; emoji: string };

export function assistantInfo(key: CharacterKey): AssistantInfo {
  return { key, name: CHARACTERS[key].name, emoji: CHARACTERS[key].emoji };
}

// ───────────────────────── Ba nhóm còn lại ─────────────────────────

export const LENGTH_KEYS = ["ngan", "vua", "chi_tiet"] as const;
export type LengthKey = (typeof LENGTH_KEYS)[number];

export const GUIDANCE_KEYS = ["thang", "suy_ngam", "chi_ra"] as const;
export type GuidanceKey = (typeof GUIDANCE_KEYS)[number];

export const MOTIVATION_KEYS = ["deu_dan", "phan_thuong", "tu_lo"] as const;
export type MotivationKey = (typeof MOTIVATION_KEYS)[number];

/** Tên mức học sinh thấy (cố định) và một dòng giải thích ngắn trong bảng chọn. */
export const LENGTH_LABEL: Record<LengthKey, { label: string; hint: string }> = {
  ngan: { label: "Ngắn gọn", hint: "1–2 tin, chỉ ý chính" },
  vua: { label: "Vừa phải", hint: "2–3 tin, đủ ý, không dài dòng" },
  chi_tiet: { label: "Chi tiết", hint: "3–6 tin, có ví dụ và các bước" },
};

export const GUIDANCE_LABEL: Record<GuidanceKey, { label: string; hint: string }> = {
  thang: { label: "Đi thẳng vào vấn đề", hint: "Nêu ngay ý chính hoặc một gợi ý cụ thể" },
  suy_ngam: { label: "Giúp mình suy ngẫm", hint: "Hỏi gợi mở để mình tự nghĩ" },
  chi_ra: { label: "Chỉ ra điều mình có thể chưa nhận ra", hint: "Nhẹ nhàng nói điều mình có thể bỏ sót" },
};

export const MOTIVATION_LABEL: Record<MotivationKey, { label: string; hint: string }> = {
  deu_dan: { label: "Theo dõi đều đặn", hint: "Việc nhỏ mỗi ngày, tự đánh dấu" },
  phan_thuong: { label: "Một phần thưởng nhỏ", hint: "Tự thưởng sau khi làm được" },
  tu_lo: { label: "Mình tự lo được", hint: "Chỉ gợi ý mục tiêu khi mình hỏi" },
};

/**
 * Giới hạn do máy chủ giữ (admin không sửa): số từ tối đa, số tin nhắn (bong bóng) tối đa,
 * và giới hạn token đầu ra khi gọi AI (gồm cả phần suy nghĩ của model, nên rộng hơn số từ).
 */
export const LENGTH_CAPS: Record<LengthKey, { words: number; messages: number; maxOutputTokens: number }> = {
  ngan: { words: 50, messages: 2, maxOutputTokens: 900 },
  vua: { words: 120, messages: 3, maxOutputTokens: 1200 },
  chi_tiet: { words: 300, messages: 6, maxOutputTokens: 2000 },
};

// ───────────────────────── Lựa chọn của học sinh ─────────────────────────

export type ChatStyle = { character: CharacterKey; length: LengthKey; guidance: GuidanceKey; motivation: MotivationKey };

export const STYLE_GROUPS = ["character", "length", "guidance", "motivation"] as const;
export type StyleGroup = (typeof STYLE_GROUPS)[number];

const KEYS: { [G in StyleGroup]: readonly ChatStyle[G][] } = {
  character: CHARACTER_KEYS,
  length: LENGTH_KEYS,
  guidance: GUIDANCE_KEYS,
  motivation: MOTIVATION_KEYS,
};

function isKey<G extends StyleGroup>(group: G, v: unknown): v is ChatStyle[G] {
  return typeof v === "string" && (KEYS[group] as readonly string[]).includes(v);
}

export const isCharacterKey = (v: unknown): v is CharacterKey => isKey("character", v);

// ───────────────────────── Cài đặt admin ─────────────────────────

export type CharacterSettings = { default: CharacterKey; items: Record<CharacterKey, { tone: string; intro: string }> };
export type OptionSettings<K extends string> = { default: K; items: Record<K, string> };

/** Toàn bộ cài đặt của 4 nhóm (4 khóa trong app_settings: style.characters, style.lengths, style.guidance, style.motivation). */
export type StyleSettings = {
  characters: CharacterSettings;
  lengths: OptionSettings<LengthKey>;
  guidance: OptionSettings<GuidanceKey>;
  motivation: OptionSettings<MotivationKey>;
};

export const DEFAULT_CHARACTER_SETTINGS: CharacterSettings = {
  default: "soc",
  items: {
    soc: {
      tone: "Hãy trò chuyện với phong cách: dí dỏm, vui vẻ, tràn năng lượng.",
      intro: "Chào bạn, mình là Sóc 🐿️! Mình thích trò chuyện vui vẻ và luôn sẵn sàng nghe bạn kể, chuyện lớn hay chuyện nhỏ đều được.",
    },
    cu: {
      tone: "Hãy trò chuyện với phong cách: thẳng thắn, sâu sắc, đi thẳng vấn đề.",
      intro: "Chào bạn, mình là Cú 🦉. Mình nói thẳng, ngắn gọn, và cùng bạn nghĩ cho rõ điều đang làm bạn bận lòng.",
    },
    kien: {
      tone: "Hãy trò chuyện với phong cách: nhiệt tình, thực tế, hay gợi ý những bước hành động nhỏ cụ thể.",
      intro: "Chào bạn, mình là Kiến 🐜. Mình hay gợi ý những bước nhỏ làm được ngay, để mọi chuyện nhẹ đi từng chút.",
    },
  },
};

export const DEFAULT_LENGTH_SETTINGS: OptionSettings<LengthKey> = {
  default: "vua",
  items: {
    ngan: "NGẮN GỌN — 1–2 tin nhắn, tổng cộng tối đa 2–3 câu ngắn; chỉ nêu ý chính hoặc 1 gợi ý quan trọng nhất.",
    vua: "VỪA PHẢI — thường 2–3 tin nhắn, mỗi tin nhắn 1–2 câu; rõ ràng, đủ ý nhưng không dài dòng. Chỉ giải thích sâu hơn khi học sinh hỏi thêm.",
    chi_tiet:
      "CHI TIẾT — đầy đủ hơn hẳn mức Vừa phải: 3–6 tin nhắn, mỗi tin nhắn 2–4 câu; giải thích vì sao, đưa ví dụ cụ thể hoặc các bước làm theo thứ tự.",
  },
};

export const DEFAULT_GUIDANCE_SETTINGS: OptionSettings<GuidanceKey> = {
  default: "thang",
  items: {
    thang:
      "Ghi nhận cảm xúc trước, rồi nêu ngay ý chính hoặc một gợi ý cụ thể, thực tế; nếu cần hỏi lại thì hỏi một câu hỏi cụ thể, dễ trả lời (VD: bạn muốn thử cách này không?), không hỏi vòng vo.",
    suy_ngam:
      "Giúp học sinh tự suy ngẫm: phản hồi lại điều học sinh vừa chia sẻ rồi đặt một câu hỏi gợi mở; chưa vội đưa lời khuyên, trừ khi học sinh hỏi thẳng.",
    chi_ra:
      'Nhẹ nhàng chỉ ra một điều học sinh có thể chưa nhận ra (một cảm xúc, một suy nghĩ lặp đi lặp lại, hay một điểm mạnh của bạn ấy), nói như một khả năng (VD: "Có vẻ như…", "Có thể là…") rồi hỏi xem học sinh thấy điều đó có đúng với mình không; không kết luận thay, không gắn nhãn hay chẩn đoán.',
  },
};

export const DEFAULT_MOTIVATION_SETTINGS: OptionSettings<MotivationKey> = {
  default: "tu_lo",
  items: {
    deu_dan:
      "Học sinh thích được theo dõi đều đặn: khi đề nghị mục tiêu, chọn một việc nhỏ làm hằng ngày và gợi ý một cách tự theo dõi đơn giản (VD: đánh dấu vào lịch hoặc sổ tay); nếu trong cuộc trò chuyện học sinh nhắc lại mục tiêu thì hỏi thăm tiến độ. Không hứa rằng ứng dụng sẽ tự gửi lời nhắc.",
    phan_thuong:
      "Khi đề nghị mục tiêu, gợi ý học sinh tự chọn một phần thưởng nhỏ, lành mạnh sau khi làm được (VD: nghe một bài hát yêu thích, đi dạo một vòng).",
    tu_lo:
      "Học sinh tự giác: chỉ đề nghị mục tiêu khi học sinh hỏi cách làm hoặc nói muốn thay đổi; không nhắc lại hay hối thúc mục tiêu đã đề nghị.",
  },
};

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  characters: DEFAULT_CHARACTER_SETTINGS,
  lengths: DEFAULT_LENGTH_SETTINGS,
  guidance: DEFAULT_GUIDANCE_SETTINGS,
  motivation: DEFAULT_MOTIVATION_SETTINGS,
};

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const text = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

function options<K extends string>(raw: unknown, keys: readonly K[], fallback: OptionSettings<K>): OptionSettings<K> {
  const r = obj(raw);
  const items = obj(r.items);
  return {
    default: (keys as readonly string[]).includes(r.default as string) ? (r.default as K) : fallback.default,
    items: Object.fromEntries(keys.map((k) => [k, text(items[k], fallback.items[k])])) as Record<K, string>,
  };
}

/**
 * Ghép cài đặt đã lưu với mặc định, từng mục một: thiếu mục nào (dữ liệu cũ, key mới thêm) thì dùng mặc định của mục đó;
 * mức mặc định không hợp lệ thì về mặc định trong mã.
 */
export function normalizeStyleSettings(raw: { characters?: unknown; lengths?: unknown; guidance?: unknown; motivation?: unknown }): StyleSettings {
  const c = obj(raw.characters);
  const items = obj(c.items);
  return {
    characters: {
      default: isCharacterKey(c.default) ? c.default : DEFAULT_CHARACTER_SETTINGS.default,
      items: Object.fromEntries(
        CHARACTER_KEYS.map((k) => {
          const it = obj(items[k]);
          const d = DEFAULT_CHARACTER_SETTINGS.items[k];
          return [k, { tone: text(it.tone, d.tone), intro: text(it.intro, d.intro) }];
        }),
      ) as CharacterSettings["items"],
    },
    lengths: options(raw.lengths, LENGTH_KEYS, DEFAULT_LENGTH_SETTINGS),
    guidance: options(raw.guidance, GUIDANCE_KEYS, DEFAULT_GUIDANCE_SETTINGS),
    motivation: options(raw.motivation, MOTIVATION_KEYS, DEFAULT_MOTIVATION_SETTINGS),
  };
}

/** Lựa chọn mặc định (học sinh chưa chọn gì) theo cài đặt admin. */
export function defaultStyle(settings: StyleSettings = DEFAULT_STYLE_SETTINGS): ChatStyle {
  return {
    character: settings.characters.default,
    length: settings.lengths.default,
    guidance: settings.guidance.default,
    motivation: settings.motivation.default,
  };
}

/**
 * Lựa chọn của học sinh (cột profiles.chat_style), đã kiểm tra: nhóm nào thiếu hoặc giá trị lạ
 * thì dùng mặc định của nhóm đó. Không bao giờ ném lỗi.
 */
export function normalizeStyle(raw: unknown, settings: StyleSettings = DEFAULT_STYLE_SETTINGS): ChatStyle {
  const r = obj(raw);
  const d = defaultStyle(settings);
  return {
    character: isKey("character", r.character) ? r.character : d.character,
    length: isKey("length", r.length) ? r.length : d.length,
    guidance: isKey("guidance", r.guidance) ? r.guidance : d.guidance,
    motivation: isKey("motivation", r.motivation) ? r.motivation : d.motivation,
  };
}

/** Kiểm tra lựa chọn học sinh gửi lên: chỉ nhận đủ 4 nhóm với giá trị có trong danh sách. */
export function parseStyleInput(raw: unknown): ChatStyle | null {
  const r = obj(raw);
  if (!isKey("character", r.character) || !isKey("length", r.length) || !isKey("guidance", r.guidance) || !isKey("motivation", r.motivation)) return null;
  return { character: r.character, length: r.length, guidance: r.guidance, motivation: r.motivation };
}

/** Mã ngắn của một tổ hợp (để đếm, không có nội dung): "cu|ngan|thang|tu_lo". */
export function styleRef(style: ChatStyle): string {
  return STYLE_GROUPS.map((g) => style[g]).join("|");
}

/** Đọc lại mã tổ hợp (styleRef); sai thì null. */
export function styleFromRef(ref: string | null | undefined): ChatStyle | null {
  if (!ref) return null;
  const [character, length, guidance, motivation] = ref.split("|");
  return parseStyleInput({ character, length, guidance, motivation });
}

/** Tên học sinh thấy của một lựa chọn trong một nhóm. */
export function optionLabel(group: StyleGroup, key: string): string {
  if (group === "character") return isCharacterKey(key) ? `${CHARACTERS[key].emoji} ${CHARACTERS[key].name}` : key;
  const labels = (group === "length" ? LENGTH_LABEL : group === "guidance" ? GUIDANCE_LABEL : MOTIVATION_LABEL) as Record<string, { label: string }>;
  return labels[key]?.label ?? key;
}

export const GROUP_LABEL: Record<StyleGroup, string> = {
  character: "Nhân vật",
  length: "Độ dài câu trả lời",
  guidance: "Cách dẫn dắt",
  motivation: "Động lực và mục tiêu",
};

// ───────────────────────── Phần 4 của lời dặn ─────────────────────────

/**
 * Khối PHONG CÁCH TRÒ CHUYỆN (phần 4 của lời dặn, lib/ai/prompts.ts): giọng điệu nhân vật, độ dài (kèm giới hạn
 * máy chủ giữ), cách dẫn dắt, động lực. Câu cuối nhắc phong cách không bao giờ thắng quy tắc.
 */
export function styleBlock(style: ChatStyle, settings: StyleSettings = DEFAULT_STYLE_SETTINGS): string {
  const c = CHARACTERS[style.character];
  const cap = LENGTH_CAPS[style.length];
  return `PHONG CÁCH TRÒ CHUYỆN (học sinh tự chọn)
- Nhân vật: ${c.name} ${c.emoji}. ${settings.characters.items[style.character].tone.trim()}
- Độ dài: ${settings.lengths.items[style.length].trim()}
- Giới hạn cứng: cả lượt trả lời không quá ${cap.words} từ và không quá ${cap.messages} tin nhắn. Tách các tin nhắn bằng MỘT dòng trống; không dùng tiêu đề, không gạch đầu dòng dài.
- Cách dẫn dắt: ${settings.guidance.items[style.guidance].trim()}
- Động lực và mục tiêu: ${settings.motivation.items[style.motivation].trim()}
- Phong cách chỉ đổi giọng văn và độ dài, không đổi quy tắc: khi phong cách mâu thuẫn với nguyên tắc an toàn, quy tắc QT, hướng dẫn HL hay giới hạn bắt buộc thì luôn làm theo quy tắc.`;
}
