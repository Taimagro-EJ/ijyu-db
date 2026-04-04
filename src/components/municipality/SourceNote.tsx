export const DATA_SOURCES = {
  rent: { source: '国土交通省 不動産情報ライブラリ', year: 2025, url: 'https://www.reinfolib.mlit.go.jp/' },
  population: { source: '総務省 住民基本台帳', year: 2020, url: 'https://www.e-stat.go.jp/' },
  facilities: { source: 'OpenStreetMap (Geofabrik)', year: 2026, url: 'https://download.geofabrik.de/asia/japan.html', note: '半径5-30km以内の施設をカウント' },
  climate: { source: '気象庁 過去の気象データ', year: 2024, url: 'https://www.data.jma.go.jp/' },
  crime: { source: '警察庁 犯罪統計', year: 2024, url: 'https://www.npa.go.jp/publications/statistics/' },
  migration_incentive: { source: '内閣官房 地方創生 移住支援金', year: 2025, url: 'https://www.chisou.go.jp/sousei/ijyu_shienkin.html', note: '世帯100万・単身60万・子ども加算100万は国制度の基本額' },
  medical_subsidy: { source: 'こども家庭庁 子ども医療費助成調査', year: 2024 },
  waiting_children: { source: '厚生労働省 保育所等関連状況取りまとめ', year: 2024 },
  scoring: { source: '移住DB独自算出', note: '施設密度(人口あたり)60% + 環境(気候・アクセス・治安)40%・パーセンタイル正規化v7' },
} as const

type SourceKey = keyof typeof DATA_SOURCES

export default function SourceNote({ sourceKey }: { sourceKey: SourceKey }) {
  const src = DATA_SOURCES[sourceKey]
  const url = 'url' in src ? src.url : undefined
  const year = 'year' in src ? src.year : undefined
  const note = 'note' in src ? src.note : undefined
  return (
    <p style={{ fontSize: 10, color: '#9E9488', marginTop: 6, lineHeight: 1.6 }}>
      出典:{' '}
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#9E9488', textDecoration: 'underline' }}>{src.source}</a> : src.source}
      {year ? `（${year}年）` : ''}
      {note ? `　— ${note}` : ''}
    </p>
  )
}
