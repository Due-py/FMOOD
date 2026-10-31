// Đổi chữ "Mây" (tên linh vật cũ) trong NỘI DUNG ĐÃ LƯU trên cơ sở dữ liệu (kế hoạch Demo 3, Bước 9.0).
// Mặc định CHỈ XEM TRƯỚC, không ghi gì. Không xóa nội dung admin đã sửa: chỉ thay đúng chữ "Mây" viết hoa đứng riêng.
//   Xem trước:  npx tsx scripts/doi-ten-tro-ly.ts
//   Ghi thật:   npx tsx scripts/doi-ten-tro-ly.ts --ghi [--nguoi "Tên người chạy"]
//   Thay bằng từ khác (mặc định "mình", đầu câu "Mình"): thêm --thay "trợ lý"
// Xem: app_settings (cài đặt admin: lời dặn, câu khẩn cấp, câu mở đầu…) và support_content (chủ đề, câu hỏi, việc nhỏ,
// lời của trợ lý…). Cài đặt "ai.persona" (trang Tính cách cũ) không còn dùng nên bỏ qua.
// Trước khi ghi một cài đặt, bản đang dùng được cất vào "Các bản trước" (app_settings_history) để quay lại được.
// Mỗi lần ghi thật thêm MỘT dòng vào nhật ký thầy cô.
import { createClient } from "@supabase/supabase-js";
import { renameInJson } from "../lib/rename-assistant";
import { need } from "./_env";

const SKIP_SETTINGS = new Set(["ai.persona"]);

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  const v = i > 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith("--") ? v : null;
}

const short = (s: string) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > 140 ? `${one.slice(0, 140)}…` : one;
};

async function main() {
  const really = process.argv.includes("--ghi");
  const to = (arg("--thay") ?? "mình").slice(0, 30);
  const actorName = (arg("--nguoi") ?? "Lệnh đổi tên trợ lý (máy chủ)").slice(0, 60);
  const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });

  type Plan = { table: "app_settings" | "support_content"; id: string; label: string; value: unknown; old: unknown; meta?: { by: string | null; at: string } };
  const plans: Plan[] = [];
  let places = 0;

  // 1. cài đặt admin
  const settings = await db.from("app_settings").select("key, value, updated_by_name, updated_at");
  if (settings.error) {
    console.error("Không đọc được app_settings:", settings.error.message);
    process.exit(1);
  }
  for (const row of settings.data ?? []) {
    if (SKIP_SETTINGS.has(row.key)) continue;
    const { value, changes } = renameInJson(row.value, to);
    if (!changes.length) continue;
    places += changes.length;
    plans.push({ table: "app_settings", id: row.key, label: `cài đặt ${row.key}`, value, old: row.value, meta: { by: row.updated_by_name, at: row.updated_at } });
    console.log(`\n■ Cài đặt ${row.key} (${changes.length} chỗ)`);
    for (const c of changes) console.log(`   ${c.path || "(giá trị)"}\n     trước: ${short(c.before)}\n     sau:   ${short(c.after)}`);
  }

  // 2. nội dung vòng hỗ trợ (chưa chạy 0010 thì không có bảng)
  const content = await db.from("support_content").select("id, key, kind, data");
  if (content.error) console.log(`\n(Bỏ qua support_content: ${content.error.message})`);
  for (const row of content.data ?? []) {
    const { value, changes } = renameInJson(row.data, to);
    if (!changes.length) continue;
    places += changes.length;
    plans.push({ table: "support_content", id: row.id, label: `${row.kind} ${row.key}`, value, old: row.data });
    console.log(`\n■ Nội dung ${row.kind} · ${row.key} (${changes.length} chỗ)`);
    for (const c of changes) console.log(`   ${c.path}\n     trước: ${short(c.before)}\n     sau:   ${short(c.after)}`);
  }

  console.log(`\nTổng: ${plans.length} mục, ${places} chỗ có chữ "Mây" → "${to}".`);
  if (!really) {
    console.log('Chưa ghi gì. Đọc kỹ phần xem trước ở trên; muốn ghi thật: npx tsx scripts/doi-ten-tro-ly.ts --ghi');
    return;
  }
  if (!plans.length) return;

  let done = 0;
  for (const p of plans) {
    if (p.table === "app_settings") {
      // cất bản đang dùng để quay lại được (chưa chạy 0012 thì vẫn ghi, chỉ không có bản trước)
      const hist = await db.from("app_settings_history").insert({ key: p.id, value: p.old, saved_by_name: p.meta?.by ?? null, saved_at: p.meta?.at ?? new Date().toISOString() });
      if (hist.error) console.warn(`  (không cất được bản trước của ${p.id}: ${hist.error.message})`);
      const { error } = await db.from("app_settings").update({ value: p.value, updated_by_name: actorName, updated_at: new Date().toISOString() }).eq("key", p.id);
      if (error) console.error(`  Lỗi ghi ${p.label}: ${error.message}`);
      else done++;
    } else {
      const { error } = await db.from("support_content").update({ data: p.value, updated_at: new Date().toISOString() }).eq("id", p.id);
      if (error) console.error(`  Lỗi ghi ${p.label}: ${error.message}`);
      else done++;
    }
  }
  console.log(`Đã ghi ${done}/${plans.length} mục.`);

  const row = { actor_id: null, actor_name: actorName, action: "Đổi tên Mây trong nội dung đã lưu", detail: `${done} mục, ${places} chỗ → "${to}"` };
  const { error: auditError } = await db.from("admin_audit").insert({ ...row, kind: "content", target_type: "content" });
  if (auditError) await db.from("admin_audit").insert(row);
}

main();
