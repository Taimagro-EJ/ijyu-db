import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import RadarChart from '@/components/lifestyle/RadarChartWrapper'

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

function tempContext(t: number | null): string {
  if (t === null) return ''
  if (t >= 20) return '沖縄・四国レベルの温暖さ'
  if (t >= 17) return '比較的温暖な気候'
  if (t >= 13) return '全国平均並みの気候'
  if (t >= 8) return 'やや寒冷な気候'
  return '寒冷地（冬の防寒対策必須）'
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
  return `${Math.round(n / 10000)}万円`
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

  const { data: sfData } = await supabase
    .from('stats_family')
    .select('*')
    .eq('municipality_id', municipalityId)
    .single()

  const sf = sfData as Record<string, unknown> | null

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
    <div style={{ fontFamily: "'BIZ UDPGothic', 'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>

      {/* ヒーロー写真 */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden', background: '#454034' }}>
        {imageUrl ? (
          <Image src={imageUrl} alt={`${m.name as string}の風景`} fill
            style={{ objectFit: 'cover', filter: 'brightness(1.03) saturate(0.88) contrast(1.05)' }} priority />
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
            {sf?.migration_incentive && <span style={{ background: 'rgba(74,124,89,0.8)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>💰 移住支援金あり</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* 気候 */}
        <Section title="🌤 気候">
          <DataBarWithSource label="年間平均気温" value={avgTemp} max={25} unit="℃" context={tempContext(avgTemp)} source={SOURCES.climate} color="#C4922A" />
          <DataBarWithSource label="冬の最低気温" value={m.min_temp_winter as number | null} max={20} unit="℃" invert source={SOURCES.climate} color="#3B7BC4" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            <StatCard label="年間日照時間" value={m.sunshine_hours_annual != null ? `${m.sunshine_hours_annual}h` : '-'} source={SOURCES.climate} />
            <StatCard label="年間降水量" value={m.precipitation_annual != null ? `${m.precipitation_annual}mm` : '-'} source={SOURCES.climate} />
          </div>
        </Section>

        {/* 生活費 */}
        <Section title="💴 生活費（推計）">
          <DataBarWithSource label="1LDK家賃目安" value={rent != null ? rent / 10000 : null} max={15} unit="万円" context={rentContext(rent)} source={SOURCES.rent} invert color="#4A7C59" />
          <DataBarWithSource label="単身月額生活費（推計）" value={m.total_monthly_cost_single != null ? (m.total_monthly_cost_single as number) / 10000 : null} max={25} unit="万円" source={SOURCES.cost} invert color="#4A7C59" context="家賃・食費・光熱費込み" />
          <div style={{ marginTop: 16 }}>
            <StatCard label="車の必要度" value={carLabel} sub={`スコア ${carScore ?? '-'}/5`} />
          </div>
        </Section>

        {/* アクセス */}
        <Section title="🚅 アクセス">
          <DataBarWithSource label="東京まで" value={timeTokyo} max={300} unit="分" context={tokyoContext(timeTokyo)} source={SOURCES.access} invert color="#3D5A80" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            <StatCard label="最寄り新幹線駅" value={(m.nearest_shinkansen as string | null) ?? '-'} />
            <StatCard label="最寄り空港" value={(m.nearest_airport as string | null) ?? '-'} />
            <StatCard label="公共交通スコア" value={m.public_transport_score != null ? `${m.public_transport_score}/5` : '-'} />
          </div>
        </Section>

        {/* 安全・治安 */}
        <Section title="🔒 安全・治安">
          <DataBarWithSource label="刑法犯認知件数（人口10万人あたり）" value={criminalRate} max={800} unit="件" context={crimeContext(criminalRate)} source={SOURCES.crime} invert color="#5B8C5A" />
          <div style={{ marginTop: 16 }}>
            <StatCard label="治安評価" value={safetyLabel(criminalRate)} />
          </div>
        </Section>

        {/* ★ 移住支援・子育て制度 */}
        {hasSupportData && (
          <Section title="🏛 移住支援・子育て制度">
            {/* 移住支援金 */}
            {sf?.migration_incentive != null && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9E9488', margin: '0 0 10px', letterSpacing: '0.06em' }}>移住支援金</h3>
                {sf.migration_incentive ? (
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
                      {sf.migration_incentive_child && (
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
              <SupportBadge label="給食費無償化" active={schoolLunchFree} note={schoolLunchFree ? '小中学校の給食費が無料' : undefined} />
              <SupportBadge label="空き家バンク" active={akiyaBank} note={akiyaBank ? '空き家情報を自治体が仲介' : undefined} />
              {sf?.remote_work_support != null && <SupportBadge label="テレワーク移住支援" active={sf.remote_work_support as boolean} />}
              {sf?.startup_support != null && <SupportBadge label="起業支援制度" active={sf.startup_support as boolean} />}
              {sf?.trial_migration != null && <SupportBadge label="お試し移住制度" active={sf.trial_migration as boolean} />}
            </div>

            <p style={{ fontSize: 11, color: '#9E9488', marginTop: 16, lineHeight: 1.7 }}>
              ※ 支援制度の内容・条件は変更される場合があります。最新情報は各自治体の公式サイトでご確認ください。
            </p>
          </Section>
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
        {hasFacilityData && (
          <Section title="🏪 施設データ">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              <StatCard label="スターバックス" value={`${m.cafe_starbucks}軒`} source={SOURCES.facility} />
              {m.gym_24h_count != null && <StatCard label="24時間ジム" value={`${m.gym_24h_count}軒`} source={SOURCES.facility} />}
              {m.cinema_count != null && <StatCard label="映画館" value={`${m.cinema_count}軒${m.cinema_has_imax ? ' (IMAX)' : ''}`} source={SOURCES.facility} />}
              {m.mall_count != null && <StatCard label="モール" value={`${m.mall_count}軒`} sub={(m.mall_best_tier as string | null) ? `最高Tier: ${m.mall_best_tier}` : undefined} source={SOURCES.facility} />}
              {waitingChildren != null && <StatCard label="待機児童" value={`${waitingChildren}人`} sub={waitingChildren === 0 ? '✓ ゼロ達成' : undefined} source={SOURCES.support} />}
              {m.pediatric_clinics != null && <StatCard label="小児科" value={`${m.pediatric_clinics}件`} source={SOURCES.facility} />}
            </div>
          </Section>
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

        {/* データの限界 */}
        <div style={{ padding: '16px 20px', background: '#F2F0EC', borderRadius: 12, border: '1px solid #E8E4DF' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6B6457', margin: '0 0 8px' }}>⚠️ データの限界について</p>
          <ul style={{ fontSize: 11, color: '#9E9488', lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
            <li>施設データはOpenStreetMapに依存しており、未登録の施設は反映されません</li>
            <li>家賃は推計値であり、実際の物件により大きく異なります</li>
            <li>犯罪データは都道府県単位のため、市区町村ごとの差異を反映していません</li>
            <li>支援制度の情報は変更される場合があります。最新情報は各自治体の公式サイトでご確認ください</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
