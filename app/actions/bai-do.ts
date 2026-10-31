"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, type Profile } from "@/lib/auth";
import { requirePage } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";
import { CELL_IDS, GUESS_CLASS_OPTIONS, GUESS_ROUND_OPTIONS, gradingCode, isCellValue, type Cells } from "@/lib/bai-do";
import { gradingLock, MISSING, raterSlot, responseIdForRater, SECOND_RATER_SAMPLE } from "@/lib/bai-do-server";
import { blockInDemo } from "@/lib/demo/guard";
import { createAlert } from "@/lib/safety/alerts";
import { audit } from "@/lib/settings";
import { TEST_ALERT_PREFIX } from "@/lib/staff-privacy";
import { readSurveys, surveyForStudent } from "@/lib/surveys-server";
import { createAdminClient } from "@/lib/supabase/admin";

// BÀI ĐO VÀ CHẤM MÙ (kế hoạch Demo 3, mục 6.2, 6.7). Mọi thao tác kiểm tra lại quyền ở máy chủ.

type Result = { ok: true } | { ok: false; error: string };

const FORBIDDEN = { ok: false as const, error: "Bạn không có quyền làm việc này." };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };
const NOT_READY = { ok: false as const, error: "Cần chạy cập nhật cơ sở dữ liệu 0018_bai_do.sql trước." };

// ───────────────────────── Học sinh ─────────────────────────

/** Ghi "bắt đầu bài đo" vào nhật ký hoạt động (chỉ mã phiếu, không có nội dung). Trình duyệt gọi một lần mỗi bài. */
export async function markTestStart(surveyId: string): Promise<void> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(surveyId).success) return;
  const found = await surveyForStudent(profile, surveyId);
  if (!found || found.answered || found.survey.kind !== "test") return;
  logActivity(profile, "test_start", surveyId.slice(0, 8));
}

// ───────────────────────── Lớp "chỉ làm bài đo" (admin) ─────────────────────────

/** Bật / tắt chế độ "chỉ làm bài đo" cho một lớp (lớp so sánh): học sinh chỉ thấy trang bài đo, không dùng trợ lý. */
export async function setClassTestOnly(classId: string, on: boolean): Promise<Result> {
  const profile = await requirePage("/staff/classes", ["admin"]);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!z.uuid().safeParse(classId).success) return FORBIDDEN;
  const { error } = await createAdminClient().from("classes").update({ test_only: on }).eq("id", classId);
  if (error) return MISSING.has(error.code) ? NOT_READY : FAILED;
  await audit(profile, on ? "Bật chế độ chỉ làm bài đo" : "Tắt chế độ chỉ làm bài đo", classId);
  revalidatePath("/staff", "layout");
  return { ok: true };
}

// ───────────────────────── Chấm bài: phần admin ─────────────────────────

/** Giao người chấm 1 / người chấm 2. Chỉ giáo viên hoặc tư vấn viên; admin (thành viên nhóm) không được chấm. */
export async function setRater(slot: 1 | 2, userId: string | null): Promise<Result> {
  const profile = await requirePage("/staff/cham-bai", ["admin"]);
  if (slot !== 1 && slot !== 2) return FORBIDDEN;
  const { ready, lock } = await gradingLock();
  if (!ready) return NOT_READY;
  if (lock.locked_at) return { ok: false, error: "Đã khóa điểm nên không đổi người chấm được." };
  const db = createAdminClient();
  if (userId) {
    if (!z.uuid().safeParse(userId).success) return FORBIDDEN;
    const { data: p } = await db.from("profiles").select("role, nickname").eq("id", userId).maybeSingle();
    if (!p || !["teacher", "counselor"].includes(p.role as string)) {
      return { ok: false, error: "Người chấm phải là tài khoản giáo viên hoặc tư vấn viên (không phải admin, không phải học sinh)." };
    }
    const { data: other } = await db.from("test_raters").select("slot").eq("user_id", userId).maybeSingle();
    if (other && other.slot !== slot) return { ok: false, error: "Người này đang là người chấm còn lại. Hai người chấm phải khác nhau." };
  }
  const { error: delError } = await db.from("test_raters").delete().eq("slot", slot);
  if (delError) return MISSING.has(delError.code) ? NOT_READY : FAILED;
  if (userId) {
    const { error } = await db.from("test_raters").insert({ user_id: userId, slot });
    if (error) return FAILED;
  }
  await audit(profile, userId ? `Giao người chấm ${slot}` : `Bỏ người chấm ${slot}`, userId ?? undefined);
  revalidatePath("/staff/cham-bai");
  return { ok: true };
}

/** Trộn ngẫu nhiên (Fisher–Yates, số ngẫu nhiên an toàn). */
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Mở chấm: mỗi bài đo chưa có mã nhận một mã B001, B002… theo thứ tự đã xáo; chọn ngẫu nhiên
 * 30 bài cho người chấm 2 (chọn một lần, các bài đã chọn không bao giờ bị đổi).
 * Bấm lại sau khi có bài làm bù thì chỉ thêm mã cho bài mới.
 */
export async function openGrading(): Promise<Result & { added?: number }> {
  const profile = await requirePage("/staff/cham-bai", ["admin"]);
  const { ready, lock } = await gradingLock();
  if (!ready) return NOT_READY;
  if (lock.locked_at) return { ok: false, error: "Đã khóa điểm." };
  const db = createAdminClient();

  const tests = await readSurveys((cols) => db.from("surveys").select(cols).eq("kind", "test"));
  const testIds = tests.filter((s) => s.kind === "test").map((s) => s.id);
  if (!testIds.length) return { ok: false, error: "Chưa có phiếu bài đo nào." };
  const [{ data: responses, error }, { data: codes }] = await Promise.all([
    db.from("survey_responses").select("id").in("survey_id", testIds),
    db.from("test_codes").select("response_id, code, in_sample"),
  ]);
  if (error) return FAILED;
  const coded = new Set((codes ?? []).map((c) => c.response_id as string));
  const fresh = shuffle((responses ?? []).map((r) => r.id as string).filter((id) => !coded.has(id)));

  const lastNumber = Math.max(0, ...(codes ?? []).map((c) => Number(String(c.code).slice(1)) || 0));
  const sampleNow = (codes ?? []).filter((c) => c.in_sample).length;
  const room = Math.max(0, SECOND_RATER_SAMPLE - sampleNow);
  const sampled = new Set(shuffle(fresh).slice(0, room));
  const rows = fresh.map((id, i) => ({ response_id: id, code: gradingCode(lastNumber + i + 1), in_sample: sampled.has(id) }));
  if (rows.length) {
    const { error: insError } = await db.from("test_codes").insert(rows);
    if (insError) return FAILED;
  }
  if (!lock.opened_at) {
    const { error: lockError } = await db.from("test_locks").upsert({ id: 1, opened_at: new Date().toISOString(), opened_by: profile.id });
    if (lockError) return FAILED;
  }
  await audit(profile, "Mở chấm bài đo", `${rows.length} bài mới`);
  revalidatePath("/staff/cham-bai", "layout");
  return { ok: true, added: rows.length };
}

/** Khóa điểm: người chấm không sửa được nữa; bảng ghép mã với tài khoản mở cho admin. Không mở khóa lại được. */
export async function lockGrading(): Promise<Result> {
  const profile = await requirePage("/staff/cham-bai", ["admin"]);
  const { ready, lock } = await gradingLock();
  if (!ready) return NOT_READY;
  if (!lock.opened_at) return { ok: false, error: "Chưa mở chấm." };
  if (lock.locked_at) return { ok: true };
  const { error } = await createAdminClient()
    .from("test_locks")
    .upsert({ id: 1, locked_at: new Date().toISOString(), locked_by: profile.id, locked_by_name: profile.nickname });
  if (error) return FAILED;
  await audit(profile, "Khóa điểm bài đo");
  revalidatePath("/staff/cham-bai", "layout");
  return { ok: true };
}

// ───────────────────────── Chấm bài: người chấm ─────────────────────────

const scoreSchema = z.object({
  cells: z.record(z.string(), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal("T"), z.literal("K")])),
  guess_class: z.string().max(40).nullable(),
  guess_round: z.string().max(40).nullable(),
  note: z.string().trim().max(300).nullable(),
  referred: z.boolean(),
});

/** Lưu điểm của người chấm cho một mã chấm (lưu dần được, chưa đủ 12 ô cũng lưu). */
export async function saveScore(code: string, input: unknown): Promise<Result> {
  const profile = await requirePage("/staff/cham-bai", ["teacher", "counselor"]);
  const slot = await raterSlot(profile);
  if (!slot) return FORBIDDEN;
  if (!/^B\d{3,4}$/.test(code)) return FORBIDDEN;
  const parsed = scoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Điểm chưa hợp lệ." };
  const { lock } = await gradingLock();
  if (lock.locked_at) return { ok: false, error: "Điểm đã khóa, không sửa được nữa." };
  const responseId = await responseIdForRater(slot, code);
  if (!responseId) return FORBIDDEN;

  const cells: Cells = {};
  for (const c of CELL_IDS) {
    const v = parsed.data.cells[c];
    if (isCellValue(v)) cells[c] = v;
  }
  const guessClass = parsed.data.guess_class && GUESS_CLASS_OPTIONS.includes(parsed.data.guess_class) ? parsed.data.guess_class : null;
  const guessRound = parsed.data.guess_round && GUESS_ROUND_OPTIONS.includes(parsed.data.guess_round) ? parsed.data.guess_round : null;

  const db = createAdminClient();
  const { data: before } = await db.from("test_scores").select("referred").eq("response_id", responseId).eq("rater_id", profile.id).maybeSingle();
  const { error } = await db.from("test_scores").upsert(
    {
      response_id: responseId,
      rater_id: profile.id,
      slot,
      cells,
      guess_class: guessClass,
      guess_round: guessRound,
      note: parsed.data.note || null,
      referred: parsed.data.referred,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "response_id,rater_id" },
  );
  if (error) return FAILED;

  // Người chấm thấy câu đáng lo: báo tư vấn viên (theo thư xin phép: có câu đáng lo thì tư vấn viên được báo).
  // Cảnh báo không kèm mã chấm hay nội dung bài, chỉ để tư vấn viên tìm gặp học sinh.
  if (parsed.data.referred && !before?.referred) await referStudent(responseId);
  return { ok: true };
}

async function referStudent(responseId: string) {
  const db = createAdminClient();
  const { data: resp } = await db.from("survey_responses").select("user_id").eq("id", responseId).maybeSingle();
  if (!resp?.user_id) return;
  const { data: student } = await db
    .from("profiles")
    .select("id, nickname, full_name, email, class_id, role, onboarded_at, locked_at, avatar")
    .eq("id", resp.user_id)
    .maybeSingle();
  if (!student) return;
  await createAlert({
    profile: { ...(student as Omit<Profile, "must_change_password">), must_change_password: false },
    type: "survey_risk",
    severity: "urgent",
    excerpt: `${TEST_ALERT_PREFIX} Người chấm bài đo kỹ năng thấy một câu trả lời đáng lo trong bài của học sinh này. Thầy cô tư vấn vui lòng tìm gặp, hỏi thăm học sinh (không nhắc tới bài đo hay người chấm).`,
    reasons: ["Người chấm bài đo báo"],
  });
}
