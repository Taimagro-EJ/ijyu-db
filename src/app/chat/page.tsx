'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  '東京から2時間以内で家賃5万以下の街は？',
  '子育てしやすくて生活費が安い街を教えて',
  'スタバとジムがある地方都市は？',
  '温暖で犯罪率が低い移住先は？',
  '松本市と前橋市、どちらが住みやすい？',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'こんにちは！移住DBのAIコンサルタントです。\n\n全国527市町村のデータを基に、あなたにぴったりの移住先を一緒に探します。家賃・東京までの距離・気候・施設環境など、どんな条件でもお気軽にどうぞ 🏡',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usageCount, setUsageCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const FREE_LIMIT = 5

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    if (usageCount >= FREE_LIMIT) return

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setUsageCount(c => c + 1)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || data.error || 'エラーが発生しました',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '接続エラーが発生しました。しばらくしてから再試行してください。',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const remaining = FREE_LIMIT - usageCount
  const isLimitReached = usageCount >= FREE_LIMIT

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <header style={{
        background: 'var(--color-base-dark)', color: '#fff',
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 12, textDecoration: 'none' }}>← 一覧</Link>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Shippori Mincho', serif", color: 'var(--color-base-light)' }}>
              移住DB AI相談
            </div>
            <div style={{ fontSize: 10, color: '#64748b' }}>527市町村のデータから最適な移住先を提案</div>
          </div>
        </div>
        <div style={{
          fontSize: 11, color: remaining <= 1 ? '#F87171' : '#94a3b8',
          background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 999,
        }}>
          残り {remaining} 回（無料）
        </div>
      </header>

      {/* メッセージエリア */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginRight: 8, flexShrink: 0,
              }}>🏡</div>
            )}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-card)',
              color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px', fontSize: 14, lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🏡</div>
            <div style={{
              background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
              borderRadius: '18px 18px 18px 4px', padding: '12px 16px',
              fontSize: 14, color: 'var(--color-text-muted)',
            }}>
              データを分析中...
            </div>
          </div>
        )}

        {isLimitReached && (
          <div style={{
            textAlign: 'center', padding: '20px',
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            borderRadius: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              無料利用{FREE_LIMIT}回に達しました
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              引き続き移住DBのデータで街を比較できます
            </div>
            <Link href="/" style={{
              display: 'inline-block', background: 'var(--color-accent)', color: '#fff',
              padding: '10px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              市町村一覧で探す →
            </Link>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* サジェスト（初回のみ） */}
      {messages.length === 1 && (
        <div style={{ padding: '0 16px 12px', maxWidth: 720, width: '100%', margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{
              fontSize: 11, padding: '6px 12px',
              background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
              borderRadius: 999, color: 'var(--color-text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'
              }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* 入力エリア */}
      <div style={{
        padding: '12px 16px 20px', background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={isLimitReached ? '無料利用上限に達しました' : '移住条件を入力してください（例: 家賃5万以下で東京2時間圏内）'}
            disabled={isLoading || isLimitReached}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: isLimitReached ? 'var(--color-base-light)' : 'var(--color-bg-card)',
              color: 'var(--color-text-primary)', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || isLimitReached}
            style={{
              padding: '12px 20px',
              background: (!input.trim() || isLoading || isLimitReached) ? 'var(--color-border)' : 'var(--color-accent)',
              color: '#fff', border: 'none', borderRadius: 999,
              fontSize: 14, fontWeight: 600,
              cursor: (!input.trim() || isLoading || isLimitReached) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  )
}
