export default function UnoCard({ color, value, type, isBack = false }) {
  const getFillColor = () => {
    if (isBack) return '#121212';
    if (type === 'wild') return '#222';
    switch (color) {
      case 'Red': return '#e53935';
      case 'Blue': return '#1e88e5';
      case 'Green': return '#43a047';
      case 'Yellow': return '#fdd835';
      default: return '#222';
    }
  };

  const fillColor = getFillColor();
  const textColor = (type === 'wild' || isBack) ? '#fff' : '#fff';

  if (isBack) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg viewBox="0 0 200 300" width="100%" height="100%">
          <rect width="200" height="300" rx="20" fill="#fff" />
          <rect x="10" y="10" width="180" height="280" rx="15" fill="#121212" />
          <ellipse cx="100" cy="150" rx="70" ry="110" fill="#e53935" transform="rotate(-30 100 150)" />
          <text x="100" y="170" fontFamily="sans-serif" fontSize="50" fontWeight="900" fill="#fff" textAnchor="middle" transform="rotate(-30 100 150)">UNO</text>
        </svg>
      </div>
    );
  }

  const renderValue = (val, x, y, size, rotation=0, fillOverride=null) => {
    let displayVal = val;
    const finalColor = fillOverride || textColor;
    if (val === 'Draw Two') displayVal = '+2';
    if (val === 'Wild') displayVal = 'W';
    if (val === 'Wild Draw Four') displayVal = '+4';

    if (val === 'Skip') {
      return (
        <g transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${size/100})`}>
          <circle cx="0" cy="0" r="30" fill="none" stroke={finalColor} strokeWidth="12" />
          <line x1="-20" y1="-20" x2="20" y2="20" stroke={finalColor} strokeWidth="12" />
        </g>
      );
    }
    
    if (val === 'Reverse') {
      return (
        <g transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${size/100})`}>
          <path d="M-15,-10 L15,-10 L5,-20 M15,-10 L5,0" fill="none" stroke={finalColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15,10 L-15,10 L-5,20 M-15,10 L-5,0" fill="none" stroke={finalColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }

    return (
      <text x={x} y={y} fontFamily="sans-serif" fontSize={size} fontWeight="bold" fill={finalColor} textAnchor="middle" dominantBaseline="central" transform={`rotate(${rotation} ${x} ${y})`}>
        {displayVal}
      </text>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 200 300" width="100%" height="100%">
        {/* Card Border */}
        <rect width="200" height="300" rx="20" fill="#fff" />
        {/* Inner colored background */}
        <rect x="10" y="10" width="180" height="280" rx="15" fill={fillColor} />
        
        {/* Center Oval (White or multi-colored for wilds) */}
        {type === 'wild' ? (
           <g transform="rotate(-30 100 150)">
             <path d="M 100 40 A 60 110 0 0 1 100 260 A 60 110 0 0 1 100 40" fill="#e53935"/>
             <path d="M 100 40 A 60 110 0 0 1 160 150 L 100 150 Z" fill="#1e88e5"/>
             <path d="M 100 260 A 60 110 0 0 1 40 150 L 100 150 Z" fill="#fdd835"/>
             <path d="M 40 150 A 60 110 0 0 1 100 40 L 100 150 Z" fill="#43a047"/>
           </g>
        ) : (
           <ellipse cx="100" cy="150" rx="60" ry="100" fill="#fff" transform="rotate(-30 100 150)" />
        )}

        {/* Center Text Drop Shadow */}
        {renderValue(value, 103, 153, type === 'wild' ? 70 : 100, 0)}
        
        {/* Center Text */}
        {value === 'Skip' || value === 'Reverse' ? (
           renderValue(value, 100, 150, type === 'wild' ? 70 : 100, 0, fillColor)
        ) : (
           <text x="100" y="150" fontFamily="sans-serif" fontSize={type === 'wild' ? 70 : 100} fontWeight="900" fill={type === 'wild' ? '#fff' : fillColor} textAnchor="middle" dominantBaseline="central">
             {value === 'Draw Two' ? '+2' : value === 'Wild' ? 'W' : value === 'Wild Draw Four' ? '+4' : value}
           </text>
        )}

        {/* Top Left Corner */}
        {renderValue(value, 35, 50, 30)}
        {/* Bottom Right Corner */}
        {renderValue(value, 165, 260, 30, 180)}
      </svg>
    </div>
  );
}
