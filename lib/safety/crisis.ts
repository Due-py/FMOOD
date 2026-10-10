import "server-only";
import { getSetting } from "@/lib/settings";

/** Câu trả lời soạn sẵn khi có dấu hiệu nguy hiểm (admin sửa trong mục Khẩn cấp). */
export async function crisisResponse(): Promise<string> {
  return (await getSetting("safety.crisis")).message;
}
