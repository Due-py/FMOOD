import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { CHARACTERS, defaultStyle, LENGTH_CAPS } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { buildCompanionPrompt, promptParts } from "@/lib/ai/prompts";
import { stripCardLines } from "@/lib/ai/reply-cards";
import { generateSuggestions } from "@/lib/ai/suggestions";
import { BASE_CHECKS, CHECK_LABEL, checkReply } from "@/lib/eval/reply-checks";
import { searchKnowledge } from "@/lib/kb";
import { checkMessageDetailed, keywordLayer } from "@/lib/safety/check";
import { normalizeForMatch } from "@/lib/safety/normalize";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { getSetting } from "@/lib/settings";
import { allContent } from "@/lib/support-content-server";
import { topicMatches } from "@/lib/topic-guess";

// "TRỢ LÝ NGHĨ THẾ NÀO": chạy một tin nhắn qua ĐÚNG các bước của app/api/chat/route.ts, báo từng bước
// cho trang Trình diễn. Không lưu tin nhắn, không ghi cảnh báo, không gửi email.

export type TraceStep =
  | "normalize"
  | "keyword"
  | "classifier"
  | "decision"
  | "crisis"
  | "topic"
  | "scenarios"
  | "knowledge"
  | "prompt"
  | "reply"
  | "checks"
  | "suggestions"
  | "privacy";

export type TraceEvent =
  | { type: "start"; step: TraceStep }
  | { type: "done"; step: TraceStep; ms: number; data: Record<string, unknown> }
  | { type: "delta"; text: string }
  | { type: "error"; message: string };

const LEVEL_TEXT = { none: "Bình thường", concern: "Đáng lo", urgent: "Khẩn cấp" } as const;

export async function* traceMessage(message: string): AsyncGenerator<TraceEvent> {
  const timed = async <T,>(step: TraceStep, run: () => Promise<T>): Promise<[T, number]> => {
    const started = Date.now();
    const value = await run();
    return [value, Date.now() - started];
  };

  // 1. chuẩn hóa: bỏ dấu, mở viết tắt (chỉ để so khớp, không đổi tin nhắn)
  yield { type: "start", step: "normalize" };
  yield { type: "done", step: "normalize", ms: 0, data: { text: normalizeForMatch(message) } };

  // 2. bộ lọc từ khóa (không cần mạng)
  yield { type: "start", step: "keyword" };
  const [keyword, kwMs] = await timed("keyword", () => keywordLayer(message));
  yield { type: "done", step: "keyword", ms: kwMs, data: { level: keyword.level, label: LEVEL_TEXT[keyword.level], reasons: keyword.reasons } };

  // 3. AI phân loại có xét bối cảnh (app bỏ qua bước này khi từ khóa đã rõ là khẩn cấp)
  yield { type: "start", step: "classifier" };
  let level = keyword.level;
  let reasons = keyword.reasons;
  if (keyword.level === "urgent") {
    yield { type: "done", step: "classifier", ms: 0, data: { skipped: true } };
  } else {
    const [detail, aiMs] = await timed("classifier", () => checkMessageDetailed(message, []));
    level = detail.level;
    reasons = detail.reasons;
    const ai = detail.layers.classifier;
    yield {
      type: "done",
      step: "classifier",
      ms: aiMs,
      data: ai === "error" ? { error: true, fallback: detail.layers.moderation } : { level: ai.level, label: LEVEL_TEXT[ai.level], reasons: ai.reasons },
    };
  }

  // 4. quyết định
  yield { type: "start", step: "decision" };
  yield { type: "done", step: "decision", ms: 0, data: { level, label: LEVEL_TEXT[level], reasons } };

  if (level === "urgent") {
    yield { type: "start", step: "crisis" };
    const crisis = await getSetting("safety.crisis");
    yield { type: "done", step: "crisis", ms: 0, data: { text: crisis.message } };
    yield { type: "start", step: "privacy" };
    yield { type: "done", step: "privacy", ms: 0, data: { level } };
    return;
  }

  // 5. đoán chủ đề (không gọi AI)
  yield { type: "start", step: "topic" };
  const content = await allContent();
  const topics = content.items
    .filter((i) => i.kind === "topic" && i.topic && i.status === "on")
    .map((i) => ({ key: i.topic as string, triggers: (i.data.triggers as string[]) ?? [], label: String(i.data.label), emoji: String(i.data.emoji) }));
  const matches = topicMatches(message, topics);
  const best = matches.reduce<(typeof matches)[number] | null>((b, m) => (!b || m.triggers.length > b.triggers.length ? m : b), null);
  const topic = best ? topics.find((t) => t.key === best.key) : null;
  yield {
    type: "done",
    step: "topic",
    ms: 0,
    data: topic && best ? { label: topic.label, emoji: topic.emoji, triggers: best.triggers } : { none: true },
  };

  // 6–7. kịch bản theo chủ đề + tài liệu đã duyệt (chạy song song như app)
  yield { type: "start", step: "scenarios" };
  yield { type: "start", step: "knowledge" };
  const [[scenarios, scMs], [knowledge, kbMs], config, model] = await Promise.all([
    timed("scenarios", async () => matchScenarios(message, await activeScenarios())),
    timed("knowledge", () => searchKnowledge(message)),
    getPromptConfig(),
    chatModel(),
  ]);
  // học sinh thử chưa chọn gì: dùng nhân vật và các mức mặc định admin đặt
  const style = defaultStyle(config.styles);
  yield { type: "done", step: "scenarios", ms: scMs, data: { titles: scenarios.map((s) => s.title) } };
  yield {
    type: "done",
    step: "knowledge",
    ms: kbMs,
    data: { hits: knowledge.map((k) => ({ title: k.title, similarity: Math.round(k.similarity * 100), excerpt: k.content.slice(0, 140) })) },
  };

  // 8. ghép lời dặn
  yield { type: "start", step: "prompt" };
  const gentle = level === "concern";
  const extras = { concern: gentle, scenarios, knowledge };
  const instructions = buildCompanionPrompt(config, style, "Bạn thử", extras);
  const bullets = (t: string) => t.split("\n").filter((l) => l.trim().startsWith("-")).length;
  yield {
    type: "done",
    step: "prompt",
    ms: 0,
    data: {
      chars: instructions.length,
      // 9 phần của lời dặn, đúng thứ tự máy chủ ghép (phần trống bỏ qua)
      parts: promptParts(config, style, "Bạn thử", extras)
        .filter((p) => p.text)
        .map((p) => ({
          name: `${p.no}. ${p.title}`,
          detail:
            p.no === 1
              ? `${CHARACTERS[style.character].emoji} ${CHARACTERS[style.character].name} (nhân vật mặc định)`
              : p.no === 8
                ? [
                    scenarios.length ? `chủ đề: ${scenarios.map((s) => s.title).join(", ")}` : "",
                    knowledge.length ? `tài liệu: ${[...new Set(knowledge.map((k) => k.title))].join(", ")}` : "",
                    gentle ? "lưu ý lượt đáng lo" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : `${p.by} · ${bullets(p.text)} dòng`,
        })),
      full: instructions,
    },
  };

  // 9. trợ lý trả lời (gửi từng chữ như khi trò chuyện thật)
  yield { type: "start", step: "reply" };
  const started = Date.now();
  let reply = "";
  try {
    const stream = await openai().responses.create({
      model,
      instructions,
      input: message,
      reasoning: { effort: "low" },
      max_output_tokens: LENGTH_CAPS[style.length].maxOutputTokens,
      store: false,
      stream: true,
    });
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        reply += event.delta;
        yield { type: "delta", text: event.delta };
      }
    }
  } catch {
    yield { type: "error", message: "Trợ lý chưa trả lời được lúc này (AI lỗi). Các bước trước vẫn đúng." };
    return;
  }
  // dòng thẻ gợi ý (GOAL / SKILL / END) không hiện thành chữ cho học sinh; máy chấm cũng chỉ chấm câu văn
  reply = stripCardLines(reply);
  yield { type: "done", step: "reply", ms: Date.now() - started, data: { text: reply, model } };

  // 10. máy chấm câu trả lời (cùng máy chấm của bộ thử câu trả lời)
  yield { type: "start", step: "checks" };
  const checks = checkReply(reply, [...BASE_CHECKS, "hoi-lai"]).map((c) => ({ label: CHECK_LABEL[c.check], ok: c.ok }));
  yield { type: "done", step: "checks", ms: 0, data: { checks } };

  // 11. gợi ý trả lời nhanh
  yield { type: "start", step: "suggestions" };
  const [items, sgMs] = await timed("suggestions", () => generateSuggestions(message, reply).catch(() => [] as string[]));
  yield { type: "done", step: "suggestions", ms: sgMs, data: { items } };

  yield { type: "start", step: "privacy" };
  yield { type: "done", step: "privacy", ms: 0, data: { level } };
}
