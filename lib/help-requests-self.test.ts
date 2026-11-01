// "Soạn để tự hỏi" và lời nhờ điền sẵn (Bước 5, mục 5.1–5.2). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { composeSelfAsk, helpRequestSchema, PART_MAX, prefillFromLesson, prefillFromPractice, SELF_ASK_LABEL } from "./help-requests-shared";

test("lời tự hỏi viết như học sinh nói với thầy cô, theo thứ tự 3 ý; bỏ ý trống", () => {
  const text = composeSelfAsk({ difficulty: "bước dời dấu phẩy", tried: "xem lại ví dụ trong sách", want: "giảng lại bước này." });
  assert.equal(text, "Thưa thầy/cô, em đang khó ở chỗ: bước dời dấu phẩy. Em đã thử: xem lại ví dụ trong sách. Thầy/cô giúp em: giảng lại bước này được không ạ?");
  assert.doesNotMatch(composeSelfAsk({ difficulty: "câu 3", tried: null, want: "gợi ý" }), /đã thử/);
  assert.match(SELF_ASK_LABEL, /tự hỏi/);
});

test("người nhận 'tự hỏi' không gửi được qua hệ thống (máy chủ chỉ nhận GVCN, phòng tham vấn)", () => {
  const parts = { when: "break", difficulty: "câu 3", tried: "", want: "gợi ý", withBuddy: false };
  assert.equal(helpRequestSchema.safeParse({ ...parts, toRole: "subject" }).success, false);
  assert.equal(helpRequestSchema.safeParse({ ...parts, toRole: "teacher" }).success, true);
});

test("điền sẵn từ bài luyện mở lời nhờ người giúp: chỗ vướng → ý 1, lời nhờ → ý 3, không quá giới hạn mỗi ý", () => {
  const p = prefillFromPractice({ stuck: "em chưa hiểu   bài phân số", who: "cô Toán", request: "x".repeat(400) });
  assert.equal(p.difficulty, "em chưa hiểu bài phân số");
  assert.equal(p.tried, "");
  assert.equal(p.want.length, PART_MAX);
  assert.deepEqual(prefillFromPractice(null), { difficulty: "", tried: "", want: "" });
});

test("điền sẵn từ bài học: chỉ tên bài, học sinh tự viết tiếp", () => {
  const p = prefillFromLesson("Hít thở hộp");
  assert.equal(p.difficulty, "Bài “Hít thở hộp”: em chưa hiểu ");
  assert.equal(p.want, "");
  assert.ok(prefillFromLesson("a".repeat(400)).difficulty.length <= PART_MAX);
});
