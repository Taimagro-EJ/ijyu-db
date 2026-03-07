#!/usr/bin/env python3
"""
fetch_estat_data.py - ijyu-db
正しい指標コードに修正済みバージョン

使い方:
  export ESTAT_APP_ID="c440ce56a80c46c6904dc51d95be4e76f30a71aa"
  export SUPABASE_URL="https://wedxzvhdheitoyenjnmo.supabase.co"
  export SUPABASE_KEY="[service_role key]"
  python3 fetch_estat_data.py
"""

import os
import sys
import time
import json
import logging
from pathlib import Path
from datetime import datetime

import requests

# =====================================================
# 設定
# =====================================================
ESTAT_BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app/json"
ESTAT_APP_ID   = os.environ.get("ESTAT_APP_ID", "")
SUPABASE_URL   = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY   = os.environ.get("SUPABASE_KEY", "")

API_SLEEP = 1.0
DATA_DIR  = Path("./data")
DATA_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("fetch_log2.txt", encoding="utf-8"),
    ]
)
log = logging.getLogger(__name__)

# =====================================================
# 対象市区町村 50件
# =====================================================
TARGET_MUNICIPALITIES = [
    {"id": "01202", "prefecture_code": "01", "prefecture": "北海道",  "name": "函館市",   "name_kana": "はこだてし",   "region": "北海道", "slug": "hokkaido-hakodate"},
    {"id": "01207", "prefecture_code": "01", "prefecture": "北海道",  "name": "小樽市",   "name_kana": "おたるし",     "region": "北海道", "slug": "hokkaido-otaru"},
    {"id": "01208", "prefecture_code": "01", "prefecture": "北海道",  "name": "旭川市",   "name_kana": "あさひかわし", "region": "北海道", "slug": "hokkaido-asahikawa"},
    {"id": "02201", "prefecture_code": "02", "prefecture": "青森県",  "name": "青森市",   "name_kana": "あおもりし",   "region": "東北",   "slug": "aomori-aomori"},
    {"id": "03201", "prefecture_code": "03", "prefecture": "岩手県",  "name": "盛岡市",   "name_kana": "もりおかし",   "region": "東北",   "slug": "iwate-morioka"},
    {"id": "04100", "prefecture_code": "04", "prefecture": "宮城県",  "name": "仙台市",   "name_kana": "せんだいし",   "region": "東北",   "slug": "miyagi-sendai"},
    {"id": "08201", "prefecture_code": "08", "prefecture": "茨城県",  "name": "水戸市",   "name_kana": "みとし",       "region": "関東",   "slug": "ibaraki-mito"},
    {"id": "09201", "prefecture_code": "09", "prefecture": "栃木県",  "name": "宇都宮市", "name_kana": "うつのみやし", "region": "関東",   "slug": "tochigi-utsunomiya"},
    {"id": "10201", "prefecture_code": "10", "prefecture": "群馬県",  "name": "前橋市",   "name_kana": "まえばしし",   "region": "関東",   "slug": "gunma-maebashi"},
    {"id": "12201", "prefecture_code": "12", "prefecture": "千葉県",  "name": "千葉市",   "name_kana": "ちばし",       "region": "関東",   "slug": "chiba-chiba"},
    {"id": "14130", "prefecture_code": "14", "prefecture": "神奈川県","name": "川崎市",   "name_kana": "かわさきし",   "region": "関東",   "slug": "kanagawa-kawasaki"},
    {"id": "15201", "prefecture_code": "15", "prefecture": "新潟県",  "name": "新潟市",   "name_kana": "にいがたし",   "region": "関東",   "slug": "niigata-niigata"},
    {"id": "16201", "prefecture_code": "16", "prefecture": "富山県",  "name": "富山市",   "name_kana": "とやまし",     "region": "北陸",   "slug": "toyama-toyama"},
    {"id": "17201", "prefecture_code": "17", "prefecture": "石川県",  "name": "金沢市",   "name_kana": "かなざわし",   "region": "北陸",   "slug": "ishikawa-kanazawa"},
    {"id": "18201", "prefecture_code": "18", "prefecture": "福井県",  "name": "福井市",   "name_kana": "ふくいし",     "region": "北陸",   "slug": "fukui-fukui"},
    {"id": "19201", "prefecture_code": "19", "prefecture": "山梨県",  "name": "甲府市",   "name_kana": "こうふし",     "region": "甲信越", "slug": "yamanashi-kofu"},
    {"id": "20201", "prefecture_code": "20", "prefecture": "長野県",  "name": "長野市",   "name_kana": "ながのし",     "region": "甲信越", "slug": "nagano-nagano"},
    {"id": "20204", "prefecture_code": "20", "prefecture": "長野県",  "name": "松本市",   "name_kana": "まつもとし",   "region": "甲信越", "slug": "nagano-matsumoto"},
    {"id": "21201", "prefecture_code": "21", "prefecture": "岐阜県",  "name": "岐阜市",   "name_kana": "ぎふし",       "region": "東海",   "slug": "gifu-gifu"},
    {"id": "22100", "prefecture_code": "22", "prefecture": "静岡県",  "name": "静岡市",   "name_kana": "しずおかし",   "region": "東海",   "slug": "shizuoka-shizuoka"},
    {"id": "22203", "prefecture_code": "22", "prefecture": "静岡県",  "name": "浜松市",   "name_kana": "はままつし",   "region": "東海",   "slug": "shizuoka-hamamatsu"},
    {"id": "24201", "prefecture_code": "24", "prefecture": "三重県",  "name": "津市",     "name_kana": "つし",         "region": "東海",   "slug": "mie-tsu"},
    {"id": "25201", "prefecture_code": "25", "prefecture": "滋賀県",  "name": "大津市",   "name_kana": "おおつし",     "region": "近畿",   "slug": "shiga-otsu"},
    {"id": "26100", "prefecture_code": "26", "prefecture": "京都府",  "name": "京都市",   "name_kana": "きょうとし",   "region": "近畿",   "slug": "kyoto-kyoto"},
    {"id": "27140", "prefecture_code": "27", "prefecture": "大阪府",  "name": "大阪市",   "name_kana": "おおさかし",   "region": "近畿",   "slug": "osaka-osaka"},
    {"id": "28100", "prefecture_code": "28", "prefecture": "兵庫県",  "name": "神戸市",   "name_kana": "こうべし",     "region": "近畿",   "slug": "hyogo-kobe"},
    {"id": "29201", "prefecture_code": "29", "prefecture": "奈良県",  "name": "奈良市",   "name_kana": "ならし",       "region": "近畿",   "slug": "nara-nara"},
    {"id": "30201", "prefecture_code": "30", "prefecture": "和歌山県","name": "和歌山市", "name_kana": "わかやまし",   "region": "近畿",   "slug": "wakayama-wakayama"},
    {"id": "31201", "prefecture_code": "31", "prefecture": "鳥取県",  "name": "鳥取市",   "name_kana": "とっとりし",   "region": "中国",   "slug": "tottori-tottori"},
    {"id": "32201", "prefecture_code": "32", "prefecture": "島根県",  "name": "松江市",   "name_kana": "まつえし",     "region": "中国",   "slug": "shimane-matsue"},
    {"id": "33100", "prefecture_code": "33", "prefecture": "岡山県",  "name": "岡山市",   "name_kana": "おかやまし",   "region": "中国",   "slug": "okayama-okayama"},
    {"id": "34100", "prefecture_code": "34", "prefecture": "広島県",  "name": "広島市",   "name_kana": "ひろしまし",   "region": "中国",   "slug": "hiroshima-hiroshima"},
    {"id": "35203", "prefecture_code": "35", "prefecture": "山口県",  "name": "山口市",   "name_kana": "やまぐちし",   "region": "中国",   "slug": "yamaguchi-yamaguchi"},
    {"id": "36201", "prefecture_code": "36", "prefecture": "徳島県",  "name": "徳島市",   "name_kana": "とくしまし",   "region": "四国",   "slug": "tokushima-tokushima"},
    {"id": "37201", "prefecture_code": "37", "prefecture": "香川県",  "name": "高松市",   "name_kana": "たかまつし",   "region": "四国",   "slug": "kagawa-takamatsu"},
    {"id": "38201", "prefecture_code": "38", "prefecture": "愛媛県",  "name": "松山市",   "name_kana": "まつやまし",   "region": "四国",   "slug": "ehime-matsuyama"},
    {"id": "39201", "prefecture_code": "39", "prefecture": "高知県",  "name": "高知市",   "name_kana": "こうちし",     "region": "四国",   "slug": "kochi-kochi"},
    {"id": "40130", "prefecture_code": "40", "prefecture": "福岡県",  "name": "福岡市",   "name_kana": "ふくおかし",   "region": "九州",   "slug": "fukuoka-fukuoka"},
    {"id": "40205", "prefecture_code": "40", "prefecture": "福岡県",  "name": "久留米市", "name_kana": "くるめし",     "region": "九州",   "slug": "fukuoka-kurume"},
    {"id": "41201", "prefecture_code": "41", "prefecture": "佐賀県",  "name": "佐賀市",   "name_kana": "さがし",       "region": "九州",   "slug": "saga-saga"},
    {"id": "42201", "prefecture_code": "42", "prefecture": "長崎県",  "name": "長崎市",   "name_kana": "ながさきし",   "region": "九州",   "slug": "nagasaki-nagasaki"},
    {"id": "43100", "prefecture_code": "43", "prefecture": "熊本県",  "name": "熊本市",   "name_kana": "くまもとし",   "region": "九州",   "slug": "kumamoto-kumamoto"},
    {"id": "44201", "prefecture_code": "44", "prefecture": "大分県",  "name": "大分市",   "name_kana": "おおいたし",   "region": "九州",   "slug": "oita-oita"},
    {"id": "45201", "prefecture_code": "45", "prefecture": "宮崎県",  "name": "宮崎市",   "name_kana": "みやざきし",   "region": "九州",   "slug": "miyazaki-miyazaki"},
    {"id": "46201", "prefecture_code": "46", "prefecture": "鹿児島県","name": "鹿児島市", "name_kana": "かごしまし",   "region": "九州",   "slug": "kagoshima-kagoshima"},
    {"id": "47201", "prefecture_code": "47", "prefecture": "沖縄県",  "name": "那覇市",   "name_kana": "なはし",       "region": "沖縄",   "slug": "okinawa-naha"},
    {"id": "20213", "prefecture_code": "20", "prefecture": "長野県",  "name": "諏訪市",   "name_kana": "すわし",       "region": "甲信越", "slug": "nagano-suwa"},
    {"id": "22213", "prefecture_code": "22", "prefecture": "静岡県",  "name": "熱海市",   "name_kana": "あたみし",     "region": "東海",   "slug": "shizuoka-atami"},
    {"id": "32386", "prefecture_code": "32", "prefecture": "島根県",  "name": "海士町",   "name_kana": "あまちょう",   "region": "中国",   "slug": "shimane-ama"},
    {"id": "39341", "prefecture_code": "39", "prefecture": "高知県",  "name": "土佐町",   "name_kana": "とさちょう",   "region": "四国",   "slug": "kochi-tosa"},
]

# =====================================================
# 統計表IDと指標コード（実際のAPIレスポンスから確認済み）
# =====================================================
STATS_TABLES = {
    "stats_population": {
        "stat_id":  "0000020101",  # A 人口・世帯
        "cd_time":  "2020100000",
        "data_year": 2020,
        # 固定カラム（全市区町村で必ず存在するコードのみ）
        "columns": {
            "A1101":   "total_population",   # 総人口
            "A110101": "population_male",    # 男性人口
            "A110102": "population_female",  # 女性人口
            "A2101":   "households",         # 世帯数
            "A1601":   "births",             # 出生数
            "A1701":   "deaths",             # 死亡数
            "A1801":   "transfer_in",        # 転入数
            "A1901":   "transfer_out",       # 転出数
        },
        # 別途計算するカラム（値がない場合はNULLでOK）
        "derived": ["aging_rate", "youth_rate", "growth_rate"]
    },
    "stats_environment": {
        "stat_id":  "0000020102",  # B 自然環境
        "cd_time":  "2020100000",
        "data_year": 2020,
        "columns": {
            "B1101": "total_area",      # 総面積
            "B1103": "habitable_area",  # 可住地面積
            "B1401": "pop_density",     # 人口密度
        },
        "derived": []
    },
    "stats_economy": {
        "stat_id":  "0000020103",  # C 経済基盤
        "cd_time":  "2020100000",
        "data_year": 2020,
        "columns": {
            "C120110": "taxable_income",  # 課税対象所得
            "C120120": "taxpayers",       # 納税義務者数
            "C4101":   "establishments", # 事業所数（要確認）
        },
        "derived": ["avg_income"]
    },
    "stats_education": {
        "stat_id":  "0000020105",  # E 教育
        "cd_time":  "2020100000",
        "data_year": 2020,
        "columns": {
            "E1101": "elementary_schools",  # 小学校数
            "E1201": "junior_high",         # 中学校数
            "E1301": "high_schools",        # 高等学校数
            "E2101": "kindergartens",       # 幼稚園数
            "E2201": "nursery_schools",     # 保育所数
        },
        "derived": []
    },
    "stats_welfare": {
        "stat_id":  "0000020109",  # I 健康・医療
        "cd_time":  "2020100000",
        "data_year": 2020,
        "columns": {
            "I5101":  "nursing_facilities",  # 介護保険施設数
            "I510110": "hospitals",          # 介護老人福祉施設
            "I510120": "clinics",            # 介護老人保健施設
        },
        "derived": []
    },
    "stats_housing": {
        "stat_id":  "0000020108",  # H 居住
        "cd_time":  "2020100000",
        "data_year": 2020,
        "columns": {
            "H1800": "total_dwellings",  # 総住宅数
            "H1801": "owned_houses",     # 持ち家数
            "H1802": "rented_houses",    # 借家数
            "H1803": "avg_floor_area",   # 公営借家数（暫定）
        },
        "derived": []
    },
}


# =====================================================
# Supabase クライアント
# =====================================================
class SupabaseClient:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
        }

    def upsert(self, table, records):
        """全レコードのキーを統一してからupsert"""
        if not records:
            return True

        # 全レコードに存在するキーを統一（NULLで補完）
        all_keys = set()
        for r in records:
            all_keys.update(r.keys())
        normalized = []
        for r in records:
            row = {}
            for k in all_keys:
                v = r.get(k, None)
                if isinstance(v, float) and v == int(v):
                    v = int(v)
                row[k] = v
            normalized.append(row)

        endpoint = self.url + "/rest/v1/" + table
        headers = dict(self.headers)
        headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        r = requests.post(endpoint, json=normalized, headers=headers, timeout=30)
        if r.status_code not in (200, 201, 204):
            log.error("Supabase upsert error [%s]: %d %s", table, r.status_code, r.text[:300])
            return False
        return True

    def select(self, table, params="select=count"):
        endpoint = self.url + "/rest/v1/" + table + "?" + params
        r = requests.get(endpoint, headers=self.headers, timeout=30)
        if r.status_code != 200:
            log.error("Supabase select error [%s]: %d", table, r.status_code)
            return []
        return r.json()


# =====================================================
# e-Stat API クライアント
# =====================================================
class EStatClient:
    def __init__(self, app_id):
        self.app_id = app_id

    def get_stats_data(self, stats_data_id, area_code, cd_time):
        params = {
            "appId":       self.app_id,
            "statsDataId": stats_data_id,
            "cdArea":      area_code,
            "cdTime":      cd_time,
            "metaGetFlg":  "N",
            "cntGetFlg":   "N",
            "limit":       200,
        }
        try:
            r = requests.get(
                ESTAT_BASE_URL + "/getStatsData",
                params=params,
                timeout=20
            )
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            log.warning("API error (%s/%s): %s", area_code, stats_data_id, e)
            return None

    def extract_values(self, raw, column_map):
        result = {}
        try:
            value_list = raw["GET_STATS_DATA"]["STATISTICAL_DATA"]["DATA_INF"].get("VALUE", [])
            if isinstance(value_list, dict):
                value_list = [value_list]
            for item in value_list:
                cat = item.get("@cat01", "")
                val_str = item.get("$", "")
                if cat in column_map and val_str not in ("", "-", "***", "...", "X"):
                    col_name = column_map[cat]
                    try:
                        result[col_name] = float(val_str.replace(",", ""))
                    except ValueError:
                        pass
        except (KeyError, TypeError) as e:
            log.debug("extract error: %s", e)
        return result


# =====================================================
# メイン処理
# =====================================================
def main():
    log.info("=" * 60)
    log.info("ijyu-db データ収集スクリプト 開始（指標コード修正版）")
    log.info("対象市区町村: %d 件", len(TARGET_MUNICIPALITIES))
    log.info("=" * 60)

    if not ESTAT_APP_ID:
        log.error("ESTAT_APP_ID が設定されていません")
        sys.exit(1)

    use_supabase = bool(SUPABASE_URL and SUPABASE_KEY)
    if use_supabase:
        log.info("✅ Supabase モード: %s", SUPABASE_URL)
        db = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
    else:
        log.warning("⚠️  Supabase 未設定 → ローカルJSON保存モード")
        db = None

    estat = EStatClient(ESTAT_APP_ID)

    # Step 1: municipalities はすでに50件入っているのでスキップ
    log.info("\n📍 Step 1: municipalities は投入済み（スキップ）")

    # Step 2: 統計データ取得・投入
    log.info("\n📊 Step 2: 統計データ取得・投入")

    for table_name, config in STATS_TABLES.items():
        log.info("\n  テーブル: %s (stat_id=%s)", table_name, config["stat_id"])
        records = []

        for i, muni in enumerate(TARGET_MUNICIPALITIES):
            muni_id = muni["id"]
            log.info("    [%02d/%d] %s (%s)", i + 1, len(TARGET_MUNICIPALITIES), muni["name"], muni_id)

            raw = estat.get_stats_data(config["stat_id"], muni_id, config["cd_time"])
            time.sleep(API_SLEEP)

            if not raw:
                log.warning("      → APIエラー（スキップ）")
                continue

            values = estat.extract_values(raw, config["columns"])

            if not values:
                # デバッグ：実際のcat01コードを表示
                try:
                    vlist = raw["GET_STATS_DATA"]["STATISTICAL_DATA"]["DATA_INF"].get("VALUE", [])
                    if isinstance(vlist, dict): vlist = [vlist]
                    actual_cats = list(set(v.get("@cat01","") for v in vlist[:5]))
                    log.warning("      → 値が抽出できませんでした（実際のcat01: %s）", actual_cats)
                except Exception:
                    log.warning("      → 値が抽出できませんでした")
                continue

            record = {
                "municipality_id": muni_id,
                "data_year":       config["data_year"],
                "updated_at":      datetime.now().isoformat(),
                **values
            }

            # avg_income を計算
            if table_name == "stats_economy":
                ti = record.get("taxable_income")
                tp = record.get("taxpayers")
                if ti and tp and tp > 0:
                    record["avg_income"] = round(ti / tp, 1)

            # aging_rate / youth_rate を計算
            if table_name == "stats_population":
                total   = record.get("total_population")
                over65  = record.get("pop_over_65")
                under15 = record.get("pop_under_15")
                if total and total > 0:
                    if over65:
                        record["aging_rate"] = round(over65  / total * 100, 1)
                    if under15:
                        record["youth_rate"] = round(under15 / total * 100, 1)

            records.append(record)
            log.info("      → %d 項目取得", len(values))

        if records:
            if use_supabase:
                ok = db.upsert(table_name, records)
                log.info("  %s %s: %d 件", "✅" if ok else "❌", table_name, len(records))
            else:
                out = DATA_DIR / (table_name + ".json")
                out.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
                log.info("  → ローカル保存: %s", out)
        else:
            log.warning("  ⚠️  %s: 投入レコードなし", table_name)

    # Step 3: 完了確認
    log.info("\n" + "=" * 60)
    log.info("✅ 完了")
    if use_supabase:
        log.info("Supabase 件数確認:")
        for t in ["municipalities"] + list(STATS_TABLES.keys()):
            rows = db.select(t)
            log.info("  %s: %s", t, rows)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
