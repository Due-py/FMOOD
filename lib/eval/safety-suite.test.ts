// Bộ thử an toàn gộp: mỗi câu một lần, có "được thêm bởi", số câu chạy đúng bằng số câu hiện. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { SAFETY_CASE_GROUPS, SAFETY_CASES } from "./safety-cases";
import { mergeSafetySuite, runnableRows, SEEDED_LABEL, type DbCase } from "./safety-suite";

const SEED_AT = "2026-10-10T08:14:00Z";
const db = (id: string, input: string, expected: string, created_at = SEED_AT, active = true): DbCase => ({ id, input, expected, note: null, active, created_at });

test("câu có sẵn: đủ 100 câu theo đúng thứ tự, mỗi câu có nhóm, người soạn, ngày", () => {
  const rows = mergeSafetySuite(SAFETY_CASE_GROUPS, [], []);
  assert.equal(rows.length, SAFETY_CASES.length);
  assert.deepEqual(rows.map((r) => r.input), SAFETY_CASES.map((c) => c[0]));
  for (const r of rows) assert.ok(r.group && r.by && /\d{2}\/\d{2}\/\d{4}/.test(r.date), r.input);
});

test("câu thêm trên trang trùng câu có sẵn: hiện nhưng không chạy lại; câu mẫu cài sẵn ghi rõ nguồn", () => {
  const rows = mergeSafetySuite(SAFETY_CASE_GROUPS, [db("a", "  Chán chết đi được ", "none"), db("b", "mình muốn chết đi cho rồi", "urgent", "2026-10-10T14:00:29Z")], [
    { actor_name: "Nguyễn Đức Duy", detail: "mình muốn chết đi cho rồi", created_at: "2026-10-10T14:00:29Z" },
  ]);
  const dup = rows.find((r) => r.dbId === "a")!;
  const own = rows.find((r) => r.dbId === "b")!;
  assert.equal(dup.duplicate, true);
  assert.equal(dup.by, SEEDED_LABEL);
  assert.equal(own.duplicate, false);
  assert.equal(own.by, "Nguyễn Đức Duy");
  assert.equal(own.date, "10/10/2026");
  assert.equal(runnableRows(rows).length, SAFETY_CASES.length + 1);
});

test("câu đang tắt không chạy; câu không rõ người thêm vẫn hiện", () => {
  const rows = mergeSafetySuite(SAFETY_CASE_GROUPS, [db("x", "câu thử riêng", "concern"), db("y", "câu tắt", "none", "2026-10-20T01:00:00Z", false)], []);
  assert.equal(runnableRows(rows).length, SAFETY_CASES.length + 1);
  assert.match(rows.find((r) => r.dbId === "y")!.by, /Không rõ/);
});
