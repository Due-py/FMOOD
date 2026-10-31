// So sánh hai kiểu trợ lý: kịch bản, che tên kiểu, phiếu chấm, đồng thuận. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { agreement, blind, parseRatings, ratingSheet, scoreConfigs, type Run } from "./ab";
import { AB_SCENARIOS, GROUPS } from "./ab-scenarios";

test("24 kịch bản, đủ 8 nhóm TH01–TH08 mỗi nhóm 3, mã không trùng, lượt chấm hợp lệ", () => {
  assert.equal(AB_SCENARIOS.length, 24);
  assert.equal(new Set(AB_SCENARIOS.map((s) => s.id)).size, 24);
  for (const g of Object.keys(GROUPS)) assert.equal(AB_SCENARIOS.filter((s) => s.nhom === g).length, 3, g);
  for (const s of AB_SCENARIOS) {
    assert.ok(s.chamTuLuot >= 1 && s.chamTuLuot <= s.luot.length, s.id);
    assert.ok(s.luot.some((t) => t.nut), `${s.id}: cần ít nhất một lượt sửa / bỏ qua / dừng`);
    for (const t of s.luot) if (t.nut === "correction") assert.ok(t.text.startsWith("Sóc hiểu chưa đúng:"), s.id);
  }
});

test("che tên kiểu: xáo thứ tự tái lập được theo hạt giống, mã chấm không lộ kiểu", () => {
  const runs: Run[] = ["A", "B"].flatMap((config) =>
    [1, 2, 3].map((lan) => ({ scenario: "KB01", set: "phat-trien" as const, config: config as "A" | "B", lan })),
  );
  const a = blind(runs, 42);
  const b = blind(runs, 42);
  assert.deepEqual(a, b);
  assert.notDeepEqual(blind(runs, 7).map((x) => `${x.config}${x.lan}`), a.map((x) => `${x.config}${x.lan}`));
  assert.deepEqual(a.map((x) => x.code), ["C001", "C002", "C003", "C004", "C005", "C006"]);
  // phiếu chấm không có cột kiểu
  const sheet = ratingSheet(a);
  assert.ok(!/(^|,)(A|B)(,|$)/m.test(sheet.replace(/﻿/, "")));
});

test("đọc phiếu chấm (dấu phẩy hoặc chấm phẩy), báo ô thiếu; tính lượt đạt và kịch bản đạt ≥ 2/3", () => {
  const items = blind(
    ["A", "B"].flatMap((config) => [1, 2, 3].map((lan) => ({ scenario: "KB01", set: "phat-trien" as const, config: config as "A" | "B", lan }))),
    1,
  );
  const rows = items.map((i) => [i.code, i.scenario, ...(i.config === "B" ? ["1", "1", "1", i.lan === 3 ? "0" : "1"] : ["1", "0", "0", "1"]), ""].join(";"));
  const { ratings, errors } = parseRatings(["Ma cham;Kich ban;TC1;TC2;TC3;TC4;Ghi chu", ...rows, "C999;KB02;1;;1;1;"].join("\n"));
  assert.deepEqual(errors, ["C999: cần điền đủ 4 ô bằng 0 hoặc 1"]);
  const [a, b] = scoreConfigs(items, new Map(ratings.map((r) => [r.code, r.scores])));
  assert.deepEqual([a.passedTurns, a.turns, a.passedScenarios], [0, 3, 0]);
  assert.deepEqual([b.passedTurns, b.turns, b.passedScenarios], [2, 3, 1]);
  assert.deepEqual(b.byCriterion, [3, 3, 3, 2]);
});

test("đồng thuận: đếm ô giống nhau và lượt cùng kết luận, liệt kê chỗ bất đồng", () => {
  const r1 = [{ code: "C001", scores: [1, 1, 1, 1] }, { code: "C002", scores: [1, 0, 1, 1] }];
  const r2 = [{ code: "C001", scores: [1, 1, 1, 1] }, { code: "C002", scores: [1, 1, 1, 1] }];
  const a = agreement(r1, r2);
  assert.equal(a.cells, 8);
  assert.equal(a.sameCells, 7);
  assert.equal(a.samePass, 1);
  assert.deepEqual(a.disagree, [{ code: "C002", criteria: ["TC2"] }]);
});
