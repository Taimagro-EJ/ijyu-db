import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateContactInput, isSpamHoneypot } from '@/lib/contact'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 })
  }

  // Bot はサイレントに成功扱い(挙動から対策を学習させない)
  if (isSpamHoneypot(body)) {
    return NextResponse.json({ ok: true })
  }

  const result = validateContactInput(body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // contact_messages は RLS で anon INSERT のみ許可（SELECT 不可）
  const { error } = await supabase.from('contact_messages').insert(result.data)
  if (error) {
    console.error('contact insert failed:', error.message)
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
