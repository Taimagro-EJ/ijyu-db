"""
移住DB ブログ記事自動生成スクリプト
Gemini Flash API → Supabase blog_posts テーブルに下書き保存
"""
import os
import json
import time
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
    'ranking': 'gemini-3-flash-preview',
    'comparison': 'gemini-3-flash-preview',
    'simulation': 'gemini-3-flash-preview',
    'howto': 'gemini-3-flash-preview',
    'deep_dive': 'gemini-3-flash-preview',  # より深い分析が必要
    'column': 'gemini-3-flash-preview',  # コラムはE本人が書くが、ドラフトはFlashで
}

SYSTEM_PROMPT = """あなたは「移住DB」（https://www.ijyu-data.com）のブログライターです。

## ブランドボイス
- データに基づく客観的な分析が基本
- 「移住経験者の視点」から温かみのある文体
- 読者は移住を検討している30〜40代
- 推計値は必ず「※推計」と明記
- ポジティブもネガティブも正直に伝える

## 出力ルール
- HTML形式（<h2><h3><p><ul><li>タグのみ）
- [HUMAN_INSERT:〇〇についての実体験コメントをここに追加] を3箇所以上配置
- 内部リンクは <a href="/municipalities/スラッグ">市名</a> 形式
- 数値は渡されたデータの値のみ使用（数値の捏造禁止）
- 文字数: 2,500〜3,500文字
- 記事末尾に「出典：移住DB（e-Stat統計データに基づく推計）」を記載
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
    params = {'select': 'name,prefecture,region,avg_temp_annual,min_temp_winter,rent_1ldk_estimate,total_monthly_cost_single,time_to_tokyo,nearest_shinkansen,car_necessity_score,criminal_rate,slug'}

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
        'car_free': 'car_necessity_score.desc',
        'childcare': 'total_monthly_cost_single.asc',
    }
    order = sort_map.get(condition, 'total_monthly_cost_single.asc')
    params['order'] = order
    params['limit'] = limit

    r = requests.get(f'{SUPABASE_URL}/rest/v1/municipality_overview', headers=SUPABASE_HEADERS, params=params)
    return r.json()


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
    article_type = outline['type']
    title = outline['title']
    h2s = '\n'.join([f'- {h}' for h in outline['h2_outline']])
    keyword = outline['target_keyword']
    data_str = json.dumps(data, ensure_ascii=False, indent=2, default=str)

    prompt = f"""以下の構成案とデータに基づいて、ブログ記事を作成してください。

## 記事情報
タイトル: {title}
ターゲットキーワード: {keyword}
記事タイプ: {article_type}

## H2構成
{h2s}

## 移住DBのデータ（このデータを正確に引用してください）
{data_str}

## 注意事項
- データの数値を記事内で具体的に引用してください
- [HUMAN_INSERT:〇〇についての体験コメントをここに追加] を3箇所以上配置してください
- 内部リンクは必ず含めてください: {outline.get('internal_links', [])}
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
        'category': outline['type'],
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
    print(f'タイプ: {outline["type"]}')

    # データ取得
    article_type = outline['type']
    if article_type == 'deep_dive':
        data = fetch_municipality_data(slug=outline.get('target_slug'))
    elif article_type == 'comparison':
        data = fetch_municipality_data(slugs=outline.get('compare_slugs', []))
    elif article_type == 'ranking':
        data = fetch_municipality_data(condition=outline.get('ranking_condition'), limit=15)
    else:
        # simulation / howto / column: 全体統計から安い順TOP20
        data = fetch_municipality_data(condition='cost_asc', limit=20)

    if not data:
        print('❌ データ取得失敗')
        return

    print(f'データ取得完了: {len(data) if isinstance(data, list) else 1}件')

    # モデル選定
    model = MODELS.get(article_type, 'gemini-3-flash-preview')
    print(f'使用モデル: {model}')

    # プロンプト構築・生成
    prompt = build_prompt(outline, data)
    print('Gemini API呼び出し中...')
    content = call_gemini(prompt, model)

    if not content:
        print('❌ 記事生成失敗')
        return

    print(f'生成完了: {len(content)}文字')

    # 保存
    save_draft(outline, content, model)


if __name__ == '__main__':
    main()
