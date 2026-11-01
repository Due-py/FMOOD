# So nhanh: lần đầu bấm vào một trang (chưa có lưu đệm), có / không có hiệu ứng View Transition. Dùng: python thu_vt.py
import importlib.util, statistics, time, json
spec = importlib.util.spec_from_file_location("ct", r"D:\Projects\FMOOD\ho-so-du-thi\3-kiem-thu\toc-do\cong-cu\chuyen-trang.py")
ct = importlib.util.module_from_spec(spec); spec.loader.exec_module(ct)
from playwright.sync_api import sync_playwright
BIEN = [("cu+VT", "http://localhost:3200", False), ("moi+VT", "http://localhost:3100", False), ("moi-khongVT", "http://localhost:3100", True)]
DICH = [("ky-nang", ["/ky-nang"], "/ky-nang"), ("hanh-trinh", ["/hanh-trinh"], "/hanh-trinh")]
kq = {b[0]: {d[0]: [] for d in DICH} for b in BIEN}
with sync_playwright() as p:
    br = p.chromium.launch()
    for lan in range(5):
        for ten, url, tat in BIEN:
            ctx = br.new_context(viewport={"width": 1280, "height": 800}); ctx.add_cookies(ct.lay_cookie("localhost"))
            if tat: ctx.add_init_script("delete Document.prototype.startViewTransition")
            pg = ctx.new_page(); pg.goto(url + "/home", wait_until="networkidle"); time.sleep(2)
            for d, hrefs, prefix in DICH:
                r = pg.evaluate(ct.BAM, {"hrefs": hrefs, "prefix": prefix, "cho": True}); kq[ten][d].append(r["xong"]); time.sleep(1.5)
            ctx.close()
    br.close()
for ten in kq:
    print(ten.ljust(12), " ".join(f"{d}: xong {statistics.median(v)/1000:.2f} giây {v}" for d, v in kq[ten].items()))
