#!/usr/bin/env python3
"""Build Benchy Slicer.

Outputs:
  dist/benchy-slicer.html  single-file version (libs and fonts from CDN)
  web/index.html           self-hosted version (libs in web/lib, fonts in web/fonts)
  dist/benchy-slicer-web.zip  zip of web/ for uploading to cPanel
"""
import os, zipfile
ROOT = os.path.dirname(os.path.abspath(__file__))
def rd(f): return open(os.path.join(ROOT, 'src', f), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)

ORDER = ['v2_head.html','v2_body.html','v2_js0.js','v2_js1.js','v2_js2.js','v2_js3.js','v2_js4.js',
         'v2_js6.js','v2_js7.js','v2_js8.js','v2_js9.js','v2_js10.js','v2_js5.js']
src = '\n'.join(rd(f) for f in ORDER)
full = src.replace('__LOGO__', rd('logo.txt').strip()).replace('__BRANDS__', rd('brandlogos.json'))
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
wr('dist/benchy-slicer.html', full)

fonts = '''<style>
@font-face{font-family:"Vazirmatn";src:url(fonts/Vazirmatn-Regular.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url(fonts/Vazirmatn-Medium.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url(fonts/Vazirmatn-Bold.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url(fonts/Vazirmatn-Black.woff2) format("woff2");font-weight:900;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/jetbrains-mono-latin-500-normal.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/jetbrains-mono-latin-700-normal.woff2) format("woff2");font-weight:700;font-display:swap}
</style>'''
s = full
for a, b in [('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&family=JetBrains+Mono:wght@500;700&display=swap">', fonts),
             ('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'lib/three-r128.min.js'),
             ('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'lib/jszip-3.10.min.js'),
             ('https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js', 'lib/clipper-6.4.2.js'),
             ('<meta name="claude:viewport-fit-sides" content="cover">', '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="description" content="اسلایسر آنلاین Benchy Print: پیش‌نمایش، G-code، زمان، فیلامنت و قیمت سفارش">')]:
    assert a in s, a
    s = s.replace(a, b)
s = '<!doctype html>\n<html lang="fa" dir="rtl">\n<head>\n' + s
i = s.index('</style>', s.index('/* Layout')) + len('</style>')
s = s[:i] + '\n</head>\n<body>\n' + s[i:] + '\n</body>\n</html>\n'
wr('web/index.html', s)

zp = os.path.join(ROOT, 'dist', 'benchy-slicer-web.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(os.path.join(ROOT, 'web')):
        for f in fs:
            p = os.path.join(d, f)
            z.write(p, os.path.relpath(p, os.path.join(ROOT, 'web')))
print('built', len(full))
