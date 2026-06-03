import { fP, fPct, fU, fAge, bp } from '../utils.js';

function TokenLogo({ pair, size = 32 }) {
  const url = pair?.info?.imageUrl || pair?.baseToken?.imageUrl || '';
  if (!url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size / 2.5, flexShrink: 0, color: 'var(--text-muted)',
      }}>
        {(pair?.baseToken?.symbol || '?')[0]}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onError={e => (e.currentTarget.style.display = 'none')}
    />
  );
}

export default function FeedView({ loading, tokens, error, onSelectToken }) {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="spin" style={{ fontSize: 24, marginBottom: 10 }}>⟳</div>
        <div>Loading Radar…</div>
      </div>
    );
  }
  if (error) {
    return <div className="empty-state" style={{ color: 'var(--red)' }}>⚠ {error}</div>;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 8,
      padding: 12,
    }}>
      {tokens.map(pair => {
        const change24h = +(pair.priceChange?.h24 || 0);
        const change5m = +(pair.priceChange?.m5 || 0);
        const change24hColor = change24h >= 0 ? 'var(--green)' : 'var(--red)';
        const change5mColor = change5m >= 0 ? 'var(--green)' : 'var(--red)';
        const buyPercent = bp(pair.txns?.m5?.buys, pair.txns?.m5?.sells);
        const buyColor = buyPercent > 60 ? 'var(--green)' : buyPercent < 40 ? 'var(--red)' : 'var(--yellow)';

        return (
          <div
            key={pair.pairAddress || pair.baseToken?.address}
            className="feed-card"
            onClick={() => onSelectToken(pair.baseToken?.address || '')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
              <TokenLogo pair={pair} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{pair.baseToken?.symbol || ''}</span>
                  <span style={{ fontSize: 10, color: change24hColor, fontWeight: 700 }}>{fPct(change24h)}</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  {fAge(pair.pairCreatedAt)} · {(pair.dexId || '').toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{fP(pair.priceUsd)}</div>
                <div style={{ fontSize: 9, color: change5mColor }}>{fPct(change5m)} 5m</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 9, color: 'var(--text-muted)' }}>
              <span>Vol {fU(pair.volume?.h24)}</span>
              <span>Liq {fU(pair.liquidity?.usd)}</span>
              <span style={{ color: buyColor, fontWeight: 700 }}>B {buyPercent}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}