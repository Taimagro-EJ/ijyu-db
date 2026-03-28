# 移住DB — Claude Code プロジェクト記憶

## プロジェクト概要
日本の527市町村の生活データを横断比較できる移住検討プラットフォーム。
サイト: https://www.ijyu-data.com
GitHub: https://github.com/Taimagro-EJ/ijyu-db

## スタック
- フロントエンド: Next.js (App Router) / recharts
- バックエンド: Supabase (PostgreSQL, Tokyo region, project: ijyu-db)
- データ収集: Python 3.11 (venv311) / Geofabrik / e-Stat API / Gemini API
- デプロイ: Vercel (git push で自動)
- AI: Claude API (Haiku/Sonnet), Gemini Flash

## DB構造
- municipalities (527件): 基本情報・座標・slug
- stats_lifestyle (527件): 施設数・ブランドTier (Geofabrik方式で収集)
- stats_family (527件): 移住支援金・医療費助成・待機児童
- lifestyle_scores (527件): 3層スコア（カバレッジ/充実度/コスパ）
- blog_posts (15件公開): Gemini自動生成ブログ記事
- municipality_overview: 全テーブルJOINの統合ビュー（フロントはここから取得）

## スコアカラム名（重要）
lifestyle_scoresテーブルの実際のカラム名:
- score_shopping, score_cafe, score_dining, score_fitness
- score_entertainment, score_family, score_grocery
- total_score (= lifestyle_score), total_score_family, total_score_remote, total_score_active
- rank_total, rank_shopping, rank_family

## 重要な設計判断
- Overpass API → Geofabrik一括ダウンロード方式（67時間→10分）
- スコアリング: 3層構造（カバレッジ40% + 充実度30% + コスパ30%）
- ブログはChat UIへの誘導チャネル（PV目的ではない）
- Mac mini（母艦・バッチ処理）+ MacBook（開発・指揮）の2台体制
- コードはMacBookで書く。Mac miniではコードを書かない

## データ収集パターン
- Supabase REST API: requestsライブラリのみ（supabase-pyは使わない）
- upsert: headers に Prefer: resolution=merge-duplicates
- e-Stat: cdArea省略で全市町村一括取得 → Pythonでフィルタ

## 環境
- Python: ~/venv311 (Python 3.11)
- 起動: source ~/venv311/bin/activate
- 環境変数: ~/ijyu-db/.env

## やってはいけないこと
- Supabase Python client (supabase-py) を使う
- Python 3.14（pyroaringビルドが壊れる）
- Overpass APIへの527回個別クエリ
- macOS の sed -i（sed -i '' が正しい）
- コードをMac miniで直接編集してgit pushする
