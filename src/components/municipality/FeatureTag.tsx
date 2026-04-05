interface Municipality {
  avg_temp_annual?: number | null
  min_temp_winter?: number | null
  waiting_children?: number | null
  criminal_rate?: number | null
  time_to_tokyo?: number | null
  car_necessity_score?: number | null
  sunshine_hours_annual?: number | null
}

interface Tag {
  emoji: string
  label: string
  color: string
}

export default function FeatureTag({ m }: { m: Municipality }) {
  const tags: Tag[] = []

  if (m.avg_temp_annual != null && m.avg_temp_annual >= 17)
    tags.push({ emoji: '☀️', label: '温暖', color: '#C4922A' })
  if (m.min_temp_winter != null && m.min_temp_winter > 0)
    tags.push({ emoji: '🌸', label: '雪なし', color: '#7BA098' })
  if (m.waiting_children === 0)
    tags.push({ emoji: '👶', label: '待機児童ゼロ', color: '#4A7C59' })
  if (m.criminal_rate != null && m.criminal_rate < 150)
    tags.push({ emoji: '🔒', label: '治安良好', color: '#5B8C5A' })
  if (m.time_to_tokyo != null && m.time_to_tokyo >= 60 && m.time_to_tokyo <= 120)
    tags.push({ emoji: '🚄', label: '東京1〜2時間', color: '#3D5A80' })
  if (m.car_necessity_score != null && m.car_necessity_score <= 2)
    tags.push({ emoji: '🚶', label: '車なし可', color: '#6B4F36' })
  if (m.sunshine_hours_annual != null && m.sunshine_hours_annual >= 2000)
    tags.push({ emoji: '🌞', label: '日照充実', color: '#B8860B' })

  if (tags.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, marginTop: 8, overflow: 'hidden', height: 20 }}>
      {tags.slice(0, 3).map((tag, i) => (
        <span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: tag.color + '18', color: tag.color, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {tag.emoji} {tag.label}
        </span>
      ))}
    </div>
  )
}
