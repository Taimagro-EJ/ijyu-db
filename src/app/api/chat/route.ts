import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

async function getMunicipalitySummary(): Promise<string> {
  const { data, error } = await supabase
    .from('municipality_overview')
    .select(`
      name, prefecture, slug,
      rent_1ldk_estimate, time_to_tokyo, avg_temp_annual,
      lifestyle_score,
      cafe_starbucks, gym_24h_count, cinema_count,
      mall_count, waiting_children, criminal_rate
    `)
    .order('lifestyle_score', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) {
    console.error('Supabase error:', JSON.stringify(error))
    return ''
  }
  if (!data) return ''

  return data.map(m =>
    [
      `${m.name}(${m.prefecture})`,
      `家賃${m.rent_1ldk_estimate ? Math.round(m.rent_1ldk_estimate / 10000) + '万' : '?'}`,
      `東京${m.time_to_tokyo ?? '?'}分`,
      `気温${m.avg_temp_annual ?? '?'}℃`,
      `リアリティ${m.lifestyle_score ?? '?'}`,
      m.cafe_starbucks ? `スタバ${m.cafe_starbucks}` : '',
      m.gym_24h_count ? `ジム${m.gym_24h_count}` : '',
      m.cinema_count ? `映画館${m.cinema_count}` : '',
      m.mall_count ? `モール${m.mall_count}` : '',
      m.waiting_children === 0 ? '待機児童0' : '',
      m.criminal_rate ? `犯罪率${m.criminal_rate}` : '',
    ].filter(Boolean).join(',')
  ).join('\n')
}

const SYSTEM_PROMPT_BASE = `あなたは「移住DB」のAI移住コンサルタントです。日本全国の市町村データを持っており、ユーザーの条件に合う移住先を提案します。

回答ルール:
- 必ず実際のデータに基づいて提案する
- 上位3〜5件を具体的な数値付きで提示する
- 各市町村へのリンクは /municipalities/{slug} の形式で示す
- 親しみやすく的確なトーンで
- 回答は日本語で400文字以内
- データにない情報は「データなし」と正直に答える

以下が市町村データです（名前/都道府県/家賃/東京まで/気温/生活リアリティ指数/施設）:
`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    let municipalityData = ''
    try {
      municipalityData = await getMunicipalitySummary()
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError)
      console.error('DB error:', msg)
    }

    const systemPrompt = SYSTEM_PROMPT_BASE + municipalityData

    const anthropicClient = getAnthropicClient()
    const response = await anthropicClient.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    return NextResponse.json({ message: content.text })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Chat API error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
