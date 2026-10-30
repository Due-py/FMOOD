// Xóa tài khoản và dữ liệu của học sinh một lớp sau đợt dùng thử (thời hạn lưu dữ liệu).
// Mặc định CHỈ ĐẾM, không xóa gì. Muốn xóa thật phải gõ thêm mã xác nhận đúng tên lớp.
//   Xem trước: npm run class:purge -- <MÃLỚP>
//   Xóa thật:  npm run class:purge -- <MÃLỚP> --xoa XOA-<MÃLỚP>
// Xóa giống hệt "Xóa tài khoản" của học sinh: xóa ảnh đại diện rồi xóa tài khoản, mọi dữ liệu riêng
// (check-in, trò chuyện, chuyện bận lòng, thói quen…) tự xóa theo. Cảnh báo an toàn do nhà trường
// quản lý được giữ lại và không còn gắn với tài khoản. Tài khoản thầy cô không bao giờ bị xóa ở đây.
import { createClient } from "@supabase/supabase-js";
import { need } from "./_env";

async function main() {
  const [rawCode, flag, confirm] = process.argv.slice(2);
  if (!rawCode) {
    console.log("Cách dùng: npm run class:purge -- <MÃLỚP> [--xoa XOA-<MÃLỚP>]");
    process.exit(1);
  }
  const code = rawCode.toUpperCase();
  const really = flag === "--xoa";
  if (really && confirm !== `XOA-${code}`) {
    console.error(`Mã xác nhận chưa đúng. Gõ đúng: --xoa XOA-${code}`);
    process.exit(1);
  }

  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });

  const { data: cls } = await admin.from("classes").select("id, name").eq("code", code).maybeSingle();
  if (!cls) {
    console.error("Không tìm thấy mã lớp.");
    process.exit(1);
  }
  const { data: students, error } = await admin
    .from("profiles")
    .select("id, nickname")
    .eq("class_id", cls.id)
    .eq("role", "student");
  if (error) {
    console.error("Không đọc được danh sách học sinh:", error.message);
    process.exit(1);
  }
  const ids = (students ?? []).map((s) => s.id as string);

  const count = async (table: string, column: string, values: string[]) => {
    if (!values.length) return 0;
    const { count: n } = await admin.from(table).select("id", { count: "exact", head: true }).in(column, values);
    return n ?? 0;
  };
  const [checkins, conversations, worries, alerts] = await Promise.all([
    count("checkins", "user_id", ids),
    count("conversations", "user_id", ids),
    count("worries", "user_id", ids),
    count("alerts", "class_id", [cls.id as string]),
  ]);

  console.log(`Lớp ${cls.name} (${code}): ${ids.length} học sinh`);
  console.log(`  check-in: ${checkins} · cuộc trò chuyện: ${conversations} · chuyện bận lòng: ${worries}`);
  console.log(`  cảnh báo an toàn của lớp (được GIỮ LẠI): ${alerts}`);
  if (!really) {
    console.log(`\nChưa xóa gì. Muốn xóa thật: npm run class:purge -- ${code} --xoa XOA-${code}`);
    return;
  }

  let failed = 0;
  for (const s of students ?? []) {
    const bucket = admin.storage.from("avatars");
    const { data: files } = await bucket.list(s.id);
    if (files?.length) await bucket.remove(files.map((f) => `${s.id}/${f.name}`));
    const { error: delError } = await admin.auth.admin.deleteUser(s.id);
    if (delError) {
      failed += 1;
      console.error(`  Chưa xóa được "${s.nickname}": ${delError.message}`);
    }
  }
  console.log(`\nĐã xóa ${ids.length - failed}/${ids.length} tài khoản học sinh của lớp ${code}.`);
  if (failed) process.exit(1);
}

main();
