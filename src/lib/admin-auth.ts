import { timingSafeEqual, createHash } from 'crypto'

// 長さの違いで比較が早期終了しないよう、ハッシュ化してから定数時間比較する
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function isAdminAuthorized(request: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const provided = request.headers.get('x-admin-password')
  return provided !== null && safeEqual(provided, adminPassword)
}
