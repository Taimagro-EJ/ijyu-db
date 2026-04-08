'use client'

const AFFILIATE_LINK_HIKARI = 'https://px.a8.net/svt/ejp?a8mat=4B1G9O+6PQ0DU+50+54MIOY'
const AFFILIATE_LINK_HIKKOSHI = 'https://px.a8.net/svt/ejp?a8mat=XXXXX'

export function InternetCTA() {
  return (
    <div style={{ margin: '16px 0', padding: '16px 20px', background: '#F0F4F8', borderRadius: 12, border: '1px solid #D0DDE8' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', margin: '0 0 4px' }}>移住先のインターネット環境を確認</p>
      <p style={{ fontSize: 11, color: '#6B7F94', margin: '0 0 12px' }}>IPv6対応・最大1Gbps。ドコモユーザーはスマホ代も割引</p>
      <a href={AFFILIATE_LINK_HIKARI} rel="nofollow sponsored" target="_blank" style={{ display: 'inline-block', padding: '8px 20px', background: '#E63A1E', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>ドコモ光の詳細を見る →</a>
      <img width={1} height={1} src="https://www17.a8.net/0.gif?a8mat=4B1G9O+6PQ0DU+50+54MIOY" alt="" />
      <p style={{ fontSize: 10, color: '#C8C0B4', margin: '8px 0 0' }}>※広告</p>
    </div>
  )
}

export function MovingCTA({ municipalityName }: { municipalityName: string }) {
  return (
    <div style={{ margin: '16px 0', padding: '16px 20px', background: '#F7F5F2', borderRadius: 12, border: '1px solid #E8E4DF' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#454034', margin: '0 0 4px' }}>{municipalityName}への引越しを検討中ですか？</p>
      <p style={{ fontSize: 11, color: '#9E9488', margin: '0 0 12px' }}>複数社の見積もりを無料で比較できます</p>
      <a href={AFFILIATE_LINK_HIKKOSHI} rel="nofollow sponsored" target="_blank" style={{ display: 'inline-block', padding: '8px 20px', background: '#C4922A', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>無料で見積もりを比較する →</a>
      <p style={{ fontSize: 10, color: '#C8C0B4', margin: '8px 0 0' }}>※広告</p>
    </div>
  )
}
