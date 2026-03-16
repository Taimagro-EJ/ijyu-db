'use client'

import { useState, useEffect } from 'react'

type BlogPost = {
  id: number
  slug: string
  title: string
  description: string | null
  content: string | null
  category: string | null
  published: boolean
  published_at: string | null
  generated_by: string | null
  generated_at: string | null
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  ranking: 'ランキング',
  comparison: '比較',
  deep_dive: '移住ガイド',
  simulation: 'シミュレーション',
  howto: 'ハウツー',
  column: 'コラム',
}

export default function AdminBlogPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [preview, setPreview] = useState<BlogPost | null>(null)
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthenticated(true)
      setError('')
      loadPosts()
    } else {
      setError('パスワードが違います')
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/posts')
    if (res.ok) {
      const data = await res.json()
      setPosts(data)
    }
    setLoading(false)
  }

  const handlePublish = async (post: BlogPost) => {
    setPublishing(post.id)
    const res = await fetch('/api/admin/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, published: !post.published }),
    })
    if (res.ok) {
      setMessage(post.published ? `「${post.title}」を非公開にしました` : `「${post.title}」を公開しました`)
      loadPosts()
      setTimeout(() => setMessage(''), 3000)
    }
    setPublishing(null)
  }

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F7F5F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans JP', sans-serif",
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E8E4DF',
          padding: '40px', width: 360, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1814', marginBottom: 24 }}>管理画面</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="パスワードを入力"
            style={{
              width: '100%', padding: '10px 14px',
              border: '1px solid #E8E4DF', borderRadius: 8,
              fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#B84C3A', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            onClick={handleLogin}
            style={{
              width: '100%', padding: '12px',
              background: '#D46B3A', color: '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >ログイン</button>
        </div>
      </div>
    )
  }

  const drafts = posts.filter(p => !p.published)
  const published = posts.filter(p => p.published)

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>
      <header style={{ background: '#454034', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <a href="/" style={{ color: '#A19679', fontSize: 12, textDecoration: 'none' }}>← 移住DB</a>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0', color: '#F2F0EC' }}>ブログ管理</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/blog" target="_blank" style={{ fontSize: 13, color: '#A19679', textDecoration: 'none' }}>ブログを見る →</a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>
        {message && (
          <div style={{
            background: '#E8F4EC', color: '#166534', border: '1px solid #4A7C59',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 14,
          }}>{message}</div>
        )}

        {/* 下書き */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1814', marginBottom: 16 }}>
            📝 下書き（{drafts.length}件）
          </h2>
          {loading ? (
            <div style={{ color: '#9E9488', textAlign: 'center', padding: 40 }}>読み込み中...</div>
          ) : drafts.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E4DF', padding: 32, textAlign: 'center', color: '#9E9488' }}>
              下書きはありません。GitHub Actionsが毎週月曜に記事を生成します。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {drafts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPreview={() => setPreview(post)}
                  onPublish={() => handlePublish(post)}
                  publishing={publishing === post.id}
                  isDraft={true}
                />
              ))}
            </div>
          )}
        </section>

        {/* 公開済み */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1814', marginBottom: 16 }}>
            ✅ 公開済み（{published.length}件）
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {published.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onPreview={() => setPreview(post)}
                onPublish={() => handlePublish(post)}
                publishing={publishing === post.id}
                isDraft={false}
              />
            ))}
          </div>
        </section>
      </div>

      {/* プレビューモーダル */}
      {preview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '40px 20px', zIndex: 1000, overflowY: 'auto',
        }}
        onClick={() => setPreview(null)}
        >
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 800, width: '100%',
            padding: '32px', position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreview(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', fontSize: 20,
                cursor: 'pointer', color: '#9E9488',
              }}
            >×</button>
            <div style={{ fontSize: 12, color: '#9E9488', marginBottom: 8 }}>
              {CATEGORY_LABELS[preview.category ?? ''] ?? preview.category}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1814', marginBottom: 24 }}>
              {preview.title}
            </h2>
            {preview.content && (
              <div
                style={{ fontSize: 14, lineHeight: 1.9, color: '#1e293b' }}
                dangerouslySetInnerHTML={{ __html: preview.content }}
              />
            )}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setPreview(null)}
                style={{ padding: '8px 20px', border: '1px solid #E8E4DF', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>
                閉じる
              </button>
              {!preview.published && (
                <button
                  onClick={() => { handlePublish(preview); setPreview(null) }}
                  style={{ padding: '8px 20px', background: '#D46B3A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  ✅ 公開する
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PostCard({ post, onPreview, onPublish, publishing, isDraft }: {
  post: BlogPost
  onPreview: () => void
  onPublish: () => void
  publishing: boolean
  isDraft: boolean
}) {
  const charCount = post.content ? post.content.replace(/<[^>]+>/g, '').length : 0
  const generatedDate = post.generated_at
    ? new Date(post.generated_at).toLocaleDateString('ja-JP')
    : post.created_at
      ? new Date(post.created_at).toLocaleDateString('ja-JP')
      : ''

  const hasHumanInsert = post.content?.includes('[HUMAN_INSERT') ?? false

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E8E4DF',
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#6B6457', background: '#F2F0EC', padding: '2px 8px', borderRadius: 999 }}>
              {CATEGORY_LABELS[post.category ?? ''] ?? post.category}
            </span>
            <span style={{ fontSize: 11, color: '#9E9488' }}>{generatedDate}</span>
            <span style={{ fontSize: 11, color: '#9E9488' }}>{charCount.toLocaleString()}文字</span>
            {post.generated_by && (
              <span style={{ fontSize: 11, color: '#9E9488' }}>{post.generated_by}</span>
            )}
            {hasHumanInsert && (
              <span style={{ fontSize: 11, color: '#C4922A', background: '#FDF3E3', padding: '2px 8px', borderRadius: 999 }}>
                ⚠️ [HUMAN_INSERT]あり
              </span>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1814' }}>{post.title}</div>
          {post.description && (
            <div style={{ fontSize: 12, color: '#6B6457', marginTop: 4 }}>{post.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onPreview}
            style={{
              padding: '6px 14px', border: '1px solid #E8E4DF',
              borderRadius: 8, background: '#fff', cursor: 'pointer',
              fontSize: 13, color: '#6B6457',
            }}
          >プレビュー</button>
          {isDraft ? (
            <button
              onClick={onPublish}
              disabled={publishing}
              style={{
                padding: '6px 14px', border: 'none',
                borderRadius: 8, background: publishing ? '#9E9488' : '#D46B3A',
                color: '#fff', cursor: publishing ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}
            >{publishing ? '処理中...' : '✅ 公開する'}</button>
          ) : (
            <button
              onClick={onPublish}
              disabled={publishing}
              style={{
                padding: '6px 14px', border: '1px solid #E8E4DF',
                borderRadius: 8, background: '#fff', cursor: 'pointer',
                fontSize: 13, color: '#9E9488',
              }}
            >{publishing ? '処理中...' : '非公開に戻す'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
