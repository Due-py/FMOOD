// Tính điểm bài tình huống, độ đồng ý hai người chấm, khoảng tin cậy. Số liệu nhỏ, đáp án tính tay. Chạy: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import type { Cells } from "./bai-do";
import {
  agreement,
  bootstrapDiff,
  describe,
  directionCounts,
  mergeRaters,
  parseCell,
  parseCsv,
  quantile,
  SCORE_CSV_HEADER,
  scoreCsvRow,
  skillScores,
  toCsv,
  weightedKappa,
} from "./test-scoring";

const close = (a: number | null, b: number, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("điểm kỹ năng = trung bình các ô có điểm × 3; bỏ T, K; thiếu kỹ năng thì không có tổng", () => {
  const cells: Cells = {
    "1.1": 2, "1.2": 1, "1.3": "T", // K1 = (2 + 1) / 2 × 3 = 4,5
    "2.1": 0, "2.2": 0, "2.3": 0, // K2 = 0
    "3.1": "K", "3.2": "T", "3.3": "T", // K3 trống hết
    "4.1": 2, "4.2": 2, "4.3": 2, // K4 = 6
  };
  const s = skillScores(cells);
  close(s.K1, 4.5);
  close(s.K2, 0);
  assert.equal(s.K3, null);
  close(s.K4, 6);
  assert.equal(s.total, null);

  // độ nhạy: ô trống = 0 → K1 = 3 / 3 × 3 = 3, K3 = 0, tổng = 3 + 0 + 0 + 6 = 9
  const z = skillScores(cells, { blanksAsZero: true });
  close(z.K1, 3);
  close(z.K3, 0);
  close(z.total, 9);
});

test("đủ 12 ô thì tổng = K1 + K2 + K3 + K4 (thang 0–24)", () => {
  const all2 = Object.fromEntries(["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "4.1", "4.2", "4.3"].map((c) => [c, 2])) as Cells;
  close(skillScores(all2).total, 24);
});

test("gộp hai người chấm: trung bình từng ô; một người trống thì lấy người kia; cả hai trống là T, có K thì K", () => {
  const m = mergeRaters({ "1.1": 2, "1.2": "T", "1.3": "K" }, { "1.1": 1, "1.2": 2, "1.3": "T" });
  assert.equal(m["1.1"], 1.5);
  assert.equal(m["1.2"], 2);
  assert.equal(m["1.3"], "K");
  assert.equal(m["4.3"], "T");
  // chỉ một người chấm (bài ngoài 30 bài chấm đôi)
  assert.equal(mergeRaters({ "2.1": 1 })["2.1"], 1);
});

test("kappa có trọng số: (0,0) (1,1) (2,2) (0,1) → tuyến tính 5/7, bậc hai 0,8 (tính tay)", () => {
  const pairs: [number, number][] = [[0, 0], [1, 1], [2, 2], [0, 1]];
  // quan sát tuyến tính (1 + 1 + 1 + 0,5) / 4 = 0,875; kỳ vọng 0,5625 → (0,875 − 0,5625) / 0,4375
  close(weightedKappa(pairs, "linear"), 5 / 7);
  // quan sát bậc hai 0,9375; kỳ vọng 0,6875 → 0,25 / 0,3125
  close(weightedKappa(pairs, "quadratic"), 0.8);
  close(weightedKappa([[0, 0], [1, 1], [2, 2]], "linear"), 1);
  assert.equal(weightedKappa([]), null);
});

test("độ đồng ý: 12 ô mỗi bài, T trùng T vẫn tính là giống; kappa chỉ tính ô cả hai có điểm", () => {
  const a: Cells = { "1.1": 0, "1.2": 1, "1.3": 2, "2.1": 0 };
  const b: Cells = { "1.1": 0, "1.2": 1, "1.3": 2, "2.1": 1 };
  const ag = agreement([[a, b]]);
  assert.equal(ag.cells, 12);
  assert.equal(ag.equal, 11);
  close(ag.pct, 11 / 12);
  assert.equal(ag.numeric, 4);
  close(ag.kappaLinear, 5 / 7);
  // theo một kỹ năng
  const k1 = agreement([[a, b]], ["1.1", "1.2", "1.3"]);
  assert.equal(k1.pct, 1);
});

test("mô tả: trung bình, độ lệch chuẩn mẫu, trung vị", () => {
  const d = describe([1, 2, 3, 4]);
  assert.equal(d.n, 4);
  close(d.mean, 2.5);
  close(d.sd, Math.sqrt(5 / 3));
  close(d.median, 2.5);
  assert.equal(describe([7]).median, 7);
  assert.equal(describe([]).mean, null);
});

test("bootstrap: không có biến thiên thì khoảng tin cậy trùng ước lượng; có biến thiên thì bao ước lượng; chạy lại ra y hệt", () => {
  const flat = bootstrapDiff([1, 1, 1], [0, 0, 0]);
  assert.ok(flat);
  assert.equal(flat.estimate, 1);
  assert.equal(flat.low, 1);
  assert.equal(flat.high, 1);

  const a = [3, 1, 4, 1, 5, 9, 2, 6];
  const b = [0, 1, -1, 2, 0, 1];
  const r1 = bootstrapDiff(a, b);
  const r2 = bootstrapDiff(a, b);
  assert.ok(r1 && r2);
  close(r1.estimate, 31 / 8 - 3 / 6);
  assert.ok(r1.low < r1.estimate && r1.estimate < r1.high);
  assert.deepEqual(r1, r2);
  assert.equal(r1.samples, 2000);
  assert.equal(bootstrapDiff([], [1]), null);
});

test("phân vị nội suy tuyến tính", () => {
  assert.equal(quantile([0, 10], 0.5), 5);
  assert.equal(quantile([1, 2, 3, 4, 5], 0.25), 2);
});

test("đếm tăng / giữ / giảm", () => {
  assert.deepEqual(directionCounts([1, 0, -0.5, 2]), { up: 2, same: 1, down: 1 });
});

test("đọc ô điểm và CSV (ngoặc kép, dấu phẩy trong ô, BOM)", () => {
  assert.equal(parseCell(" 2 "), 2);
  assert.equal(parseCell("t"), "T");
  assert.equal(parseCell("K"), "K");
  assert.equal(parseCell(""), undefined);
  assert.equal(parseCell("3"), undefined);
  const rows = parseCsv('﻿Mã chấm,Ghi chú\r\nB001,"có dấu, phẩy"\r\nB002,"câu ""trích"""\n');
  assert.deepEqual(rows, [["Mã chấm", "Ghi chú"], ["B001", "có dấu, phẩy"], ["B002", 'câu "trích"']]);
  assert.deepEqual(parseCsv(toCsv([["a,b", 1, null]])), [["a,b", "1", ""]]);
});

test("bảng điểm xuất ra có đúng các cột, đúng thứ tự như phiếu chấm trong bộ đo", () => {
  const kit = readFileSync(path.join(process.cwd(), "ho-so-du-thi/3-kiem-thu/bo-do-ky-nang/phieu-cham-bai-tinh-huong.csv"), "utf8");
  assert.deepEqual(SCORE_CSV_HEADER, parseCsv(kit)[0]);
  const row = scoreCsvRow({
    code: "B001",
    slot: 1,
    cells: { "1.1": 2, "1.2": 1, "1.3": "T", "2.1": 0, "2.2": 0, "2.3": 0, "3.1": 1, "3.2": 1, "3.3": 1, "4.1": 2, "4.2": 2, "4.3": 2 },
    guess_class: "8A1",
    guess_round: null,
    note: null,
    referred: true,
  });
  assert.equal(row.length, SCORE_CSV_HEADER.length);
  // K1 = 4,5; K2 = 0; K3 = 3; K4 = 6; tổng 13,5
  assert.deepEqual(row.slice(14, 19), [4.5, 0, 3, 6, 13.5]);
  assert.equal(row[row.length - 1], "chuyển tư vấn");
});
