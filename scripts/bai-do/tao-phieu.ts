// Tạo 4 phiếu bài đo kỹ năng trong app (Lần 1/2 × Đề A/B) từ đề trong bộ đo (kế hoạch Demo 3, mục 6.1, 6.2).
// Mỗi phiếu: (lần 2: câu "đã đọc đề này chưa") + 4 tình huống, 9 câu tự trả lời + TĐ1–TĐ4 + HV1, HV2 + câu dùng AI.
// Phiếu tạo ở trạng thái Nháp; admin mở đúng lần đo ở trang Phiếu khảo sát vào buổi đo.
//
// Dùng:
//   npm run bai-do:tao -- --lop 8A1,8A4          chỉ in ra những gì sẽ tạo (không đọc / ghi cơ sở dữ liệu)
//   npm run bai-do:tao -- --lop 8A1,8A4 --ghi    tạo thật (bỏ qua phiếu cùng lần, cùng đề đã có)
// --lop: tên lớp hoặc mã lớp, cách nhau bằng dấu phẩy.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { TestForm, TestRound } from "../../lib/bai-do";
import { buildTestQuestions, parseTestForm, testTitle } from "../../lib/bai-do-kit";
import { questionSchema } from "../../lib/surveys";
import { need } from "../_env";

const KIT = path.join(process.cwd(), "ho-so-du-thi/3-kiem-thu/bo-do-ky-nang");
const read = (f: string) => readFileSync(path.join(KIT, f), "utf8");

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}

const norm = (s: string) => s.normalize("NFC").trim().toLowerCase().replace(/^lớp\s+/u, "");

async function main() {
  const write = process.argv.includes("--ghi");
  const classArg = arg("--lop");
  if (!classArg) {
    console.log("Cách dùng: npm run bai-do:tao -- --lop 8A1,8A4 [--ghi]");
    process.exit(1);
  }
  const wanted = classArg.split(",").map((s) => s.trim()).filter(Boolean);

  const extra = read("3-cau-hoi-them-vao-phieu.md");
  const plans: { round: TestRound; form: TestForm; title: string; description: string; questions: ReturnType<typeof buildTestQuestions> }[] = [];
  for (const round of [1, 2] as const) {
    for (const form of ["A", "B"] as const) {
      const md = read(`1-bai-tinh-huong-de-${form}.md`);
      const questions = buildTestQuestions(md, extra, round);
      for (const q of questions) {
        const ok = questionSchema.safeParse(q);
        if (!ok.success) throw new Error(`Câu ${q.id} (lần ${round}, đề ${form}) chưa hợp lệ: ${ok.error.issues[0].message}`);
      }
      const texts = questions.filter((q) => q.type === "text").length;
      if (texts !== 9) throw new Error(`Đề ${form} có ${texts} câu tự trả lời, cần đúng 9.`);
      const intro = parseTestForm(md).intro;
      const description = `${intro}\nLàm khoảng 15 phút cho 4 tình huống, rồi trả lời vài câu ngắn ở cuối. Ô trả lời không dán chữ được: em tự gõ nhé.`;
      plans.push({ round, form, title: testTitle(round, form), description, questions });
    }
  }

  console.log(`Lớp: ${wanted.join(", ")}`);
  for (const p of plans) {
    console.log(`\n▸ ${p.title} · ${p.questions.length} câu · Nháp`);
    for (const q of p.questions) {
      const first = q.text.split(/\n\s*\n/).pop()!.slice(0, 90);
      console.log(`   ${q.id.padEnd(4)} ${q.type.padEnd(6)} ${first}${q.showIf ? `  (chỉ hỏi khi ${q.showIf.id} là: ${q.showIf.in.join(" / ")})` : ""}`);
    }
  }
  if (!write) {
    console.log("\nChưa ghi gì. Thêm --ghi để tạo thật.");
    return;
  }

  const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
  const { data: classes, error: classError } = await db.from("classes").select("id, name, code");
  if (classError) throw new Error(`Không đọc được danh sách lớp: ${classError.message}`);
  const classIds: string[] = [];
  for (const w of wanted) {
    const c = (classes ?? []).find((x) => norm(x.name as string) === norm(w) || String(x.code).toUpperCase() === w.toUpperCase());
    if (!c) throw new Error(`Không thấy lớp "${w}" (theo tên hoặc mã lớp).`);
    classIds.push(c.id as string);
  }

  const { data: existing, error: kindError } = await db.from("surveys").select("test_round, test_form").eq("kind", "test");
  if (kindError) throw new Error(`Chưa chạy migration 0018_bai_do.sql? (${kindError.message})`);
  for (const p of plans) {
    if ((existing ?? []).some((e) => e.test_round === p.round && e.test_form === p.form)) {
      console.log(`– Bỏ qua "${p.title}": đã có phiếu bài đo lần ${p.round}, đề ${p.form}.`);
      continue;
    }
    const { error } = await db.from("surveys").insert({
      title: p.title,
      description: p.description,
      questions: p.questions,
      class_ids: classIds,
      status: "draft",
      kind: "test",
      test_round: p.round,
      test_form: p.form,
    });
    if (error) throw new Error(`Không tạo được "${p.title}": ${error.message}`);
    console.log(`✓ Đã tạo "${p.title}"`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
