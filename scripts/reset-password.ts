// Thầy cô đặt lại mật khẩu cho học sinh quên mật khẩu.
// Dùng: npm run student:reset-password -- <MÃLỚP> "<biệt danh>" <mật khẩu mới>
import { createClient } from "@supabase/supabase-js";
import { need } from "./_env";

async function main() {
  const [code, nickname, password] = process.argv.slice(2);
  if (!code || !nickname || !password) {
    console.log('Cách dùng: npm run student:reset-password -- <MÃLỚP> "<biệt danh>" <mật khẩu mới>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Mật khẩu cần ít nhất 6 ký tự.");
    process.exit(1);
  }

  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });

  const { data: cls } = await admin.from("classes").select("id").eq("code", code.toUpperCase()).maybeSingle();
  if (!cls) {
    console.error("Không tìm thấy mã lớp.");
    process.exit(1);
  }
  const { data: student } = await admin
    .from("profiles")
    .select("id, nickname")
    .eq("class_id", cls.id)
    .ilike("nickname", nickname.replace(/[\\%_]/g, (c) => "\\" + c))
    .maybeSingle();
  if (!student) {
    console.error("Không tìm thấy học sinh có biệt danh này trong lớp.");
    process.exit(1);
  }

  const { error } = await admin.auth.admin.updateUserById(student.id, { password });
  if (error) {
    console.error("Không đặt lại được:", error.message);
    process.exit(1);
  }
  console.log(`Đã đặt lại mật khẩu cho "${student.nickname}". Nhắc bạn ấy đổi mật khẩu trong trang Tôi.`);
}

main();
