// Supabase Auth cần email, nhưng học sinh F-Mood không dùng email.
// Mỗi tài khoản có một email ẩn tạo từ id, không ai nhận thư ở địa chỉ này.
export const STUDENT_EMAIL_DOMAIN = "students.fmood.invalid";

export function studentEmail(userId: string): string {
  return `${userId}@${STUDENT_EMAIL_DOMAIN}`;
}
