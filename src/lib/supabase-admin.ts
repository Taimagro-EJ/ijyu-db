import { createClient } from '@supabase/supabase-js'

// サーバー専用クライアント。クライアントバンドルへの混入を防ぐ
if (typeof window !== 'undefined') {
  throw new Error('supabase-admin はサーバーサイド専用です')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// SUPABASE_SERVICE_ROLE_KEY 未設定時は anon にフォールバック。
// blog_posts に RLS を適用する前に Vercel へ service key の設定が必須
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY 未設定: anon キーにフォールバックします(blog_posts RLS 適用前に要設定)')
}
const key = serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseAdmin = createClient(supabaseUrl, key)
