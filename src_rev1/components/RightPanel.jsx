import { fU, fNum, fAddr, walletName } from '../utils.js';
import { KNOWN_LABELS } from '../config.js';

export default function RightPanel({
  mint, pair, riskLabel, riskColor, mintAuthority, freezeAuthority,
  top10HoldPercent, holderCount, snipCount, bundleCount, insiderPercent,
  devPercent, cleanHolders, snsNames, creator, copiedKey, onCopy, priceUsd,
}) {
  const price = priceUsd || +(pair?.priceUsd || 0);
  const stopLoss   = price * 0.82;
  const buyZone    = price * 0.86;
  const target1    = price * 2;
  const target2    = price * 4;

  const fPrice = (p) => {
    if (!p) return '—';
    if (p < 0.000001) return '$' + p.toFixed(10).replace(/\.?0+$/, '');
    if (p < 0.001)    return '$' + p.toFixed(8).replace(/\.?0+$/, '');
    if (p < 1)        return '$' + p.toFixed(6).replace(/\.?0+$/, '');
    return '$' + p.toFixed(4);
  };
  return (
    <div style={{ overflowY: 'auto', borderLeft: '1px solid var(--border)', background: 'var(--bg-panel)', scrollbarWidth: 'thin' }}>

      {/* Header */}
      <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Token Data &amp; Security
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>
          {riskLabel}
        </span>
      </div>

      {/* Security cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 8 }}>
        {[
          [`${top10HoldPercent.toFixed(1)}%`, 'Top 10 H.', top10HoldPercent > 60 ? 'var(--red)' : top10HoldPercent > 40 ? 'var(--yellow)' : 'var(--green)'],
          [`${devPercent.toFixed(1)}%`, 'Dev Holding', devPercent > 5 ? 'var(--yellow)' : 'var(--green)'],
          [`${snipCount}${snipCount ? ' ⚡' : ''}`, 'Snipers', snipCount ? 'var(--yellow)' : 'var(--green)'],
          [`${insiderPercent.toFixed(1)}%`, 'Insiders H.', insiderPercent > 20 ? 'var(--red)' : insiderPercent > 10 ? 'var(--yellow)' : 'var(--green)'],
          [`${bundleCount}${bundleCount ? ' ⚡' : ''}`, 'Bundles H.', bundleCount ? 'var(--yellow)' : 'var(--green)'],
          [holderCount ? fNum(holderCount) : '—', 'Holders', 'var(--text)'],
          [mintAuthority ? 'Yes' : 'No', 'Mint Auth.', mintAuthority ? 'var(--red)' : 'var(--green)'],
          [freezeAuthority ? 'Yes' : 'No', 'Freeze Auth.', freezeAuthority ? 'var(--red)' : 'var(--green)'],
        ].map(([value, label, color]) => (
          <div key={label} className="sec-card">
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2, color }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Contract address */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Contract Address</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--yellow)' }}>
            {mint ? mint.slice(0, 8) + '…' + mint.slice(-4) : ''}
          </span>
          <button
            className="copy-btn"
            onClick={() => onCopy(mint, 'ca')}
            style={{ color: copiedKey === 'ca' ? 'var(--green)' : 'var(--text-muted)' }}
          >
            {copiedKey === 'ca' ? '✓' : '⎘'}
          </button>
          <a
            href={`https://solscan.io/token/${mint}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--text-link)', fontSize: 10 }}
          >
            ↗
          </a>
        </div>
      </div>

      {/* Price Targets */}
      {price > 0 && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Price Targets</div>

          {[
            { label: 'STOP LOSS', sub: '-18%', price: stopLoss, pct: '-18%', color: 'var(--red)', icon: '🔴' },
            { label: 'BUY ENTRY', sub: '-14%', price: buyZone, pct: '-14%', color: 'var(--yellow)', icon: '🟡' },
            { label: 'TARGET 1', sub: 'Sell 60%', price: target1, pct: '+100%', color: 'var(--green)', icon: '🎯' },
            { label: 'TARGET 2', sub: 'Moonshot', price: target2, pct: '+300%', color: 'var(--cyan)', icon: '🚀' },
          ].map(({ label, sub, price: p, pct, color, icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', marginBottom: 4, borderRadius: 5, background: `${color}18`, border: `1px solid ${color}33` }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color }}>{fPrice(p)}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{pct}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}