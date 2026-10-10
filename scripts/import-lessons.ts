// Nhập bài học từ content/lessons/ (bài mẫu .md và bài chia từ sách trong oxford/*.json) vào cơ sở dữ liệu.
// Dùng: npm run lessons:import            (bỏ qua bài đã có, giữ chỉnh sửa trên web)
//       npm run lessons:import -- --ghi-de  (ghi đè nội dung bài đã có bằng nội dung trong file)
import "./_env";
import { readLessonFiles, readLessonJson } from "@/lib/lessons";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const overwrite = process.argv.includes("--ghi-de");
  const [md, json] = await Promise.all([readLessonFiles(), readLessonJson()]);
  if (json.errors.length) {
    console.error("Có bài sai cấu trúc, chạy `npm run lessons:check` để xem:", json.errors);
    process.exit(1);
  }
  const lessons = [...md, ...json.lessons].map((l) => ({ ...l, updated_at: new Date().toISOString() }));

  const db = createAdminClient();
  let count = 0;
  for (let i = 0; i < lessons.length; i += 50) {
    const { data, error } = await db
      .from("lessons")
      .upsert(lessons.slice(i, i + 50), { onConflict: "slug", ignoreDuplicates: !overwrite })
      .select("id");
    if (error) {
      console.error("Lỗi khi nhập:", error.message);
      process.exit(1);
    }
    count += data?.length ?? 0;
  }
  console.log(`${overwrite ? "Đã ghi đè/nhập" : "Đã nhập mới"} ${count}/${lessons.length} bài.`);
}

main();
