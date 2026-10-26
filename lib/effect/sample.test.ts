// Dữ liệu mẫu dùng để kiểm tra công thức trong Google Sheets "F-Mood_Kết quả hiệu quả" (26/10/2026).
// App phải ra đúng các con số đã đối chiếu với Sheets; đổi cách tính thì phải kiểm lại Sheets. Chạy: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { surveyMetric } from "./metrics";
import { pairSurveys, parseSurveyCsv } from "./survey";

const DIR = path.join(import.meta.dirname, "..", "..", "scripts", "khao-sat");
const csv = (file: string) =>
  (JSON.parse(readFileSync(path.join(DIR, file), "utf8")) as string[][])
    .map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(","))
    .join("\n");

test("dữ liệu mẫu: app ra đúng số đã đối chiếu với Google Sheets", () => {
  const pre = parseSurveyCsv(csv("mau-truoc.json"));
  const post = parseSurveyCsv(csv("mau-sau.json"));
  assert.deepEqual(pre.skipped, { duplicate: 1, test: 1, incomplete: 0 });
  assert.deepEqual(post.skipped, { duplicate: 1, test: 0, incomplete: 0 });
  const { pairs, unpaired } = pairSurveys(pre.rows, post.rows, (c) => (c === "7A1" ? "app" : c === "7A2" ? "control" : null));
  assert.deepEqual(unpaired, { preOnly: 1, postOnly: 1 });

  const who5 = surveyMetric("who5", pairs).compare!;
  assert.deepEqual([who5.app.n, who5.app.before, who5.app.after, who5.app.change], [6, 44.7, 59.3, 14.7]);
  assert.deepEqual([who5.control.n, who5.control.before, who5.control.after, who5.control.change], [5, 47.2, 48.8, 1.6]);
  assert.equal(who5.diff, 13.1);
  assert.equal(surveyMetric("pss4", pairs).compare!.diff, -2.6);
  assert.equal(surveyMetric("helpTeacher", pairs).compare!.diff, 0.8);
});
