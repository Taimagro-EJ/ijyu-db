import { supabase, Municipality } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 60

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

function fmtTemp(v: unknown): string {
  const n = Number(v)
  if (v === null || v === undefined || isNaN(n)) return '-'
  return `${n}℃`
}

export default async function MunicipalityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = await getMunicipality(slug)
  if (!m) notFound()

  const raw = m as Record<string, unknown>
  const carLabel = (['', '必須', '高い', '普通', '低い', '不要'] as const)[m.car_necessity_score ?? 0] ?? '-'

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '20px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← 一覧に戻る</Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{m.name}</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{m.prefecture} · {m.region}</p>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        <Section title="🌤 気候">
          <StatCard label="年間平均気温" value={fmtTemp(m.avg_temp_annual)} />
          <StatCard label="冬の最低気温" value={fmtTemp(m.min_temp_winter)} />
          <StatCard label="年間日照時間" value={m.sunshine_hours_annual != null ? `${m.sunshine_hours_annual}h` : '-'} />
          <StatCard label="年間降水量" value={m.precipitation_annual != null ? `${m.precipitation_annual}mm` : '-'} />
        </Section>

        <Section title="💴 生活費（推計）">
          <StatCard label="単身月額生活費" value={fmt万(m.total_monthly_cost_single)} sub="家賃・食費・光熱費込み" />
          <StatCard label="1LDK家賃目安" value={fmt万1(m.rent_1ldk_estimate)} />
          <StatCard label="車の必要度" value={carLabel} sub={`スコア ${m.car_necessity_score ?? '-'}/5`} />
        </Section>

        <Section title="🚅 アクセス">
          <StatCard label="東京まで" value={m.time_to_tokyo != null ? `${m.time_to_tokyo}分` : '-'} />
          <StatCard label="最寄り新幹線駅" value={m.nearest_shinkansen ?? '-'} />
          <StatCard label="最寄り空港" value={m.nearest_airport ?? '-'} />
          <StatCard label="公共交通スコア" value={m.public_transport_score != null ? `${m.public_transport_score}/5` : '-'} />
        </Section>

        <Section title="🔒 安全・治安">
          <StatCard label="刑法犯認知件数" value={m.criminal_rate != null ? `${m.criminal_rate}件` : '-'} sub="人口10万人あたり（都道府県値）" />
          <StatCard label="治安評価" value={safetyLabel(m.criminal_rate)} />
        </Section>

        {raw.lifestyle_score != null && (
          <Section title="⭐ 生活リアリティ指数">
            <StatCard label="総合スコア" value={`${raw.lifestyle_score}/100`} sub="施設充実度・コスパ総合" />
            {raw.score_costperf != null && <StatCard label="コスパ" value={`${raw.score_costperf}/100`} />}
            {raw.score_shopping != null && <StatCard label="ショッピング" value={`${raw.score_shopping}/100`} />}
            {raw.score_fitness != null && <StatCard label="フィットネス" value={`${raw.score_fitness}/100`} />}
            {raw.score_entertainment != null && <StatCard label="エンタメ" value={`${raw.score_entertainment}/100`} />}
            {raw.score_childcare != null && <StatCard label="子育て" value={`${raw.score_childcare}/100`} />}
            {raw.score_medical != null && <StatCard label="医療" value={`${raw.score_medical}/100`} />}
          </Section>
        )}

        {raw.cafe_starbucks != null && (
          <Section title="🏪 施設データ">
            <StatCard label="スターバックス" value={`${raw.cafe_starbucks}軒`} />
            {raw.gym_24h_count != null && <StatCard label="24時間ジム" value={`${raw.gym_24h_count}軒`} />}
            {raw.cinema_count != null && <StatCard label="映画館" value={`${raw.cinema_count}軒${raw.cinema_has_imax ? ' (IMAX)' : ''}`} />}
            {raw.mall_count != null && <StatCard label="モール" value={`${raw.mall_count}軒`} sub={raw.mall_best_tier ? `最高Tier: ${raw.mall_best_tier}` : undefined} />}
            {raw.waiting_children != null && <StatCard label="待機児童" value={`${raw.waiting_children}人`} sub={raw.waiting_children === 0 ? '✓ ゼロ' : undefined} />}
            {raw.pediatric_clinics != null && <StatCard label="小児科" value={`${raw.pediatric_clinics}件`} />}
          </Section>
        )}

        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 16, padding: '12px 16px', background: '#f1f5f9', borderRadius: 8 }}>
          ※ 生活費は推計値です。気候データは気象庁1991-2020年平年値、犯罪データは都道府県単位の値を適用しています。
        </div>
      </div>
    </div>
  )
}
