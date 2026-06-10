import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/admin-auth'

export async function POST(request: Request) {
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
