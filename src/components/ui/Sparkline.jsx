export default function Sparkline({ points = "0,12 20,10 40,11 60,10 80,12", accent = "mag" }) {
  const color = accent === "mag" ? "#E41E65" : "#00B4A0";
  const gradientId = `sparkline-gradient-${accent}`;
  
  return (
    <svg viewBox="0 0 100 20" className="w-full h-10 opacity-90">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.7"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.0"/>
        </linearGradient>
      </defs>
      <polyline fill={`url(#${gradientId})`} stroke="none" points={`0,20 ${points} 100,20`} />
      <polyline fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="1.2" points={points}/>
    </svg>
  );
}