"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePage } from "@/lib/permissions";
import { blockInDemo } from "@/lib/demo/guard";
import { JOURNAL_KINDS, PROMPT_MAX } from "@/lib/journal-shared";
import { audit } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// MẪU CÂU NHẬT KÝ (trang thầy cô "Mẫu câu nhật ký", chỉ admin): thêm, sửa, tạm ẩn, xóa, đổi thứ tự.
// Theo mẫu saveReflectionQuestion (app/actions/admin.ts). Không đụng tới nội dung nhật ký của học sinh.

type Result = { ok: true } | { ok: false; error: string };
const PAGE = "/staff/content/nhat-ky";
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };

const promptSchema = z.object({
  kind: z.enum(JOURNAL_KINDS),
  text: z.string().trim().min(3, "Mẫu câu quá ngắn").max(PROMPT_MAX),
  emoji: z.string().trim().max(16),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(99999),
});

function done(actor: Parameters<typeof audit>[0], action: string, detail: string) {
  revalidatePath(PAGE);
  revalidatePath("/nhat-ky", "layout");
  return audit(actor, action, detail);
}

export async function saveJournalPrompt(id: string | null, input: unknown): Promise<Result> {
  const actor = await requirePage(PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = promptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ." };
  const db = createAdminClient();
  const { error } = id ? await db.from("journal_prompts").update(parsed.data).eq("id", id) : await db.from("journal_prompts").insert(parsed.data);
  if (error) return FAILED;
  await done(actor, id ? "Sửa mẫu câu nhật ký" : "Thêm mẫu câu nhật ký", parsed.data.text);
  return { ok: true };
}

export async function deleteJournalPrompt(id: string): Promise<Result> {
  const actor = await requirePage(PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!z.uuid().safeParse(id).success) return FAILED;
  // các trang đã viết giữ nguyên chữ của mẫu (prompt_text), chỉ mất liên kết
  const { error } = await createAdminClient().from("journal_prompts").delete().eq("id", id);
  if (error) return FAILED;
  await done(actor, "Xóa mẫu câu nhật ký", id);
  return { ok: true };
}

/** Đổi chỗ với mẫu đứng trước / sau (theo thứ tự đang hiện). */
export async function moveJournalPrompt(id: string, direction: "up" | "down"): Promise<Result> {
  const actor = await requirePage(PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const db = createAdminClient();
  const { data } = await db.from("journal_prompts").select("id, sort_order").order("sort_order").order("created_at");
  const list = (data ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex((p) => p.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // đánh lại số thứ tự cách đều để đổi chỗ không bị trùng số
  const order = list.map((p) => p.id);
  [order[i], order[j]] = [order[j], order[i]];
  const results = await Promise.all(order.map((pid, k) => db.from("journal_prompts").update({ sort_order: (k + 1) * 10 }).eq("id", pid)));
  if (results.some((r) => r.error)) return FAILED;
  await done(actor, "Đổi thứ tự mẫu câu nhật ký", id);
  return { ok: true };
}
