"""Đo thời gian CHUYỂN TRANG trong F-Mood như học sinh bấm menu (trình duyệt thật, đã đăng nhập tài khoản TEST Mây).

Mỗi lần bấm một mục menu ghi 2 mốc (tính từ lúc bấm, mili giây):
  phan_hoi : lúc màn hình bắt đầu đổi (hiện khung "đang tải" hoặc đã sang trang mới)
  xong     : lúc trang mới hiện đủ nội dung (đúng địa chỉ, không còn khung "đang tải")
và số lượt trình duyệt phải hỏi máy chủ (yêu cầu RSC) trong lần bấm đó.

Thứ tự bấm mỗi vòng: Kỹ năng → Hành trình → Học cùng AI → Hôm nay. Vòng 1 = mở trang lần đầu,
vòng 2–3 = quay lại trong vòng 30 giây, rồi nghỉ 35 giây, vòng 4 = quay lại sau hơn 30 giây.

Dùng (chạy ở thư mục gốc dự án, cần .env.local có NHATKY_*):
  python ho-so-du-thi/3-kiem-thu/toc-do/cong-cu/chuyen-trang.py <thư mục ra> <nhãn>=<url> [<nhãn>=<url> ...] [--lap 2]
Ra: <thư mục ra>/ket-qua.json (số đo từng lần bấm), tom-tat.md (bảng trung vị), anh/<nhãn>_<cỡ>_<trang>.png
    (màn hình 0,2 giây sau khi bấm: thấy gì ngay sau khi bấm).
"""
import argparse, json, statistics, subprocess, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
VN = timezone(timedelta(hours=7))

# (tên, các href có thể có của link menu, tiền tố địa chỉ đích)
DICH = [
    ("ky-nang", ["/ky-nang"], "/ky-nang"),
    ("hanh-trinh", ["/hanh-trinh"], "/hanh-trinh"),
    # đích là /chat/new: link cũ /chat chỉ chuyển tiếp, địa chỉ đổi sang /chat trước khi trang trò chuyện thật hiện ra
    ("hoc-cung-ai", ["/chat", "/chat/new"], "/chat/new"),
    ("hom-nay", ["/home"], "/home"),
]
CO = {
    "may-tinh": dict(viewport={"width": 1280, "height": 800}),
    "dien-thoai": dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True),
}

# Bấm link menu đang hiện rồi theo dõi từng khung hình tới khi trang mới hiện xong.
BAM = """async ({hrefs, prefix, cho}) => {
  const hien = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const a = [...document.querySelectorAll("a")].find((el) => hrefs.includes(el.getAttribute("href")) && hien(el) && el.closest("nav"));
  if (!a) return { loi: "không thấy link " + hrefs.join("|") };
  const t0 = performance.now();
  a.click();
  if (!cho) return { daBam: true };
  let phanHoi = null, onDinh = 0;
  return await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now() - t0;
      const dangTai = document.querySelector("[data-dang-tai]");
      const dungTrang = location.pathname.startsWith(prefix);
      if (phanHoi === null && (dangTai || dungTrang)) phanHoi = t;
      // đúng trang và không còn khung đang tải trong 2 khung hình liền nhau
      onDinh = dungTrang && !dangTai ? onDinh + 1 : 0;
      if (onDinh >= 2) return resolve({ phan_hoi: Math.round(phanHoi), xong: Math.round(t) });
      if (t > 30000) return resolve({ phan_hoi: phanHoi && Math.round(phanHoi), xong: null, loi: "quá 30 giây" });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}"""


def lay_cookie(host):
    out = subprocess.run("npx tsx scripts/nhat-ky/lay-cookie.ts hs", cwd=ROOT, shell=True, capture_output=True, text=True, check=True).stdout
    return [dict(c, domain=host, path="/") for c in json.loads(out.strip().splitlines()[-1])]


def mot_luot(browser, nhan, url, co, opts, anh_dir):
    """Một lượt đo trên một bản: ngữ cảnh mới (bộ nhớ đệm trống), mở Hôm nay rồi bấm 4 vòng."""
    ctx = browser.new_context(locale="vi-VN", color_scheme="light", **opts)
    ctx.add_cookies(lay_cookie(urlparse(url).hostname))
    ctx.route("**/signout**", lambda r: r.abort())  # không để lỡ tay đăng xuất cả phiên
    page = ctx.new_page()
    rsc = []
    page.on("requestfinished", lambda req: rsc.append(req) if "_rsc=" in req.url or req.headers.get("rsc") == "1" else None)
    r = page.goto(url + "/home", wait_until="networkidle", timeout=90_000)
    if not page.url.startswith(url + "/home"):
        raise SystemExit(f"{nhan}: mở /home bị chuyển sang {page.url} (phiên đăng nhập hỏng?)")
    time.sleep(2)
    ket_qua = []
    for vong in (1, 2, 3, 4):
        if vong == 4:
            time.sleep(35)
        for ten, hrefs, prefix in DICH:
            rsc.clear()
            if anh_dir and vong == 1:
                # chụp 0,2 giây sau khi bấm: học sinh thấy gì ngay lúc đó
                page.evaluate(BAM, {"hrefs": hrefs, "prefix": prefix, "cho": False})
                time.sleep(0.2)
                page.screenshot(path=str(anh_dir / f"{nhan}_{co}_{ten}.png"))
                page.wait_for_url(f"**{prefix}**", timeout=30_000)
                page.wait_for_function("!document.querySelector('[data-dang-tai]')", timeout=30_000)
                time.sleep(1.5)
                continue
            t0 = time.perf_counter()
            try:
                kq = page.evaluate(BAM, {"hrefs": hrefs, "prefix": prefix, "cho": True})
            except Exception as e:
                if "Execution context was destroyed" not in str(e):
                    raise
                # trình duyệt tải lại CẢ trang thay vì chuyển trong app: đo tới lúc trang mới hiện đủ (đồng hồ phía script)
                page.wait_for_url(f"**{prefix}**", timeout=30_000)
                page.wait_for_load_state("load")
                page.wait_for_function("!document.querySelector('[data-dang-tai]')", timeout=30_000)
                kq = dict(phan_hoi=None, xong=round((time.perf_counter() - t0) * 1000), tai_lai_ca_trang=True)
            time.sleep(0.8)  # đợi các yêu cầu tải nốt rồi mới đếm
            vung = sorted({(q.response().headers.get("x-vercel-id") or "").split("::")[1] if q.response() and "::" in (q.response().headers.get("x-vercel-id") or "") else "" for q in rsc} - {""})
            ket_qua.append(dict(ban=nhan, co=co, vong=vong, trang=ten, **kq, so_lan_hoi_may_chu=len(rsc), vung_ham=vung))
            ghi_chu = kq.get("loi", "") + (" (tải lại cả trang)" if kq.get("tai_lai_ca_trang") else "")
            print(f"  {nhan:6} {co:10} vòng {vong} {ten:12} phản hồi {kq.get('phan_hoi')!s:>5} ms · xong {kq.get('xong')!s:>5} ms · hỏi máy chủ {len(rsc)} lần{ghi_chu}", flush=True)
            time.sleep(0.7)
    ctx.close()
    return ket_qua


NHOM = {1: "Lần đầu", 2: "Quay lại < 30 giây", 3: "Quay lại < 30 giây", 4: "Quay lại > 30 giây"}


def tom_tat(rows, nhan_list):
    def med(xs):
        xs = [x for x in xs if x is not None]
        return f"{statistics.median(xs) / 1000:.2f}".replace(".", ",") if xs else "–"

    lines = []
    for co in CO:
        lines.append(f"\n### {'Máy tính (1280×800)' if co == 'may-tinh' else 'Điện thoại (390×844)'}\n")
        lines.append("| Trang | Lần | " + " | ".join(f"{n}: phản hồi · xong (giây)" for n in nhan_list) + " |")
        lines.append("|---|---|" + "---|" * len(nhan_list))
        for ten, _, _ in DICH:
            for nhom in dict.fromkeys(NHOM.values()):
                cells = []
                for n in nhan_list:
                    sel = [r for r in rows if r["ban"] == n and r["co"] == co and r["trang"] == ten and NHOM[r["vong"]] == nhom]
                    cells.append(f"{med([r['phan_hoi'] for r in sel])} · {med([r['xong'] for r in sel])}")
                lines.append(f"| {ten} | {nhom} | " + " | ".join(cells) + " |")
        cells = []
        for n in nhan_list:
            sel = [r for r in rows if r["ban"] == n and r["co"] == co]
            cells.append(f"{med([r['phan_hoi'] for r in sel])} · {med([r['xong'] for r in sel])}")
        lines.append("| **Tất cả** | | " + " | ".join(f"**{c}**" for c in cells) + " |")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("ban", nargs="+", help="nhãn=url")
    ap.add_argument("--lap", type=int, default=3)
    a = ap.parse_args()
    out = Path(a.out)
    anh = out / "anh"
    anh.mkdir(parents=True, exist_ok=True)
    ban = [b.split("=", 1) for b in a.ban]
    bat_dau = datetime.now(VN)
    nhan_list = [n for n, _ in ban]
    rows = []

    def luu():
        # lưu sau mỗi lượt: lỡ hỏng giữa chừng vẫn còn số đã đo
        data = dict(do_luc=bat_dau.strftime("%d/%m/%Y %H:%M"), ban={n: u for n, u in ban}, cach_do=__doc__.strip(), so_lan_lap=a.lap, ket_qua=rows)
        (out / "ket-qua.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        md = f"# Chuyển trang F-Mood · đo lúc {data['do_luc']}\n\n" + "\n".join(f"- **{n}**: {u}" for n, u in ban)
        md += f"\n\nTrung vị của {a.lap} lần lặp (lần lặp 1 dùng để chụp ảnh nên vòng 1 chỉ lấy từ lần lặp 2 trở đi). Phản hồi = màn hình bắt đầu đổi; xong = trang mới hiện đủ.\n"
        tai_lai = sum(1 for r in rows if r.get("tai_lai_ca_trang"))
        if tai_lai:
            md += f"\n{tai_lai} lần bấm trình duyệt tải lại cả trang (không chuyển trong app); các lần này chỉ có mốc xong.\n"
        md += tom_tat(rows, nhan_list) + "\n"
        (out / "tom-tat.md").write_text(md, encoding="utf-8")
        return md

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for lap in range(a.lap):
            # đổi thứ tự mỗi lần lặp để hai bản chịu điều kiện mạng như nhau
            for nhan, url in (ban if lap % 2 == 0 else ban[::-1]):
                for co, opts in CO.items():
                    print(f"== lặp {lap + 1} · {nhan} · {co}", flush=True)
                    rows += [dict(r, lap=lap + 1) for r in mot_luot(browser, nhan, url.rstrip("/"), co, opts, anh if lap == 0 else None)]
                    luu()
        browser.close()
    print(luu())


if __name__ == "__main__":
    sys.exit(main())
