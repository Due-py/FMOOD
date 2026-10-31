import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { traceMessage } from "@/lib/demo/trace";

export const maxDuration = 60;

const bodySchema = z.object({ message: z.string().trim().min(1).max(500) });

/** Trang Trình diễn: chạy một câu qua từng bước của trợ lý (mỗi dòng là một TraceEvent). Chỉ admin. Không lưu gì. */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at || profile.role !== "admin") return Response.json({ error: "Chỉ admin dùng được." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nhập một câu (tối đa 500 ký tự)." }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of traceMessage(parsed.data.message)) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      } catch (error) {
        console.error("[F-Mood] Trình diễn: lỗi khi chạy từng bước", error);
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", message: "Có lỗi xảy ra. Thử lại nhé." })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
