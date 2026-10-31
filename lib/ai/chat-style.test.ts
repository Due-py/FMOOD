// Nhân vật và tùy chọn trò chuyện (Bước 9.1): giá trị lạ trở về mặc định. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHARACTERS,
  DEFAULT_STYLE_SETTINGS,
  defaultStyle,
  normalizeStyle,
  normalizeStyleSettings,
  parseStyleInput,
  styleBlock,
  styleFromRef,
  styleRef,
} from "./chat-style";

test("mặc định theo kế hoạch: Sóc, Vừa phải, Đi thẳng vào vấn đề, Mình tự lo được", () => {
  assert.deepEqual(defaultStyle(), { character: "soc", length: "vua", guidance: "thang", motivation: "tu_lo" });
  assert.deepEqual(
    Object.values(CHARACTERS).map((c) => `${c.emoji} ${c.name}`),
    ["🐿️ Sóc", "🦉 Cú", "🐜 Kiến"],
  );
});

test("lựa chọn lạ hoặc thiếu trở về mặc định từng nhóm, không ném lỗi", () => {
  assert.deepEqual(normalizeStyle(null), defaultStyle());
  assert.deepEqual(normalizeStyle("cu"), defaultStyle());
  assert.deepEqual(normalizeStyle({ character: "may", length: 999, guidance: "chi_ra", extra: "x" }), {
    ...defaultStyle(),
    guidance: "chi_ra",
  });
  assert.deepEqual(normalizeStyle({ character: "kien", length: "chi_tiet", guidance: "suy_ngam", motivation: "deu_dan" }), {
    character: "kien",
    length: "chi_tiet",
    guidance: "suy_ngam",
    motivation: "deu_dan",
  });
});

test("admin đổi nhân vật mặc định: học sinh chưa chọn thấy nhân vật mới, học sinh đã chọn giữ lựa chọn", () => {
  const settings = normalizeStyleSettings({ characters: { default: "cu" } });
  assert.equal(normalizeStyle(null, settings).character, "cu");
  assert.equal(normalizeStyle({ character: "kien" }, settings).character, "kien");
});

test("cài đặt đã lưu thiếu mục hoặc sai: ghép với mặc định từng mục", () => {
  const s = normalizeStyleSettings({
    characters: { default: "rong", items: { cu: { tone: "Giọng Cú mới." } } },
    lengths: { default: "rat_dai", items: { ngan: "Ngắn mới." } },
    guidance: "sai kiểu",
  });
  assert.equal(s.characters.default, "soc");
  assert.equal(s.characters.items.cu.tone, "Giọng Cú mới.");
  assert.equal(s.characters.items.cu.intro, DEFAULT_STYLE_SETTINGS.characters.items.cu.intro);
  assert.equal(s.lengths.default, "vua");
  assert.equal(s.lengths.items.ngan, "Ngắn mới.");
  assert.equal(s.lengths.items.vua, DEFAULT_STYLE_SETTINGS.lengths.items.vua);
  assert.deepEqual(s.guidance, DEFAULT_STYLE_SETTINGS.guidance);
});

test("học sinh gửi lên: chỉ nhận đủ 4 nhóm hợp lệ", () => {
  assert.equal(parseStyleInput({ character: "soc", length: "vua", guidance: "thang" }), null);
  assert.equal(parseStyleInput({ character: "soc", length: "vua", guidance: "thang", motivation: "x" }), null);
  const ok = parseStyleInput({ character: "cu", length: "ngan", guidance: "thang", motivation: "tu_lo", hack: true });
  assert.deepEqual(ok, { character: "cu", length: "ngan", guidance: "thang", motivation: "tu_lo" });
  assert.equal(styleRef(ok!), "cu|ngan|thang|tu_lo");
  assert.deepEqual(styleFromRef("cu|ngan|thang|tu_lo"), ok);
  assert.equal(styleFromRef("cu|ngan"), null);
});

test("khối phong cách dùng câu chữ admin sửa và nhắc phong cách không đổi quy tắc", () => {
  const settings = normalizeStyleSettings({ guidance: { items: { suy_ngam: "HỎI GỢI MỞ." } } });
  const block = styleBlock({ character: "kien", length: "chi_tiet", guidance: "suy_ngam", motivation: "phan_thuong" }, settings);
  assert.ok(block.includes("Kiến 🐜") && block.includes("HỎI GỢI MỞ.") && block.includes("CHI TIẾT") && block.includes("phần thưởng nhỏ"));
  assert.match(block, /không quá 300 từ và không quá 6 tin nhắn/);
  assert.match(block, /không đổi quy tắc/);
});
