// src/app/about/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'データについて',
  description: '移住DBで使用しているデータの出典・計算方法・推計ロジックについて説明します。',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" style={{ background: '#ffffff', minHeight: '100vh' }}>
      <h1 className="text-3xl font-bold mb-2">データについて</h1>
      <p className="text-gray-500 mb-10 text-sm">最終更新: 2026年3月</p>

      {/* サービス概要 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">移住DBとは</h2>
        <p className="text-gray-700 leading-relaxed">
          移住DBは、全国527市町村の統計データを横断比較できる無料プラットフォームです。
          気候・生活費・治安・交通アクセスなど、移住先選びに必要な情報を一箇所に集約し、
          データに基づいた移住先の検討を支援します。
        </p>
      </section>

      {/* データ出典 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">データの出典</h2>
        <div className="space-y-5">

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-1">🌡️ 気候データ</h3>
            <p className="text-sm text-gray-600 mb-1">
              気象庁 AMeDAS（地域気象観測システム）の観測データおよび平年値（1991〜2020年）を使用。
              年間平均気温・1月平均気温・7月平均気温・年間降水量・年間日照時間・冬の最低気温を掲載。
            </p>
            <p className="text-xs text-gray-400">
              ※市区町村に観測点がない場合、最近傍の観測点データを代用しています。
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-1">🏠 生活費データ</h3>
            <p className="text-sm text-gray-600 mb-1">
              総務省統計局「住宅・土地統計調査」の1畳あたり家賃データ（e-Stat 統計表H2130）を基に1LDK家賃を推計。
              月間生活費は家賃に加え、食費・光熱費・交通費・雑費の推計値を都道府県の物価水準で補正して算出しています。
            </p>
            <p className="text-xs text-gray-400">
              ※推計値のため実際の生活費とは異なる場合があります。あくまでも目安としてご利用ください。
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-1">🔒 安全・治安データ</h3>
            <p className="text-sm text-gray-600 mb-1">
              都道府県警察の犯罪統計をもとに、人口10万人あたりの刑法犯認知件数を掲載。
              評価は犯罪率の水準に基づき5段階で表示しています。
            </p>
            <p className="text-xs text-gray-400">
              ※都道府県単位の代表値を市区町村に適用している場合があります。
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-1">🚄 アクセスデータ</h3>
            <p className="text-sm text-gray-600 mb-1">
              東京・大阪までの所要時間（分）、最寄り新幹線駅・空港は手動調査および推計による値です。
              公共交通スコアは交通網の充実度を5段階で評価したものです。
            </p>
            <p className="text-xs text-gray-400">
              ※交通機関の運行状況や所要時間は変動することがあります。最新情報は各交通機関にてご確認ください。
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-1">👥 人口・基本情報</h3>
            <p className="text-sm text-gray-600">
              総務省「e-Stat 社会・人口統計体系」の市区町村別統計データを使用。
              人口は直近の国勢調査または住民基本台帳の値を参照しています。
            </p>
          </div>
        </div>
      </section>

      {/* 推計値について */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">推計値（※）について</h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          一部のデータは統計値から算出した推計値です。特に生活費・治安評価・アクセス所要時間については、
          都道府県単位の統計や近隣市区町村のデータを代用・補正しているケースがあります。
          実際の値と異なる場合がありますので、詳細は各市区町村・行政機関の公式情報をご確認ください。
        </p>
      </section>

      {/* 免責事項 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">免責事項</h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          本サイトに掲載する情報は参考情報であり、その正確性・完全性・最新性を保証するものではありません。
          掲載データに基づく移住の意思決定については、ご自身の責任においてご判断ください。
          当サイトの利用により生じた損害について、運営者は一切の責任を負いません。
        </p>
      </section>

      {/* お問い合わせ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">お問い合わせ</h2>
        <p className="text-gray-700 text-sm mb-4">
          データの誤りや改善提案は、下記のお問い合わせフォームよりご連絡ください。
        </p>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSelnAEW61yiHcPrBg5OU3nM0Shx1_6tqfuBcN2FQar0ApJEmA/viewform" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '10px 20px', background: '#D46B3A', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>お問い合わせフォームへ</a>
      </section>

      <div className="mt-8 pt-6 border-t">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
    </div>
  );
}
