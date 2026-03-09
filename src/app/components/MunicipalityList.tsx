'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Municipality } from '@/lib/supabase'

const REGIONS = ['全て', '北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州', '沖縄']

function tempColor(t: number | null) {
  if (t === null) return '#94a3b8'
  if (t >= 20) return '#f97316'
  if (t >= 15) return '#eab308'
  if (t >= 10) return '#22c55e'
  return '#3b82f6'
}

function safetyLabel(rate: number | null) {
  if (rate === null) return { label: '-', color: '#94a3b8' }
  if (rate < 200) return { label: '◎ 安全', color: '#16a34a' }
  if (rate < 300) return { label: '○ 普通', color: '#ca8a04' }
  if (rate < 400) return { label: '△ やや多', color: '#ea580c' }
  return { label: '× 多い', color: '#dc2626' }
}

function fmt万(v: number | null) {
  if (v === null) return '-'
  return `${Math.round(v / 10000)}万円`
}

function MunicipalityCard({ m }: { m: Municipality }) {
  const safety = safetyLabel(m.criminal_rate)
  return (
    <Link href={`/municipalities/${m.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'pointer',
        height: '100%',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
      }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{m.prefecture} · {m.region}</div>
          </div>
          {m.is_featured && (
            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, border: '1px solid #fde68a' }}>注目</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Stat label="年間平均気温" value={m.avg_temp_annual !== null ? `${m.avg_temp_annual}℃` : '-'} color={tempColor(m.avg_temp_annual)} />
          <Stat label="冬の最低気温" value={m.min_temp_winter !== null ? `${m.min_temp_winter}℃` : '-'} color={m.min_temp_winter !== null && m.min_temp_winter < -5 ? '#3b82f6' : '#64748b'} />
          <Stat label="単身月額生活費" value={fmt万(m.total_monthly_cost_single)} />
          <Stat label="1LDK家賃目安" value={m.rent_1ldk_estimate !== null ? `${(Math.floor(m.rent_1ldk_estimate / 10000 * 10) / 10)}万円` : '-'} />
          <Stat label="東京まで" value={m.time_to_tokyo !== null ? `${m.time_to_tokyo}分` : '-'} />
          <Stat label="治安" value={safety.label} color={safety.color} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {m.car_necessity_score !== null && m.car_necessity_score <= 2 && <Tag label="🚗 車必須" color="#fef2f2" textColor="#991b1b" />}
          {m.car_necessity_score !== null && m.car_necessity_score >= 4 && <Tag label="🚃 車不要" color="#f0fdf4" textColor="#166534" />}
          {m.avg_temp_annual !== null && m.avg_temp_annual >= 18 && <Tag label="☀️ 温暖" color="#fff7ed" textColor="#9a3412" />}
          {m.min_temp_winter !== null && m.min_temp_winter < -5 && <Tag label="❄️ 寒冷地" color="#eff6ff" textColor="#1e3a8a" />}
          {m.nearest_shinkansen && <Tag label={`🚅 ${m.nearest_shinkansen}`} color="#f8fafc" textColor="#475569" />}
        </div>
      </div>
    </Link>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color ?? '#0f172a' }}>{value}</div>
    </div>
  )
}

function Tag({ label, color, textColor }: { label: string; color: string; textColor: string }) {
  return (
    <span style={{ background: color, color: textColor, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 999 }}>{label}</span>
  )
}

type Filters = {
  region: string
  maxCost: number
  maxTemp: 'warm' | 'cold' | 'all'
  carFree: boolean
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      alignItems: 'center',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>地域</label>
        <select value={filters.region} onChange={e => onChange({ ...filters, region: e.target.value })}
          style={{ fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', background: '#f8fafc' }}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>月額〜</label>
        <select value={filters.maxCost} onChange={e => onChange({ ...filters, maxCost: Number(e.target.value) })}
          style={{ fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', background: '#f8fafc' }}>
          <option value={999999}>上限なし</option>
          <option value={130000}>13万円</option>
          <option value={150000}>15万円</option>
          <option value={170000}>17万円</option>
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>気候</label>
        <select value={filters.maxTemp} onChange={e => onChange({ ...filters, maxTemp: e.target.value as Filters['maxTemp'] })}
          style={{ fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', background: '#f8fafc' }}>
          <option value="all">全て</option>
          <option value="warm">温暖（年均15℃以上）</option>
          <option value="cold">寒冷（年均15℃未満）</option>
        </select>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.carFree} onChange={e => onChange({ ...filters, carFree: e.target.checked })}
          style={{ width: 16, height: 16 }} />
        車なし生活可
      </label>
    </div>
  )
}

export default function MunicipalityList({ municipalities }: { municipalities: Municipality[] }) {
  const [filters, setFilters] = useState<Filters>({ region: '全て', maxCost: 999999, maxTemp: 'all', carFree: false })
  const [sortKey, setSortKey] = useState<'name' | 'cost' | 'temp' | 'tokyo'>('name')

  const filtered = useMemo(() => {
    return municipalities
      .filter(m => filters.region === '全て' || m.region === filters.region)
      .filter(m => filters.maxCost === 999999 || (m.total_monthly_cost_single ?? 999999) <= filters.maxCost)
      .filter(m => filters.maxTemp === 'all' ||
        (filters.maxTemp === 'warm' && (m.avg_temp_annual ?? 0) >= 15) ||
        (filters.maxTemp === 'cold' && (m.avg_temp_annual ?? 99) < 15))
      .filter(m => !filters.carFree || (m.car_necessity_score ?? 0) >= 4)
      .sort((a, b) => {
        if (sortKey === 'cost') return (a.total_monthly_cost_single ?? 999999) - (b.total_monthly_cost_single ?? 999999)
        if (sortKey === 'temp') return (b.avg_temp_annual ?? -99) - (a.avg_temp_annual ?? -99)
        if (sortKey === 'tokyo') return (a.time_to_tokyo ?? 999) - (b.time_to_tokyo ?? 999)
        return a.name.localeCompare(b.name, 'ja')
      })
  }, [municipalities, filters, sortKey])

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>移住DB</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>全国{municipalities.length}市町村の移住データを比較</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 16 }}><a href="/about" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>データについて</a><a href="/blog" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>コラム</a></div>
        </div>
      </header>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <FilterBar filters={filters} onChange={setFilters} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>{filtered.length}件表示</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['name', 'cost', 'temp', 'tokyo'] as const).map(key => (
              <button key={key} onClick={() => setSortKey(key)} style={{
                fontSize: 12, padding: '4px 12px', borderRadius: 999,
                border: '1px solid #e2e8f0',
                background: sortKey === key ? '#0f172a' : '#fff',
                color: sortKey === key ? '#fff' : '#64748b',
                cursor: 'pointer',
              }}>
                {{ name: '名前順', cost: '生活費安い順', temp: '温暖順', tokyo: '東京近い順' }[key]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(m => <MunicipalityCard key={m.id} m={m} />)}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16 }}>条件に合う市町村が見つかりません</div>
          </div>
        )}
      </div>
    </div>
  )
}
