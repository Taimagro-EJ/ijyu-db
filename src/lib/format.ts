// src/lib/format.ts

export function formatYen(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 10000) {
    const man = value / 10000;
    // 0.1万円単位で切り捨て
    return `${Math.floor(man * 10) / 10}万円`;
  }
  return `${value.toLocaleString()}円`;
}

export function formatYenShort(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 10000) {
    const man = value / 10000;
    return `${Math.floor(man * 10) / 10}万`;
  }
  return `${value.toLocaleString()}円`;
}
