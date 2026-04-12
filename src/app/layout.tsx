import type { Metadata } from "next";
import { Noto_Sans_JP, DM_Mono, Shippori_Mincho, BIZ_UDPGothic, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

const bizUDPGothic = BIZ_UDPGothic({
  variable: "--font-biz-ud",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  title: {
    default: "移住DB｜全国527市町村の移住データを比較",
    template: "%s｜移住DB",
  },
  description:
    "全国527市町村の家賃・気候・生活費・治安・アクセスを一画面で比較。データで選ぶ、感情で決める移住先探しをサポートします。",
  keywords: ["移住", "地方移住", "移住先", "市町村比較", "生活費", "家賃", "気候"],
  authors: [{ name: "移住DB" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://www.ijyu-data.com",
    siteName: "移住DB",
    title: "移住DB｜全国527市町村の移住データを比較",
    description:
      "全国527市町村の家賃・気候・生活費・治安・アクセスを一画面で比較。データで選ぶ地方移住をサポートします。",
  },
  twitter: {
    card: "summary_large_image",
    title: "移住DB｜全国527市町村の移住データを比較",
    description: "全国527市町村の移住データを一画面で比較できるプラットフォーム。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${dmMono.variable} ${shipporiMincho.variable} ${bizUDPGothic.variable} ${zenMaruGothic.variable} antialiased`}
      >
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `,
              }}
            />
          </>
        )}
        <script
          defer
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5777304596680169"
          crossOrigin="anonymous"
        />        
        {children}
        <footer style={{ background: '#2C2A26', color: '#9E9488', padding: '24px 32px', marginTop: 'auto', fontSize: 12, textAlign: 'center' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <p style={{ marginBottom: 8 }}>© 2026 移住DB | データで選ぶ、感情で決める移住先探し</p>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/about" style={{ color: '#9E9488', textDecoration: 'none' }}>データについて</a>
              <a href="/privacy" style={{ color: '#9E9488', textDecoration: 'none' }}>プライバシーポリシー</a>
              <a href="/contact" style={{ color: '#9E9488', textDecoration: 'none' }}>お問い合わせ</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
