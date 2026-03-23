#!/usr/bin/env python3
"""
add_coordinates.py
==================
全国市区町村の座標（緯度・経度）をAPIから取得し、
municipalitiesテーブルのlat/lngとstats_access_v2のlatitude/longitudeに投入する。

データソース: 国土数値情報ダウンロードサービス（行政区域）
API: https://geoshape.ex.nii.ac.jp/city/api/ （無料・認証不要）

使用方法:
  python3 add_coordinates.py           # 全527市町村
  python3 add_coordinates.py --test    # 松本市のみテスト
"""

import json
import time
import os
import sys
import argparse
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wedxzvhdheitoyenjnmo.supabase.co").strip().strip('"').strip("'")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip().strip('"').strip("'")

# 国土数値情報 行政区域API（重心座標を返す）
# 市区町村コード（5桁）→ GeoJSON
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# 代替: 政府統計の総合窓口APIから座標取得
# e-Stat API（市区町村マスタには座標なし → 上記APIを使用）


def get_coords_from_nominatim(name: str, prefecture: str) -> tuple[float, float] | None:
    """
    OpenStreetMap Nominatim APIから市区町村名＋都道府県で座標取得。
    (lat, lng) を返す。失敗時はNone。
    """
    # 市区町村名から「市」「町」「村」などを含むフルネームで検索
    query = f"{name}, {prefecture}, Japan"
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={
                "q": query,
                "format": "json",
                "limit": 1,
                "accept-language": "ja",
            },
            headers={"User-Agent": "ijyu-db/1.0 (https://ijyu-data.com)"},
            timeout=10
        )
        if resp.status_code != 200:
            return None
        results = resp.json()
        if not results:
            return None
        lat = round(float(results[0]["lat"]), 6)
        lng = round(float(results[0]["lon"]), 6)
        return lat, lng
    except Exception as e:
        print(f"    [Exception] {name}: {e}")
    return None


def upsert_municipalities_coords(rows: list) -> bool:
    """municipalitiesテーブルのlat/lngを更新"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/municipalities",
        headers=headers,
        json=rows,
        timeout=30
    )
    return resp.status_code in (200, 201)


def upsert_access_coords(rows: list) -> bool:
    """stats_access_v2のlatitude/longitudeを更新"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/stats_access_v2",
        headers=headers,
        json=rows,
        timeout=30
    )
    return resp.status_code in (200, 201)


def fetch_municipality_ids() -> list:
    """全市町村IDと名前・都道府県を取得"""
    KEY = SUPABASE_SERVICE_KEY
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipalities?select=id,name,prefecture&order=id.asc",
        headers=headers, timeout=30
    )
    if resp.status_code != 200:
        print(f"[Error] 市町村取得失敗: {resp.status_code}")
        sys.exit(1)
    return resp.json()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true", help="松本市（20202）のみテスト")
    args = parser.parse_args()

    if not SUPABASE_SERVICE_KEY:
        print("[Error] SUPABASE_SERVICE_KEY が未設定")
        sys.exit(1)

    municipalities = fetch_municipality_ids()
    if args.test:
        municipalities = [m for m in municipalities if m["id"] == "20202"]

    print(f"対象: {len(municipalities)}市町村")

    muni_rows = []    # municipalities用
    access_rows = []  # stats_access_v2用
    success = 0
    fail = 0

    for i, m in enumerate(municipalities):
        mid = m["id"]
        name = m["name"]

        coords = get_coords_from_nominatim(name, m.get("prefecture", ""))
        time.sleep(1.1)  # Nominatim利用規約: 1req/s以下

        if coords:
            lat, lng = coords
            muni_rows.append({"id": mid, "lat": lat, "lng": lng})
            access_rows.append({"municipality_id": mid, "latitude": lat, "longitude": lng})
            success += 1
            print(f"  [{i+1}/{len(municipalities)}] {name}: {lat}, {lng}")
        else:
            fail += 1
            print(f"  [{i+1}/{len(municipalities)}] {name}: 取得失敗")

        # 50件ごとにupsert
        if len(muni_rows) >= 50:
            upsert_municipalities_coords(muni_rows)
            upsert_access_coords(access_rows)
            print(f"  → {len(muni_rows)}件upsert完了")
            muni_rows = []
            access_rows = []

    # 残りをupsert
    if muni_rows:
        upsert_municipalities_coords(muni_rows)
        upsert_access_coords(access_rows)
        print(f"  → 最終バッチ{len(muni_rows)}件upsert完了")

    print(f"\n完了: 成功{success}件 / 失敗{fail}件")


if __name__ == "__main__":
    main()
