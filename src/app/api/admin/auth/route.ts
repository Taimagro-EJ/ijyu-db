import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/admin-auth'
import { getClientIp, hitRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  // ログイン試行をブルートフォースから保護（ログインは低頻度のため全試行を計数）
  if (!(await hitRateLimit('admin_auth', ip, 10, 600))) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく待って再試行してください' }, { status: 429 })
  }

  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not set' }, { status: 500 })
  }

  if (typeof body.password === 'string' && safeEqual(body.password, adminPassword)) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
