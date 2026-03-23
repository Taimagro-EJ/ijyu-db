'use client';

import dynamic from 'next/dynamic';

const RadarChart = dynamic(() => import('./RadarChart'), { ssr: false });

interface Props {
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

export default function RadarChartWrapper({ municipalityName, scores }: Props) {
  return <RadarChart municipalityName={municipalityName} scores={scores} />;
}
