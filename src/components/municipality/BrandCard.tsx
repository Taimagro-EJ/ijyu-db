'use client'
import { useState } from 'react'

interface BrandCardProps {
  municipalityId: string
  municipalityName: string
  label: string
  count: number
  brandPattern: string
}

export default function BrandCard({ municipalityId, municipalityName, label, count, brandPattern }: BrandCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [stores, setStores] = useState<{ facility_name: string; lat: number; lng: number }[]>([])
  const [loading, setLoading] = useState(false)

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return }
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await sb.from('facility_details').select('facility_name, lat, lng').eq('municipality_id', municipalityId).ilike('facility_name', `%${brandPattern}%`).limit(20)
    const seen = new Set<string>()
    const deduped = (data ?? []).filter(s => {
      const key = `${Math.round(s.lat * 1000)},${Math.round(s.lng * 1000)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setStores(deduped)
    setLoading(false)
    setExpanded(true)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: '#9E9488', margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#2C2A26', margin: 0 }}>{count}軒</p>
        </div>
        <button onClick={handleExpand} style={{ fontSize: 11, color: '#C4922A', background: 'none', border: '1px solid #C4922A', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? '...' : expanded ? '▲ 閉じる' : '📍 一覧'}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid #F0EDE8', paddingTop: 8 }}>
          {stores.length === 0 ? <p style={{ fontSize: 11, color: '#9E9488', margin: 0 }}>店舗情報なし</p> : stores.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < stores.length - 1 ? '1px solid #F7F5F2' : 'none' }}>
              <p style={{ fontSize: 12, color: '#454034', margin: 0 }}>{s.facility_name}</p>
              <a href={`https://maps.google.com/maps?q=${encodeURIComponent(s.facility_name + ' ' + municipalityName)}&ll=${s.lat},${s.lng}&spn=0.005,0.005/@${s.lat},${s.lng},15z`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3D5A80', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 8 }}>地図</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
