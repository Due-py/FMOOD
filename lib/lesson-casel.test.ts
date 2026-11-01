// Gợi ý gắn CASEL cho bài thư viện (nút "Điền gợi ý" ở trang Duyệt bài). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CASEL_SUGGESTIONS, lessonCaselSchema } from "./lesson-casel";
import { caselItem } from "./sel/casel";
import { isSkillId } from "./skills";

const entries = Object.entries(CASEL_SUGGESTIONS);

test("mọi gợi ý lưu được ngay (đúng khung, đúng mục tiêu học tập)", () => {
  for (const [slug, s] of entries) {
    const parsed = lessonCaselSchema.safeParse(s);
    assert.ok(parsed.success, `${slug}: ${parsed.success ? "" : parsed.error.issues[0].message}`);
  }
});

test("bài luyện nối với bài đọc phải là bài luyện có thật (ràng buộc lessons_subskill_check)", () => {
  for (const [slug, s] of entries) assert.ok(s.subskill === null || isSkillId(s.subskill), `${slug}: ${s.subskill}`);
});

test("mã kỹ năng thành phần có tên tiếng Việt và thuộc năng lực chính hoặc liên quan", () => {
  for (const [slug, s] of entries) {
    const shown = [s.casel_primary, ...s.casel_related];
    for (const code of s.casel_items) {
      const item = caselItem(code)!;
      assert.ok(item.vi, `${slug}: ${code} chưa có bản dịch`);
      assert.ok(shown.includes(item.competency), `${slug}: ${code} không thuộc năng lực đã chọn`);
    }
  }
});
