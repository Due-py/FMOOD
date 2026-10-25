import "server-only";
import { EMBEDDING_MODEL, openai } from "@/lib/ai/openai";
import { timed } from "@/lib/ai/log";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// KHO KIẾN THỨC
// Admin tải tài liệu (PDF / văn bản) → "Dạy lại" = chia tài liệu thành đoạn nhỏ và
// tạo vector nghĩa (embedding) cho từng đoạn → khi học sinh nhắn, Mây tìm vài đoạn
// gần nghĩa nhất để tham khảo khi trả lời.

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;
const EMBED_BATCH = 96;

/** Chia văn bản thành các đoạn ~900 ký tự, ưu tiên cắt ở ranh giới đoạn/câu. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"));
      if (cut > CHUNK_SIZE * 0.5) end = start + cut + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece.length > 40) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const res = await timed(
      "embedding",
      EMBEDDING_MODEL,
      () => openai().embeddings.create({ model: EMBEDDING_MODEL, input: batch }),
      (r) => ({ input: r.usage?.prompt_tokens }),
    );
    out.push(...res.data.map((d) => d.embedding));
  }
  return out;
}

/** "Dạy lại" một tài liệu: xóa các đoạn cũ, chia lại và tạo embedding mới. */
export async function trainDocument(documentId: string): Promise<{ ok: true; chunks: number } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: doc } = await admin.from("kb_documents").select("id, content").eq("id", documentId).maybeSingle();
  if (!doc) return { ok: false, error: "Không tìm thấy tài liệu." };

  try {
    const chunks = chunkText(doc.content);
    if (chunks.length === 0) throw new Error("Tài liệu không có chữ (có thể là PDF dạng ảnh scan).");
    const vectors = await embed(chunks);

    await admin.from("kb_chunks").delete().eq("document_id", documentId);
    for (let i = 0; i < chunks.length; i += 200) {
      const rows = chunks.slice(i, i + 200).map((content, j) => ({
        document_id: documentId,
        chunk_index: i + j,
        content,
        embedding: JSON.stringify(vectors[i + j]),
      }));
      const { error } = await admin.from("kb_chunks").insert(rows);
      if (error) throw error;
    }
    kbMemo = null;
    await admin
      .from("kb_documents")
      .update({ status: "ready", error: null, chunk_count: chunks.length, trained_at: new Date().toISOString() })
      .eq("id", documentId);
    return { ok: true, chunks: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("kb_documents").update({ status: "error", error: message.slice(0, 300) }).eq("id", documentId);
    return { ok: false, error: message };
  }
}

export type KnowledgeHit = { title: string; content: string; similarity: number };

/**
 * Kho đã có đoạn tài liệu nào chưa (nhớ 60 giây). Kho trống thì không cần tạo
 * embedding cho tin nhắn: bỏ được một lần gọi OpenAI (0,2–3 giây) mỗi tin.
 */
let kbMemo: { at: number; ready: Promise<boolean> } | null = null;
async function hasKnowledge(): Promise<boolean> {
  if (!kbMemo || Date.now() - kbMemo.at > 60_000) {
    const ready = Promise.resolve(
      createAdminClient().from("kb_chunks").select("id", { count: "exact", head: true }),
    ).then(
      ({ count, error }) => (error ? true : (count ?? 0) > 0),
      () => true,
    );
    kbMemo = { at: Date.now(), ready };
  }
  return kbMemo.ready;
}

/** Tìm các đoạn tài liệu gần nghĩa với câu hỏi. Lỗi thì trả rỗng (không chặn trò chuyện). */
export async function searchKnowledge(query: string, override?: { matchCount?: number; minSimilarity?: number }): Promise<KnowledgeHit[]> {
  const config = await getSetting("kb.config");
  if (!config.enabled && !override) return [];
  if (!(await hasKnowledge())) return [];
  try {
    const [vector] = await embed([query]);
    const { data, error } = await createAdminClient().rpc("match_kb_chunks", {
      query_embedding: JSON.stringify(vector),
      match_count: override?.matchCount ?? config.matchCount,
      min_similarity: override?.minSimilarity ?? config.minSimilarity,
    });
    if (error) throw error;
    return (data ?? []).map((d: { title: string; content: string; similarity: number }) => ({
      title: d.title,
      content: d.content,
      similarity: d.similarity,
    }));
  } catch (error) {
    console.error("[F-Mood] Tra cứu kho kiến thức lỗi", error);
    return [];
  }
}
