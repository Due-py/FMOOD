// Chấm phiếu khảo sát trước / sau. Dữ liệu mẫu tự đặt, đáp án tính tay ghi ngay bên cạnh. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCode, pairSurveys, parseCsv, parseSurveyCsv, scoreRow } from "./survey";

// một dòng phiếu: lớp, mã, 5 câu WHO-5, 4 câu PSS-4, 4 câu tìm giúp đỡ
const HEADER = [
  "Dấu thời gian",
  "[LOP] Em học lớp nào?",
  "[MA] Mã bí mật của em",
  "[W1] Em thấy vui vẻ",
  "[W2] Em thấy bình tĩnh",
  "[W3] Em thấy khỏe khoắn",
  "[W4] Em thức dậy thấy tỉnh táo",
  "[W5] Mỗi ngày có điều thú vị",
  "[P1] Không kiểm soát được",
  "[P2] Tự tin xử lý",
  "[P3] Mọi việc theo ý mình",
  "[P4] Khó khăn chồng chất",
  "[H1] Bố mẹ",
  "[H2] Bạn bè",
  "[H3] Thầy cô chủ nhiệm",
  "[H4] Thầy cô tư vấn",
];
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
const row = (lop: string, ma: string, w: number[], p: number[], h: number[]) =>
  ["1/1/2026", lop, ma, ...w.map((x) => `${x} - lựa chọn`), ...p.map((x) => `${x} - lựa chọn`), ...h.map((x) => `${x} - lựa chọn`)].map(q).join(",");
const csv = (rows: string[]) => [HEADER.map(q).join(","), ...rows].join("\n");

test("đọc CSV có dấu phẩy và ngoặc kép trong ô", () => {
  assert.deepEqual(parseCsv('a,"b, c","d ""e"""\n1,2,3'), [
    ["a", "b, c", 'd "e"'],
    ["1", "2", "3"],
  ]);
});

test("mã bí mật: bỏ dấu, khoảng trắng, viết hoa", () => {
  assert.equal(normalizeCode(" l 07 m "), "L07M");
  assert.equal(normalizeCode("Đ12á"), "D12A");
});

test("chấm điểm: WHO-5 nhân 4 thành thang 100; PSS-4 đảo câu 2 và 3; tìm thầy cô = trung bình câu 3 và 4", () => {
  // WHO-5: 3+3+2+4+3 = 15 → 60. PSS-4: 2 + (4-1) + (4-2) + 3 = 10. Thầy cô: (5+3)/2 = 4
  const s = scoreRow({ W1: 3, W2: 3, W3: 2, W4: 4, W5: 3, P1: 2, P2: 1, P3: 2, P4: 3, H1: 6, H2: 7, H3: 5, H4: 3 });
  assert.deepEqual(s, { who5: 60, pss4: 10, helpTeacher: 4 });
});

test("đọc phiếu: bỏ dòng 'không tính', dòng thiếu câu, và chỉ giữ lần trả lời đầu tiên của mỗi mã", () => {
  const text = csv([
    row("7A1", "L07M", [3, 3, 3, 3, 3], [2, 2, 2, 2], [4, 4, 4, 4]),
    row("7A1", "l07m", [5, 5, 5, 5, 5], [0, 4, 4, 0], [7, 7, 7, 7]), // trùng mã → bỏ
    row("Thử phiếu (không tính)", "X01Y", [1, 1, 1, 1, 1], [2, 2, 2, 2], [4, 4, 4, 4]),
    row("7A1", "H09K", [3, 3, 3, 3, 3], [2, 2, 2, 2], [4, 4, 4, 4]).replace(",3 - lựa chọn,", ",,"), // thiếu W1
  ]);
  const r = parseSurveyCsv(text);
  assert.equal(r.rows.length, 1);
  assert.deepEqual(r.skipped, { duplicate: 1, test: 1, incomplete: 1 });
  assert.equal(r.rows[0].key, "7A1|L07M");
  assert.equal(r.rows[0].scores.who5, 60);
});

test("thiếu cột câu hỏi thì báo lỗi rõ ràng, không đoán", () => {
  const r = parseSurveyCsv("Dấu thời gian,[LOP] Lớp,[MA] Mã\n1,7A1,L07M");
  assert.match(r.error ?? "", /W1/);
});

test("ghép trước–sau theo lớp + mã; chỉ tính bạn có đủ cả hai phiếu; chia nhóm theo lớp", () => {
  const pre = parseSurveyCsv(
    csv([
      row("7A1", "A01A", [2, 2, 2, 2, 2], [2, 2, 2, 2], [3, 3, 3, 3]),
      row("7A1", "B02B", [3, 3, 3, 3, 3], [2, 2, 2, 2], [3, 3, 3, 3]),
      row("7A2", "C03C", [3, 3, 3, 3, 3], [2, 2, 2, 2], [3, 3, 3, 3]),
    ]),
  ).rows;
  const post = parseSurveyCsv(
    csv([
      row("7A1", "A01A", [4, 4, 4, 4, 4], [1, 3, 3, 1], [5, 5, 5, 5]),
      row("7A2", "C03C", [3, 3, 3, 3, 3], [2, 2, 2, 2], [3, 3, 3, 3]),
      row("7A2", "Z09Z", [3, 3, 3, 3, 3], [2, 2, 2, 2], [3, 3, 3, 3]), // không có phiếu trước
    ]),
  ).rows;
  const p = pairSurveys(pre, post, (cls) => (cls === "7A1" ? "app" : cls === "7A2" ? "control" : null));
  assert.equal(p.pairs.length, 2);
  assert.deepEqual(p.unpaired, { preOnly: 1, postOnly: 1 });
  const a = p.pairs.find((x) => x.group === "app")!;
  assert.equal(a.pre.who5, 40); // 10 × 4
  assert.equal(a.post.who5, 80); // 20 × 4
  assert.equal(a.post.pss4, 4); // 1 + 1 + 1 + 1
});
