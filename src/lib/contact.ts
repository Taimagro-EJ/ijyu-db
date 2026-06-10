export type ContactInput = {
  name: string
  email: string
  category: string | null
  message: string
}

const CATEGORIES = new Set(['data_error', 'feature_request', 'media', 'municipality', 'other'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Bot対策ハニーポット: 人間には見えない website 欄に値が入っていたらスパム
export function isSpamHoneypot(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false
  const { website } = body as Record<string, unknown>
  return typeof website === 'string' && website.trim().length > 0
}

export function validateContactInput(
  body: unknown
): { ok: true; data: ContactInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'リクエスト形式が不正です' }
  }
  const { name, email, category, message } = body as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return { ok: false, error: 'お名前を入力してください（100文字以内）' }
  }
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return { ok: false, error: 'メールアドレスの形式が正しくありません' }
  }
  if (typeof message !== 'string' || !message.trim() || message.trim().length > 5000) {
    return { ok: false, error: 'お問い合わせ内容を入力してください（5000文字以内）' }
  }

  const cat = typeof category === 'string' && CATEGORIES.has(category) ? category : null

  return {
    ok: true,
    data: {
      name: name.trim(),
      email: email.trim(),
      category: cat,
      message: message.trim(),
    },
  }
}
