// src/components/municipality/DataBar.tsx
interface DataBarProps {
  label: string;
  value: number | null | undefined;
  max: number;
  unit: string;
  invert?: boolean;
  icon?: string;
}

export default function DataBar({ label, value, max, unit, invert = false, icon }: DataBarProps) {
  if (value === null || value === undefined) return null;
  const pct = Math.min(100, (value / max) * 100);
  const isGood = invert ? pct < 40 : pct > 60;
  const isBad = invert ? pct > 70 : pct < 30;
  const barColor = isGood ? '#4A7C59' : isBad ? '#B84C3A' : '#D46B3A';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#F2F0EC] last:border-0">
      {icon && <span className="w-5 text-center text-sm flex-shrink-0">{icon}</span>}
      <span className="w-20 text-xs text-[#6B6457] shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#F2F0EC] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <span className="w-16 text-right text-xs text-[#454034] shrink-0"
            style={{ fontFamily: "'DM Mono', monospace" }}>
        {typeof value === 'number' ? value.toLocaleString() : value}{unit}
      </span>
    </div>
  );
}
