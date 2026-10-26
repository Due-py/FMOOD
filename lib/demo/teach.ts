import "server-only";
import { kbDocuments } from "@/lib/admin-data";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt, LOCKED_CLASSIFIER_RULES, LOCKED_RULES } from "@/lib/ai/prompts";
import { BASE_CHECKS, CHECK_LABEL, checkReply, REPLY_RUN_PREFIX } from "@/lib/eval/reply-checks";
import { searchKnowledge } from "@/lib/kb";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { allContent } from "@/lib/support-content-server";
import { dataScope } from "./server";

// "MÂY ĐƯỢC DẠY THẾ NÀO": tóm tắt mọi lớp lời dặn đang dùng thật, và "Dạy thử" (so câu trả lời trước / sau
// khi thêm một lời dặn tạm). Dạy thử KHÔNG lưu gì: cài đặt thật của Mây giữ nguyên.

const bullets = (text: string) => text.split("\n").filter((l) => l.trim().startsWith("-")).map((l) => l.trim().replace(/^-\s*/, ""));

export async function teachOverview() {
  const db = createAdminClient();
  const [persona, rules, rulesMeta, phrases, scenarios, docs, content, runs, versions, feedback, scope] = await Promise.all([
    getSetting("ai.persona"),
    getSetting("ai.rules"),
    getSettingMeta("ai.rules"),
    getSetting("safety.phrases"),
    activeScenarios(),
    kbDocuments(),
    allContent(),
    db.from("eval_runs").select("model, total, passed, created_at").order("created_at", { ascending: false }).limit(30),
    db.from("app_settings_history").select("id", { count: "exact", head: true }),
    db.from("message_feedback").select("user_id, rating"),
    dataScope(),
  ]);
  const all = runs.data ?? [];
  const isReply = (m: string | null) => (m ?? "").startsWith(REPLY_RUN_PREFIX);
  const fb = (feedback.data ?? []).filter((f) => scope.userOk(f.user_id));
  return {
    persona,
    rules: bullets(rules.text),
    rulesMeta,
    locked: bullets(LOCKED_RULES),
    lockedClassifier: bullets(LOCKED_CLASSIFIER_RULES).length,
    phrases: phrases.urgent.length + phrases.concern.length,
    scenarios: scenarios.map((s) => ({ title: s.title, triggers: s.triggers.length })),
    docs: docs.filter((d) => d.active && d.status === "ready").map((d) => ({ title: d.title, chunks: d.chunk_count })),
    topics: content.items.filter((i) => i.kind === "topic" && i.status === "on").map((i) => `${String(i.data.emoji)} ${String(i.data.label)}`),
    risk: all.find((r) => !isReply(r.model)) ?? null,
    reply: all.find((r) => isReply(r.model)) ?? null,
    versions: versions.count ?? 0,
    feedback: { ups: fb.filter((f) => f.rating === 1).length, downs: fb.filter((f) => f.rating === -1).length },
  };
}

export type TaughtReply = { reply: string; checks: { label: string; ok: boolean }[] };

/** So câu trả lời của Mây với lời dặn đang dùng và với lời dặn đang dùng + một điều dặn thêm. Không lưu gì. */
export async function teachPreview(extra: string, message: string): Promise<{ before: TaughtReply; after: TaughtReply }> {
  const [persona, rules, scenarios, knowledge, model] = await Promise.all([
    getSetting("ai.persona"),
    getSetting("ai.rules"),
    activeScenarios(),
    searchKnowledge(message),
    chatModel(),
  ]);
  const matched = matchScenarios(message, scenarios);
  const ask = async (text: string): Promise<TaughtReply> => {
    const res = await openai().responses.create({
      model,
      instructions: buildCompanionPrompt({ persona, rules: text }, "Bạn thử", { scenarios: matched, knowledge }),
      input: message,
      reasoning: { effort: "low" },
      max_output_tokens: 1200,
      store: false,
    });
    const reply = res.output_text;
    return { reply, checks: checkReply(reply, [...BASE_CHECKS, "goi-y-nguoi-lon"]).map((c) => ({ label: CHECK_LABEL[c.check], ok: c.ok })) };
  };
  const [before, after] = await Promise.all([ask(rules.text), ask(`${rules.text.trim()}\n\nDẶN THÊM (thầy cô vừa dạy)\n- ${extra.trim()}`)]);
  return { before, after };
}
