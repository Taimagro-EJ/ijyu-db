import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminAuthorized } from '@/lib/admin-auth'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
