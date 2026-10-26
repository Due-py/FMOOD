"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { demoProfile } from "@/lib/demo/people";
import { runPrivacyProof, type ProofResult } from "@/lib/demo/privacy";
import { createDemoData, deleteDemoData, timeTravel, type DemoSummary } from "@/lib/demo/seed";
import { DEMO_COOKIE } from "@/lib/demo/shared";
import { simulate, type SimKind, type SimResult } from "@/lib/demo/simulate";
import { teachPreview, type TaughtReply } from "@/lib/demo/teach";
import { audit } from "@/lib/settings";
import { answerFollowup, type FollowupResult } from "@/lib/worries";

// CHẾ ĐỘ TRÌNH DIỄN: mọi thao tác chỉ dành cho admin, và chỉ chạm vào dữ liệu MẪU (xem lib/demo/*).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function admin() {
  return requireStaff(["admin"]);
}

function refresh() {
  revalidatePath("/staff", "layout");
}

/** Bật / tắt chế độ trình diễn trên máy này (cookie, chỉ có tác dụng với tài khoản admin). */
export async function setDemoMode(on: boolean): Promise<Result> {
  const actor = await admin();
  const store = await cookies();
  if (on) store.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  else store.delete(DEMO_COOKIE);
  await audit(actor, on ? "Bật chế độ trình diễn" : "Tắt chế độ trình diễn");
  refresh();
  return { ok: true };
}

export async function createDemo(): Promise<Result<{ summary: DemoSummary }>> {
  const actor = await admin();
  const res = await createDemoData(actor.nickname);
  if (res.ok) await audit(actor, "Tạo dữ liệu mẫu", `${res.summary.classes} lớp, ${res.summary.students} học sinh mẫu`);
  refresh();
  return res;
}

export async function recreateDemo(): Promise<Result<{ summary: DemoSummary }>> {
  const actor = await admin();
  const removed = await deleteDemoData();
  if (!removed.ok) return removed;
  const res = await createDemoData(actor.nickname);
  if (res.ok) await audit(actor, "Tạo lại dữ liệu mẫu", `${res.summary.classes} lớp, ${res.summary.students} học sinh mẫu`);
  refresh();
  return res;
}

export async function removeDemo(): Promise<Result<{ users: number; classes: number }>> {
  const actor = await admin();
  const res = await deleteDemoData();
  if (res.ok) await audit(actor, "Xóa dữ liệu mẫu", `${res.classes} lớp, ${res.users} tài khoản mẫu`);
  refresh();
  return res;
}

const id = z.uuid();

/** Tua nhanh N ngày cho MỘT bạn mẫu. Trả về mốc lúc tua để Hoàn tác. */
export async function fastForward(studentId: string, days = 7): Promise<Result<{ at: string; rows: number }>> {
  await admin();
  if (!id.safeParse(studentId).success || ![1, 3, 7].includes(days)) return { ok: false, error: "Chưa tua được." };
  const res = await timeTravel(studentId, days);
  refresh();
  return res;
}

export async function undoFastForward(studentId: string, days: number, at: string): Promise<Result> {
  await admin();
  if (!id.safeParse(studentId).success || ![1, 3, 7].includes(days) || Number.isNaN(Date.parse(at))) return { ok: false, error: "Chưa hoàn tác được." };
  const res = await timeTravel(studentId, days, at);
  refresh();
  return res.ok ? { ok: true } : res;
}

/** Trả lời "Mây hỏi thăm" THAY một bạn mẫu, bằng đúng hàm học sinh dùng (lib/worries.ts). Bạn thật bị từ chối. */
export async function answerAsDemo(studentId: string, worryId: string, level: number, feeling: string): Promise<FollowupResult> {
  await admin();
  if (!id.safeParse(studentId).success || !id.safeParse(worryId).success) return { ok: false, error: "Không tìm thấy chuyện này." };
  const profile = await demoProfile(studentId);
  if (!profile || profile.role !== "student") return { ok: false, error: "Chỉ trả lời thay được bạn mẫu." };
  const res = await answerFollowup(profile, worryId, Number(level), String(feeling));
  refresh();
  return res;
}

export async function runProof(): Promise<ProofResult> {
  await admin();
  return runPrivacyProof();
}

const SIMS: SimKind[] = ["khan-cap", "dang-lo", "noi-qua", "mat-ket-noi", "nang-hon"];

export async function runSimulation(kind: string): Promise<Result<{ result: SimResult }>> {
  await admin();
  if (!SIMS.includes(kind as SimKind)) return { ok: false, error: "Không có tình huống này." };
  const result = await simulate(kind as SimKind);
  refresh();
  return { ok: true, result };
}

export async function tryTeaching(extra: string, message: string): Promise<Result<{ before: TaughtReply; after: TaughtReply }>> {
  await admin();
  const e = extra.trim().slice(0, 300);
  const m = message.trim().slice(0, 300);
  if (!e || !m) return { ok: false, error: "Nhập cả lời dặn thêm và câu thử nhé." };
  try {
    return { ok: true, ...(await teachPreview(e, m)) };
  } catch {
    return { ok: false, error: "Mây chưa trả lời được lúc này. Thử lại sau ít phút." };
  }
}
