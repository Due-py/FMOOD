"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, type Profile } from "@/lib/auth";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import { logAi } from "@/lib/ai/log";
import { searchKnowledge, trainDocument, type KnowledgeHit } from "@/lib/kb";
import { readLessonFiles, readLessonJson } from "@/lib/lessons";
import { checkMessageDetailed, type SafetyDetail } from "@/lib/safety/check";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { canEditOwned, ownedSurvey } from "@/lib/class-content";
import { audit, defaultSetting, getSetting, resetSetting, saveSetting, settingVersion, type SettingKey, type SettingSaved, type SettingsMap } from "@/lib/settings";
import { REPLY_RUN_PREFIX, runReplySuite } from "@/lib/eval/reply-run";
import { SAFETY_CASES, type Turn } from "@/lib/eval/safety-cases";
import { exerciseSchema } from "@/lib/exercises";
import { questionSchema } from "@/lib/surveys";
import { createAdminClient } from "@/lib/supabase/admin";
import { blockInDemo } from "@/lib/demo/guard";

// MỌI THAO TÁC QUẢN TRỊ (chỉ admin). Mỗi hàm tự kiểm tra quyền và ghi nhật ký.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };

async function admin(): Promise<Profile> {
  return requireStaff(["admin"]);
}

function zodError(error: z.ZodError) {
  return { ok: false as const, error: error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ." };
}

// ───────────────────────── Cài đặt ─────────────────────────

const contact = z.object({
  name: z.string().trim().min(1, "Thiếu tên").max(80),
  detail: z.string().trim().max(160).default(""),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9 +.-]*$/, "Số điện thoại chỉ gồm số")
    .optional()
    .transform((v) => v || undefined),
});

const phraseList = z.array(z.string().trim().min(2, "Cụm từ quá ngắn").max(60)).max(100);

const SETTING_SCHEMAS: { [K in SettingKey]: z.ZodType<SettingsMap[K]> } = {
  "ai.persona": z.object({
    name: z.string().trim().min(1).max(20),
    personality: z.string().trim().min(5, "Mô tả tính cách quá ngắn").max(300),
    address: z.string().trim().min(3).max(150),
    maxWords: z.coerce.number().int().min(30).max(200),
    emoji: z.enum(["none", "light", "more"]),
  }),
  "ai.rules": z.object({ text: z.string().trim().min(50, "Lời dặn quá ngắn").max(6000) }),
  "ai.models": z.object({
    chat: z.string().trim().regex(/^[a-z0-9.\-]{3,60}$/, "Tên model chưa đúng"),
    safety: z.string().trim().regex(/^[a-z0-9.\-]{3,60}$/, "Tên model chưa đúng"),
  }),
  "safety.classifier": z.object({ prompt: z.string().trim().min(50, "Tiêu chí quá ngắn").max(6000) }),
  "safety.phrases": z.object({ urgent: phraseList, concern: phraseList }),
  "safety.crisis": z.object({
    message: z.string().trim().min(20, "Câu trả lời quá ngắn").max(3000),
    school: contact,
    hotlines: z.array(contact).min(1, "Cần ít nhất một số hỗ trợ").max(6),
  }),
  "chat.starters": z.object({ items: z.array(z.string().trim().min(2).max(60)).min(1).max(8) }),
  "kb.config": z.object({
    enabled: z.boolean(),
    matchCount: z.coerce.number().int().min(1).max(8),
    minSimilarity: z.coerce.number().min(0.1).max(0.9),
  }),
};

const SETTING_LABEL: Record<SettingKey, string> = {
  "ai.persona": "Nhân vật",
  "ai.rules": "Lời dặn",
  "ai.models": "Model AI",
  "safety.classifier": "Tiêu chí AI phân loại",
  "safety.phrases": "Cụm từ nguy hiểm",
  "safety.crisis": "Khẩn cấp",
  "chat.starters": "Câu mở đầu chat",
  "kb.config": "Cài đặt kho kiến thức",
};

const SETTING_PATHS: Record<SettingKey, string> = {
  "ai.persona": "/staff/may/persona",
  "ai.rules": "/staff/may/rules",
  "ai.models": "/staff/may/health",
  "safety.classifier": "/staff/safety/risk",
  "safety.phrases": "/staff/safety/risk",
  "safety.crisis": "/staff/safety/emergency",
  "chat.starters": "/staff/content/prompts",
  "kb.config": "/staff/may/knowledge",
};

/** Cách hoàn tác một lần lưu: dùng lại bản đã cất, hoặc về mặc định nếu trước đó đang dùng mặc định. */
export type SettingUndo = { key: SettingKey; versionId: number | null };

function undoFor(key: SettingKey, saved: SettingSaved): SettingUndo | null {
  return saved.historyOk ? { key, versionId: saved.previousId } : null;
}

function refreshSetting(key: SettingKey) {
  revalidatePath(SETTING_PATHS[key]);
  revalidatePath("/staff");
}

export async function saveSettingAction<K extends SettingKey>(key: K, value: unknown): Promise<Result<{ settingUndo: SettingUndo | null }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = SETTING_SCHEMAS[key].safeParse(value);
  if (!parsed.success) return zodError(parsed.error);
  let saved: SettingSaved;
  try {
    saved = await saveSetting(key, parsed.data, actor.nickname);
    await audit(actor, "Sửa", SETTING_LABEL[key]);
  } catch {
    return FAILED;
  }
  refreshSetting(key);
  return { ok: true, settingUndo: undoFor(key, saved) };
}

export async function resetSettingAction(key: SettingKey): Promise<Result<{ value: unknown; settingUndo: SettingUndo | null }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  let saved: SettingSaved;
  try {
    saved = await resetSetting(key);
    await audit(actor, "Khôi phục mặc định", SETTING_LABEL[key]);
  } catch {
    return FAILED;
  }
  refreshSetting(key);
  return { ok: true, value: defaultSetting(key), settingUndo: undoFor(key, saved) };
}

/**
 * Dùng lại một bản trước (versionId), hoặc về mặc định (versionId = null).
 * Bản đang dùng được cất lại, nên thao tác này cũng hoàn tác được.
 */
export async function restoreSettingVersion(key: SettingKey, versionId: number | null): Promise<Result<{ settingUndo: SettingUndo | null }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!(key in SETTING_SCHEMAS)) return FAILED;
  try {
    if (versionId === null) {
      const saved = await resetSetting(key);
      await audit(actor, "Khôi phục mặc định", SETTING_LABEL[key]);
      refreshSetting(key);
      return { ok: true, settingUndo: undoFor(key, saved) };
    }
    const version = await settingVersion(key, versionId);
    // bản cũ phải còn đúng khuôn hiện tại (code có thể đã thêm / đổi ô)
    const parsed = version && SETTING_SCHEMAS[key].safeParse({ ...(defaultSetting(key) as object), ...(version.value as object) });
    if (!parsed || !parsed.success) return { ok: false, error: "Bản này không còn dùng lại được." };
    const saved = await saveSetting(key, parsed.data as SettingsMap[typeof key], actor.nickname);
    await audit(actor, "Dùng lại bản trước", SETTING_LABEL[key]);
    refreshSetting(key);
    return { ok: true, settingUndo: undoFor(key, saved) };
  } catch {
    return FAILED;
  }
}

// ───────────────────────── Phát hiện rủi ro: thử một câu ─────────────────────────

export async function testRiskMessage(text: string): Promise<Result<{ detail: SafetyDetail }>> {
  await admin();
  const message = text.trim().slice(0, 1000);
  if (!message) return { ok: false, error: "Nhập một câu để thử." };
  const detail = await checkMessageDetailed(message, []);
  return { ok: true, detail };
}

// ───────────────────────── Thư viện bài học ─────────────────────────

const lessonSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,80}$/, "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang"),
  title: z.string().trim().min(1, "Nhập tên bài").max(120),
  summary: z.string().trim().max(300).default(""),
  grade: z.coerce.number().int().min(6).max(12).nullable(),
  unit: z.string().trim().max(80).default(""),
  topic: z.string().trim().min(1, "Nhập chủ đề").max(80),
  emoji: z.string().trim().min(1).max(8),
  sort_order: z.coerce.number().int().min(0).max(9999),
  source: z.string().trim().max(300).default(""),
  body: z.string().max(60000),
  published: z.boolean(),
  exercises: z.array(exerciseSchema).max(5).default([]),
});

export async function saveLesson(id: string | null, input: unknown): Promise<Result<{ id: string }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const raw = input as Record<string, unknown>;
  const parsed = lessonSchema.safeParse({ ...raw, grade: raw.grade === "" ? null : raw.grade });
  if (!parsed.success) return zodError(parsed.error);

  const db = createAdminClient();
  const data = { ...parsed.data, updated_at: new Date().toISOString() };
  const res = id
    ? await db.from("lessons").update(data).eq("id", id).select("id").single()
    : await db.from("lessons").insert(data).select("id").single();
  if (res.error) return res.error.code === "23505" ? { ok: false, error: "Đường dẫn này đã có bài khác dùng." } : FAILED;
  await audit(actor, id ? "Sửa bài học" : "Thêm bài học", parsed.data.title);
  revalidatePath("/staff/content/lessons");
  revalidatePath("/library", "layout");
  return { ok: true, id: res.data.id };
}

export async function deleteLesson(id: string): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("lessons").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa bài học", id);
  revalidatePath("/staff/content/lessons");
  revalidatePath("/library", "layout");
  return { ok: true };
}

/**
 * Nhập bài từ thư mục content/lessons/ (bài mẫu .md và bài chia từ sách trong oxford/*.json).
 * overwrite = false: bỏ qua bài đã có cùng đường dẫn (giữ nguyên chỉnh sửa của admin).
 * overwrite = true: ghi đè nội dung bài đã có bằng nội dung trong file.
 */
export async function importLessonFiles(overwrite = false): Promise<Result<{ count: number; errors: string[] }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const [md, json] = await Promise.all([readLessonFiles(), readLessonJson()]);
  const lessons = [...md, ...json.lessons].map((l) => ({ ...l, updated_at: new Date().toISOString() }));
  let count = 0;
  for (let i = 0; i < lessons.length; i += 50) {
    const { data, error } = await createAdminClient()
      .from("lessons")
      .upsert(lessons.slice(i, i + 50), { onConflict: "slug", ignoreDuplicates: !overwrite })
      .select("id");
    if (error) return { ok: false, error: `Lỗi khi nhập: ${error.message}` };
    count += data?.length ?? 0;
  }
  await audit(actor, overwrite ? "Cập nhật bài từ file" : "Nhập bài từ file", `${count} bài`);
  revalidatePath("/staff/content/lessons");
  revalidatePath("/library", "layout");
  return { ok: true, count, errors: json.errors };
}

// ───────────────────────── Câu hỏi suy ngẫm ─────────────────────────

const reflectionSchema = z.object({
  text: z.string().trim().min(3, "Câu hỏi quá ngắn").max(200),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export async function saveReflectionQuestion(id: string | null, input: unknown): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const db = createAdminClient();
  const { error } = id
    ? await db.from("reflection_questions").update(parsed.data).eq("id", id)
    : await db.from("reflection_questions").insert(parsed.data);
  if (error) return FAILED;
  await audit(actor, id ? "Sửa câu hỏi suy ngẫm" : "Thêm câu hỏi suy ngẫm", parsed.data.text);
  revalidatePath("/staff/content/prompts");
  return { ok: true };
}

export async function deleteReflectionQuestion(id: string): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("reflection_questions").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa câu hỏi suy ngẫm", id);
  revalidatePath("/staff/content/prompts");
  return { ok: true };
}

// ───────────────────────── Khu vườn ─────────────────────────

const plantSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên cây").max(40),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
  stages: z
    .array(
      z.object({
        emoji: z.string().trim().min(1, "Thiếu emoji").max(8),
        label: z.string().trim().min(1, "Thiếu tên giai đoạn").max(30),
        points: z.coerce.number().int().min(0).max(1000),
      }),
    )
    .min(2, "Cần ít nhất 2 giai đoạn")
    .max(8)
    .refine((s) => s[0].points === 0, "Giai đoạn đầu phải là 0 giọt")
    .refine((s) => s.every((x, i) => i === 0 || x.points > s[i - 1].points), "Số giọt phải tăng dần qua từng giai đoạn"),
});

export async function savePlant(id: string | null, input: unknown): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = plantSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const db = createAdminClient();
  const { error } = id
    ? await db.from("garden_plants").update(parsed.data).eq("id", id)
    : await db.from("garden_plants").insert(parsed.data);
  if (error) return FAILED;
  await audit(actor, id ? "Sửa cây" : "Thêm cây", parsed.data.name);
  revalidatePath("/staff/content/garden");
  return { ok: true };
}

export async function deletePlant(id: string): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("garden_plants").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa cây", id);
  revalidatePath("/staff/content/garden");
  return { ok: true };
}

// ───────────────────────── Kịch bản ─────────────────────────

const scenarioSchema = z.object({
  title: z.string().trim().min(1, "Nhập tên chủ đề").max(80),
  triggers: z.array(z.string().trim().min(2).max(40)).min(1, "Cần ít nhất một cụm từ nhận diện").max(30),
  guidance: z.string().trim().min(10, "Hướng dẫn quá ngắn").max(3000),
  active: z.boolean(),
});

export async function saveScenario(id: string | null, input: unknown): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const db = createAdminClient();
  const data = { ...parsed.data, updated_at: new Date().toISOString() };
  const { error } = id ? await db.from("scenarios").update(data).eq("id", id) : await db.from("scenarios").insert(data);
  if (error) return FAILED;
  await audit(actor, id ? "Sửa kịch bản" : "Thêm kịch bản", parsed.data.title);
  revalidatePath("/staff/may/scenarios");
  return { ok: true };
}

export async function deleteScenario(id: string): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("scenarios").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa kịch bản", id);
  revalidatePath("/staff/may/scenarios");
  return { ok: true };
}

export async function testScenarios(text: string): Promise<Result<{ titles: string[] }>> {
  await admin();
  const matches = matchScenarios(text, await activeScenarios());
  return { ok: true, titles: matches.map((m) => m.title) };
}

// ───────────────────────── Kho kiến thức ─────────────────────────

const MAX_KB_CHARS = 2_000_000;

/** Bước 1 tải file: tạo đường dẫn tải lên Storage (trình duyệt tải thẳng, không qua server). */
export async function createKbUpload(filename: string): Promise<Result<{ path: string; token: string }>> {
  await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-]/g, "-").slice(-80);
  if (!/\.(pdf|txt|md)$/.test(safe)) return { ok: false, error: "Chỉ nhận file .pdf, .txt hoặc .md" };
  const path = `${crypto.randomUUID()}-${safe}`;
  const { data, error } = await createAdminClient().storage.from("kb").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Chưa tạo được chỗ tải lên. Đã chạy migration 0003 chưa?" };
  return { ok: true, path: data.path, token: data.token };
}

/** Bước 2: đọc chữ trong file đã tải lên và lưu thành tài liệu. */
export async function addKbDocumentFromUpload(path: string, title: string, filename: string): Promise<Result<{ id: string }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const db = createAdminClient();
  const { data: file, error } = await db.storage.from("kb").download(path);
  if (error || !file) return { ok: false, error: "Không đọc được file đã tải lên." };

  let content: string;
  try {
    if (path.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const { text } = await extractText(pdf, { mergePages: true });
      content = text;
    } else {
      content = await file.text();
    }
  } catch (e) {
    return { ok: false, error: `Không đọc được chữ trong file: ${e instanceof Error ? e.message : e}` };
  }
  content = content.slice(0, MAX_KB_CHARS);
  if (content.trim().length < 50) {
    return { ok: false, error: "File gần như không có chữ (có thể là PDF dạng ảnh scan). Hãy dùng bản có thể chọn chữ." };
  }

  const { data: doc, error: insertError } = await db
    .from("kb_documents")
    .insert({ title: title.trim().slice(0, 160) || filename, filename, storage_path: path, content })
    .select("id")
    .single();
  if (insertError || !doc) return FAILED;
  await audit(actor, "Thêm tài liệu", title || filename);
  revalidatePath("/staff/may/knowledge");
  return { ok: true, id: doc.id };
}

export async function addKbText(title: string, content: string): Promise<Result<{ id: string }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const t = title.trim();
  const c = content.trim();
  if (!t) return { ok: false, error: "Nhập tên tài liệu." };
  if (c.length < 50) return { ok: false, error: "Nội dung quá ngắn (ít nhất 50 ký tự)." };
  const { data, error } = await createAdminClient()
    .from("kb_documents")
    .insert({ title: t.slice(0, 160), content: c.slice(0, MAX_KB_CHARS) })
    .select("id")
    .single();
  if (error || !data) return FAILED;
  await audit(actor, "Thêm tài liệu", t);
  revalidatePath("/staff/may/knowledge");
  return { ok: true, id: data.id };
}

/** "Dạy lại" một tài liệu, hoặc tất cả nếu không truyền id. */
export async function trainKb(id?: string): Promise<Result<{ trained: number; chunks: number; errors: string[] }>> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const db = createAdminClient();
  const ids = id ? [id] : ((await db.from("kb_documents").select("id")).data ?? []).map((d) => d.id as string);
  let chunks = 0;
  let trained = 0;
  const errors: string[] = [];
  for (const docId of ids) {
    const res = await trainDocument(docId);
    if (res.ok) {
      trained++;
      chunks += res.chunks;
    } else errors.push(res.error);
  }
  await audit(actor, "Dạy lại Mây", `${trained}/${ids.length} tài liệu, ${chunks} đoạn`);
  revalidatePath("/staff/may/knowledge");
  revalidatePath("/staff");
  return { ok: true, trained, chunks, errors };
}

export async function setKbDocumentActive(id: string, active: boolean): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("kb_documents").update({ active }).eq("id", id);
  if (error) return FAILED;
  await audit(actor, active ? "Bật tài liệu" : "Tắt tài liệu", id);
  revalidatePath("/staff/may/knowledge");
  return { ok: true };
}

export async function deleteKbDocument(id: string): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const db = createAdminClient();
  const { data } = await db.from("kb_documents").select("storage_path, title").eq("id", id).maybeSingle();
  if (data?.storage_path) await db.storage.from("kb").remove([data.storage_path]);
  const { error } = await db.from("kb_documents").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa tài liệu", data?.title ?? id);
  revalidatePath("/staff/may/knowledge");
  return { ok: true };
}

export async function testKbSearch(query: string): Promise<Result<{ hits: KnowledgeHit[] }>> {
  await admin();
  if (!query.trim()) return { ok: false, error: "Nhập một câu hỏi để thử." };
  const hits = await searchKnowledge(query.trim().slice(0, 500), { matchCount: 5, minSimilarity: 0.2 });
  return { ok: true, hits };
}

// ───────────────────────── Tình trạng Mây ─────────────────────────

export async function pingAi(model: string): Promise<Result<{ latencyMs: number; reply: string }>> {
  await admin();
  const start = Date.now();
  try {
    const res = await openai().responses.create({
      model,
      input: "Trả lời đúng một từ: ổn",
      max_output_tokens: 200,
      reasoning: { effort: "low" },
      store: false,
    });
    const latencyMs = Date.now() - start;
    void logAi({ kind: "health", model, ok: true, latencyMs, inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    return { ok: true, latencyMs, reply: res.output_text.trim().slice(0, 40) };
  } catch (e) {
    void logAi({ kind: "health", model, ok: false, latencyMs: Date.now() - start, error: String(e) });
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Không kết nối được" };
  }
}

// ───────────────────────── Phiếu khảo sát ─────────────────────────

const surveySchema = z.object({
  title: z.string().trim().min(1, "Nhập tên phiếu").max(120),
  description: z.string().trim().max(1000).default(""),
  questions: z.array(questionSchema).min(1, "Cần ít nhất một câu hỏi").max(30),
  class_ids: z.array(z.uuid()).nullable(),
});

/**
 * Admin soạn phiếu cho mọi lớp; giáo viên chủ nhiệm soạn "câu hỏi cho lớp" cho lớp mình
 * và chỉ sửa / mở / xóa phiếu của chính mình.
 */
async function surveyActor(id: string | null, classIds: string[] | null): Promise<Profile | null> {
  const actor = await requireStaff(["admin", "teacher"]);
  if (actor.role === "admin") return actor;
  if (id && !(await ownedSurvey(actor, id))) return null;
  if (classIds !== null && !(await canEditOwned(actor, { author_id: actor.id, class_ids: classIds }))) return null;
  return actor;
}

const SURVEY_FORBIDDEN = { ok: false as const, error: "Thầy cô chỉ gửi câu hỏi cho lớp mình chủ nhiệm, và sửa phiếu của mình." };

export async function saveSurvey(id: string | null, input: unknown): Promise<Result<{ id: string }>> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = surveySchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const actor = await surveyActor(id, parsed.data.class_ids ?? []);
  if (!actor) return SURVEY_FORBIDDEN;
  for (const q of parsed.data.questions) {
    if (q.type === "choice" && q.options.length < 2) return { ok: false, error: `Câu "${q.text}" cần ít nhất 2 lựa chọn.` };
  }
  const db = createAdminClient();
  if (id) {
    const { count } = await db.from("survey_responses").select("id", { count: "exact", head: true }).eq("survey_id", id);
    if (count) return { ok: false, error: "Phiếu đã có người trả lời nên không sửa câu hỏi được. Hãy tạo phiếu mới." };
  }
  const data = {
    ...parsed.data,
    class_ids: parsed.data.class_ids?.length ? parsed.data.class_ids : null,
    updated_at: new Date().toISOString(),
    // chỉ ghi người soạn khi giáo viên tạo (phiếu của admin giữ như cũ, chạy được cả khi chưa có 0012)
    ...(!id && actor.role === "teacher" ? { author_id: actor.id, author_name: actor.nickname } : {}),
  };
  const res = id
    ? await db.from("surveys").update(data).eq("id", id).select("id").single()
    : await db.from("surveys").insert(data).select("id").single();
  if (res.error) return FAILED;
  await audit(actor, id ? "Sửa phiếu khảo sát" : "Tạo phiếu khảo sát", parsed.data.title);
  revalidatePath("/staff/surveys");
  return { ok: true, id: res.data.id };
}

export async function setSurveyStatus(id: string, status: "draft" | "open" | "closed"): Promise<Result> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const actor = await surveyActor(id, null);
  if (!actor) return SURVEY_FORBIDDEN;
  if (!["draft", "open", "closed"].includes(status)) return FAILED;
  const { error } = await createAdminClient().from("surveys").update({ status }).eq("id", id);
  if (error) return FAILED;
  await audit(actor, status === "open" ? "Mở phiếu khảo sát" : status === "closed" ? "Đóng phiếu khảo sát" : "Chuyển phiếu về nháp", id);
  revalidatePath("/staff/surveys", "layout");
  revalidatePath("/home");
  return { ok: true };
}

export async function deleteSurvey(id: string): Promise<Result> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const actor = await surveyActor(id, null);
  if (!actor) return SURVEY_FORBIDDEN;
  const { error } = await createAdminClient().from("surveys").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa phiếu khảo sát", id);
  revalidatePath("/staff/surveys");
  return { ok: true };
}

// ───────────────────────── Bộ thử của Mây ─────────────────────────

const evalCaseSchema = z.object({
  input: z.string().trim().min(1, "Nhập câu thử").max(1000),
  expected: z.enum(["none", "concern", "urgent"]),
  note: z.string().trim().max(120).default(""),
});

export async function saveEvalCase(id: string | null, input: unknown): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const parsed = evalCaseSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const db = createAdminClient();
  const { error } = id ? await db.from("eval_cases").update(parsed.data).eq("id", id) : await db.from("eval_cases").insert(parsed.data);
  if (error) return FAILED;
  await audit(actor, id ? "Sửa câu thử" : "Thêm câu thử", parsed.data.input.slice(0, 60));
  revalidatePath("/staff/eval");
  return { ok: true };
}

export async function deleteEvalCase(id: string): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("eval_cases").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa câu thử", id);
  revalidatePath("/staff/eval");
  return { ok: true };
}

export type EvalResult = { id: string; input: string; expected: string; got: string; ok: boolean; reasons: string[] };

/** Chạy toàn bộ câu thử qua bộ kiểm tra an toàn thật (gọi OpenAI). */
export async function runEval(): Promise<Result<{ passed: number; total: number }>> {
  const actor = await admin();
  const db = createAdminClient();
  const { data: own } = await db.from("eval_cases").select("id, input, expected").eq("active", true).order("created_at");
  // bộ câu thử có sẵn (cùng bộ với `npm run eval:safety`) + câu thầy cô tự thêm
  const cases = [
    ...SAFETY_CASES.map(([input, expected, history = []], i) => ({ id: `co-san-${i + 1}`, input, expected, history })),
    ...(own ?? []).map((c) => ({ ...c, history: [] as Turn[] })),
  ];

  const results: EvalResult[] = [];
  // chạy 4 câu một lúc cho nhanh mà không quá tải
  for (let i = 0; i < cases.length; i += 4) {
    const batch = await Promise.all(
      cases.slice(i, i + 4).map(async (c) => {
        const r = await checkMessageDetailed(c.input, c.history);
        // báo cao hơn ở câu đáng lo vẫn chấp nhận; báo thấp hơn hoặc báo nhầm câu bình thường là sai
        const ok = r.level === c.expected || (c.expected === "concern" && r.level === "urgent");
        return { id: c.id, input: c.input, expected: c.expected, got: r.level, ok, reasons: r.reasons };
      }),
    );
    results.push(...batch);
  }
  const passed = results.filter((r) => r.ok).length;
  const { data: models } = await db.from("app_settings").select("value").eq("key", "ai.models").maybeSingle();
  await db.from("eval_runs").insert({
    model: (models?.value as { safety?: string } | null)?.safety ?? defaultSetting("ai.models").safety,
    total: results.length,
    passed,
    results,
    run_by_name: actor.nickname,
  });
  await audit(actor, "Chạy bộ thử", `${passed}/${results.length}`);
  revalidatePath("/staff/eval");
  revalidatePath("/staff/research/hieu-qua");
  return { ok: true, passed, total: results.length };
}

/** Chạy bộ thử câu trả lời của Mây (gọi OpenAI thật) và lưu kết quả để trang Kết quả đọc. */
export async function runReplyEval(): Promise<Result<{ passed: number; total: number }>> {
  const actor = await admin();
  const { model, results, passed, total } = await runReplySuite();
  const { error } = await createAdminClient()
    .from("eval_runs")
    .insert({ model: `${REPLY_RUN_PREFIX}${model}`, total, passed, results, run_by_name: actor.nickname });
  if (error) return FAILED;
  await audit(actor, "Chạy bộ thử câu trả lời", `${passed}/${total}`);
  revalidatePath("/staff/eval");
  revalidatePath("/staff/research/hieu-qua");
  return { ok: true, passed, total };
}

// ───────────────────────── Thành viên: chuyển lớp ─────────────────────────

export async function moveStudent(studentId: string, classId: string | null): Promise<Result> {
  const actor = await admin();
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const db = createAdminClient();
  const { data: s } = await db.from("profiles").select("role, nickname").eq("id", studentId).maybeSingle();
  if (s?.role !== "student") return { ok: false, error: "Không tìm thấy học sinh." };
  const { error } = await db.from("profiles").update({ class_id: classId }).eq("id", studentId);
  if (error) return error.code === "23505" ? { ok: false, error: "Lớp mới đã có bạn dùng biệt danh này." } : FAILED;
  await audit(actor, "Chuyển lớp học sinh", s.nickname);
  revalidatePath("/staff", "layout");
  return { ok: true };
}

// ───────────────────────── Sân thử: nói chuyện với Mây bằng cài đặt chưa lưu ─────────────────────────

export async function previewReply(input: {
  persona?: unknown;
  rules?: string;
  message: string;
}): Promise<Result<{ reply: string; scenarios: string[]; knowledge: string[] }>> {
  await admin();
  const message = input.message.trim().slice(0, 1000);
  if (!message) return { ok: false, error: "Nhập một câu để thử." };

  const personaParsed = input.persona ? SETTING_SCHEMAS["ai.persona"].safeParse(input.persona) : null;
  if (personaParsed && !personaParsed.success) return zodError(personaParsed.error);
  const persona = personaParsed?.data ?? (await getSetting("ai.persona"));
  const rules = input.rules?.trim() || (await getSetting("ai.rules")).text;

  const [scenarios, knowledge, model] = await Promise.all([activeScenarios(), searchKnowledge(message), chatModel()]);
  const matched = matchScenarios(message, scenarios);
  try {
    const res = await openai().responses.create({
      model,
      instructions: buildCompanionPrompt({ persona, rules }, "Bạn thử", { scenarios: matched, knowledge }),
      input: message,
      reasoning: { effort: "low" },
      max_output_tokens: 1200,
      store: false,
    });
    void logAi({ kind: "chat", model, ok: true, inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    return { ok: true, reply: res.output_text, scenarios: matched.map((s) => s.title), knowledge: knowledge.map((k) => k.title) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Không gọi được AI." };
  }
}
