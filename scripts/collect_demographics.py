#!/usr/bin/env python3
"""e-Stat年齢別人口収集（JISコード版）"""
import os, sys, time, requests

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
ESTAT_KEY = os.environ.get('ESTAT_API_KEY', 'c440ce56a80c46c6904dc51d95be4e76f30a71aa')
ESTAT_STATS_ID = '0003448237'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

def get_municipalities():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/municipalities', headers=HEADERS,
        params={'select': 'id,name,prefecture', 'limit': 600, 'order': 'id'})
    r.raise_for_status()
    return r.json()

def get_already_collected():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/stats_demographics', headers=HEADERS,
        params={'select': 'municipality_id', 'limit': 600})
    return {row['municipality_id'] for row in r.json()} if r.status_code == 200 else set()

def fetch_estat(jis_code):
    url = 'https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData'
    params = {'appId': ESTAT_KEY, 'statsDataId': ESTAT_STATS_ID, 'cdArea': jis_code,
              'metaGetFlg': 'N', 'cntGetFlg': 'N', 'explanationGetFlg': 'N',
              'annotationGetFlg': 'N', 'sectionHeaderFlg': '1'}
    try:
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except:
        return {}

def parse_population(data):
    result = {k: 0 for k in ['pop_0_14','pop_15_19','pop_20_24','pop_25_29',
                               'pop_30_34','pop_35_39','pop_40_44','pop_45_49',
                               'pop_50_64','pop_65_over']}
    try:
        stats = data.get('GET_STATS_DATA',{}).get('STATISTICAL_DATA',{})
        values = stats.get('DATA_INF',{}).get('VALUE',[])
        if not values: return {}
        class_objs = stats.get('CLASS_INF',{}).get('CLASS_OBJ',[])
        age_labels = {}
        for obj in class_objs:
            if obj.get('@id') == 'cat01':
                for cls in obj.get('CLASS',[]):
                    age_labels[cls['@code']] = cls['@name']
        for v in values:
            code = v.get('@cat01','')
            label = age_labels.get(code,'')
            raw = v.get('$','').replace(',','').strip()
            if not raw or raw in ('-','…','X'): continue
            try: pop = int(float(raw))
            except: continue
            if any(x in label for x in ['0～4','5～9','10～14']): result['pop_0_14'] += pop
            elif '15～19' in label: result['pop_15_19'] += pop
            elif '20～24' in label: result['pop_20_24'] += pop
            elif '25～29' in label: result['pop_25_29'] += pop
            elif '30～34' in label: result['pop_30_34'] += pop
            elif '35～39' in label: result['pop_35_39'] += pop
            elif '40～44' in label: result['pop_40_44'] += pop
            elif '45～49' in label: result['pop_45_49'] += pop
            elif any(x in label for x in ['50～54','55～59','60～64']): result['pop_50_64'] += pop
            elif any(x in label for x in ['65','70','75','80','85']): result['pop_65_over'] += pop
    except: return {}
    return result if sum(result.values()) > 0 else {}

def upsert(municipality_id, pop):
    payload = {'municipality_id': municipality_id, **pop, 'data_year': 2025}
    r = requests.post(f'{SUPABASE_URL}/rest/v1/stats_demographics', headers=HEADERS, json=payload)
    return r.status_code in (200, 201)

def main():
    print('=== e-Stat 年齢別人口収集 ===\n')
    municipalities = get_municipalities()
    already = get_already_collected()
    targets = [m for m in municipalities if m['id'] not in already]
    print(f'全{len(municipalities)}件 / 収集済{len(already)}件 / 対象{len(targets)}件\n')
    if not targets:
        print('✅ 全件収集済み'); return

    # テスト
    t = targets[0]
    print(f'【テスト】{t["prefecture"]} {t["name"]} (JIS: {t["id"]})')
    pop = parse_population(fetch_estat(t['id']))
    if pop:
        pop_20_44 = sum(pop.get(k,0) for k in ['pop_20_24','pop_25_29','pop_30_34','pop_35_39','pop_40_44'])
        print(f'  ✅ 成功: 20-44歳={pop_20_44:,}人, 内訳={pop}')
    else:
        print('  ❌ 失敗: 統計表IDかAPIキーを確認してください'); return

    print(f'\n全{len(targets)}件収集を開始しますか？ [y/N]: ', end='', flush=True)
    if input().strip().lower() != 'y':
        print('キャンセル'); return

    success = fail = 0
    for i, m in enumerate(targets):
        print(f'[{i+1}/{len(targets)}] {m["prefecture"]} {m["name"]}', end=' ... ')
        pop = parse_population(fetch_estat(m['id']))
        if pop:
            if upsert(m['id'], pop):
                print(f'✅'); success += 1
            else:
                print(f'❌ DB失敗'); fail += 1
        else:
            print(f'⚠️ データなし'); fail += 1
        time.sleep(0.3)

    print(f'\n✅ 成功: {success}件 / ❌ 失敗: {fail}件')

if __name__ == '__main__':
    main()
