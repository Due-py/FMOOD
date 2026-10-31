// Bảng quy tắc xếp mức nguy cơ từ dấu hiệu AI đánh dấu (sửa tổng thể 31/10). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { levelFromSignals, NO_SIGNALS, SIGNAL_RULES, type Signals, type Stress } from "./signals";

const sig = (patch: Partial<Signals>): Signals => ({ ...NO_SIGNALS, ...patch });

test("không có dấu hiệu nào: bình thường, kể cả khi căng thẳng nặng (bị chê một lần, điểm kém…)", () => {
  for (const stress of ["nhe", "vua", "nang"] as Stress[]) assert.deepEqual(levelFromSignals(sig({ stress })), { level: "none", reasons: [] });
});

test("tự hại (rõ hay ám chỉ), bạo hành, nguy hiểm, làm hại người khác: khẩn cấp", () => {
  for (const s of [sig({ self_harm: "explicit" }), sig({ self_harm: "hint" }), sig({ abuse: true }), sig({ danger_now: true }), sig({ harm_others: true })]) {
    assert.equal(levelFromSignals(s).level, "urgent");
  }
});

test("bắt nạt lặp lại, làm nhục công khai, đe dọa / bị đánh, cô lập, không an toàn, tuyệt vọng, ăn uống: đáng lo", () => {
  for (const key of ["bullied_repeatedly", "humiliated_publicly", "threatened_or_hit", "excluded", "feels_unsafe", "hopeless", "eating_harm"] as const) {
    assert.equal(levelFromSignals(sig({ [key]: true })).level, "concern", key);
  }
});

test("nhiều dấu hiệu: lấy mức cao nhất, lý do mức cao đứng trước", () => {
  const r = levelFromSignals(sig({ bullied_repeatedly: true, self_harm: "hint" }));
  assert.equal(r.level, "urgent");
  assert.equal(r.reasons.length, 2);
  assert.match(r.reasons[0], /tự tử/);
});

test("HAI TRỤC: mức căng thẳng không bao giờ đổi mức nguy cơ", () => {
  const cases: Partial<Signals>[] = [{}, { self_harm: "hint" }, { bullied_repeatedly: true }, { hopeless: true }];
  for (const c of cases) {
    const levels = new Set((["nhe", "vua", "nang"] as Stress[]).map((stress) => levelFromSignals(sig({ ...c, stress })).level));
    assert.equal(levels.size, 1, JSON.stringify(c));
  }
});

test("mỗi dòng trong bảng có mã riêng và nhãn tiếng Việt", () => {
  assert.equal(new Set(SIGNAL_RULES.map((r) => r.id)).size, SIGNAL_RULES.length);
  for (const r of SIGNAL_RULES) assert.ok(r.label.length >= 8, r.id);
});
