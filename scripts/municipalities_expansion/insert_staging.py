"""
Task 1続き: CSVから市区町村単位に集約してstaging投入
"""
import os, csv, io, re
from supabase import create_client
from collections import defaultdict

sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

def log(msg):
    print(msg)

log("=== Task 1-B: staging投入開始 ===")

# CSV読み込み
with open('/Users/eiji/ijyu-db/scripts/municipalities_expansion/raw/latest.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

log(f"総行数: {len(rows)}")

# 市区町村コード単位で集約（緯度経度は平均）
munis = defaultdict(lambda: {'lats': [], 'lngs': [], 'name': '', 'pref_code': '', 'pref_name': '', 'kana': ''})
for row in rows:
    code = row['市区町村コード']
    if not code or len(code) != 5:
        continue
    m = munis[code]
    m['name'] = row['市区町村名']
    m['pref_code'] = row['都道府県コード']
    m['pref_name'] = row['都道府県名']
    m['kana'] = row['市区町村名カナ']
    try:
        if row['緯度']: m['lats'].append(float(row['緯度']))
        if row['経度']: m['lngs'].append(float(row['経度']))
    except:
        pass

log(f"ユニーク市区町村コード数: {len(munis)}")

# 種別判定
def get_kind(name, code):
    if code[2:] == '00':  # 政令指定都市の市本体
        return '市'
    # 行政区（政令指定都市の区）は除外
    if re.search(r'[区]$', name) and not name.endswith('区町') and not name.endswith('区村'):
        # 特別区（東京23区）はOK、政令市の行政区はNG
        pref_code = code[:2]
        city_code = code[2:5]
        # 政令指定都市コードリスト（市コード01-10）
        if city_code != '100':  # 区単独コード
            return None  # 政令市行政区は除外
    if re.search(r'市$', name): return '市'
    if re.search(r'町$', name): return '町'
    if re.search(r'村$', name): return '村'
    if re.search(r'区$', name): return '特別区'
    return 'その他'

# 除外対象（北方領土・政令市行政区）
# 政令指定都市の行政区コードパターン: 下3桁が1xx（101-115等）
SEIREI_PARENT_CODES = {
    '01100','04100','11100','12100','13100','13200',
    '14100','15100','22100','26100','27100','28100',
    '33100','40100','43100'
}

records = []
skipped_ku = 0
skipped_other = 0

for code, m in munis.items():
    name = m['name']
    pref_code = m['pref_code']
    
    # 政令市の行政区を除外（例: 01101=札幌市中央区）
    parent = code[:3] + '00'
    if parent in SEIREI_PARENT_CODES and re.search(r'[区]$', name):
        skipped_ku += 1
        continue
    
    # 北方領土除外（01695〜01700等）
    if code.startswith('01') and int(code) >= 1695:
        skipped_other += 1
        continue
    
    kind = get_kind(name, code)
    if kind is None:
        skipped_ku += 1
        continue
    
    lat = sum(m['lats']) / len(m['lats']) if m['lats'] else None
    lng = sum(m['lngs']) / len(m['lngs']) if m['lngs'] else None
    
    records.append({
        'id': code,
        'prefecture_code': pref_code,
        'prefecture_name': m['pref_name'],
        'name': name,
        'kind': kind,
        'kana': m['kana'],
        'raw_source': 'geolonia_latest_csv',
    })

log(f"投入対象: {len(records)}件")
log(f"スキップ(行政区): {skipped_ku}件, スキップ(その他): {skipped_other}件")

# 長野県確認
nagano = [r for r in records if r['prefecture_code'] == '20']
log(f"長野県: {len(nagano)}件")
for m in nagano[:5]:
    log(f"  {m['id']} {m['name']} ({m['kind']})")

# staging投入（100件ずつ）
inserted = 0
for i in range(0, len(records), 100):
    batch = records[i:i+100]
    try:
        sb.table('municipalities_staging').upsert(batch).execute()
        inserted += len(batch)
    except Exception as e:
        log(f"  ERROR batch {i}: {e}")

log(f"\n投入完了: {inserted}件")

# 差分サマリ
existing = sb.table('municipalities').select('id').execute().data
existing_ids = {r['id'] for r in existing}

by_kind = {}
new_count = 0
for r in records:
    k = r['kind']
    by_kind[k] = by_kind.get(k, {'total': 0, 'existing': 0, 'new': 0})
    by_kind[k]['total'] += 1
    if r['id'] in existing_ids:
        by_kind[k]['existing'] += 1
    else:
        by_kind[k]['new'] += 1
        new_count += 1

log(f"\n=== 差分サマリ ===")
for kind, cnt in sorted(by_kind.items()):
    log(f"  {kind}: 計{cnt['total']} / 既存{cnt['existing']} / 新規{cnt['new']}")
log(f"  新規追加対象合計: {new_count}件")

# 長野県77件確認
log(f"\n=== 長野県内訳 ===")
nagano_by_kind = {}
for m in nagano:
    nagano_by_kind[m['kind']] = nagano_by_kind.get(m['kind'], 0) + 1
for k, v in sorted(nagano_by_kind.items()):
    log(f"  {k}: {v}件")

# 重要3自治体確認
targets = ['白馬村', '栄村', '阿智村']
for t in targets:
    found = [m for m in nagano if m['name'] == t]
    log(f"  {t}: {'✅ ' + found[0]['id'] if found else '❌ 未発見'}")

