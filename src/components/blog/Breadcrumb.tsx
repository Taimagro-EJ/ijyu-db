export default function Breadcrumb({ title }: { title: string }) {
  return (
    <nav style={{ fontSize: 12, color: '#9E9488', marginBottom: 16 }}>
      <a href="/" style={{ color: '#9E9488', textDecoration: 'none' }}>ホーム</a>
      <span style={{ margin: '0 6px' }}>›</span>
      <a href="/blog" style={{ color: '#9E9488', textDecoration: 'none' }}>ブログ</a>
      <span style={{ margin: '0 6px' }}>›</span>
      <span style={{ color: '#454034' }}>{title}</span>
    </nav>
  )
}
export function ShareButtons({ url, title }: { url: string; title: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
      <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#1DA1F2', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Xでシェア</a>
      <a href={`https://b.hatena.ne.jp/entry/${url}`} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#00A4DE', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>はてブ</a>
    </div>
  )
}
