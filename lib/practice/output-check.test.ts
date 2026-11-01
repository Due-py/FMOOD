// Kiểm tra góp ý và lời trợ lý trong bài luyện bằng câu trả lời mẫu viết tay cho cả 9 mô-đun. Chạy: npm test
// (không gọi AI: đây là phần quyết định câu nào được hiện, câu nào thay bằng tiêu chí cố định)
import assert from "node:assert/strict";
import { test } from "node:test";
import { GOP_Y_CASES } from "@/lib/eval/khong-lam-ho-cases";
import { caseByCode, SKILL_IDS, SKILLS, type SkillId } from "@/lib/skills";
import { acceptFeedback, criteriaFeedback, partnerLineProblem, priorityUnmet, rewritesRequest, rewritesStudent, safeOut } from "./output-check";
import { ROLEPLAY } from "./roleplay";
import { cleanAnswers } from "./state";

type Fb = { good: string; fix: string; question: string };

/** Góp ý làm hộ / chẩn đoán / sai dạng cho 5 mô-đun mới (góp ý tốt là góp ý mẫu đã duyệt, lib/eval/khong-lam-ho-cases.ts). */
const BAD_NEW: Record<string, Fb> = {
  see_other_side: {
    good: "Bạn kể đúng việc đã xảy ra.",
    fix: "Bạn nên viết lại là: \"Có thể bạn ấy quên vì tuần này nhiều bài, cũng có thể bạn ấy chưa hiểu phần việc của mình nên ngại hỏi\".",
    question: "Được chưa?",
  },
  notice_peer_stress: {
    good: "Bạn đã để ý bạn ngồi cạnh khác mọi ngày.",
    // ô người lớn ghi "Không cần" mà ý sửa nói chuyện khác: không đạt ưu tiên
    fix: "Câu hỏi han của bạn hơi cụt, thử nói điều bạn để ý trước.",
    question: "Bạn sẽ nói câu hỏi han nào nhẹ nhàng hơn?",
  },
  listen_to_peer: {
    good: "Bạn mời bạn ấy kể.",
    fix: "Có lẽ bạn bị trầm cảm nhẹ nên khó nghe bạn.",
    question: "Bạn thấy sao?",
  },
  resolve_group_conflict: {
    good: "Bạn nêu được chuyện bất đồng.",
    fix: "Bạn nói thế này nhé: \"Mình thấy hơi lo vì sắp đến hạn nộp, mình muốn mỗi người nói ý mình rồi cả nhóm cùng chọn\".",
    question: "Bạn nói luôn chứ?",
  },
  say_no_to_pressure: {
    good: "Bạn đã nêu rõ ai rủ.",
    fix: "Câu từ chối còn lưng chừng.",
    question: "Bạn thử lại.",
  },
};
const studentOf = (skill: SkillId, answers: Record<string, string>, caseCode: string) => [caseByCode(caseCode)?.situation ?? "", ...Object.values(answers)].join("\n");
const NEW_SAMPLES = Object.fromEntries(
  GOP_Y_CASES.map((c) => [c.skill, { student: studentOf(c.skill, c.baiLam, c.caseCode), answers: cleanAnswers(c.skill, c.baiLam), good: c.mau, bad: BAD_NEW[c.skill] }]),
);

/** Bài làm mẫu tự đặt và một góp ý tốt, một góp ý làm hộ cho từng mô-đun. */
const SAMPLES: Record<SkillId, { student: string; answers?: Record<string, string>; good: Fb; bad: Fb }> = {
  ...(NEW_SAMPLES as Record<(typeof GOP_Y_CASES)[number]["skill"], { student: string; answers: Record<string, string>; good: Fb; bad: Fb }>),
  recognize_feelings_thoughts: {
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
  calm_in_the_moment: {
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
  plan_step_by_step: {
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
  ask_for_help: {
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

test("góp ý mẫu đạt: hiện đúng 3 ý cho cả 9 mô-đun", () => {
  for (const skill of SKILL_IDS) {
    const { student, good, answers } = SAMPLES[skill];
    const fb = acceptFeedback(skill, good, student, answers);
    assert.equal(fb.kind, "ai", skill);
    if (fb.kind === "ai") assert.deepEqual([fb.good, fb.fix, fb.question], [good.good, good.fix, good.question]);
  }
});

test("góp ý chẩn đoán, viết lại bài, điền giờ, viết lời nhờ hộ: thay bằng tiêu chí cố định", () => {
  for (const skill of SKILL_IDS) {
    const { student, bad, answers } = SAMPLES[skill];
    assert.deepEqual(acceptFeedback(skill, bad, student, answers), criteriaFeedback(skill), skill);
  }
});

test("AI lỗi hoặc trả thiếu: vẫn có tiêu chí cố định của đúng mô-đun", () => {
  for (const skill of SKILL_IDS) {
    const fb = acceptFeedback(skill, null, "");
    assert.equal(fb.kind, "criteria");
    if (fb.kind === "criteria") assert.deepEqual(fb.criteria, SKILLS[skill].criteria);
  }
  // câu hỏi không có dấu hỏi, hoặc một ý quá dài: không hiện
  const { student, good } = SAMPLES.plan_step_by_step;
  assert.equal(acceptFeedback("plan_step_by_step", { ...good, question: "Bạn thử nghĩ thêm." }, student).kind, "criteria");
  assert.equal(acceptFeedback("plan_step_by_step", { ...good, fix: "a ".repeat(200) }, student).kind, "criteria");
});

test("trích lại lời học sinh thì được, viết câu mới dài trong ngoặc là viết lại bài", () => {
  const student = "Mình nghĩ là cả lớp chắc chắn sẽ cười mình vì mình trả lời sai câu hỏi dễ nhất";
  assert.equal(rewritesStudent(`Bạn viết "${student}", đó là suy nghĩ hay sự việc?`, student), false);
  assert.equal(rewritesStudent("Bạn có thể viết: \"Mình lo các bạn sẽ cười, nhưng thật ra mình chưa biết các bạn nghĩ gì về câu trả lời của mình\"", student), true);
});

test("tập nói (mở lời nhờ người giúp): thầy cô hỏi lại thì được, viết lại lời nhờ giọng học sinh thì không", () => {
  assert.equal(rewritesRequest("Cô hiểu rồi. Em vướng ở bước nào của bài phương trình?"), false);
  assert.equal(rewritesRequest("Em nên nói là: thưa cô, em chưa hiểu bài."), true);
  assert.equal(rewritesRequest("Em chưa hiểu phần chuyển vế, cô giảng lại giúp em được không ạ?"), true);
});

test("câu nối và câu đáp không được là bảng giờ cho việc của học sinh", () => {
  const student = "Tối nay có Toán, Sử, Tiếng Anh mà mình chưa làm gì";
  assert.equal(safeOut("Sắp xếp việc giúp bạn bắt đầu được ngay thay vì lo cả ba môn cùng lúc.", student, true), true);
  assert.equal(safeOut("Bạn làm 19h Toán, 20h Sử, 21h Tiếng Anh là ổn.", student, true), false);
});

test("ưu tiên góp ý (Nhận ra khi bạn đang áp lực): ô người lớn trống / \"không cần\" / giữ bí mật thì ý sửa phải nói về người lớn", () => {
  const skill = "notice_peer_stress";
  assert.equal(priorityUnmet(skill, {}), true);
  assert.equal(priorityUnmet(skill, { adult: "Không cần." }), true);
  assert.equal(priorityUnmet(skill, { adult: "mình sẽ giữ bí mật cho bạn ấy" }), true);
  assert.equal(priorityUnmet(skill, { adult: "Nếu bạn ấy buồn nhiều ngày, mình nói với cô chủ nhiệm." }), false);
  // mô-đun không có ưu tiên: không bao giờ chặn vì lý do này
  assert.equal(priorityUnmet("listen_to_peer", {}), false);
  const { student, bad } = SAMPLES[skill];
  // cùng góp ý nói chuyện khác, nhưng ô người lớn đã viết rõ: hiện bình thường
  assert.equal(acceptFeedback(skill, bad, student, { adult: "Nếu bạn ấy buồn nhiều ngày, mình nói với cô chủ nhiệm." }).kind, "ai");
  // "cô" là nguyên chữ, không khớp "có"
  assert.equal(acceptFeedback(skill, { ...bad, fix: "Bạn có thể thêm việc nhỏ cụ thể hơn." }, student, { adult: "" }).kind, "criteria");
  assert.equal(acceptFeedback(skill, { ...bad, fix: "Ô người lớn còn trống: bạn sẽ kể với cô nào?" }, student, { adult: "" }).kind, "ai");
});

test("vai bạn cùng lớp: câu trong vai tự nhiên thì được; sửa câu, chấm cách nói, gọi em, ra vai, chạm bộ lọc an toàn thì không", () => {
  for (const ok of [
    "Ừ… mình cũng không biết nữa. Về nhà bố mẹ mắng cả buổi, mình thấy tủi lắm.",
    "Nhưng mình cũng làm cả tối qua mà. Bạn muốn chia lại thế nào?",
    "Ừ thôi được, thế ra chơi bạn giảng mình câu đó nhé.",
    "Em trai mình cũng hay bị mắng như vậy.",
    "Ừ, bạn nói đúng, mình cũng sợ trễ hạn.",
  ]) {
    assert.equal(partnerLineProblem(ok), null, ok);
  }
  const bad: [string, string][] = [
    ["Bạn nên nói là: mình hiểu cảm giác của bạn.", "sua-cau"],
    ["Câu nhắc lại của bạn hay đấy, mình thấy được nghe.", "sua-cau"],
    ["Bạn hỏi rất tốt, mình kể tiếp nhé.", "sua-cau"],
    ["Em cứ kể đi, mình nghe.", "xung-em"],
    ["Thật ra mình là trợ lý AI nên không chơi game được.", "ra-vai"],
    ["Thưa cô, em quên vở ở nhà ạ.", "loi-nho"],
    ["Chán quá, mình chỉ muốn chết cho xong.", "an-toan"],
  ];
  for (const [text, why] of bad) assert.equal(partnerLineProblem(text), why, text);
  // mọi câu mở đầu soạn sẵn của các vai bạn cùng lớp đều qua kiểm tra
  for (const spec of Object.values(ROLEPLAY)) {
    if (spec?.kind !== "peer") continue;
    for (const line of [spec.opening, ...Object.values(spec.openingByCase), spec.fallback, spec.fallbackEnd]) assert.equal(partnerLineProblem(line), null, line);
  }
});
