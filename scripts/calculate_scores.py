#!/usr/bin/env python3
"""
calculate_scores.py — 3層構造版（Opus設計）
Layer 1: カバレッジスコア（何種類の施設があるか）
Layer 2: 充実度スコア（対数飽和）
Layer 3: コスパスコア（施設充実度 × 家賃の安さ）
"""

import os
import math
import requests
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wedxzvhdheitoyenjnmo.supabase.co").strip().strip('"').strip("'")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip().strip('"').strip("'")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# ===== Layer 1: カバレッジスコア =====
# (カラム名, 閾値, 配点)
COVERAGE_ITEMS = [
    ("mall_count",            1,  8),
    ("supermarket_count",     3, 10),
    ("cafe_starbucks",        1,  8),
    ("cafe_komeda",           1,  4),
    ("gym_count",             1,  7),
    ("gym_24h_count",         1,  8),
    ("cinema_count",          1, 10),
    ("drugstore_count",       3,  6),
    ("restaurant_chain_count",5,  7),
    ("homecenter_count",      1,  5),
    ("restaurant_sushi_count",1,  4),
    ("restaurant_gyudon_count",1, 3),
    ("supermarket_premium_count",1, 5),
    ("restaurant_family_count",1, 4),
    ("gym_has_anytime",       True, 6),
    ("cinema_has_imax",       True, 6),
]
# 合計配点: 101 → 100点スケールに正規化

# ===== Layer 2: 充実度スコア =====
SATURATION = {
    "shopping": 8, "cafe": 5, "fitness": 3,
    "entertainment": 2, "dining": 10, "family": 5,
}
CATEGORY_SUM = {
    "shopping":     ["mall_count", "supermarket_count", "homecenter_count", "drugstore_count"],
    "cafe":         ["cafe_starbucks", "cafe_komeda", "cafe_tullys"],
    "fitness":      ["gym_count"],
    "entertainment":["cinema_count"],
    "dining":       ["restaurant_chain_count"],
    "family":       ["restaurant_family_count"],
}
CATEGORY_WEIGHTS_L2 = {
    "shopping": 0.25, "cafe": 0.15, "fitness": 0.12,
    "entertainment": 0.13, "dining": 0.15, "family": 0.20,
}

# ===== ペルソナ別レイヤー重み =====
PERSONA_LAYER_WEIGHTS = {
    "default":      {"coverage": 0.40, "richness": 0.30, "costperf": 0.30},
    "family":       {"coverage": 0.50, "richness": 0.20, "costperf": 0.30},
    "remote_worker":{"coverage": 0.35, "richness": 0.35, "costperf": 0.30},
    "active_senior":{"coverage": 0.45, "richness": 0.25, "costperf": 0.30},
    "budget":       {"coverage": 0.25, "richness": 0.15, "costperf": 0.60},
}


def coverage_score(m: dict) -> float:
    total = 0
    max_points = sum(pts for _, _, pts in COVERAGE_ITEMS)
    for col, threshold, points in COVERAGE_ITEMS:
        val = m.get(col) or 0
        if isinstance(threshold, bool):
            if bool(val) == threshold:
                total += points
        else:
            if val >= threshold:
                total += points
    return round(total / max_points * 100, 1)


def richness_score(m: dict) -> float:
    total = 0.0
    for cat, columns in CATEGORY_SUM.items():
        count = sum(m.get(col) or 0 for col in columns)
        sat = SATURATION[cat]
        weight = CATEGORY_WEIGHTS_L2[cat]
        if count <= 0:
            cat_score = 0.0
        else:
            cat_score = min(100.0, math.log(count + 1) / math.log(sat + 1) * 100)
        total += cat_score * weight
    return round(total, 1)


def costperf_score(m: dict, coverage: float, richness: float) -> float:
    rent = m.get("rent_1ldk_estimate") or 0
    if rent <= 0:
        return 50.0
    facility = (coverage + richness) / 2
    # 家賃スコア: 3万=100点、5万=75点、7万=50点、10万=25点、15万=0点
    rent_man = rent / 10000
    rent_score = max(0.0, min(100.0, (15 - rent_man) / 12 * 100))
    if facility <= 0 or rent_score <= 0:
        return 0.0
    return round(math.sqrt(facility * rent_score), 1)


def life_reality_index(m: dict) -> dict:
    cov = coverage_score(m)
    rich = richness_score(m)
    cp = costperf_score(m, cov, rich)

    scores = {"coverage_score": cov, "richness_score": rich, "costperf_score": cp}

    for persona, weights in PERSONA_LAYER_WEIGHTS.items():
        total = cov * weights["coverage"] + rich * weights["richness"] + cp * weights["costperf"]
        scores[f"lifestyle_score_{persona}"] = round(total, 1)

    scores["lifestyle_score"] = scores["lifestyle_score_default"]
    return scores


def fetch_all() -> list:
    """municipality_overview（施設+統計を含むビュー）から全量取得"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipality_overview",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "*", "limit": 600}
    )
    resp.raise_for_status()
    return resp.json()


def upsert_scores(rows: list):
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/lifestyle_scores",
            headers=HEADERS, json=batch
        )
        if resp.status_code not in (200, 201):
            print(f"  ⚠️ {resp.status_code}: {resp.text[:200]}")
        else:
            print(f"  ✅ {i+len(batch)}件 upsert完了")


def main():
    print("=" * 55)
    print("calculate_scores.py — 3層構造版（Opus設計）")
    print("=" * 55)

    print("📥 municipality_overview 取得中...")
    data = fetch_all()
    print(f"  {len(data)}件取得")

    rows = []
    for m in data:
        mid = m.get("id")
        if not mid:
            continue
        scores = life_reality_index(m)
        rows.append({
            "municipality_id":        mid,
            "score_shopping":         round(scores["coverage_score"]),
            "score_fitness":          round(scores["richness_score"]),
            "score_cafe":             round(scores["costperf_score"]),
            "score_entertainment":    round(scores.get("lifestyle_score_budget", 0)),
            "score_grocery":          round(scores.get("lifestyle_score_family", 0)),
            "score_dining":           round(scores.get("lifestyle_score_remote_worker", 0)),
            "score_family":           round(scores.get("lifestyle_score_active_senior", 0)),
            "total_score":            round(scores["lifestyle_score"]),
            "total_score_family":     round(scores.get("lifestyle_score_family", 0)),
            "total_score_remote":     round(scores.get("lifestyle_score_remote_worker", 0)),
            "total_score_active":     round(scores.get("lifestyle_score_active_senior", 0)),
            "calculated_at":          datetime.utcnow().isoformat(),
            "calculation_version":    3,
        })

    # ランキング
    rows.sort(key=lambda x: x["total_score"], reverse=True)
    for i, r in enumerate(rows): r["rank_total"] = i + 1
    rows.sort(key=lambda x: x["score_grocery"], reverse=True)
    for i, r in enumerate(rows): r["rank_family"] = i + 1
    rows.sort(key=lambda x: x["score_shopping"], reverse=True)
    for i, r in enumerate(rows): r["rank_shopping"] = i + 1

    print(f"\n📤 lifestyle_scores へ {len(rows)}件 upsert中...")
    upsert_scores(rows)

    # TOP20表示
    id_to_name = {}
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipalities",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "id,name,prefecture", "limit": 600}
    )
    for m in resp.json():
        id_to_name[m["id"]] = f"{m['name']}（{m['prefecture']}）"

    top20 = sorted(rows, key=lambda x: x["total_score"], reverse=True)[:20]
    print("\n🏆 生活リアリティ指数 TOP20（3層スコア）:")
    for r in top20:
        name = id_to_name.get(r["municipality_id"], r["municipality_id"])
        print(f"  {r['rank_total']:3d}位 {name} score={r['total_score']}")

    # スコア分布
    all_scores = sorted(r["total_score"] for r in rows)
    n = len(all_scores)
    print(f"\n📊 スコア分布:")
    print(f"  最低: {all_scores[0]} / 中央値: {all_scores[n//2]} / 最高: {all_scores[-1]}")
    print(f"  75点以上: {sum(1 for s in all_scores if s >= 75)}件")
    print(f"  60-74点:  {sum(1 for s in all_scores if 60 <= s < 75)}件")
    print(f"  45-59点:  {sum(1 for s in all_scores if 45 <= s < 60)}件")
    print(f"  30-44点:  {sum(1 for s in all_scores if 30 <= s < 45)}件")
    print(f"  30点未満: {sum(1 for s in all_scores if s < 30)}件")
    print(f"\n✅ 完了！ {len(rows)}件処理")


if __name__ == "__main__":
    main()
