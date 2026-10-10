import "server-only";
import { randomInt } from "node:crypto";

// bỏ các ký tự dễ nhầm như O/0, I/l/1
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

/** Mật khẩu tạm dễ đọc cho học sinh/thầy cô, ví dụ "mxkt-4827". */
export function tempPassword(): string {
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(LETTERS, 4)}-${pick(DIGITS, 4)}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Mã lớp 6 ký tự, ví dụ "K7QX2M". */
export function classCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}
