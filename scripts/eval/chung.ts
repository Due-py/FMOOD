// Phần chung cho các bộ thử chạy trên máy (an toàn, câu trả lời, đoán chủ đề, so sánh A/B):
// mã phiên bản, ngày giờ, lưu file kết quả vào ho-so-du-thi/3-kiem-thu/ket-qua/ (không ghi đè lần chạy cũ).
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RiskLevel } from "@/lib/safety/keywords";
import type { SafetyCase, Turn } from "@/lib/eval/safety-cases";

export const RESULT_DIR = path.join(process.cwd(), "ho-so-du-thi/3-kiem-thu/ket-qua");

/**
 * Mã phiên bản = mã commit ngắn; có sửa chưa lưu phiên bản (chưa commit) thì thêm "+sua" để không nhầm
 * kết quả của bản đang sửa với bản đã lưu.
 */
export function versionCode(): string {
  try {
    const commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    const dirty = execSync("git status --porcelain --untracked-files=no", { encoding: "utf8" }).trim().length > 0;
    return dirty ? `${commit}+sua` : commit;
  } catch {
    return "khong-ro";
  }
}

/** Ngày giờ Việt Nam, dạng 2026-10-30_2215 (dùng trong tên file) và dạng đọc được. */
export function stamp(now = new Date()): { file: string; text: string } {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return {
    file: `${v("year")}-${v("month")}-${v("day")}_${v("hour")}${v("minute")}`,
    text: now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
  };
}

/**
 * Lưu kết quả một lần chạy: <tên bộ>_<ngày giờ>_<phiên bản>.md (người đọc) và .json (đầy đủ từng câu).
 * Trả về đường dẫn tương đối của 2 file.
 */
export function saveResult(kind: string, md: string, json: unknown): string[] {
  mkdirSync(RESULT_DIR, { recursive: true });
  const base = `${kind}_${stamp().file}_${versionCode().replace(/\+/g, "-")}`;
  const files = [path.join(RESULT_DIR, `${base}.md`), path.join(RESULT_DIR, `${base}.json`)];
  writeFileSync(files[0], md.endsWith("\n") ? md : `${md}\n`, "utf8");
  writeFileSync(files[1], `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return files.map((f) => path.relative(process.cwd(), f).replace(/\\/g, "/"));
}

/** Số lần chạy từ tham số --lan N (mặc định 1). */
export function rounds(): number {
  const i = process.argv.indexOf("--lan");
  return i > 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 1;
}

type NewCase = { cau: string; muc: RiskLevel; nguoi_viet?: string; truoc?: Turn[] };

/** Bộ câu an toàn MỚI do người ngoài nhóm viết (lib/eval/bo-moi/an-toan.json). Rỗng khi chưa có ai viết. */
export function newSafetyCases(): { cases: SafetyCase[]; authors: string[] } {
  const file = path.join(process.cwd(), "lib/eval/bo-moi/an-toan.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as { cau: NewCase[] };
  const ok = (m: string): m is RiskLevel => m === "none" || m === "concern" || m === "urgent";
  const cases = (data.cau ?? []).filter((c) => typeof c.cau === "string" && c.cau.trim() && ok(c.muc));
  if (cases.length !== (data.cau ?? []).length) console.warn(`Bộ mới: bỏ ${(data.cau ?? []).length - cases.length} câu viết chưa đúng mẫu.`);
  return {
    cases: cases.map((c) => [c.cau.trim(), c.muc, c.truoc] as SafetyCase),
    authors: [...new Set(cases.map((c) => c.nguoi_viet ?? "không ghi"))],
  };
}
