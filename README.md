# Benchy Slicer

اسلایسر تحت وب برای [@BenchyPrint](https://www.instagram.com/benchyprint/): فایل STL / 3MF / OBJ را باز کنید، اسلایس کنید و زمان پرینت، مصرف فیلامنت، وزن، قیمت و فایل G-code (Marlin) را بگیرید. کل اسلایس داخل مرورگر کاربر انجام می‌شود و به سرور، PHP یا دیتابیس نیازی ندارد.

A browser-based 3D-print slicer (Persian/English UI) with Cura-like settings, supports (normal/tree), adhesion, split with connectors, crop, base, printer profiles, pricing and G-code export.

## ساختار

| مسیر | توضیح |
|---|---|
| `src/` | سورس: `v2_head.html` (CSS)، `v2_body.html` (HTML)، `v2_js*.js` (منطق)، لوگوها |
| `build.py` | ساخت خروجی‌ها از روی `src/` |
| `web/` | نسخه آماده هاست (کتابخانه‌ها و فونت‌ها لوکال، بدون CDN) |
| `dist/benchy-slicer.html` | نسخه تک‌فایلی (کتابخانه‌ها از CDN) |
| `dist/benchy-slicer-web.zip` | زیپ پوشه `web/` برای آپلود در cPanel |
| `samples/` | فایل‌های نمونه برای تست |

## ساخت

```bash
python3 build.py
```

## نصب روی هاست (cPanel)

1. `dist/benchy-slicer-web.zip` را در File Manager داخل `public_html` (یا یک پوشه مثل `slicer`) آپلود کنید.
2. Extract کنید و مطمئن شوید `index.html` مستقیم داخل همان پوشه است.
3. «Show Hidden Files» را روشن کنید تا `.htaccess` را ببینید.

راهنمای کامل‌تر: `web/README-راهنمای-نصب.txt`

---

ساخته شده توسط [پارسا بنی‌طبا](https://parsabanitaba.ir)
