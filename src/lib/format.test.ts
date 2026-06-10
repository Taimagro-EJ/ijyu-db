import { describe, it, expect } from 'vitest'
import { formatYen, formatYenShort, formatFacilityCount } from './format'

describe('formatYen', () => {
  it('null/undefined は — を返す', () => {
    expect(formatYen(null)).toBe('—')
    expect(formatYen(undefined)).toBe('—')
  })
  it('1万円未満は円（カンマ区切り）', () => {
    expect(formatYen(0)).toBe('0円')
    expect(formatYen(8000)).toBe('8,000円')
    expect(formatYen(9999)).toBe('9,999円')
  })
  it('1万円以上は万円（0.1万円単位で切り捨て）', () => {
    expect(formatYen(10000)).toBe('1万円')
    expect(formatYen(12345)).toBe('1.2万円')
  })
})

describe('formatYenShort', () => {
  it('1万円以上は「万」表記', () => {
    expect(formatYenShort(12345)).toBe('1.2万')
  })
  it('null は —', () => {
    expect(formatYenShort(null)).toBe('—')
  })
})

describe('formatFacilityCount（cafe_total 回帰ガード）', () => {
  it('未取得（null/undefined）は - を返す', () => {
    expect(formatFacilityCount(null)).toBe('-')
    expect(formatFacilityCount(undefined)).toBe('-')
  })
  it('実数0は 0軒（未取得と区別）', () => {
    expect(formatFacilityCount(0)).toBe('0軒')
  })
  it('正数は N軒', () => {
    expect(formatFacilityCount(38)).toBe('38軒')
  })
})
