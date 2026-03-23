"""municipality_overview ビューからのデータ取得関数群"""
import os, requests
from statistics import mean, stdev

SUPABASE_URL = os.environ.get("SUPABASE_URL","").strip().strip('"').strip("'")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY","").strip().strip('"').strip("'")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
BASE_URL = f"{SUPABASE_URL}/rest/v1/municipality_overview"

def get_all(columns="*"):
    resp = requests.get(BASE_URL, headers=HEADERS, params={"select": columns, "limit": 600})
    resp.raise_for_status()
    return resp.json()

def filter_by_conditions(facility_filters=None, stat_conditions=None, order_by="lifestyle_score", order_desc=True, limit=15):
    params = {"select": "*", "order": f"{order_by}.{'desc' if order_desc else 'asc'}", "limit": limit}
    if facility_filters:
        for col, min_val in facility_filters.items():
            params[col] = f"gte.{min_val}"
    if stat_conditions:
        for col, (op, val) in stat_conditions.items():
            params[col] = f"{op}.{val}"
    resp = requests.get(BASE_URL, headers=HEADERS, params=params)
    resp.raise_for_status()
    return resp.json()

def get_outliers(metric, threshold_sigma=2.0):
    all_data = get_all(f"id,name,prefecture,slug,{metric}")
    vals = [r[metric] for r in all_data if r.get(metric) is not None]
    if len(vals) < 10:
        return []
    mu, sd = mean(vals), stdev(vals)
    return [r for r in all_data if r.get(metric) is not None and abs(r[metric] - mu) > threshold_sigma * sd]
