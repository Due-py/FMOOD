// ĐỐI CHIẾU PHẢN HỒI CÓ AI VÀ KHÔNG AI trên 8 kịch bản cố định (P1, phản biện 31/10). Gọi OpenAI thật, KHÔNG ghi vào cơ sở dữ liệu.
// Dùng:
//   npm run doi-chieu                          chạy với mô hình đang cài (trang Tình trạng trợ lý)
//   npm run doi-chieu -- --mo-hinh gpt-5.4-mini dừng hẳn nếu mô hình đang cài KHÁC tên này (giữ cấu hình cố định)
// Mỗi kịch bản (lib/eval/doi-chieu-cases.ts) có 3 phản hồi, gắn chữ X / Y / Z đã xáo riêng từng kịch bản:
//   F-Mood Demo 2.1  góp ý 3 ý cho bài lần 1 (lib/ai/practice-feedback.ts) + gợi ý khi học sinh gõ lời nhờ làm hộ vào ô
//                    rồi bấm "Mình chưa biết" (trợ lý không đưa gợi ý được thì app cho xem khung mẫu, ghi đúng như vậy)
//   Không AI         danh sách tiêu chí cố định của mô-đun + khung mẫu có chỗ trống (đúng như app hiện khi AI lỗi / hết lượt)
//   Chatbot chung    ĐIỀN TAY theo huong-dan-dien-chatbot.md (script không gọi chatbot nào khác)
// Kết quả lưu vào ho-so-du-thi/3-kiem-thu/ket-qua/doi-chieu_<ngày giờ>_<phiên bản>/:
//   ban-cham.md                 nguyên văn 3 phản hồi mỗi kịch bản, ĐÃ CHE TÊN công cụ (đưa người chấm sau khi điền cột chatbot)
//   phieu-cham-nguoi-1.csv / -2 phiếu chấm trống, mỗi người chấm một file, chấm riêng
//   huong-dan-dien-chatbot.md   lời nhắn soạn sẵn và chữ cần điền cho cột chatbot (nhóm giữ, KHÔNG đưa người chấm)
//   KHOA-giu-kin.json           chữ → công cụ, hạt giống xáo, cấu hình mô hình (nhóm giữ, KHÔNG đưa người chấm)
//   thong-tin-chay.md           phiên bản, mô hình, thời gian (không có kết quả theo công cụ)
// Chỉ kết luận về CHẤT LƯỢNG PHẢN HỒI trên 8 kịch bản này, không kết luận về hiệu quả lên học sinh.
// nạp .env.local trước mọi import khác
import { need } from "./_env";
import { randomInt } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chatModel, safetyModel } from "@/lib/ai/openai";
import { practiceFeedback, practiceHints } from "@/lib/ai/practice-feedback";
import { criteriaFeedback } from "@/lib/practice/output-check";
import type { PracticeFeedback } from "@/lib/practice/shared";
import { SKILLS } from "@/lib/skills";
import {
  assignLetters,
  chatbotPrompts,
  DOI_CHIEU_CASES,
  DOI_CHIEU_CRITERIA,
  LETTERS,
  situationOfCase,
  TOOL_LABEL,
  type DoiChieuCase,
  type Tool,
} from "@/lib/eval/doi-chieu-cases";
import { RESULT_DIR, stamp, versionCode } from "./eval/chung";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

/** Một phản hồi: phần góp ý bài lần 1 và phần đáp lời nhờ làm hộ, nguyên văn. */
type Reply = { gopY: string; lamHo: string };
type FmoodMeta = { gopY: PracticeFeedback["kind"]; lamHo: "ai" | "khung-mau" };

const feedbackText = (fb: PracticeFeedback) =>
  fb.kind === "ai"
    ? [`Điểm làm tốt: ${fb.good}`, `Điểm nên sửa: ${fb.fix}`, `Câu hỏi để bạn tự sửa: ${fb.question}`].join("\n")
    : ["Tự soát bài theo các tiêu chí này:", ...fb.criteria.map((c) => `- ${c}`)].join("\n");

const frameText = (c: DoiChieuCase) => {
  const ex = SKILLS[c.skill].example;
  return [`Xem mẫu của một bạn khác: ${ex.situation}`, ...ex.lines.map((l) => `- ${l}`)].join("\n");
};

async function fmood(c: DoiChieuCase): Promise<{ reply: Reply; meta: FmoodMeta }> {
  const situation = situationOfCase(c);
  const fb = await practiceFeedback({ skill: c.skill, situation, answers: c.banNhap });
  // học sinh gõ lời nhờ làm hộ vào ô rồi bấm "Mình chưa biết" (lượt gợi ý đầu tiên của bài)
  const hints = await practiceHints({ skill: c.skill, fieldKey: c.oLamHo, situation, answers: { ...c.banNhap, [c.oLamHo]: c.lamHo } });
  return {
    reply: { gopY: feedbackText(fb), lamHo: hints ? hints.map((h) => `- ${h}`).join("\n") : frameText(c) },
    meta: { gopY: fb.kind, lamHo: hints ? "ai" : "khung-mau" },
  };
}

const noAi = (c: DoiChieuCase): Reply => ({ gopY: feedbackText(criteriaFeedback(c.skill)), lamHo: frameText(c) });

const CHATBOT_TODO = "(CHƯA ĐIỀN: dán nguyên văn câu trả lời của chatbot chung, xem huong-dan-dien-chatbot.md)";

const quote = (t: string) =>
  t
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

function caseHeader(c: DoiChieuCase): string[] {
  const s = SKILLS[c.skill];
  return [
    `## ${c.id} · ${s.name}`,
    "",
    `**Tình huống (${c.caseCode}):** ${situationOfCase(c)}`,
    "",
    "**Bài lần 1 học sinh viết:**",
    "",
    ...s.fields.map((f) => `- ${f.label} ${c.banNhap[f.key] ? `*${c.banNhap[f.key]}*` : "(bỏ trống)"}`),
    "",
    `**Lời nhờ làm hộ** (gõ vào ô "${s.fields.find((f) => f.key === c.oLamHo)?.label}"): *${c.lamHo}*`,
    "",
    `Cần xem: ${c.canXem}`,
    "",
  ];
}

const csvCell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function ratingSheet(): string {
  const head = ["Kich ban", "Phan hoi", ...DOI_CHIEU_CRITERIA.map((t) => `${t.key} ${t.label} (0-2)`), "Ghi chu"];
  const rows = DOI_CHIEU_CASES.flatMap((c) => LETTERS.map((l) => [c.id, l, ...DOI_CHIEU_CRITERIA.map(() => ""), ""]));
  return `﻿${[head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  need("OPENAI_API_KEY");
  const [chat, safety] = await Promise.all([chatModel(), safetyModel()]);
  const wanted = arg("mo-hinh");
  if (wanted && wanted !== chat) {
    console.error(`Mô hình đang cài là "${chat}", khác "${wanted}". Dừng để giữ cấu hình cố định (đổi ở trang Tình trạng trợ lý hoặc bỏ --mo-hinh).`);
    process.exit(1);
  }
  const t = stamp();
  const version = versionCode();
  const seed = randomInt(1, 2 ** 31 - 1);
  const letters = assignLetters(
    DOI_CHIEU_CASES.map((c) => c.id),
    seed,
  );

  const replies: Record<string, Partial<Record<Tool, Reply>>> = {};
  const meta: Record<string, FmoodMeta> = {};
  // 2 kịch bản cùng lúc (mỗi kịch bản 2 lần gọi AI)
  for (let i = 0; i < DOI_CHIEU_CASES.length; i += 2) {
    await Promise.all(
      DOI_CHIEU_CASES.slice(i, i + 2).map(async (c) => {
        const f = await fmood(c);
        replies[c.id] = { fmood: f.reply, "khong-ai": noAi(c) };
        meta[c.id] = f.meta;
        console.log(`${c.id}: xong (góp ý ${f.meta.gopY === "ai" ? "của trợ lý" : "là tiêu chí cố định"}, lời nhờ làm hộ: ${f.meta.lamHo === "ai" ? "trợ lý gợi ý" : "khung mẫu"})`);
      }),
    );
  }

  // ── bản chấm đã che tên ──
  const body = DOI_CHIEU_CASES.flatMap((c) => [
    ...caseHeader(c),
    ...LETTERS.flatMap((l) => {
      const tool = letters[c.id][l];
      const r = replies[c.id][tool];
      return [
        `### Phản hồi ${l}`,
        "",
        "**Góp ý cho bài lần 1:**",
        "",
        quote(r ? r.gopY : CHATBOT_TODO),
        "",
        "**Đáp lại lời nhờ làm hộ:**",
        "",
        quote(r ? r.lamHo : CHATBOT_TODO),
        "",
      ];
    }),
  ]);
  const banCham = [
    `# Đối chiếu phản hồi trên 8 kịch bản cố định`,
    "",
    "<!-- HƯỚNG DẪN CHO NGƯỜI ĐIỀN (xóa từ dòng này tới dòng HẾT HƯỚNG DẪN trước khi đưa người chấm)",
    "1. Mở huong-dan-dien-chatbot.md. Mỗi kịch bản ghi sẵn chữ (X / Y / Z) cần điền và HAI lời nhắn soạn sẵn.",
    "2. Mở chatbot chung đã chọn (ghi tên, phiên bản, ngày giờ vào huong-dan-dien-chatbot.md), mỗi kịch bản một cuộc trò chuyện MỚI,",
    "   tắt bộ nhớ / lịch sử nếu có, không đăng nhập tài khoản có cá nhân hóa, không thêm lời nào ngoài hai lời nhắn soạn sẵn.",
    "3. Dán lời nhắn 1, chép NGUYÊN VĂN câu trả lời vào ô \"Góp ý cho bài lần 1\" của đúng chữ; dán lời nhắn 2 (lời nhờ làm hộ),",
    "   chép NGUYÊN VĂN vào ô \"Đáp lại lời nhờ làm hộ\". Không sửa chữ, không cắt bớt; bỏ định dạng đậm / tiêu đề nếu làm lộ công cụ.",
    "4. Thay hết các dòng (CHƯA ĐIỀN…). Xóa phần hướng dẫn này. Đưa file này và phiếu chấm cho hai người chấm, chấm riêng.",
    "HẾT HƯỚNG DẪN -->",
    "",
    "Mỗi kịch bản có ba phản hồi X, Y, Z từ ba công cụ khác nhau; thứ tự đã xáo riêng từng kịch bản, chữ không cho biết công cụ nào.",
    `Chấm từng phản hồi theo ${DOI_CHIEU_CRITERIA.length} tiêu chí, mỗi tiêu chí 0 (không đạt), 1 (đạt một phần), 2 (đạt), ghi vào phiếu chấm của mình:`,
    "",
    ...DOI_CHIEU_CRITERIA.map((c) => `- **${c.key}**: ${c.label}`),
    "",
    "Chỉ chấm chất lượng phản hồi trên bài và lời nhờ đã cho; không đoán công cụ.",
    "",
    ...body,
  ].join("\n");

  // ── hướng dẫn điền cột chatbot (lộ chữ của chatbot, nhóm giữ) ──
  const guide = [
    "# Hướng dẫn điền cột chatbot chung (nhóm giữ, KHÔNG đưa người chấm)",
    "",
    "Chatbot đã dùng: `…` · phiên bản / gói: `…` · ngày giờ điền: `…` · người điền: `…` · cài đặt bộ nhớ: `…`",
    "",
    "Mỗi kịch bản: mở cuộc trò chuyện mới, dán lời nhắn 1, chép câu trả lời; dán lời nhắn 2, chép câu trả lời. Điền vào ô của đúng chữ trong ban-cham.md.",
    "",
    ...DOI_CHIEU_CASES.flatMap((c) => {
      const letter = LETTERS.find((l) => letters[c.id][l] === "chatbot");
      const [p1, p2] = chatbotPrompts(c);
      return [`## ${c.id}: điền vào **Phản hồi ${letter}**`, "", "Lời nhắn 1:", "", "```text", p1, "```", "", "Lời nhắn 2:", "", "```text", p2, "```", ""];
    }),
  ].join("\n");

  const info = [
    `# Đối chiếu AI / không AI · ${t.text}`,
    "",
    `Phiên bản: \`${version}\` ("+sua" = có sửa chưa lưu phiên bản, không dùng làm bằng chứng của bản đã khóa) · Lệnh: \`npm run doi-chieu${process.argv.length > 2 ? ` -- ${process.argv.slice(2).join(" ")}` : ""}\``,
    `Mô hình trò chuyện (góp ý, gợi ý): \`${chat}\` · mô hình an toàn đang cài: \`${safety}\` · mức suy luận: low · chờ tối đa 15 giây, thử lại 1 lần (như trên web).`,
    `Số kịch bản: ${DOI_CHIEU_CASES.length} (lib/eval/doi-chieu-cases.ts) · mỗi kịch bản chạy 1 lần.`,
    "",
    "Cột F-Mood dùng đúng hàm góp ý và gợi ý của trang Luyện kỹ năng; cột không AI là tiêu chí cố định và khung mẫu soạn sẵn;",
    "cột chatbot chung điền tay. Kết quả theo từng công cụ chỉ tính sau khi hai người chấm xong và mở file khóa.",
  ].join("\n");

  const dir = path.join(RESULT_DIR, `doi-chieu_${t.file}_${version.replace(/\+/g, "-")}`);
  mkdirSync(dir, { recursive: true });
  const write = (name: string, text: string) => writeFileSync(path.join(dir, name), text.endsWith("\n") ? text : `${text}\n`, "utf8");
  write("ban-cham.md", banCham);
  write("huong-dan-dien-chatbot.md", guide);
  write("thong-tin-chay.md", info);
  writeFileSync(path.join(dir, "phieu-cham-nguoi-1.csv"), ratingSheet(), "utf8");
  writeFileSync(path.join(dir, "phieu-cham-nguoi-2.csv"), ratingSheet(), "utf8");
  write(
    "KHOA-giu-kin.json",
    JSON.stringify(
      {
        loai: "doi-chieu",
        thoiGian: t.text,
        phienBan: version,
        moHinh: { troChuyen: chat, anToan: safety, mucSuyLuan: "low" },
        hatGiong: seed,
        congCu: TOOL_LABEL,
        chu: letters,
        // F-Mood: góp ý là của trợ lý ("ai") hay đã thay bằng tiêu chí cố định ("criteria"); lời nhờ làm hộ: gợi ý hay khung mẫu
        fmood: meta,
      },
      null,
      2,
    ),
  );
  console.log(`\nĐã lưu: ${path.relative(process.cwd(), dir).replace(/\\/g, "/")}/`);
  console.log("Bước tiếp: điền cột chatbot theo huong-dan-dien-chatbot.md, xóa phần hướng dẫn trong ban-cham.md, rồi đưa người chấm.");
}

main();
