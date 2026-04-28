"""
Task 3: 長野県77自治体の施設紐付け整合性チェック
町村施設が市に誤紐付けされていないか調査
"""
import os, json, math
from supabase import create_client
from collections import defaultdict

sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

def log(msg): print(msg)

log("=== Task 3: 長野県施設紐付け分析開始 ===")

# staging から長野県77自治体取得
nagano_all = sb.table('municipalities_staging').select(
    'id,name,kind,prefecture_code'
).eq('prefecture_code', '20').execute().data
log(f"長野県staging: {len(nagano_all)}件")

# 既存municipalitiesに存在する長野県市
existing_ids = {r['id'] for r in sb.table('municipalities').select('id').execute().data}
nagano_existing = [m for m in nagano_all if m['id'] in existing_ids]
nagano_new = [m for m in nagano_all if m['id'] not in existing_ids]
log(f"  既存(市): {len(nagano_existing)}件 / 新規(町村): {len(nagano_new)}件")

# 既存長野県市の施設件数
log("\n=== 既存長野県市の施設件数 ===")
for muni in sorted(nagano_existing, key=lambda x: x['id']):
    r = sb.table('facility_details').select('id', count='exact').eq('municipality_id', muni['id']).execute()
    log(f"  {muni['id']} {muni['name']}: {r.count}件")

# Geoloniaから座標取得
import csv
with open('/Users/eiji/ijyu-db/scripts/municipalities_expansion/raw/latest.csv', encoding='utf-8') as f:
    raw_rows = list(csv.DictReader(f))

import re
def strip_gun(name):
    return re.sub(r'^.+郡', '', name)

# 市区町村コードごとの代表座標（平均）
coord_map = defaultdict(lambda: {'lats': [], 'lngs': []})
for row in raw_rows:
    code = row['市区町村コード']
    try:
        if row['緯度']: coord_map[code]['lats'].append(float(row['緯度']))
        if row['経度']: coord_map[code]['lngs'].append(float(row['経度']))
    except: pass

def get_center(code):
    d = coord_map.get(code, {})
    lats = d.get('lats', [])
    lngs = d.get('lngs', [])
    if lats and lngs:
        return sum(lats)/len(lats), sum(lngs)/len(lngs)
    return None, None

# 新規町村（長野県）の紐付け分析
log("\n=== 長野県新規町村の施設紐付け状況 ===")
results = []

for muni in sorted(nagano_new, key=lambda x: x['id'])[:77]:
    lat, lng = get_center(muni['id'])
    if not lat:
        results.append({
            'target_municipality_id': muni['id'],
            'target_municipality_name': muni['name'],
            'estimated_facility_count': 0,
            'current_bound_to': {},
            'status': 'no_coords',
        })
        continue
    
    # 座標範囲±0.1度（約11km）内の施設を検索
    delta = 0.15
    r = sb.table('facility_details').select(
        'municipality_id,category'
    ).gte('lat', lat-delta).lte('lat', lat+delta).gte('lng', lng-delta).lte('lng', lng+delta).execute()
    
    nearby = r.data
    bound_to = defaultdict(int)
    for f in nearby:
        bound_to[f['municipality_id']] += 1
    
    # 本来のIDに紐付いているものがあるか
    correct = bound_to.get(muni['id'], 0)
    total = sum(bound_to.values())
    
    if total == 0:
        status = 'missing'
    elif correct == 0:
        status = 'mis_bound'
    elif correct < total * 0.5:
        status = 'partial_mis_bound'
    else:
        status = 'ok'
    
    results.append({
        'target_municipality_id': muni['id'],
        'target_municipality_name': muni['name'],
        'estimated_facility_count': total,
        'current_bound_to': dict(bound_to),
        'status': status,
    })

# サマリ
status_counts = defaultdict(int)
for r in results:
    status_counts[r['status']] += 1

log("ステータスサマリ:")
for s, c in sorted(status_counts.items()):
    log(f"  {s}: {c}件")

# 重要3自治体
for name in ['白馬村', '栄村', '阿智村']:
    found = [r for r in results if r['target_municipality_name'] == name]
    if found:
        r = found[0]
        log(f"\n{name}({r['target_municipality_id']}): status={r['status']} 近傍施設{r['estimated_facility_count']}件")
        if r['current_bound_to']:
            top = sorted(r['current_bound_to'].items(), key=lambda x: -x[1])[:3]
            log(f"  紐付き先: {top}")

# DB投入
for res in results:
    res['current_bound_to'] = json.dumps(res['current_bound_to'], ensure_ascii=False)
    sb.table('facility_rebinding_analysis').upsert(res).execute()

log(f"\nfacility_rebinding_analysisに{len(results)}件投入完了")
log("=== Task 3完了 ===")
