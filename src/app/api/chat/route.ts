import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// 527市町村のサマリーをsystem promptに含める（軽量版）
async function getMunicipalitySummary(): Promise<string> {
  const { data } = await supabase
    .from('municipality_overview')
    .select(`
      name, prefecture, region, slug,
      rent_1ldk_estimate, time_to_tokyo, avg_temp_annual,
      total_monthly_cost_single, car_necessity_score,
      lifestyle_score, score_shopping, score_cafe, score_fitness,
      score_entertainment, score_family, score_grocery,
      cafe_starbucks, gym_24h_count, cinema_count, cinema_has_imax,
      mall_count, mall_best_tier, waiting_children, criminal_rate
    `)
    .order('lifestyle_score', { ascending: false })
    .limit(527)

  if (!data) return ''

  // トークン節約のためコンパクトなJSON形式に変換
  return data.map(m => {
    const parts = [
      `${m.name}(${m.prefecture}/${m.region})`,
      `家賃${m.rent_1ldk_estimate ? Math.round(m.rent_1ldk_estimate / 10000) + '万' : '-'}`,
      `東京${m.time_to_tokyo ?? '-'}分`,
      `気温${m.avg_temp_annual ?? '-'}℃`,
      `生活費${m.total_monthly_cost_single ? Math.round(m.total_monthly_cost_single / 10000) + '万' : '-'}`,
      `リアリティ${m.lifestyle_score ?? '-'}点`,
      m.cafe_starbucks ? `スタバ${m.cafe_starbucks}` : '',
      m.gym_24h_count ? `24hジム${m.gym_24h_count}` : '',
      m.cinema_count ? `映画館${m.cinema_count}${m.cinema_has_imax ? '(IMAX)' : ''}` : '',
      m.mall_count ? `モール${m.mall_count}${m.mall_best_tier ? '(Tier' + m.mall_best_tier + ')' : ''}` : '',
      m.waiting_children === 0 ? '待機児童0' : '',
      `犯罪率${m.criminal_rate ?? '-'}`,
    ].filter(Boolean).join(',')
    return parts
  }).join('\n')
}

const SYSTEM_PROMPT_BASE = `あなたは「移住DB」のAI移住コンサルタントです。日本全国527市町村のデータを持っており、ユーザーの条件に合う移住先を提案します。

回答のルール:
- 必ず実際のデータに基づいて提案する
- 上位3〜5件を具体的な数値付きで提示する
- 各市町村へのリンクは /municipalities/{slug} の形式で示す
- 親しみやすく、でも的確なトーンで
- 回答は日本語で、400文字以内でコンパクトに
- データにない情報は「データなし」と正直に答える

以下が527市町村の最新データです（名前/家賃/東京まで/気温/生活費/生活リアリティ指数/施設データ）:
`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    // system promptにデータを含める（キャッシュのためサーバー側で取得）
    const municipalityData = await getMunicipalitySummary()
    const systemPrompt = SYSTEM_PROMPT_BASE + municipalityData

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    return NextResponse.json({ message: content.text })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: '申し訳ありません。エラーが発生しました。' }, { status: 500 })
  }
}
