// Kiểm tra góp ý và lời trợ lý trong bài luyện bằng câu trả lời mẫu viết tay cho cả 4 mô-đun. Chạy: npm test
// (không gọi AI: đây là phần quyết định câu nào được hiện, câu nào thay bằng tiêu chí cố định)
import assert from "node:assert/strict";
import { test } from "node:test";
import { SKILL_CODES, SKILLS, type SkillCode } from "@/lib/skills";
import { acceptFeedback, criteriaFeedback, rewritesRequest, rewritesStudent, safeOut } from "./output-check";

/** Bài làm mẫu tự đặt và một góp ý tốt, một góp ý làm hộ cho từng mô-đun. */
const SAMPLES: Record<SkillCode, { student: string; good: { good: string; fix: string; question: string }; bad: { good: string; fix: string; question: string } }> = {
  K1: {
    student: "Hôm nay mình bị 4 điểm bài kiểm tra Sinh. Mình thấy buồn, nặng ngực. Mình nghĩ mình học dở môn này.",
    good: {
      good: "Bạn đã kể rõ chuyện xảy ra: bị 4 điểm bài Sinh.",
      fix: "Phần cảm xúc mới có buồn; bạn thử thêm dấu hiệu cơ thể hoặc việc bạn đã làm lúc đó.",
      question: "Ý \"mình học dở môn này\" là chuyện đã xảy ra hay là điều bạn đang nghĩ?",
    },
    bad: {
      good: "Bạn viết rõ.",
      fix: "Có lẽ bạn bị trầm cảm nên mới thấy vậy.",
      question: "Bạn thấy sao?",
    },
  },
  K2: {
    student: "Mình muốn bình tĩnh để đọc đề. Mình hít thở sâu. Sau đó làm câu dễ trước.",
    good: {
      good: "Bạn chọn được cách làm ngay tại chỗ là hít thở sâu.",
      fix: "Bạn chưa nói làm mấy lần hoặc trong bao lâu.",
      question: "Bạn sẽ hít thở mấy lần thì bắt đầu đọc đề?",
    },
    bad: {
      good: "Tốt.",
      fix: "Bạn nên viết lại là: \"Mình sẽ hít vào đếm 4, giữ 4, thở ra 4, làm 4 lần rồi mới đọc lướt toàn bộ đề bài\".",
      question: "Được chưa?",
    },
  },
  K3: {
    student: "Tối nay có Toán nộp mai, ôn Sử thứ Tư, học từ mới Tiếng Anh. Có 2 tiếng. Làm Toán trước vì nộp sớm nhất.",
    good: {
      good: "Bạn đã xếp Toán lên trước và có lý do rõ: nộp sớm nhất.",
      fix: "Bước đầu của việc Toán chưa có lúc bắt đầu cụ thể.",
      question: "Bạn sẽ bắt đầu bài Toán lúc mấy giờ, làm phần nào trước?",
    },
    bad: {
      good: "Bạn có thứ tự rồi.",
      fix: "Lịch của bạn: 19h Toán, 20h Sử, 20h45 Tiếng Anh.",
      question: "Bạn làm theo được không?",
    },
  },
  K4: {
    student: "Em chưa hiểu bài phương trình. Em đã xem lại vở. Em nhờ cô Toán giờ ra chơi.",
    good: {
      good: "Bạn đã nói rõ chỗ vướng và việc đã thử.",
      fix: "Lời nhờ chưa nói bạn muốn cô giúp điều gì.",
      question: "Bạn muốn cô giảng lại phần nào của bài phương trình?",
    },
    bad: {
      good: "Bạn viết khá ổn.",
      fix: "Bạn gửi thế này nhé: Em chào cô, em chưa hiểu bài phương trình, cô giảng lại giúp em được không ạ.",
      question: "Bạn gửi luôn chứ?",
    },
  },
};

test("góp ý mẫu đạt: hiện đúng 3 ý cho cả 4 mô-đun", () => {
  for (const skill of SKILL_CODES) {
    const { student, good } = SAMPLES[skill];
    const fb = acceptFeedback(skill, good, student);
    assert.equal(fb.kind, "ai", skill);
    if (fb.kind === "ai") assert.deepEqual([fb.good, fb.fix, fb.question], [good.good, good.fix, good.question]);
  }
});

test("góp ý chẩn đoán, viết lại bài, điền giờ, viết lời nhờ hộ: thay bằng tiêu chí cố định", () => {
  for (const skill of SKILL_CODES) {
    const { student, bad } = SAMPLES[skill];
    assert.deepEqual(acceptFeedback(skill, bad, student), criteriaFeedback(skill), skill);
  }
});

test("AI lỗi hoặc trả thiếu: vẫn có tiêu chí cố định của đúng mô-đun", () => {
  for (const skill of SKILL_CODES) {
    const fb = acceptFeedback(skill, null, "");
    assert.equal(fb.kind, "criteria");
    if (fb.kind === "criteria") assert.deepEqual(fb.criteria, SKILLS[skill].criteria);
  }
  // câu hỏi không có dấu hỏi, hoặc một ý quá dài: không hiện
  const { student, good } = SAMPLES.K3;
  assert.equal(acceptFeedback("K3", { ...good, question: "Bạn thử nghĩ thêm." }, student).kind, "criteria");
  assert.equal(acceptFeedback("K3", { ...good, fix: "a ".repeat(200) }, student).kind, "criteria");
});

test("trích lại lời học sinh thì được, viết câu mới dài trong ngoặc là viết lại bài", () => {
  const student = "Mình nghĩ là cả lớp chắc chắn sẽ cười mình vì mình trả lời sai câu hỏi dễ nhất";
  assert.equal(rewritesStudent(`Bạn viết "${student}", đó là suy nghĩ hay sự việc?`, student), false);
  assert.equal(rewritesStudent("Bạn có thể viết: \"Mình lo các bạn sẽ cười, nhưng thật ra mình chưa biết các bạn nghĩ gì về câu trả lời của mình\"", student), true);
});

test("K4 tập nói: thầy cô hỏi lại thì được, viết lại lời nhờ giọng học sinh thì không", () => {
  assert.equal(rewritesRequest("Cô hiểu rồi. Em vướng ở bước nào của bài phương trình?"), false);
  assert.equal(rewritesRequest("Em nên nói là: thưa cô, em chưa hiểu bài."), true);
  assert.equal(rewritesRequest("Em chưa hiểu phần chuyển vế, cô giảng lại giúp em được không ạ?"), true);
});

test("câu nối và câu đáp không được là bảng giờ cho việc của học sinh", () => {
  const student = "Tối nay có Toán, Sử, Tiếng Anh mà mình chưa làm gì";
  assert.equal(safeOut("Sắp xếp việc giúp bạn bắt đầu được ngay thay vì lo cả ba môn cùng lúc.", student, true), true);
  assert.equal(safeOut("Bạn làm 19h Toán, 20h Sử, 21h Tiếng Anh là ổn.", student, true), false);
});
