// Tạo (hoặc cập nhật) tài khoản admin. Mật khẩu được gõ ẩn khi chạy, KHÔNG lưu trong code.
// Dùng: npm run admin:create -- <email> ["Tên hiển thị"]
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { need } from "./_env";

/** Hỏi mật khẩu mà không hiện ký tự ra màn hình. */
function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const [emailArg, nameArg] = process.argv.slice(2);
  if (!emailArg) {
    console.log('Cách dùng: npm run admin:create -- <email> ["Tên hiển thị"]');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const name = nameArg?.trim() || "Admin";

  const password = await askHidden("Mật khẩu admin (ít nhất 8 ký tự): ");
  if (password.length < 8) {
    console.error("Mật khẩu cần ít nhất 8 ký tự.");
    process.exit(1);
  }
  if ((await askHidden("Nhập lại mật khẩu: ")) !== password) {
    console.error("Hai mật khẩu chưa giống nhau.");
    process.exit(1);
  }

  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });

  // tìm tài khoản có sẵn theo email
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  let id = existing?.id as string | undefined;

  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password, ban_duration: "none" });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      console.error("Không tạo được tài khoản:", error?.message);
      process.exit(1);
    }
    id = data.user.id;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id,
    nickname: name,
    full_name: name,
    email,
    role: "admin",
    locked_at: null,
    onboarded_at: new Date().toISOString(),
  });
  if (profileError) {
    console.error("Không lưu được hồ sơ admin:", profileError.message);
    process.exit(1);
  }
  console.log(`Xong. ${email} là admin. Đăng nhập tại /staff/login`);
}

main();
