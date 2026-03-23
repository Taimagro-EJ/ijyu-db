"""Type F: 意外な発見の自動検出"""
from .supabase_queries import get_all

SURPRISE_DETECTORS = [
    {"id": "high_score_low_population", "label": "人口3万以下なのに生活リアリティ指数が高い", "detect": lambda data: [r for r in data if (r.get("total_population") or 999999) < 30000 and (r.get("total_score") or 0) >= 65]},
    {"id": "starbucks_low_rent", "label": "スタバがあるのに家賃5万以下", "detect": lambda data: [r for r in data if (r.get("cafe_starbucks") or 0) >= 1 and (r.get("rent_1ldk_estimate") or 999999) <= 50000]},
    {"id": "cinema_rural", "label": "人口5万以下なのに映画館がある", "detect": lambda data: [r for r in data if (r.get("total_population") or 999999) < 50000 and (r.get("cinema_count") or 0) >= 1]},
    {"id": "tokyo_access_cheap", "label": "東京2時間以内なのに家賃4万以下", "detect": lambda data: [r for r in data if (r.get("time_to_tokyo") or 999) <= 120 and (r.get("rent_1ldk_estimate") or 999999) <= 40000]},
    {"id": "gym_rich_rural", "label": "人口10万以下なのに24hジムが2軒以上", "detect": lambda data: [r for r in data if (r.get("total_population") or 999999) < 100000 and (r.get("gym_24h_count") or 0) >= 2]},
]

def generate(outline: dict) -> dict:
    all_data = get_all()
    discoveries = []
    for det in SURPRISE_DETECTORS:
        matches = det["detect"](all_data)
        if matches:
            discoveries.append({"id": det["id"], "label": det["label"], "count": len(matches), "examples": [{"name": r.get("name"), "prefecture": r.get("prefecture"), "slug": r.get("slug"), "total_score": r.get("total_score"), "rent_1ldk_estimate": r.get("rent_1ldk_estimate"), "total_population": r.get("total_population")} for r in sorted(matches, key=lambda x: x.get("total_score") or 0, reverse=True)[:5]]})
    return {"total_municipalities": len(all_data), "discoveries": discoveries, "discovery_count": len(discoveries)}
