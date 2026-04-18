import os, json, time, requests, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collections import defaultdict
from supabase import create_client

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
SUPA_URL = os.environ["SUPABASE_URL"]
SUPA_KEY = os.environ["SUPABASE_SERVICE_KEY"]
h = {"apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY}
SAMPLE_SIZE = 20
last_call = [0.0]

def gsi_reverse_geocode(lat, lng):
    elapsed = time.time() - last_call[0]
    if elapsed < 0.3:
        time.sleep(0.3 - elapsed)
    try:
        r = requests.get("https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress",
            params={"lat": lat, "lon": lng}, timeout=5)
        last_call[0] = time.time()
        if r.status_code == 200:
            return r.json().get("results", {}).get("muniCd")
    except Exception:
        last_call[0] = time.time()
    return None

def main():
    print("全市町村取得中...")
    all_munis = []
    offset = 0
    while True:
        resp = requests.get(f"{SUPA_URL}/rest/v1/municipalities",
            headers=h, params={"select": "id,prefecture_code", "limit": 1000, "offset": offset})
        batch = resp.json()
        all_munis.extend(batch)
        if len(batch) < 1000: break
        offset += 1000
    muni_pref = {m["id"]: m["prefecture_code"] for m in all_munis if m.get("prefecture_code")}
    pref_munis = defaultdict(list)
    for mid, pc in muni_pref.items():
        pref_munis[pc].append(mid)
    print("都道府県数:", len(pref_munis))

    results = {}
    sample_mismatches = []

    for pref_code in sorted(pref_munis.keys()):
        muni_ids = pref_munis[pref_code]
        ids_str = ",".join(muni_ids[:50])
        r = requests.get(f"{SUPA_URL}/rest/v1/facility_details", headers=h,
            params={"select": "id,municipality_id,facility_name,lat,lng",
                    "municipality_id": "in.(" + ids_str + ")",
                    "lat": "not.is.null", "limit": SAMPLE_SIZE})
        facilities = r.json()
        if not facilities:
            results[pref_code] = {"sampled": 0, "mismatches": 0, "cross_pref": 0}
            continue
        sampled = mismatches = cross = 0
        for fd in facilities:
            if not fd.get("lat") or not fd.get("lng"):
                continue
            true_id = gsi_reverse_geocode(round(float(fd["lat"]), 4), round(float(fd["lng"]), 4))
            sampled += 1
            if true_id and true_id != fd["municipality_id"]:
                mismatches += 1
                if true_id[:2] != pref_code:
                    cross += 1
                    if len(sample_mismatches) < 30:
                        sample_mismatches.append({"name": fd["facility_name"],
                            "current": fd["municipality_id"], "true": true_id,
                            "lat": fd["lat"], "lng": fd["lng"]})
        results[pref_code] = {"sampled": sampled, "mismatches": mismatches, "cross_pref": cross}
        rate = mismatches/sampled*100 if sampled else 0
        print(f"{pref_code}: sampled={sampled} mismatches={mismatches}({rate:.0f}%) cross={cross}")

    total_s = sum(r["sampled"] for r in results.values())
    total_m = sum(r["mismatches"] for r in results.values())
    total_c = sum(r["cross_pref"] for r in results.values())
    print("\n=== 全体サマリ ===")
    print("総サンプル:", total_s)
    if total_s:
        print(f"誤紐付け: {total_m} ({100*total_m/total_s:.1f}%)")
        print(f"県境越え: {total_c} ({100*total_c/total_s:.1f}%)")
        total_fac = sb.table("facility_details").select("id", count="exact").execute().count
        print(f"全{total_fac}件への外挿推定:")
        print(f"  誤紐付け推定: {int(total_m*total_fac/total_s)}件")
        print(f"  県境越え推定: {int(total_c*total_fac/total_s)}件")

    print("\n誤紐付け率TOP10:")
    rates = [(pc, r["mismatches"]/r["sampled"]*100 if r["sampled"] else 0, r)
             for pc, r in results.items() if r["sampled"] > 0]
    for pc, rate, r in sorted(rates, key=lambda x: -x[1])[:10]:
        print(f"  {pc}: {rate:.0f}% (sampled={r['sampled']}, cross={r['cross_pref']})")

    with open("/tmp/cross_pref_estimate.json", "w") as f:
        json.dump({"results": results, "sample_mismatches": sample_mismatches,
                   "totals": {"sampled": total_s, "mismatches": total_m, "cross_pref": total_c}},
                  f, ensure_ascii=False, indent=2)
    print("\n保存: /tmp/cross_pref_estimate.json")

if __name__ == "__main__":
    main()
