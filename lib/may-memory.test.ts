// Kiểm tra phần dựng lời dặn về ghi nhớ / điều bận lòng / độ dài. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { lengthRule, MAX_OUTPUT_TOKENS, openerPrompt } from "./ai/prompts";
import { askedPermission, memoryPrompt, type Concern } from "./may-memory-shared";

const concern = (over: Partial<Concern> = {}): Concern => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Áp lực thi học kỳ",
  intensity: 7,
  status: "open",
  next_check_at: null,
  last_checked_at: null,
  created_at: "2026-10-09T03:00:00Z",
  ...over,
});

test("không có gì để nhớ thì không thêm gì vào lời dặn", () => {
  assert.equal(memoryPrompt([], []), "");
});

test("ghi nhớ và điều bận lòng xuất hiện trong lời dặn", () => {
  const out = memoryPrompt(
    [
      { kind: "address", content: "gọi là Duy" },
      { kind: "interest", content: "thích bóng đá" },
    ],
    [concern()],
  );
  assert.match(out, /Cách xưng hô: gọi là Duy/);
  assert.match(out, /thích bóng đá/);
  assert.match(out, /"Áp lực thi học kỳ": mức 7\/10/);
  assert.match(out, /\[11111111-1111-4111-8111-111111111111\]/);
});

test("điều bận lòng đã ổn thì không đưa vào lời dặn", () => {
  assert.equal(memoryPrompt([], [concern({ status: "resolved" })]), "");
});

test("độ dài trả lời đổi theo lựa chọn", () => {
  assert.match(lengthRule("short", 80), /35 từ/);
  assert.match(lengthRule("medium", 80), /80 từ/);
  assert.match(lengthRule("long", 80), /180 từ/);
  assert.ok(MAX_OUTPUT_TOKENS.short < MAX_OUTPUT_TOKENS.medium && MAX_OUTPUT_TOKENS.medium < MAX_OUTPUT_TOKENS.long);
});

test("lời mở đầu nhắc check-in và hỏi thăm điều bận lòng", () => {
  const out = openerPrompt({
    checkin: { emotions: ["Lo lắng 😟"], time: "08:15" },
    concerns: [{ title: "Cãi nhau với bạn thân", intensity: 6, date: "09/10" }],
  });
  assert.match(out, /Lo lắng/);
  assert.match(out, /2–3 câu/);
  assert.match(out, /Cãi nhau với bạn thân/);
});

test("chỉ lưu điều bận lòng khi Mây đã hỏi xin phép", () => {
  assert.ok(askedPermission("Bạn có muốn Mây ghi vào danh sách điều bận lòng để vài hôm nữa hỏi thăm không?"));
  assert.ok(askedPermission("Mây lưu lại chuyện này để vài hôm nữa hỏi thăm bạn nhé, được không?"));
  assert.ok(!askedPermission("Nghe có vẻ bạn đang rất mệt. Chuyện gì đã xảy ra vậy?"));
  assert.ok(!askedPermission(undefined));
});
