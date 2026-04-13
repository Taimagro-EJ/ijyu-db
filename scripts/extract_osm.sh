#!/bin/bash
# Geofabrik pbfから施設データを抽出するスクリプト
# 実行: bash scripts/extract_osm.sh

PBF="$HOME/ijyu-db/data/japan-latest.osm.pbf"
DATA="$HOME/ijyu-db/data"

echo "🗺 OSM施設データ抽出開始"

# カフェ（スタバ・コメダ・タリーズ）
echo "☕ カフェ抽出中..."
osmium tags-filter "$PBF" \
  nwr/brand=スターバックス \
  nwr/brand=Starbucks \
  nwr/brand=コメダ珈琲店 \
  nwr/brand="Tully's Coffee" \
  nwr/brand=タリーズコーヒー \
  nwr/amenity=cafe \
  -o "$DATA/cafes.osm.pbf" --overwrite || true
osmium export "$DATA/cafes.osm.pbf" -o "$DATA/cafes.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/cafes.geojson')); print(len(d['features']))")件"

# ジム
echo "🏋️ ジム抽出中..."
osmium tags-filter "$PBF" \
  nwr/brand=エニタイムフィットネス \
  nwr/brand="Anytime Fitness" \
  nwr/brand=chocoZAP \
  nwr/brand=チョコザップ \
  nwr/brand=JOYFIT \
  nwr/brand=JOYFIT24 \
  nwr/brand=ゴールドジム \
  nwr/leisure=fitness_centre \
  nwr/leisure=sports_centre \
  -o "$DATA/gyms.osm.pbf" --overwrite || true
osmium export "$DATA/gyms.osm.pbf" -o "$DATA/gyms.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/gyms.geojson')); print(len(d['features']))")件"

# 映画館
echo "🎬 映画館抽出中..."
osmium tags-filter "$PBF" \
  nwr/amenity=cinema \
  -o "$DATA/cinemas.osm.pbf" --overwrite || true
osmium export "$DATA/cinemas.osm.pbf" -o "$DATA/cinemas.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/cinemas.geojson')); print(len(d['features']))")件"

# モール
echo "🛒 モール抽出中..."
osmium tags-filter "$PBF" \
  nwr/shop=mall \
  nwr/shop=department_store \
  nwr/shop=supermarket \
  -o "$DATA/malls.osm.pbf" --overwrite || true
osmium export "$DATA/malls.osm.pbf" -o "$DATA/malls.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/malls.geojson')); print(len(d['features']))")件"

echo "✅ 全カテゴリ抽出完了"

# スーパーマーケット抽出
osmium tags-filter data/japan-latest.osm.pbf \
  nwr/shop=supermarket \
  -o data/supermarkets.osm.pbf || true
osmium export data/supermarkets.osm.pbf -o data/supermarkets.geojson --geometry-types=point,polygon

# コンビニ抽出
osmium tags-filter data/japan-latest.osm.pbf \
  nwr/shop=convenience \
  -o data/convenience.osm.pbf || true
osmium export data/convenience.osm.pbf -o data/convenience.geojson --geometry-types=point,polygon

# ユニクロ・GU（アパレル）
echo "👕 ユニクロ・GU抽出中..."
osmium tags-filter "$PBF" \
  nwr/brand=ユニクロ \
  nwr/brand=UNIQLO \
  nwr/brand=GU \
  nwr/brand="ジーユー" \
  -o "$DATA/clothes.osm.pbf" --overwrite || true
osmium export "$DATA/clothes.osm.pbf" -o "$DATA/clothes.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/clothes.geojson')); print(len(d['features']))")件"

# 第2弾ブランド（専門店）
echo "🏬 第2弾専門店抽出中..."
osmium tags-filter "$PBF" \
  nwr/brand=IKEA \
  nwr/brand=イケア \
  nwr/brand=カルディコーヒーファーム \
  nwr/brand="KALDI COFFEE FARM" \
  nwr/brand=ヨドバシカメラ \
  nwr/brand=ビックカメラ \
  nwr/brand=モンベル \
  nwr/brand="mont-bell" \
  nwr/brand=スノーピーク \
  nwr/brand="Snow Peak" \
  nwr/brand=ゼビオ \
  nwr/brand=スポーツゼビオ \
  nwr/brand=セリア \
  nwr/brand="3COINS" \
  nwr/brand=スリーコインズ \
  -o "$DATA/specialty.osm.pbf" --overwrite || true
osmium export "$DATA/specialty.osm.pbf" -o "$DATA/specialty.geojson" --overwrite || true
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/specialty.geojson')); print(len(d['features']))")件"

# ドラッグストア
echo "💊 ドラッグストア抽出中..."
osmium tags-filter "$PBF" \
  nwr/shop=chemist \
  nwr/shop=pharmacy \
  nwr/amenity=pharmacy \
  -o "$DATA/drugstores.osm.pbf" --overwrite || true
osmium export "$DATA/drugstores.osm.pbf" -o "$DATA/drugstores.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/drugstores.geojson')); print(len(d['features']))")件"

# ホームセンター
echo "🔨 ホームセンター抽出中..."
osmium tags-filter "$PBF" \
  nwr/shop=doityourself \
  nwr/shop=hardware \
  nwr/shop=garden_centre \
  -o "$DATA/homecenters.osm.pbf" --overwrite || true
osmium export "$DATA/homecenters.osm.pbf" -o "$DATA/homecenters.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/homecenters.geojson')); print(len(d['features']))")件"

# ニトリ・無印良品・コストコ（ブランド名指定）
echo "🏬 ニトリ・無印・コストコ抽出中..."
osmium tags-filter "$PBF" \
  nwr/brand=ニトリ \
  nwr/brand=NITORI \
  nwr/brand=無印良品 \
  nwr/brand=MUJI \
  nwr/brand=コストコ \
  nwr/brand=Costco \
  nwr/brand="Costco Wholesale" \
  nwr/shop=furniture \
  nwr/shop=variety_store \
  nwr/shop=wholesale \
  -o "$DATA/brands_section_e.osm.pbf" --overwrite || true
osmium export "$DATA/brands_section_e.osm.pbf" -o "$DATA/brands_section_e.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/brands_section_e.geojson')); print(len(d['features']))")件"
