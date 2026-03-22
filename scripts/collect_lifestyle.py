#!/usr/bin/env python3
"""
collect_lifestyle.py
====================
527市町村の生活利便施設データをOverpass APIから収集し、
Supabaseのstats_lifestyleテーブルにupsertする。

使用方法:
  python3 collect_lifestyle.py                    # 全527市町村
  python3 collect_lifestyle.py --limit 10         # テスト用10件
  python3 collect_lifestyle.py --resume           # 中断再開（済み市町村をスキップ）
  python3 collect_lifestyle.py --municipality 20202  # 特定市町村のみ

必要な環境変数 (.env):
  SUPABASE_URL
  SUPABASE_SERVICE_KEY  # service_roleキー（書き込み権限が必要）
"""

import json
import time
import argparse
import os
import sys
from datetime import date
from pathlib import Path
import requests

# ===========================================================
# 設定
# ===========================================================
OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"
OVERPASS_RATE_LIMIT = 1.2   # 秒（1req/s + バッファ）
OVERPASS_TIMEOUT = 60        # タイムアウト秒
OVERPASS_MAX_RETRY = 3       # リトライ回数

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wedxzvhdheitoyenjnmo.supabase.co").strip().strip('"').strip("'")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip().strip('"').strip("'")
SUPABASE_BATCH_SIZE = 100

BRAND_TIERS_PATH = Path(__file__).parent / "brand_tiers_v1.json"
PROGRESS_FILE = Path(__file__).parent / "collect_lifestyle_progress.json"

# カテゴリ別の検索半径（メートル）
RADIUS_BY_CATEGORY = {
    "shopping_mall": 30000,   # 30km
    "fitness_gym":   10000,   # 10km
    "cafe":           5000,   # 5km
    "cinema":        30000,   # 30km
    "supermarket":    5000,   # 5km
    "drugstore":      5000,   # 5km
    "home_center":   10000,   # 10km
    "restaurant":     5000,   # 5km
    "convenience_store": 3000, # 3km
}

# カテゴリ→stats_lifestyleカラムのマッピング
CATEGORY_TO_COLUMNS = {
    "shopping_mall":     {"count": "mall_count",         "best_tier": "mall_best_tier",    "best_name": "mall_best_name"},
    "fitness_gym":       {"count": "gym_count",          "best_tier": "gym_best_tier",     "best_name": "gym_best_name"},
    "cafe":              {"count": "cafe_count",         "best_tier": None,                "best_name": None},
    "cinema":            {"count": "cinema_count",       "best_tier": "cinema_best_tier",  "best_name": "cinema_best_name"},
    "supermarket":       {"count": "supermarket_count",  "best_tier": "supermarket_best_tier", "best_name": None},
    "drugstore":         {"count": "drugstore_count",    "best_tier": None,                "best_name": None},
    "home_center":       {"count": "homecenter_count",   "best_tier": None,                "best_name": "homecenter_best_name"},
    "restaurant":        {"count": "restaurant_chain_count", "best_tier": None,            "best_name": None},
}

TIER_ORDER = {"S": 6, "A": 5, "B": 4, "C": 3, "D": 2, "Trend": 1}


# ===========================================================
# brand_tiers_v1.json の読み込み
# ===========================================================
def load_brand_tiers(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["categories"]


def build_brand_lookup(categories: dict) -> dict:
    """
    {category: [{name_ja, aliases, overpass_tags, tier}, ...]}
    """
    lookup = {}
    for cat, data in categories.items():
        lookup[cat] = data.get("brands", [])
    return lookup


# ===========================================================
# Overpass API
# ===========================================================
def build_overpass_query(lat: float, lng: float, radius: int, brands: list) -> str:
    """
    指定座標の半径radius内で、brandsリストに含まれるブランドを検索するOverpass QL。
    node/way/relationすべて対象。
    """
    if not brands:
        return ""

    tag_conditions = []
    seen_vals = set()
    for brand in brands:
        for tag in brand.get("overpass_tags", []):
            key = tag["key"]
            val = tag["value"]
            if (key, val) in seen_vals:
                continue
            seen_vals.add((key, val))
            tag_conditions.append(f'way["{key}"="{val}"](around:{radius},{lat},{lng});')
            tag_conditions.append(f'relation["{key}"="{val}"](around:{radius},{lat},{lng});')

    if not tag_conditions:
        return ""

    conditions = "\n  ".join(tag_conditions)
    return f"""[out:json][timeout:{OVERPASS_TIMEOUT}];
(
  {conditions}
);
out center;
"""


def query_overpass(query: str, retry: int = 0) -> list:
    """Overpass APIにクエリを送信し、要素リストを返す。"""
    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=OVERPASS_TIMEOUT + 10
        )
        if resp.status_code == 429:
            wait = 60 * (retry + 1)
            print(f"    [Rate limit] {wait}秒待機...")
            time.sleep(wait)
            if retry < OVERPASS_MAX_RETRY:
                return query_overpass(query, retry + 1)
            return []
        if resp.status_code != 200:
            print(f"    [Error] Overpass HTTP {resp.status_code}")
            return []
        return resp.json().get("elements", [])
    except requests.exceptions.Timeout:
        print(f"    [Timeout] リトライ {retry+1}/{OVERPASS_MAX_RETRY}")
        if retry < OVERPASS_MAX_RETRY:
            time.sleep(10)
            return query_overpass(query, retry + 1)
        return []
    except Exception as e:
        print(f"    [Exception] {e}")
        return []


def match_brand(element: dict, brands: list) -> dict | None:
    """
    Overpass要素がbrandsリストのどれかにマッチするか判定。
    マッチしたブランド辞書を返す。
    """
    tags = element.get("tags", {})
    el_brand = tags.get("brand", "")
    el_name = tags.get("name", "")
    el_brand_en = tags.get("brand:en", "")

    for brand in brands:
        # overpass_tagsでマッチ
        for ot in brand.get("overpass_tags", []):
            val = ot["value"]
            if el_brand == val or el_brand_en == val:
                return brand
        # aliasesでマッチ
        for alias in brand.get("aliases", []):
            if el_name == alias or el_brand == alias:
                return brand
    return None


# ===========================================================
# 1市町村のデータ収集
# ===========================================================
def collect_municipality(
    municipality_id: str,
    lat: float,
    lng: float,
    brand_lookup: dict
) -> dict:
    """
    1市町村の全カテゴリデータを収集し、stats_lifestyleの行データを返す。
    """
    row = {
        "municipality_id": municipality_id,
        "overpass_collected_at": str(date.today()),
        # カフェ個別カウント
        "cafe_starbucks": 0,
        "cafe_komeda": 0,
        "cafe_tullys": 0,
        # ジムフラグ
        "gym_24h_count": 0,
        "gym_has_anytime": False,
        "gym_has_chocozap": False,
        # 映画館フラグ
        "cinema_has_imax": False,
        "cinema_has_4dx": False,
        # スーパー細分
        "supermarket_premium_count": 0,
        "supermarket_budget_count": 0,
        # 飲食細分
        "restaurant_family_count": 0,
        "restaurant_sushi_count": 0,
        "restaurant_gyudon_count": 0,
    }

    for category, brands in brand_lookup.items():
        if not brands:
            continue

        radius = RADIUS_BY_CATEGORY.get(category, 10000)
        query = build_overpass_query(lat, lng, radius, brands)
        if not query:
            continue

        elements = query_overpass(query)
        time.sleep(OVERPASS_RATE_LIMIT)

        # 発見された施設のブランドを集計
        found_brands = []
        for el in elements:
            matched = match_brand(el, brands)
            if matched:
                found_brands.append(matched)

        # 重複除去（同一施設のnode/wayが両方返る場合）
        seen_names = set()
        unique_brands = []
        for b in found_brands:
            key = b["name_ja"]
            if key not in seen_names:
                seen_names.add(key)
                unique_brands.append(b)

        count = len(unique_brands)
        col_map = CATEGORY_TO_COLUMNS.get(category, {})

        # 件数セット
        if col_map.get("count"):
            row[col_map["count"]] = count

        # best_tier / best_name
        if unique_brands and col_map.get("best_tier"):
            best = max(unique_brands, key=lambda b: TIER_ORDER.get(b.get("tier", "D"), 0))
            row[col_map["best_tier"]] = best.get("tier")
            if col_map.get("best_name"):
                row[col_map["best_name"]] = best.get("name_ja")

        # カテゴリ別の追加カウント
        if category == "cafe":
            for b in unique_brands:
                n = b["name_ja"]
                if "スターバックス" in n or "Starbucks" in n:
                    row["cafe_starbucks"] += 1
                elif "コメダ" in n:
                    row["cafe_komeda"] += 1
                elif "タリーズ" in n or "Tully" in n:
                    row["cafe_tullys"] += 1

        elif category == "fitness_gym":
            for b in unique_brands:
                n = b["name_ja"]
                if b.get("is_24h") or "エニタイム" in n or "チョコザップ" in n or "24" in n:
                    row["gym_24h_count"] += 1
                if "エニタイム" in n or "Anytime" in n:
                    row["gym_has_anytime"] = True
                if "チョコザップ" in n or "chocoZAP" in n:
                    row["gym_has_chocozap"] = True

        elif category == "cinema":
            for b in unique_brands:
                if b.get("has_imax"):
                    row["cinema_has_imax"] = True
                if b.get("has_4dx"):
                    row["cinema_has_4dx"] = True

        elif category == "supermarket":
            premium_keywords = ["成城石井", "紀伊國屋", "明治屋", "クイーンズ伊勢丹"]
            budget_keywords = ["業務スーパー", "ドン・キホーテ", "ドンキ", "ロピア"]
            for b in unique_brands:
                n = b["name_ja"]
                if any(k in n for k in premium_keywords):
                    row["supermarket_premium_count"] += 1
                elif any(k in n for k in budget_keywords):
                    row["supermarket_budget_count"] += 1

        elif category == "restaurant":
            family_keywords = ["ガスト", "サイゼリヤ", "デニーズ", "ジョナサン", "ファミリーレストラン", "バーミヤン"]
            sushi_keywords = ["スシロー", "くら寿司", "はま寿司", "かっぱ寿司"]
            gyudon_keywords = ["吉野家", "すき家", "松屋"]
            for b in unique_brands:
                n = b["name_ja"]
                if any(k in n for k in family_keywords):
                    row["restaurant_family_count"] += 1
                elif any(k in n for k in sushi_keywords):
                    row["restaurant_sushi_count"] += 1
                elif any(k in n for k in gyudon_keywords):
                    row["restaurant_gyudon_count"] += 1

    return row


# ===========================================================
# Supabase upsert
# ===========================================================
def upsert_batch(rows: list) -> bool:
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    for i in range(0, len(rows), SUPABASE_BATCH_SIZE):
        batch = rows[i:i + SUPABASE_BATCH_SIZE]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/stats_lifestyle",
            headers=headers,
            json=batch,
            timeout=30
        )
        if resp.status_code not in (200, 201):
            print(f"  [Upsert Error] {resp.status_code}: {resp.text[:200]}")
            return False
        print(f"  Batch {i//SUPABASE_BATCH_SIZE + 1}: {len(batch)}件 upsert完了")
    return True


# ===========================================================
# 進捗管理
# ===========================================================
def load_progress() -> set:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return set(json.load(f).get("done", []))
    return set()


def save_progress(done: set):
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"done": list(done)}, f)


# ===========================================================
# 市町村一覧取得
# ===========================================================
def fetch_municipalities(limit: int = None, target_id: str = None) -> list:
    """
    municipalitiesとstats_access_v2をJOINして座標付き市町村一覧を返す。
    座標はstats_access_v2.latitude / longitudeから取得。
    """
    KEY = SUPABASE_SERVICE_KEY or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    KEY = KEY.strip().strip('"').strip("'")
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
    }

    # stats_access_v2から座標を取得
    params = "select=municipality_id,latitude,longitude&latitude=not.is.null&order=municipality_id.asc"
    if target_id:
        params += f"&municipality_id=eq.{target_id}"
    if limit:
        params += f"&limit={limit}"

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/stats_access_v2?{params}",
        headers=headers,
        timeout=30
    )
    if resp.status_code != 200:
        print(f"[Error] 座標取得失敗: {resp.status_code}: {resp.text[:200]}")
        sys.exit(1)
    access_rows = resp.json()

    # 市町村名を取得
    ids = [r["municipality_id"] for r in access_rows]
    if not ids:
        print("[Error] 座標データが0件です")
        sys.exit(1)

    id_filter = "id=in.(" + ",".join(ids) + ")"
    resp2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipalities?select=id,name&{id_filter}",
        headers=headers,
        timeout=30
    )
    name_map = {r["id"]: r["name"] for r in resp2.json()}

    # マージ
    result = []
    for r in access_rows:
        mid = r["municipality_id"]
        result.append({
            "id": mid,
            "name": name_map.get(mid, mid),
            "lat": r["latitude"],
            "lng": r["longitude"],
        })
    return result


# ===========================================================
# メインループ
# ===========================================================
def main():
    parser = argparse.ArgumentParser(description="生活施設データ収集")
    parser.add_argument("--limit", type=int, help="処理件数の上限（テスト用）")
    parser.add_argument("--resume", action="store_true", help="中断再開モード")
    parser.add_argument("--municipality", type=str, help="特定市町村IDのみ処理")
    args = parser.parse_args()

    if not SUPABASE_SERVICE_KEY:
        print("[Error] SUPABASE_SERVICE_KEY が未設定です")
        print("  export SUPABASE_SERVICE_KEY='your-service-role-key'")
        sys.exit(1)

    # brand_tiers読み込み
    print("brand_tiers_v1.json を読み込み中...")
    categories = load_brand_tiers(BRAND_TIERS_PATH)
    brand_lookup = build_brand_lookup(categories)
    total_brands = sum(len(v) for v in brand_lookup.values())
    print(f"  {len(brand_lookup)}カテゴリ / {total_brands}ブランド 読み込み完了")

    # 市町村一覧取得
    municipalities = fetch_municipalities(
        limit=args.limit,
        target_id=args.municipality
    )
    print(f"対象市町村: {len(municipalities)}件")

    # 進捗読み込み
    done = load_progress() if args.resume else set()
    if done:
        print(f"  再開モード: {len(done)}件スキップ")

    # 収集ループ
    collected = []
    total = len(municipalities)
    for i, m in enumerate(municipalities):
        mid = m["id"]
        name = m["name"]
        lat = m.get("lat")
        lng = m.get("lng")

        if mid in done:
            continue
        if not lat or not lng:
            print(f"  [{i+1}/{total}] {name} ({mid}) — 座標なし、スキップ")
            continue

        print(f"  [{i+1}/{total}] {name} ({mid}) 収集中...")

        try:
            row = collect_municipality(mid, float(lat), float(lng), brand_lookup)
            collected.append(row)
            done.add(mid)

            # 10件ごとにupsert＆進捗保存
            if len(collected) >= 10:
                all_keys = set()
                for r in collected:
                    all_keys.update(r.keys())
                for r in collected:
                    for k in all_keys:
                        if k not in r:
                            r[k] = None
                print(f"  → {len(collected)}件をupsert...")
                upsert_batch(collected)
                save_progress(done)
                collected = []

        except KeyboardInterrupt:
            print("\n中断されました。進捗を保存中...")
            if collected:
                upsert_batch(collected)
            save_progress(done)
            print(f"  {len(done)}件完了済み。--resume で再開可能。")
            sys.exit(0)
        except Exception as e:
            print(f"  [Error] {name}: {e}")
            continue

    # 残りをupsert
    if collected:
        # キーの統一（一部502エラーでキーが欠けている場合の補完）
        all_keys = set()
        for r in collected:
            all_keys.update(r.keys())
        for r in collected:
            for k in all_keys:
                if k not in r:
                    r[k] = None
        print(f"  最終バッチ {len(collected)}件をupsert...")
        upsert_batch(collected)
        save_progress(done)

    print(f"\n完了！ {len(done)}件処理済み。")


if __name__ == "__main__":
    main()
