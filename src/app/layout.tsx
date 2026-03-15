import type { Metadata } from "next";
import { Noto_Sans_JP, DM_Mono, Shippori_Mincho } from "next/font/google";
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
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
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
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${dmMono.variable} ${shipporiMincho.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
