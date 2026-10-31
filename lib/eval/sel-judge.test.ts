// Phần thuần của tầng đánh giá ngữ nghĩa: nội dung gửi AI chấm, phiếu người chấm, độ đồng thuận. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { humanSheet, JUDGE_CRITERIA, JUDGE_INSTRUCTIONS, judgeAgreement, judgeInput, judgeTotal, parseHumanSheet, validScores, type JudgeScores } from "./sel-judge";

test("nội dung gửi AI chấm có bối cảnh, tin mới, nhiệm vụ của bước và câu trả lời", () => {
  const t = judgeInput({
    history: [{ role: "user", content: "Mai mình thuyết trình." }],
    message: "Ừ, gỡ từng bước.",
    reply: "Lúc nghĩ tới buổi thuyết trình, cơ thể bạn thấy thế nào?",
    task: "LƯỢT NÀY: Hỏi MỘT câu về biểu hiện cơ thể",
  });
  assert.match(t, /Học sinh: Mai mình thuyết trình\./);
  assert.match(t, /NHIỆM VỤ ĐƯỢC GIAO CHO LƯỢT NÀY:\nLƯỢT NÀY: Hỏi MỘT câu về biểu hiện cơ thể/);
  assert.match(t, /CÂU TRẢ LỜI CẦN CHẤM:\nLúc nghĩ/);
  assert.match(judgeInput({ history: [], message: "chào", reply: "Chào bạn!", task: "" }), /không có bước nào được giao/);
  for (const c of JUDGE_CRITERIA) assert.ok(JUDGE_INSTRUCTIONS.includes(c.key));
});

test("điểm hợp lệ và tổng điểm", () => {
  const s: JudgeScores = { dung_buoc: 2, thau_cam: 1, khong_suy_doan: 1, hop_ngu_canh: 2 };
  assert.ok(validScores(s));
  assert.ok(!validScores({ ...s, khong_suy_doan: 2 }));
  assert.ok(!validScores({ ...s, thau_cam: 1.5 }));
  assert.deepEqual(judgeTotal(s), { total: 6, max: 7, rate: 6 / 7 });
});

test("phiếu người chấm: tạo, điền (Excel lưu bằng ;), đọc lại; ô thiếu hoặc ngoài thang thì báo lỗi", () => {
  const sheet = humanSheet([
    { code: "S01", caseId: "nhanh-A", message: "Em không biết", task: "Gọi tên cảm xúc", reply: "Bạn thấy gần với lo, sợ, hay chưa rõ?" },
  ]);
  assert.ok(sheet.startsWith("﻿Ma cham,Ca,"));
  assert.ok(!sheet.includes("dung_buoc,2"), "phiếu không có sẵn điểm của AI");
  const filled = [
    "Ma cham;Ca;Hoc sinh nhan;Nhiem vu;Tra loi;dung_buoc;thau_cam;khong_suy_doan;hop_ngu_canh;Ghi chu",
    "S01;nhanh-A;Em không biết;Gọi tên;\"Bạn thấy; gần với lo?\";2;2;1;1;",
    "S02;nhanh-B;x;y;z;2;;1;1;",
    "S03;nhanh-C;x;y;z;3;2;1;1;",
  ].join("\r\n");
  const { scores, errors } = parseHumanSheet(filled);
  assert.deepEqual(scores.get("S01"), { dung_buoc: 2, thau_cam: 2, khong_suy_doan: 1, hop_ngu_canh: 1 });
  assert.equal(errors.length, 2);
});

test("độ đồng thuận AI chấm và người chấm theo từng tiêu chí", () => {
  const ai = new Map<string, JudgeScores>([
    ["S01", { dung_buoc: 2, thau_cam: 2, khong_suy_doan: 1, hop_ngu_canh: 2 }],
    ["S02", { dung_buoc: 0, thau_cam: 1, khong_suy_doan: 0, hop_ngu_canh: 2 }],
    ["S09", { dung_buoc: 2, thau_cam: 2, khong_suy_doan: 1, hop_ngu_canh: 2 }],
  ]);
  const human = new Map<string, JudgeScores>([
    ["S01", { dung_buoc: 2, thau_cam: 1, khong_suy_doan: 1, hop_ngu_canh: 2 }],
    ["S02", { dung_buoc: 2, thau_cam: 1, khong_suy_doan: 1, hop_ngu_canh: 2 }],
  ]);
  const a = judgeAgreement(ai, human);
  assert.equal(a.items, 2);
  assert.deepEqual(
    a.byCriterion.map((c) => [c.key, c.exact, c.within1]),
    [
      ["dung_buoc", 1, 1],
      ["thau_cam", 1, 2],
      ["khong_suy_doan", 1, 2],
      ["hop_ngu_canh", 2, 2],
    ],
  );
});
