import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * クライアント IP を抽出する。
 * Vercel 配下では `x-real-ip` / `x-forwarded-for` はプラットフォームが実クライアント IP で
 * 設定する（クライアント送信値は上書きされる）ため、これを信頼境界とする。
 * 取得できない場合は 'unknown'（共有バケットになるが、無いよりは制限が効く）。
 * ※ Vercel 以外にデプロイする場合は、この信頼前提を見直すこと。
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return 'unknown'
}

/**
 * 窓内のヒット数が上限未満なら記録して true（許可）、上限到達なら false（ブロック）を返す。
 * 判定と記録は単一の SECURITY DEFINER 関数内で原子的に行われる（並行バースト超過を防止）。
 * RPC は service_role 限定のため、サーバ専用クライアント（supabaseAdmin）から呼ぶ。
 *
 * DB 障害時は fail-open（true）で可用性を優先し、警告ログを残す
 *（レート制限の不調で正規 admin のログインや問い合わせを止めない。
 *  なお contact/admin の本処理自体も同じ Supabase に依存するため、DB 障害時の実害は限定的）。
 */
export async function hitRateLimit(
  bucket: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('hit_rate_limit', {
    p_bucket: bucket,
    p_identifier: identifier,
    p_max: max,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.warn('hitRateLimit failed (fail-open):', error.message)
    return true
  }
  return data === true
}
