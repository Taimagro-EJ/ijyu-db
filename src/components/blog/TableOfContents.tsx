'use client'
import { useEffect, useState } from 'react'
interface TocItem { id: string; text: string; level: number }
export default function TableOfContents() {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState('')
  useEffect(() => {
    const elements = document.querySelectorAll('h2, h3')
    const items: TocItem[] = Array.from(elements).map(el => ({ id: el.id || (el.textContent || '').replace(/\s/g, '-'), text: el.textContent || '', level: parseInt(el.tagName[1]) }))
    elements.forEach((el, i) => { if (!el.id) el.id = items[i].id })
    setHeadings(items)
  }, [])
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id) }) }, { rootMargin: '-80px 0px -80% 0px' })
    headings.forEach(h => { const el = document.getElementById(h.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [headings])
  if (headings.length < 3) return null
  return (
    <nav style={{ padding: '16px 20px', background: '#FAFAF8', borderRadius: 10, border: '1px solid #E8E4DF', marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#9E9488', margin: '0 0 10px', letterSpacing: '0.08em' }}>目次</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? 16 : 0, marginBottom: 6 }}>
            <a href={`#${h.id}`} style={{ fontSize: 13, color: activeId === h.id ? '#C4922A' : '#454034', textDecoration: 'none', lineHeight: 1.6 }}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
