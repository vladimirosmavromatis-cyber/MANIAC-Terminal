import { fPct } from '../utils.js';

function tokenLogoUrl(pair) {
  return pair?.info?.imageUrl || pair?.baseToken?.imageUrl || '';
}

export default function Ticker({ tokens, onSelectToken }) {
  if (!tokens.length) return <div style={{ height: 28, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }} />;

  // Double the list so the CSS animation loops seamlessly
  const doubledTokens = [...tokens.slice(0, 30), ...tokens.slice(0, 30)];

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      height: 28,
      overflow: 'hidden',
      position: 'sticky',
      top: 0,
      zIndex: 300,
    }}>
      <div style={{
        display: 'flex',
        animation: 'ticker-scroll 80s linear infinite',
        whiteSpace: 'nowrap',
      }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {doubledTokens.map((pair, index) => {
          const change24h = +(pair.priceChange?.h24 || 0);
          const changeColor = change24h >= 0 ? 'var(--green)' : 'var(--red)';
          const logoUrl = tokenLogoUrl(pair);
          return (
            <button
              key={index}
              onClick={() => onSelectToken(pair.baseToken?.address || '')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 12px',
                height: 28,
                borderRight: '1px solid rgba(33,38,45,.13)',
                flexShrink: 0,
                background: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  style={{ width: 12, height: 12, borderRadius: '50%', objectFit: 'cover' }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
              <span style={{ fontWeight: 700, fontSize: 10, color: 'var(--text)' }}>
                {pair.baseToken?.symbol || ''}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: changeColor }}>
                {fPct(change24h)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}