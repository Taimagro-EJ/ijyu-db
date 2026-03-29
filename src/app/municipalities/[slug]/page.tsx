import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import RadarChart from '@/components/lifestyle/RadarChartWrapper'

export const revalidate = 60

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: '#9E9488', marginBottom: 6, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1814', fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B6457', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 15, fontWeight: 700, color: '#454034', margin: '0 0 16px',
        paddingBottom: 8,
        background: 'linear-gradient(90deg, transparent 0%, #E8E4DF 10%, #D4CCC2 30%, #E8E4DF 60%, transparent 100%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 1px',
        backgroundPosition: 'bottom',
      }}>{title}</h2>
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
  const carScore = m.car_necessity_score as number | null
  const carLabel = (['', '必須', '高い', '普通', '低い', '不要'] as const)[carScore ?? 0] ?? '-'
  const lifestyleScore = (m.lifestyle_score as number | null) ?? 0
  const scoreColor = lifestyleScore >= 70 ? '#4A7C59' : lifestyleScore >= 45 ? '#D46B3A' : '#B84C3A'

  const hasLifestyleData = m.lifestyle_score != null
  const hasFacilityData = m.cafe_starbucks != null

  const radarScores = {
    shopping:      m.score_shopping as number | null,
    cafe:          m.score_cafe as number | null,
    dining:        m.score_dining as number | null,
    fitness:       m.score_fitness as number | null,
    entertainment: m.score_entertainment as number | null,
    family:        m.score_family as number | null,
    grocery:       m.score_grocery as number | null,
  }

  const imageUrl = m.image_url as string | null

  return (
    <div style={{ fontFamily: "'BIZ UDPGothic', 'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>

      {/* ヒーロー写真セクション */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden', background: '#454034' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${m.name as string}の風景`}
            fill
            style={{
              objectFit: 'cover',
              filter: 'brightness(1.03) saturate(0.88) contrast(1.05)',
            }}
            priority
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #454034 0%, #6B6457 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64, opacity: 0.3,
          }}>🏘</div>
        )}

        {/* グラデーションオーバーレイ */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)',
        }} />

        {/* 戻るリンク */}
        <div style={{ position: 'absolute', top: 20, left: 24 }}>
          <Link href="/" style={{
            color: 'rgba(255,255,255,0.85)', fontSize: 13, textDecoration: 'none',
            background: 'rgba(0,0,0,0.25)', padding: '6px 14px', borderRadius: 999,
            backdropFilter: 'blur(4px)',
          }}>← 一覧に戻る</Link>
        </div>

        {/* 市名・スコアオーバーレイ */}
        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '0 0 4px' }}>
            {m.prefecture as string} · {m.region as string}
          </p>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px',
            fontFamily: "'Shippori Mincho', serif",
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>{m.name as string}</h1>

          {/* サマリーバッジ */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {m.rent_1ldk_estimate != null && (
              <span style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.25)',
              }}>🏠 家賃 {fmt万1(m.rent_1ldk_estimate)}</span>
            )}
            {m.time_to_tokyo != null && (
              <span style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.25)',
              }}>🚄 東京 {m.time_to_tokyo as number}分</span>
            )}
            {m.avg_temp_annual != null && (
              <span style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.25)',
              }}>🌡 {m.avg_temp_annual as number}℃</span>
            )}
            {lifestyleScore > 0 && (
              <span style={{
                background: scoreColor, color: '#fff',
                fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 999,
                fontFamily: "'DM Mono', monospace",
              }}>⭐ {lifestyleScore}点</span>
            )}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
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

        {/* 生活リアリティセクション */}
        {hasLifestyleData && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 15, fontWeight: 700, color: '#454034', margin: '0 0 16px',
              paddingBottom: 8,
              background: 'linear-gradient(90deg, transparent 0%, #E8E4DF 10%, #D4CCC2 30%, #E8E4DF 60%, transparent 100%)',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 1px',
              backgroundPosition: 'bottom',
            }}>
              ⭐ 生活リアリティ指数
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
              <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '20px' }}>
                <p style={{ fontSize: 12, color: '#9E9488', margin: '0 0 12px', textAlign: 'center' }}>
                  カテゴリ別スコア（全国平均との比較）
                </p>
                <RadarChart municipalityName={m.name as string} scores={radarScores} />
              </div>

              <div style={{ background: '#F2F0EC', borderRadius: 12, padding: '20px' }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#6B6457' }}>総合スコア</span>
                    <span style={{ fontSize: 36, fontWeight: 700, color: '#1A1814', fontFamily: "'DM Mono', monospace" }}>
                      {lifestyleScore}
                      <span style={{ fontSize: 16, color: '#9E9488' }}>/100</span>
                    </span>
                  </div>
                  <ScoreBar value={lifestyleScore} color={scoreColor} />
                  {m.rank_total != null && (
                    <p style={{ fontSize: 11, color: '#9E9488', marginTop: 6 }}>
                      全国 {m.rank_total as number}位 / 527市町村
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: '🛒 ショッピング', value: m.score_shopping as number | null, color: '#A07855' },
                    { label: '☕ カフェ',       value: m.score_cafe as number | null,     color: '#6B4F36' },
                    { label: '🍜 グルメ',       value: m.score_dining as number | null,   color: '#A07855' },
                    { label: '🏋️ フィットネス', value: m.score_fitness as number | null,  color: '#4A7C59' },
                    { label: '🎬 エンタメ',     value: m.score_entertainment as number | null, color: '#3D5A80' },
                    { label: '👶 子育て',       value: m.score_family as number | null,   color: '#C4922A' },
                    { label: '🛍 食料品',       value: m.score_grocery as number | null,  color: '#8B7D6B' },
                  ].filter(item => item.value != null).map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6457', marginBottom: 3 }}>
                        <span>{item.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#1A1814' }}>
                          {String(item.value)}
                        </span>
                      </div>
                      <ScoreBar value={item.value!} color={item.value! >= 70 ? item.color : item.value! >= 45 ? '#D46B3A' : '#9E9488'} />
                    </div>
                  ))}
                </div>

                {(m.total_score_family != null || m.total_score_remote != null || m.total_score_active != null) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E8E4DF' }}>
                    <p style={{ fontSize: 11, color: '#9E9488', marginBottom: 8 }}>ペルソナ別</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {m.total_score_family != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#6B6457' }}>👶 子育て世帯</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{String(m.total_score_family)}点</span>
                        </div>
                      )}
                      {m.total_score_remote != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#6B6457' }}>💻 リモートワーカー</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{String(m.total_score_remote)}点</span>
                        </div>
                      )}
                      {m.total_score_active != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#6B6457' }}>🏃 アクティブ</span>
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

        {/* AIに相談するCTA */}
        <div style={{
          margin: '32px 0',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #F2F0EC 0%, #F0DBC8 100%)',
          borderRadius: 16,
          border: '1px solid #E8E4DF',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>🤖</span>
            <div>
              <p style={{
                fontWeight: 700, color: '#454034', fontSize: 16, margin: '0 0 6px',
                fontFamily: "'Shippori Mincho', serif",
              }}>
                {m.name as string}への移住、あなたの条件で試算してみませんか？
              </p>
              <p style={{ fontSize: 13, color: '#6B6457', margin: '0 0 14px' }}>
                527市町村のデータから、年収・家族構成・希望条件に合う移住先をAIが提案します。
              </p>
              <Link href="/chat" style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#D46B3A', color: '#fff',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
              }}>
                AIに無料相談する
              </Link>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#9E9488', marginTop: 8, padding: '12px 16px', background: '#F2F0EC', borderRadius: 8 }}>
          ※ 生活費は推計値です。気候データは気象庁1991-2020年平年値、犯罪データは都道府県単位の値を適用しています。
        </div>
      </div>
    </div>
  )
}
