import os, sys, json, time, requests
from collections import defaultdict
from supabase import create_client

sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
SUPA_URL = os.environ['SUPABASE_URL']
SUPA_KEY = os.environ['SUPABASE_SERVICE_KEY']
h = {'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY}

last_call = [0.0]

def gsi_reverse_geocode(lat, lng):
    elapsed = time.time() - last_call[0]
    if elapsed < 0.3:
        time.sleep(0.3 - elapsed)
    try:
        r = requests.get('https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress',
            params={'lat': lat, 'lon': lng}, timeout=5)
        last_call[0] = time.time()
        if r.status_code == 200:
            return r.json().get('results', {}).get('muniCd')
    except Exception:
        last_call[0] = time.time()
    return None

def process_batch(facilities, all_munis, dry_run=True):
    stats = defaultdict(int)
    logs = []
    updates = []
    for fd in facilities:
        if not fd.get('lat') or not fd.get('lng'):
            stats['skip_no_coord'] += 1
            continue
        new_id = gsi_reverse_geocode(round(float(fd['lat']), 4), round(float(fd['lng']), 4))
        if not new_id:
            stats['api_fail'] += 1
            logs.append({'facility_id': fd['id'], 'old_id': fd['municipality_id'], 'new_id': None, 'status': 'api_fail'})
            continue
        if new_id not in all_munis:
            stats['not_in_prod'] += 1
            logs.append({'facility_id': fd['id'], 'old_id': fd['municipality_id'], 'new_id': new_id, 'status': 'not_in_prod'})
            continue
        if new_id == fd['municipality_id']:
            stats['unchanged'] += 1
            logs.append({'facility_id': fd['id'], 'old_id': fd['municipality_id'], 'new_id': new_id, 'status': 'ok_nochange'})
            continue
        stats['updated'] += 1
        updates.append({'id': fd['id'], 'municipality_id': new_id})
        logs.append({'facility_id': fd['id'], 'old_id': fd['municipality_id'], 'new_id': new_id, 'status': 'ok_update'})
    if not dry_run:
        for i in range(0, len(logs), 100):
            sb.table('facility_rebind_log').upsert(logs[i:i+100]).execute()
        for u in updates:
            sb.table('facility_details').update({'municipality_id': u['municipality_id']}).eq('id', u['id']).execute()
    return stats

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'dry'
    dry_run = (mode != 'commit')
    print('モード:', 'ドライラン' if dry_run else '本番commit')

    # 本番municipalities一覧
    all_munis = set()
    offset = 0
    while True:
        r = requests.get(f'{SUPA_URL}/rest/v1/municipalities', headers=h, params={'select': 'id', 'limit': 1000, 'offset': offset})
        batch = r.json()
        all_munis.update(x['id'] for x in batch)
        if len(batch) < 1000: break
        offset += 1000
    print('本番自治体数:', len(all_munis))

    # 処理済みIDをresume用に取得
    processed_ids = set()
    if not dry_run:
        offset = 0
        while True:
            r = sb.table('facility_rebind_log').select('facility_id').range(offset, offset+999).execute()
            processed_ids.update(x['facility_id'] for x in r.data)
            if len(r.data) < 1000: break
            offset += 1000
        print('既処理済:', len(processed_ids), '件')

    # 全facility_detailsをページネーション取得
    all_fac = []
    offset = 0
    while True:
        r = requests.get(f'{SUPA_URL}/rest/v1/facility_details', headers=h,
            params={'select': 'id,municipality_id,lat,lng', 'lat': 'not.is.null', 'limit': 1000, 'offset': offset})
        batch = r.json()
        all_fac.extend(batch)
        if len(batch) < 1000: break
        offset += 1000
        if offset % 10000 == 0:
            print(f'  取得中... {offset}件')

    remaining = [f for f in all_fac if f['id'] not in processed_ids]
    print('全件:', len(all_fac), '残り:', len(remaining))

    if dry_run:
        sample = remaining[:100]
        print('ドライラン: 最初の100件で確認')
        stats = process_batch(sample, all_munis, dry_run=True)
        print('結果:', dict(stats))
        return

    BATCH = 500
    total_stats = defaultdict(int)
    start = time.time()
    for i in range(0, len(remaining), BATCH):
        batch = remaining[i:i+BATCH]
        stats = process_batch(batch, all_munis, dry_run=False)
        for k, v in stats.items():
            total_stats[k] += v
        elapsed = time.time() - start
        done = i + len(batch)
        rate = done / elapsed if elapsed > 0 else 0
        eta = (len(remaining) - done) / rate / 60 if rate > 0 else 0
        print(f'[{done}/{len(remaining)}] updated={total_stats["updated"]} unchanged={total_stats["unchanged"]} api_fail={total_stats["api_fail"]} rate={rate:.1f}/s ETA={eta:.1f}分')

    print('=== 完了 ===')
    print(json.dumps(dict(total_stats), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()