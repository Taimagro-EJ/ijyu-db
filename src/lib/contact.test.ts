import { describe, it, expect } from 'vitest'
import { validateContactInput, isSpamHoneypot } from './contact'

const valid = {
  name: 'えいじ',
  email: 'test@example.com',
  category: 'data_error',
  message: 'データの誤りを見つけました',
}

describe('validateContactInput', () => {
  it('正常な入力を受理しトリムして返す', () => {
    const r = validateContactInput({ ...valid, name: ' えいじ ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.name).toBe('えいじ')
      expect(r.data.category).toBe('data_error')
    }
  })

  it('category 未選択(空文字)は null として受理する', () => {
    const r = validateContactInput({ ...valid, category: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.category).toBeNull()
  })

  it('不明な category は null に落とす', () => {
    const r = validateContactInput({ ...valid, category: 'spam_category' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.category).toBeNull()
  })

  it('body が object でなければ拒否する', () => {
    expect(validateContactInput(null).ok).toBe(false)
    expect(validateContactInput('text').ok).toBe(false)
    expect(validateContactInput(undefined).ok).toBe(false)
  })

  it('name の欠落・空白のみ・101文字超を拒否する', () => {
    expect(validateContactInput({ ...valid, name: undefined }).ok).toBe(false)
    expect(validateContactInput({ ...valid, name: '   ' }).ok).toBe(false)
    expect(validateContactInput({ ...valid, name: 'あ'.repeat(101) }).ok).toBe(false)
    expect(validateContactInput({ ...valid, name: 'あ'.repeat(100) }).ok).toBe(true)
  })

  it('不正なメール形式を拒否する', () => {
    expect(validateContactInput({ ...valid, email: 'not-an-email' }).ok).toBe(false)
    expect(validateContactInput({ ...valid, email: 'a@b' }).ok).toBe(false)
    expect(validateContactInput({ ...valid, email: 'a b@example.com' }).ok).toBe(false)
    expect(validateContactInput({ ...valid, email: 'a@example.com' }).ok).toBe(true)
  })

  it('message の欠落・空白のみ・5001文字超を拒否する', () => {
    expect(validateContactInput({ ...valid, message: '' }).ok).toBe(false)
    expect(validateContactInput({ ...valid, message: '   ' }).ok).toBe(false)
    expect(validateContactInput({ ...valid, message: 'あ'.repeat(5001) }).ok).toBe(false)
    expect(validateContactInput({ ...valid, message: 'あ'.repeat(5000) }).ok).toBe(true)
  })
})

describe('isSpamHoneypot', () => {
  it('website 欄に値があればスパム判定', () => {
    expect(isSpamHoneypot({ ...valid, website: 'https://spam.example' })).toBe(true)
  })

  it('website が空・未定義・非文字列ならスパムではない', () => {
    expect(isSpamHoneypot({ ...valid, website: '' })).toBe(false)
    expect(isSpamHoneypot({ ...valid, website: '   ' })).toBe(false)
    expect(isSpamHoneypot(valid)).toBe(false)
    expect(isSpamHoneypot(null)).toBe(false)
  })
})
