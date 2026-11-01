// Chấm Lighthouse (cỡ điện thoại, như PageSpeed) cho các trang học sinh cần đăng nhập, nhiều bản xen kẽ nhau.
// PageSpeed trên web không đăng nhập được nên mọi trang học sinh đều bị chuyển về trang đăng nhập; script này gửi kèm phiên
// của tài khoản TEST Mây (scripts/nhat-ky/lay-cookie.ts) qua header Cookie, báo cáo lưu ra không chứa phiên.
// Dùng (ở thư mục gốc dự án): node ho-so-du-thi/3-kiem-thu/toc-do/cong-cu/lighthouse-dang-nhap.mjs <thư mục ra> <nhãn>=<url> ... [--lan 3]
// Ra: <thư mục ra>/ket-qua.json (từng lần chấm), tom-tat.md (trung vị), lighthouse_<nhãn>_<trang>.html (lần chấm cuối)
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { ReportGenerator } from "lighthouse/report/generator/report-generator.js";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PAGES = ["/home", "/ky-nang", "/hanh-trinh", "/chat/new"];
const args = process.argv.slice(2);
const lanIdx = args.indexOf("--lan");
const LAN = lanIdx >= 0 ? Number(args.splice(lanIdx, 2)[1]) : 3;
const [OUT, ...banArgs] = args;
const ban = banArgs.map((b) => b.split(/=(.*)/s).slice(0, 2));
mkdirSync(OUT, { recursive: true });

const cookie = JSON.parse(execSync("npx tsx scripts/nhat-ky/lay-cookie.ts hs", { encoding: "utf8" }).trim().split(/\r?\n/).at(-1))
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const batDau = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const rows = [];
const chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ["--headless=new"] });
try {
  for (let lan = 1; lan <= LAN; lan++) {
    for (const p of PAGES) {
      // đổi thứ tự mỗi lần để các bản chịu điều kiện mạng như nhau
      for (const [nhan, url] of lan % 2 ? ban : [...ban].reverse()) {
        const r = await lighthouse(url + p, { port: chrome.port, output: "json", onlyCategories: ["performance"], extraHeaders: { Cookie: cookie } });
        const lhr = r.lhr;
        delete lhr.configSettings.extraHeaders; // không lưu phiên đăng nhập vào báo cáo
        if (lhr.finalDisplayedUrl !== url + p) throw new Error(`${nhan} ${p} bị chuyển sang ${lhr.finalDisplayedUrl} (phiên đăng nhập hỏng?)`);
        const a = lhr.audits;
        const row = {
          ban: nhan, trang: p, lan,
          diem: Math.round(lhr.categories.performance.score * 100),
          fcp: Math.round(a["first-contentful-paint"].numericValue),
          lcp: Math.round(a["largest-contentful-paint"].numericValue),
          tbt: Math.round(a["total-blocking-time"].numericValue),
          cls: Number(a["cumulative-layout-shift"].numericValue.toFixed(3)),
          si: Math.round(a["speed-index"].numericValue),
          may_chu: Math.round(a["server-response-time"].numericValue),
        };
        rows.push(row);
        console.log(`lần ${lan} ${nhan.padEnd(14)} ${p.padEnd(12)} điểm ${row.diem} · FCP ${row.fcp} · LCP ${row.lcp} · TBT ${row.tbt} · CLS ${row.cls} · máy chủ ${row.may_chu} ms`);
        if (lan === LAN) {
          const html = ReportGenerator.generateReportHtml(lhr);
          if (html.includes("auth-token")) throw new Error("Báo cáo còn chứa cookie đăng nhập");
          writeFileSync(`${OUT}/lighthouse_${nhan}${p.replace(/\//g, "_")}.html`, html);
        }
      }
    }
    writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify({ do_luc: batDau, ban: Object.fromEntries(ban), so_lan: LAN, ket_qua: rows }, null, 1));
  }
} finally {
  await chrome.kill();
}

const med = (xs) => { const s = [...xs].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const giay = (ms) => (ms / 1000).toFixed(2).replace(".", ",");
let md = `# Lighthouse các trang học sinh (cỡ điện thoại) · đo lúc ${batDau}\n\n${ban.map(([n, u]) => `- **${n}**: ${u}`).join("\n")}\n\n`;
md += `Trung vị của ${LAN} lần chấm mỗi trang, các bản chấm xen kẽ. Điểm hiệu năng 0–100; thời gian tính bằng giây (TBT bằng mili giây).\n\n`;
md += `| Trang | Bản | Điểm | FCP | LCP | TBT (ms) | CLS | Speed Index | Máy chủ trả trang |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const p of PAGES)
  for (const [nhan] of ban) {
    const r = rows.filter((x) => x.trang === p && x.ban === nhan);
    md += `| ${p} | ${nhan} | ${med(r.map((x) => x.diem))} | ${giay(med(r.map((x) => x.fcp)))} | ${giay(med(r.map((x) => x.lcp)))} | ${med(r.map((x) => x.tbt))} | ${med(r.map((x) => x.cls))} | ${giay(med(r.map((x) => x.si)))} | ${giay(med(r.map((x) => x.may_chu)))} |\n`;
  }
writeFileSync(`${OUT}/tom-tat.md`, md);
console.log("\n" + md);
