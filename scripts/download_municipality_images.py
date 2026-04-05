#!/usr/bin/env python3
"""
Wikimedia画像を一括ダウンロード → WebPリサイズ → public/images/municipalities/ に保存
"""
import os, requests, time
from PIL import Image
from io import BytesIO

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

def get_municipalities():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipality_overview",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
        params={'select': 'id,slug,image_url', 'limit': '600'}
    )
    return [m for m in resp.json() if m.get('image_url') and m.get('slug')]

def download_and_resize(url, output_path, max_width=800, quality=75):
    try:
        resp = requests.get(url, timeout=30, headers={
            'User-Agent': 'ijyu-data.com/1.0 (migration; contact@ijyu-data.com)'
        })
        if resp.status_code != 200:
            print(f"  ⚠️ HTTP {resp.status_code}")
            return False
        img = Image.open(BytesIO(resp.content))
        if img.width > max_width:
            ratio = max_width / img.width
            img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        img.save(output_path, 'WebP', quality=quality)
        return True
    except Exception as e:
        print(f"  ⚠️ {e}")
        return False

def update_image_url(municipality_id, new_url):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/municipalities",
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        params={'id': f'eq.{municipality_id}'},
        json={'image_url': new_url}
    )

def main():
    municipalities = get_municipalities()
    output_dir = os.path.expanduser('~/ijyu-db/public/images/municipalities')
    os.makedirs(output_dir, exist_ok=True)
    print(f'対象: {len(municipalities)}件')

    success = fail = skip = 0
    for i, m in enumerate(municipalities):
        slug = m['slug']
        url = m['image_url']
        output_path = os.path.join(output_dir, f"{slug}.webp")

        if os.path.exists(output_path):
            skip += 1
            continue

        print(f"[{i+1}/{len(municipalities)}] {slug}")
        if download_and_resize(url, output_path):
            new_url = f"/images/municipalities/{slug}.webp"
            update_image_url(m['id'], new_url)
            success += 1
        else:
            fail += 1
        time.sleep(0.5)

    print(f"\n✅ 完了: 成功{success} / 失敗{fail} / スキップ{skip}")

if __name__ == '__main__':
    main()
