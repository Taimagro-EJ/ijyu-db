export default function AuthorProfile() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '20px', background: '#FAFAF8', borderRadius: 10, border: '1px solid #E8E4DF', marginTop: 32 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E8E4DF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📊</div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#454034', margin: '0 0 4px' }}>移住DB 編集部</p>
        <p style={{ fontSize: 12, color: '#9E9488', margin: 0, lineHeight: 1.6 }}>全国527市町村の生活データを収集・分析し、移住検討者のためのデータジャーナリズムを実践しています。</p>
      </div>
    </div>
  )
}
