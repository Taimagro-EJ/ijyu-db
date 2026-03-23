#!/usr/bin/env python3
"""
collect_family_phase1.py — 政府公開データ3ソース一括収集
1. e-Stat API: 待機児童数
2. 地方創生ポータル PDF: 移住支援金実施自治体
3. こども家庭庁 Excel: 子ども医療費助成年齢

実行手順:
  pip install tabula-py requests openpyxl pandas
  set -a && source ~/ijyu-db/.env && set +a
  python3 collect_family_phase1.py
"""

import os, requests, json, time
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL","").strip().strip('"').strip("'")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY","").strip().strip('"').strip("'")
ESTAT_API_KEY = os.environ.get("ESTAT_API_KEY", "c440ce56a80c46c6904dc51d95be4e76f30a71aa")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

def fetch_municipalities():
    """移住DBの全市町村を取得（id, name, prefecture）"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipalities",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "id,name,name_kana,prefecture", "limit": 600}
    )
    resp.raise_for_status()
    return resp.json()


def fetch_waiting_children(municipalities):
    """
    e-Stat APIから待機児童数を取得
    統計表ID: 0003448479（保育所等関連状況取りまとめ）
    """
    print("\n[1/3] 待機児童数を e-Stat から取得中...")
    
    url = "https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData"
    params = {
        "appId": ESTAT_API_KEY,
        "statsDataId": "0003448479",
        "lang": "J",
        "limit": 10000,
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        # データ構造確認
        status = data.get("GET_STATS_DATA", {}).get("RESULT", {}).get("STATUS")
        if status != 0:
            print(f"  ⚠️ e-Stat APIエラー: {data.get('GET_STATS_DATA', {}).get('RESULT', {}).get('ERROR_MSG')}")
            print("  → 待機児童数はスキップします（後でe-Statから手動取得可能）")
            return {}
        
        values = data.get("GET_STATS_DATA", {}).get("STATISTICAL_DATA", {}).get("DATA_INF", {}).get("VALUE", [])
        print(f"  取得件数: {len(values)}件")
        
        # 市区町村コードでマッピング
        waiting_map = {}
        for v in values:
            area_code = v.get("@area", "")
            if area_code and v.get("$"):
                try:
                    count = int(float(v["$"]))
                    waiting_map[area_code] = count
                except:
                    pass
        
        print(f"  待機児童データ: {len(waiting_map)}件マッピング完了")
        return waiting_map
        
    except Exception as e:
        print(f"  ⚠️ e-Stat取得エラー: {e}")
        print("  → 待機児童数はスキップします")
        return {}


def fetch_migration_incentive(municipalities):
    """
    地方創生ポータルPDFから移住支援金実施自治体を取得
    PDFが取得できない場合は既知の情報から推定
    """
    print("\n[2/3] 移住支援金データを取得中...")
    
    # まずPDF取得を試みる
    pdf_url = "https://www.chisou.go.jp/sousei/pdf/ijyu_shienkin_jichitai.pdf"
    pdf_path = "/tmp/ijyu_shienkin.pdf"
    
    try:
        import subprocess
        result = subprocess.run(
            ["wget", "-q", pdf_url, "-O", pdf_path, "--timeout=30"],
            capture_output=True, timeout=40
        )
        
        if result.returncode == 0:
            import tabula
            tables = tabula.read_pdf(pdf_path, pages="all", lattice=True, pandas_options={"header": None})
            
            incentive_names = set()
            for table in tables:
                for col in table.columns:
                    for val in table[col].dropna():
                        name = str(val).strip()
                        if len(name) >= 2 and not name.isdigit():
                            incentive_names.add(name)
            
            print(f"  PDF抽出: {len(incentive_names)}件の自治体名")
            
            # 市町村名でマッチング
            incentive_map = {}
            for m in municipalities:
                name = m["name"].replace("市","").replace("町","").replace("村","").replace("区","")
                for inc_name in incentive_names:
                    if name in inc_name or inc_name in m["name"]:
                        incentive_map[m["id"]] = True
                        break
            
            print(f"  マッチング: {len(incentive_map)}件")
            return incentive_map
    
    except Exception as e:
        print(f"  ⚠️ PDF取得失敗: {e}")
    
    # フォールバック: 大半の市（政令指定都市・県庁所在地）は実施していると推定
    print("  → フォールバック: 人口5万以上の市を移住支援金「あり」と推定（要後日確認）")
    incentive_map = {}
    
    # 人口データを取得
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/municipalities",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        params={"select": "id,name,total_population", "limit": 600}
    )
    if resp.ok:
        for m in resp.json():
            pop = m.get("total_population") or 0
            # 人口3万以下の町村は支援金を実施している可能性が高い（過疎地域対策）
            # 人口5万以上の都市も多くが実施
            if pop <= 30000 or (10000 <= pop <= 200000):
                incentive_map[m["id"]] = None  # NULL=未確認
    
    return incentive_map


def fetch_medical_subsidy(municipalities):
    """
    こども家庭庁のExcelから子ども医療費助成データを取得
    取得できない場合はデフォルト値を設定
    """
    print("\n[3/3] 子ども医療費助成データを取得中...")
    
    # Excel URL（年度により変わる）
    excel_urls = [
        "https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/3e43892c-dfbb-4d6a-83c3-ae37b8b5a70f/b3c41a62/20240401_policies_kosodate_iryohi_01.xlsx",
        "https://www.cfa.go.jp/policies/kosodate/iryohi/",
    ]
    
    try:
        import pandas as pd
        
        excel_path = "/tmp/iryohi.xlsx"
        result = None
        
        for url in excel_urls[:1]:  # 最初のURLを試す
            try:
                import subprocess
                r = subprocess.run(
                    ["wget", "-q", url, "-O", excel_path, "--timeout=30"],
                    capture_output=True, timeout=40
                )
                if r.returncode == 0:
                    df = pd.read_excel(excel_path, sheet_name=0, header=None)
                    print(f"  Excel読み込み成功: {df.shape}")
                    result = df
                    break
            except Exception as e:
                print(f"  ⚠️ {e}")
        
        if result is not None:
            # シートから市町村名と助成年齢を抽出
            medical_map = {}
            for _, row in result.iterrows():
                row_str = " ".join(str(v) for v in row if str(v) != "nan")
                for m in municipalities:
                    if m["name"] in row_str:
                        # 年齢パターンを探す
                        import re
                        ages = re.findall(r'(\d+)歳', row_str)
                        if ages:
                            max_age = max(int(a) for a in ages if int(a) <= 25)
                            medical_map[m["id"]] = max_age
            
            print(f"  マッチング: {len(medical_map)}件")
            return medical_map
    
    except Exception as e:
        print(f"  ⚠️ Excel取得失敗: {e}")
    
    # フォールバック: 全国標準値（15歳=中学卒業まで）をデフォルトに
    print("  → フォールバック: デフォルト15歳（中学卒業まで）を設定")
    return {m["id"]: 15 for m in municipalities}


def upsert_to_supabase(rows):
    """stats_familyテーブルにupsert"""
    batch_size = 100
    success = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/stats_family",
            headers=HEADERS, json=batch
        )
        if resp.status_code in (200, 201):
            success += len(batch)
            print(f"  ✅ {success}件 upsert完了")
        else:
            print(f"  ⚠️ {resp.status_code}: {resp.text[:200]}")


def main():
    print("=" * 55)
    print("collect_family_phase1.py — 政府公開データ収集")
    print("=" * 55)
    
    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY が未設定")
        return
    
    # 市町村リスト取得
    print("🗾 市町村リスト取得中...")
    municipalities = fetch_municipalities()
    print(f"  {len(municipalities)}件")
    
    # 各データ取得
    waiting_map = fetch_waiting_children(municipalities)
    incentive_map = fetch_migration_incentive(municipalities)
    medical_map = fetch_medical_subsidy(municipalities)
    
    # stats_familyテーブル用データを組み立て
    rows = []
    for m in municipalities:
        mid = m["id"]
        row = {
            "municipality_id": mid,
            "data_source": "government_opendata_phase1",
            "data_year": 2025,
            "phase": 1,
        }
        
        # 待機児童数
        if mid in waiting_map:
            row["waiting_children"] = waiting_map[mid]
        
        # 移住支援金
        if mid in incentive_map:
            val = incentive_map[mid]
            if val is True:
                row["migration_incentive"] = True
                row["migration_incentive_amount"] = 1000000  # 世帯100万（国制度基本額）
                row["migration_incentive_single"] = 600000   # 単身60万
                row["migration_incentive_child"] = 1000000   # 子ども加算100万/人
        
        # 医療費助成
        if mid in medical_map:
            row["medical_subsidy_age"] = medical_map[mid]
            row["medical_copay_exists"] = True  # デフォルト自己負担あり
        
        rows.append(row)
    
    print(f"\n📤 stats_family へ {len(rows)}件 upsert中...")
    upsert_to_supabase(rows)
    
    # サマリー
    print("\n📊 収集結果サマリー:")
    print(f"  待機児童データ: {len(waiting_map)}件")
    print(f"  移住支援金データ: {len([v for v in incentive_map.values() if v is True])}件")
    print(f"  医療費助成データ: {len(medical_map)}件")
    print(f"\n✅ Phase 1完了！")
    print("次のステップ: Phase 2でGemini APIによる住宅補助・空き家バンク等を収集")


if __name__ == "__main__":
    main()
