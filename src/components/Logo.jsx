export default function Logo({ size = 56 }) {
  const id = Math.random().toString(36).slice(2, 6);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', borderRadius: '50%' }}
    >
      <defs>
        <radialGradient id={`ybg${id}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFD84D" />
          <stop offset="60%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#1a0d00" />
        </radialGradient>
        <radialGradient id={`fur${id}`} cx="40%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#a0693a" />
          <stop offset="50%" stopColor="#7a4820" />
          <stop offset="100%" stopColor="#3d1f05" />
        </radialGradient>
        <radialGradient id={`face${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#d4956a" />
          <stop offset="100%" stopColor="#b87040" />
        </radialGradient>
        <radialGradient id={`bag${id}`} cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#6ee87a" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        <clipPath id={`circ${id}`}><circle cx="100" cy="100" r="98" /></clipPath>
        <filter id={`shadow${id}`}><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000066" /></filter>
      </defs>

      <circle cx="100" cy="100" r="100" fill="#000" />
      <circle cx="100" cy="100" r="98" fill={`url(#ybg${id})`} />

      <g clipPath={`url(#circ${id})`}>
        <g style={{ transformOrigin: '100px 105px' }}>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,-1;0,-3;0,0" dur="2.4s" repeatCount="indefinite" />

          <ellipse cx="100" cy="165" rx="42" ry="30" fill={`url(#fur${id})`} />
          <path d="M62 148 Q45 168 52 185" stroke="#7a4820" strokeWidth="16" fill="none" strokeLinecap="round" />
          <ellipse cx="52" cy="186" rx="9" ry="7" fill="#7a4820" />
          <path d="M138 148 Q155 168 148 185" stroke="#7a4820" strokeWidth="16" fill="none" strokeLinecap="round" />
          <ellipse cx="148" cy="186" rx="9" ry="7" fill="#7a4820" />

          <g style={{ transformOrigin: '100px 175px' }}>
            <animateTransform attributeName="transform" type="rotate" values="0;-5;0;5;0" dur="2.4s" repeatCount="indefinite" />
            <ellipse cx="100" cy="158" rx="14" ry="7" fill="#15803d" />
            <path d="M88 158 Q100 152 112 158" stroke="#14532d" strokeWidth="3" fill="none" />
            <ellipse cx="100" cy="182" rx="36" ry="28" fill={`url(#bag${id})`} filter={`url(#shadow${id})`} />
            <ellipse cx="88" cy="170" rx="10" ry="7" fill="#ffffff22" transform="rotate(-20,88,170)" />
            <text x="100" y="178" textAnchor="middle" fontSize="26" fontWeight="900" fill="#0a3d1a" fontFamily="Arial Black,Arial,sans-serif" opacity="0.85">$</text>
            <text x="100" y="196" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0a3d1a" fontFamily="Arial,sans-serif" letterSpacing="0.5">Bags.FM</text>
          </g>

          <circle cx="62" cy="88" r="18" fill="#7a4820" />
          <circle cx="62" cy="88" r="11" fill="#c47a45" />
          <circle cx="138" cy="88" r="18" fill="#7a4820" />
          <circle cx="138" cy="88" r="11" fill="#c47a45" />
          <circle cx="100" cy="82" r="46" fill={`url(#fur${id})`} />
          <ellipse cx="100" cy="96" rx="28" ry="23" fill={`url(#face${id})`} />
          <ellipse cx="100" cy="68" rx="32" ry="10" fill="#5a3010" />
          <circle cx="86" cy="74" r="9" fill="#1a0a00" />
          <circle cx="114" cy="74" r="9" fill="#1a0a00" />
          <circle cx="89" cy="71" r="3.5" fill="#ffffff" />
          <circle cx="117" cy="71" r="3.5" fill="#ffffff" />
          <circle cx="90" cy="72" r="1.5" fill="#00000055" />
          <circle cx="118" cy="72" r="1.5" fill="#00000055" />
          <ellipse cx="100" cy="92" rx="8" ry="6" fill="#5a2d0a" />
          <circle cx="95" cy="92" r="3" fill="#3d1a05" />
          <circle cx="105" cy="92" r="3" fill="#3d1a05" />
          <ellipse cx="96" cy="90" rx="2" ry="1.5" fill="#ffffff33" />
          <path d="M86 104 Q100 116 114 104" stroke="#5a2d0a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M70 50 Q65 35 75 28" stroke="#5a3010" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M100 48 Q100 32 100 24" stroke="#5a3010" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M130 50 Q135 35 125 28" stroke="#5a3010" strokeWidth="8" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <circle cx="100" cy="100" r="97" fill="none" stroke="#3d1f05" strokeWidth="5" />
      <circle cx="100" cy="100" r="97" fill="none" stroke="#FFD84D22" strokeWidth="2" />
    </svg>
  );
}