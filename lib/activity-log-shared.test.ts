import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITY_KINDS, inLogWindow } from "./activity-log-shared";

test("nhật ký học sinh chỉ ghi trong đợt thử 03/11–12/11/2026 (giờ Việt Nam)", () => {
  assert.equal(inLogWindow(new Date("2026-11-02T23:59:00+07:00")), false);
  assert.equal(inLogWindow(new Date("2026-11-03T00:00:00+07:00")), true);
  assert.equal(inLogWindow(new Date("2026-11-12T23:59:00+07:00")), true);
  assert.equal(inLogWindow(new Date("2026-11-13T00:00:00+07:00")), false);
});

test("mọi loại việc có nhãn tiếng Việt", () => {
  for (const [k, label] of Object.entries(ACTIVITY_KINDS)) assert.ok(label.length > 3, k);
});
