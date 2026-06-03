import { fP, fU, fAddr } from '../../utils.js';

export default function MarketsTab({ allPairs, mint }) {
  if (!allPairs.length) {
    return <div className="empty-state">No market data.</div>;
  }

  return (
    <>
      {allPairs.map((pair, index) => (
        <div key={pair.pairAddress || index} style={{
          display: 'flex', gap: 8, padding: '7px 12px',
          borderBottom: '1px solid rgba(33,38,45,.07)', alignItems: 'center', fontSize: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 10 }}>{(pair.dexId || '').toUpperCase()}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fAddr(pair.pairAddress)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{fP(pair.priceUsd)}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Vol {fU(pair.volume?.h24)}</div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Liq {fU(pair.liquidity?.usd)}</div>
            <a
              href={`https://dexscreener.com/solana/${pair.pairAddress || ''}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 9, color: 'var(--text-link)' }}
            >
              ↗ DS
            </a>
          </div>
        </div>
      ))}
    </>
  );
}