import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

export const revalidate = 60

// rechartsはSSR非対応のためdynamic importでCSRのみに
const RadarChart = dynamic(() => import('@/components/lifestyle/RadarChart'), { ssr: false })

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

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
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
  const carScore = m.car_necessity_score as number | null
  const carLabel = (['', '必須', '高い', '普通', '低い', '不要'] as const)[carScore ?? 0] ?? '-'
  const lifestyleScore = (m.lifestyle_score as number | null) ?? 0
  const scoreColor = lifestyleScore >= 70 ? '#4A7C59' : lifestyleScore >= 45 ? '#D46B3A' : '#B84C3A'

  const hasLifestyleData = m.lifestyle_score != null
  const hasFacilityData = m.cafe_starbucks != null

  // レーダーチャート用スコア
  const radarScores = {
    shopping:      m.score_shopping as number | null,
    cafe:          m.score_cafe as number | null,
    dining:        m.score_dining as number | null,
    fitness:       m.score_fitness as number | null,
    entertainment: m.score_entertainment as number | null,
    family:        m.score_family as number | null,
    grocery:       m.score_grocery as number | null,
  }

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '20px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← 一覧に戻る</Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{m.name as string}</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{m.prefecture as string} · {m.region as string}</p>
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
          <StatCard label="車の必要度" value={carLabel} sub={`スコア ${carScore ?? '-'}/5`} />
        </Section>

        <Section title="🚅 アクセス">
          <StatCard label="東京まで" value={m.time_to_tokyo != null ? `${m.time_to_tokyo}分` : '-'} />
          <StatCard label="最寄り新幹線駅" value={(m.nearest_shinkansen as string | null) ?? '-'} />
          <StatCard label="最寄り空港" value={(m.nearest_airport as string | null) ?? '-'} />
          <StatCard label="公共交通スコア" value={m.public_transport_score != null ? `${m.public_transport_score}/5` : '-'} />
        </Section>

        <Section title="🔒 安全・治安">
          <StatCard label="刑法犯認知件数" value={m.criminal_rate != null ? `${m.criminal_rate}件` : '-'} sub="人口10万人あたり（都道府県値）" />
          <StatCard label="治安評価" value={safetyLabel(m.criminal_rate as number | null)} />
        </Section>

        {/* ★ 生活リアリティセクション（レーダーチャート付き） */}
        {hasLifestyleData && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
              ⭐ 生活リアリティ指数
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>

              {/* レーダーチャート */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px' }}>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px', textAlign: 'center' }}>
                  カテゴリ別スコア（全国平均との比較）
                </p>
                <RadarChart
                  municipalityName={m.name as string}
                  scores={radarScores}
                />
              </div>

              {/* スコアサマリー */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px' }}>
                {/* 総合スコア */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>総合スコア</span>
                    <span style={{ fontSize: 36, fontWeight: 700, color: '#0f172a', fontFamily: "'DM Mono', monospace" }}>
                      {lifestyleScore}
                      <span style={{ fontSize: 16, color: '#94a3b8' }}>/100</span>
                    </span>
                  </div>
                  <ScoreBar value={lifestyleScore} color={scoreColor} />
                  {m.rank_total != null && (
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                      全国 {m.rank_total as number}位 / 527市町村
                    </p>
                  )}
                </div>

                {/* カテゴリ別スコア */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: '🛒 ショッピング', value: m.score_shopping as number | null },
                    { label: '☕ カフェ',       value: m.score_cafe as number | null },
                    { label: '🍜 グルメ',       value: m.score_dining as number | null },
                    { label: '🏋️ フィットネス', value: m.score_fitness as number | null },
                    { label: '🎬 エンタメ',     value: m.score_entertainment as number | null },
                    { label: '👶 子育て',       value: m.score_family as number | null },
                    { label: '🛍 食料品',       value: m.score_grocery as number | null },
                  ].filter(item => item.value != null).map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                        <span>{item.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#0f172a' }}>
                          {String(item.value)}
                        </span>
                      </div>
                      <ScoreBar
                        value={item.value!}
                        color={item.value! >= 70 ? '#4A7C59' : item.value! >= 45 ? '#D46B3A' : '#94a3b8'}
                      />
                    </div>
                  ))}
                </div>

                {/* ペルソナ別スコア */}
                {(m.total_score_family != null || m.total_score_remote != null || m.total_score_active != null) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>ペルソナ別</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {m.total_score_family != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>👶 子育て世帯</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{String(m.total_score_family)}点</span>
                        </div>
                      )}
                      {m.total_score_remote != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>💻 リモートワーカー</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{String(m.total_score_remote)}点</span>
                        </div>
                      )}
                      {m.total_score_active != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>🏃 アクティブ</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{String(m.total_score_active)}点</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 施設データ */}
        {hasFacilityData && (
          <Section title="🏪 施設データ">
            <StatCard label="スターバックス" value={`${m.cafe_starbucks}軒`} />
            {m.gym_24h_count != null && <StatCard label="24時間ジム" value={`${m.gym_24h_count}軒`} />}
            {m.cinema_count != null && <StatCard label="映画館" value={`${m.cinema_count}軒${m.cinema_has_imax ? ' (IMAX)' : ''}`} />}
            {m.mall_count != null && <StatCard label="モール" value={`${m.mall_count}軒`} sub={(m.mall_best_tier as string | null) ? `最高Tier: ${m.mall_best_tier}` : undefined} />}
            {m.waiting_children != null && <StatCard label="待機児童" value={`${m.waiting_children}人`} sub={(m.waiting_children as number | null) === 0 ? '✓ ゼロ' : undefined} />}
            {m.pediatric_clinics != null && <StatCard label="小児科" value={`${m.pediatric_clinics}件`} />}
          </Section>
        )}

        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 16, padding: '12px 16px', background: '#f1f5f9', borderRadius: 8 }}>
          ※ 生活費は推計値です。気候データは気象庁1991-2020年平年値、犯罪データは都道府県単位の値を適用しています。
        </div>
      </div>
    </div>
  )
}
