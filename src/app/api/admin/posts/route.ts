import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { getClientIp, hitRateLimit } from '@/lib/rate-limit'

// レート制限 + 認証の共通ガード。失敗試行のみを原子的に計数（正規 admin は無制限）。
// 認可済みなら null、未認可なら 401、失敗が窓内上限を超えたら 429 を返す。
async function guard(request: Request): Promise<NextResponse | null> {
  if (isAdminAuthorized(request)) {
    return null
  }
  const ip = getClientIp(request)
  // 認証失敗のみ計数・記録（hit_rate_limit は記録と判定を原子的に行う）
  const allowed = await hitRateLimit('admin_posts', ip, 20, 600)
  if (!allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(request: Request) {
  const blocked = await guard(request)
  if (blocked) return blocked

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, description, content, category, published, published_at, generated_by, generated_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('blog_posts select failed:', error.message)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const blocked = await guard(request)
  if (blocked) return blocked

  let body: { id?: unknown; published?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const { id, published } = body
  if (typeof id !== 'number' || typeof published !== 'boolean') {
    return NextResponse.json({ error: 'id(number) と published(boolean) が必要です' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    published,
    published_at: published ? new Date().toISOString() : null,
  }

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .update(updateData)
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('blog_posts update failed:', error.message)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: '対象の記事が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
