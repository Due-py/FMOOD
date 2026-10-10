// Tạo lớp mới và in mã lớp để đưa cho học sinh.
// Dùng: npm run class:create -- "8A1" 8 [MÃLỚP]
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { need } from "./_env";

async function main() {
  const [name, gradeArg, codeArg] = process.argv.slice(2);
  if (!name) {
    console.log('Cách dùng: npm run class:create -- "<tên lớp>" <khối 6-12> [mã lớp tự chọn]');
    console.log('Ví dụ:     npm run class:create -- "8A1" 8');
    process.exit(1);
  }

  // bỏ các ký tự dễ nhầm như O/0, I/1
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = (codeArg ?? Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).toUpperCase();

  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });

  const { error } = await admin.from("classes").insert({
    name,
    grade: gradeArg ? Number(gradeArg) : null,
    code,
  });
  if (error) {
    console.error("Không tạo được lớp:", error.message);
    process.exit(1);
  }
  console.log(`Đã tạo lớp ${name}. Mã lớp: ${code}`);
}

main();
