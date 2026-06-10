import { describe, it, expect } from 'vitest'
import { safeEqual, isAdminAuthorized } from './admin-auth'

describe('safeEqual', () => {
  it('一致する文字列で true', () => {
    expect(safeEqual('secret-pass', 'secret-pass')).toBe(true)
  })

  it('不一致で false', () => {
    expect(safeEqual('secret-pass', 'wrong-pass')).toBe(false)
  })

  it('長さ違いでも例外なく false', () => {
    expect(safeEqual('a', 'aaaaaaaaaaaaaaaa')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })

  it('Unicode(日本語)でも正しく比較する', () => {
    expect(safeEqual('ぱすわーど🔐', 'ぱすわーど🔐')).toBe(true)
    expect(safeEqual('ぱすわーど🔐', 'ぱすわーど')).toBe(false)
  })
})

describe('isAdminAuthorized', () => {
  const url = 'http://localhost/api/admin/posts'

  it('ADMIN_PASSWORD 未設定なら常に false', () => {
    const prev = process.env.ADMIN_PASSWORD
    delete process.env.ADMIN_PASSWORD
    try {
      const req = new Request(url, { headers: { 'x-admin-password': 'anything' } })
      expect(isAdminAuthorized(req)).toBe(false)
    } finally {
      if (prev !== undefined) process.env.ADMIN_PASSWORD = prev
    }
  })

  it('ヘッダなし→false / 誤パスワード→false / 正パスワード→true', () => {
    const prev = process.env.ADMIN_PASSWORD
    process.env.ADMIN_PASSWORD = 'test-admin-pass'
    try {
      expect(isAdminAuthorized(new Request(url))).toBe(false)
      expect(
        isAdminAuthorized(new Request(url, { headers: { 'x-admin-password': 'wrong' } }))
      ).toBe(false)
      expect(
        isAdminAuthorized(new Request(url, { headers: { 'x-admin-password': 'test-admin-pass' } }))
      ).toBe(true)
    } finally {
      if (prev !== undefined) process.env.ADMIN_PASSWORD = prev
      else delete process.env.ADMIN_PASSWORD
    }
  })
})
