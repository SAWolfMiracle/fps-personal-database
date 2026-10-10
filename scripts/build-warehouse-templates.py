"""Rebuild local descriptors from catalog public icon URLs (Pillow + Node required)."""
import base64, concurrent.futures, json, pathlib, subprocess, tempfile, urllib.request
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / 'collection-catalog.json').read_text())
with tempfile.TemporaryDirectory(prefix='fps-warehouse-') as directory:
    cache = pathlib.Path(directory)
    def fetch(item):
        if not item.get('object_id') or not item.get('image', '').startswith('https://playerhub.df.qq.com/'):
            return None
        path = cache / (item['item_id'].replace(':', '-') + '.png')
        try:
            path.write_bytes(urllib.request.urlopen(item['image'], timeout=30).read())
            image = Image.open(path).convert('RGBA')
            return [dict(item_id=item['item_id'], pixels=base64.b64encode(image.rotate(angle, expand=True).resize((96, 96)).tobytes()).decode()) for angle in (0, 90, 180, 270)]
        except Exception as error:
            print('Skipped', item['name'], str(error))
            return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        rows = [row for group in pool.map(fetch, catalog['items']) if group for row in group]
    payload = cache / 'pixels.json'
    payload.write_text(json.dumps(rows))
    subprocess.run(['node', '-e', '''const fs=require('fs'),api=require('./warehouse-import.js'),rows=JSON.parse(fs.readFileSync(process.argv[1]));const items=rows.map(r=>({item_id:r.item_id,feature:api.descriptor(Buffer.from(r.pixels,'base64'),96,96)})).filter(r=>r.feature).map(r=>({item_id:r.item_id,feature:Buffer.from(r.feature).toString('base64')}));fs.writeFileSync('warehouse-templates.json',JSON.stringify({version:1,method:'foreground-color-edge-v1-rotations',items}));console.log('Views:',items.length);''', str(payload)], cwd=ROOT, check=True)
