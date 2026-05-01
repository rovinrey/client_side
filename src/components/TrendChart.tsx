import React from 'react';

interface TrendChartProps {
  data: Array<{month: string, count: number}>;
  height?: number;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, height = 180 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" style={{ height }}>
        <span className="text-gray-400 text-sm">No data</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.count));
  const width = 300;
  const padding = 25;
  const chartHeight = height - padding * 2;

  const linePoints = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * (width - padding * 2) + padding;
    const y = height - padding - (d.count / maxValue) * chartHeight;
    return { x, y };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Simple Grid Lines */}
      <g fill="none" stroke="#e5e7eb" strokeWidth="1">
        {[0, 0.5, 1].map(level => (
          <line 
            key={level} 
            x1={padding} 
            y1={padding + level * chartHeight} 
            x2={width - padding} 
            y2={padding + level * chartHeight} 
          />
        ))}
      </g>

      {/* Trend Line */}
      <polyline 
        points={linePoints.map(p => `${p.x},${p.y}`).join(' ')} 
        fill="none" 
        stroke="#0f766e" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data Points */}
      {linePoints.map((point, i) => (
        <circle 
          key={i}
          cx={point.x} 
          cy={point.y} 
          r="4" 
          fill="#0f766e" 
          stroke="white" 
          strokeWidth="2"
        />
      ))}

      {/* X-axis Labels */}
      {data.length <= 6 ? data.map((d, i) => (
        <text key={i} x={linePoints[i].x} y={height - 5} textAnchor="middle" fontSize="9" fill="#6b7280">
          {d.month}
        </text>
      )) : data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((_, i) => {
        const idx = i * Math.ceil(data.length / 6);
        return (
          <text key={idx} x={linePoints[idx]?.x} y={height - 5} textAnchor="middle" fontSize="9" fill="#6b7280">
            {data[idx]?.month}
          </text>
        );
      })}
    </svg>
  );
};

export default TrendChart;