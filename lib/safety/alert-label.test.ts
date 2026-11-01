// Cảnh báo về một bạn khác: vẫn tạo như cũ, chỉ thêm nhãn. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { peerAlertLabel } from "@/lib/skills";
import { labelAlert } from "./alert-label";

test("không có nhãn: đoạn trích và lý do giữ nguyên (mọi mô-đun khác, trò chuyện…)", () => {
  assert.deepEqual(labelAlert("chữ học sinh", ["lý do"], null), { excerpt: "chữ học sinh", reasons: ["lý do"] });
  assert.deepEqual(labelAlert(undefined, [], undefined), { excerpt: undefined, reasons: [] });
});

test("có nhãn: đứng đầu đoạn trích và là lý do đầu tiên, không lặp", () => {
  const label = "Về một bạn khác (bài luyện: Lắng nghe bạn đang áp lực)";
  const out = labelAlert("bạn ấy nói…", ["từ khóa", label], label);
  assert.equal(out.excerpt, `${label}: bạn ấy nói…`);
  assert.deepEqual(out.reasons, [label, "từ khóa"]);
});

test("chỉ hai mô-đun viết về bạn khác mới có nhãn", () => {
  assert.equal(peerAlertLabel("notice_peer_stress"), "Về một bạn khác (bài luyện: Nhận ra khi bạn đang áp lực)");
  assert.equal(peerAlertLabel("listen_to_peer"), "Về một bạn khác (bài luyện: Lắng nghe bạn đang áp lực)");
  for (const s of ["ask_for_help", "see_other_side", "resolve_group_conflict", "say_no_to_pressure", "calm_in_the_moment"] as const) {
    assert.equal(peerAlertLabel(s), null, s);
  }
  assert.equal(peerAlertLabel(null), null);
});
