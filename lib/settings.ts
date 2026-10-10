import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { DEFAULT_CLASSIFIER_PROMPT, DEFAULT_PERSONA, DEFAULT_RULES, type Persona } from "@/lib/ai/prompts";
import { createAdminClient } from "@/lib/supabase/admin";

// CÀI ĐẶT ADMIN SỬA ĐƯỢC TRÊN WEB
// Lưu ở bảng app_settings (key → JSON). Key nào chưa có thì dùng giá trị mặc định ở đây.

export type Contact = { name: string; detail: string; phone?: string };

export type SettingsMap = {
  "ai.persona": Persona;
  "ai.rules": { text: string };
  "ai.models": { chat: string; safety: string };
  "safety.classifier": { prompt: string };
  /** cụm từ admin thêm vào bộ lọc từ khóa (ngoài danh sách có sẵn trong code) */
  "safety.phrases": { urgent: string[]; concern: string[] };
  "safety.crisis": { message: string; school: Contact; hotlines: Contact[] };
  "chat.starters": { items: string[] };
  "kb.config": { enabled: boolean; matchCount: number; minSimilarity: number };
};

export type SettingKey = keyof SettingsMap;

function defaultCrisisMessage(): string {
  try {
    const raw = readFileSync(path.join(process.cwd(), "content/safety/crisis-response.md"), "utf8");
    return raw.replace(/<!--[\s\S]*?-->/g, "").trim();
  } catch {
    return "Cảm ơn bạn đã tin tưởng kể cho Mây nghe. Chuyện này cần có người thật ở bên bạn ngay lúc này. Hãy gọi **111** (Tổng đài Bảo vệ trẻ em, miễn phí 24/7), gọi **115** nếu đang nguy hiểm, hoặc tìm ngay thầy cô hay người lớn gần bạn nhất. Thầy cô phụ trách đã được báo để hỗ trợ bạn.";
  }
}

export function defaultSetting<K extends SettingKey>(key: K): SettingsMap[K] {
  const defaults: { [P in SettingKey]: () => SettingsMap[P] } = {
    "ai.persona": () => DEFAULT_PERSONA,
    "ai.rules": () => ({ text: DEFAULT_RULES }),
    "ai.models": () => ({
      chat: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      safety: process.env.OPENAI_SAFETY_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini",
    }),
    "safety.classifier": () => ({ prompt: DEFAULT_CLASSIFIER_PROMPT }),
    "safety.phrases": () => ({ urgent: [], concern: [] }),
    "safety.crisis": () => ({
      message: defaultCrisisMessage(),
      school: {
        name: process.env.SCHOOL_COUNSELING_NAME || "Phòng tham vấn tâm lý của trường",
        detail: process.env.SCHOOL_COUNSELING_DETAIL || "Gặp trực tiếp thầy cô tham vấn hoặc giáo viên chủ nhiệm",
        phone: process.env.SCHOOL_COUNSELING_PHONE || undefined,
      },
      hotlines: [
        { name: "Tổng đài quốc gia Bảo vệ trẻ em", detail: "Miễn phí, 24/7, dành cho người dưới 18 tuổi", phone: "111" },
        { name: "Cấp cứu", detail: "Khi có nguy hiểm đến tính mạng", phone: "115" },
      ],
    }),
    "chat.starters": () => ({
      items: [
        "Hôm nay mình hơi buồn",
        "Mình đang áp lực chuyện học",
        "Mình muốn kể một chuyện vui",
        "Mình không biết gọi tên cảm xúc này",
      ],
    }),
    "kb.config": () => ({ enabled: true, matchCount: 4, minSimilarity: 0.3 }),
  };
  return defaults[key]() as SettingsMap[K];
}

type Row = { key: string; value: unknown; updated_by_name: string | null; updated_at: string };

/** Đọc toàn bộ cài đặt đã lưu (một lần mỗi request). */
const loadRows = cache(async (): Promise<Map<string, Row>> => {
  const { data, error } = await createAdminClient().from("app_settings").select("key, value, updated_by_name, updated_at");
  if (error) console.error("[F-Mood] Không đọc được app_settings, dùng mặc định", error.message);
  return new Map((data ?? []).map((r) => [r.key, r as Row]));
});

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const row = (await loadRows()).get(key);
  const fallback = defaultSetting(key);
  // ghép với mặc định để key mới thêm vào code vẫn có giá trị
  if (row && typeof row.value === "object" && row.value !== null && !Array.isArray(row.value)) {
    return { ...fallback, ...(row.value as object) } as SettingsMap[K];
  }
  return fallback;
}

export async function getSettingMeta(key: SettingKey): Promise<{ updatedBy: string | null; updatedAt: string | null }> {
  const row = (await loadRows()).get(key);
  return { updatedBy: row?.updated_by_name ?? null, updatedAt: row?.updated_at ?? null };
}

export async function saveSetting<K extends SettingKey>(key: K, value: SettingsMap[K], actorName: string) {
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key, value, updated_by_name: actorName, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function resetSetting(key: SettingKey) {
  const { error } = await createAdminClient().from("app_settings").delete().eq("key", key);
  if (error) throw error;
}

/** Ghi nhật ký thao tác của admin. */
export async function audit(actor: { id: string; nickname: string }, action: string, detail?: string) {
  await createAdminClient()
    .from("admin_audit")
    .insert({ actor_id: actor.id, actor_name: actor.nickname, action, detail: detail?.slice(0, 500) ?? null });
}
