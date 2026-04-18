import requests, os, csv
from collections import defaultdict

SUPA_URL = os.environ['SUPABASE_URL']
SUPA_KEY = os.environ['SUPABASE_SERVICE_KEY']
h_base = {'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY}
h_post = {**h_base, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'}

BLOCK_B_PREFS = {'13','04','19','03','06','10','02','08','12','11','07'}
PREF_ROMA = {'13':'tokyo','04':'miyagi','19':'yamanashi','03':'iwate','06':'yamagata',
             '10':'gunma','02':'aomori','08':'ibaraki','12':'chiba','11':'saitama','07':'fukushima'}
PREF_REGION = {'13':'関東','04':'東北','19':'中部','03':'東北','06':'東北',
               '10':'関東','02':'東北','08':'関東','12':'関東','11':'関東','07':'東北'}

KANA = {'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o','カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
        'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so','タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
        'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no','ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
        'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo','ヤ':'ya','ユ':'yu','ヨ':'yo',
        'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro','ワ':'wa','ン':'n',
        'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go','ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
        'ダ':'da','デ':'de','ド':'do','バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
        'パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po','ッ':'t','ー':'-'}

def k2r(kana):
    r = ''
    i = 0
    while i < len(kana):
        if i+1 < len(kana) and kana[i:i+2] in KANA:
            r += KANA[kana[i:i+2]]; i += 2
        elif kana[i] in KANA:
            r += KANA[kana[i]]; i += 1
        else:
            i += 1
    return r

with open('/Users/eiji/ijyu-db/scripts/municipalities_expansion/raw/latest.csv', encoding='utf-8') as f:
    raw_rows = list(csv.DictReader(f))
coord_map = defaultdict(lambda: {'lats': [], 'lngs': []})
for row in raw_rows:
    code = row['市区町村コード']
    try:
        if row['緯度']: coord_map[code]['lats'].append(float(row['緯度']))
        if row['経度']: coord_map[code]['lngs'].append(float(row['経度']))
    except: pass

prod_ids = set()
offset = 0
while True:
    r = requests.get(f'{SUPA_URL}/rest/v1/municipalities', headers=h_base, params={'select':'id','limit':1000,'offset':offset})
    batch = r.json()
    prod_ids.update(x['id'] for x in batch)
    if len(batch) < 1000: break
    offset += 1000

existing_slugs = set()
offset = 0
while True:
    r = requests.get(f'{SUPA_URL}/rest/v1/municipalities', headers=h_base, params={'select':'slug','limit':1000,'offset':offset})
    batch = r.json()
    existing_slugs.update(x['slug'] for x in batch if x.get('slug'))
    if len(batch) < 1000: break
    offset += 1000

staging = []
offset = 0
while True:
    r = requests.get(f'{SUPA_URL}/rest/v1/municipalities_staging', headers=h_base, params={'select':'id,name,kind,kana,prefecture_code,prefecture_name','limit':1000,'offset':offset})
    batch = r.json()
    staging.extend(batch)
    if len(batch) < 1000: break
    offset += 1000

new_records = []
for m in staging:
    if m['id'] in prod_ids: continue
    if m['prefecture_code'] not in BLOCK_B_PREFS: continue
    pref_roma = PREF_ROMA.get(m['prefecture_code'], 'japan')
    region = PREF_REGION.get(m['prefecture_code'], '関東')
    name_roma = k2r(m.get('kana',''))
    name = m['name']
    if name.endswith('市'): sfx = 'shi'
    elif name.endswith('町'): sfx = 'machi'
    elif name.endswith('村'): sfx = 'mura'
    elif name.endswith('区'): sfx = 'ku'
    else: sfx = ''
    base = name_roma + sfx if sfx and not name_roma.endswith(sfx) else name_roma
    slug = pref_roma + '-' + base
    if slug in existing_slugs: slug = slug + '-' + m['id']
    existing_slugs.add(slug)
    new_records.append({
        'id': m['id'], 'name': name, 'name_kana': m.get('kana',''),
        'prefecture': m['prefecture_name'], 'prefecture_code': m['prefecture_code'],
        'region': region, 'slug': slug, 'is_featured': False
    })

print('ブロックB投入対象:', len(new_records), '件')
for r in new_records[:3]:
    print(' ', r['id'], r['name'], '->', r['slug'])

errors = 0
for i in range(0, len(new_records), 50):
    batch = new_records[i:i+50]
    resp = requests.post(f'{SUPA_URL}/rest/v1/municipalities', headers=h_post, json=batch)
    if resp.status_code not in (200,201):
        print('ERROR:', resp.status_code, resp.text[:100])
        errors += 1

r_count = requests.get(f'{SUPA_URL}/rest/v1/municipalities', headers={**h_base,'Prefer':'count=exact'}, params={'select':'id','limit':1})
print('投入完了 errors:', errors)
print('本番municipalities総件数:', r_count.headers.get('content-range','?'))