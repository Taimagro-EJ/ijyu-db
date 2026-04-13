import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ブログ｜移住に役立つ情報を発信',
  description: '地方移住に役立つ情報をデータとともに発信。生活費シミュレーション、移住先比較、支援金ガイドなど。',
};

type BlogPost = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  published_at: string | null;
};

async function getPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, category, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error) return [];
  return data as BlogPost[];
}

const CATEGORY_COLORS: Record<string, string> = {
  ranking: '#fef3c7',
  comparison: '#ede9fe',
  deep_dive: '#dbeafe',
  simulation: '#dcfce7',
  howto: '#fce7f3',
  column: '#f1f5f9',
};

const CATEGORY_TEXT: Record<string, string> = {
  ranking: '#92400e',
  comparison: '#5b21b6',
  deep_dive: '#1e40af',
  simulation: '#166534',
  howto: '#9d174d',
  column: '#475569',
};

const CATEGORY_LABELS: Record<string, string> = {
  surprising_discovery: '意外な発見',
  cross_ranking: 'クロスランキング',
  correlation: '相関分析',
  complex_ranking: '複合ランキング',
  lifestyle: 'ライフスタイル',
  data_analysis: 'データ分析',
  ranking: 'ランキング',
  comparison: '比較',
  deep_dive: '移住ガイド',
  simulation: 'シミュレーション',
  howto: 'ハウツー',
  column: 'コラム',
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '24px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← 移住DB</Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 0', letterSpacing: '-0.5px' }}>移住コラム</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>データで読む地方移住のリアル</p>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 16 }}>記事を準備中です</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map(post => {
              const bg = CATEGORY_COLORS[post.category ?? ''] ?? '#f1f5f9';
              const tc = CATEGORY_TEXT[post.category ?? ''] ?? '#475569';
              const label = CATEGORY_LABELS[post.category ?? ''] ?? post.category ?? '';
              const date = post.published_at
                ? new Date(post.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                : '';
              return (
                <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    padding: '20px 24px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ background: bg, color: tc, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{label}</span>
                      {date && <span style={{ fontSize: 12, color: '#94a3b8' }}>{date}</span>}
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{post.title}</h2>
                    {post.description && <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{post.description}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
