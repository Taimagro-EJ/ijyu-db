"""
移住DB ブログ記事自動生成スクリプト v2
データジャーナリズム型 - Gemini Flash API → Supabase blog_posts テーブルに下書き保存
"""
import os
import json
import requests
from datetime import datetime, timezone

# 環境変数
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

# モデル設定（記事タイプ別）
MODELS = {
    # 新タイプ
    'correlation': 'gemini-3-flash-preview',
    'complex_ranking': 'gemini-3-flash-preview',
    'surprising_discovery': 'gemini-3-flash-preview',
    'simulation': 'gemini-3-flash-preview',
    'city_carte': 'gemini-3-flash-preview',
    'policy_analysis': 'gemini-3-flash-preview',
    'time_series': 'gemini-3-flash-preview',
    'single_ranking': 'gemini-3-flash-preview',
    'personal_column': 'gemini-3-flash-preview',
    # 旧タイプ（後方互換）
    'ranking': 'gemini-3-flash-preview',
    'comparison': 'gemini-3-flash-preview',
    'howto': 'gemini-3-flash-preview',
    'deep_dive': 'gemini-3-flash-preview',
    'column': 'gemini-3-flash-preview',
}

SYSTEM_PROMPT = """あなたは「移住DB」（https://www.ijyu-data.com）のデータジャーナリストです。

## 記事の核心ルール
1. データが主役。体験談は補足。
2. 「他のサイトにも書いてある内容」は書かない。
3. 527市町村のデータを横断分析した「移住DBにしか出せない発見」を書く。
4. 数字は必ず渡されたデータの値を使用。捏造禁止。
5. 推計値は「※推計」と明記。
6. [HUMAN_INSIGHT:プロンプト] でデータでは分からない実感の挿入箇所を1〜2箇所配置。
7. 内部リンクは <a href="/municipalities/スラッグ">市名</a> 形式で2本以上含める。

## ブランドボイス
- 「移住DBのデータ分析によると〜」がベースの論調
- 断定的な意見を述べる（中立的な要約ではなく）
- 直感に反する発見は特に強調する
- 読者は移住を検討している30〜40代
- 記事末尾に「出典：移住DB（e-Stat・気象庁統計データに基づく推計）」を記載

## 出力ルール
- HTML形式（<h2><h3><p><ul><li><table>タグのみ）
- 文字数: 2,500〜3,500文字
- <html><body>タグは不要"""


def get_existing_slugs():
    """既に生成済みの記事slugを取得"""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/blog_posts',
        headers=SUPABASE_HEADERS,
        params={'select': 'slug'}
    )
    return {row['slug'] for row in r.json()}


def get_next_outline(outlines_path='blog-outlines.json'):
    """次に生成すべき記事をoutlinesから選択"""
    # v2があればv2を優先
    v2_path = outlines_path.replace('.json', '-v2.json')
    if os.path.exists(v2_path):
        outlines_path = v2_path

    with open(outlines_path) as f:
        outlines = json.load(f)

    existing = get_existing_slugs()

    for outline in outlines:
        if outline['slug'] not in existing:
            return outline

    print('全記事生成済みです')
    return None


def fetch_municipality_data(slug=None, slugs=None, condition=None, limit=10):
    """Supabaseから市町村データを取得"""
    params = {
        'select': 'name,prefecture,region,avg_temp_annual,min_temp_winter,sunshine_hours_annual,precipitation_annual,rent_1ldk_estimate,total_monthly_cost_single,total_monthly_cost_family,time_to_tokyo,nearest_shinkansen,car_necessity_score,criminal_rate,slug'
    }

    if slug:
        params['slug'] = f'eq.{slug}'
        r = requests.get(f'{SUPABASE_URL}/rest/v1/municipality_overview', headers=SUPABASE_HEADERS, params=params)
        data = r.json()
        return data[0] if data else None

    if slugs:
        params['slug'] = f'in.({",".join(slugs)})'
        r = requests.get(f'{SUPABASE_URL}/rest/v1/municipality_overview', headers=SUPABASE_HEADERS, params=params)
        return r.json()

    # ランキング用：条件に応じてソート
    sort_map = {
        'cost_asc': 'total_monthly_cost_single.asc',
        'tokyo_access': 'time_to_tokyo.asc',
        'warm_no_snow': 'avg_temp_annual.desc',
        'car_free': 'car_necessity_score.asc',
        'childcare': 'total_monthly_cost_single.asc',
        'safe': 'criminal_rate.asc',
        'sunshine': 'sunshine_hours_annual.desc',
        'cold': 'avg_temp_annual.asc',
    }
    order = sort_map.get(condition, 'total_monthly_cost_single.asc')
    params['order'] = order
    params['limit'] = limit

    r = requests.get(f'{SUPABASE_URL}/rest/v1/municipality_overview', headers=SUPABASE_HEADERS, params=params)
    return r.json()


def fetch_data_for_article(outline):
    """記事タイプに応じたデータを取得"""
    article_type = outline.get('type', 'ranking')

    if article_type == 'city_carte':
        return fetch_municipality_data(slug=outline.get('target_slug'))

    elif article_type == 'comparison':
        return fetch_municipality_data(slugs=outline.get('compare_slugs', []))

    elif article_type in ('correlation', 'surprising_discovery', 'time_series'):
        # 全データを取得して分析用に渡す（上位50件）
        return fetch_municipality_data(condition='cost_asc', limit=50)

    elif article_type == 'complex_ranking':
        # 複合条件に対応したデータを取得
        return fetch_municipality_data(condition='cost_asc', limit=30)

    elif article_type in ('single_ranking', 'ranking'):
        condition = outline.get('ranking_condition', 'cost_asc')
        return fetch_municipality_data(condition=condition, limit=20)

    elif article_type == 'simulation':
        return fetch_municipality_data(condition='cost_asc', limit=30)

    else:
        return fetch_municipality_data(condition='cost_asc', limit=20)


def call_gemini(prompt, model='gemini-3-flash-preview'):
    """Gemini APIを呼び出して記事を生成"""
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    headers = {'Content-Type': 'application/json'}
    params = {'key': GEMINI_API_KEY}

    body = {
        'contents': [
            {
                'parts': [
                    {'text': SYSTEM_PROMPT},
                    {'text': prompt}
                ]
            }
        ],
        'generationConfig': {
            'maxOutputTokens': 6000,
            'temperature': 0.7,
        }
    }

    r = requests.post(url, headers=headers, params=params, json=body, timeout=120)

    if r.status_code != 200:
        print(f'Gemini APIエラー: {r.status_code} {r.text[:200]}')
        return None

    data = r.json()
    try:
        return data['candidates'][0]['content']['parts'][0]['text']
    except (KeyError, IndexError) as e:
        print(f'レスポンス解析エラー: {e}')
        return None


def build_prompt(outline, data):
    """記事タイプに応じたプロンプトを構築"""
    article_type = outline.get('type', 'ranking')
    title = outline['title']
    h2s = '\n'.join([f'- {h}' for h in outline.get('h2_outline', [])])
    keyword = outline.get('target_keyword', '')
    human_insight = outline.get('human_insight_prompt', '')
    data_str = json.dumps(data, ensure_ascii=False, indent=2, default=str)

    prompt = f"""以下の記事仕様とデータに基づいて、データジャーナリズム型のブログ記事を作成してください。

## 記事仕様
タイトル: {title}
ターゲットキーワード: {keyword}
記事タイプ: {article_type}
"""

    if h2s:
        prompt += f"""
## H2構成
{h2s}
"""

    if human_insight:
        prompt += f"""
## [HUMAN_INSIGHT]のプロンプト
記事内の適切な箇所に以下のプロンプトで[HUMAN_INSIGHT]を1箇所配置してください：
[HUMAN_INSIGHT:{human_insight}]
"""

    prompt += f"""
## 移住DBのデータ（このデータを正確に引用・分析してください）
{data_str}

## 注意事項
- データの横断分析から「意外な発見」や「直感に反する事実」を積極的に取り上げてください
- 全国平均との比較、地域間の差異、相関関係など、データならではの視点を入れてください
- 「移住DBのデータによると〜」という論調で書いてください
- 内部リンク: {outline.get('internal_links', [])}
- HTMLのみ出力（<html><body>タグ不要）
"""
    return prompt


def save_draft(outline, content, model):
    """blog_postsテーブルに下書き保存"""
    data = {
        'slug': outline['slug'],
        'title': outline['title'],
        'description': outline.get('description', ''),
        'content': content,
        'category': outline.get('type', 'ranking'),
        'target_keyword': outline.get('target_keyword', ''),
        'tags': [],
        'published': False,
        'generated_by': model,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }

    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/blog_posts',
        headers=SUPABASE_HEADERS,
        json=data
    )

    if r.status_code in (200, 201):
        print(f'✅ 下書き保存完了: {outline["title"]}')
        return True
    else:
        print(f'❌ 保存失敗: {r.status_code} {r.text[:200]}')
        return False


def main():
    # blog-outlines.jsonのパスを解決
    script_dir = os.path.dirname(os.path.abspath(__file__))
    outlines_path = os.path.join(script_dir, '..', 'blog-outlines.json')
    if not os.path.exists(outlines_path):
        outlines_path = os.path.join(script_dir, 'blog-outlines.json')

    outline = get_next_outline(outlines_path)
    if not outline:
        return

    print(f'生成開始: {outline["title"]}')
    print(f'タイプ: {outline.get("type")}')

    # データ取得
    data = fetch_data_for_article(outline)
    if not data:
        print('❌ データ取得失敗')
        return

    count = len(data) if isinstance(data, list) else 1
    print(f'データ取得完了: {count}件')

    # モデル選定
    model = MODELS.get(outline.get('type', 'ranking'), 'gemini-3-flash-preview')
    print(f'使用モデル: {model}')

    # プロンプト構築・生成
    prompt = build_prompt(outline, data)
    print('Gemini API呼び出し中...')
    content = call_gemini(prompt, model)

    if not content:
        print('❌ 記事生成失敗')
        return

    print(f'生成完了: {len(content)}文字')
    save_draft(outline, content, model)


if __name__ == '__main__':
    main()
