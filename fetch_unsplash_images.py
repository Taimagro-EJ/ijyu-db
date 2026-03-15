"""
Unsplash APIで市町村の画像URLを取得してSupabaseに保存するスクリプト
"""
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser('~/ijyu-db/.env'))

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
UNSPLASH_KEY = os.environ['UNSPLASH_ACCESS_KEY']

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

def search_unsplash(query: str) -> str | None:
    """Unsplashで画像URLを検索"""
    r = requests.get(
        'https://api.unsplash.com/search/photos',
        headers={'Authorization': f'Client-ID {UNSPLASH_KEY}'},
        params={
            'query': query,
            'per_page': 1,
            'orientation': 'landscape',
        }
    )
    if r.status_code != 200:
        print(f'  Unsplash API error: {r.status_code}')
        return None
    data = r.json()
    results = data.get('results', [])
    if not results:
        return None
    # regular サイズ（1080px幅）を使用
    return results[0]['urls']['regular']

def update_image_url(municipality_id: str, image_url: str):
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

    success = 0
    failed = 0

    for i, m in enumerate(municipalities):
        name = m['name']
        prefecture = m['prefecture']

        # 検索クエリ：「長野県 松本市 風景」など
        query = f'{prefecture} {name} 風景 landscape'

        print(f'[{i+1}/{total}] {name} ({prefecture}) を検索中...', end=' ')

        url = search_unsplash(query)

        # 見つからない場合は都道府県で再検索
        if not url:
            query_fallback = f'Japan {prefecture} landscape countryside'
            url = search_unsplash(query_fallback)

        if url:
            ok = update_image_url(m['id'], url)
            if ok:
                print(f'✓ 保存完了')
                success += 1
            else:
                print(f'✗ 保存失敗')
                failed += 1
        else:
            print(f'✗ 画像なし')
            failed += 1

        # Unsplash無料プランは50req/時なので1.5秒待機
        # 527件 × 1.5秒 = 約13分
        time.sleep(1.5)

        # 50件ごとに進捗表示
        if (i + 1) % 50 == 0:
            print(f'\n--- 進捗: {i+1}/{total} (成功:{success} 失敗:{failed}) ---\n')

    print(f'\n完了: 成功{success}件 / 失敗{failed}件 / 合計{total}件')

if __name__ == '__main__':
    main()
