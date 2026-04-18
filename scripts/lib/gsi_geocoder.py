#!/usr/bin/env python3
"""
gsi_geocoder.py
国土地理院リバースジオコーダーAPIを使って座標→市区町村コードを取得する
ユーティリティモジュール。

使い方:
    from scripts.lib.gsi_geocoder import get_municipality_code
    code = get_municipality_code(36.698, 137.863)  # → '20485'
"""

import time
import requests
from functools import lru_cache

GSI_API_URL = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress"
_last_call_time = 0.0
_RATE_LIMIT_SEC = 0.3  # 300ms間隔


def get_municipality_code(lat: float, lng: float, timeout: int = 5) -> str | None:
    """
    座標から市区町村コード（5桁）を返す。
    取得できなければ None を返す。
    レート制限: 300ms/リクエスト
    """
    global _last_call_time
    elapsed = time.time() - _last_call_time
    if elapsed < _RATE_LIMIT_SEC:
        time.sleep(_RATE_LIMIT_SEC - elapsed)
    try:
        resp = requests.get(
            GSI_API_URL,
            params={"lat": lat, "lon": lng},
            timeout=timeout,
        )
        _last_call_time = time.time()
        if resp.status_code == 200:
            results = resp.json().get("results", {})
            return results.get("muniCd") or None
    except Exception:
        _last_call_time = time.time()
    return None


@lru_cache(maxsize=10000)
def get_municipality_code_cached(lat_r: float, lng_r: float) -> str | None:
    """
    座標を小数点3桁に丸めてキャッシュするバージョン。
    同一エリアの施設が多い場合にAPIコール数を削減。
    lat_r, lng_r は round(lat, 3), round(lng, 3) で渡すこと。
    """
    return get_municipality_code(lat_r, lng_r)


def find_municipality_by_coord(
    lat: float,
    lng: float,
    municipalities: list[dict],
    use_gsi: bool = True,
    max_km: float = 25.0,
) -> tuple[dict | None, float]:
    """
    座標から最適な市区町村を返す。
    use_gsi=True の場合: GSI APIで正確なコードを取得→municipalitiesから検索
    use_gsi=False の場合: 従来の最近傍計算のみ（フォールバック）
    """
    import math

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.asin(math.sqrt(a))

    if use_gsi:
        lat_r = round(lat, 3)
        lng_r = round(lng, 3)
        code = get_municipality_code_cached(lat_r, lng_r)
        if code:
            matched = next((m for m in municipalities if m["id"] == code), None)
            if matched:
                dist = haversine(lat, lng, float(matched["latitude"]), float(matched["longitude"]))
                return matched, dist

    # フォールバック: 最近傍
    best, best_dist = None, max_km
    for m in municipalities:
        try:
            d = haversine(lat, lng, float(m["latitude"]), float(m["longitude"]))
            if d < best_dist:
                best_dist, best = d, m
        except Exception:
            pass
    return best, best_dist
