// SO SÁNH HAI KIỂU TRỢ LÝ trên các kịch bản trò chuyện nhiều lượt (gọi OpenAI thật, KHÔNG ghi vào cơ sở dữ liệu).
//   A = chỉ có lời dặn chung · B = có thêm phần xác nhận và đổi cách (xem lib/eval/ab-run.ts)
// Dùng:
//   npm run so-sanh:ab                         24 kịch bản bộ phát triển × 2 kiểu × 3 lần
//   npm run so-sanh:ab -- --bo moi             bộ mới (người ngoài nhóm viết ở lib/eval/bo-moi/kich-ban.json)
//   npm run so-sanh:ab -- --bo ca-hai          cả hai bộ
//   npm run so-sanh:ab -- --chi KB01 --lan 1   chạy thử một kịch bản
// Kết quả lưu vào ho-so-du-thi/3-kiem-thu/ket-qua/so-sanh-ab_<ngày giờ>_<phiên bản>/:
//   ban-cham.md                  các cuộc trò chuyện ĐÃ CHE TÊN KIỂU và XÁO THỨ TỰ, đưa cho người chấm
//   phieu-cham-nguoi-1.csv / -2  phiếu chấm trống, mỗi người chấm một file, chấm riêng
//   KHOA-giu-kin.json            mã chấm → kiểu A/B (nhóm giữ, KHÔNG đưa người chấm)
//   thong-tin-chay.md            mô hình, cài đặt, số lần, lỗi nếu có (không có kết quả theo kiểu)
// Chấm xong: npm run so-sanh:cham -- <thư mục>
import "./_env";
import { randomInt } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { blind, ratingSheet, type Config, type Run } from "@/lib/eval/ab";
import { abSettings, runAbConversation, type AbTurnResult } from "@/lib/eval/ab-run";
import { AB_SCENARIOS, CRITERIA, GROUPS, type AbScenario } from "@/lib/eval/ab-scenarios";
import { RESULT_DIR, stamp, versionCode } from "./eval/chung";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

function newScenarios(): AbScenario[] {
  const data = JSON.parse(readFileSync(path.join(process.cwd(), "lib/eval/bo-moi/kich-ban.json"), "utf8")) as { kich_ban: AbScenario[] };
  return (data.kich_ban ?? []).filter((s) => s.id && s.nhom && Array.isArray(s.luot) && s.luot.length && s.chamTuLuot >= 1);
}

type Item = Run & { scenarioData: AbScenario; turns?: AbTurnResult[]; error?: string };

/** Chạy nhiều cuộc trò chuyện cùng lúc nhưng có giới hạn (tránh bị nhà cung cấp chặn vì gọi quá nhanh). */
async function pool<T>(items: T[], limit: number, fn: (t: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

function transcript(item: Item & { code: string }): string {
  const s = item.scenarioData;
  const lines = [
    `## ${item.code}`,
    "",
    `**Kịch bản ${s.id}** · ${s.nhom} ${GROUPS[s.nhom] ?? ""} · ${s.ten}`,
    s.boiCanh
      ? `Bối cảnh: học sinh đã lưu chuyện bận lòng “${s.boiCanh.chuDe}”, mức lo ${s.boiCanh.mucLo}/5${s.boiCanh.khoKhan ? `; trước đó đã xác nhận: “${s.boiCanh.khoKhan}”` : ""}${s.boiCanh.daThu?.length ? `; đã thử: ${s.boiCanh.daThu.map((d) => d.title).join(", ")}` : ""}.`
      : "Bối cảnh: học sinh vào trò chuyện thẳng.",
    `Cần xem: ${s.canXem}`,
    `**Phần chấm: từ lượt học sinh ${s.chamTuLuot} tới hết.**`,
    "",
  ];
  if (item.error) lines.push(`> LỖI khi chạy: ${item.error}. Lượt này không chấm.`);
  (item.turns ?? []).forEach((t, i) => {
    const mark = i + 1 === s.chamTuLuot ? " ▶ bắt đầu chấm" : "";
    lines.push(`**Học sinh (lượt ${i + 1})${mark}:** ${t.hocSinh}`, "", `**Trợ lý:** ${t.may.replace(/\n+/g, " ")}`, "");
  });
  return lines.join("\n");
}

async function main() {
  process.env.FMOOD_NO_AI_LOG = "1";
  const bo = arg("bo") ?? "phat-trien";
  const lan = Math.max(1, Number(arg("lan")) || 3);
  const only = arg("chi");
  const sets: { set: Run["set"]; list: AbScenario[] }[] = [];
  if (bo === "phat-trien" || bo === "ca-hai") sets.push({ set: "phat-trien", list: AB_SCENARIOS });
  if (bo === "moi" || bo === "ca-hai") {
    const fresh = newScenarios();
    if (!fresh.length) console.log("Bộ mới chưa có kịch bản nào (chờ người ngoài nhóm viết vào lib/eval/bo-moi/kich-ban.json).");
    sets.push({ set: "moi", list: fresh });
  }
  const items: Item[] = sets.flatMap(({ set, list }) =>
    list
      .filter((s) => !only || s.id === only)
      .flatMap((s) => (["A", "B"] as Config[]).flatMap((config) => Array.from({ length: lan }, (_, k) => ({ scenario: s.id, set, config, lan: k + 1, scenarioData: s })))),
  );
  if (!items.length) {
    console.log("Không có kịch bản nào để chạy.");
    return;
  }

  const settings = await abSettings();
  console.log(`Chạy ${items.length} cuộc trò chuyện (${items.length / 2 / lan} kịch bản × 2 kiểu × ${lan} lần) · mô hình ${settings.model}`);
  let done = 0;
  await pool(items, 6, async (item) => {
    try {
      item.turns = await runAbConversation(item.scenarioData, item.config, settings);
    } catch (e) {
      // lỗi gọi AI: giữ lại, ghi rõ, KHÔNG bỏ đi cho đẹp số
      item.error = e instanceof Error ? e.message.slice(0, 160) : "lỗi";
    }
    done++;
    if (done % 12 === 0 || done === items.length) console.log(`  xong ${done}/${items.length}`);
  });

  const seed = randomInt(1, 2 ** 31 - 1);
  const blinded = blind(items, seed);
  const t = stamp();
  const version = versionCode();
  const dir = path.join(RESULT_DIR, `so-sanh-ab_${t.file}_${version.replace(/\+/g, "-")}`);
  mkdirSync(dir, { recursive: true });

  const criteria = CRITERIA.map((c) => `- **${c.key} ${c.label}:** ${c.hint}`).join("\n");
  const sheet = [
    `# Bản chấm: so sánh cách trợ lý trả lời · ${t.text}`,
    "",
    "Mỗi mục là một cuộc trò chuyện. Tên kiểu trợ lý đã được che và thứ tự đã được xáo. Mỗi người chấm **chấm riêng**, không trao đổi trước khi nộp phiếu.",
    `Chấm phần từ lượt học sinh được đánh dấu ▶ tới hết, theo 4 tiêu chí (1 = đạt, 0 = chưa đạt), điền vào file phiếu chấm của mình:`,
    "",
    criteria,
    "",
    "Không cố đoán đây là kiểu nào; nếu thấy đoán được, ghi vào cột Ghi chú.",
    "",
    ...blinded.map((b) => transcript(b)),
  ].join("\n");
  writeFileSync(path.join(dir, "ban-cham.md"), sheet, "utf8");
  for (const k of [1, 2]) writeFileSync(path.join(dir, `phieu-cham-nguoi-${k}.csv`), ratingSheet(blinded), "utf8");
  writeFileSync(
    path.join(dir, "KHOA-giu-kin.json"),
    `${JSON.stringify(
      {
        canhBao: "Nhóm giữ file này. KHÔNG đưa cho người chấm.",
        thoiGian: t.text,
        phienBan: version,
        hatGiongXao: seed,
        muc: blinded.map(({ code, scenario, set, config, lan: l, turns, error }) => ({ code, scenario, set, config, lan: l, error, turns })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const errors = blinded.filter((b) => b.error);
  const blockedCount = blinded.reduce((n, b) => n + (b.turns ?? []).filter((x) => x.chan).length, 0);
  writeFileSync(
    path.join(dir, "thong-tin-chay.md"),
    [
      `# Thông tin lần chạy so sánh A/B · ${t.text}`,
      "",
      `- Phiên bản: \`${version}\` · Lệnh: \`npm run so-sanh:ab${process.argv.slice(2).length ? ` -- ${process.argv.slice(2).join(" ")}` : ""}\``,
      `- Mô hình: \`${settings.model}\`, mức suy luận thấp, tối đa 1.200 token, tắt lưu hội thoại phía nhà cung cấp; hai kiểu dùng cùng cài đặt.`,
      `- Bộ: ${sets.map((s) => `${s.set === "phat-trien" ? "bộ phát triển" : "bộ mới"} (${s.list.length} kịch bản)`).join(", ")} · ${lan} lần mỗi kịch bản mỗi kiểu · ${items.length} cuộc trò chuyện.`,
      "- A: lời dặn chung (bỏ QT03–QT08), không có bối cảnh chuyện bận lòng, không có nút. B: lời dặn đủ + khó khăn đã xác nhận + việc đã thử + nút như trên web.",
      "- Giống nhau: tính cách, xưng hô, ba lớp kiểm tra an toàn, kiểm tra câu trả lời trước khi hiện, kịch bản theo chủ đề, tài liệu tham khảo, 20 tin gần nhất, lời học sinh.",
      `- Lỗi khi chạy: ${errors.length}${errors.length ? ` (${errors.map((e) => e.code).join(", ")})` : ""} · câu trả lời bị bộ kiểm tra chặn: ${blockedCount}.`,
      "- Yếu tố chưa kiểm soát: B có lời dặn dài hơn và nhiều ngữ cảnh hơn; câu chào khi bấm Dừng ở B là câu soạn sẵn nên người chấm có thể đoán; kịch bản do nhóm soạn.",
      "",
      "Kết quả theo kiểu A/B chỉ có sau khi 2 người chấm xong: `npm run so-sanh:cham -- <thư mục này>`.",
    ].join("\n"),
    "utf8",
  );
  console.log(`\nĐã lưu: ${path.relative(process.cwd(), dir).replace(/\\/g, "/")}/ (ban-cham.md, phieu-cham-nguoi-1.csv, phieu-cham-nguoi-2.csv, KHOA-giu-kin.json, thong-tin-chay.md)`);
  if (errors.length) console.log(`Có ${errors.length} cuộc trò chuyện lỗi, xem thong-tin-chay.md.`);
}

main();
