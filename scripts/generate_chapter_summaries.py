"""
暮らしのリアル Phase 1: AIチャプター要約の一括生成
527市町村 × 5チャプター = 2,635件の要約を生成
"""

import os
import time
import requests
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CHAPTERS = {
    'climate': {
        'label': '気候',
        'prompt_template': """あなたは移住アドバイザーです。以下のデータから、この市町村の気候について移住検討者に向けた2〜3文の要約を書いてください。

市町村: {name}（{prefecture}）
年間平均気温: {avg_temp_annual}℃
夏の最高気温: {max_temp_summer}℃
冬の最低気温: {min_temp_winter}℃
年間日照時間: {sunshine_hours_annual}時間

ルール:
- 客観的データに基づく分析と、生活への影響を述べる
- ポジティブ・ネガティブの両面を含める
- 「です・ます」調
- 80〜120文字"""
    },
    'cost': {
        'label': '生活費',
        'prompt_template': """あなたは移住アドバイザーです。以下のデータから、この市町村の生活費について移住検討者に向けた2〜3文の要約を書いてください。

市町村: {name}（{prefecture}）
家賃相場（1LDK）: {rent_1ldk_estimate}円
単身月額生活費（推計）: {total_monthly_cost_single}円

ルール:
- 東京や全国平均との比較を含める
- 具体的な金額感に言及する
- 「です・ます」調
- 80〜120文字"""
    },
    'access': {
        'label': 'アクセス',
        'prompt_template': """あなたは移住アドバイザーです。以下のデータから、この市町村のアクセスについて移住検討者に向けた2〜3文の要約を書いてください。

市町村: {name}（{prefecture}）
東京駅までの所要時間: {time_to_tokyo}分
最寄り新幹線駅: {nearest_shinkansen}
車の必要性スコア: {car_necessity}/5（5=不要、1=必須）
公共交通スコア: {public_transport_score}/5

ルール:
- 通勤・帰省の観点を含める
- 車の必要性にも言及
- 「です・ます」調
- 80〜120文字"""
    },
    'facilities': {
        'label': 'まちの機能',
        'prompt_template': """あなたは移住アドバイザーです。以下のデータから、この市町村の施設充実度について移住検討者に向けた2〜3文の要約を書いてください。

市町村: {name}（{prefecture}）
人口: {total_population}人
総合病院: {hospital_count}軒
診療所: {clinic_count}軒
スーパー: {supermarket_count}軒
コンビニ: {convenience_count}軒

ルール:
- 人口規模に対する施設の充実度を評価する
- 日常生活で困るか困らないかを明確にする
- 「です・ます」調
- 80〜120文字"""
    },
    'support': {
        'label': '移住支援',
        'prompt_template': """あなたは移住アドバイザーです。以下のデータから、この市町村の移住支援・子育て支援について移住検討者に向けた2〜3文の要約を書いてください。

市町村: {name}（{prefecture}）
医療費助成年齢: {medical_subsidy_age}歳まで
待機児童数: {waiting_children}人
小学校給食無償化: {school_lunch_free}

ルール:
- 具体的な支援内容に言及する
- 子育て世帯・移住者への特徴を述べる
- 「です・ます」調
- 80〜120文字"""
    }
}


def get_municipality_data():
    result = supabase.table('municipality_overview').select('*').execute()
    return result.data


def generate_summary(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048}
    }
    for attempt in range(3):
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            return data['candidates'][0]['content']['parts'][0]['text'].strip()
        elif response.status_code == 503:
            print(f"  503 リトライ {attempt+1}/3 ...")
            time.sleep(10)
        else:
            print(f"  ERROR: {response.status_code} - {response.text[:200]}")
            return None
    return None


def build_prompt(chapter_key: str, muni: dict) -> str:
    template = CHAPTERS[chapter_key]['prompt_template']
    def safe(val, default='データなし'):
        return val if val is not None else default
    return template.format(
        name=safe(muni.get('name')),
        prefecture=safe(muni.get('prefecture')),
        avg_temp_annual=safe(muni.get('avg_temp_annual')),
        max_temp_summer=safe(muni.get('max_temp_summer')),
        min_temp_winter=safe(muni.get('min_temp_winter')),
        sunshine_hours_annual=safe(muni.get('sunshine_hours_annual')),
        rent_1ldk_estimate=safe(muni.get('rent_1ldk_estimate')),
        total_monthly_cost_single=safe(muni.get('total_monthly_cost_single')),
        time_to_tokyo=safe(muni.get('time_to_tokyo')),
        nearest_shinkansen=safe(muni.get('nearest_shinkansen')),
        car_necessity=safe(muni.get('car_necessity')),
        public_transport_score=safe(muni.get('public_transport_score')),
        total_population=safe(muni.get('total_population')),
        hospital_count=safe(muni.get('hospital_count', 0)),
        clinic_count=safe(muni.get('clinic_count', 0)),
        supermarket_count=safe(muni.get('supermarket_count', 0)),
        convenience_count=safe(muni.get('convenience_count', 0)),
        medical_subsidy_age=safe(muni.get('medical_subsidy_age')),
        waiting_children=safe(muni.get('waiting_children')),
        school_lunch_free=safe(muni.get('school_lunch_free')),
    )


def main():
    municipalities = get_municipality_data()
    print(f"対象市町村数: {len(municipalities)}")
    total = 0
    errors = 0
    for i, muni in enumerate(municipalities):
        code = muni.get('id')
        name = muni.get('name', '不明')
        for chapter_key in CHAPTERS:
            existing = supabase.table('ai_chapter_summaries').select('id').eq(
                'municipality_code', code).eq('chapter_key', chapter_key).execute()
            if existing.data:
                continue
            prompt = build_prompt(chapter_key, muni)
            summary = generate_summary(prompt)
            if summary:
                supabase.table('ai_chapter_summaries').upsert({
                    'municipality_code': code,
                    'chapter_key': chapter_key,
                    'summary_text': summary,
                    'model_used': 'gemini-2.5-flash',
                }).execute()
                total += 1
            else:
                errors += 1
            time.sleep(4.5)
        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(municipalities)} 完了 (生成: {total}, エラー: {errors})")
    print(f"\n完了! 生成: {total}件, エラー: {errors}件")

if __name__ == '__main__':
    main()
