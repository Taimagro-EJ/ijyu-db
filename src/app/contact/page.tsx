'use client'

import { useState } from 'react'
import { Metadata } from 'next'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', category: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
        setForm({ name: '', email: '', category: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>
      <header style={{ background: '#454034', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <a href="/" style={{ color: '#A19679', fontSize: 13, textDecoration: 'none' }}>← 移住DB</a>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#1A1814', marginBottom: 8,
          fontFamily: "'Shippori Mincho', serif",
        }}>お問い合わせ</h1>
        <p style={{ fontSize: 14, color: '#6B6457', marginBottom: 40, lineHeight: 1.8 }}>
          データの誤り・ご意見・ご要望などお気軽にご連絡ください。通常2〜3営業日以内にご返信します。
        </p>

        {status === 'success' ? (
          <div style={{
            background: '#E8F4EC', border: '1px solid #4A7C59', borderRadius: 12,
            padding: '32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#166534', marginBottom: 8 }}>
              送信が完了しました
            </p>
            <p style={{ fontSize: 14, color: '#6B6457' }}>
              お問い合わせありがとうございます。内容を確認の上、ご連絡いたします。
            </p>
            <button
              onClick={() => setStatus('idle')}
              style={{
                marginTop: 20, padding: '8px 24px',
                background: '#D46B3A', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              }}
            >別のお問い合わせをする</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#454034', display: 'block', marginBottom: 6 }}>
                お名前 <span style={{ color: '#B84C3A' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="えいじ"
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14,
                  background: '#fff', color: '#1A1814',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#454034', display: 'block', marginBottom: 6 }}>
                メールアドレス <span style={{ color: '#B84C3A' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="example@email.com"
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14,
                  background: '#fff', color: '#1A1814',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#454034', display: 'block', marginBottom: 6 }}>
                お問い合わせ種別
              </label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14,
                  background: '#fff', color: form.category ? '#1A1814' : '#9E9488',
                }}
              >
                <option value="">選択してください</option>
                <option value="data_error">データの誤りの指摘</option>
                <option value="feature_request">機能のご要望</option>
                <option value="media">取材・メディア関係</option>
                <option value="municipality">自治体・行政関係</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#454034', display: 'block', marginBottom: 6 }}>
                お問い合わせ内容 <span style={{ color: '#B84C3A' }}>*</span>
              </label>
              <textarea
                required
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="お問い合わせ内容をご記入ください"
                rows={6}
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14,
                  background: '#fff', color: '#1A1814', resize: 'vertical',
                  fontFamily: "'Noto Sans JP', sans-serif",
                }}
              />
            </div>

            {status === 'error' && (
              <p style={{ color: '#B84C3A', fontSize: 13 }}>
                送信に失敗しました。時間をおいて再度お試しください。
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                padding: '14px', background: status === 'sending' ? '#9E9488' : '#D46B3A',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 600,
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {status === 'sending' ? '送信中...' : '送信する'}
            </button>

            <p style={{ fontSize: 12, color: '#9E9488', textAlign: 'center' }}>
              送信内容は<a href="/privacy" style={{ color: '#D46B3A' }}>プライバシーポリシー</a>に基づき適切に管理します。
            </p>
          </form>
        )}
      </main>
    </div>
  )
}
