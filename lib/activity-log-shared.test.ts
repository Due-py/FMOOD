import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITY_KINDS } from "./activity-log-shared";

test("mọi loại việc có nhãn tiếng Việt", () => {
  for (const [k, label] of Object.entries(ACTIVITY_KINDS)) assert.ok(label.length > 3, k);
});
