# Sonnet指示書: Day21 続編-7 — B案本体（全国データ基盤完成）

**作成日:** 2026-04-18
**作成:** Claude Opus 4.7
**対象:** Claude Code Sonnet
**主題:** B案Phase 1〜4を一気通貫で実施 — 全国データ基盤完成

---

## 0. 本指示書の位置づけ

### 背景: continued-6で判明した事実

- **全国施設の44.5%が誤紐付け**（82,151件推定）
- **県境越えは1.3%**（2,358件推定）に限定
- 46都道府県で**1,125自治体が本番municipalitiesに欠落**
- 長野県のみ完成済み（continued-4で完了）

### B案の狙い

全国データ基盤を一気に完成させる。  
長野県で確立した手順を、残り46都道府県に拡張する。

### このセッションで達成する目標

- [ ] Phase 1: 46都道府県の町村マージ完了（1,125件）
- [ ] Phase 2: 全国facility_details再紐付け完了（約18万件）
- [ ] Phase 3: 長野県以外で「欠落市」の影響を受けていた施設の補正
- [ ] Phase 4: 県境混入2,358件の解消
- [ ] 最終検証: 全1,720自治体のデータ健全性確認

**今回のセッションは夜間バッチを含むため長時間**。Phase 2のGSI再紐付けは約15時間の処理なので、**バックグラウンド実行+朝Eさんがレビュー**の流れ。

---

## 🚨 絶対ルール

1. **Phase境界ごとにOpus承認を経る**（4つのゲート）
2. **本番UPDATE/DELETEは必ずバックアップ作成後**
3. **大規模UPDATEは都道府県ブロック単位で分割実施**
4. **全処理はトランザクション内で（BEGIN/COMMIT/ROLLBACK）**
5. **Gemini API は今回も大量消費しない**
6. **Phase 2 は夜間バックグラウンド実行 — 開始時にEさんに時間を伝える**

---

## 🛠 SSHベストプラクティス（恒久再掲）

```
✅ 推奨パターン:
  1. ローカルでファイル作成 → scp 転送 → ssh 実行
  2. venv Python直接指定: /Users/eiji/venv311/bin/python3
  3. Mac mini SSH: eiji@100.111.136.105
  4. f-string内バックスラッシュ禁止（変数に切り出す）
  5. heredoc内のクォート取扱い不安定 → /tmp/scriptX.py 経由
```

---

## Phase 0: Pre-flight（30分）

### 0-A. 現状確認（SQL）

```sql
-- 現状のmunicipalities件数
SELECT COUNT(*) FROM municipalities;
-- 期待: 595

-- staging vs 本番の差分（再確認）
SELECT 
  s.prefecture_code,
  s.prefecture_name,
  COUNT(*) AS staging,
  COUNT(*) FILTER (WHERE s.id IN (SELECT id FROM municipalities)) AS in_prod,
  COUNT(*) FILTER (WHERE s.id NOT IN (SELECT id FROM municipalities)) AS missing
FROM municipalities_staging s
GROUP BY s.prefecture_code, s.prefecture_name
ORDER BY missing DESC;

-- facility_details の現状
SELECT COUNT(*) FROM facility_details;
-- 期待: 184,743

-- bakup テーブル一覧（既存を確認）
SELECT tablename FROM pg_tables 
WHERE tablename LIKE '%backup%' OR tablename LIKE '%staging%'
ORDER BY tablename;
```

### 0-B. マスターバックアップ作成

```sql
-- Phase開始前の完全バックアップ
CREATE TABLE municipalities_backup_pre_bplan AS 
SELECT * FROM municipalities;

CREATE TABLE facility_details_backup_pre_bplan AS 
SELECT * FROM facility_details;

-- 件数確認
SELECT 
  (SELECT COUNT(*) FROM municipalities_backup_pre_bplan) AS munis_backup,
  (SELECT COUNT(*) FROM facility_details_backup_pre_bplan) AS facilities_backup;
```

### 0-C. 都道府県ブロック分割の確定

**continued-5監査結果に基づく3ブロック分割**:

**ブロック A: 小〜中欠落県（32県）** — リスク低・件数少
```
欠落20件以下の県。まとめて一気に処理OK。
対象: 青森・岩手・秋田・山形・群馬・栃木・山梨・富山・石川・福井・岐阜・三重・滋賀・兵庫・奈良・和歌山・鳥取・島根・岡山・広島・山口・徳島・香川・愛媛・高知・佐賀・長崎・大分・宮崎・沖縄・新潟・静岡
※ 欠落数の多い10県は別ブロックに（下記ブロックB）
```

**ブロック B: 中規模欠落県（9県）** — 30-50件程度
```
埼玉41/福岡39/千葉37/茨城36/奈良36/熊本35/愛知34/鹿児島33/福島48
処理単位を県ごとに分けて慎重に
```

**ブロック C: 北海道**（1県）— 134件・特異
```
面積広い・町村多い・処理コスト特異。最後に単独処理。
```

**注意**: 監査結果の「奈良36」はブロックBに入れつつ、小規模県リストから外すこと。実数に合わせて順序調整可。

### Phase 0 成果物

- [ ] 現状サマリ（件数・差分・既存バックアップ一覧）
- [ ] マスターバックアップ作成完了
- [ ] ブロック分割表（都道府県コード別に明示）

**ゲート①: Opus承認 → Phase 1 着手**

---

## Phase 1: 町村マージ（60〜90分）

### 1-A. マージスクリプト（共通）

```python
# scripts/bplan/phase1_merge_municipalities.py
"""
municipalities_staging → 本番 municipalities に町村をマージする。
指定されたprefecture_codeのリストだけを対象とする（段階実行のため）。
"""
import os
import sys
from supabase import create_client

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def merge_prefecture(pref_code: str, dry_run: bool = True) -> dict:
    """指定都道府県の未マージ自治体を本番にINSERT"""
    # stagingから該当県を取得
    staging = sb.table("municipalities_staging").select("*").eq(
        "prefecture_code", pref_code
    ).execute().data
    
    # 本番に既にあるIDを除外
    existing_ids = {
        m["id"] for m in sb.table("municipalities").select("id").eq(
            "prefecture_code", pref_code
        ).execute().data
    }
    
    to_insert = [
        {
            "id": s["id"],
            "prefecture_code": s["prefecture_code"],
            "prefecture_name": s["prefecture_name"],
            "name": s["name"],
            "kind": s["kind"],
            "kana": s.get("kana"),
        }
        for s in staging if s["id"] not in existing_ids
    ]
    
    result = {
        "pref_code": pref_code,
        "staging_count": len(staging),
        "already_exists": len(existing_ids),
        "to_insert": len(to_insert),
        "inserted": 0,
    }
    
    if not to_insert:
        return result
    
    if dry_run:
        result["sample"] = to_insert[:3]
        return result
    
    # 100件ずつバッチINSERT
    for i in range(0, len(to_insert), 100):
        batch = to_insert[i:i+100]
        sb.table("municipalities").insert(batch).execute()
        result["inserted"] += len(batch)
    
    return result


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry"
    block = sys.argv[2] if len(sys.argv) > 2 else "A"  # A | B | C
    dry_run = (mode != "commit")
    
    BLOCKS = {
        "A": [
            "02", "03", "05", "06", "09", "10", "15", "16", "17", "18",
            "19", "21", "22", "24", "25", "28", "29", "30", "31", "32",
            "33", "34", "35", "36", "37", "38", "39", "41", "44", "45",
            "46", "47",
        ],
        "B": ["07", "08", "11", "12", "13", "14", "23", "26", "40", "43"],
        "C": ["01"],
    }
    
    pref_codes = BLOCKS.get(block, [])
    print(f"=== Phase 1 Block {block} ({'dry-run' if dry_run else 'commit'}) ===")
    print(f"対象県: {len(pref_codes)}県")
    
    total_inserted = 0
    for pref_code in pref_codes:
        r = merge_prefecture(pref_code, dry_run=dry_run)
        print(f"{pref_code}: staging={r['staging_count']} "
              f"existing={r['already_exists']} to_insert={r['to_insert']} "
              f"inserted={r['inserted']}")
        total_inserted += r["inserted"]
    
    print(f"\n合計 to_insert: ... / inserted: {total_inserted}")


if __name__ == "__main__":
    main()
```

### 1-B. 実行順序

```bash
# ローカルで作成 → scp
scp scripts/bplan/phase1_merge_municipalities.py eiji@100.111.136.105:/Users/eiji/ijyu-db/scripts/bplan/

ssh eiji@100.111.136.105 "mkdir -p /Users/eiji/ijyu-db/scripts/bplan"

# Block A: ドライラン
ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && /Users/eiji/venv311/bin/python3 scripts/bplan/phase1_merge_municipalities.py dry A"

# ドライラン結果 → opus-request に貼付 → Opus 承認後に commit

# Block A: commit
ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && /Users/eiji/venv311/bin/python3 scripts/bplan/phase1_merge_municipalities.py commit A"

# 同様に Block B → commit
# 同様に Block C → commit
```

### 1-C. 検証SQL

```sql
-- 各ブロックのマージ後サマリ
SELECT 
  prefecture_code,
  prefecture_name,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE kind = '市') AS cities,
  COUNT(*) FILTER (WHERE kind = '町') AS towns,
  COUNT(*) FILTER (WHERE kind = '村') AS villages
FROM municipalities
GROUP BY prefecture_code, prefecture_name
ORDER BY prefecture_code;
-- 期待: 47都道府県全て揃う

-- 全体件数
SELECT COUNT(*) FROM municipalities;
-- 期待: 1,720件前後
```

### Phase 1 成果物

- [ ] Block A ドライラン結果
- [ ] Block A コミット後の件数報告
- [ ] Block B ドライラン結果
- [ ] Block B コミット後の件数報告
- [ ] Block C ドライラン結果
- [ ] Block C コミット後の件数報告
- [ ] 最終: 47都道府県全ての自治体揃い確認

**ゲート②: Opus承認 → Phase 2 着手**

---

## Phase 2: 全国facility_details再紐付け（夜間バッチ・約15時間）

### 2-A. 実装戦略

継続-5 で作成済みの `scripts/lib/gsi_geocoder.py` を活用。  
**夜間バックグラウンド実行**（nohup）で、18万件すべてを国土地理院APIで検証。

### 2-B. 再紐付けスクリプト

```python
# scripts/bplan/phase2_rebind_all.py
"""
全国facility_details を国土地理院APIで再紐付け。
結果を facility_rebind_log テーブルに記録 + 本番UPDATE。

処理時間: 約18万件 × 0.3秒 = 約15時間
進捗はログに逐次出力・再実行時はresume可能。
"""
import os
import sys
import time
import json
from collections import defaultdict
from supabase import create_client

sys.path.insert(0, "/Users/eiji/ijyu-db/scripts")
from lib.gsi_geocoder import gsi_reverse_geocode

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def ensure_log_table():
    """ログテーブルがなければ作成"""
    # MCPで事前に作成すること（SQL直接実行のため、ここはコメントで明示）
    # CREATE TABLE IF NOT EXISTS facility_rebind_log (
    #   facility_id UUID PRIMARY KEY,
    #   old_id TEXT,
    #   new_id TEXT,
    #   status TEXT,  -- 'ok_update' | 'ok_nochange' | 'api_fail' | 'not_in_prod'
    #   processed_at TIMESTAMPTZ DEFAULT NOW()
    # );
    pass


def process_batch(facilities: list, dry_run: bool = True) -> dict:
    """バッチを処理 - 結果を集計して返す"""
    stats = {
        "total": len(facilities),
        "updated": 0,
        "unchanged": 0,
        "api_fail": 0,
        "not_in_prod": 0,
    }
    
    # 本番 municipality_id 一覧（キャッシュ）
    all_munis = {m["id"] for m in sb.table("municipalities").select("id").execute().data}
    
    updates = []
    logs = []
    
    for fd in facilities:
        if fd["lat"] is None or fd["lng"] is None:
            continue
        
        lat_r = round(float(fd["lat"]), 4)
        lng_r = round(float(fd["lng"]), 4)
        
        new_id = gsi_reverse_geocode(lat_r, lng_r)
        
        if new_id is None:
            stats["api_fail"] += 1
            logs.append({
                "facility_id": fd["id"],
                "old_id": fd["municipality_id"],
                "new_id": None,
                "status": "api_fail",
            })
            continue
        
        if new_id not in all_munis:
            # 真の自治体がまだ本番に無い（海外座標等）
            stats["not_in_prod"] += 1
            logs.append({
                "facility_id": fd["id"],
                "old_id": fd["municipality_id"],
                "new_id": new_id,
                "status": "not_in_prod",
            })
            continue
        
        if new_id == fd["municipality_id"]:
            stats["unchanged"] += 1
            logs.append({
                "facility_id": fd["id"],
                "old_id": fd["municipality_id"],
                "new_id": new_id,
                "status": "ok_nochange",
            })
            continue
        
        # 更新対象
        stats["updated"] += 1
        updates.append({
            "id": fd["id"],
            "municipality_id": new_id,
        })
        logs.append({
            "facility_id": fd["id"],
            "old_id": fd["municipality_id"],
            "new_id": new_id,
            "status": "ok_update",
        })
    
    if not dry_run:
        # ログ記録
        for i in range(0, len(logs), 100):
            sb.table("facility_rebind_log").upsert(logs[i:i+100]).execute()
        
        # 本番UPDATE（100件ずつ）
        for u in updates:
            sb.table("facility_details").update(
                {"municipality_id": u["municipality_id"]}
            ).eq("id", u["id"]).execute()
    
    return stats


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry"
    resume_from = sys.argv[2] if len(sys.argv) > 2 else None
    dry_run = (mode != "commit")
    
    # 既に処理済みのIDをresume用に取得
    processed_ids = set()
    if not dry_run:
        logs = sb.table("facility_rebind_log").select("facility_id").execute().data
        processed_ids = {l["facility_id"] for l in logs}
        print(f"既処理済: {len(processed_ids)}件")
    
    # 全facility_details を取得（resumeの場合は未処理のみ）
    all_facilities = sb.table("facility_details").select(
        "id, municipality_id, lat, lng"
    ).not_.is_("lat", "null").execute().data
    
    remaining = [f for f in all_facilities if f["id"] not in processed_ids]
    print(f"全件: {len(all_facilities)}, 残り: {len(remaining)}")
    
    # バッチサイズ500件（約2.5分/バッチ）
    BATCH_SIZE = 500
    total_stats = defaultdict(int)
    start_time = time.time()
    
    for i in range(0, len(remaining), BATCH_SIZE):
        batch = remaining[i:i+BATCH_SIZE]
        stats = process_batch(batch, dry_run=dry_run)
        
        for k, v in stats.items():
            total_stats[k] += v
        
        elapsed = time.time() - start_time
        processed = i + len(batch)
        rate = processed / elapsed if elapsed > 0 else 0
        eta = (len(remaining) - processed) / rate if rate > 0 else 0
        
        print(f"[{processed}/{len(remaining)}] "
              f"updated={total_stats['updated']} "
              f"unchanged={total_stats['unchanged']} "
              f"api_fail={total_stats['api_fail']} "
              f"not_in_prod={total_stats['not_in_prod']} "
              f"rate={rate:.1f}件/秒 ETA={eta/60:.1f}分")
    
    print(f"\n=== 完了 ===")
    print(json.dumps(dict(total_stats), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

### 2-C. 実行手順

```bash
# 1. ログテーブル作成（Supabase MCPで）
# CREATE TABLE facility_rebind_log (
#   facility_id UUID PRIMARY KEY,
#   old_id TEXT,
#   new_id TEXT,
#   status TEXT,
#   processed_at TIMESTAMPTZ DEFAULT NOW()
# );

# 2. ドライラン（100件だけ先にテスト）
ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && /Users/eiji/venv311/bin/python3 scripts/bplan/phase2_rebind_all.py dry | head -20"

# 3. 夜間バッチ開始（nohupでバックグラウンド実行）
ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && nohup /Users/eiji/venv311/bin/python3 scripts/bplan/phase2_rebind_all.py commit > ~/logs/bplan_phase2.log 2>&1 &"

# 4. PID記録
ssh eiji@100.111.136.105 "pgrep -f phase2_rebind_all"

# 5. 進捗確認コマンド（翌朝Eさん向け）
ssh eiji@100.111.136.105 "tail -30 ~/logs/bplan_phase2.log"

# 6. プロセス確認
ssh eiji@100.111.136.105 "ps aux | grep phase2_rebind_all | grep -v grep"

# 7. 万一エラー終了時のresume
# ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && nohup /Users/eiji/venv311/bin/python3 scripts/bplan/phase2_rebind_all.py commit resume > ~/logs/bplan_phase2_resume.log 2>&1 &"
```

### 2-D. 夜間監視の仕組み

進捗確認用SQL（Eさんが好きなタイミングで実行）:

```sql
-- 処理進捗
SELECT 
  status,
  COUNT(*) AS count,
  TO_CHAR(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM facility_rebind_log), 0), 'FM999.0') AS pct
FROM facility_rebind_log
GROUP BY status
ORDER BY count DESC;

-- 時間あたり処理速度
SELECT 
  DATE_TRUNC('hour', processed_at) AS hour,
  COUNT(*) AS processed_this_hour
FROM facility_rebind_log
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour DESC
LIMIT 10;

-- 更新された施設のサンプル
SELECT 
  l.old_id || ' → ' || l.new_id AS transition,
  COUNT(*)
FROM facility_rebind_log l
WHERE l.status = 'ok_update'
GROUP BY l.old_id, l.new_id
ORDER BY COUNT(*) DESC
LIMIT 30;
```

### Phase 2 成果物

- [ ] facility_rebind_log テーブル作成完了
- [ ] ドライラン結果（100件サンプル）
- [ ] nohup 起動確認（PID記録）
- [ ] 起動から30分後の進捗確認ログ
- [ ] 朝起動時に Eさん用進捗レポート準備

**夜間処理なのでゲート運用**: 起動確認後、朝Eさんが完了を確認したら Phase 3 へ。

---

## Phase 3: 影響を受けた長野県以外の再検証（60分・Phase 2完了後）

### 3-A. 背景

長野県は continued-4 で既に再紐付け済み。  
Phase 2 で GSI API による全国再紐付けが完了した後、**長野県以外の46都道府県で**、大町市の様な「欠落市」により影響を受けていた施設が正しく紐付いたか検証。

### 3-B. 検証SQL

```sql
-- 1. Phase 2 の更新件数サマリ
SELECT status, COUNT(*) FROM facility_rebind_log GROUP BY status;

-- 2. 県別の更新率（44.5%が理論値。近い数字になればOK）
SELECT 
  LEFT(l.old_id, 2) AS pref_code,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE l.status = 'ok_update') AS updated,
  TO_CHAR(
    COUNT(*) FILTER (WHERE l.status = 'ok_update') * 100.0 / COUNT(*),
    'FM990.0'
  ) AS update_pct
FROM facility_rebind_log l
GROUP BY LEFT(l.old_id, 2)
ORDER BY updated DESC;

-- 3. 長野県で主要移住先の維持確認
SELECT name, kind, (
  SELECT COUNT(*) FROM facility_details fd WHERE fd.municipality_id = m.id
) AS facilities
FROM municipalities m
WHERE m.id IN ('20485', '20407', '20602', '20321', '20588')
ORDER BY facilities DESC;
-- 期待: 白馬21前後・阿智21前後・栄48前後・軽井沢147前後・野沢温泉27前後

-- 4. 主要政令市の施設件数（極端な減少がないか）
SELECT m.name, m.prefecture_name, (
  SELECT COUNT(*) FROM facility_details fd WHERE fd.municipality_id = m.id
) AS facilities
FROM municipalities m
WHERE m.id IN (
  '01100', -- 札幌市
  '13101', -- 千代田区
  '14100', -- 横浜市
  '23100', -- 名古屋市
  '27100', -- 大阪市
  '28100', -- 神戸市
  '40100', -- 福岡市
  '26100'  -- 京都市
)
ORDER BY facilities DESC;

-- 5. 0件自治体の一覧（許容範囲かチェック）
SELECT m.prefecture_name, m.name, m.kind
FROM municipalities m
LEFT JOIN facility_details fd ON fd.municipality_id = m.id
WHERE fd.id IS NULL
ORDER BY m.prefecture_code, m.id;
```

### 3-C. 判定基準

| 指標 | 合格ライン |
|---|---|
| 全国誤紐付け率（Phase 2 update率） | 40〜50%（理論値44.5%と乖離小） |
| 長野県主要5自治体 | 件数が ±10% 以内で維持 |
| 主要政令市 | 件数が急減していない |
| 0件自治体 | 全体の10%未満（極小村を除く） |

### Phase 3 成果物

- [ ] 上記5つのSQL結果
- [ ] 合格/要再調整の判定
- [ ] 要再調整の場合は対処方針の提案

**ゲート③: Opus承認 → Phase 4 着手**

---

## Phase 4: 県境混入2,358件の解消（30〜60分）

### 4-A. 背景

Phase 2 で大半の誤紐付けは解消されているはず。  
ただし `status = 'not_in_prod'` だった施設（GSI が返した真の自治体がまだ本番になかったケース）が残っている可能性。

Phase 1 で全1,720自治体を揃えたので、これらも再紐付けできる。

### 4-B. 再処理スクリプト

```python
# scripts/bplan/phase4_cleanup_border.py
"""
Phase 2で 'not_in_prod' だった施設、および県境混入と思われるレコードを再処理。
Phase 1 で全1,720自治体揃ったので、今度は本番にマッチするはず。
"""
import os, sys, time
from supabase import create_client
sys.path.insert(0, "/Users/eiji/ijyu-db/scripts")
from lib.gsi_geocoder import gsi_reverse_geocode

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry"
    dry_run = (mode != "commit")
    
    # Phase 2で 'not_in_prod' だったレコードを再取得
    retries = sb.table("facility_rebind_log").select(
        "facility_id, old_id, new_id"
    ).eq("status", "not_in_prod").execute().data
    
    print(f"再処理対象: {len(retries)}件")
    
    # 現在の本番 municipalities 一覧
    all_munis = {m["id"] for m in sb.table("municipalities").select("id").execute().data}
    print(f"本番自治体: {len(all_munis)}")
    
    updated = 0
    still_missing = 0
    
    for r in retries:
        new_id = r["new_id"]
        if new_id in all_munis:
            # 本番に揃ったので更新可能
            if not dry_run:
                sb.table("facility_details").update(
                    {"municipality_id": new_id}
                ).eq("id", r["facility_id"]).execute()
                sb.table("facility_rebind_log").update(
                    {"status": "ok_update_phase4"}
                ).eq("facility_id", r["facility_id"]).execute()
            updated += 1
        else:
            still_missing += 1
    
    print(f"更新: {updated} / まだmissing: {still_missing}")


if __name__ == "__main__":
    main()
```

### 4-C. 実行

```bash
# ドライラン
ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && /Users/eiji/venv311/bin/python3 scripts/bplan/phase4_cleanup_border.py dry"

# commit
ssh eiji@100.111.136.105 "cd /Users/eiji/ijyu-db && set -a && source .env && set +a && /Users/eiji/venv311/bin/python3 scripts/bplan/phase4_cleanup_border.py commit"
```

### 4-D. 栄村の確認（continued-3で保留していた10件）

```sql
-- 栄村(20602)に残っている湯沢町系施設の確認
SELECT id, facility_name, lat, lng
FROM facility_details
WHERE municipality_id = '20602'
  AND (facility_name LIKE '%湯沢%' 
       OR facility_name LIKE '%CoCoLo%'
       OR facility_name LIKE '%ゆざわ%');

-- Phase 2/4 で湯沢町(15461)に移動済みか確認
SELECT COUNT(*) 
FROM facility_details
WHERE municipality_id = '15461';
-- Phase以前は0件、Phase後は湯沢町の施設が入ってるはず
```

### Phase 4 成果物

- [ ] Phase 4 実行結果
- [ ] 栄村の湯沢町系施設が湯沢町に移動した確認
- [ ] 最終的に残っている `not_in_prod` 件数（あれば理由報告）

**ゲート④: Opus承認 → 最終検証**

---

## Phase 5: 最終検証（30分）

### 5-A. 全体サマリ

```sql
-- 最終全体サマリ
SELECT 
  (SELECT COUNT(*) FROM municipalities) AS total_munis,
  (SELECT COUNT(*) FROM facility_details) AS total_facilities,
  (SELECT COUNT(DISTINCT municipality_id) FROM facility_details) AS munis_with_facilities,
  (SELECT COUNT(*) FROM municipalities WHERE id NOT IN 
    (SELECT DISTINCT municipality_id FROM facility_details)) AS zero_munis;

-- 都道府県別の健全性チェック
SELECT 
  prefecture_name,
  COUNT(m.id) AS total_munis,
  COUNT(DISTINCT fd.municipality_id) AS munis_with_facilities,
  ROUND(
    COUNT(DISTINCT fd.municipality_id) * 100.0 / COUNT(m.id), 
    1
  ) AS coverage_pct,
  COUNT(fd.id) AS total_facilities
FROM municipalities m
LEFT JOIN facility_details fd ON fd.municipality_id = m.id
GROUP BY prefecture_name, prefecture_code
ORDER BY prefecture_code;

-- カテゴリ別サマリ
SELECT category, COUNT(*)
FROM facility_details
GROUP BY category
ORDER BY 2 DESC;
```

### 5-B. B案完了宣言条件

| 項目 | 合格ライン |
|---|---|
| 全国自治体数 | 1,720件前後 |
| 施設がある自治体カバー率 | 90%以上 |
| 0件自治体 | 150件以下（過疎小村限定） |
| 主要政令市の施設件数 | Day20時点と乖離小 |
| facility_rebind_log の api_fail | 0.5%未満 |

### 5-C. 完了ブログ記事のネタ出し

B案完了は大きなマイルストーンなので、ブログ記事化を検討：

- タイトル案: 「全国1,720自治体のデータ基盤を完成させた話」
- 内容: 44.5%誤紐付けの発見から解決まで
- ただし技術記事になりすぎると移住DBの読者層から外れる → 要検討

**実装はしない。** Opus が後日判断。

### Phase 5 成果物

- [ ] 全体サマリSQL結果
- [ ] 47都道府県健全性レポート
- [ ] カテゴリ別件数
- [ ] B案完了宣言（合格ライン達成確認）

---

## 全体完了条件

- [ ] Phase 0: 現状確認 + マスターバックアップ
- [ ] Phase 1: 全47都道府県マージ完了（1,720件達成）
- [ ] Phase 2: 夜間バッチ完了（約15時間）
- [ ] Phase 3: 全国再検証合格
- [ ] Phase 4: 県境混入解消
- [ ] Phase 5: 最終検証合格
- [ ] `opus-request-day21-continued-7.md` に全成果物まとめ

---

## やってはいけないこと

1. ❌ Phase 0 を飛ばして Phase 1 着手
2. ❌ バックアップ作成前の UPDATE/DELETE
3. ❌ ドライランなしの本番commit
4. ❌ Phase 境界ごとの Opus 承認を省略
5. ❌ Phase 2 を昼間に実行（15時間かかるのでリソース競合）
6. ❌ Phase 2 を途中で強制終了（resume機能があるが、処理済み件数のズレを生む）
7. ❌ D-7 Phase 1の着手（B案完了宣言後）
8. ❌ AdSense再申請（B案完了宣言後）

---

## ゲート運用

| ゲート | 内容 | 承認必須 |
|---|---|---|
| ゲート① | Phase 0完了後 | ✅ Opus |
| ゲート② | Phase 1完了後 | ✅ Opus |
| ゲート③ | Phase 3完了後 | ✅ Opus |
| ゲート④ | Phase 4完了後 | ✅ Opus |

Phase 2（夜間バッチ）は起動確認のみ。

---

## 時間配分目安

```
Phase 0 (Pre-flight):              30分
↓ ゲート①
Phase 1 (町村マージ):              60〜90分
  - Block A ドライラン+commit:    20分
  - Block B ドライラン+commit:    20分
  - Block C (北海道) ドライラン+commit: 20分
↓ ゲート②
Phase 2 (夜間バッチ起動):          10分（実処理は約15時間・バックグラウンド）
  - 翌朝Eさん確認 → ゲート
Phase 3 (再検証):                  60分
↓ ゲート③
Phase 4 (県境混入解消):            30〜60分
↓ ゲート④
Phase 5 (最終検証):                30分
---
同期作業合計:                      3.5〜4.5時間
夜間バッチ:                        約15時間（別途）
```

---

## 環境情報（再掲）

| 項目 | 値 |
|---|---|
| Mac mini SSH | eiji@100.111.136.105 |
| リポジトリ | /Users/eiji/ijyu-db |
| Python venv | /Users/eiji/venv311/bin/python3 |
| Supabase | wedxzvhdheitoyenjnmo |
| 国土地理院 API | https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress |
| ログ出力先 | ~/logs/ |

---

## 参照ファイル

| ファイル | 参照目的 |
|---|---|
| opus-request-day21-continued-6.md | 前回の成果・誤紐付け44.5%の判明 |
| scripts/lib/gsi_geocoder.py | Phase 2, 4 で使用 |
| scripts/lib/brand_filter.py | I-9完了済み（今回は使わない） |
| municipalities_staging | Phase 1 のマージ元 |
| facility_details_backup_pre_bplan | Phase 0 で作成 |

---

## 特記事項

### B案完了後の自動的な効果

B案完了後、以下が自動的に解決:

1. **I-10 extract_facility_details.py 本体統合の必要性**: B案Phase 2の結果次第では、今後のOSM再抽出でも問題が起きない可能性。ただし次回のOSM再抽出前には統合しておくのが筋なので、別途小規模タスクとして後日対応。

2. **D-40 県境混入**: Phase 4 で完全解消。

3. **D-1 自治体数拡大**: Phase 1 で完全解消。

4. **将来のOSM更新**: Geofabrik定期更新が走っても、extract_facility_details.py が国土地理院APIベースになれば県境越えが再発しない（別タスクI-10本体統合の対応後）。

### B案完了を宣言したら解禁される作業

- I-7 AdSense再申請（4/26以降）
- D-7 移住支援制度パイロット（長野県9市 → 77自治体 → 全1,720）
- D-20 Places API店舗名補完
- D-26 「暮らしのリアル」Phase 2: 移住ブログ収集
- D-33 セクションE第2弾ブランドのデータ補完

---

## 想定される質問とOpus回答

**Q1: Phase 2 の夜間バッチが途中で失敗したら？**
A: スクリプトに resume 機能あり。facility_rebind_log に processed が記録されるので、処理済みはスキップして続行。実質的なロス時間は、失敗時点の直前バッチ（500件・最大2.5分）のみ。

**Q2: 本番UPDATEで問題が出たら？**
A: `facility_details_backup_pre_bplan` が Phase 0 で作成済み。完全ロールバック可能。

**Q3: Phase 2 を複数回実行したら？**
A: facility_rebind_log への upsert は冪等。同じ結果で上書きするだけ。

**Q4: GSI APIのレート制限は？**
A: 公称は無制限だが、0.3秒インターバルを守ること（gsi_geocoder.pyに実装済み）。

**Q5: APIが数時間ダウンしたら？**
A: scriptはタイムアウトでNoneを返し、status='api_fail' でログに記録して次へ進む。復旧後に Phase 4 の仕組みで再処理可能。

---

## Eさんへの申し送り

### Phase 2 起動時刻の重要性

Phase 2 は約15時間のバッチ。起動時刻の目安:
- **21:00頃起動 → 翌日12:00頃完了**
- **23:00頃起動 → 翌日14:00頃完了**
- Mac mini 24時間稼働なので、いつ起動してもOK

### 進捗監視

Phase 2 実行中、Eさんは以下で進捗確認可能:

```bash
# ログ末尾
ssh eiji@100.111.136.105 "tail -30 ~/logs/bplan_phase2.log"

# プロセス存在確認
ssh eiji@100.111.136.105 "pgrep -f phase2_rebind_all"
```

もしくは Supabase Dashboard で `SELECT COUNT(*) FROM facility_rebind_log;` を叩けば処理件数がわかる。

### Phase 2 完了後の流れ

```
Sonnet が Phase 2 完了確認
  ↓
opus-request-day21-continued-7.md に Phase 2 結果を追記
  ↓
Eさん が Opus に報告
  ↓
Opus が判定 → Phase 3 着手承認
```
