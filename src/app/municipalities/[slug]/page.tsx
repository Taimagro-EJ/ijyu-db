import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
const RadarChart = dynamic(() => import('@/components/lifestyle/RadarChartWrapper'))
import SourceNote from '@/components/municipality/SourceNote'
const ChapterSummary = dynamic(() => import('@/components/municipality/ChapterSummary'), { loading: () => null })
const InternetCTA = dynamic(() => import('@/components/municipality/AffiliateCTA').then(mod => ({ default: mod.InternetCTA })))
const MovingCTA = dynamic(() => import('@/components/municipality/AffiliateCTA').then(mod => ({ default: mod.MovingCTA })))
import SectionHeader from '@/components/municipality/SectionHeader'
import BrandCard from '@/components/municipality/BrandCard'
const FacilityCard = dynamic(() => import('@/components/municipality/FacilityCard'))

export const revalidate = 60

const SOURCES = {
  climate: '気象庁 1991-2020年平年値',
  rent: '国土交通省 不動産情報ライブラリ（推計値）',
  cost: '移住DB独自推計（家賃・食費・光熱費）',
  access: 'Google Maps 所要時間データ（推計）',
  crime: '警察庁 犯罪統計（都道府県単位）',
  facility: 'OpenStreetMap（2026年3月時点）',
  support: '各自治体公式情報 / 地方創生ポータル（2026年3月時点）',
}

function rentContext(v: number | null): string {
  if (v === null) return ''
  const ratio = Math.round((v / 110000) * 10) / 10
  if (ratio <= 0.6) return `東京の約${ratio}倍（かなり安い）`
  if (ratio <= 0.8) return `東京の約${ratio}倍（安い）`
  return `東京の約${ratio}倍`
}

function tokyoContext(m: number | null): string {
  if (m === null) return ''
  if (m <= 60) return '日帰り出張も余裕'
  if (m <= 120) return '週1出社でも現実的'
  if (m <= 180) return '月数回の出社向け'
  return '完全リモート向け'
}

const NATIONAL_AVG_TEMP = 15.5
function tempContext(t: number | null): string {
  if (t === null) return ''
  const diff = t - NATIONAL_AVG_TEMP
  const diffStr = diff >= 0 ? `全国平均+${diff.toFixed(1)}℃` : `全国平均${diff.toFixed(1)}℃`
  if (t >= 18) return `温暖・${diffStr}`
  if (t >= 13) return `標準的・${diffStr}`
  if (t >= 10) return `やや涼しい・${diffStr}`
  return `寒冷地・${diffStr}`
}

function crimeContext(rate: number | null): string {
  if (rate === null) return ''
  if (rate < 150) return '全国トップクラスの安全性'
  if (rate < 200) return '非常に安全な水準'
  if (rate < 300) return '全国平均より安全'
  if (rate < 400) return '全国平均並み'
  return '全国平均よりやや高め'
}

function DataBarWithSource({ label, value, max, unit, source, invert = false, color, context }: {
  label: string; value: number | null; max: number; unit: string;
  source?: string; invert?: boolean; color?: string; context?: string;
}) {
  if (value === null || value === undefined) return null
  const pct = Math.min(100, (value / max) * 100)
  const displayPct = invert ? 100 - pct : pct
  const isGood = invert ? pct < 40 : pct > 60
  const isBad = invert ? pct > 70 : pct < 30
  const barColor = color ?? (isGood ? '#4A7C59' : isBad ? '#B84C3A' : '#D46B3A')
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F2F0EC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#454034' }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#1A1814', fontFamily: "'DM Mono', monospace" }}>
          {typeof value === 'number' ? value.toLocaleString() : value}{unit}
        </span>
      </div>
      <div style={{ height: 4, background: '#F2F0EC', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${displayPct}%`, backgroundColor: barColor, borderRadius: 999, transition: 'width 0.7s ease' }} />
      </div>
      {context && <p style={{ fontSize: 11, color: '#A07855', margin: '2px 0 0', fontStyle: 'italic' }}>{context}</p>}
      {source && <p style={{ fontSize: 10, color: '#9E9488', margin: '2px 0 0' }}>出典: {source}</p>}
    </div>
  )
}

function StatCard({ label, value, sub, source }: { label: string; value: string; sub?: string; source?: string }) {
  return (
    <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: '#9E9488', marginBottom: 6, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1814', fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#A07855', marginTop: 4, fontStyle: 'italic' }}>{sub}</div>}
      {source && <div style={{ fontSize: 10, color: '#9E9488', marginTop: 4 }}>出典: {source}</div>}
    </div>
  )
}

function SupportBadge({ label, active, note }: { label: string; active: boolean | null; note?: string }) {
  if (active === null) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 10,
      background: active ? '#F0F7F2' : '#F7F5F2',
      border: `1px solid ${active ? '#4A7C59' : '#E8E4DF'}`,
    }}>
      <span style={{ fontSize: 18 }}>{active ? '✅' : '❌'}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#2D6648' : '#9E9488' }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: '#9E9488', marginTop: 1 }}>{note}</div>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 15, fontWeight: 700, color: '#454034', margin: '0 0 20px',
        paddingBottom: 8,
        background: 'linear-gradient(90deg, transparent 0%, #E8E4DF 10%, #D4CCC2 30%, #E8E4DF 60%, transparent 100%)',
        backgroundRepeat: 'no-repeat', backgroundSize: '100% 1px', backgroundPosition: 'bottom',
      }}>{title}</h2>
      {children}
    </div>
  )
}

function safetyLabel(rate: number | null) {
  if (rate === null) return '-'
  if (rate < 200) return '◎ 非常に安全'
  if (rate < 300) return '○ 普通'
  if (rate < 400) return '△ やや多い'
  return '× 多い'
}

function fmt万(v: unknown): string {
  const n = Number(v)
  if (v === null || v === undefined || isNaN(n)) return '-'
  return `${(n / 10000).toFixed(1)}万円`
}

function fmt万1(v: unknown): string {
  const n = Number(v)
  if (v === null || v === undefined || isNaN(n)) return '-'
  return `${(Math.floor(n / 10000 * 10) / 10)}万円`
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, background: '#E8E4DF', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${value}%`, backgroundColor: color, borderRadius: 999, transition: 'width 0.7s ease' }} />
    </div>
  )
}


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabase
    .from('municipality_overview')
    .select('name, prefecture, rent_1ldk_estimate, lifestyle_score, time_to_tokyo, image_url')
    .eq('slug', slug)
    .single()
  if (!data) return { title: '市町村データ | 移住DB' }
  const rent = data.rent_1ldk_estimate ? `家賃${(data.rent_1ldk_estimate / 10000).toFixed(1)}万` : ''
  const tokyo = data.time_to_tokyo ? `東京${data.time_to_tokyo}分` : ''
  const score = data.lifestyle_score ? `充実度${data.lifestyle_score}点` : ''
  const title = `${data.name}（${data.prefecture}）の移住データ`
  const description = `${data.name}の移住情報。${[rent, tokyo, score].filter(Boolean).join('・')}。527市町村のデータベースで比較。`
  return {
    title, description,
    openGraph: {
      title, description, type: 'article',
      url: `https://www.ijyu-data.com/municipalities/${slug}`,
      siteName: '移住DB',
      ...(data.image_url ? { images: [{ url: data.image_url, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function MunicipalityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data, error } = await supabase
    .from('municipality_overview')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error || !data) notFound()

  const m = data as Record<string, unknown>
  const municipalityId = m.id as string

  const [sfResult, brandsResult, summariesResult] = await Promise.all([
    supabase.from('stats_family').select('*').eq('municipality_id', municipalityId).single(),
    supabase.from('municipality_lifestyle_brands').select('*').eq('municipality_id', municipalityId).single(),
    supabase.from('ai_chapter_summaries').select('chapter_key, summary_text').eq('municipality_code', municipalityId),
  ])

  const sf = sfResult.data as Record<string, unknown> | null
  const brands = brandsResult.data as Record<string, number> | null
  const summariesData = summariesResult.data
  const summaries = (summariesData ?? []).reduce((acc: Record<string, string>, s: any) => {
    acc[s.chapter_key] = s.summary_text
    return acc
  }, {})

  const carScore = m.car_necessity_score as number | null
  const carLabel = (['', '必須', '高い', '普通', '低い', '不要'] as const)[carScore ?? 0] ?? '-'
  const lifestyleScore = (m.lifestyle_score as number | null) ?? 0
  const scoreColor = lifestyleScore >= 70 ? '#4A7C59' : lifestyleScore >= 45 ? '#D46B3A' : '#B84C3A'
  const hasLifestyleData = m.lifestyle_score != null
  const hasFacilityData = m.cafe_starbucks != null
  const imageUrl = m.image_url as string | null
  const rent = m.rent_1ldk_estimate as number | null
  const timeTokyo = m.time_to_tokyo as number | null
  const avgTemp = m.avg_temp_annual as number | null
  const criminalRate = m.criminal_rate as number | null

  const radarScores = {
    shopping: m.score_shopping as number | null,
    cafe: m.score_cafe as number | null,
    dining: m.score_dining as number | null,
    fitness: m.score_fitness as number | null,
    entertainment: m.score_entertainment as number | null,
    family: m.score_family as number | null,
    grocery: m.score_grocery as number | null,
  }

  // 移住支援データ
  const hasSupportData = sf != null
  const incentiveAmount = sf?.migration_incentive_amount as number | null
  const incentiveSingle = sf?.migration_incentive_single as number | null
  const medicalAge = (sf?.medical_subsidy_age ?? m.medical_subsidy_age) as number | null
  const waitingChildren = (sf?.waiting_children ?? m.waiting_children) as number | null
  const schoolLunchFree = sf?.school_lunch_free as boolean | null
  const akiyaBank = sf?.akiya_bank as boolean | null

  // 医療費助成の表示文
  const medicalAgeLabel = medicalAge != null
    ? medicalAge >= 18 ? `18歳まで（高校卒業）`
    : medicalAge >= 15 ? `15歳まで（中学卒業）`
    : `${medicalAge}歳まで`
    : null

  return (
    <>
    {imageUrl && <link rel="preload" as="image" href={imageUrl} fetchPriority="high" />}
    <div style={{ fontFamily: "'BIZ UDPGothic', 'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "City",
          "name": m.name,
          "containedInPlace": { "@type": "State", "name": m.prefecture },
          "description": `${m.prefecture as string}${m.name as string}への移住データ。生活費・気候・アクセス・支援制度を527市町村で比較。`,
          "url": `https://www.ijyu-data.com/municipalities/${slug}`,
          ...(imageUrl ? { "image": imageUrl } : {}),
          ...((m.latitude && m.longitude) ? { "geo": { "@type": "GeoCoordinates", "latitude": m.latitude, "longitude": m.longitude } } : {}),
          "additionalProperty": [
            ...(avgTemp != null ? [{ "@type": "PropertyValue", "name": "年間平均気温", "value": `${avgTemp}℃` }] : []),
            ...(rent != null ? [{ "@type": "PropertyValue", "name": "1LDK家賃目安", "value": fmt万1(rent) }] : []),
            ...(timeTokyo != null ? [{ "@type": "PropertyValue", "name": "東京までの所要時間", "value": `${timeTokyo}分` }] : []),
            ...(m.total_monthly_cost_single != null ? [{ "@type": "PropertyValue", "name": "単身月額生活費", "value": fmt万(m.total_monthly_cost_single) }] : []),
          ]
        }) }}
      />

      {/* ヒーロー写真 */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden', background: '#454034' }}>
        {imageUrl ? (
          <Image src={imageUrl} alt={`${m.name as string}の風景`} fill sizes="100vw" style={{ objectFit: 'cover', filter: 'brightness(1.03) saturate(0.88) contrast(1.05)' }} priority />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #454034 0%, #6B6457 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, opacity: 0.3 }}>🏘</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
        <div style={{ position: 'absolute', top: 20, left: 24 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, textDecoration: 'none', background: 'rgba(0,0,0,0.25)', padding: '6px 14px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
            ← 一覧に戻る
          </Link>
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '0 0 4px' }}>{m.prefecture as string} · {m.region as string}</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px', fontFamily: "'Shippori Mincho', serif", textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            {m.name as string}
          </h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {rent != null && <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>🏠 家賃 {fmt万1(rent)}</span>}
            {timeTokyo != null && <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>🚄 東京 {timeTokyo}分</span>}
            {avgTemp != null && <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>🌡 {avgTemp}℃</span>}
            {lifestyleScore > 0 && <span style={{ background: scoreColor, color: '#fff', fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 999, fontFamily: "'DM Mono', monospace" }}>⭐ {lifestyleScore}点</span>}
            {!!sf?.migration_incentive && <span style={{ background: 'rgba(74,124,89,0.8)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>💰 移住支援金あり</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* 気候 */}
        <SectionHeader chapter="CHAPTER 01" title="気候・環境" subtitle="この街の自然条件" />
        <Section title="🌤 気候">
          <DataBarWithSource label="年間平均気温" value={avgTemp} max={25} unit="℃" context={tempContext(avgTemp)} source={SOURCES.climate} color={avgTemp != null && avgTemp >= 18 && avgTemp <= 25 ? "#4A7C59" : avgTemp != null && avgTemp >= 13 ? "#C4922A" : "#3B7BC4"} />
          {avgTemp != null && <p style={{ fontSize: 11, color: avgTemp >= 18 && avgTemp <= 25 ? "#4A7C59" : "#9E9488", marginTop: 2 }}>{avgTemp >= 18 && avgTemp <= 25 ? "✅ 快適気温帯（18〜25℃）内" : avgTemp > 25 ? "⚠️ 快適気温帯（18〜25℃）を上回る" : "❄️ 快適気温帯（18〜25℃）を下回る"}</p>}
          <DataBarWithSource label="冬の最低気温" value={m.min_temp_winter as number | null} max={20} unit="℃" invert source={SOURCES.climate} color="#3B7BC4" />
          <DataBarWithSource label="夏の最高気温" value={m.max_temp_summer as number | null} max={40} unit="℃" source={SOURCES.climate} color="#D46B3A" context={(m.max_temp_summer as number | null) != null && (m.max_temp_summer as number) <= 30 ? "猛暑日がほぼない" : (m.max_temp_summer as number | null) != null && (m.max_temp_summer as number) <= 33 ? "東京より涼しい夏" : "真夏は暑い"} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            <StatCard label="年間日照時間" value={m.sunshine_hours_annual != null ? `${m.sunshine_hours_annual}h` : '-'} source={SOURCES.climate} />
            <StatCard label="年間降水量" value={m.precipitation_annual != null ? `${m.precipitation_annual}mm` : '-'} source={SOURCES.climate} />
          </div>
          <ChapterSummary summary={summaries["climate"] ?? null} />
          <SourceNote sourceKey="climate" />
        </Section>

        {/* 生活費 */}
        <SectionHeader chapter="CHAPTER 02" title="生活費" subtitle="お金のリアル" />
        <Section title="💴 生活費（推計）">
          <DataBarWithSource label="1LDK家賃目安" value={rent != null ? rent / 10000 : null} max={15} unit="万円" context={rentContext(rent)} source={SOURCES.rent} invert color="#4A7C59" />
          <DataBarWithSource label="単身月額生活費（推計）" value={m.total_monthly_cost_single != null ? (m.total_monthly_cost_single as number) / 10000 : null} max={25} unit="万円" source={SOURCES.cost} invert color="#4A7C59" context="家賃・食費・光熱費込み" />
          <div style={{ marginTop: 16 }}>
            <StatCard label="車の必要度" value={carLabel} sub={`スコア ${carScore ?? '-'}/5`} />
          </div>
          <SourceNote sourceKey="rent" />
          <ChapterSummary summary={summaries['cost'] ?? null} />
        </Section>
        <InternetCTA />

        {/* アクセス */}
        <Section title="🚅 アクセス">
          <DataBarWithSource label="東京まで" value={timeTokyo} max={300} unit="分" context={tokyoContext(timeTokyo)} source={SOURCES.access} invert color="#3D5A80" />
          {m.time_to_osaka != null && <DataBarWithSource label="大阪まで" value={m.time_to_osaka as number} max={300} unit="分" source={SOURCES.access} invert color="#3D5A80" />}
          {m.time_to_nagoya != null && <DataBarWithSource label="名古屋まで" value={m.time_to_nagoya as number} max={300} unit="分" source={SOURCES.access} invert color="#3D5A80" />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            <StatCard label="最寄り新幹線駅" value={(m.nearest_shinkansen as string | null) ?? '-'} />
            <StatCard label="最寄り空港" value={(m.nearest_airport as string | null) ?? '-'} />
            <StatCard label="公共交通スコア" value={m.public_transport_score != null ? `${m.public_transport_score}/5` : '-'} />
          </div>
          {(() => {
            const pref = m.prefecture as string
            const linearStation =
              pref === '神奈川県' ? '神奈川県駅（橋本市）東京約10分' :
              pref === '山梨県' ? '山梨県駅（甲府市）東京約25分' :
              pref === '長野県' ? '長野県駅（飯田市）東京約45分' :
              pref === '岐阜県' ? '岐阜県駅（中津川市）名古屋約10分' :
              pref === '愛知県' ? '名古屋駅（終点）品川約40分' : null
            if (!linearStation) return null
            return (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'linear-gradient(135deg, #F0F7FF 0%, #E8F0FE 100%)', borderRadius: 8, border: '1px solid #C5D8F7', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🔵</span>
                <div>
                  <p style={{ fontSize: 11, color: '#3D5A80', fontWeight: 700, margin: '0 0 3px' }}>リニア中央新幹線（2030年代半ば開業予定）</p>
                  <p style={{ fontSize: 11, color: '#5B7FA6', margin: 0 }}>最寄りリニア駅: {linearStation}</p>
                  <p style={{ fontSize: 10, color: '#9E9488', margin: '2px 0 0' }}>品川〜名古屋を約40分で結ぶ予定。工事遅延により2030年代半ばの見込み。</p>
                </div>
              </div>
            )
          })()}
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#F7F5F2', borderRadius: 10, border: '1px solid #E8E4DF' }}>
            <p style={{ fontSize: 11, color: '#9E9488', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>🗺 Google Maps 経路検索</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={`https://www.google.com/maps/dir/${encodeURIComponent((m.name as string) + (m.prefecture as string))}/東京駅`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: '5px 12px', background: '#fff', border: '1px solid #E8E4DF', borderRadius: 999, color: '#3D5A80', textDecoration: 'none', whiteSpace: 'nowrap' }}>→ 東京駅</a>
              <a href={`https://www.google.com/maps/dir/${encodeURIComponent((m.name as string) + (m.prefecture as string))}/大阪駅`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: '5px 12px', background: '#fff', border: '1px solid #E8E4DF', borderRadius: 999, color: '#3D5A80', textDecoration: 'none', whiteSpace: 'nowrap' }}>→ 大阪駅</a>
              <a href={`https://www.google.com/maps/dir/${encodeURIComponent((m.name as string) + (m.prefecture as string))}/名古屋駅`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: '5px 12px', background: '#fff', border: '1px solid #E8E4DF', borderRadius: 999, color: '#3D5A80', textDecoration: 'none', whiteSpace: 'nowrap' }}>→ 名古屋駅</a>
            </div>
          </div>
        </Section>
        <ChapterSummary summary={summaries['access'] ?? null} />
        <MovingCTA municipalityName={m.name as string} />

        {/* 安全・治安 */}
        <Section title="🔒 安全・治安">
          <DataBarWithSource label="刑法犯認知件数（人口10万人あたり）" value={criminalRate} max={800} unit="件" context={crimeContext(criminalRate)} source={SOURCES.crime} invert color="#5B8C5A" />
          <div style={{ marginTop: 16 }}>
            <StatCard label="治安評価" value={safetyLabel(criminalRate)} />
          </div>
          <SourceNote sourceKey="crime" />
        </Section>

        {/* ★ 移住支援・子育て制度 */}
        {hasSupportData && (
          <>
          <SectionHeader chapter="CHAPTER 03" title="移住支援・子育て" subtitle="行政の手厚さ" />
          <Section title="🏛 移住支援・子育て制度">
            {/* 移住支援金 */}
            {(sf?.migration_incentive !== undefined && sf?.migration_incentive !== null) && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9E9488', margin: '0 0 10px', letterSpacing: '0.06em' }}>移住支援金</h3>
                {!!sf.migration_incentive ? (
                  <div style={{ background: '#F0F7F2', borderRadius: 14, padding: '16px 20px', border: '1px solid #C5DFD0' }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                      {incentiveAmount && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6B9E7E', marginBottom: 2 }}>世帯向け</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#2D6648', fontFamily: "'DM Mono', monospace" }}>{fmt万(incentiveAmount)}</div>
                        </div>
                      )}
                      {incentiveSingle && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6B9E7E', marginBottom: 2 }}>単身向け</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#2D6648', fontFamily: "'DM Mono', monospace" }}>{fmt万(incentiveSingle)}</div>
                        </div>
                      )}
                      {!!sf.migration_incentive_child && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6B9E7E', marginBottom: 2 }}>子ども加算（1人あたり）</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#2D6648', fontFamily: "'DM Mono', monospace" }}>{fmt万(sf.migration_incentive_child as number)}</div>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: '#6B9E7E', margin: 0 }}>
                      ※ 国の移住支援事業に基づく基本額。条件（就業・テレワーク等）や自治体独自の加算については各自治体の公式情報をご確認ください。
                    </p>
                    <p style={{ fontSize: 10, color: '#9E9488', margin: '4px 0 0' }}>出典: {SOURCES.support}</p>
                  </div>
                ) : (
                  <div style={{ background: '#F7F5F2', borderRadius: 12, padding: '12px 16px', border: '1px solid #E8E4DF' }}>
                    <p style={{ fontSize: 13, color: '#9E9488', margin: 0 }}>❌ 国の移住支援事業に未参加（独自制度がある場合があります）</p>
                  </div>
                )}
              </div>
            )}

            {/* 子育て支援 */}
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9E9488', margin: '0 0 10px', letterSpacing: '0.06em' }}>子育て支援</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
              {medicalAgeLabel && (
                <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#9E9488', marginBottom: 4 }}>子ども医療費助成</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1814' }}>通院 {medicalAgeLabel}</div>
                  {sf?.medical_copay_exists === false && <div style={{ fontSize: 11, color: '#4A7C59', marginTop: 2 }}>✓ 自己負担なし</div>}
                  <div style={{ fontSize: 10, color: '#9E9488', marginTop: 4 }}>出典: {SOURCES.support}</div>
                </div>
              )}
              {waitingChildren !== null && (
                <div style={{ background: waitingChildren === 0 ? '#F0F7F2' : '#F7F5F2', borderRadius: 12, padding: '14px 16px', border: waitingChildren === 0 ? '1px solid #C5DFD0' : '1px solid #E8E4DF' }}>
                  <div style={{ fontSize: 11, color: '#9E9488', marginBottom: 4 }}>待機児童数</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: waitingChildren === 0 ? '#2D6648' : '#1A1814' }}>
                    {waitingChildren === 0 ? '✓ ゼロ達成' : `${waitingChildren}人`}
                  </div>
                  <div style={{ fontSize: 10, color: '#9E9488', marginTop: 4 }}>出典: {SOURCES.support}</div>
                </div>
              )}
            </div>

            {/* その他支援制度 */}
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9E9488', margin: '0 0 10px', letterSpacing: '0.06em' }}>その他の支援制度</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              <SupportBadge label="給食費無償化" active={schoolLunchFree as boolean | null} note={schoolLunchFree ? '小中学校の給食費が無料' : undefined} />
              <SupportBadge label="空き家バンク" active={akiyaBank as boolean | null} note={akiyaBank ? '空き家情報を自治体が仲介' : undefined} />
              {sf?.remote_work_support !== undefined && sf?.remote_work_support !== null && <SupportBadge label="テレワーク移住支援" active={!!(sf.remote_work_support)} />}
              {sf?.startup_support !== undefined && sf?.startup_support !== null && <SupportBadge label="起業支援制度" active={!!(sf.startup_support)} />}
              {sf?.trial_migration !== undefined && sf?.trial_migration !== null && <SupportBadge label="お試し移住制度" active={!!(sf.trial_migration)} />}
            </div>

            <p style={{ fontSize: 11, color: '#9E9488', marginTop: 16, lineHeight: 1.7 }}>
              ※ 支援制度の内容・条件は変更される場合があります。最新情報は各自治体の公式サイトでご確認ください。
            </p>
          </Section>
          </>
        )}

        {/* 生活リアリティ */}
        {hasLifestyleData && (
          <Section title="⭐ 生活リアリティ指数">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
              <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '20px' }}>
                <p style={{ fontSize: 12, color: '#9E9488', margin: '0 0 12px', textAlign: 'center' }}>カテゴリ別スコア（全国平均との比較）</p>
                <RadarChart municipalityName={m.name as string} scores={radarScores} />
              </div>
              <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '20px' }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#6B6457' }}>総合スコア</span>
                    <span style={{ fontSize: 36, fontWeight: 700, color: '#1A1814', fontFamily: "'DM Mono', monospace" }}>
                      {lifestyleScore}<span style={{ fontSize: 16, color: '#9E9488' }}>/100</span>
                    </span>
                  </div>
                  <ScoreBar value={lifestyleScore} color={scoreColor} />
                  {m.rank_total != null && <p style={{ fontSize: 11, color: '#9E9488', marginTop: 6 }}>全国 {m.rank_total as number}位 / 527市町村</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: '🛒 ショッピング', value: m.score_shopping as number | null, color: '#A07855' },
                    { label: '☕ カフェ', value: m.score_cafe as number | null, color: '#6B4F36' },
                    { label: '🍜 グルメ', value: m.score_dining as number | null, color: '#A07855' },
                    { label: '🏋️ フィットネス', value: m.score_fitness as number | null, color: '#4A7C59' },
                    { label: '🎬 エンタメ', value: m.score_entertainment as number | null, color: '#3D5A80' },
                    { label: '👶 子育て', value: m.score_family as number | null, color: '#C4922A' },
                    { label: '🛍 食料品', value: m.score_grocery as number | null, color: '#8B7D6B' },
                  ].filter(item => item.value != null).map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6457', marginBottom: 3 }}>
                        <span>{item.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#1A1814' }}>{String(item.value)}</span>
                      </div>
                      <ScoreBar value={item.value!} color={item.value! >= 70 ? item.color : item.value! >= 45 ? '#D46B3A' : '#9E9488'} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E8E4DF' }}>
                  <p style={{ fontSize: 10, color: '#9E9488', lineHeight: 1.6 }}>
                    💡 施設データ（OpenStreetMap）をもとに、人口密度パーセンタイル正規化で算出。全国527市町村で比較。
                  </p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* 施設データ */}
        <SectionHeader chapter="CHAPTER 04" title="まちの機能" subtitle="生活インフラの充実度" />
        {hasFacilityData && (
          <>
          {/* A. 安心の基盤 */}
          <Section title="🏥 安心の基盤">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {(m as any).hospital_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="hospital" label="総合病院" expectedCount={(m as any).hospital_count as number} value={`${(m as any).hospital_count}軒`} source={SOURCES.facility} />}
              {(m as any).clinic_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="clinic" label="診療所" expectedCount={(m as any).clinic_count as number} value={`${(m as any).clinic_count}軒`} source={SOURCES.facility} />}
              {m.pediatric_clinics != null && <StatCard label="小児科" value={`${m.pediatric_clinics}件`} source={SOURCES.facility} />}
            </div>
          </Section>
          {/* B. 日常の買い物 */}
          <Section title="🛒 日常の買い物">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {m.supermarket_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="supermarket" label="スーパー" expectedCount={m.supermarket_count as number} value={`${m.supermarket_count}軒`} source={SOURCES.facility} />}
              {m.convenience_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="convenience" label="コンビニ" expectedCount={m.convenience_count as number} value={`${m.convenience_count}軒`} source={SOURCES.facility} />}
              {m.drugstore_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="drugstore" label="ドラッグストア" expectedCount={m.drugstore_count as number} value={`${m.drugstore_count}軒`} source={SOURCES.facility} />}
              {m.homecenter_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="homecenter" label="ホームセンター" expectedCount={m.homecenter_count as number} value={`${m.homecenter_count}軒`} source={SOURCES.facility} />}
            </div>
          </Section>
          {/* C. 学びと文化 */}
          <Section title="📚 学びと文化">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {(m as any).library_count != null && (m as any).library_count > 0 && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="library" label="図書館" expectedCount={(m as any).library_count as number} value={`${(m as any).library_count}軒`} source={SOURCES.facility} />}
              {(m as any).bookstore_count != null && (m as any).bookstore_count > 0 && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="bookstore" label="書店" expectedCount={(m as any).bookstore_count as number} value={`${(m as any).bookstore_count}軒`} source={SOURCES.facility} />}
              {m.cinema_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="cinema" label="映画館" expectedCount={m.cinema_count as number} value={`${m.cinema_count}軒${m.cinema_has_imax ? ' (IMAX)' : ''}`} source={SOURCES.facility} />}
            </div>
          </Section>
          {/* D. ウェルビーイング */}
          <Section title="🧘 ウェルビーイング">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {m.gym_24h_count != null && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="gym" label="フィットネス" expectedCount={m.gym_24h_count as number} value={`${m.gym_24h_count}軒`} source={SOURCES.facility} />}
              {(m as any).onsen_count != null && (m as any).onsen_count > 0 && <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="onsen" label="温泉・銭湯" expectedCount={(m as any).onsen_count as number} value={`${(m as any).onsen_count}軒`} source={SOURCES.facility} />}
              <FacilityCard municipalityId={municipalityId} municipalityName={m.name as string} category="cafe" label="カフェ" expectedCount={m.cafe_starbucks as number} value={`${m.cafe_starbucks}軒`} source={SOURCES.facility} />
            </div>
          </Section>
          {/* E. おでかけと暮らし */}
          {brands && (brands.aeon_mall_count > 0 || brands.lalaport_count > 0 || brands.nitori_count > 0 || brands.muji_count > 0 || brands.yamada_count > 0 || brands.ks_count > 0 || brands.costco_count > 0 || brands.donki_count > 0 || brands.uniqlo_count > 0 || brands.gu_count > 0 || brands.ikea_count > 0 || brands.kaldi_count > 0 || brands.yodobashi_count > 0 || brands.bic_count > 0 || brands.montbell_count > 0 || brands.snowpeak_count > 0 || brands.xebio_count > 0 || brands.seria_count > 0 || brands.threecoins_count > 0 || brands.outlet_count > 0) && (
          <Section title="🛍 おでかけと暮らし">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {brands.aeon_mall_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="イオンモール" count={brands.aeon_mall_count} brandPattern="イオンモール" />}
              {brands.lalaport_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ららぽーと" count={brands.lalaport_count} brandPattern="ららぽーと" />}
              {brands.donki_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ドン・キホーテ" count={brands.donki_count} brandPattern="ドン・キホーテ" />}
              {brands.nitori_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ニトリ" count={brands.nitori_count} brandPattern="ニトリ" />}
              {brands.muji_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="無印良品" count={brands.muji_count} brandPattern="無印良品" />}
              {brands.yamada_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ヤマダ電機" count={brands.yamada_count} brandPattern="ヤマダ" />}
              {brands.ks_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ケーズデンキ" count={brands.ks_count} brandPattern="ケーズ" />}
              {brands.costco_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="コストコ" count={brands.costco_count} brandPattern="コストコ" />}
              {brands.uniqlo_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ユニクロ" count={brands.uniqlo_count} brandPattern="ユニクロ" />}
              {brands.gu_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="GU" count={brands.gu_count} brandPattern="GU" />}
              {brands.ikea_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="IKEA" count={brands.ikea_count} brandPattern="IKEA" />}
              {brands.kaldi_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="カルディ" count={brands.kaldi_count} brandPattern="カルディ" />}
              {brands.yodobashi_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ヨドバシ" count={brands.yodobashi_count} brandPattern="ヨドバシ" />}
              {brands.bic_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ビックカメラ" count={brands.bic_count} brandPattern="ビックカメラ" />}
              {brands.montbell_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="モンベル" count={brands.montbell_count} brandPattern="モンベル" />}
              {brands.snowpeak_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="スノーピーク" count={brands.snowpeak_count} brandPattern="スノーピーク" />}
              {brands.xebio_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="ゼビオ" count={brands.xebio_count} brandPattern="ゼビオ" />}
              {brands.seria_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="セリア" count={brands.seria_count} brandPattern="セリア" />}
              {brands.threecoins_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="3COINS" count={brands.threecoins_count} brandPattern="3COINS" />}
              {brands.outlet_count > 0 && <BrandCard municipalityId={municipalityId} municipalityName={m.name as string} label="アウトレット" count={brands.outlet_count} brandPattern="アウトレット" />}
            </div>
          </Section>
          )}
          <ChapterSummary summary={summaries['facilities'] ?? null} />
          <SourceNote sourceKey="facilities" />
          </>
        )}

        {/* CTA */}
        <div style={{ margin: '32px 0', padding: '24px 28px', background: 'linear-gradient(135deg, #F2F0EC 0%, #F0DBC8 100%)', borderRadius: 16, border: '1px solid #E8E4DF' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>🤖</span>
            <div>
              <p style={{ fontWeight: 700, color: '#454034', fontSize: 16, margin: '0 0 6px', fontFamily: "'Shippori Mincho', serif" }}>
                {m.name as string}への移住、あなたの条件で試算してみませんか？
              </p>
              <p style={{ fontSize: 13, color: '#6B6457', margin: '0 0 14px' }}>527市町村のデータから、年収・家族構成・希望条件に合う移住先をAIが提案します。</p>
              <Link href="/chat" style={{ display: 'inline-block', padding: '10px 20px', background: '#D46B3A', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                AIに無料相談する
              </Link>
            </div>
          </div>
        </div>

        {/* データについて */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E8E4DF' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#454034', margin: '0 0 12px', fontFamily: "'Shippori Mincho', serif" }}>📊 データについて</h3>
          <div style={{ fontSize: 11, color: '#9E9488', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 8px' }}>移住DBのデータは以下の公的統計・オープンデータを組み合わせて構成しています。</p>
            <ul style={{ margin: '0 0 12px', paddingLeft: 16 }}>
              <li>施設データ: <a href="https://download.geofabrik.de/asia/japan.html" target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>OpenStreetMap（Geofabrik 2026年3月版）</a> — 半径5〜30km以内の施設をカウント</li>
              <li>人口: <a href="https://www.e-stat.go.jp/" target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>総務省 住民基本台帳（2020年版）</a></li>
              <li>家賃: <a href="https://www.reinfolib.mlit.go.jp/" target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>国土交通省 不動産情報ライブラリ（2025年版）</a></li>
              <li>気候: <a href="https://www.data.jma.go.jp/" target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>気象庁 過去の気象データ（2024年版）</a></li>
              <li>犯罪率: <a href="https://www.npa.go.jp/publications/statistics/" target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>警察庁 犯罪統計（2024年版・都道府県単位）</a></li>
              <li>移住支援金: <a href="https://www.chisou.go.jp/sousei/ijyu_shienkin.html" target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>内閣官房 地方創生 移住支援金（2025年版）</a></li>
              <li>生活リアリティ指数: 移住DB独自算出（v7 — 施設密度60% + 環境40%）</li>
            </ul>
            <p style={{ margin: 0, color: '#B0A99D' }}>最終更新: 2026年3月 ／ データの誤りを見つけた場合は<a href="/contact" style={{ color: '#B0A99D', textDecoration: 'underline' }}>お問い合わせ</a>ください。</p>
          </div>
        </div>
      </div>
    </div>
  </>
  )
}
