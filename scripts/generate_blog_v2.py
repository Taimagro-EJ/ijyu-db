#!/usr/bin/env python3
"""
移住DB ブログ記事自動生成 v2 — Opus設計準拠版
ブログ役割：PV獲得ではなくChat UIへの誘導
"""
import json, os, sys, requests
from datetime import datetime
from google import genai
from google.genai import types

SUPABASE_URL = os.environ.get("SUPABASE_URL","").strip().strip('"').strip("'")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY","").strip().strip('"').strip("'")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY","").strip().strip('"').strip("'")

HEADERS = {
    "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates",
}

client = genai.Client(api_key=GEMINI_API_KEY)

# 全記事末尾に自動付与するCTAテンプレート（Opus指示）
ARTICLE_FOOTER = """

---

### あなたの条件で移住先を探してみませんか？

この記事のデータは移住DBの527市町村データベースから算出しています。
年収・家族構成・希望条件を入力すると、AIが最適な移住先を提案します。

[→ AIに移住相談する（無料）](/chat)

*データ出典: 移住DB独自集計（2026年3月時点）。気候・人口は政府統計、施設数はOpenStreetMapデータを使用。*
"""

SYSTEM_PROMPT = """あなたは「移住DB」のデータジャーナリストです。

## 核心ルール
1. データが主役。他サイトにもある情報は書かない。
2. 527市町村の横断分析から「移住DBにしか出せない発見」を書く。
3. 数字は渡されたデータの値のみ使用。捏造禁止。
4. 推計値は「※推計」と明記。
5. [HUMAN_INSIGHT:プロンプト] でEさんの実感挿入箇所を1〜2箇所配置。
6. 内部リンク: [市名](/municipalities/slug) 形式で挿入。
8. **出力形式は必ずMarkdown記法のみ**。HTMLタグ（<h2>, <p>, <ul>, <li>, <br>等）は一切使用禁止。
   - 見出し: ## ### 記法を使う
   - リスト: - または 1. 記法を使う
   - 強調: **太字** 記法を使う
   - 段落: 空行で区切る
8. 記事末尾にCTAセクションは不要（システム側で自動付与）。"""

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from article_generators.cross_ranking import generate as gen_cross_ranking
from article_generators.surprising_facts import generate as gen_surprising


def gen_prefecture_ranking(outline: dict) -> dict:
    """都道府県内の市町村データ比較（群馬・長野等）"""
    prefecture = outline.get("prefecture", "")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipality_overview",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "*", "prefecture": f"eq.{prefecture}", "limit": 100,
                "order": "lifestyle_score.desc"}
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "prefecture": prefecture,
        "municipality_count": len(data),
        "municipalities": [
            {"name": m.get("name"), "slug": m.get("slug"),
             "lifestyle_score": m.get("lifestyle_score"),
             "rent_1ldk_estimate": m.get("rent_1ldk_estimate"),
             "time_to_tokyo": m.get("time_to_tokyo"),
             "criminal_rate": m.get("criminal_rate"),
             "total_population": m.get("total_population"),
             "cafe_starbucks": m.get("cafe_starbucks"),
             "cinema_count": m.get("cinema_count"),
             "gym_24h_count": m.get("gym_24h_count"),
             "car_necessity": m.get("car_necessity"),
             "avg_temp_annual": m.get("avg_temp_annual"),
             "snowfall_annual": m.get("snowfall_annual")}
            for m in data
        ],
    }


GENERATORS = {
    "cross_ranking": gen_cross_ranking,
    "surprising_discovery": gen_surprising,
    "prefecture_ranking": gen_prefecture_ranking,
}


def get_next_outline():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(script_dir, "blog_outlines_v3.json")) as f:
        outlines = json.load(f)
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
    # CTAを末尾に追加
    full_content = content + ARTICLE_FOOTER
    payload = {
        "slug": outline["slug"],
        "title": outline["title"],
        "content": full_content,
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
    print("generate_blog_v2.py — Opus設計準拠版")
    print("=" * 55)

    outline = get_next_outline()
    if not outline:
        print("✅ 全6記事生成済み。")
        return

    print(f"\n📝 [{outline['type']}] {outline['title']}")

    generator = GENERATORS.get(outline["type"])
    if not generator:
        print(f"  ⚠️ 未対応の記事タイプ: {outline['type']}")
        return

    print("  📊 データ取得中...")
    article_data = generator(outline)
    print(f"  取得完了（{len(str(article_data))}文字のデータ）")

    print("  🤖 Geminiで記事生成中...")
    content = generate_with_gemini(outline, article_data)
    print(f"  生成完了（{len(content)}文字）")

    save_draft(outline, content)
    print(f"\n  📌 YouTube: {outline.get('youtube_short_hook', '')}")
    print(f"  📌 X投稿: {outline.get('x_post_template', '')[:80]}...")
    print(f"\n✅ 完了！ /admin/blog で確認してください。")


if __name__ == "__main__":
    main()
