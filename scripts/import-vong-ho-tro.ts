// Nhập nội dung mẫu của vòng hỗ trợ (content/vong-ho-tro/noi-dung-mau.json) vào cơ sở dữ liệu.
// Dùng: npm run vong:import   (chạy sau supabase/migrations/0010_vong_ho_tro.sql)
// Chỉ THÊM mục mới, luôn ở trạng thái TẮT. Không bao giờ ghi đè mục đã có (giữ chữ cô Thúy đã sửa và trạng thái đã bật).
import "./_env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { planImport, type SeedItem } from "@/lib/support-content";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const items = JSON.parse(
    readFileSync(path.join(process.cwd(), "content/vong-ho-tro/noi-dung-mau.json"), "utf8"),
  ) as SeedItem[];
  const db = createAdminClient();

  const { data: existing, error } = await db.from("support_content").select("key");
  if (error) {
    console.error("Chưa đọc được bảng support_content. Đã chạy supabase/migrations/0010_vong_ho_tro.sql chưa?", error.message);
    process.exit(1);
  }
  const rows = planImport(items, new Set((existing ?? []).map((r) => r.key as string)));
  if (rows.length) {
    const { error: insertError } = await db.from("support_content").insert(rows);
    if (insertError) {
      console.error("Lỗi khi nhập:", insertError.message);
      process.exit(1);
    }
  }
  console.log(`Đã thêm ${rows.length} mục mới (trạng thái Tắt), bỏ qua ${items.length - rows.length} mục đã có.`);
}

main();
