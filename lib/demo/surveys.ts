// PHIẾU KHẢO SÁT TRƯỚC / SAU MẪU cho chế độ trình diễn: đúng định dạng CSV mà Google Forms xuất ra,
// để trang Kết quả đọc bằng ĐÚNG đoạn code đọc phiếu thật (parseSurveyCsv). Có cả lớp không dùng app.
// Mã bí mật là chuỗi ngẫu nhiên, không gắn với tài khoản nào.
import {
  AFTER_ITEMS,
  AGREE_OPTIONS,
  HELP_ITEMS,
  HELP_OPTIONS,
  PSS4_ITEMS,
  PSS4_OPTIONS,
  TEST_CLASS,
  WHO5_ITEMS,
  WHO5_OPTIONS,
  type Group,
} from "@/lib/effect/survey";
import { DEMO_CLASSES, DEMO_CONTROL_CLASS } from "./generate";

const t = (code: string, text: string) => `[${code}] ${text}`;
const PRE_HEADER = [
  "Dấu thời gian",
  t("LOP", "Em học lớp nào?"),
  t("MA", "Mã bí mật của em"),
  ...[...WHO5_ITEMS, ...PSS4_ITEMS, ...HELP_ITEMS].map((q) => t(q.code, q.text)),
];
const POST_HEADER = [...PRE_HEADER, ...AFTER_ITEMS.map((q) => t(q.code, q.text))];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");

/** Mức thay đổi trung bình mỗi câu, giữa phiếu trước và phiếu sau. */
const CHANGE = {
  app: { who: 0.5, pssBad: -0.4, pssGood: 0.35, help: 0.32 },
  control: { who: 0.1, pssBad: -0.05, pssGood: 0.05, help: 0.08 },
};

export type DemoSurveys = { pre: string; post: string; groups: Record<string, Group | "skip"> };

/** Phiếu trước và sau của 3 lớp mẫu dùng app + 1 lớp mẫu không dùng app (cùng hạt giống → cùng kết quả). */
export function demoSurveys(seed = 20261026): DemoSurveys {
  const rng = mulberry32(seed);
  const noise = () => (rng() + rng() + rng() - 1.5) * 1.1; // gần phân phối chuẩn, lệch khoảng ±1
  const code = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(rng() * 32)]).join("");
  const pre: string[][] = [PRE_HEADER];
  const post: string[][] = [POST_HEADER];
  const groups: Record<string, Group | "skip"> = { [TEST_CLASS]: "skip" };

  const classes = [
    ...DEMO_CLASSES.map((c) => ({ name: c.name, size: c.size, group: "app" as const })),
    { name: DEMO_CONTROL_CLASS.name, size: DEMO_CONTROL_CLASS.size, group: "control" as const },
  ];
  for (const c of classes) {
    groups[c.name] = c.group;
    const ch = CHANGE[c.group];
    for (let i = 0; i < c.size; i++) {
      const ma = code();
      const who = WHO5_ITEMS.map(() => clamp(2.4 + noise(), 0, 5));
      const pss = PSS4_ITEMS.map((q) => clamp((q.code === "P2" || q.code === "P3" ? 1.8 : 2.2) + noise() * 0.8, 0, 4));
      const help = HELP_ITEMS.map((q) => clamp((q.code === "H3" || q.code === "H4" ? 3.2 : 5) + noise(), 1, 7));
      const row = (w: number[], p: number[], h: number[], s?: number[]) => [
        "20/10/2026 08:00:00",
        c.name,
        ma,
        ...w.map((x) => WHO5_OPTIONS[x]),
        ...p.map((x) => PSS4_OPTIONS[x]),
        ...h.map((x) => HELP_OPTIONS[x - 1]),
        ...(s ? s.map((x) => AGREE_OPTIONS[x - 1]) : []),
      ];
      // khoảng 9/10 bạn làm phiếu trước
      if (rng() < 0.92) pre.push(row(who, pss, help));
      // khoảng 6/7 bạn làm phiếu sau (có bạn chỉ làm một phiếu nên không ghép được)
      if (rng() < 0.86) {
        const w2 = who.map((x) => clamp(x + ch.who + noise() * 0.6, 0, 5));
        const p2 = pss.map((x, k) => clamp(x + (PSS4_ITEMS[k].code === "P2" || PSS4_ITEMS[k].code === "P3" ? ch.pssGood : ch.pssBad) + noise() * 0.5, 0, 4));
        const h2 = help.map((x, k) => clamp(x + (HELP_ITEMS[k].code === "H3" || HELP_ITEMS[k].code === "H4" ? ch.help : 0) + noise() * 0.5, 1, 7));
        const after = c.group === "app" ? AFTER_ITEMS.map(() => clamp(4 + noise() * 0.6, 1, 5)) : undefined;
        post.push(row(w2, p2, h2, after));
        // vài bạn bấm gửi hai lần: chỉ tính lần đầu
        if (i === 3) post.push(row(w2.map(() => 5), p2.map(() => 0), h2.map(() => 7), after));
      }
    }
  }
  // nhóm thử phiếu trước khi phát: không bao giờ được tính
  pre.push([...pre[1].slice(0, 1), TEST_CLASS, "THU1", ...pre[1].slice(3)]);
  return { pre: csv(pre), post: csv(post), groups };
}
