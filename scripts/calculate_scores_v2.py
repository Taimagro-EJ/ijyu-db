#!/usr/bin/env python3
"""
calculate_scores_v2.py — パーセンタイル正規化版（v6）
- 人口密度（1万人あたり施設数）をパーセンタイルで正規化
- 人口5万人未満はスコア上限30点（小村バイアス排除）
- 施設数の絶対数下限あり（0件施設で高密度になる問題を排除）
"""
import os, math, requests
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
           "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"}

def hybrid_score(count, population, min_pop=50000, min_count=1):
    if not population or population < min_pop or count < min_count:
        return None
    return count / (population / 10000)

def percentile_rank(values, target):
    valid = [v for v in values if v is not None]
    if not valid or target is None: return 0
    return round(sum(1 for v in valid if v <= target) / len(valid) * 100)

def main():
    print("=" * 55)
    print("calculate_scores_v2.py — パーセンタイル正規化版(v6)")
    print("=" * 55)

    data = requests.get(f"{SUPABASE_URL}/rest/v1/municipality_overview",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "*", "limit": 600}).json()
    print(f"取得: {len(data)}件")

    cats_fn = {
        "shopping":      lambda m: hybrid_score((m.get("mall_count") or 0)+(m.get("supermarket_count") or 0), m.get("total_population"), 50000, 2),
        "cafe":          lambda m: hybrid_score((m.get("cafe_starbucks") or 0)+(m.get("cafe_komeda") or 0), m.get("total_population"), 50000, 1),
        "fitness":       lambda m: hybrid_score((m.get("gym_24h_count") or 0)+(m.get("gym_count") or 0), m.get("total_population"), 50000, 2),
        "entertainment": lambda m: hybrid_score(m.get("cinema_count") or 0, m.get("total_population"), 50000, 1),
        "dining":        lambda m: hybrid_score(m.get("restaurant_chain_count") or 0, m.get("total_population"), 50000, 3),
        "grocery":       lambda m: hybrid_score((m.get("supermarket_count") or 0)+(m.get("drugstore_count") or 0), m.get("total_population"), 50000, 3),
        "family":        lambda m: hybrid_score((m.get("pediatric_clinics") or 0)+(m.get("child_welfare") or 0), m.get("total_population"), 50000, 1),
    }

    densities = {cat: [fn(m) for m in data] for cat, fn in cats_fn.items()}

    rows = []
    for idx, m in enumerate(data):
        mid = m.get("id")
        if not mid: continue
        pop = m.get("total_population") or 0

        scores = {}
        for cat_name, vals in densities.items():
            score = percentile_rank(vals, vals[idx])
            if pop < 50000:
                score = min(30, score)
            scores[f"score_{cat_name}"] = score

        rent = m.get("rent_1ldk_estimate") or 0
        rent_man = rent / 10000 if rent > 0 else 8
        rent_score = max(0, min(100, (15 - rent_man) / 12 * 100))
        avg_cat = sum(scores.values()) / len(scores)
        costperf = round(math.sqrt(avg_cat * rent_score), 1)

        default = round(avg_cat * 0.7 + costperf * 0.3)
        family  = round(scores["score_family"]*0.35 + scores["score_grocery"]*0.20 + scores["score_shopping"]*0.15 + costperf*0.30)
        remote  = round(scores["score_cafe"]*0.30 + scores["score_fitness"]*0.20 + scores["score_entertainment"]*0.15 + scores["score_dining"]*0.15 + costperf*0.20)
        active  = round(scores["score_fitness"]*0.40 + scores["score_entertainment"]*0.20 + scores["score_dining"]*0.20 + costperf*0.20)

        rows.append({"municipality_id": mid, **scores,
            "total_score": default, "total_score_family": family,
            "total_score_remote": remote, "total_score_active": active,
            "calculated_at": datetime.utcnow().isoformat(), "calculation_version": 6})

    rows.sort(key=lambda x: x["total_score"], reverse=True)
    for i, r in enumerate(rows): r["rank_total"] = i + 1
    rows.sort(key=lambda x: x["total_score_family"], reverse=True)
    for i, r in enumerate(rows): r["rank_family"] = i + 1
    rows.sort(key=lambda x: x["score_shopping"], reverse=True)
    for i, r in enumerate(rows): r["rank_shopping"] = i + 1

    print(f"upsert: {len(rows)}件")
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/lifestyle_scores", headers=HEADERS, json=batch)
        print(f"  {'✅' if r.status_code in (200,201) else '❌'} {i+len(batch)}件 ({r.status_code})")

    rows.sort(key=lambda x: x["rank_total"])
    id2name = {m["id"]: m["name"] for m in data}
    id2pop  = {m["id"]: m.get("total_population") for m in data}
    print("\n🏆 TOP10:")
    for r in rows[:10]:
        name = id2name.get(r["municipality_id"],"?")
        pop  = id2pop.get(r["municipality_id"]) or 0
        print(f'  {r["rank_total"]}位: {name}({pop//10000}万人) score={r["total_score"]} fitness={r["score_fitness"]}')

if __name__ == "__main__":
    main()
