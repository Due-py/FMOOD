// Xóa TOÀN BỘ nhật ký hoạt động học sinh của đợt chạy thử (kế hoạch Demo 3, mục 12.6).
// Hẹn xóa ngày 15/12/2026 (30 ngày sau ngày nộp báo cáo). Mặc định CHỈ ĐẾM, không xóa gì.
//   Xem trước: npm run log:purge
//   Xóa thật:  npm run log:purge -- --xoa [--nguoi "Tên người chạy"]
//   Xóa trước ngày hẹn (chỉ khi nhóm đã thống nhất): thêm --som
// Chỉ xóa bảng student_activity_log. Nhật ký thầy cô (admin_audit) được giữ, và có thêm MỘT dòng ghi lần xóa này.
import { createClient } from "@supabase/supabase-js";
import { LOG_DELETE_ON } from "../lib/activity-log-shared";
import { need } from "./_env";

const MISSING = new Set(["42P01", "PGRST205"]);

async function main() {
  const args = process.argv.slice(2);
  const really = args.includes("--xoa");
  const early = args.includes("--som");
  const who = args[args.indexOf("--nguoi") + 1];
  const actorName = args.includes("--nguoi") && who && !who.startsWith("--") ? who.slice(0, 60) : "Lệnh xóa nhật ký (máy chủ)";

  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });

  const { count, error } = await admin.from("student_activity_log").select("id", { count: "exact", head: true });
  if (error) {
    if (MISSING.has(error.code)) console.log("Chưa có bảng student_activity_log (chưa chạy migration 0016): không có gì để xóa.");
    else console.error("Không đọc được nhật ký học sinh:", error.message);
    process.exit(MISSING.has(error.code) ? 0 : 1);
  }
  const { data: range } = await admin.from("student_activity_log").select("created_at").order("created_at").limit(1);
  const { data: last } = await admin.from("student_activity_log").select("created_at").order("created_at", { ascending: false }).limit(1);
  console.log(`Nhật ký hoạt động học sinh: ${count ?? 0} dòng`);
  if (count) console.log(`  từ ${range?.[0]?.created_at ?? "?"} đến ${last?.[0]?.created_at ?? "?"}`);
  console.log(`  ngày hẹn xóa: ${LOG_DELETE_ON}`);

  if (!really) {
    console.log("\nChưa xóa gì. Muốn xóa thật: npm run log:purge -- --xoa");
    return;
  }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  if (today < LOG_DELETE_ON && !early) {
    console.error(`\nHôm nay (${today}) chưa tới ngày hẹn xóa ${LOG_DELETE_ON}. Nếu nhóm đã thống nhất xóa sớm, thêm --som.`);
    process.exit(1);
  }
  if (!count) {
    console.log("\nKhông có dòng nào để xóa.");
    return;
  }

  // xóa hết (Supabase cần một điều kiện: mọi id đều >= 0)
  const { error: delError } = await admin.from("student_activity_log").delete().gte("id", 0);
  if (delError) {
    console.error("Xóa lỗi:", delError.message);
    process.exit(1);
  }
  const { count: left } = await admin.from("student_activity_log").select("id", { count: "exact", head: true });

  // ghi một dòng vào nhật ký thầy cô; chưa chạy 0019 thì ghi không có các cột mới
  const row = { actor_id: null, actor_name: actorName, action: "Xóa toàn bộ nhật ký hoạt động học sinh", detail: `${count} dòng · còn lại ${left ?? "?"}` };
  const { error: auditError } = await admin.from("admin_audit").insert({ ...row, kind: "log", target_type: "student_activity_log" });
  if (auditError && ["42703", "PGRST204"].includes(auditError.code)) await admin.from("admin_audit").insert(row);
  else if (auditError) console.error("Ghi nhật ký thầy cô lỗi:", auditError.message);

  console.log(`\nĐã xóa ${count} dòng. Còn lại: ${left ?? "?"} dòng. Đã ghi lần xóa vào nhật ký thầy cô.`);
}

main();
