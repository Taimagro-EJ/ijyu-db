'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Municipality } from '@/lib/supabase'
import WeightSlider from '@/components/filters/WeightSlider'

const REGIONS = ['全て', '北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州', '沖縄']
const ITEMS_PER_PAGE = 48

const QUICK_FILTERS = [
  { id: 'childcare',  label: '👶 子育て',   filter: (m: Municipality) => (m.total_monthly_cost_single ?? 999999) <= 170000 },
  { id: 'telework',   label: '💻 テレワーク', filter: (m: Municipality) => (m.time_to_tokyo ?? 999) <= 180 },
  { id: 'low_cost',   label: '💰 生活費安い', filter: (m: Municipality) => (m.total_monthly_cost_single ?? 999999) <= 150000 },
  { id: 'warm',       label: '☀️ 温暖',      filter: (m: Municipality) => (m.avg_temp_annual ?? 0) >= 15 },
  { id: 'near_tokyo', label: '🚄 東京近い',  filter: (m: Municipality) => (m.time_to_tokyo ?? 999) <= 120 },
  { id: 'no_car',     label: '🚶 車なし可',  filter: (m: Municipality) => (m.car_necessity_score ?? 0) >= 4 },
  { id: 'nature',     label: '🏔 大自然',    filter: (m: Municipality) => (m.avg_temp_annual ?? 99) < 14 },
  { id: 'safe',       label: '🛡 安全',      filter: (m: Municipality) => (m.criminal_rate ?? 999) < 200 },
]

type SortKey = 'name' | 'cost' | 'temp' | 'tokyo' | 'lifestyle' | 'custom'

function tempColor(t: number | null) {
  if (t === null) return 'var(--color-text-muted)'
  if (t >= 20) return '#C4611A'
  if (t >= 15) return '#C4922A'
  if (t >= 10) return 'var(--color-positive)'
  return '#3B7BC4'
}

function safetyInfo(rate: number | null): { label: string; badge: string } {
  if (rate === null) return { label: '-', badge: '' }
  if (rate < 200) return { label: '◎ 安全', badge: 'badge-positive' }
  if (rate < 300) return { label: '○ 普通', badge: 'badge-warning' }
  if (rate < 400) return { label: '△ やや多', badge: 'badge-warning' }
  return { label: '× 多い', badge: 'badge-negative' }
}

function fmt万(v: number | null) {
  if (v === null) return '-'
  return `${Math.round(v / 10000)}万円`
}

function fmt万1(v: number | null) {
  if (v === null) return '-'
  return `${(Math.floor(v / 10000 * 10) / 10)}万円`
}

function getCatchCopy(m: Municipality): string {
  const temp = m.avg_temp_annual ?? 0
  const cost = m.total_monthly_cost_single ?? 999999
  const tokyo = m.time_to_tokyo ?? 999
  const carScore = m.car_necessity_score ?? 3
  if (temp >= 20 && cost <= 160000) return '温暖な気候と、ゆとりある暮らし。'
  if (tokyo <= 90 && cost <= 160000) return '東京へすぐ戻れる、静かな毎日。'
  if (tokyo <= 120 && carScore >= 4) return '車なしで、都会にもアクセスできる街。'
  if (temp < 5 && m.sunshine_hours_annual && m.sunshine_hours_annual > 1800) return '冬は厳しく、でも空が驚くほど青い。'
  if (cost <= 140000) return '生活費を抑えて、人生を豊かにする。'
  if (m.min_temp_winter !== null && m.min_temp_winter > 5) return '一年中穏やかな気候の移住先。'
  return 'データが語る、あなたの新しい日常。'
}

// ── スコアバー ────────────────────────────────
function ScoreBar({ value, color }: { value: number | null; color: string }) {
  const v = value ?? 0
  return (
    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${v}%`, backgroundColor: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ── 施設データ行 ─────────────────────────────
function FacilityRow({ icon, label, value, unit, badge, highlight }: {
  icon: string; label: string; value: number | null; unit: string;
  badge?: string; highlight?: boolean;
}) {
  const v = value ?? 0
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
      <span><span style={{ marginRight: 6 }}>{icon}</span>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {highlight && v === 0 ? (
          <span style={{ color: '#4A7C59', fontWeight: 600 }}>0{unit} ✓</span>
        ) : (
          <>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: 'var(--color-text-primary)' }}>{v}</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{unit}</span>
          </>
        )}
        {badge && (
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: 'rgba(212,107,58,0.1)', color: '#D46B3A', fontWeight: 600 }}>{badge}</span>
        )}
      </span>
    </div>
  )
}

// ── 市町村カード（React.memoでメモ化）────────────
type MunicipalityWithScore = Municipality & { customScore?: number }

const MunicipalityCard = memo(function MunicipalityCard({ m }: { m: MunicipalityWithScore }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const safety = safetyInfo(m.criminal_rate)
  const catchCopy = getCatchCopy(m)
  const lifestyleScore = m.lifestyle_score ?? 0
  const scoreColor = lifestyleScore >= 70 ? '#4A7C59' : lifestyleScore >= 45 ? '#D46B3A' : '#B84C3A'

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <Link href={`/municipalities/${m.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <div style={{
          background: 'var(--color-bg-card)',
          borderRadius: 16,
          border: isExpanded ? '1px solid rgba(212,107,58,0.35)' : '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', height: '100%',
          cursor: 'pointer',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease',
          boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.12)' : 'none',
        }}>
          <div style={{ position: 'relative', height: 140, overflow: 'hidden', background: 'var(--color-base-light)' }}>
            {m.image_url ? (
              <Image src={m.image_url} alt={`${m.name}の風景`} fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }} priority={false} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, var(--color-base-light) 0%, var(--color-accent-soft) 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              }}>🏘</div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, background: 'linear-gradient(transparent, rgba(26,24,20,0.55))' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 12, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Shippori Mincho', serif", letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{m.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{m.prefecture} · {m.region}</div>
              </div>
              {m.is_featured && <span className="badge badge-featured">注目</span>}
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.5, borderLeft: '2px solid var(--color-accent-soft)', paddingLeft: 10 }}>{catchCopy}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              <DataCell label="年間平均気温" value={m.avg_temp_annual !== null ? `${m.avg_temp_annual}℃` : '-'} color={tempColor(m.avg_temp_annual)} />
              <DataCell label="1LDK家賃" value={fmt万1(m.rent_1ldk_estimate)} />
              <DataCell label="東京まで" value={m.time_to_tokyo !== null ? `${m.time_to_tokyo}分` : '-'} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                月<span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 2px' }}>{fmt万(m.total_monthly_cost_single)}</span>で暮らせる
              </div>
              <span className={`badge ${safety.badge}`}>{safety.label}</span>
            </div>

            {m.lifestyle_score !== null && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span>生活リアリティ指数</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{lifestyleScore}/100</span>
                </div>
                <ScoreBar value={lifestyleScore} color={scoreColor} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 'auto' }}>
              {m.car_necessity_score !== null && m.car_necessity_score <= 2 && <Tag label="🚗 車必須" bg="#FEF2F2" color="#991B1B" />}
              {m.car_necessity_score !== null && m.car_necessity_score >= 4 && <Tag label="🚃 車不要" bg="#F0FDF4" color="#166534" />}
              {m.avg_temp_annual !== null && m.avg_temp_annual >= 18 && <Tag label="☀️ 温暖" bg="#FFF7ED" color="#9A3412" />}
              {m.min_temp_winter !== null && m.min_temp_winter < -5 && <Tag label="❄️ 寒冷地" bg="#EFF6FF" color="#1E3A8A" />}
              {m.nearest_shinkansen && <Tag label={`🚅 ${m.nearest_shinkansen}`} bg="var(--color-base-light)" color="var(--color-base-dark)" />}
            </div>
          </div>

          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>詳細を見る →</span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation() }}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 999, padding: '4px 12px', fontSize: 11, color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)' }}
            >♡ 気になる</button>
          </div>
        </div>
      </Link>

      {/* ホバー展開パネル */}
      {isExpanded && (
        <div style={{
          position: 'absolute', top: 0, left: '100%', zIndex: 50,
          width: 220, background: 'var(--color-bg-card)',
          borderRadius: '0 16px 16px 0',
          border: '1px solid rgba(212,107,58,0.35)', borderLeft: 'none',
          boxShadow: '6px 0 24px rgba(0,0,0,0.12)',
          padding: '16px 14px', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>施設データ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FacilityRow icon="☕" label="スタバ" value={m.cafe_starbucks} unit="軒" />
            <FacilityRow icon="🏋️" label="24hジム" value={m.gym_24h_count} unit="軒" />
            <FacilityRow icon="🎬" label="映画館" value={m.cinema_count} unit="軒" badge={m.cinema_has_imax ? 'IMAX' : undefined} />
            <FacilityRow icon="🛒" label="モール" value={m.mall_count} unit="軒" badge={m.mall_best_tier ? `Tier ${m.mall_best_tier}` : undefined} />
            <FacilityRow icon="👶" label="待機児童" value={m.waiting_children} unit="人" highlight={true} />
            <FacilityRow icon="🏥" label="小児科" value={m.pediatric_clinics} unit="件" />
          </div>
          {m.score_costperf !== null && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <span>コスパスコア</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{m.score_costperf}/100</span>
              </div>
              <ScoreBar value={m.score_costperf} color="#4A7C59" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  return prev.m.slug === next.m.slug
    && prev.m.lifestyle_score === next.m.lifestyle_score
    && prev.m.customScore === next.m.customScore
})

function DataCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--color-base-light)', padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: color ?? 'var(--color-text-primary)', fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  )
}

function Tag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999 }}>{label}</span>
}

type Filters = { region: string; maxCost: number; maxTemp: 'warm' | 'cold' | 'all'; carFree: boolean; quickFilter: string | null }

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {QUICK_FILTERS.map(qf => (
          <button key={qf.id}
            onClick={() => onChange({ ...filters, quickFilter: filters.quickFilter === qf.id ? null : qf.id })}
            className={`quick-tag${filters.quickFilter === qf.id ? ' active' : ''}`}
          >{qf.label}</button>
        ))}
      </div>
      <div style={{ background: 'var(--color-bg-card)', borderRadius: 14, border: '1px solid var(--color-border)', padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>地域</label>
          <select value={filters.region} onChange={e => onChange({ ...filters, region: e.target.value })}
            style={{ fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 10px', background: 'var(--color-base-light)', color: 'var(--color-text-primary)' }}>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>月額〜</label>
          <select value={filters.maxCost} onChange={e => onChange({ ...filters, maxCost: Number(e.target.value) })}
            style={{ fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 10px', background: 'var(--color-base-light)', color: 'var(--color-text-primary)' }}>
            <option value={999999}>上限なし</option>
            <option value={130000}>13万円</option>
            <option value={150000}>15万円</option>
            <option value={170000}>17万円</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>気候</label>
          <select value={filters.maxTemp} onChange={e => onChange({ ...filters, maxTemp: e.target.value as Filters['maxTemp'] })}
            style={{ fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 10px', background: 'var(--color-base-light)', color: 'var(--color-text-primary)' }}>
            <option value="all">全て</option>
            <option value="warm">温暖（年均15℃以上）</option>
            <option value="cold">寒冷（年均15℃未満）</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.carFree} onChange={e => onChange({ ...filters, carFree: e.target.checked })}
            style={{ width: 15, height: 15, accentColor: 'var(--color-accent)' }} />
          車なし生活可
        </label>
      </div>
    </div>
  )
}

export default function MunicipalityList({ municipalities }: { municipalities: Municipality[] }) {
  const [filters, setFilters] = useState<Filters>({ region: '全て', maxCost: 999999, maxTemp: 'all', carFree: false, quickFilter: null })
  const [sortKey, setSortKey] = useState<SortKey>('lifestyle')
  const [weights, setWeights] = useState<Record<string, number>>({
    shopping: 50, cafe: 50, dining: 50, fitness: 50, entertainment: 50,
    family: 50, grocery: 50,
  })
  const [page, setPage] = useState(1)

  const handleWeightsChange = useCallback((w: Record<string, number>) => {
    setWeights(w)
    setSortKey('custom')
    setPage(1)
  }, [])

  const filtered = useMemo(() => {
    const qf = QUICK_FILTERS.find(q => q.id === filters.quickFilter)
    const base = municipalities
      .filter(m => filters.region === '全て' || m.region === filters.region)
      .filter(m => filters.maxCost === 999999 || (m.total_monthly_cost_single ?? 999999) <= filters.maxCost)
      .filter(m => filters.maxTemp === 'all' || (filters.maxTemp === 'warm' && (m.avg_temp_annual ?? 0) >= 15) || (filters.maxTemp === 'cold' && (m.avg_temp_annual ?? 99) < 15))
      .filter(m => !filters.carFree || (m.car_necessity_score ?? 0) >= 4)
      .filter(m => !qf || qf.filter(m))

    if (sortKey === 'custom') {
      const total = Object.values(weights).reduce((a, b) => a + b, 0)
      const norm: Record<string, number> = {}
      for (const [k, v] of Object.entries(weights)) norm[k] = total > 0 ? v / total : 1 / 7
      return [...base]
        .map(m => ({
          ...m,
          customScore: Math.round((
            (m.score_shopping ?? 0) * (norm.shopping ?? 0) +
            (m.score_cafe ?? 0) * (norm.cafe ?? 0) +
            (m.score_dining ?? 0) * (norm.dining ?? 0) +
            (m.score_fitness ?? 0) * (norm.fitness ?? 0) +
            (m.score_entertainment ?? 0) * (norm.entertainment ?? 0) +
            (m.score_family ?? 0) * (norm.family ?? 0) +
            (m.score_grocery ?? 0) * (norm.grocery ?? 0)
          ),
        }))
        .sort((a, b) => (b.customScore ?? 0) - (a.customScore ?? 0))
    }

    return [...base].sort((a, b) => {
      if (sortKey === 'cost') return (a.total_monthly_cost_single ?? 999999) - (b.total_monthly_cost_single ?? 999999)
      if (sortKey === 'temp') return (b.avg_temp_annual ?? -99) - (a.avg_temp_annual ?? -99)
      if (sortKey === 'tokyo') return (a.time_to_tokyo ?? 999) - (b.time_to_tokyo ?? 999)
      if (sortKey === 'lifestyle') return (b.lifestyle_score ?? 0) - (a.lifestyle_score ?? 0)
      return a.name.localeCompare(b.name, 'ja')
    })
  }, [municipalities, filters, sortKey, weights])

  const paged = filtered.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = paged.length < filtered.length
  const remaining = filtered.length - paged.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{ background: 'var(--color-base-dark)', color: '#fff', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Shippori Mincho', serif", color: 'var(--color-base-light)' }}>移住DB</h1>
              <p style={{ fontSize: 12, color: 'var(--color-base)', margin: '3px 0 0' }}>全国{municipalities.length}市町村の移住データを比較</p>
            </div>
            <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {['blog', 'about', 'contact'].map((p, i) => (
                <a key={p} href={`/${p}`} style={{ fontSize: 13, color: 'var(--color-base)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-base)'}
                >{['コラム', 'データについて', 'お問い合わせ'][i]}</a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        <FilterBar filters={filters} onChange={setFilters} />

        {/* ★ 重みスライダー */}
        <WeightSlider weights={weights} onWeightsChange={handleWeightsChange} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>{paged.length}</span>
            {' '}/ {filtered.length}件表示
            {filters.quickFilter && (
              <button onClick={() => setFilters({ ...filters, quickFilter: null })}
                style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-accent)', background: 'var(--color-accent-soft)', border: 'none', borderRadius: 999, padding: '2px 8px', cursor: 'pointer' }}>
                × フィルター解除
              </button>
            )}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['lifestyle', 'custom', 'name', 'cost', 'temp', 'tokyo'] as const).map(key => (
              <button key={key} onClick={() => { setSortKey(key); setPage(1); }} style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 999, border: '1px solid',
                borderColor: sortKey === key ? 'var(--color-accent)' : 'var(--color-border)',
                background: sortKey === key ? 'var(--color-accent)' : 'var(--color-bg-card)',
                color: sortKey === key ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer', fontWeight: sortKey === key ? 600 : 400, transition: 'all 0.2s',
              }}>
                {{ lifestyle: '⭐ 生活充実度', custom: '🎯 カスタム', name: '名前順', cost: '生活費安い順', temp: '温暖順', tokyo: '東京近い順' }[key]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {paged.map(m => <MunicipalityCard key={m.id} m={m as MunicipalityWithScore} />)}
        </div>

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button onClick={() => setPage(p => p + 1)} style={{
              padding: '14px 40px', background: 'var(--color-accent)', color: '#fff',
              border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(212,107,58,0.3)',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'none'}
            >もっと見る（残り{remaining}件）</button>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16 }}>条件に合う市町村が見つかりません</div>
            <button onClick={() => setFilters({ region: '全て', maxCost: 999999, maxTemp: 'all', carFree: false, quickFilter: null })}
              style={{ marginTop: 16, padding: '8px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              フィルターをリセット
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
