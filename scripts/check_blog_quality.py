#!/usr/bin/env python3
"""ブログ記事の品質チェック（generate_blog_v2.pyの後に実行）"""
import os, requests

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
HEADERS = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

def check_quality():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/blog_posts",
        headers=HEADERS,
        params={'select': 'id,title,content,slug,published', 'order': 'created_at.desc', 'limit': '5'}
    )
    posts = resp.json()
    issues = []

    for post in posts:
        content = post.get('content', '')
        title = post.get('title', '')
        slug = post.get('slug', '')

        # 1. 文字数チェック
        if len(content) < 2000:
            issues.append(f"⚠️ [{slug}] 文字数が少ない: {len(content)}文字")
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/blog_posts",
                headers={**HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
                params={'id': f'eq.{post["id"]}'},
                json={'published': False}
            )
            issues.append(f"  → 自動的に非公開にしました")

        # 2. HTMLタグ混入チェック
        if any(tag in content for tag in ['<h2>', '<p>', '<div>']):
            issues.append(f"⚠️ [{slug}] HTMLタグが混入しています")

        # 3. タイトル重複チェック
        dup = requests.get(f"{SUPABASE_URL}/rest/v1/blog_posts",
            headers=HEADERS, params={'select': 'id', 'title': f'eq.{title}'})
        if len(dup.json()) > 1:
            issues.append(f"⚠️ [{slug}] タイトルが重複しています")

    if issues:
        print("📋 品質チェック結果:")
        for issue in issues: print(f"  {issue}")
    else:
        print("✅ 品質チェック: 問題なし")
    return issues

if __name__ == '__main__':
    check_quality()
