"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Profile } from "@/lib/auth";
import { requirePage } from "@/lib/permissions";
import { getHelpRequest, HELP_SNAPSHOT_COLS, type HelpSnapshot } from "@/lib/help-requests";
import { canHandleHelpRequest, replySchema } from "@/lib/help-requests-shared";
import { classScope } from "@/lib/demo/server";
import { allowsClass } from "@/lib/demo/shared";
import { visibleClassIds } from "@/lib/staff";
import { audit } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// HỘP LỜI NHỜ GIÚP CỦA THẦY CÔ. Mỗi thao tác trả về trạng thái cũ để Hoàn tác.

type UndoResult = { ok: true; undo: HelpSnapshot } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

const FORBIDDEN = { ok: false as const, error: "Lời nhờ này không gửi cho thầy cô." };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };

async function allowed(profile: Profile, id: string) {
  if (!z.uuid().safeParse(id).success) return false;
  const req = await getHelpRequest(id);
  // phạm vi lớp: lời nhờ của lớp mẫu chỉ xử lý được khi đang trình diễn (và ngược lại)
  return Boolean(
    req && canHandleHelpRequest(profile.role, await visibleClassIds(profile), req) && allowsClass(await classScope(profile), req.class_id),
  );
}

async function change(id: string, patch: Record<string, unknown>, action: string): Promise<UndoResult> {
  const profile = await requirePage("/staff/loi-nho");
  if (!(await allowed(profile, id))) return FORBIDDEN;
  const db = createAdminClient();
  const { data: before } = await db.from("help_requests").select(HELP_SNAPSHOT_COLS).eq("id", id).maybeSingle();
  if (!before) return FAILED;
  const { error } = await db.from("help_requests").update(patch).eq("id", id);
  if (error) return FAILED;
  await audit(profile, action, undefined, { kind: "help_reply", page: "/staff/loi-nho", targetType: "help_request", targetId: id });
  revalidatePath("/staff", "layout");
  revalidatePath("/home");
  return { ok: true, undo: before as HelpSnapshot };
}

/**
 * Thầy cô được nhờ mở hộp lời nhờ và thấy lời nhờ này: ghi "thầy cô đã xem" (một lần, lần đầu) để học sinh biết
 * lời nhờ đang ở đâu. Chỉ người được nhờ mới ghi được (admin không ghi hộ lời nhờ gửi riêng GVCN).
 */
export async function markHelpSeen(ids: string[]): Promise<void> {
  const profile = await requirePage("/staff/loi-nho");
  const allowedIds: string[] = [];
  for (const id of ids.slice(0, 50)) if (await allowed(profile, id)) allowedIds.push(id);
  if (!allowedIds.length) return;
  const { error } = await createAdminClient()
    .from("help_requests")
    .update({ seen_at: new Date().toISOString(), seen_by_name: profile.nickname })
    .in("id", allowedIds)
    .is("seen_at", null);
  // chưa chạy 0014 thì chưa có cột: bỏ qua
  if (error && !["42703", "PGRST204"].includes(error.code)) console.error("[F-Mood] Ghi đã xem lời nhờ lỗi", error.message);
}

/** Trả lời em: em thấy lời đáp ở trang chủ. */
export async function replyHelpRequest(id: string, reply: string): Promise<UndoResult> {
  const profile = await requirePage("/staff/loi-nho");
  const parsed = replySchema.safeParse(reply);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return change(id, {
    status: "replied",
    reply: parsed.data,
    replied_by: profile.id,
    replied_by_name: profile.nickname,
    replied_at: new Date().toISOString(),
  }, "Trả lời lời nhờ");
}

/** Đánh dấu xong (đã gặp em) hoặc mở lại. */
export async function setHelpRequestDone(id: string, done: boolean): Promise<UndoResult> {
  const db = createAdminClient();
  const { data } = await db.from("help_requests").select("reply").eq("id", id).maybeSingle();
  return change(id, { status: done ? "done" : data?.reply ? "replied" : "new" }, done ? "Lời nhờ: đã gặp em, xong" : "Lời nhờ: mở lại");
}

const snapshotSchema = z.object({
  status: z.enum(["new", "replied", "done"]),
  reply: z.string().max(300).nullable(),
  replied_by: z.uuid().nullable(),
  replied_by_name: z.string().max(80).nullable(),
  replied_at: z.string().max(40).nullable(),
});

export async function undoHelpRequest(id: string, snapshot: HelpSnapshot): Promise<Result> {
  const profile = await requirePage("/staff/loi-nho");
  if (!(await allowed(profile, id))) return FORBIDDEN;
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) return FAILED;
  const { error } = await createAdminClient().from("help_requests").update(parsed.data).eq("id", id);
  if (error) return FAILED;
  await audit(profile, "Lời nhờ: hoàn tác", undefined, { kind: "help_reply", page: "/staff/loi-nho", targetType: "help_request", targetId: id });
  revalidatePath("/staff", "layout");
  return { ok: true };
}
