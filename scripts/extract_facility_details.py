#!/usr/bin/env python3
"""
extract_facility_details.py
Geofabrik GeoJSONから施設名・座標を抽出してfacility_detailsに投入
"""
import json, os, math, requests
from datetime import date

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

def load_municipalities():
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/municipality_overview",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={'select': 'id,name,latitude,longitude', 'limit': 600})
    return [m for m in resp.json() if m.get('latitude') and m.get('longitude')]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def find_nearest(lat, lng, municipalities, max_km=25):
    best, best_dist = None, max_km
    for m in municipalities:
        d = haversine(lat, lng, float(m['latitude']), float(m['longitude']))
        if d < best_dist:
            best_dist, best = d, m
    return best, best_dist

BRAND_MAP = {
    'スターバックス': 'スターバックス', 'starbucks': 'スターバックス',
    'コメダ': 'コメダ珈琲店', 'タリーズ': 'タリーズコーヒー', "tully": 'タリーズコーヒー',
    'エニタイム': 'エニタイムフィットネス', 'anytime': 'エニタイムフィットネス',
    'chocozap': 'chocoZAP', 'チョコザップ': 'chocoZAP',
    'joyfit': 'JOYFIT', 'ゴールドジム': 'ゴールドジム',
    'tohoシネマズ': 'TOHOシネマズ', 'toho': 'TOHOシネマズ',
    'イオンシネマ': 'イオンシネマ', 'イオンモール': 'イオンモール',
    'ユナイテッドシネマ': 'ユナイテッドシネマ',
}

def detect_brand(name, tags):
    brand = tags.get('brand', '')
    if brand: return brand
    name_lower = (name or '').lower()
    for key, val in BRAND_MAP.items():
        if key in name_lower: return val
    return None

def get_coords(geom):
    coords = geom.get('coordinates', [])
    t = geom.get('type', '')
    if t == 'Point' and len(coords) >= 2:
        return coords[1], coords[0]
    elif t in ('Polygon', 'MultiPolygon'):
        all_c = []
        def flatten(c):
            if isinstance(c[0], (int, float)): all_c.append(c)
            else:
                for item in c: flatten(item)
        flatten(coords)
        if all_c:
            return sum(c[1] for c in all_c)/len(all_c), sum(c[0] for c in all_c)/len(all_c)
    return None, None

def process_geojson(filepath, category, municipalities):
    with open(filepath) as f: data = json.load(f)
    results = []
    for feat in data.get('features', []):
        props = feat.get('properties', {})
        lat, lng = get_coords(feat.get('geometry', {}))
        if lat is None: continue
        name = props.get('name') or props.get('brand', '')
        if not name: continue
        muni, dist = find_nearest(lat, lng, municipalities)
        if not muni: continue
        results.append({
            'municipality_id': muni['id'],
            'category': category,
            'facility_name': name,
            'brand_name': detect_brand(name, props),
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'distance_from_center_km': round(dist, 1),
            'is_24h': props.get('opening_hours') == '24/7',
            'data_source': 'geofabrik',
            'collected_at': str(date.today()),
        })
    return results

def upsert_batch(rows):
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/facility_details", headers=HEADERS, json=batch)
        print(f"  {'✅' if r.status_code in (200,201) else '❌'} {i+len(batch)}件 ({r.status_code})")

def main():
    print("📍 施設詳細データ抽出・投入")
    municipalities = load_municipalities()
    print(f"  市町村数: {len(municipalities)}")

    FILES = [
        ('data/cafes.geojson', 'cafe'),
        ('data/supermarkets.geojson', 'supermarket'),
        ('data/convenience.geojson', 'convenience'),
        ('data/hospitals.geojson', 'hospital'),
        ('data/clinics.geojson', 'clinic'),
        ('data/onsen.geojson', 'onsen'),
        ('data/gyms.geojson', 'gym'),
        ('data/cinemas.geojson', 'cinema'),
        ('data/malls.geojson', 'mall'),
    ]
    total = 0
    for filepath, category in FILES:
        full_path = os.path.expanduser(f'~/ijyu-db/{filepath}')
        if not os.path.exists(full_path):
            print(f"  ⚠️ {filepath} が見つかりません。スキップ。"); continue
        print(f"\n📂 {category}")
        rows = process_geojson(full_path, category, municipalities)
        print(f"  → {len(rows)}件抽出")
        if rows: upsert_batch(rows); total += len(rows)

    print(f"\n✅ 合計 {total}件投入完了")

if __name__ == '__main__':
    main()
