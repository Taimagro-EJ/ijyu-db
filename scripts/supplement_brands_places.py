"""
Google Places API (New) でOSM不足ブランドの店舗データを補完
"""
import os, time, math, requests
from supabase import create_client

GOOGLE_KEY = os.environ['GOOGLE_PLACES_API_KEY']
sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

BRANDS = [
    {'query': 'カルディコーヒーファーム', 'brand_name': 'カルディ'},
    {'query': 'モンベルストア', 'brand_name': 'モンベル'},
    {'query': 'ゼビオスポーツ', 'brand_name': 'ゼビオ'},
]

PREFECTURES = [
    {'name': '北海道', 'lat': 43.06, 'lng': 141.35},
    {'name': '青森県', 'lat': 40.82, 'lng': 140.74},
    {'name': '岩手県', 'lat': 39.70, 'lng': 141.15},
    {'name': '宮城県', 'lat': 38.27, 'lng': 140.87},
    {'name': '秋田県', 'lat': 39.72, 'lng': 140.10},
    {'name': '山形県', 'lat': 38.24, 'lng': 140.36},
    {'name': '福島県', 'lat': 37.75, 'lng': 140.47},
    {'name': '茨城県', 'lat': 36.34, 'lng': 140.45},
    {'name': '栃木県', 'lat': 36.57, 'lng': 139.88},
    {'name': '群馬県', 'lat': 36.39, 'lng': 139.06},
    {'name': '埼玉県', 'lat': 35.86, 'lng': 139.65},
    {'name': '千葉県', 'lat': 35.61, 'lng': 140.12},
    {'name': '東京都', 'lat': 35.69, 'lng': 139.69},
    {'name': '神奈川県', 'lat': 35.45, 'lng': 139.64},
    {'name': '新潟県', 'lat': 37.90, 'lng': 139.02},
    {'name': '富山県', 'lat': 36.70, 'lng': 137.21},
    {'name': '石川県', 'lat': 36.59, 'lng': 136.63},
    {'name': '福井県', 'lat': 36.06, 'lng': 136.22},
    {'name': '山梨県', 'lat': 35.66, 'lng': 138.57},
    {'name': '長野県', 'lat': 36.65, 'lng': 138.18},
    {'name': '岐阜県', 'lat': 35.39, 'lng': 136.72},
    {'name': '静岡県', 'lat': 34.98, 'lng': 138.38},
    {'name': '愛知県', 'lat': 35.18, 'lng': 136.91},
    {'name': '三重県', 'lat': 34.73, 'lng': 136.51},
    {'name': '滋賀県', 'lat': 35.00, 'lng': 135.87},
    {'name': '京都府', 'lat': 35.02, 'lng': 135.76},
    {'name': '大阪府', 'lat': 34.69, 'lng': 135.50},
    {'name': '兵庫県', 'lat': 34.69, 'lng': 135.18},
    {'name': '奈良県', 'lat': 34.69, 'lng': 135.83},
    {'name': '和歌山県', 'lat': 34.23, 'lng': 135.17},
    {'name': '鳥取県', 'lat': 35.50, 'lng': 134.24},
    {'name': '島根県', 'lat': 35.47, 'lng': 133.05},
    {'name': '岡山県', 'lat': 34.66, 'lng': 133.93},
    {'name': '広島県', 'lat': 34.40, 'lng': 132.46},
    {'name': '山口県', 'lat': 34.19, 'lng': 131.47},
    {'name': '徳島県', 'lat': 34.07, 'lng': 134.55},
    {'name': '香川県', 'lat': 34.34, 'lng': 134.04},
    {'name': '愛媛県', 'lat': 33.84, 'lng': 132.77},
    {'name': '高知県', 'lat': 33.56, 'lng': 133.53},
    {'name': '福岡県', 'lat': 33.61, 'lng': 130.42},
    {'name': '佐賀県', 'lat': 33.25, 'lng': 130.30},
    {'name': '長崎県', 'lat': 32.74, 'lng': 129.87},
    {'name': '熊本県', 'lat': 32.79, 'lng': 130.74},
    {'name': '大分県', 'lat': 33.24, 'lng': 131.61},
    {'name': '宮崎県', 'lat': 31.91, 'lng': 131.42},
    {'name': '鹿児島県', 'lat': 31.56, 'lng': 130.56},
    {'name': '沖縄県', 'lat': 26.33, 'lng': 127.80},
]

def search_places(query, lat, lng):
    url = 'https://places.googleapis.com/v1/places:searchText'
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.location',
    }
    body = {
        'textQuery': query,
        'locationBias': {'circle': {'center': {'latitude': lat, 'longitude': lng}, 'radius': 50000.0}},
        'languageCode': 'ja',
        'maxResultCount': 20,
    }
    r = requests.post(url, json=body, headers=headers)
    if r.status_code == 200:
        return r.json().get('places', [])
    print(f"  API ERROR: {r.status_code} {r.text[:100]}")
    return []

def find_nearest_municipality(lat, lng, munis):
    best, best_dist = None, float('inf')
    for m in munis:
        if not m.get('latitude') or not m.get('longitude'):
            continue
        d = math.sqrt((lat - float(m['latitude']))**2 + (lng - float(m['longitude']))**2)
        if d < best_dist:
            best_dist, best = d, m
    return best, best_dist

def main():
    # テスト実行フラグ（長野県のみ）
    test_mode = os.environ.get('TEST_MODE', '0') == '1'
    target_prefs = [p for p in PREFECTURES if p['name'] == '長野県'] if test_mode else PREFECTURES

    print(f"モード: {'テスト（長野県のみ）' if test_mode else 'フル（47都道府県）'}")

    # 全市町村の座標を取得
    munis = sb.table('municipality_overview').select('id,name,prefecture,latitude,longitude').execute().data
    print(f"市町村数: {len(munis)}")

    # 既存データ（brand_nameが設定されているもの）確認
    existing = []
    offset = 0
    while True:
        batch = sb.table('facility_details').select('facility_name,municipality_id').eq('category','mall').range(offset, offset+999).execute().data
        existing.extend(batch)
        if len(batch) < 1000: break
        offset += 1000
    existing_keys = {(r['facility_name'], r['municipality_id']) for r in existing}
    print(f"既存mallデータ: {len(existing_keys)}件")

    total_inserted = 0
    for brand in BRANDS:
        print(f"\n=== {brand['brand_name']} ===")
        brand_inserted = 0
        for pref in target_prefs:
            places = search_places(f"{brand['query']} {pref['name']}", pref['lat'], pref['lng'])
            for place in places:
                name = place.get('displayName', {}).get('text', '')
                loc = place.get('location', {})
                lat = loc.get('latitude')
                lng = loc.get('longitude')
                if not lat or not lng or not name:
                    continue
                muni, dist = find_nearest_municipality(lat, lng, munis)
                if not muni or dist > 0.5:
                    continue
                key = (name, muni['id'])
                if key in existing_keys:
                    continue
                sb.table('facility_details').insert({
                    'municipality_id': muni['id'],
                    'category': 'mall',
                    'facility_name': name,
                    'brand_name': brand['brand_name'],
                    'lat': round(lat, 6),
                    'lng': round(lng, 6),
                    'data_source': 'google_places',
                }).execute()
                existing_keys.add(key)
                brand_inserted += 1
            time.sleep(0.5)
        print(f"  {brand['brand_name']}: {brand_inserted}件投入")
        total_inserted += brand_inserted

    print(f"\n完了: 合計{total_inserted}件投入")

if __name__ == '__main__':
    main()
