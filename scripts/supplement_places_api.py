#!/usr/bin/env python3
"""
Google Places APIで施設名を正式名称に更新
対象: 6文字以下 or brand_name一致の施設
順序: gym → mall → cinema
1日2,000件制限
"""
import os, time, requests
from datetime import date

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
GOOGLE_API_KEY = os.environ['GOOGLE_PLACES_API_KEY']

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

DAILY_LIMIT = 2000
REQUEST_DELAY = 0.15  # 150ms間隔

def get_targets(category, limit=2000):
    """正式名称が必要な施設を取得"""
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/facility_details',
        headers=HEADERS,
        params={
            'category': f'eq.{category}',
            'select': 'id,facility_name,brand_name,lat,lng,municipality_id',
            'limit': limit,
            'order': 'id.asc',
        }
    )
    data = resp.json()
    # 6文字以下 or brand_nameと同じものだけ対象
    targets = [
        d for d in data
        if len(d.get('facility_name') or '') <= 6
        or d.get('facility_name') == d.get('brand_name')
    ]
    return targets

def search_place(name, lat, lng):
    """Google Places Text Searchで正式名称を取得"""
    url = 'https://places.googleapis.com/v1/places:searchText'
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.location',
    }
    body = {
        'textQuery': name,
        'locationBias': {
            'circle': {
                'center': {'latitude': lat, 'longitude': lng},
                'radius': 3000,
            }
        },
        'languageCode': 'ja',
        'maxResultCount': 1,
    }
    resp = requests.post(url, headers=headers, json=body)
    if resp.ok:
        places = resp.json().get('places', [])
        if places:
            return places[0].get('displayName', {}).get('text')
    return None

def update_facility_name(facility_id, new_name):
    """facility_detailsの名前を更新"""
    resp = requests.patch(
        f'{SUPABASE_URL}/rest/v1/facility_details',
        headers={**HEADERS, 'Prefer': 'return=minimal'},
        params={'id': f'eq.{facility_id}'},
        json={'facility_name': new_name},
    )
    return resp.status_code == 204

def run(category):
    print(f'\n=== {category} ===')
    targets = get_targets(category)
    print(f'対象: {len(targets)}件')

    updated = 0
    skipped = 0
    count = 0

    for f in targets:
        if count >= DAILY_LIMIT:
            print(f'日次上限{DAILY_LIMIT}件に到達。明日再実行してください。')
            break

        new_name = search_place(f['facility_name'], f['lat'], f['lng'])
        count += 1

        if new_name and new_name != f['facility_name']:
            if update_facility_name(f['id'], new_name):
                print(f'  ✅ {f["facility_name"]} → {new_name}')
                updated += 1
            else:
                print(f'  ❌ 更新失敗: {f["facility_name"]}')
        else:
            skipped += 1

        time.sleep(REQUEST_DELAY)

    print(f'\n結果: 更新{updated}件 / スキップ{skipped}件 / 合計{count}件')
    return count

if __name__ == '__main__':
    import sys
    category = sys.argv[1] if len(sys.argv) > 1 else 'gym'
    run(category)
