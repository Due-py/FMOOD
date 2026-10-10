// Chạy các file SQL trong supabase/migrations theo thứ tự tên file.
// Dùng: npm run db:migrate   (cần SUPABASE_DB_URL trong .env.local)
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { need } from "./_env";

async function main() {
  const sql = postgres(need("SUPABASE_DB_URL"), { ssl: "require", max: 1, onnotice: () => {} });
  const dir = path.join(process.cwd(), "supabase/migrations");

  try {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      process.stdout.write(`→ ${file} … `);
      await sql.unsafe(readFileSync(path.join(dir, file), "utf8"));
      console.log("xong");
    }
  } catch (error) {
    console.error("\nLỗi khi chạy migration:", error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
