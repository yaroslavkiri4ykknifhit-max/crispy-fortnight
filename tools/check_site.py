#!/usr/bin/env python3
"""Check the static site's crawlable HTML and business data without dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://yaroslavkiri4ykknifhit-max.github.io/crispy-fortnight'
PREFIX = '/crispy-fortnight'
PHONE = '+375445776348'
errors = []

def check(condition, message):
    if not condition:
        errors.append(message)

class Page(HTMLParser):
    def __init__(self, filename):
        super().__init__(convert_charrefs=True)
        self.file = filename
        self.tags = []
        self.ids = []
        self.links = []
        self.meta = {}
        self.canonicals = []
        self.h1 = 0
        self.title = ''
        self.visible = ''
        self.jsonld = []
        self.script_text = ''
        self.in_json = False
        self.hidden = 0
        self.in_title = False
        self.main_count = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'html':
            check(attrs.get('lang') == 'ru-BY', f'{self.file}: language missing')
        if tag == 'h1': self.h1 += 1
        if tag == 'main': self.main_count += 1
        if tag == 'title': self.in_title = True
        if tag == 'meta': self.meta[attrs.get('name', attrs.get('property'))] = attrs.get('content', '')
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonicals.append(attrs.get('href'))
        if tag in ('script', 'style'):
            self.hidden += 1
            if attrs.get('type') == 'application/ld+json': self.in_json = True; self.script_text = ''
        for field in ('href', 'src'):
            if attrs.get(field): self.links.append(attrs[field])
        if tag == 'img':
            check('alt' in attrs, f'{self.file}: image without alt')
            check(attrs.get('width') and attrs.get('height'), f'{self.file}: image without dimensions')
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
            if self.in_json:
                try: self.jsonld.append(json.loads(self.script_text))
                except json.JSONDecodeError: errors.append(f'{self.file}: invalid JSON-LD')
                self.in_json = False
    def handle_data(self, text):
        if self.in_title: self.title += text
        if self.in_json: self.script_text += text
        if not self.hidden: self.visible += ' ' + text

pages = {}
for file in sorted(ROOT.rglob('*.html')):
    relative = file.relative_to(ROOT).as_posix()
    path = '/' if relative == 'index.html' else '/' + relative.removesuffix('index.html') if relative.endswith('/index.html') else '/' + relative
    page = Page(relative)
    source = file.read_text(encoding='utf-8')
    page.feed(source)
    pages[path] = page
    check(page.h1 == 1, f'{relative}: expected exactly one H1')
    check(page.main_count == 1, f'{relative}: expected one main landmark')
    check(page.canonicals == [BASE + path], f'{relative}: wrong canonical URL')
    check(page.meta.get('og:url') == BASE + path, f'{relative}: wrong Open Graph URL')
    check(page.meta.get('viewport'), f'{relative}: missing viewport')
    check(page.title and page.meta.get('description'), f'{relative}: missing title/description')
    check('Крепкий пол' in page.title, f'{relative}: title brand missing')
    check(len(page.ids) == len(set(page.ids)), f'{relative}: duplicate IDs')
    check('ИП Кашурнин В.А.' in page.visible and '491689815' in page.visible, f'{relative}: legal details missing')
    check('+375 (44) 577-63-48' in page.visible, f'{relative}: visible phone missing')
    check(not re.search(r'easypol|375336307946|630-79-46|руб/м|руб\.\s*/|BYN\s*/', source, re.I), f'{relative}: old data or square metre prices remain')
    check(page.meta.get('robots') == ('noindex, follow' if path == '/404.html' else 'index, follow, max-image-preview:large'), f'{relative}: wrong indexing directive')
    check(bool(page.jsonld), f'{relative}: JSON-LD missing')
    for ld in page.jsonld:
        check(ld.get('@context') == 'https://schema.org', f'{relative}: wrong schema context')
        graph = ld.get('@graph', [])
        for item in graph:
            if item.get('@type') == 'Organization':
                check(item.get('telephone') == PHONE and item.get('taxID') == '491689815', f'{relative}: wrong schema business data')
                check('aggregateRating' not in item, f'{relative}: unverified ratings')
            if item.get('@type') == 'FAQPage':
                for question in item['mainEntity']:
                    check(question['name'] in page.visible, f'{relative}: schema question absent from HTML')
                    check(question['acceptedAnswer']['text'] in page.visible, f'{relative}: schema answer absent from HTML')
    for link in page.links:
        if link.startswith('tel:'): check(link == 'tel:' + PHONE, f'{relative}: wrong telephone target')

for path, page in pages.items():
    for link in page.links:
        parsed = urlsplit(link)
        if parsed.scheme and not (parsed.scheme == 'https' and parsed.netloc == 'yaroslavkiri4ykknifhit-max.github.io'): continue
        target = unquote(parsed.path) or path
        if target.startswith(PREFIX + '/'): target = target[len(PREFIX):]
        if not target.startswith('/'): target = str(Path(path).parent / target)
        dest = ROOT / target.lstrip('/')
        if target.endswith('/'): dest /= 'index.html'
        check(dest.is_file(), f'{page.file}: broken internal link {link}')
        if parsed.fragment:
            check(target in pages and parsed.fragment in pages[target].ids, f'{page.file}: missing fragment {link}')

ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap = ET.parse(ROOT / 'sitemap.xml')
urls = [node.text for node in sitemap.findall('s:url/s:loc', ns)]
expected = {BASE + path for path in pages if path != '/404.html'}
check(set(urls) == expected and len(urls) == len(set(urls)), 'Sitemap does not match indexable pages')
check(len(expected) == 9, 'Expected nine indexable pages')
check(len({p.title for p in pages.values()}) == len(pages), 'Duplicate page titles')
check(len({p.meta.get('description') for p in pages.values()}) == len(pages), 'Duplicate descriptions')
robots = (ROOT / 'robots.txt').read_text()
check('Disallow: /\n' not in robots, 'Robots blocks the whole site')
check('Sitemap: ' + BASE + '/sitemap.xml' in robots, 'Robots lacks sitemap')
check('Clean-param:' in robots, 'Yandex tracking parameter handling missing')
check(not (ROOT / 'CNAME').exists(), 'Custom domain must remain disconnected')
for file in ROOT.glob('*.css'):
    for asset in re.findall(r'url\([\'"]?([^\)\'"\s]+)', file.read_text()):
        if not asset.startswith(('data:', 'https:', 'http:')):
            check((ROOT / asset.lstrip('/')).is_file(), f'{file.name}: missing CSS asset {asset}')
manifest = json.loads((ROOT / 'site.webmanifest').read_text())
check(manifest.get('name') == 'Крепкий пол', 'Wrong manifest name')
# All indexable pages can be discovered by ordinary HTML links from the home page.
seen = {'/'}
pending = ['/']
while pending:
    page = pages[pending.pop()]
    for href in page.links:
        parsed = urlsplit(href)
        if parsed.scheme or not parsed.path.startswith('/'): continue
        target = parsed.path
        if target.startswith(PREFIX + '/'): target = target[len(PREFIX):]
        if target in pages and target not in seen:
            seen.add(target); pending.append(target)
check(set(pages) - {'/404.html'} <= seen, 'Orphan indexable pages exist')
if errors:
    print('\n'.join(errors)); sys.exit(1)
print(f'OK: {len(expected)} indexable pages, metadata, schema, links, business data, sitemap and assets.')
