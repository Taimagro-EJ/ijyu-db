interface RelatedArticlesProps {
  currentSlug: string
  articles: { slug: string; title: string; thumbnail?: string }[]
}
export default function RelatedArticles({ currentSlug, articles }: RelatedArticlesProps) {
  const related = articles.filter(a => a.slug !== currentSlug).slice(0, 3)
  if (related.length === 0) return null
  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#454034', marginBottom: 16, letterSpacing: '0.05em' }}>関連記事</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
        {related.map(a => (
          <a key={a.slug} href={`/blog/${a.slug}`} style={{ display: 'block', padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #E8E4DF', textDecoration: 'none', color: '#454034', fontSize: 14, lineHeight: 1.6 }}>{a.title}</a>
        ))}
      </div>
    </div>
  )
}
