// Kiểm tra các bài trong content/lessons/oxford/*.json trước khi nhập.
// Dùng: npm run lessons:check
import { readLessonJson } from "@/lib/lessons";

async function main() {
  const { lessons, errors } = await readLessonJson();
  const byGrade = new Map<number | null, number>();
  let exercises = 0;
  const problems = [...errors];
  const slugs = new Set<string>();

  for (const l of lessons) {
    byGrade.set(l.grade, (byGrade.get(l.grade) ?? 0) + 1);
    exercises += l.exercises.length;
    if (!/^[a-z0-9-]{2,80}$/.test(l.slug)) problems.push(`${l.slug}: đường dẫn sai dạng`);
    if (slugs.has(l.slug)) problems.push(`${l.slug}: trùng đường dẫn`);
    slugs.add(l.slug);
    if (l.exercises.length < 1 || l.exercises.length > 2) problems.push(`${l.slug}: có ${l.exercises.length} bài tập (cần 1–2)`);
    for (const e of l.exercises) {
      if (!e.hint) problems.push(`${l.slug} › ${e.id}: thiếu gợi ý`);
      if ((e.type === "choice" || e.type === "multi") && e.options.length < 2) problems.push(`${l.slug} › ${e.id}: thiếu lựa chọn`);
      const answers = e.answer === undefined ? [] : Array.isArray(e.answer) ? e.answer : [e.answer];
      for (const a of answers) if (!e.options.includes(a)) problems.push(`${l.slug} › ${e.id}: đáp án “${a}” không nằm trong lựa chọn`);
      if (e.type === "scale" && (!e.minLabel || !e.maxLabel)) problems.push(`${l.slug} › ${e.id}: thang điểm thiếu nhãn`);
    }
  }

  for (const [g, n] of [...byGrade].sort()) console.log(`Lớp ${g ?? "?"}: ${n} bài`);
  console.log(`Tổng: ${lessons.length} bài, ${exercises} bài tập`);
  if (problems.length) {
    console.log(`\n${problems.length} vấn đề:`);
    for (const p of problems) console.log(" - " + p);
    process.exitCode = 1;
  } else console.log("Không có lỗi.");
}

main();
