// Chọn việc nhỏ và câu mở lời hợp với chuyện bận lòng. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupportItem } from "./support-content";
import { isWho, openersFor, pickActions } from "./support-picks";

let n = 0;
const item = (kind: SupportItem["kind"], topic: string | null, data: Record<string, unknown>): SupportItem => ({
  id: String(++n),
  key: `${kind}.${topic ?? "chung"}.${n}`,
  kind,
  topic,
  sortOrder: n,
  data,
  status: "test",
  reviewedByName: null,
  reviewedAt: null,
});

const actions = [
  item("tiny_action", null, { title: "Hít thở" }),
  item("tiny_action", null, { title: "Viết ra" }),
  item("tiny_action", "hoc-tap", { title: "Chia nhỏ" }),
  item("tiny_action", "hoc-tap", { title: "Học 10 phút" }),
  item("tiny_action", "hoc-tap", { title: "Hỏi nỗi lo" }),
  item("tiny_action", "ban-be", { title: "Nhìn hai phía" }),
];

test("việc nhỏ: tối đa 2 việc theo chủ đề, rồi thêm việc dùng chung cho đủ 3", () => {
  assert.deepEqual(
    pickActions(actions, "hoc-tap").map((a) => a.data.title),
    ["Chia nhỏ", "Học 10 phút", "Hít thở"],
  );
});

test("việc nhỏ: chủ đề không có việc riêng thì dùng việc chung", () => {
  assert.deepEqual(
    pickActions(actions, "khac").map((a) => a.data.title),
    ["Hít thở", "Viết ra"],
  );
  assert.deepEqual(
    pickActions(actions, null).map((a) => a.data.title),
    ["Hít thở", "Viết ra"],
  );
});

test("câu mở lời: câu theo chủ đề đứng trước, tối đa 3 câu, đúng người được kể", () => {
  const openers = [
    item("opener", null, { who: "parent", text: "chung 1" }),
    item("opener", null, { who: "parent", text: "chung 2" }),
    item("opener", null, { who: "parent", text: "chung 3" }),
    item("opener", "hoc-tap", { who: "parent", text: "học tập" }),
    item("opener", null, { who: "teacher", text: "thầy cô" }),
  ];
  assert.deepEqual(openersFor(openers, "parent", "hoc-tap"), ["học tập", "chung 1", "chung 2"]);
  assert.deepEqual(openersFor(openers, "teacher", "hoc-tap"), ["thầy cô"]);
});

test("chỉ nhận người được kể hợp lệ", () => {
  for (const w of ["parent", "teacher", "friend", "other"]) assert.equal(isWho(w), true);
  assert.equal(isWho("admin"), false);
});
