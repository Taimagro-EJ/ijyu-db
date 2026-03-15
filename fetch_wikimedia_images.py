"""
Wikimedia Commons APIで市町村の画像URLを取得してSupabaseに保存
- 既に画像があるものはスキップ
- 取得率が高い（日本語Wikipediaに地域写真が豊富）
"""
import os
import time
import requests

# 環境変数読み込み
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

def get_municipalities_without_image():
    """画像URLが未設定の市町村を取得"""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/municipalities',
        headers=SUPABASE_HEADERS,
        params={
            'select': 'id,name,prefecture,region',
            'image_url': 'is.null',
            'order': 'id',
        }
    )
    return r.json()

def search_wikimedia(municipality_name: str, prefecture: str) -> str | None:
    """Wikimedia Commons APIで画像URLを検索"""

    # 試すクエリのリスト（順番に試す）
    queries = [
        f'{municipality_name}',
        f'{prefecture}{municipality_name}',
        f'{municipality_name.replace("市","").replace("町","").replace("村","")}',
        f'{prefecture}の風景',
    ]

    for query in queries:
        url = search_wikimedia_query(query)
        if url:
            return url

    return None

WIKI_HEADERS = {'User-Agent': 'ijyu-db/1.0 (https://www.ijyu-data.com)'}

def search_wikimedia_query(query: str) -> str | None:
    """Wikimedia Commons APIで単一クエリを実行"""
    try:
        # Step 1: Wikipediaページを検索
        search_r = requests.get(
            'https://ja.wikipedia.org/w/api.php',
            headers=WIKI_HEADERS,
            params={
                'action': 'query',
                'list': 'search',
                'srsearch': query,
                'srlimit': 1,
                'format': 'json',
            },
            timeout=10
        )
        search_data = search_r.json()
        results = search_data.get('query', {}).get('search', [])
        if not results:
            return None

        page_title = results[0]['title']

        # Step 2: ページの代表画像を取得
        page_r = requests.get(
            'https://ja.wikipedia.org/w/api.php',
            headers=WIKI_HEADERS,
            params={
                'action': 'query',
                'titles': page_title,
                'prop': 'pageimages',
                'pithumbsize': 1200,
                'format': 'json',
            },
            timeout=10
        )
        page_data = page_r.json()
        pages = page_data.get('query', {}).get('pages', {})

        for page in pages.values():
            thumbnail = page.get('thumbnail', {})
            if thumbnail and thumbnail.get('source'):
                return thumbnail['source']

    except Exception as e:
        print(f'  エラー: {e}')

    return None

def update_image_url(municipality_id: str, image_url: str) -> bool:
    """SupabaseにURLを保存"""
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/municipalities',
        headers=SUPABASE_HEADERS,
        params={'id': f'eq.{municipality_id}'},
        json={'image_url': image_url}
    )
    return r.status_code == 200

def main():
    municipalities = get_municipalities_without_image()
    total = len(municipalities)
    print(f'画像未設定の市町村: {total}件')
    print('Wikimedia Commons APIで取得開始...\n')

    success = 0
    failed = 0

    for i, m in enumerate(municipalities):
        name = m['name']
        prefecture = m['prefecture']

        print(f'[{i+1}/{total}] {name} ({prefecture})', end=' ... ')

        url = search_wikimedia(name, prefecture)

        if url:
            ok = update_image_url(m['id'], url)
            if ok:
                print(f'✓')
                success += 1
            else:
                print(f'✗ 保存失敗')
                failed += 1
        else:
            print(f'✗ 画像なし')
            failed += 1

        # Wikimedia APIは制限が緩いが0.5秒待機
        time.sleep(0.5)

        # 50件ごとに進捗表示
        if (i + 1) % 50 == 0:
            rate = success / (i + 1) * 100
            print(f'\n--- 進捗: {i+1}/{total} 取得率:{rate:.0f}% (成功:{success} 失敗:{failed}) ---\n')

    print(f'\n完了: 成功{success}件 / 失敗{failed}件 / 合計{total}件')
    print(f'取得率: {success/total*100:.0f}%')

if __name__ == '__main__':
    main()
