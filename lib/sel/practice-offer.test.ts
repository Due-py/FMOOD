// Thẻ "Muốn luyện một kỹ năng không?" và panel trò chuyện. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_STATE, IN_FLOW_STATE, parseState } from "./engine";
import { isPanelEmpty, MIN_TURNS, practiceOffer, selPanel } from "./practice-offer";

const FLOW = { ...IN_FLOW_STATE, turns: MIN_TURNS };

test("chỉ hiện khi đã đồng ý gỡ từng bước, lượt thường, tới bước chọn cách", () => {
  assert.equal(practiceOffer("dua-lua-chon", EMPTY_STATE, false), null, "chưa vào mạch (chỉ kể / chưa mời)");
  assert.equal(practiceOffer("dua-lua-chon", FLOW, true), null, "lượt đáng lo: không thẻ");
  assert.equal(practiceOffer("hoi-suy-nghi", FLOW, false), null, "chưa tới bước chọn cách");
  assert.equal(practiceOffer("dua-lua-chon", { ...FLOW, offered: true }, false), null, "đã hiện cho chuyện này");
  assert.equal(practiceOffer("dua-lua-chon", { ...FLOW, turns: 1 }, false), null, "lượt đầu: quá sớm");
  assert.equal(practiceOffer("dua-lua-chon", { ...FLOW, declinedAt: 1 }, false), null, "đã chọn chỉ kể rồi mới hỏi cách làm");
  assert.ok(practiceOffer("dua-lua-chon", FLOW, false));
});

test("gợi ý tối đa 2 kỹ năng, theo điều học sinh đã nói", () => {
  const help = practiceOffer("loi-nho", FLOW, false)!;
  assert.equal(help[0].id, "ask_for_help");
  const many = practiceOffer("chot-buoc-nho", { ...FLOW, step: "ôn bài 1 tối nay", known: { emotion: "lo", thought: "mình dốt" } }, false)!;
  assert.equal(many.length, 2);
  assert.deepEqual(
    many.map((s) => s.id),
    ["plan_step_by_step", "calm_in_the_moment"],
  );
  assert.ok(many.every((s) => s.slug && s.name), "chỉ mang tên và đường dẫn kỹ năng");
});

test("đổi chuyện thì được hiện lại; trạng thái cũ không có cờ thì coi như chưa hiện", () => {
  assert.equal(parseState({ ...IN_FLOW_STATE, offered: undefined }).offered, false);
  assert.equal(parseState({ ...IN_FLOW_STATE, offered: true }).offered, true);
});

test("panel chỉ có điều học sinh đã xác nhận hoặc đã chọn, không có suy đoán", () => {
  const s = { ...IN_FLOW_STATE, known: { emotion: "lo", event: "kiểm tra Sinh" }, confirmed: { event: "kiểm tra Sinh" }, choice: "ôn từng bài", step: null, tried: [] };
  const p = selPanel(s);
  assert.deepEqual(p.confirmed, [{ label: "Chuyện xảy ra", text: "kiểm tra Sinh" }], "cảm xúc chưa xác nhận thì không hiện");
  assert.equal(p.choice, "ôn từng bài");
  assert.equal(isPanelEmpty(selPanel(EMPTY_STATE)), true);
});
