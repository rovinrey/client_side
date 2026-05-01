import React from 'react';

interface PieData {
  program: string;
  value: number;
}

interface PieChartProps {
  data: PieData[];
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, height = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" style={{ height: height || 200 }}>
        <span className="text-gray-400 text-sm">No data</span>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 80;
  const centerX = 100;
  const centerY = height ? height / 2 : 100;
  const COLORS = ["#0f766e", "#14b8a6", "#2dd4bf", "#99f6e4", "#115e59"];

  let cumulativeAngle = 0;

  const paths = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = startAngle + angle;
    cumulativeAngle = endAngle;
    
    const x1 = centerX + Math.cos((startAngle - 90) * Math.PI / 180) * radius;
    const y1 = centerY + Math.sin((startAngle - 90) * Math.PI / 180) * radius;
    const x2 = centerX + Math.cos((endAngle - 90) * Math.PI / 180) * radius;
    const y2 = centerY + Math.sin((endAngle - 90) * Math.PI / 180) * radius;

    const largeArc = angle > 180 ? 1 : 0;

    return (
      <path
        key={i}
        d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={COLORS[i % COLORS.length]}
        stroke="white"
        strokeWidth="2"
      />
    );
  });

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 200 ${height || 200}`} className="w-full">
        {paths}
        <circle cx={centerX} cy={centerY} r={radius * 0.5} fill="white" />
        <text x={centerX} y={centerY + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#374151">
          {Math.round(total)}
        </text>
      </svg>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-gray-600">{d.program}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
