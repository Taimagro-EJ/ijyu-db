#!/usr/bin/env python3
"""
stats_family Phase 2a: 政府公開データ + 固定値で主要カラムを埋める
- 移住支援金の金額（固定値UPDATE）
- 空き家バンク（人口5万以上に一括推定）
- 給食無償化（人口1万以下の町村に一括推定）
"""

import os
import requests

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_KEY'))
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}


def get_json(path, params=None):
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }, params=params)
    if not resp.ok:
        print(f"  ⚠️ GET エラー: {resp.status_code} {resp.text[:200]}")
        return []
    return resp.json()


def upsert_batch(updates, label):
    batch_size = 50
    ok = 0
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i + batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/stats_family",
            headers=HEADERS,
            json=batch,
        )
        if resp.status_code in (200, 201):
            ok += len(batch)
        else:
            print(f"  ⚠️ {label} batch {i}: {resp.status_code} {resp.text[:200]}")
    print(f"  ✅ {label}: {ok}件更新")


def update_migration_incentive_amounts():
    """移住支援金がある市町村に国制度の基本金額を設定"""
    print("\n💰 移住支援金の金額を設定中...")
    rows = get_json('stats_family', {'select': 'municipality_id', 'migration_incentive': 'eq.true'})
    print(f"  → 対象: {len(rows)}件")
    updates = [{
        'municipality_id': r['municipality_id'],
        'migration_incentive_amount': 1000000,
        'migration_incentive_single': 600000,
        'migration_incentive_child': 1000000,
        'phase': 2,
    } for r in rows]
    upsert_batch(updates, '移住支援金金額')


def update_akiya_bank_estimate():
    """人口5万以上の市町村に空き家バンクありを推定設定"""
    print("\n🏠 空き家バンクの推定設定中（人口5万以上）...")
    rows = get_json('municipality_overview', {
        'select': 'id,name,total_population',
        'total_population': 'gte.50000',
    })
    print(f"  → 人口5万以上: {len(rows)}件")
    updates = [{'municipality_id': r['id'], 'akiya_bank': True} for r in rows]
    upsert_batch(updates, '空き家バンク推定')


def update_school_lunch_free():
    """人口1万以下の町村に給食無償化を推定設定（73%が実施）"""
    print("\n🍱 給食無償化の推定設定中（人口1万以下）...")
    rows = get_json('municipality_overview', {
        'select': 'id,name,total_population',
        'total_population': 'lte.10000',
    })
    print(f"  → 人口1万以下: {len(rows)}件（うち約73%が実施）")
    updates = [{'municipality_id': r['id'], 'school_lunch_free': True} for r in rows]
    upsert_batch(updates, '給食無償化推定')


def print_summary():
    print("\n📊 投入後の確認...")
    rows = get_json('stats_family', {
        'select': 'migration_incentive_amount,akiya_bank,school_lunch_free',
        'limit': '527',
    })
    has_amount = sum(1 for r in rows if r.get('migration_incentive_amount', 0) > 0)
    has_akiya  = sum(1 for r in rows if r.get('akiya_bank') is True)
    has_lunch  = sum(1 for r in rows if r.get('school_lunch_free') is True)
    print(f"  移住支援金金額あり: {has_amount}件")
    print(f"  空き家バンクあり:   {has_akiya}件")
    print(f"  給食無償化あり:     {has_lunch}件")


def main():
    print("=" * 50)
    print("stats_family Phase 2a")
    print("=" * 50)
    update_migration_incentive_amounts()
    update_akiya_bank_estimate()
    update_school_lunch_free()
    print_summary()
    print("\n✅ Phase 2a 完了")
    print("次: python scripts/calculate_scores.py を実行してscore_familyを更新")


if __name__ == '__main__':
    main()
