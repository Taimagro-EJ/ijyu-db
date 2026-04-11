'use client'

interface ChapterSummaryProps {
  summary: string | null
}

export default function ChapterSummary({ summary }: ChapterSummaryProps) {
  if (!summary) return null
  return (
    <div style={{ margin: '16px 0', padding: '14px 18px', background: '#FAFAF8', borderRadius: 10, borderLeft: '3px solid #C4922A' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9E9488', margin: '0 0 6px', letterSpacing: '0.05em' }}>💡 データから見ると</p>
      <p style={{ fontSize: 13, color: '#454034', margin: 0, lineHeight: 1.7 }}>{summary}</p>
    </div>
  )
}
