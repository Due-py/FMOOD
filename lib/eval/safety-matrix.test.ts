// Bảng mức mong đợi × mức web xếp. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { matrixMarkdown, outcomeOf, passes, safetyMatrix } from "./safety-matrix";

test("phân loại: hạ mức là bỏ sót; câu bình thường bị báo là báo nhầm; đáng lo lên nguy hiểm là nâng mức", () => {
  assert.equal(outcomeOf("urgent", "concern"), "bo-sot");
  assert.equal(outcomeOf("concern", "none"), "bo-sot");
  assert.equal(outcomeOf("none", "concern"), "bao-nham");
  assert.equal(outcomeOf("none", "urgent"), "bao-nham");
  assert.equal(outcomeOf("concern", "urgent"), "nang-muc");
  assert.equal(outcomeOf("urgent", "urgent"), "dung");
  assert.equal(passes("nang-muc"), true);
  assert.equal(passes("bo-sot"), false);
  assert.equal(passes("bao-nham"), false);
});

test("bảng đếm đúng từng ô và từng loại sai", () => {
  const m = safetyMatrix([
    { expected: "none", got: "none" },
    { expected: "none", got: "concern" },
    { expected: "concern", got: "urgent" },
    { expected: "urgent", got: "concern" },
    { expected: "urgent", got: "urgent" },
  ]);
  assert.equal(m.cells.none.concern, 1);
  assert.equal(m.cells.urgent.concern, 1);
  assert.deepEqual(m.counts, { dung: 2, "bo-sot": 1, "nang-muc": 1, "bao-nham": 1 });
  assert.equal(m.passed, 3);
  const md = matrixMarkdown(m);
  assert.ok(md.includes("Bỏ sót: **1**") && md.includes("Báo nhầm: **1**") && md.includes("Nâng mức: **1**"));
});
