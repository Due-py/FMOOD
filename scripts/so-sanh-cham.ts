// TÍNH KẾT QUẢ SO SÁNH A/B SAU KHI 2 NGƯỜI CHẤM XONG (không gọi AI, không đọc cơ sở dữ liệu).
// Dùng: npm run so-sanh:cham -- ho-so-du-thi/3-kiem-thu/ket-qua/so-sanh-ab_<...>
// Đọc phieu-cham-nguoi-1.csv, phieu-cham-nguoi-2.csv (và phieu-cham-thong-nhat.csv nếu đã họp thống nhất chỗ bất đồng),
// mở KHOA-giu-kin.json để biết mã nào là kiểu nào, rồi ghi ket-qua-cham.md vào cùng thư mục.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { agreement, parseRatings, scoreConfigs, type Blinded, type Rating, type Run } from "@/lib/eval/ab";
import { CRITERIA } from "@/lib/eval/ab-scenarios";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "–");

function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(path.join(dir, "KHOA-giu-kin.json"))) {
    console.log("Dùng: npm run so-sanh:cham -- <thư mục so-sanh-ab_...> (thư mục có KHOA-giu-kin.json)");
    process.exitCode = 1;
    return;
  }
  const key = JSON.parse(readFileSync(path.join(dir, "KHOA-giu-kin.json"), "utf8")) as { muc: (Blinded<Run> & { error?: string })[] };
  const items = key.muc.filter((m) => !m.error);
  const read = (file: string): Rating[] | null => {
    const p = path.join(dir, file);
    if (!existsSync(p)) return null;
    const { ratings, errors } = parseRatings(readFileSync(p, "utf8"));
    for (const e of errors) console.log(`${file}: ${e}`);
    return ratings;
  };
  const r1 = read("phieu-cham-nguoi-1.csv") ?? [];
  const r2 = read("phieu-cham-nguoi-2.csv") ?? [];
  const agreed = read("phieu-cham-thong-nhat.csv");

  const table = (name: string, ratings: Rating[]) => {
    const res = scoreConfigs(items, new Map(ratings.map((r) => [r.code, r.scores])));
    return [
      `### ${name}`,
      "",
      `| Kiểu | Bộ | Lượt đạt (đủ 4 tiêu chí) | Kịch bản đạt ≥ 2/3 lần | ${CRITERIA.map((c) => c.key).join(" | ")} |`,
      `|---|---|---|---|${CRITERIA.map(() => "---").join("|")}|`,
      ...(["phat-trien", "moi"] as const).flatMap((set) => {
        const sub = scoreConfigs(items.filter((i) => i.set === set), new Map(ratings.map((r) => [r.code, r.scores])));
        return sub
          .filter((s) => s.turns > 0)
          .map(
            (s) =>
              `| ${s.config} | ${set === "phat-trien" ? "phát triển" : "mới"} | ${s.passedTurns}/${s.turns} (${pct(s.passedTurns, s.turns)}) | ${s.passedScenarios}/${s.scenarios} | ${s.byCriterion.map((n) => `${n}/${s.turns}`).join(" | ")} |`,
          );
      }),
      "",
      res.some((s) => s.turns === 0) ? "Chưa đủ phiếu để tính." : "",
    ].join("\n");
  };

  const ag = agreement(r1, r2);
  const md = [
    `# Kết quả chấm so sánh A/B · ${path.basename(dir)}`,
    "",
    "A = lời dặn chung · B = có xác nhận và đổi cách. Lượt **đạt** khi đủ cả 4 tiêu chí. Kết quả chỉ cho biết kiểu nào tốt hơn **trên bộ kịch bản này**, không chứng minh riêng cơ chế xác nhận gây ra chênh lệch.",
    "",
    "## Đồng thuận ban đầu giữa 2 người chấm",
    "",
    `- Số lượt cả hai cùng chấm: ${ag.items}`,
    `- Ô tiêu chí giống nhau: ${ag.sameCells}/${ag.cells} (${pct(ag.sameCells, ag.cells)})`,
    `- Lượt cùng kết luận Đạt / Chưa đạt: ${ag.samePass}/${ag.items} (${pct(ag.samePass, ag.items)})`,
    `- Chỗ bất đồng cần họp thống nhất (ghi vào phieu-cham-thong-nhat.csv, không thống nhất thì người thứ ba quyết): ${ag.disagree.length ? ag.disagree.map((d) => `${d.code} (${d.criteria.join(", ")})`).join("; ") : "không có"}`,
    "",
    "## Kết quả theo kiểu",
    "",
    agreed ? table("Điểm đã thống nhất", agreed) : "_Chưa có phieu-cham-thong-nhat.csv: dưới đây là kết quả theo từng người chấm, chưa phải kết quả cuối._",
    "",
    table("Người chấm 1", r1),
    "",
    table("Người chấm 2", r2),
  ].join("\n");
  writeFileSync(path.join(dir, "ket-qua-cham.md"), `${md}\n`, "utf8");
  console.log(md);
  console.log(`\nĐã lưu: ${path.join(dir, "ket-qua-cham.md")}`);
}

main();
