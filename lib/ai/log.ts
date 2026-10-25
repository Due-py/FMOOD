import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AiLog = {
  kind: "chat" | "classifier" | "moderation" | "embedding" | "health" | "suggestions";
  model?: string;
  ok: boolean;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

/**
 * Ghi nhật ký mỗi lần gọi AI để theo dõi trong "Tình trạng Mây".
 * KHÔNG lưu nội dung tin nhắn. Lỗi khi ghi nhật ký không được làm hỏng việc chính.
 */
export async function logAi(entry: AiLog) {
  // chạy bộ thử trên máy (npm run eval:safety) thì không ghi vào cơ sở dữ liệu thật
  if (process.env.FMOOD_NO_AI_LOG === "1") return;
  try {
    await createAdminClient().from("ai_logs").insert({
      kind: entry.kind,
      model: entry.model ?? null,
      ok: entry.ok,
      latency_ms: entry.latencyMs ?? null,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      error: entry.error?.slice(0, 300) ?? null,
    });
  } catch {}
}

/** Đo thời gian một lời gọi AI và ghi nhật ký. */
export async function timed<T>(
  kind: AiLog["kind"],
  model: string,
  fn: () => Promise<T>,
  usage?: (r: T) => { input?: number; output?: number } | undefined,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const u = usage?.(result);
    void logAi({ kind, model, ok: true, latencyMs: Date.now() - start, inputTokens: u?.input, outputTokens: u?.output });
    return result;
  } catch (error) {
    void logAi({ kind, model, ok: false, latencyMs: Date.now() - start, error: String(error) });
    throw error;
  }
}
