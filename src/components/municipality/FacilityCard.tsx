'use client'
import { useState } from 'react'

const CATEGORY_BRANDS: Record<string, { top3: string[]; trend: string | null }> = {
  cafe: { top3: ['スターバックス', 'コメダ珈琲店', 'タリーズコーヒー'], trend: 'ブルーボトルコーヒー' },
  gym: { top3: ['エニタイムフィットネス', 'chocoZAP', 'ゴールドジム'], trend: 'FIT PLACE24' },
  mall: { top3: ['イオンモール', 'ららぽーと', 'アリオ'], trend: 'コストコ' },
  supermarket: { top3: ['イオン', '西友', 'ライフ'], trend: 'イオンタウン' },
  cinema: { top3: ['TOHOシネマズ', 'イオンシネマ', '109シネマズ'], trend: null },
  convenience: { top3: ['セブン-イレブン', 'ファミリーマート', 'ローソン'], trend: null },
}

interface Facility {
  facility_name: string
  brand_name: string | null
  lat: number
  lng: number
  is_24h: boolean
  has_imax: boolean
  distance_from_center_km: number
}

interface FacilityCardProps {
  municipalityId: string
  municipalityName: string
  category: string
  label: string
  value: string
  expectedCount?: number
  sub?: string
  source?: string
}

function MapsLink({ lat, lng, name, municipalityName }: { lat: number; lng: number; name: string; municipalityName: string }) {
  const query = encodeURIComponent(name + ' ' + municipalityName)
  const url = 'https://maps.google.com/maps?q=' + query + '&ll=' + lat + ',' + lng + '&spn=0.005,0.005' + '/@' + lat + ',' + lng + ',15z'
  return <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: '#D46B3A', textDecoration: 'none', whiteSpace: 'nowrap' }}>📍 地図</a>
}

export default function FacilityCard({ municipalityId, municipalityName, category, label, value, expectedCount, sub, source }: FacilityCardProps) {
  const [open, setOpen] = useState(false)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (open) { setOpen(false); return }
    setLoading(true)
    const res = await fetch('/api/facilities?municipality_id=' + municipalityId + '&category=' + category)
    const data = await res.json()
    setFacilities(data)
    setLoading(false)
    setOpen(true)
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          background: open ? '#EAF2EC' : '#F2F0EC',
          borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
          border: open ? '1px solid #4A7C59' : '1px solid transparent',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 11, color: '#9E9488', marginBottom: 6, letterSpacing: '0.06em' }}>
          {label} <span style={{ fontSize: 10, color: '#C4922A' }}>▼ 一覧</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1814', fontFamily: "'DM Mono', monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#A07855', marginTop: 4, fontStyle: 'italic' }}>{sub}</div>}
        {source && <div style={{ fontSize: 10, color: '#9E9488', marginTop: 4 }}>出典: {source}</div>}
      </div>

      {open && (
        <div style={{ marginTop: 8, background: '#fff', borderRadius: 10, border: '1px solid #E8E4DF', padding: '12px 16px' }}>
          {/* 人気ブランド3選 */}
          {CATEGORY_BRANDS[category] && (() => {
            const brands = CATEGORY_BRANDS[category]
            const counts = brands.top3.map(brand => ({
              name: brand,
              count: facilities.filter(f => f.facility_name && f.facility_name.includes(brand.replace('コーヒー','').replace('フィットネス','').trim())).length
            }))
            return (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#F7F5F2', borderRadius: 8 }}>
                <p style={{ fontSize: 10, color: '#9E9488', margin: '0 0 6px', fontWeight: 600, letterSpacing: '0.06em' }}>人気ブランド（この市町村）</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {brands.top3.map((brand, i) => {
                    const cnt = facilities.filter(f => f.facility_name && f.facility_name.includes(brand.split(/[・コーヒーフィットネス]/)[0].trim())).length
                    return <span key={i} style={{ fontSize: 11, padding: '3px 8px', background: cnt > 0 ? '#E8F0E8' : '#F0EDE8', color: cnt > 0 ? '#4A7C59' : '#9E9488', borderRadius: 999 }}>{brand} {cnt > 0 ? `${cnt}軒` : 'なし'}</span>
                  })}
                  {brands.trend && <span style={{ fontSize: 11, padding: '3px 8px', background: '#FFF3E8', color: '#C4922A', borderRadius: 999 }}>🔥 {brands.trend}</span>}
                </div>
              </div>
            )
          })()}
          {loading ? (
            <p style={{ fontSize: 12, color: '#9E9488' }}>読み込み中...</p>
          ) : facilities.length === 0 ? (
            <div>
              <p style={{ fontSize: 12, color: '#9E9488' }}>データなし</p>
              {expectedCount && expectedCount > 0 ? <p style={{ fontSize: 10, color: '#9E9488', marginTop: 4, fontStyle: 'italic' }}>※ OpenStreetMapに未登録のため一覧表示できません。上部の件数（{expectedCount}軒）は別データソースに基づいています。</p> : null}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {facilities.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 12, padding: '6px 0',
                  borderBottom: i < facilities.length - 1 ? '1px solid #F2F0EC' : 'none',
                }}>
                  <span style={{ color: '#454034', fontWeight: 500 }}>
                    {f.facility_name}
                    {f.is_24h && <span style={{ marginLeft: 6, fontSize: 10, background: '#F0DBC8', color: '#D46B3A', padding: '1px 6px', borderRadius: 4 }}>24h</span>}
                    {f.has_imax && <span style={{ marginLeft: 6, fontSize: 10, background: '#E8F0FE', color: '#3D5A80', padding: '1px 6px', borderRadius: 4 }}>IMAX</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ color: '#9E9488', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                      {f.distance_from_center_km}km
                    </span>
                    {f.lat && f.lng && <MapsLink lat={f.lat} lng={f.lng} name={f.facility_name} municipalityName={municipalityName} />}
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 10, color: '#9E9488', marginTop: 4 }}>※ 中心部からの距離順・上位20件</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
