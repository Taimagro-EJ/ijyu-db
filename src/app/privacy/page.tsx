import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プライバシーポリシー｜移住DB',
  description: '移住DBのプライバシーポリシーです。個人情報の取り扱いについて説明します。',
}

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>
      <header style={{ background: '#454034', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <a href="/" style={{ color: '#A19679', fontSize: 13, textDecoration: 'none' }}>← 移住DB</a>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1814', marginBottom: 8, fontFamily: "'Shippori Mincho', serif" }}>
          プライバシーポリシー
        </h1>
        <p style={{ fontSize: 13, color: '#9E9488', marginBottom: 40 }}>最終更新日：2026年3月15日</p>

        <Section title="1. 基本方針">
          <p>移住DB（以下「当サイト」）は、ユーザーの個人情報の保護を重要と考え、個人情報保護法その他の関連法令を遵守します。</p>
        </Section>

        <Section title="2. 収集する情報">
          <p>当サイトでは、以下の情報を収集することがあります。</p>
          <ul>
            <li>アクセスログ（IPアドレス、ブラウザ種別、参照元URL、アクセス日時など）</li>
            <li>Cookieによる利用状況の情報</li>
            <li>Google Analyticsによるアクセス解析情報</li>
          </ul>
        </Section>

        <Section title="3. 情報の利用目的">
          <p>収集した情報は以下の目的で利用します。</p>
          <ul>
            <li>サイトのコンテンツ改善およびサービス向上</li>
            <li>アクセス解析によるサイト運営の最適化</li>
            <li>不正アクセスの検知および防止</li>
          </ul>
        </Section>

        <Section title="4. Cookieについて">
          <p>当サイトでは、利便性の向上およびアクセス解析のためにCookieを使用しています。Cookieはブラウザの設定から無効にすることができますが、一部の機能が利用できなくなる場合があります。</p>
        </Section>

        <Section title="5. Google Analyticsについて">
          <p>当サイトでは、Googleが提供するアクセス解析ツール「Google Analytics」を使用しています。Google AnalyticsはCookieを使用してデータを収集しますが、個人を特定する情報は含まれません。Google Analyticsのデータ収集を無効にする場合は、<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: '#D46B3A' }}>Google Analytics オプトアウトアドオン</a>をご利用ください。</p>
        </Section>

        <Section title="6. Google AdSenseについて">
          <p>当サイトでは、Googleが提供する広告配信サービス「Google AdSense」を使用しています。Google AdSenseは、ユーザーの興味に基づいた広告を表示するためにCookieを使用することがあります。Googleによる広告のカスタマイズを無効にする場合は、<a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#D46B3A' }}>広告設定</a>をご利用ください。</p>
        </Section>

        <Section title="7. 第三者への提供">
          <p>当サイトは、以下の場合を除き、収集した情報を第三者に提供することはありません。</p>
          <ul>
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合</li>
          </ul>
        </Section>

        <Section title="8. データの安全管理">
          <p>当サイトは、収集した情報の漏洩、滅失、毀損を防止するために適切なセキュリティ対策を講じます。</p>
        </Section>

        <Section title="9. 免責事項">
          <p>当サイトに掲載されているデータは、e-Stat（政府統計の総合窓口）、気象庁、その他公的機関のデータをもとに作成した推計値を含みます。データの正確性には最善を尽くしていますが、その完全性・正確性を保証するものではありません。当サイトのデータを利用した結果生じた損害について、当サイトは責任を負いません。</p>
        </Section>

        <Section title="10. プライバシーポリシーの変更">
          <p>当サイトは、必要に応じてプライバシーポリシーを変更することがあります。変更後のポリシーは当ページに掲載した時点で効力を生じます。</p>
        </Section>

        <Section title="11. お問い合わせ">
          <p>プライバシーポリシーに関するお問い合わせは、サイト内のお問い合わせフォームよりご連絡ください。</p>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 17, fontWeight: 700, color: '#1A1814',
        borderLeft: '3px solid #D46B3A', paddingLeft: 12,
        marginBottom: 12,
      }}>{title}</h2>
      <div style={{ fontSize: 14, color: '#6B6457', lineHeight: 1.8, paddingLeft: 16 }}>
        {children}
      </div>
    </section>
  )
}
