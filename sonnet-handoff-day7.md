# 移住DB Sonnet引き継ぎ Day7

**作成日:** 2026-03-29
**作成:** Claude Sonnet 4.6

---

## Day7 完了した作業

### デザインアイデンティティv2 ✅
- BIZ UDPGothicフォント（Noto Sans JPから変更）
- 背景テクスチャ（SVGノイズ opacity 0.03）
- 写真フィルター（brightness 1.03 / saturate 0.88）
- アースカラーパレット（CSS変数追加）
- Zen Maru Gothicフォント追加

### カード一覧ページ ✅
- Masonryレイアウト（CSS columns）
- カードバリエーション3種（featured/standard/compact）
  - TOP25: featuredカード（写真h=200px + TOPバッジ）
  - 7枚に1枚: compactカード（写真なし + 丸スコアバッジ）
- DiscoveryCard（今日の発見）をトップに追加（曜日ローテーション・7種）

### 詳細ページ ✅
- ヒーロー写真 + グラデーションオーバーレイ（h=320px）
- 市名・家賃・東京距離・気温・スコアのバッジオーバーレイ
- DataBarWithSource（プログレスバー + 数字の文脈 + データ出典）
  - 「4.2万円 → 東京の約0.4倍（かなり安い）」
  - 「108分 → 月数回の出社向け」
  - 出典: 気象庁/国土交通省/警察庁等を明記
- カテゴリ別スコアバーにアースカラー適用
- スコアの計算根拠の説明文追加
- データの限界セクション追加
- ChatへのCTAカード追加

### ブログ記事 ✅
- HTML露出9本 → Markdown再生成完了
- 全15本が公開状態に

---

## スライダー問題の根本原因（重要）

### 症状
フィットネス100%にしても上位の街がほぼ変わらない

### 原因
- score_fitnessが80点に張り付いている（527件中148件が80点）
- ジム数が絶対数ベースのスコアのため大都市が常に有利
- total_populationがNULL（人口あたり密度計算ができない）

### 解決策（Opusの設計書より）
1. stats_demographicsに年齢別人口データを収集（e-Stat）
2. calculate_scores.pyを「人口あたり密度スコア」に変更
3. 80点頭打ちが解消され、スライダーが意味のある動きをする

### e-Statの調査状況
- stats_demographicsテーブル: 作成済み（空）
- 正しい統計表ID: `0000030127`（年齢5歳階級 × 市区町村）
  - ただし1980年データのみ。2020年データのIDが未特定
- 次回: startPositionを変えながら2020年のIDを探す

---

## Opusの提言（Day7）

### UX改善
- スライダーはデフォルト折りたたみに → 既にisOpen=false ✅
- ホーム画面を「発見カード → TOP5 → ソート → 一覧」に再構成
- スライダーは上級者向けフィルター内に移動

### 次の優先作業
1. stats_demographics収集 → スコア改革（スライダーを意味のあるものに）
2. ホーム画面のTOP5セクション追加
3. Xリサーチ（「移住 迷う」「移住先 決められない」50件）

---

## 技術的知見

### google-generativeai の移行警告
```
FutureWarning: All support for the `google.generativeai` package has ended.
Please switch to the `google.genai` package.
```
→ 今すぐ壊れるわけではないが、次回スクリプト修正時に移行する

### ブログ再生成コマンド（アウトラインなし版）
~/regenerate_problem_posts.py は blog_outlines_v3.json に依存せず
直接Geminiに指示する版が ~/regenerate_problem_posts.py に存在

### Mac mini コマンド
```bash
cd ~/ijyu-db && source ~/venv311/bin/activate && set -a && source .env && set +a
```

---

## 次回作業順序

1. e-Stat 2020年市区町村別年齢データのID特定
2. collect_demographics.py実行（527件）
3. calculate_scores.pyに人口密度スコアを追加
4. スコア再計算 → スライダー動作確認
5. ホーム画面TOP5セクション追加
6. google-genai パッケージへの移行
