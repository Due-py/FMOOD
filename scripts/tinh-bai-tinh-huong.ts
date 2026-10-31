// Tính kết quả bài tình huống (kế hoạch Demo 3, mục 6.3; cách tính theo bo-do-ky-nang/2-huong-dan-cham.md).
// Đầu vào: hai bảng tải ở trang thầy cô → Chấm bài (bảng điểm; bảng ghép mã, chỉ có sau khi khóa điểm).
// Không đọc cơ sở dữ liệu, không gọi AI. Phần toán ở lib/test-scoring.ts (có test).
//
// Dùng:
//   npm run bai-do:tinh -- --diem cham-bai-tinh-huong.csv --khoa KHOA-ghep-ma.csv --nhom "tk1,tk2,tk3,tk4" [--ra ket-qua.md]
//   Tùy chọn: --lop-dung 8A1  --lop-so-sanh 8A4  --mau 2000
// --nhom: tài khoản (hoặc mã học sinh HS-…) của 4 thành viên nhóm, bị bỏ khỏi mọi phép tính.
import { readFileSync, writeFileSync } from "node:fs";
import { CELL_IDS, READ_BEFORE_YES, type Cells } from "../lib/bai-do";
import {
  agreement,
  bootstrapDiff,
  describe,
  directionCounts,
  mergeRaters,
  parseCell,
  parseCsv,
  SKILL_CELLS,
  SKILL_NAME,
  SKILLS,
  skillScores,
  type ScoredCells,
  type SkillKey,
} from "../lib/test-scoring";

const MIN_PER_CLASS = 12; // mỗi lớp mời 15 bạn (Duy chốt 31/10), cần ít nhất 12 bạn đủ hai bài
type Measure = SkillKey | "total";
const MEASURES: Measure[] = ["total", ...SKILLS];
const measureName = (m: Measure) => (m === "total" ? "Tổng (0–24)" : `${m} ${SKILL_NAME[m]} (0–6)`);

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}

const num = (v: number | null | undefined, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? "–" : v.toFixed(d).replace(".", ","));
const pct = (v: number | null) => (v === null ? "–" : `${(v * 100).toFixed(0)}%`);
const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();

type Score = { cells: Cells; guessClass: string; guessRound: string };
type Paper = {
  code: string;
  student: string;
  account: string;
  className: string;
  round: number;
  form: string;
  readBefore: string;
  aiUse: string;
  durationS: number | null;
  pasteBlocked: number;
  cells: ScoredCells;
};

function readScores(file: string): Map<string, { 1?: Score; 2?: Score }> {
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8"));
  const col = (prefix: string) => header.findIndex((h) => h.trim().startsWith(prefix));
  const iCode = col("Mã chấm");
  const iRater = col("Người chấm");
  const iCells = CELL_IDS.map((c) => col(`${c} `));
  const iGuessClass = col("Đoán lớp");
  const iGuessRound = col("Đoán lần");
  if (iCode < 0 || iRater < 0 || iCells.some((i) => i < 0)) throw new Error("Bảng điểm thiếu cột (Mã chấm, Người chấm, 12 ô 1.1–4.3).");
  const out = new Map<string, { 1?: Score; 2?: Score }>();
  for (const r of rows) {
    const code = r[iCode]?.trim();
    const slot = Number(r[iRater]);
    if (!code || (slot !== 1 && slot !== 2)) continue;
    const cells: Cells = {};
    CELL_IDS.forEach((c, k) => {
      const v = parseCell(r[iCells[k]] ?? "");
      if (v !== undefined) cells[c] = v;
    });
    const entry = out.get(code) ?? {};
    entry[slot] = { cells, guessClass: r[iGuessClass] ?? "", guessRound: r[iGuessRound] ?? "" };
    out.set(code, entry);
  }
  return out;
}

function readMapping(file: string) {
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8"));
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim() === name);
    if (i < 0) throw new Error(`Bảng ghép mã thiếu cột "${name}".`);
    return i;
  };
  const c = {
    code: col("Mã chấm"),
    student: col("Mã học sinh"),
    account: col("Tài khoản"),
    className: col("Lớp"),
    round: col("Lần"),
    form: col("Đề"),
    readBefore: col("Đã đọc đề (lần 2)"),
    aiUse: col("Dùng AI / nhờ ai"),
    duration: col("Thời gian làm (giây)"),
    paste: col("Lần dán bị chặn"),
  };
  return rows.map((r) => ({
    code: r[c.code].trim(),
    student: r[c.student].trim(),
    account: r[c.account].trim(),
    className: r[c.className].trim(),
    round: Number(r[c.round]),
    form: r[c.form].trim(),
    readBefore: r[c.readBefore].trim(),
    aiUse: r[c.aiUse].trim(),
    durationS: r[c.duration] ? Number(r[c.duration]) : null,
    pasteBlocked: Number(r[c.paste]) || 0,
  }));
}

function main() {
  const diemFile = arg("--diem");
  const khoaFile = arg("--khoa");
  if (!diemFile || !khoaFile) {
    console.log('Cách dùng: npm run bai-do:tinh -- --diem <bảng điểm.csv> --khoa <bảng ghép mã.csv> --nhom "tk1,tk2,tk3,tk4" [--ra ket-qua.md]');
    process.exit(1);
  }
  const useClass = arg("--lop-dung") ?? "8A1";
  const compareClass = arg("--lop-so-sanh") ?? "8A4";
  const samples = Number(arg("--mau") ?? 2000);
  const team = new Set((arg("--nhom") ?? "").split(",").map(norm).filter(Boolean));

  const scores = readScores(diemFile);
  const mapping = readMapping(khoaFile);
  const out: string[] = [];
  const say = (line = "") => out.push(line);

  say("# Kết quả bài tình huống");
  say();
  say(`Tính bằng scripts/tinh-bai-tinh-huong.ts lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Bootstrap ${samples} lần, hạt giống cố định.`);
  say(`Lớp dùng app: ${useClass} · lớp so sánh: ${compareClass}. Điểm kỹ năng = trung bình các ô có điểm × 3; ô T, K không tính.`);

  // ───────── 1. Độ đồng ý hai người chấm (tính trước khi họp thống nhất) ─────────
  const doubled = [...scores.entries()].filter(([, s]) => s[1] && s[2]);
  say();
  say("## 1. Độ đồng ý hai người chấm");
  say();
  say(`${doubled.length} bài có cả hai người chấm (mục tiêu 30).`);
  if (doubled.length) {
    const pairs = doubled.map(([, s]) => [s[1]!.cells, s[2]!.cells] as [Cells, Cells]);
    say();
    say("| Phạm vi | Số ô | Tỉ lệ ô cùng điểm | Kappa trọng số tuyến tính | Kappa trọng số bậc hai |");
    say("|---|---|---|---|---|");
    const row = (label: string, a: ReturnType<typeof agreement>) =>
      say(`| ${label} | ${a.cells} | ${pct(a.pct)} | ${num(a.kappaLinear)} | ${num(a.kappaQuadratic)} |`);
    row("Chung 12 ô", agreement(pairs));
    for (const k of SKILLS) row(`${k} ${SKILL_NAME[k]}`, agreement(pairs, SKILL_CELLS[k]));
    const farApart = pairs.reduce((n, [a, b]) => n + CELL_IDS.filter((c) => typeof a[c] === "number" && typeof b[c] === "number" && Math.abs((a[c] as number) - (b[c] as number)) === 2).length, 0);
    say();
    say(`Ô lệch nhau 2 điểm (cần họp thống nhất): ${farApart}. ${(agreement(pairs).pct ?? 0) < 0.8 ? "**Dưới 80%: xem lại cách hiểu tiêu chí trước khi báo cáo.**" : "Đạt ngưỡng ≥ 80%."}`);
  }

  // ───────── 2. Ghép bài với lớp, lần; loại trừ ─────────
  const papers: Paper[] = [];
  let noScore = 0;
  for (const m of mapping) {
    const s = scores.get(m.code);
    if (!s?.[1] && !s?.[2]) {
      noScore++;
      continue;
    }
    papers.push({ ...m, cells: mergeRaters((s[1] ?? s[2])!.cells, s[1] ? s[2]?.cells : null) });
  }
  const isTeam = (p: Paper) => team.has(norm(p.account)) || team.has(norm(p.student));
  const teamPapers = papers.filter(isTeam);
  const kept = papers.filter((p) => !isTeam(p));
  const readBefore = kept.filter((p) => p.round === 2 && p.readBefore === READ_BEFORE_YES);
  const analysed = kept.filter((p) => !(p.round === 2 && p.readBefore === READ_BEFORE_YES));

  say();
  say("## 2. Bài đưa vào tính");
  say();
  say(`- Bài trong bảng ghép mã: ${mapping.length}; chưa có điểm: ${noScore}.`);
  say(`- Bỏ bài của nhóm làm F-Mood: ${teamPapers.length} bài (${new Set(teamPapers.map((p) => p.student)).size} bạn; danh sách --nhom có ${team.size} tên).`);
  for (const cls of [useClass, compareClass]) {
    say(`- ${cls}: bỏ ${readBefore.filter((p) => p.className === cls).length} bài lần 2 ghi "đã đọc đề này rồi".`);
  }

  // ghép lần 1 – lần 2 theo học sinh
  type Pair = { student: string; className: string; first: Paper; second: Paper };
  const byStudent = new Map<string, Paper[]>();
  for (const p of analysed) byStudent.set(p.student, [...(byStudent.get(p.student) ?? []), p]);
  const pairs: Pair[] = [];
  const single = new Map<string, number>();
  for (const [student, ps] of byStudent) {
    const first = ps.find((p) => p.round === 1);
    const second = ps.find((p) => p.round === 2);
    if (first && second) pairs.push({ student, className: second.className, first, second });
    else single.set(ps[0].className, (single.get(ps[0].className) ?? 0) + 1);
  }
  for (const cls of [useClass, compareClass]) {
    say(`- ${cls}: ${pairs.filter((p) => p.className === cls).length} bạn có đủ hai lần; ${single.get(cls) ?? 0} bạn chỉ có một lần (không tính).`);
  }

  const scoreOf = (p: Paper, m: Measure, zero = false) => skillScores(p.cells, { blanksAsZero: zero })[m];
  const changesOf = (cls: string, m: Measure, zero = false) =>
    pairs
      .filter((p) => p.className === cls)
      .map((p) => {
        const a = scoreOf(p.first, m, zero);
        const b = scoreOf(p.second, m, zero);
        return a === null || b === null ? null : b - a;
      })
      .filter((v): v is number => v !== null);

  // ───────── 3. Mỗi lớp ─────────
  say();
  say("## 3. Từng lớp (chỉ các bạn có đủ hai lần)");
  for (const cls of [useClass, compareClass]) {
    const ps = pairs.filter((p) => p.className === cls);
    say();
    say(`### ${cls} · ${ps.length} bạn${ps.length < MIN_PER_CLASS ? ` · **dưới ${MIN_PER_CLASS} bạn: chỉ mô tả, không so sánh hai lớp**` : ""}`);
    say();
    say("| Thước đo | Lần 1: TB (ĐLC) · trung vị | Lần 2: TB (ĐLC) · trung vị | Thay đổi TB | Tăng / giữ / giảm | Bạn không có điểm |");
    say("|---|---|---|---|---|---|");
    for (const m of MEASURES) {
      const v1 = ps.map((p) => scoreOf(p.first, m)).filter((v): v is number => v !== null);
      const v2 = ps.map((p) => scoreOf(p.second, m)).filter((v): v is number => v !== null);
      const ch = changesOf(cls, m);
      const d1 = describe(v1);
      const d2 = describe(v2);
      const dir = directionCounts(ch);
      say(
        `| ${measureName(m)} | ${num(d1.mean)} (${num(d1.sd)}) · ${num(d1.median)} | ${num(d2.mean)} (${num(d2.sd)}) · ${num(d2.median)} | ${num(describe(ch).mean)} | ${dir.up} / ${dir.same} / ${dir.down} | ${ps.length - ch.length} |`,
      );
    }
    for (const round of [1, 2]) {
      const rp = analysed.filter((p) => p.className === cls && p.round === round);
      const cellsAll = rp.flatMap((p) => CELL_IDS.map((c) => p.cells[c]));
      const blank = cellsAll.filter((v) => v === "T").length;
      const k = cellsAll.filter((v) => v === "K").length;
      const ai = rp.filter((p) => p.aiUse && p.aiUse !== "Không").length;
      const paste = rp.filter((p) => p.pasteBlocked > 0).length;
      const dur = describe(rp.map((p) => p.durationS).filter((v): v is number => v !== null));
      say(
        `- Lần ${round}: ${rp.length} bài · ô trống ${pct(cellsAll.length ? blank / cellsAll.length : null)} · ${k} ô "K" · ${ai} bài tự kể có dùng AI / nhờ người · ${paste} bài có thử dán chữ · thời gian làm trung vị ${dur.median === null ? "–" : `${Math.round(dur.median / 60)} phút`}.`,
      );
    }
  }

  // ───────── 4. So sánh hai lớp ─────────
  const did = (m: Measure, zero = false) => bootstrapDiff(changesOf(useClass, m, zero), changesOf(compareClass, m, zero), { samples });
  const enough = [useClass, compareClass].every((cls) => pairs.filter((p) => p.className === cls).length >= MIN_PER_CLASS);
  say();
  say(`## 4. So sánh: thay đổi của ${useClass} − thay đổi của ${compareClass}`);
  say();
  if (!enough) say(`**Có lớp dưới ${MIN_PER_CLASS} bạn đủ hai lần: theo hướng dẫn chấm chỉ mô tả, không kết luận so sánh.**`);
  say();
  say("| Thước đo | Chênh lệch | KTC 95% (bootstrap) | Chứa 0? | Độ nhạy: ô trống = 0 | KTC 95% |");
  say("|---|---|---|---|---|---|");
  for (const m of MEASURES) {
    const r = did(m);
    const z = did(m, true);
    say(
      `| ${measureName(m)} | ${num(r?.estimate)} | ${r ? `${num(r.low)} đến ${num(r.high)}` : "–"} | ${r ? (r.low <= 0 && r.high >= 0 ? "có (không nói là khác biệt)" : "không") : "–"} | ${num(z?.estimate)} | ${z ? `${num(z.low)} đến ${num(z.high)}` : "–"} |`,
    );
  }
  say();
  say("Khoảng tin cậy chứa 0 thì không nói là có khác biệt. Kết luận đổi khi tính lại với ô trống = 0 thì phải ghi rõ.");

  // ───────── 5. Lần 1 của hai lớp; hai đề; thứ tự đề ─────────
  const round1 = kept.filter((p) => p.round === 1);
  say();
  say("## 5. Kiểm tra thêm");
  say();
  say("**Điểm lần 1 của hai lớp** (mọi bài lần 1, trừ nhóm):");
  say();
  say("| Thước đo | " + [useClass, compareClass].join(" | ") + " |");
  say("|---|---|---|");
  for (const m of MEASURES) {
    say(
      `| ${measureName(m)} | ${[useClass, compareClass]
        .map((cls) => {
          const d = describe(round1.filter((p) => p.className === cls).map((p) => scoreOf(p, m)).filter((v): v is number => v !== null));
          return `${num(d.mean)} (n = ${d.n})`;
        })
        .join(" | ")} |`,
    );
  }
  say();
  say("**Hai đề có ngang nhau không** (lần 1, cả hai lớp):");
  say();
  say("| Thước đo | Đề A | Đề B |");
  say("|---|---|---|");
  for (const m of MEASURES) {
    say(
      `| ${measureName(m)} | ${["A", "B"]
        .map((f) => {
          const d = describe(round1.filter((p) => p.form === f).map((p) => scoreOf(p, m)).filter((v): v is number => v !== null));
          return `${num(d.mean)} (n = ${d.n})`;
        })
        .join(" | ")} |`,
    );
  }
  say();
  say("**Thay đổi tổng theo thứ tự đề:**");
  say();
  for (const cls of [useClass, compareClass]) {
    for (const order of ["A→B", "B→A"]) {
      const ps = pairs.filter((p) => p.className === cls && `${p.first.form}→${p.second.form}` === order);
      const ch = ps.map((p) => {
        const a = scoreOf(p.first, "total");
        const b = scoreOf(p.second, "total");
        return a === null || b === null ? null : b - a;
      }).filter((v): v is number => v !== null);
      say(`- ${cls}, ${order}: ${ps.length} bạn, thay đổi tổng trung bình ${num(describe(ch).mean)}.`);
    }
  }

  // ───────── 6. Người chấm đoán lớp, đoán lần ─────────
  const classOf = new Map(mapping.map((m) => [m.code, m]));
  say();
  say("## 6. Người chấm có đoán ra lớp, lần không");
  say();
  for (const slot of [1, 2] as const) {
    const guesses = [...scores.entries()].filter(([, s]) => s[slot]);
    const cls = guesses.filter(([, s]) => s[slot]!.guessClass.trim() !== "" && norm(s[slot]!.guessClass) !== "không đoán được");
    const clsRight = cls.filter(([code, s]) => norm(s[slot]!.guessClass) === norm(classOf.get(code)?.className ?? "")).length;
    const rnd = guesses.filter(([, s]) => /^[12]$/.test(s[slot]!.guessRound.trim()));
    const rndRight = rnd.filter(([code, s]) => Number(s[slot]!.guessRound) === classOf.get(code)?.round).length;
    say(
      `- Người chấm ${slot}: đoán lớp ${cls.length}/${guesses.length} bài, đúng ${pct(cls.length ? clsRight / cls.length : null)}; đoán lần ${rnd.length}/${guesses.length} bài, đúng ${pct(rnd.length ? rndRight / rnd.length : null)} (đoán may rủi khoảng 50%).`,
    );
  }

  const text = out.join("\n");
  const outFile = arg("--ra");
  if (outFile) {
    writeFileSync(outFile, text + "\n", "utf8");
    console.log(`Đã ghi ${outFile}`);
  } else console.log(text);
}

main();
