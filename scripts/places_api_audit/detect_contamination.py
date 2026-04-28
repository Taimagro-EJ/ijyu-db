"""
Task 2: Places API補完データの汚染検出
google_places由来レコードのブランド名ミスマッチを検出
"""
import os
from supabase import create_client
from collections import defaultdict

sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

def log(msg): print(msg)

log("=== Task 2: Places API汚染監査開始 ===")

# data_sourceカラム確認
r = sb.table('facility_details').select('id').eq('data_source', 'google_places').limit(1).execute()
log(f"google_places源データ確認: {len(r.data)}件")

# 全google_placesデータを取得
all_places = []
offset = 0
while True:
    batch = sb.table('facility_details').select(
        'id,category,facility_name,data_source,updated_at'
    ).eq('data_source', 'google_places').range(offset, offset+999).execute().data
    all_places.extend(batch)
    if len(batch) < 1000: break
    offset += 1000

log(f"google_places総件数: {len(all_places)}")

# カテゴリ別件数
cat_counts = defaultdict(int)
for r in all_places:
    cat_counts[r['category']] += 1
log("カテゴリ別:")
for k, v in sorted(cat_counts.items(), key=lambda x: -x[1]):
    log(f"  {k}: {v}件")

# ブランドマッチングルール
BRAND_RULES = [
    ('カルディ',   ['カルディ', 'KALDI']),
    ('モンベル',   ['モンベル', 'mont-bell', 'montbell']),
    ('ゼビオ',     ['ゼビオ', 'XEBIO', 'Super Sports XEBIO', 'Victoria']),
    ('ニトリ',     ['ニトリ', 'NITORI']),
    ('無印良品',   ['無印良品', 'MUJI']),
    ('コストコ',   ['コストコ', 'Costco']),
]

contamination = []
for row in all_places:
    name = row['facility_name'] or ''
    # どのブランドとして投入されたか特定（brand_nameカラムがあれば使う）
    matched_brand = None
    for brand, keywords in BRAND_RULES:
        if any(kw.lower() in name.lower() for kw in keywords):
            matched_brand = brand
            break
    
    if matched_brand is None:
        # どのブランドにも属さない → 汚染候補
        contamination.append({
            'id': row['id'],
            'category': row['category'],
            'facility_name': name,
            'expected_brand': 'UNKNOWN',
            'reason': 'no_brand_match',
            'updated_at': row['updated_at'],
        })

log(f"\n汚染候補: {len(contamination)}件")
log(f"正常（ブランドマッチ）: {len(all_places) - len(contamination)}件")

# カテゴリ別汚染件数
cont_by_cat = defaultdict(int)
for r in contamination:
    cont_by_cat[r['category']] += 1
log("汚染候補カテゴリ別:")
for k, v in sorted(cont_by_cat.items(), key=lambda x: -x[1]):
    log(f"  {k}: {v}件")

# サンプル出力（カテゴリ別5件）
log("\nサンプル（先頭10件）:")
for r in contamination[:10]:
    log(f"  [{r['category']}] {r['facility_name'][:50]}")

# staging投入
if contamination:
    for i in range(0, len(contamination), 100):
        batch = contamination[i:i+100]
        sb.table('places_api_contamination_candidates').upsert(batch).execute()
    log(f"\nplaces_api_contamination_candidatesに{len(contamination)}件投入完了")

log("\n=== Task 2完了 ===")
