"""Read public item pages (not /api/) and emit source-backed acquisition facts.

Usage: python scripts/collect-obtain-guides.py > /tmp/obtain-guides.json
No login, signing tokens, comment content or price history are collected.
Only short acquisition facts are extracted per page.
Pass --module to emit the browser/Node module, merging reviewed overrides.
"""
import concurrent.futures
import html
import json
import pathlib
import re
import sys
import subprocess
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path('/tmp/fps-obtain-pages')
CACHE.mkdir(exist_ok=True)
ITEMS = json.loads((ROOT / 'collection-catalog.json').read_text())['items']
LOCK = threading.Lock()
NEXT = 0.0

def text(value):
    return ' '.join(html.unescape(re.sub('<[^>]+>', ' ', value)).split())

def parse(item, page):
    title = re.search(r'<title>(.*?)</title>', page, re.S)
    if not title or item['name'] not in html.unescape(title[1]):
        raise ValueError('item identity does not match page title')
    region = re.search(r'<h2>刷新容器</h2>(.*?)(?:<h2|<script|评论)', page, re.S)
    containers = list(dict.fromkeys(text(s) for s in re.findall(r'<h3[^>]*class="item-name"[^>]*>(.*?)</h3>', region[1], re.S))) if region else []
    desc = re.search(r'<div class="ii-desc">(.*?)</div>', page, re.S)
    # Keep only an explicit source clause, never infer from flavor text.
    clause = re.search(r'【来源】([^【]+)', text(desc[1])) if desc else None
    source_clause = clause[1].strip()[:400] if clause else ''
    trade = bool(re.search(r'推荐卖出方式.*?交易行上架', page, re.S)) and '不可上架交易行' not in page
    exchange = []
    section = re.search(r'<h2>军需处兑换</h2>(.*?)(?:<h2|<script|评论)', page, re.S)
    if section:
        for block in section[1].split('<div class="orz-item-info">')[1:]:
            avatars = [html.unescape(v) for v in re.findall(r'class="avatar" title="([^"]+)"', block)]
            # On ingredient pages this section also lists OTHER recipe outputs.
            # Only a recipe whose output equals the current item is an obtain route.
            if avatars and avatars[0].rsplit(' * ', 1)[0] == item['name']:
                unlock = re.search(r'class="orz-item-tag">(.*?)</div>', block, re.S)
                exchange.append({'unlock': text(unlock[1]) if unlock else '', 'ingredients': avatars[1:]})
    return {'name': item['name'], 'containers': containers, 'tradeable': trade,
            'explicit_source': source_clause, 'exchange': exchange, 'source': item['source_item'],
            'checked': '2026-10-11', 'source_label': '三角洲小涛查公开物品页'}

def read(item):
    global NEXT
    cache = CACHE / (item['item_id'].replace(':', '-') + '.html')
    try:
        if cache.exists():
            page = cache.read_text()
        else:
            with LOCK:
                delay = max(0, NEXT - time.monotonic())
                NEXT = max(NEXT, time.monotonic()) + 0.8
            if delay:
                time.sleep(delay)
            # The normal curl client works for pages where urllib returned 567.
            # Do not change identities, cookies, auth, proxies or network routes.
            if not re.fullmatch(r'https://orzice\.com/v/info/p?\d+', item['source_item']):
                raise ValueError('unexpected source URL')
            page = subprocess.run(['curl', '-fsSL', '--max-time', '25', item['source_item']], check=True, capture_output=True, text=True).stdout
            # Public read cache is reproducible intermediate data, not application code.
            cache.write_text(page)
        return item['item_id'], parse(item, page)
    except Exception as exc:
        return item['item_id'], {'name': item['name'], 'error': str(exc), 'source': item['source_item'], 'checked': '2026-10-11'}

if __name__ == '__main__':
    entries = {}
    # Keep at most ~1.25 requests/s even when individual pages are slow.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index, (key, value) in enumerate(pool.map(read, ITEMS), 1):
            entries[key] = value
            if index % 40 == 0:
                print(f'Checked {index}/{len(ITEMS)}', file=sys.stderr, flush=True)
    snapshot = {'checked': '2026-10-11', 'entries': entries}
    if '--module' in sys.argv:
        if any('error' in value for value in entries.values()):
            raise RuntimeError('Incomplete snapshot; resolve failed public-page reads before publishing')
        overrides = json.loads((ROOT / 'scripts/obtain-guide-overrides.json').read_text())
        for key, guide in overrides.items():
            if key not in entries:
                raise ValueError('Override identity absent from catalog: ' + key)
            entries[key]['guide'] = guide
        print('/* Acquisition reference snapshot; never creates ownership or inventory. */')
        print("(function(root,factory){var data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.FPSObtainGuides=data})(typeof window==='object'?window:this,function(){return " + json.dumps(snapshot, ensure_ascii=False, indent=1) + ';});')
    else:
        print(json.dumps(snapshot, ensure_ascii=False))
