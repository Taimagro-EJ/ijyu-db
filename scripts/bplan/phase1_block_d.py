import requests, os, csv
from collections import defaultdict

SUPA_URL = os.environ['SUPABASE_URL']
SUPA_KEY = os.environ['SUPABASE_SERVICE_KEY']
h_base = {'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY}
h_post = {**h_base, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'}

# 残り17県（ブロックA〜Cで漏れた県）
BLOCK_D_PREFS = {'43','46','28','30','39','26','24','45','31','36','25','18','42','32','37','38','35'}
PREF_ROMA = {'43':'kumamoto','46':'kagoshima','28':'hyogo','30':'wakayama','39':'kochi',
             '26':'kyoto','24':'mie','45':'miyazaki','31':'tottori','36':'tokushima',
             '25':'shiga','18':'fukui','42':'nagasaki','32':'shimane','37':'kagawa',
             '38':'ehime','35':'yamaguchi'}
PREF_REGION = {'43':'九州','46':'九州','28':'近畿','30':'近畿','39':'四国',
               '26':'近畿','24':'近畿','45':'九州','31':'中国','36':'四国',
               '25':'近畿','18':'中部','42':'九州','32':'中国','37':'四国',
               '38':'四国','35':'中国'}

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
    if m['prefecture_code'] not in BLOCK_D_PREFS: continue
    pref_roma = PREF_ROMA.get(m['prefecture_code'], 'japan')
    region = PREF_REGION.get(m['prefecture_code'], '近畿')
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

print('ブロックD投入対象:', len(new_records), '件')
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