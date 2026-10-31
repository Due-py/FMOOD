import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import { requirePage } from "@/lib/permissions";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Hướng dẫn chấm" };

/** Đọc bản sao hướng dẫn chấm (content/bai-do/huong-dan-cham.md), tách bảng ra để tự vẽ. */
function guideBlocks(): { kind: "md" | "table"; text: string }[] {
  let raw = "";
  try {
    raw = readFileSync(path.join(process.cwd(), "content/bai-do/huong-dan-cham.md"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  } catch {
    return [{ kind: "md", text: "Chưa có file hướng dẫn chấm (content/bai-do/huong-dan-cham.md)." }];
  }
  const blocks: { kind: "md" | "table"; text: string }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const kind = line.trim().startsWith("|") ? "table" : "md";
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind) last.text += `\n${line}`;
    else blocks.push({ kind, text: line });
  }
  return blocks;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

/** Bảng Markdown (react-markdown không tự vẽ bảng khi không có remark-gfm). */
function GuideTable({ text }: { text: string }) {
  // bỏ dòng kẻ |---|---| giữa tiêu đề và thân bảng
  const [head, ...body] = text.split("\n").filter((r) => r.trim() && !/^\|[\s|:-]+\|$/.test(r.trim()));
  const inline = { p: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {cells(head ?? "").map((c, i) => (
              <th key={i} className="border border-line bg-surface-2 px-3 py-2 text-left align-top font-semibold">
                <Markdown components={inline}>{c}</Markdown>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {cells(r).map((c, j) => (
                <td key={j} className="border border-line px-3 py-2 align-top">
                  <Markdown components={inline}>{c}</Markdown>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GuidePage() {
  await requirePage("/staff/cham-bai");
  return (
    <div>
      <Link href="/staff/cham-bai" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Chấm bài
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Hướng dẫn chấm bài tình huống</h1>
      <p className="mt-3 rounded-2xl bg-peach px-4 py-3 text-sm">
        <strong>An toàn:</strong> bài có điều đáng lo (ví dụ ý muốn làm hại bản thân) thì dừng chấm ô đó, đánh dấu &quot;Bài có điều đáng lo&quot; ở
        cuối trang chấm và không chép nội dung vào ghi chú. Tư vấn viên sẽ được báo. Không ai tìm cách đoán đó là bài của bạn nào.
      </p>
      <article className="mt-4 leading-relaxed [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:space-y-1">
        {guideBlocks().map((b, i) => (b.kind === "table" ? <GuideTable key={i} text={b.text} /> : <Markdown key={i}>{b.text}</Markdown>))}
      </article>
    </div>
  );
}
