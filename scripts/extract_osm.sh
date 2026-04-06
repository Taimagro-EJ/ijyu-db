#!/bin/bash
# Geofabrik pbfから施設データを抽出するスクリプト
# 実行: bash scripts/extract_osm.sh

set -e
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
  -o "$DATA/cafes.osm.pbf" --overwrite
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
  -o "$DATA/gyms.osm.pbf" --overwrite
osmium export "$DATA/gyms.osm.pbf" -o "$DATA/gyms.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/gyms.geojson')); print(len(d['features']))")件"

# 映画館
echo "🎬 映画館抽出中..."
osmium tags-filter "$PBF" \
  nwr/amenity=cinema \
  -o "$DATA/cinemas.osm.pbf" --overwrite
osmium export "$DATA/cinemas.osm.pbf" -o "$DATA/cinemas.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/cinemas.geojson')); print(len(d['features']))")件"

# モール
echo "🛒 モール抽出中..."
osmium tags-filter "$PBF" \
  nwr/shop=mall \
  nwr/shop=department_store \
  nwr/shop=supermarket \
  -o "$DATA/malls.osm.pbf" --overwrite
osmium export "$DATA/malls.osm.pbf" -o "$DATA/malls.geojson" --overwrite
echo "  → $(python3 -c "import json; d=json.load(open('$DATA/malls.geojson')); print(len(d['features']))")件"

echo "✅ 全カテゴリ抽出完了"

# スーパーマーケット抽出
osmium tags-filter data/japan-latest.osm.pbf \
  nwr/shop=supermarket \
  -o data/supermarkets.osm.pbf
osmium export data/supermarkets.osm.pbf -o data/supermarkets.geojson --geometry-types=point,polygon

# コンビニ抽出
osmium tags-filter data/japan-latest.osm.pbf \
  nwr/shop=convenience \
  -o data/convenience.osm.pbf
osmium export data/convenience.osm.pbf -o data/convenience.geojson --geometry-types=point,polygon
