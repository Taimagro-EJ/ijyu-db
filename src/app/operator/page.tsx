import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '運営者情報｜移住DB',
  description: '移住DBの運営者情報です。',
}

export default function AboutSitePage() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>
      <header style={{ background: '#454034', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <a href="/" style={{ color: '#A19679', fontSize: 13, textDecoration: 'none' }}>← 移住DB</a>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1814', marginBottom: 8, fontFamily: "'Shippori Mincho', serif" }}>
          運営者情報
        </h1>
        <p style={{ fontSize: 13, color: '#9E9488', marginBottom: 40 }}>最終更新日：2026年3月15日</p>

        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E8E4DF',
          padding: '32px', marginBottom: 32,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'サイト名', value: '移住DB' },
                { label: 'URL', value: 'https://www.ijyu-data.com' },
                { label: '運営者', value: 'えいじ' },
                { label: '設立', value: '2026年2月' },
                { label: 'サイトの目的', value: '全国527市町村の移住情報をデータで比較できるプラットフォームの提供' },
              ].map(({ label, value }) => (
                <tr key={label} style={{ borderBottom: '1px solid #E8E4DF' }}>
                  <td style={{
                    padding: '14px 16px 14px 0',
                    fontSize: 13, fontWeight: 600,
                    color: '#6B6457', width: 140,
                    verticalAlign: 'top',
                  }}>{label}</td>
                  <td style={{ padding: '14px 0', fontSize: 14, color: '#1A1814', lineHeight: 1.7 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E8E4DF',
          padding: '32px', marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1A1814', marginBottom: 16 }}>サイトについて</h2>
          <p style={{ fontSize: 14, color: '#6B6457', lineHeight: 1.9, marginBottom: 16 }}>
            移住DBは、長野県松本市への移住経験をきっかけに開発した、地方移住を検討する方向けのデータプラットフォームです。
          </p>
          <p style={{ fontSize: 14, color: '#6B6457', lineHeight: 1.9, marginBottom: 16 }}>
            「どの街に移住すればいいかわからない」「生活費や気候のデータを比較したい」という声に応えるため、全国527市町村の気候・生活費・治安・交通アクセスなどのデータを一画面で比較できるサービスを提供しています。
          </p>
          <p style={{ fontSize: 14, color: '#6B6457', lineHeight: 1.9 }}>
            掲載データはe-Stat（政府統計の総合窓口）・気象庁・総務省などの公的統計を基に集計・推計しています。データの詳細については<a href="/about" style={{ color: '#D46B3A' }}>データについて</a>をご参照ください。
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E8E4DF',
          padding: '32px',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1A1814', marginBottom: 16 }}>お問い合わせ</h2>
          <p style={{ fontSize: 14, color: '#6B6457', lineHeight: 1.9 }}>
            サイトに関するご意見・ご要望・データの誤りのご指摘などは、以下のリンクよりお問い合わせください。
          </p>
          <a
            href="mailto:contact@ijyu-data.com"
            style={{
              display: 'inline-block', marginTop: 16,
              padding: '10px 24px', background: '#D46B3A', color: '#fff',
              borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}
          >メールでお問い合わせ</a>
        </div>
      </main>
    </div>
  )
}
