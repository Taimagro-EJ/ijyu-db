#!/usr/bin/env python3
"""
移住DB ブログ記事自動生成 v2 — 生活リアリティデータ統合版
"""
import json, os, sys, requests
from datetime import datetime
from google import genai
from google.genai import types

# 環境変数
SUPABASE_URL = os.environ.get("SUPABASE_URL","").strip().strip('"').strip("'")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY","").strip().strip('"').strip("'")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY","").strip().strip('"').strip("'")

HEADERS = {
    "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates",
}

# Gemini初期化
client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """あなたは「移住DB」のデータジャーナリストです。

## 核心ルール
1. データが主役。他サイトにもある情報は書かない。
2. 527市町村の横断分析から「移住DBにしか出せない発見」を書く。
3. 数字は渡されたデータの値のみ使用。捏造禁止。
4. 推計値は「※推計」と明記。
5. [HUMAN_INSIGHT:プロンプト] でEさんの実感挿入箇所を1〜2箇所配置。
6. 内部リンク: [市名](/municipalities/slug) 形式で挿入。
7. 施設にはTier表記: イオンモール(A)、ららぽーと(S)。
8. 文字数: 3,000〜4,000文字。
9. Markdown形式で出力。H2（##）・H3（###）を使う。"""

# ジェネレータのインポート
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from article_generators.cross_ranking import generate as gen_cross_ranking
from article_generators.surprising_facts import generate as gen_surprising

GENERATORS = {
    "cross_ranking": gen_cross_ranking,
    "surprising_discovery": gen_surprising,
}


def get_next_outline():
    """未生成の記事をblog_outlines_v3.jsonから取得"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(script_dir, "blog_outlines_v3.json")) as f:
        outlines = json.load(f)

    # 既生成slugを取得
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/blog_posts",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "slug"}
    )
    existing = {r["slug"] for r in (resp.json() if resp.ok else [])}

    for o in outlines:
        if o["slug"] not in existing:
            return o
    return None


def generate_with_gemini(outline: dict, article_data: dict) -> str:
    
    user_prompt = f"""以下のデータと構成案に基づいて、ブログ記事を作成してください。

## 記事情報
タイトル: {outline['title']}
ターゲットKW: {outline['target_keyword']}
H2構成: {json.dumps(outline['h2_outline'], ensure_ascii=False)}

## 分析データ
{json.dumps(article_data, ensure_ascii=False, indent=2, default=str)}
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=SYSTEM_PROMPT + "\n\n" + user_prompt,
        config=types.GenerateContentConfig(max_output_tokens=6000, temperature=0.7)
    )
    return response.text


def save_draft(outline: dict, content: str):
    payload = {
        "slug": outline["slug"],
        "title": outline["title"],
        "content": content,
        "category": outline["type"],
        "published": False,
        "generated_by": "gemini-blog-v2",
        "created_at": datetime.utcnow().isoformat(),
    }
    resp = requests.post(f"{SUPABASE_URL}/rest/v1/blog_posts", headers=HEADERS, json=payload)
    if resp.status_code in (200, 201):
        print(f"  ✅ 下書き保存: {outline['title']}")
    else:
        print(f"  ⚠️ 保存エラー: {resp.status_code} {resp.text[:200]}")


def main():
    print("=" * 55)
    print("generate_blog_v2.py — 生活リアリティデータ統合版")
    print("=" * 55)

    outline = get_next_outline()
    if not outline:
        print("✅ 全記事生成済み。blog_outlines_v3.jsonに追加してください。")
        return

    print(f"\n📝 生成対象: [{outline['type']}] {outline['title']}")

    generator = GENERATORS.get(outline["type"])
    if not generator:
        print(f"  ⚠️ 未対応の記事タイプ: {outline['type']}")
        return

    print("  📊 データ取得中...")
    article_data = generator(outline)
    print(f"  データ取得完了: {json.dumps(article_data, ensure_ascii=False)[:200]}...")

    print("  🤖 Geminiで記事生成中...")
    content = generate_with_gemini(outline, article_data)
    print(f"  生成完了（{len(content)}文字）")

    save_draft(outline, content)
    print(f"\n✅ 完了！ /admin/blog で確認してください。")


if __name__ == "__main__":
    main()
