#!/usr/bin/env python3
"""
collect_lifestyle_v2.py — Geofabrik一括ダウンロード方式
japan-latest.osm.pbf → osmium filter → GeoJSON → 距離計算 → Supabase upsert
処理時間: 約10分（Overpass版の67時間から劇的改善）
"""

import json
import math
import os
import subprocess
import requests
from collections import defaultdict
from datetime import date

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wedxzvhdheitoyenjnmo.supabase.co").strip().strip('"').strip("'")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip().strip('"').strip("'")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# ブランドTier辞書（brand_tiers_v1.jsonを参照）
BRAND_TIERS = {
    'mall': {
        'S': ['三井アウトレットパーク', 'ららぽーと', 'IKEA', 'イケア', 'コストコ', 'Costco'],
        'A': ['イオンモール', 'アリオ', 'ゆめタウン', 'パルコ', 'PARCO'],
        'B': ['イオン', 'イトーヨーカドー', 'アピタ', 'ピアゴ'],
    },
    'gym': {
        'S': ['ゴールドジム', "GOLD'S GYM"],
        'A': ['エニタイムフィットネス', 'Anytime Fitness'],
        'B': ['chocoZAP', 'チョコザップ', 'カーブス', 'ティップネス'],
        'Trend': ['BEYOND', 'ビヨンド'],
    },
    'cafe': {
        'S': ['スターバックス', 'Starbucks'],
        'A': ['コメダ珈琲', 'タリーズ', "Tully's"],
        'B': ['ドトール', 'サンマルク', 'エクセルシオール'],
    },
    'cinema': {
        'S': ['TOHOシネマズ', '109シネマズ'],
        'A': ['イオンシネマ', 'ユナイテッド・シネマ'],
        'B': ['シネプレックス', 'フォーラム'],
    },
    'supermarket': {
        'S': ['成城石井', '紀伊國屋', '明治屋'],
        'A': ['イオン', 'ライフ', 'サミット', '西友', 'ヨークマート'],
        'B': ['業務スーパー', 'ドン・キホーテ', 'ロピア'],
    },
}

# カテゴリ別ルール（タグマッチ + 検索半径）
CATEGORY_RULES = {
    'mall': {
        'match': lambda t: t.get('shop') in ('mall', 'department_store') or
                           any(b in (t.get('brand','') + t.get('name',''))
                               for b in ['イオンモール','ららぽーと','アリオ','ゆめタウン','パルコ','PARCO','コストコ','IKEA','イケア','三井アウトレット']),
        'radius_km': 30,
    },
    'gym': {
        'match': lambda t: t.get('leisure') == 'fitness_centre',
        'radius_km': 10,
    },
    'cafe': {
        'match': lambda t: t.get('amenity') == 'cafe',
        'radius_km': 5,
    },
    'cinema': {
        'match': lambda t: t.get('amenity') == 'cinema',
        'radius_km': 30,
    },
    'supermarket': {
        'match': lambda t: t.get('shop') == 'supermarket',
        'radius_km': 5,
    },
    'convenience_store': {
        'match': lambda t: t.get('shop') == 'convenience',
        'radius_km': 3,
    },
    'drugstore': {
        'match': lambda t: t.get('shop') == 'chemist',
        'radius_km': 5,
    },
    'home_center': {
        'match': lambda t: t.get('shop') == 'doityourself',
        'radius_km': 10,
    },
    'restaurant_family': {
        'match': lambda t: t.get('amenity') in ('restaurant', 'fast_food') and
                           any(b in (t.get('brand','') + t.get('name',''))
                               for b in ['ガスト','サイゼリヤ','デニーズ','ジョナサン','バーミヤン','ロイヤルホスト']),
        'radius_km': 5,
    },
    'restaurant_sushi': {
        'match': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                               for b in ['スシロー','くら寿司','はま寿司','かっぱ寿司']),
        'radius_km': 10,
    },
    'restaurant_gyudon': {
        'match': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                               for b in ['吉野家','すき家','松屋']),
        'radius_km': 5,
    },
}

# ブランド個別カウント
BRAND_COUNTS = {
    'cafe_starbucks': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                                    for b in ['スターバックス','Starbucks']),
    'cafe_komeda': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                                 for b in ['コメダ','Komeda']),
    'cafe_tullys': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                                 for b in ['タリーズ',"Tully's"]),
    'gym_has_anytime': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                                     for b in ['エニタイム','Anytime']),
    'gym_has_chocozap': lambda t: any(b in (t.get('brand','') + t.get('name',''))
                                      for b in ['chocoZAP','チョコザップ']),
    'cinema_has_imax': lambda t: 'IMAX' in (t.get('name','') + t.get('description','')),
}


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def classify_brand_tier(name, brand, category):
    search_str = f"{name or ''} {brand or ''}"
    for tier_name in ['S', 'A', 'B', 'C', 'Trend']:
        for kw in BRAND_TIERS.get(category, {}).get(tier_name, []):
            if kw in search_str:
                return tier_name
    return None


def download_and_filter():
    print("📥 japan-latest.osm.pbf をダウンロード中... (約2.2GB、3〜5分)")
    subprocess.run([
        'wget', '-q', '--show-progress',
        'https://download.geofabrik.de/asia/japan-latest.osm.pbf',
        '-O', '/tmp/japan.osm.pbf'
    ], check=True)

    print("🔍 osmium で施設データを抽出中...")
    filter_tags = []
    for prefix in ['n', 'w']:
        filter_tags.extend([
            f'{prefix}/amenity=cinema',
            f'{prefix}/amenity=cafe',
            f'{prefix}/amenity=restaurant',
            f'{prefix}/amenity=fast_food',
            f'{prefix}/shop=supermarket',
            f'{prefix}/shop=convenience',
            f'{prefix}/shop=mall',
            f'{prefix}/shop=department_store',
            f'{prefix}/shop=doityourself',
            f'{prefix}/shop=chemist',
            f'{prefix}/leisure=fitness_centre',
        ])

    subprocess.run([
        'osmium', 'tags-filter', '/tmp/japan.osm.pbf',
        *filter_tags,
        '-o', '/tmp/japan-facilities.osm.pbf', '--overwrite'
    ], check=True)

    print("📄 GeoJSON に変換中...")
    subprocess.run([
        'osmium', 'export', '/tmp/japan-facilities.osm.pbf',
        '-o', '/tmp/japan-facilities.geojson', '-f', 'geojson', '--overwrite'
    ], check=True)


def load_facilities():
    print("📂 GeoJSON を読み込み中...")
    facilities = []
    with open('/tmp/japan-facilities.geojson') as f:
        data = json.load(f)

    for feature in data.get('features', []):
        props = feature.get('properties', {})
        geom = feature.get('geometry', {})
        coords = geom.get('coordinates')
        if not coords:
            continue

        if geom['type'] == 'Point':
            lon, lat = coords[0], coords[1]
        elif geom['type'] in ('Polygon', 'MultiPolygon'):
            ring = coords[0] if geom['type'] == 'Polygon' else coords[0][0]
            lon = sum(c[0] for c in ring) / len(ring)
            lat = sum(c[1] for c in ring) / len(ring)
        else:
            continue

        facilities.append({'lat': lat, 'lon': lon, 'tags': props,
                           'name': props.get('name', ''), 'brand': props.get('brand', '')})

    print(f"  施設数: {len(facilities):,}件")
    return facilities


def fetch_municipalities():
    """stats_access_v2から座標付き市町村を取得"""
    print("🗾 市町村データを取得中...")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/stats_access_v2",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={'select': 'municipality_id,latitude,longitude', 'latitude': 'not.is.null', 'limit': 600}
    )
    resp.raise_for_status()
    access = {r['municipality_id']: r for r in resp.json()}

    resp2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipalities",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={'select': 'id,name', 'limit': 600}
    )
    name_map = {r['id']: r['name'] for r in resp2.json()}

    result = []
    for mid, a in access.items():
        result.append({
            'id': mid,
            'name': name_map.get(mid, mid),
            'lat': float(a['latitude']),
            'lon': float(a['longitude']),
        })

    print(f"  市町村数: {len(result)}件")
    return result


def count_facilities(municipalities, facilities):
    print("📊 施設数を集計中... (約1〜2分)")
    results = {}
    total = len(municipalities)

    for i, m in enumerate(municipalities):
        mid = m['id']
        mlat, mlon = m['lat'], m['lon']

        row = {
            'municipality_id': mid,
            'mall_count': 0, 'mall_best_tier': None, 'mall_best_name': None,
            'gym_count': 0, 'gym_24h_count': 0, 'gym_best_tier': None, 'gym_has_anytime': False, 'gym_has_chocozap': False,
            'cafe_count': 0, 'cafe_starbucks': 0, 'cafe_komeda': 0, 'cafe_tullys': 0,
            'cinema_count': 0, 'cinema_has_imax': False, 'cinema_best_tier': None,
            'supermarket_count': 0, 'supermarket_premium_count': 0, 'supermarket_budget_count': 0,
            'drugstore_count': 0,
            'homecenter_count': 0,
            'restaurant_chain_count': 0, 'restaurant_family_count': 0,
            'restaurant_sushi_count': 0, 'restaurant_gyudon_count': 0,
            'overpass_collected_at': str(date.today()),
        }

        # 最大半径30kmの施設だけ事前フィルター（高速化）
        nearby = [f for f in facilities if haversine_km(mlat, mlon, f['lat'], f['lon']) <= 30]

        for f in nearby:
            tags = f['tags']
            name = f['name']
            brand = f['brand']
            dist = haversine_km(mlat, mlon, f['lat'], f['lon'])

            # モール
            if CATEGORY_RULES['mall']['match'](tags) and dist <= 30:
                row['mall_count'] += 1
                tier = classify_brand_tier(name, brand, 'mall')
                if tier and (row['mall_best_tier'] is None or
                             ['S','A','B','C'].index(tier) < ['S','A','B','C'].index(row['mall_best_tier'] or 'C')):
                    row['mall_best_tier'] = tier
                    row['mall_best_name'] = name

            # ジム
            if CATEGORY_RULES['gym']['match'](tags) and dist <= 10:
                row['gym_count'] += 1
                if any(b in (name+brand) for b in ['エニタイム','Anytime']):
                    row['gym_has_anytime'] = True
                    row['gym_24h_count'] += 1
                if any(b in (name+brand) for b in ['chocoZAP','チョコザップ']):
                    row['gym_has_chocozap'] = True
                    row['gym_24h_count'] += 1

            # カフェ
            if CATEGORY_RULES['cafe']['match'](tags) and dist <= 5:
                row['cafe_count'] += 1
                if any(b in (name+brand) for b in ['スターバックス','Starbucks']): row['cafe_starbucks'] += 1
                if any(b in (name+brand) for b in ['コメダ','Komeda']): row['cafe_komeda'] += 1
                if any(b in (name+brand) for b in ['タリーズ',"Tully's"]): row['cafe_tullys'] += 1

            # 映画館
            if CATEGORY_RULES['cinema']['match'](tags) and dist <= 30:
                row['cinema_count'] += 1
                if 'IMAX' in name: row['cinema_has_imax'] = True

            # スーパー
            if CATEGORY_RULES['supermarket']['match'](tags) and dist <= 5:
                row['supermarket_count'] += 1
                if any(b in (name+brand) for b in ['成城石井','紀伊國屋','明治屋']):
                    row['supermarket_premium_count'] += 1
                elif any(b in (name+brand) for b in ['業務スーパー','ドン・キホーテ','ロピア']):
                    row['supermarket_budget_count'] += 1

            # ドラッグストア
            if CATEGORY_RULES['drugstore']['match'](tags) and dist <= 5:
                row['drugstore_count'] += 1

            # ホームセンター
            if CATEGORY_RULES['home_center']['match'](tags) and dist <= 10:
                row['homecenter_count'] += 1

            # 飲食
            if dist <= 5:
                if CATEGORY_RULES['restaurant_family']['match'](tags):
                    row['restaurant_family_count'] += 1
                    row['restaurant_chain_count'] += 1
                if CATEGORY_RULES['restaurant_sushi']['match'](tags):
                    row['restaurant_sushi_count'] += 1
                    row['restaurant_chain_count'] += 1
                if CATEGORY_RULES['restaurant_gyudon']['match'](tags):
                    row['restaurant_gyudon_count'] += 1
                    row['restaurant_chain_count'] += 1

        results[mid] = row

        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{total} 完了")

    return results


def upsert_to_supabase(results):
    rows = list(results.values())
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/stats_lifestyle",
            headers=HEADERS, json=batch
        )
        if resp.status_code not in (200, 201):
            print(f"  ⚠️ upsertエラー: {resp.status_code} {resp.text[:200]}")
        else:
            print(f"  ✅ {i+len(batch)}件 upsert完了")


def main():
    print("=" * 50)
    print("collect_lifestyle_v2.py — Geofabrik方式")
    print("=" * 50)

    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY が未設定")
        return

    # Step 1: ダウンロード & フィルタリング
    download_and_filter()

    # Step 2: 施設データ読み込み
    facilities = load_facilities()

    # Step 3: 市町村データ取得
    municipalities = fetch_municipalities()

    # Step 4: 距離計算 & 集計
    results = count_facilities(municipalities, facilities)

    # Step 5: Supabase upsert
    print(f"\n📤 stats_lifestyle へ {len(results)}件 upsert中...")
    upsert_to_supabase(results)

    # サマリー
    print("\n🏆 松本市のサマリー:")
    for mid, row in results.items():
        if 'matsumoto' in mid or mid == '20202':
            for k, v in row.items():
                if k != 'municipality_id' and v:
                    print(f"  {k}: {v}")
            break

    print(f"\n✅ 完了！ {len(results)}件処理")


if __name__ == '__main__':
    main()
