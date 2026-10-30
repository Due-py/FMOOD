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

// Kho việc nhỏ thật (content/vong-ho-tro/noi-dung-mau.json): gợi ý theo KHÓ KHĂN ĐÃ XÁC NHẬN, không theo chủ đề chung chung
import { readFileSync } from "node:fs";
import path from "node:path";
import { cueHits } from "./support-picks";

const seed = (JSON.parse(readFileSync(path.join(import.meta.dirname, "..", "content/vong-ho-tro/noi-dung-mau.json"), "utf8")) as Omit<
  SupportItem,
  "id" | "status" | "reviewedByName" | "reviewedAt"
>[]).map((i, k) => ({ ...i, id: String(k), status: "on" as const, reviewedByName: null, reviewedAt: null }));
const codes = (difficulty: string | null, ctx: { level?: number; exclude?: string[] } = {}) =>
  pickActions(seed, "hoc-tap", { difficulty, ...ctx }).map((a) => a.data.code);

test("“chưa ôn xong” và “học rồi mà sợ quên” được giúp theo hai cách khác nhau", () => {
  const notDone = codes("mình chưa ôn xong, nhiều bài quá");
  const forget = codes("mình học rồi mà sợ vào phòng thi sẽ quên");
  assert.equal(notDone[0], "HD03"); // chọn một bước học vừa sức
  assert.equal(forget[0], "HD27"); // tự nhớ lại, không nhìn vở
  assert.notEqual(notDone[0], forget[0]);
  assert.equal(codes("em chưa hiểu bài, làm mãi không biết làm")[0], "HD28"); // đánh dấu chỗ chưa hiểu
});

test("gõ không dấu vẫn khớp khó khăn; khó khăn không khớp thì về việc theo chủ đề như cũ", () => {
  assert.equal(codes("minh hoc roi ma so quen")[0], "HD27");
  assert.deepEqual(codes(null), codes("hôm nay trời mưa"));
});

test("việc đã thử mà chưa đỡ thì không gợi ý lại; việc xem lại suy nghĩ chỉ khi mức lo ≤ 3", () => {
  const key = seed.find((i) => i.data.code === "HD27")!.key;
  assert.ok(!codes("học rồi mà sợ quên", { exclude: [key] }).includes("HD27"));
  assert.equal(codes("sợ bố mẹ thất vọng vì điểm", { level: 2 })[0], "HD02");
  assert.ok(!codes("sợ bố mẹ thất vọng vì điểm", { level: 5 }).includes("HD02"));
});

test("mọi việc nhỏ có mã HD riêng, dùng khi nào và câu nhìn lại; HD06 là bước hỏi lại (không phải việc nhỏ)", () => {
  const actions = seed.filter((i) => i.kind === "tiny_action");
  const all = actions.map((a) => a.data.code as string);
  assert.equal(new Set(all).size, actions.length);
  assert.ok(all.every((c) => /^HD\d{2}$/.test(c)));
  assert.ok(!all.includes("HD06"));
  for (const a of actions) assert.ok(a.data.when && a.data.reflect, String(a.data.code));
  assert.deepEqual(cueHits(actions.find((a) => a.data.code === "HD03")!, "chưa ôn xong"), ["chưa ôn xong", "chưa ôn"]);
});

test("câu có dấu so có dấu: “học rồi” không bị nhầm với cụm “rối” của việc Viết ra cho nhẹ đầu", () => {
  const viet = seed.find((i) => i.data.code === "HD08")!;
  assert.deepEqual(cueHits(viet, "Học rồi mà sợ quên"), []);
  assert.deepEqual(cueHits(viet, "đầu óc rối quá"), ["rối"]);
  assert.equal(codes("Học rồi mà sợ quên")[0], "HD27");
});
