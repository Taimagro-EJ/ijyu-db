import { supabase, Municipality } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600

async function getMunicipality(slug: string): Promise<Municipality | null> {
  const { data, error } = await supabase
    .from('municipality_overview')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return data as Municipality
}

export async function generateStaticParams() {
  const { data } = await supabase.from('municipalities').select('slug')
  return (data ?? []).map(m => ({ slug: m.slug }))
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {children}
      </div>
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

export default async function MunicipalityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = await getMunicipality(slug)
  if (!m) notFound()

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* ヘッダー */}
      <header style={{ background: '#0f172a', color: '#fff', padding: '20px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← 一覧に戻る</Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{m.name}</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{m.prefecture} · {m.region}</p>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* 気候 */}
        <Section title="🌤 気候">
          <StatCard label="年間平均気温" value={m.avg_temp_annual !== null ? `${m.avg_temp_annual}℃` : '-'} />
          <StatCard label="1月平均気温" value={m.avg_temp_jan !== null ? `${m.avg_temp_jan}℃` : '-'} sub="冬の寒さの目安" />
          <StatCard label="7月平均気温" value={m.avg_temp_jul !== null ? `${m.avg_temp_jul}℃` : '-'} sub="夏の暑さの目安" />
          <StatCard label="冬の最低気温" value={m.min_temp_winter !== null ? `${m.min_temp_winter}℃` : '-'} />
          <StatCard label="年間日照時間" value={m.sunshine_hours_annual !== null ? `${m.sunshine_hours_annual}h` : '-'} />
          <StatCard label="年間降水量" value={m.precipitation_annual !== null ? `${m.precipitation_annual}mm` : '-'} />
        </Section>

        {/* 生活費 */}
        <Section title="💴 生活費（推計）">
          <StatCard label="単身月額生活費" value={m.total_monthly_cost_single !== null ? `${Math.round(m.total_monthly_cost_single / 10000)}万円` : '-'} sub="家賃・食費・光熱費込み" />
          <StatCard label="家族月額生活費" value={m.total_monthly_cost_family !== null ? `${Math.round(m.total_monthly_cost_family / 10000)}万円` : '-'} sub="4人家族想定" />
          <StatCard label="1LDK家賃目安" value={m.rent_1ldk_estimate !== null ? `${(Math.floor(m.rent_1ldk_estimate / 10000 * 10) / 10)}万円` : '-'} />
          <StatCard label="車の必要度" value={['', '必須', '高い', '普通', '低い', '不要'][m.car_necessity_score ?? 0] || '-'} sub={`スコア ${m.car_necessity_score ?? '-'}/5`} />
        </Section>

        {/* アクセス */}
        <Section title="🚅 アクセス">
          <StatCard label="東京まで" value={m.time_to_tokyo !== null ? `${m.time_to_tokyo}分` : '-'} />
          <StatCard label="最寄り新幹線駅" value={m.nearest_shinkansen ?? '-'} />
          <StatCard label="最寄り空港" value={m.nearest_airport ?? '-'} />
          <StatCard label="公共交通スコア" value={m.public_transport_score !== null ? `${m.public_transport_score}/5` : '-'} />
        </Section>

        {/* 安全 */}
        <Section title="🔒 安全・治安">
          <StatCard label="刑法犯認知件数" value={m.criminal_rate !== null ? `${m.criminal_rate}件` : '-'} sub="人口10万人あたり（都道府県値）" />
          <StatCard label="治安評価" value={safetyLabel(m.criminal_rate)} />
        </Section>

        {/* 注記 */}
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 16, padding: '12px 16px', background: '#f1f5f9', borderRadius: 8 }}>
          ※ 生活費は推計値です。気候データは気象庁1991-2020年平年値、犯罪データは都道府県単位の値を適用しています。
        </div>
      </div>
    </div>
  )
}
