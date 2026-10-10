// Nạp .env.local cho các script chạy bằng `npm run ...`
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Thiếu biến môi trường ${name} trong .env.local`);
    process.exit(1);
  }
  return value;
}
