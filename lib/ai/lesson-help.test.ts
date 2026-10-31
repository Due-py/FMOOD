// "Hỏi trợ lý" từ bài tập (mục 5.3): lời dặn có tên bài, đề, cấm đưa đáp án; không bao giờ chứa đáp án đúng. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { exerciseSchema } from "@/lib/exercises";
import { lessonHelpPrompt } from "./lesson-help";

test("có tên bài, đề bài, nhắc HL03 và không đưa đáp án", () => {
  const exercise = exerciseSchema.parse({ id: "e1", type: "text", prompt: "Viết 3 việc bạn làm khi thấy hồi hộp." });
  const text = lessonHelpPrompt({ title: "Hít thở hộp", exercise });
  assert.match(text, /“Hít thở hộp”/);
  assert.match(text, /Viết 3 việc bạn làm khi thấy hồi hộp/);
  assert.match(text, /HL03/);
  assert.match(text, /KHÔNG đưa đáp án/);
  assert.doesNotMatch(text, /Mây/);
});

test("câu chọn đáp án: có các lựa chọn để giúp hiểu đề, nhưng không có đáp án đúng", () => {
  const exercise = exerciseSchema.parse({ id: "e2", type: "choice", prompt: "Cách nào làm dịu nhanh?", options: ["Hít thở chậm", "Thức khuya"], answer: "Hít thở chậm" });
  const text = lessonHelpPrompt({ title: "Bình tĩnh", exercise });
  assert.match(text, /“Hít thở chậm”; “Thức khuya”/);
  assert.doesNotMatch(text, /đáp án đúng là/i);
  assert.doesNotMatch(text, /answer/);
});
