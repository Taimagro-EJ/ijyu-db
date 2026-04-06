#!/usr/bin/env python3
"""
移住DBの527市町村データから「意外な事実」を自動抽出するスクリプト
移住TV（YouTube Shorts/リール）の台本素材として使用
"""
import os, requests, json
from datetime import datetime

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
HEADERS = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

def fetch_all():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/municipality_overview",
        headers=HEADERS,
        params={'select': 'name,prefecture,time_to_tokyo,rent_1ldk_estimate,avg_temp_annual,max_temp_summer,min_temp_winter,lifestyle_score,supermarket_count,convenience_count,cafe_starbucks,waiting_children,criminal_rate', 'limit': '600'})
    return [m for m in r.json() if m.get('name')]

def extract_facts(data):
    facts = []

    # 1. 東京2時間以内×家賃4万円以下
    cheap_close = [m for m in data if m.get('time_to_tokyo') and m.get('rent_1ldk_estimate')
                   and m['time_to_tokyo'] <= 120 and m['rent_1ldk_estimate'] <= 40000 and m['rent_1ldk_estimate'] > 0]
    if cheap_close:
        facts.append({
            'type': 'ranking',
            'title': f'東京2時間以内で家賃4万円以下の街が{len(cheap_close)}件存在する',
            'detail': f"最安値は{min(cheap_close, key=lambda x: x['rent_1ldk_estimate'])['name']}（{min(cheap_close, key=lambda x: x['rent_1ldk_estimate'])['prefecture']}）",
            'hook': '「東京近くて家賃安い」は本当に存在するのか？'
        })

    # 2. 夏が涼しい（最高気温30度以下）
    cool_summer = [m for m in data if m.get('max_temp_summer') and m['max_temp_summer'] <= 30]
    if cool_summer:
        coolest = min(cool_summer, key=lambda x: x['max_temp_summer'])
        facts.append({
            'type': 'surprising',
            'title': f'夏の最高気温が30℃以下の街が{len(cool_summer)}件ある',
            'detail': f"最涼は{coolest['name']}（{coolest['prefecture']}）で夏の最高気温{coolest['max_temp_summer']}℃",
            'hook': 'エアコン不要で夏を過ごせる街がある'
        })

    # 3. 家賃格差ファクト（最高vs最低）
    rents = [m for m in data if m.get('rent_1ldk_estimate') and m['rent_1ldk_estimate'] > 0]
    if rents:
        max_rent = max(rents, key=lambda x: x['rent_1ldk_estimate'])
        min_rent = min(rents, key=lambda x: x['rent_1ldk_estimate'])
        ratio = max_rent['rent_1ldk_estimate'] / min_rent['rent_1ldk_estimate']
        facts.append({
            'type': 'surprising',
            'title': f'日本で最も家賃が高い街と安い街の差は{ratio:.1f}倍',
            'detail': f"最高: {max_rent['name']}（{max_rent['prefecture']}）{max_rent['rent_1ldk_estimate']//10000}万円 / 最安: {min_rent['name']}（{min_rent['prefecture']}）{min_rent['rent_1ldk_estimate']//10000}万円",
            'hook': '家賃だけで毎月○万円の差が出る'
        })

    # 4. スコア上位なのに東京から遠い（穴場）
    hidden_gems = [m for m in data if m.get('lifestyle_score') and m.get('time_to_tokyo')
                   and m['lifestyle_score'] >= 60 and m['time_to_tokyo'] >= 180]
    if hidden_gems:
        top = max(hidden_gems, key=lambda x: x['lifestyle_score'])
        facts.append({
            'type': 'surprising',
            'title': f'東京から3時間以上なのに生活充実度スコア上位の穴場が{len(hidden_gems)}件',
            'detail': f"トップは{top['name']}（{top['prefecture']}）スコア{top['lifestyle_score']}点",
            'hook': '「田舎=不便」という思い込みをデータが覆す'
        })

    # 5. コンビニ密度最高の地方都市
    MAJOR_CITIES = ['大阪市', '名古屋市', '札幌市', '福岡市', '横浜市', '川崎市', '神戸市', '京都市', '広島市', '仙台市']
    high_conv = [m for m in data if m.get('convenience_count') and m['convenience_count'] >= 30
                 and m.get('time_to_tokyo') and m['time_to_tokyo'] >= 120
                 and m.get('name') not in MAJOR_CITIES]
    if high_conv:
        top_conv = max(high_conv, key=lambda x: x['convenience_count'])
        facts.append({
            'type': 'ranking',
            'title': f'地方なのにコンビニ{top_conv["convenience_count"]}軒の街',
            'detail': f"{top_conv['name']}（{top_conv['prefecture']}）はコンビニ密度で東京都心並み",
            'hook': 'コンビニの数で街の利便性がわかる'
        })

    # 6. 犯罪率が低い×家賃安い
    safe_cheap = [m for m in data if m.get('criminal_rate') and m.get('rent_1ldk_estimate')
                  and m['criminal_rate'] <= 100 and m['rent_1ldk_estimate'] <= 50000]
    if safe_cheap:
        facts.append({
            'type': 'ranking',
            'title': f'犯罪率低い×家賃5万以下の安全で安い街が{len(safe_cheap)}件',
            'detail': f"子育て世代・一人暮らし女性に最適な街が{len(safe_cheap)}件存在",
            'hook': '安全で安い街はどこ？データで探す'
        })

    return facts

def main():
    print('📊 移住DBデータファクト抽出中...')
    data = fetch_all()
    print(f'  対象: {len(data)}市町村')

    facts = extract_facts(data)

    output = {
        'generated_at': datetime.now().isoformat(),
        'total_municipalities': len(data),
        'facts': facts
    }

    output_path = os.path.expanduser('~/ijyu-db/data/surprising_facts.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'\n✅ {len(facts)}件のファクトを抽出しました')
    print(f'保存先: {output_path}\n')
    for i, fact in enumerate(facts, 1):
        print(f'【{i}】{fact["title"]}')
        print(f'  フック: {fact["hook"]}')
        print(f'  詳細: {fact["detail"]}\n')

if __name__ == '__main__':
    main()
