'use client';

import { useState, useCallback } from 'react';

const CATEGORIES = [
  { key: 'shopping',      label: 'ショッピング',  icon: '🛒', default: 50 },
  { key: 'gourmet',       label: 'カフェ・外食',  icon: '☕', default: 50 },
  { key: 'fitness',       label: 'フィットネス',  icon: '🏋️', default: 50 },
  { key: 'entertainment', label: 'エンタメ',      icon: '🎬', default: 50 },
  { key: 'childcare',     label: '子育て・教育',  icon: '👶', default: 50 },
  { key: 'medical',       label: '医療・安心',    icon: '🏥', default: 50 },
  { key: 'costperf',      label: 'コスパ重視',    icon: '💰', default: 50 },
];

const PRESETS = {
  family: { shopping: 40, gourmet: 20, fitness: 15, entertainment: 20, childcare: 95, medical: 85, costperf: 70 },
  remote: { shopping: 35, gourmet: 80, fitness: 60, entertainment: 40, childcare: 15, medical: 30, costperf: 70 },
  senior: { shopping: 50, gourmet: 30, fitness: 60, entertainment: 30, childcare: 0,  medical: 95, costperf: 50 },
};

interface WeightSliderProps {
  weights: Record<string, number>;
  onWeightsChange: (weights: Record<string, number>) => void;
}

export default function WeightSlider({ weights, onWeightsChange }: WeightSliderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = useCallback((key: string, value: number) => {
    onWeightsChange({ ...weights, [key]: value });
  }, [weights, onWeightsChange]);

  const applyPreset = useCallback((preset: keyof typeof PRESETS) => {
    onWeightsChange(PRESETS[preset]);
  }, [onWeightsChange]);

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      borderRadius: 14,
      border: '1px solid var(--color-border)',
      padding: '14px 18px',
      marginBottom: 16,
    }}>
      {/* プリセットボタン（常に表示） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          🎯 こんな人向け:
        </span>
        {[
          { key: 'family' as const, label: '👶 子育て世帯' },
          { key: 'remote' as const, label: '💻 リモートワーカー' },
          { key: 'senior' as const, label: '🏥 シニア' },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => { applyPreset(p.key); setIsOpen(true); }}
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: 'var(--color-base-light)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-base-light)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
            }}
          >
            {p.label}
          </button>
        ))}

        {/* 展開トグル */}
        <button
          onClick={() => setIsOpen(v => !v)}
          style={{
            marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 999,
            border: '1px solid var(--color-border)',
            background: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          {isOpen ? '▲ 閉じる' : '▼ 詳細な重みを調整'}
        </button>
      </div>

      {/* スライダー群（折りたたみ） */}
      {isOpen && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{cat.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 90, flexShrink: 0 }}>
                  {cat.label}
                </span>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={weights[cat.key] ?? 50}
                  onChange={e => handleChange(cat.key, Number(e.target.value))}
                  style={{ flex: 1, height: 4, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <span style={{
                  fontSize: 12, width: 32, textAlign: 'right',
                  fontFamily: "'DM Mono', monospace",
                  color: 'var(--color-text-muted)',
                }}>
                  {weights[cat.key] ?? 50}%
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 10 }}>
            ※ スライダーを動かすと「カスタム」ソートで527市町村がリアルタイムに並び替わります
          </p>
        </div>
      )}
    </div>
  );
}
