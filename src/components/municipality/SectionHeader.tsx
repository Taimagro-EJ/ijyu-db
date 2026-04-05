import React from 'react'

interface SectionHeaderProps {
  chapter: string  // 'CHAPTER 01'
  title: string    // 'この街の数字'
  subtitle?: string
}

export default function SectionHeader({ chapter, title, subtitle }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #E8E4DF' }}>
      <p style={{ fontSize: 9, letterSpacing: '0.15em', color: '#B0A99D', fontFamily: "'DM Mono', monospace", margin: '0 0 4px', textTransform: 'uppercase' }}>{chapter}</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#454034', margin: '0 0 4px', fontFamily: "'Shippori Mincho', serif", letterSpacing: '0.05em' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: '#9E9488', margin: 0 }}>{subtitle}</p>}
    </div>
  )
}
