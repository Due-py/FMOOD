import assert from "node:assert/strict";
import { test } from "node:test";
import { describeActivity, wordCount } from "./activity-describe";

test("mở bài luyện: tên kỹ năng, tình huống, lối vào; đọc được mã cũ K1–K4", () => {
  assert.match(describeActivity("practice_open", "calm_in_the_moment|TL58|from:skills")!, /^«Nhận biết cảm xúc và chọn cách ứng phó» · tình huống TL58 · .+ · từ trang Luyện kỹ năng$/);
  assert.match(describeActivity("practice_open", "K2|TL01")!, /^«Nhận biết cảm xúc và chọn cách ứng phó» · tình huống TL01 · Lo trước kiểm tra$/);
  assert.equal(describeActivity("practice_open", "growth_mindset|own"), "«Tin rằng mình có thể tiến bộ» · tình huống tự kể");
});

test("các bước bài luyện, hỏi lại, bước SEL, lời nhờ", () => {
  assert.equal(describeActivity("practice_submit", "K3"), "«Gỡ rối và lên kế hoạch từng bước»");
  assert.equal(describeActivity("practice_submit", "set_small_goal|42"), "«Đặt mục tiêu nhỏ và theo dõi» · 42 chữ");
  assert.equal(describeActivity("practice_followup", "helped"), "Dùng rồi, thấy có ích");
  assert.equal(describeActivity("sel_step", "hoi-suy-nghi"), "Nhận ra suy nghĩ");
  assert.equal(describeActivity("help_request", "counselor"), "gửi phòng tham vấn");
  assert.equal(describeActivity("habit_adjust", "doi-gio"), "Đổi giờ");
});

test("trò chuyện: chỉ mã cuộc và số chữ, không có nội dung", () => {
  assert.equal(describeActivity("chat_message", "c:ab12cd|14"), "cuộc trò chuyện #ab12cd · 14 chữ");
  assert.equal(describeActivity("chat_start", "c:ab12cd|checkin"), "cuộc trò chuyện #ab12cd · sau khi ghi tâm trạng");
  assert.equal(describeActivity("chat_start", "home"), "từ trang chủ");
  assert.equal(describeActivity("journal_write", "120"), "120 chữ");
});

test("không có mã thì không có gì thêm; mã lạ giữ nguyên", () => {
  assert.equal(describeActivity("login", null), null);
  assert.equal(describeActivity("sel_step", "buoc-moi"), "buoc-moi");
});

test("đếm chữ", () => {
  assert.equal(wordCount("  Mình  thấy lo \n quá "), 4);
  assert.equal(wordCount("   "), 0);
});
