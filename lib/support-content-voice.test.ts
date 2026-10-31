// Kiểm tra file nội dung mẫu của vòng hỗ trợ: đúng cấu trúc, đủ số lượng, đúng giọng trợ lý. Chạy: npm test
// Giọng trợ lý: gọi "bạn", xưng "mình", không gọi "em", không tự xưng "trợ lý", không nói ai bị bệnh gì.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseItemData, type ContentKind, type SeedItem } from "./support-content";

const ROOT = path.join(import.meta.dirname, "..");
const items = JSON.parse(readFileSync(path.join(ROOT, "content/vong-ho-tro/noi-dung-mau.json"), "utf8")) as SeedItem[];

const of = (kind: ContentKind, topic?: string | null) =>
  items.filter((i) => i.kind === kind && (topic === undefined || i.topic === topic));
const strings = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
const word = (w: string) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu");

// lời do trợ lý nói (học sinh nói thì được xưng "em" với thầy cô, gọi "trợ lý ơi")
const MAY_VOICE: ContentKind[] = ["ask", "may_line", "tiny_action", "badge", "crisis_draft"];
const TOPICS = ["hoc-tap", "ban-be", "gia-dinh", "ban-than", "mang-xa-hoi", "khac"];
const BADGES = ["dam-ke", "goi-ten-cam-xuc", "thu-viec-nho", "quay-lai-hoi-tham", "nhe-long-hon", "cay-cau", "nguoi-lam-vuon"];

test("mọi mục đúng cấu trúc và mã không trùng", () => {
  const keys = new Set<string>();
  for (const i of items) {
    assert.ok(!keys.has(i.key), `trùng mã ${i.key}`);
    keys.add(i.key);
    const r = parseItemData(i.kind, i.data);
    assert.ok(r.ok, `${i.key}: ${r.ok ? "" : r.error}`);
    if (i.topic) assert.ok(TOPICS.includes(i.topic), `${i.key}: chủ đề lạ ${i.topic}`);
  }
});

test("đủ số lượng tối thiểu theo thiết kế", () => {
  assert.deepEqual(of("topic").map((t) => t.topic).sort(), [...TOPICS].sort());
  for (const t of of("topic")) assert.ok((t.data.triggers as string[]).length >= 8, `${t.key}: cần ≥ 8 cụm từ`);
  for (const topic of TOPICS) {
    for (const step of ["checkin", "level", "followup"]) {
      const asks = of("ask").filter((a) => a.data.step === step && (a.topic === topic || a.topic === null));
      assert.ok(asks.length >= 2, `câu hỏi bước ${step} cho ${topic}: cần ≥ 2`);
    }
    assert.ok(of("starter", topic).length >= 4, `câu mở đầu ${topic}: cần ≥ 4`);
    if (topic !== "khac") assert.ok(of("tiny_action", topic).length >= 3, `việc nhỏ ${topic}: cần ≥ 3`);
  }
  assert.ok(of("fill_blank").length >= 8, "câu điền chỗ trống: cần ≥ 8");
  assert.ok(of("tiny_action", null).length >= 4, "việc nhỏ dùng chung: cần ≥ 4");
  for (const who of ["parent", "teacher", "friend"]) {
    assert.ok(of("opener", null).filter((o) => o.data.who === who).length >= 3, `câu mở lời chung với ${who}: cần ≥ 3`);
  }
  assert.deepEqual(of("badge").map((b) => b.key.replace(/^badge\./, "")).sort(), [...BADGES].sort());
  for (const moment of ["worry_saved", "action_done", "followup_better", "followup_same", "followup_worse", "badge"]) {
    assert.ok(of("may_line").some((m) => m.data.moment === moment), `lời trợ lý lúc ${moment}: cần ≥ 1`);
  }
  assert.equal(of("crisis_draft").length, 1);
});

test("lời trợ lý gọi bạn, xưng mình: không gọi em, không tự xưng tên cũ Mây", () => {
  for (const i of items.filter((x) => MAY_VOICE.includes(x.kind))) {
    // "trẻ em" trong tên Tổng đài Bảo vệ trẻ em là tên riêng, không phải cách xưng hô
    for (const s of strings(i.data).map((x) => x.replace(/trẻ em/giu, ""))) {
      assert.ok(!word("em").test(s), `${i.key} có "em": ${s}`);
      assert.ok(!word("mây").test(s), `${i.key} tự xưng "Mây": ${s}`);
    }
  }
});

test("không nói ai bị bệnh / rối loạn, không chẩn đoán", () => {
  for (const i of items) {
    for (const s of strings(i.data)) {
      for (const w of ["bệnh", "trầm cảm", "rối loạn", "chẩn đoán", "tâm thần"]) {
        assert.ok(!word(w).test(s), `${i.key} có "${w}": ${s}`);
      }
    }
  }
});

test("việc nhỏ chỉ gắn với bài học có thật trong thư viện", () => {
  const dir = path.join(ROOT, "content/lessons/oxford");
  const slugs = new Set(
    readdirSync(dir).flatMap((f) => (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { slug: string }[]).map((l) => l.slug)),
  );
  for (const a of of("tiny_action")) {
    const slug = a.data.lessonSlug as string | undefined;
    if (slug) assert.ok(slugs.has(slug), `${a.key}: không có bài ${slug}`);
  }
});
