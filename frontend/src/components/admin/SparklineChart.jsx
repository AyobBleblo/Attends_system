/**
 * SparklineChart — tiny inline SVG trend line for stat cards.
 * Props:
 *   data   : number[]  — 7 values (oldest → newest)
 *   color  : string    — stroke colour (e.g. '#D4AF37')
 *   height : number    — SVG height in px (default 36)
 */
const SparklineChart = ({ data = [], color = '#D4AF37', height = 36 }) => {
  if (!data || data.length < 2) return null;

  const W = 80;
  const H = height;
  const PAD = 3;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return [x, y];
  });

  const pathD = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  // Area fill
  const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;

  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaD}
        fill={`url(#sg-${color.replace('#', '')})`}
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Latest dot */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
};

export default SparklineChart;
