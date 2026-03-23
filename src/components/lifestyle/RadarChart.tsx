'use client';

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface RadarChartProps {
  municipalityName: string;
  scores: {
    shopping: number | null;
    cafe: number | null;
    dining: number | null;
    fitness: number | null;
    entertainment: number | null;
    family: number | null;
    grocery: number | null;
  };
}

// 全国平均（lifestyle_scoresの平均的な値）
const NATIONAL_AVG = {
  shopping: 42, cafe: 38, dining: 41, fitness: 35, entertainment: 33, family: 45, grocery: 44,
};

export default function RadarChart({ municipalityName, scores }: RadarChartProps) {
  const data = [
    { category: 'ショッピング', score: scores.shopping ?? 0, nationalAvg: NATIONAL_AVG.shopping },
    { category: 'カフェ',       score: scores.cafe ?? 0,      nationalAvg: NATIONAL_AVG.cafe },
    { category: 'グルメ',       score: scores.dining ?? 0,    nationalAvg: NATIONAL_AVG.dining },
    { category: 'ジム',         score: scores.fitness ?? 0,   nationalAvg: NATIONAL_AVG.fitness },
    { category: 'エンタメ',     score: scores.entertainment ?? 0, nationalAvg: NATIONAL_AVG.entertainment },
    { category: '子育て',       score: scores.family ?? 0,    nationalAvg: NATIONAL_AVG.family },
    { category: '食料品',       score: scores.grocery ?? 0,   nationalAvg: NATIONAL_AVG.grocery },
  ];

  return (
    <div style={{ width: '100%', aspectRatio: '1', maxWidth: 360, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid gridType="polygon" stroke="#E8E4DF" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fontFamily: "'Noto Sans JP', sans-serif", fill: '#6B6457' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fontFamily: "'DM Mono', monospace", fill: '#9E9488' }}
            tickCount={4}
          />
          {/* 全国平均（背景） */}
          <Radar
            name="全国平均"
            dataKey="nationalAvg"
            stroke="#9E9488"
            fill="#9E9488"
            fillOpacity={0.08}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {/* この市町村 */}
          <Radar
            name={municipalityName}
            dataKey="score"
            stroke="#D46B3A"
            fill="#D46B3A"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: 12,
              background: '#FFFFFF',
              border: '1px solid #E8E4DF',
              borderRadius: 8,
            }}
            formatter={(value: number, name: string) => [`${value}点`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'Noto Sans JP', sans-serif" }} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
