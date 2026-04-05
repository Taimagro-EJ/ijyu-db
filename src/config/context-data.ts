// src/config/context-data.ts
// 数字に「語り方」を追加するコンテキストデータ

const TOKYO_RENT_AVG = 120000 // 東京1LDK平均家賃（円）

export function getAccessContext(minutes: number | null): string {
  if (!minutes) return ""
  if (minutes <= 60) return "日帰り通勤OK"
  if (minutes <= 90) return "新幹線で通勤圏"
  if (minutes <= 120) return "月数回の出社向け"
  if (minutes <= 180) return "週末帰省が楽"
  return "旅行気分で帰省"
}

export function getRentContext(rent: number | null): string {
  if (!rent) return ""
  const monthly = rent * 10000
  const ratio = monthly / TOKYO_RENT_AVG
  if (ratio <= 0.3) return `東京の約${Math.round(ratio * 10) / 10}倍`
  if (ratio <= 0.5) return "東京の半額以下"
  if (ratio <= 0.7) return "東京より3割安"
  return ""
}

export function getClimateContext(avgTemp: number | null, maxSummer: number | null): string {
  if (maxSummer !== null && maxSummer <= 30) return "猛暑日がほぼない"
  if (maxSummer !== null && maxSummer <= 33) return "東京より涼しい夏"
  if (avgTemp !== null && avgTemp >= 16) return "温暖で過ごしやすい"
  if (avgTemp !== null && avgTemp <= 10) return "寒冷地・四季がはっきり"
  return ""
}

export function getCrimeContext(rate: number | null): string {
  if (rate === null) return ""
  if (rate <= 2) return "全国トップクラスの安全性"
  if (rate <= 5) return "全国平均より安全"
  if (rate <= 10) return "標準的な安全性"
  return ""
}
