// Gợi ý trả lời nhanh bám chuyện của học sinh: nội dung gửi AI có các lượt trước và điều học sinh đã nói. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestionInput, type Turn } from "./suggestion-input";

test("gửi kèm các lượt trước và tách riêng điều chính học sinh đã nói", () => {
  const history: Turn[] = [
    { role: "user", content: "Mình thấy buồn nhiều hơn" },
    { role: "assistant", content: "Cơ thể bạn thế nào?" },
    { role: "user", content: "Mình sợ có chuyện xấu xảy ra" },
    { role: "assistant", content: "Bạn có muốn tách điều đã xảy ra với điều đang lo không?" },
  ];
  const t = suggestionInput(history, "Ừ, mình muốn thử", "Ví dụ khác: “Mình nhận được tin nhắn ngắn”… Bạn điền gì?");
  assert.match(t, /CÁC LƯỢT TRƯỚC:\nHọc sinh: Mình thấy buồn nhiều hơn\nTrợ lý: Cơ thể bạn thế nào\?/);
  assert.match(t, /ĐIỀU CHÍNH HỌC SINH ĐÃ NÓI[^\n]*\n- Mình thấy buồn nhiều hơn\n- Mình sợ có chuyện xấu xảy ra\n- Ừ, mình muốn thử/);
  assert.match(t, /TRỢ LÝ VỪA TRẢ LỜI[^\n]*\nVí dụ khác/);
  // ví dụ của trợ lý không bị tính là điều học sinh đã nói
  const said = t.split("ĐIỀU CHÍNH HỌC SINH ĐÃ NÓI")[1].split("TIN MỚI")[0];
  assert.ok(!said.includes("tin nhắn"));
});

test("chỉ lấy 8 lượt gần nhất; lượt đầu không có bối cảnh", () => {
  const many: Turn[] = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `lượt ${i}` }));
  const t = suggestionInput(many, "mới", "trả lời");
  assert.ok(!t.includes("lượt 3\n") && t.includes("lượt 4"));
  assert.ok(!suggestionInput([], "chào", "Chào bạn!").includes("CÁC LƯỢT TRƯỚC"));
});
