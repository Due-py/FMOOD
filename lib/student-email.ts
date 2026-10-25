// Supabase Auth cần email, nhưng học sinh F-Mood không dùng email.
// Mỗi tài khoản có một email ẩn tạo từ id, không ai nhận thư ở địa chỉ này.
export const STUDENT_EMAIL_DOMAIN = "students.fmood.invalid";

export function studentEmail(userId: string): string {
  return `${userId}@${STUDENT_EMAIL_DOMAIN}`;
}

/**
 * Email "mồi" cho mã lớp + biệt danh KHÔNG tồn tại. Bước tìm tài khoản khi đăng nhập
 * luôn trả về một email trông như thật, nên người ngoài không dò được biệt danh nào
 * có trong lớp: sai biệt danh hay sai mật khẩu đều chỉ nhận một câu báo lỗi giống nhau.
 * Cùng mã lớp + biệt danh luôn ra cùng một email (dò lại cũng không thấy khác).
 */
export async function decoyStudentEmail(secret: string, classCode: string, nickname: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${classCode.toUpperCase()}\n${nickname.toLowerCase()}`));
  const h = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // dạng UUID v4 giống id thật
  const variant = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  return studentEmail(`${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`);
}
