"""
Google Routes APIで527市町村→大阪・名古屋・福岡・札幌の所要時間を取得
"""
import os, time, requests
from supabase import create_client

GOOGLE_KEY = os.environ['GOOGLE_PLACES_API_KEY']
sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

DESTINATIONS = {
    'osaka':   '大阪駅',
    'nagoya':  '名古屋駅',
    'fukuoka': '博多駅',
    'sapporo': '札幌駅',
}

def get_route(origin_address, dest_address):
    url = 'https://routes.googleapis.com/directions/v2:computeRoutes'
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
    }
    body = {
        'origin': {'address': origin_address},
        'destination': {'address': dest_address},
        'travelMode': 'DRIVE'
    }
    r = requests.post(url, headers=headers, json=body)
    d = r.json()
    if d.get('routes'):
        route = d['routes'][0]
        mins = int(route['duration'].rstrip('s')) // 60
        km = round(route['distanceMeters'] / 1000, 1)
        return mins, km
    return None, None

def main():
    # 全市町村取得
    munis = sb.table('municipalities').select('id,name,prefecture').execute().data
    print(f"対象: {len(munis)}市町村 × {len(DESTINATIONS)}都市 = {len(munis)*len(DESTINATIONS)}リクエスト")

    # 既存データ確認
    existing = []
    offset = 0
    while True:
        batch = sb.table('stats_access_multi').select('municipality_id,destination').range(offset, offset+999).execute().data
        existing.extend(batch)
        if len(batch) < 1000: break
        offset += 1000
    existing_keys = {(r['municipality_id'], r['destination']) for r in existing}
    print(f"既存: {len(existing_keys)}件 → スキップ")

    total, errors = 0, 0
    for i, muni in enumerate(munis):
        muni_id = muni['id']
        origin = f"{muni['prefecture']}{muni['name']}"
        for dest_key, dest_addr in DESTINATIONS.items():
            if (muni_id, dest_key) in existing_keys:
                continue
            mins, km = get_route(origin, dest_addr)
            if mins is None:
                errors += 1
                continue
            sb.table('stats_access_multi').upsert({
                'municipality_id': muni_id,
                'destination': dest_key,
                'duration_minutes': mins,
                'distance_km': km,
                'transport_mode': 'driving'
            }, on_conflict='municipality_id,destination,transport_mode').execute()
            total += 1
            time.sleep(0.05)  # レート制限対策

        if (i + 1) % 50 == 0:
            print(f"  進捗: {i+1}/{len(munis)}市町村 ({total}件投入, {errors}エラー)")

    print(f"\n完了: {total}件投入, {errors}エラー")

if __name__ == '__main__':
    main()
