import { z } from "zod";

export const classCodeSchema = z
  .string()
  .trim()
  .min(4, "Mã lớp gồm 4–12 ký tự")
  .max(12, "Mã lớp gồm 4–12 ký tự")
  .transform((s) => s.toUpperCase());

export const nicknameSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Biệt danh cần ít nhất 2 ký tự")
      .max(24, "Biệt danh tối đa 24 ký tự")
      .regex(/^[\p{L}\p{N} _.\-]+$/u, "Biệt danh chỉ gồm chữ, số, khoảng trắng và _ . -"),
  );

export const fullNameSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Nhập họ và tên của bạn")
      .max(60, "Họ tên tối đa 60 ký tự")
      .regex(/^[\p{L} .'\-]+$/u, "Họ tên chỉ gồm chữ cái và khoảng trắng"),
  );

export const passwordSchema = z
  .string()
  .min(6, "Mật khẩu cần ít nhất 6 ký tự")
  .max(72, "Mật khẩu quá dài");

/** Lấy thông báo lỗi đầu tiên để hiện cho học sinh. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Thông tin chưa hợp lệ";
}
