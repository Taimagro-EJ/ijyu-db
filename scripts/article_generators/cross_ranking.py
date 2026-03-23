"""Type A: 施設×条件クロスランキング記事データ生成"""
from .supabase_queries import filter_by_conditions, get_all

def generate(outline: dict) -> dict:
    facility_filter = outline.get("facility_filter", {})
    stat_conditions = {k: tuple(v) for k, v in outline.get("stat_conditions", {}).items()}
    results = filter_by_conditions(facility_filters=facility_filter, stat_conditions=stat_conditions, order_by="lifestyle_score", limit=15)
    total = len(get_all("id"))
    return {
        "total_municipalities": total,
        "filtered_count": len(results),
        "ranking": [{"rank": i+1, "name": r.get("name"), "prefecture": r.get("prefecture"), "slug": r.get("slug"), "total_score": r.get("total_score"), "rent_1ldk_estimate": r.get("rent_1ldk_estimate"), "time_to_tokyo": r.get("time_to_tokyo"), "cafe_starbucks": r.get("cafe_starbucks"), "gym_24h_count": r.get("gym_24h_count"), "cinema_count": r.get("cinema_count"), "criminal_rate": r.get("criminal_rate"), "mall_count": r.get("mall_count"), "mall_best_tier": r.get("mall_best_tier")} for i, r in enumerate(results)],
    }
