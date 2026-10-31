// Ngân hàng mẫu bốn kỹ năng: khớp từng ô, an toàn, chọn mẫu gần loại – khác bối cảnh, đổi mẫu giữa các lần. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { keywordCheck } from "@/lib/safety/keywords";
import { SKILL_CODES, SKILLS } from "@/lib/skills";
import { FIELD_SHORT, pickSample, reusesStudentDetails, SAMPLE_SIGNS, sampleSignOf, SKILL_CONTRAST, SKILL_SAMPLES } from "./skill-samples";

test("mỗi kỹ năng có 3–5 mẫu; mỗi mẫu đủ một dòng cho mỗi ô, có câu vì sao; nhãn ô khớp số ô", () => {
  for (const k of SKILL_CODES) {
    const n = SKILLS[k].fields.length;
    assert.equal(FIELD_SHORT[k].length, n, k);
    assert.ok(SKILL_SAMPLES[k].length >= 3 && SKILL_SAMPLES[k].length <= 5, k);
    for (const s of SKILL_SAMPLES[k]) {
      assert.equal(s.lines.length, n, s.id);
      assert.ok(SAMPLE_SIGNS.includes(s.sign), s.id);
      assert.match(s.situation, /^Một bạn /, s.id);
      for (const l of s.lines) assert.ok(l.text.trim().length >= 5 && l.why.trim().length >= 10, s.id);
    }
    assert.equal(new Set(SKILL_SAMPLES[k].map((s) => s.sign)).size, SKILL_SAMPLES[k].length, `${k}: mỗi mẫu một biểu hiện`);
    assert.ok(FIELD_SHORT[k].includes(SKILL_CONTRAST[k].field), `${k}: cặp so sánh gắn đúng một ô`);
  }
});

test("mẫu đầu tiên của mỗi kỹ năng là mẫu cũ (bộ đối chiếu kịch bản vẫn dùng mẫu cũ)", () => {
  for (const k of SKILL_CODES) assert.equal(SKILL_SAMPLES[k][0].situation, SKILLS[k].example.situation, k);
});

test("mọi chữ trong mẫu và cặp so sánh qua bộ lọc an toàn ở mức bình thường", () => {
  for (const k of SKILL_CODES) {
    const texts = [...SKILL_SAMPLES[k].flatMap((s) => [s.situation, ...s.lines.map((l) => l.text)]), SKILL_CONTRAST[k].weak, SKILL_CONTRAST[k].better];
    for (const t of texts) assert.equal(keywordCheck(t).level, "none", t);
  }
});

test("K3: mẫu nào cũng có hai cách làm (P0)", () => {
  for (const s of SKILL_SAMPLES.K3) assert.match(s.lines[1].text, /Cách 1[\s\S]*Cách 2/, s.id);
});

test("biểu hiện: lấy theo tình huống mẫu TL, hoặc đoán từ lời học sinh", () => {
  assert.equal(sampleSignOf(null, "TL01"), "lo-kiem-tra");
  assert.equal(sampleSignOf(null, "TL11"), "ngai-nho");
  assert.equal(sampleSignOf("đứa bên cạnh đang làm tôi rất bực mình", null), "ban-be");
  assert.equal(sampleSignOf("mẹ mắng mình vì điểm kém", null), "gia-dinh");
  assert.equal(sampleSignOf("hôm nay trời mưa", null), null);
});

test("chọn mẫu gần loại: bực với bạn bên cạnh (K2) → mẫu bực vì bị làm phiền lúc học, không phải mẫu đầu tiên", () => {
  const s = pickSample("K2", { situation: "đứa bên cạnh đang làm tôi rất bực mình", caseCode: null, rank: 0 });
  assert.equal(s.sign, "ban-be");
});

test("khác bối cảnh: không chọn mẫu trùng môn học với chuyện của học sinh", () => {
  // học sinh lo kiểm tra Sử: mẫu K1 "lo kiểm tra" nói về đề cương Sử nên bị bỏ
  const s = pickSample("K1", { situation: "mai kiểm tra Sử mà mình chưa thuộc bài", caseCode: null, rank: 0 });
  assert.notEqual(s.id, "k1-de-cuong-su");
});

test("đổi mẫu giữa các lần luyện; cùng đầu vào luôn ra cùng mẫu", () => {
  const ids = [0, 1, 2].map((rank) => pickSample("K1", { situation: null, caseCode: "TL03", rank }).id);
  assert.equal(new Set(ids).size, 3);
  assert.equal(pickSample("K1", { situation: null, caseCode: "TL03", rank: 1 }).id, ids[1]);
});

test("ví dụ AI: bắt được khi dùng lại môn học hoặc cụm chữ của học sinh", () => {
  assert.ok(reusesStudentDetails({ situation: "Một bạn lo kiểm tra Sử", lines: [] }, "mai kiểm tra Sử"));
  assert.ok(reusesStudentDetails({ situation: "Một bạn khác", lines: ["đứa bên cạnh đang làm mình khó chịu"] }, "đứa bên cạnh đang làm tôi rất bực mình"));
  assert.ok(!reusesStudentDetails({ situation: "Một bạn bị em trai làm ồn lúc học", lines: ["mình thấy bực"] }, "đứa bên cạnh đang làm tôi rất bực mình"));
});
