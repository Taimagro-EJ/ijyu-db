import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, content, category, published, published_at, generated_by, generated_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const { id, published } = await request.json()

  const updateData: Record<string, unknown> = { published }
  if (published) {
    updateData.published_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('blog_posts')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
