import "server-only";
import { getSetting, type Contact } from "@/lib/settings";

// Thông tin hỗ trợ hiện trên thẻ khẩn cấp và trang "Tôi".
// Admin sửa trong Trang thầy cô → An toàn → Khẩn cấp.

export type SupportContact = Contact;

export async function getSupportContacts(): Promise<{ school: Contact; hotlines: Contact[] }> {
  const { school, hotlines } = await getSetting("safety.crisis");
  return { school, hotlines };
}
