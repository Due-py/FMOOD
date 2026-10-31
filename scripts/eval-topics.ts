// Chạy bộ thử ĐOÁN CHỦ ĐỀ (không gọi AI): Trợ lý đoán chủ đề từ tin nhắn bằng cụm từ nhận diện.
// Dùng: npm run eval:topics
// Dùng cụm từ ĐANG CHẠY trên web (bảng support_content, các chủ đề đang bật hoặc chỉ lớp thử); chưa đọc được
// thì dùng file mẫu. Chỉ đọc cơ sở dữ liệu. Tự lưu kết quả có ngày và mã phiên bản vào ho-so-du-thi/3-kiem-thu/ket-qua/.
import "./_env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TOPIC_CASES } from "@/lib/eval/topic-cases";
import { createAdminClient } from "@/lib/supabase/admin";
import { guessTopic, type TopicTriggers } from "@/lib/topic-guess";
import { saveResult, stamp, versionCode } from "./eval/chung";

async function topics(): Promise<{ source: string; list: TopicTriggers[] }> {
  const { data, error } = await createAdminClient().from("support_content").select("topic, data").eq("kind", "topic").neq("status", "off");
  if (!error && data?.length) {
    return { source: "cơ sở dữ liệu (cụm từ đang chạy trên web)", list: data.map((t) => ({ key: t.topic as string, triggers: (t.data?.triggers as string[]) ?? [] })) };
  }
  const seed = JSON.parse(readFileSync(path.join(process.cwd(), "content/vong-ho-tro/noi-dung-mau.json"), "utf8")) as {
    kind: string;
    topic: string | null;
    data: { triggers?: string[] };
  }[];
  return { source: "file mẫu content/vong-ho-tro/noi-dung-mau.json", list: seed.filter((i) => i.kind === "topic").map((i) => ({ key: i.topic as string, triggers: i.data.triggers ?? [] })) };
}

async function main() {
  const { source, list } = await topics();
  const rows = TOPIC_CASES.map((c) => {
    const got = guessTopic(c.text, list);
    return { text: c.text, expected: c.expected, got, ok: got === c.expected };
  });
  const right = rows.filter((r) => r.ok).length;
  for (const r of rows) console.log(`${r.ok ? "OK  " : "SAI "} mong đợi=${String(r.expected).padEnd(11)} đoán=${String(r.got).padEnd(11)} ${r.text}`);
  console.log(`\nĐoán đúng ${right}/${rows.length} câu · cụm từ lấy từ ${source}`);

  const t = stamp();
  const version = versionCode();
  const md = [
    `# Bộ thử đoán chủ đề · ${t.text}`,
    "",
    `Phiên bản: \`${version}\` · Lệnh: \`npm run eval:topics\` · Cụm từ lấy từ ${source}. Không gọi AI.`,
    `“không đoán” = câu không rõ chủ đề, trợ lý phải không đoán. Kết quả: **${right}/${rows.length}** (ngưỡng ≥ 80%).`,
    "",
    "| # | Câu thử | Mong đợi | Trợ lý đoán | Kết quả |",
    "|---|---|---|---|---|",
    ...rows.map((r, i) => `| ${i + 1} | ${r.text} | ${r.expected ?? "không đoán"} | ${r.got ?? "không đoán"} | ${r.ok ? "Đúng" : "**Sai**"} |`),
  ].join("\n");
  const files = saveResult("doan-chu-de", md, { loai: "doan-chu-de", thoiGian: t.text, phienBan: version, nguonCumTu: source, dung: right, tong: rows.length, cau: rows });
  console.log(`Đã lưu: ${files.join(", ")}`);
}

main();
