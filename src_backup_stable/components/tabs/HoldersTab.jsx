import { fAddr, fU, fNum, walletName } from '../../utils.js';
import { KNOWN_LABELS } from '../../config.js';

function shortenAddress(address) {
  if (!address) return '?';
  return address.slice(0, 4) + '…' + address.slice(-4);
}

export default function HoldersTab({ cleanHolders, holderCount, lpAddressSet, snsNames, snsLoading, pair, creator, copiedKey, onCopy }) {
  const top50 = cleanHolders.slice(0, 50);

  if (!top50.length) {
    return (
      <div className="empty-state">
        Loading holder data… (fetching from Solana via Helius)
      </div>
    );
  }

  const top50TotalPercent = top50.reduce((sum, h) => sum + (+h.pct || 0), 0);
  const maxPercent = Math.max(...top50.map(h => +h.pct || 0), 0.01);
  const filteredLpCount = lpAddressSet?.size || 0;

  return (
    <>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
            {holderCount ? `Holders (${fNum(holderCount)} total)` : `Holders (${top50.length} shown)`}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>LP excluded · {filteredLpCount} filtered</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Top 50: <strong style={{ color: top50TotalPercent > 80 ? 'var(--red)' : top50TotalPercent > 60 ? 'var(--yellow)' : 'var(--green)' }}>{top50TotalPercent.toFixed(1)}%</strong>
          </span>
          {snsLoading && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}><span className="spin">⟳</span> Resolving names…</span>}
        </div>
      </div>

      {/* Table header */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '38px 180px 1fr 90px 60px', padding: '5px 12px', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 }}>
          <div>RANK</div><div>ADDRESS / NAME</div><div>%</div>
          <div style={{ textAlign: 'right' }}>VALUE</div>
          <div />
        </div>
      </div>

      {/* Holder rows */}
      {top50.map((holder, index) => {
        const percent = +holder.pct || 0;
        const isCreator = holder.address === creator;
        const resolvedName = walletName(holder.address, snsNames);
        const isKnownProtocol = !!KNOWN_LABELS[holder.address];
        const barPercent = maxPercent > 0 ? (percent / maxPercent) * 100 : 0;
        const estimatedValue = (percent / 100) * (+(pair?.fdv) || 0);

        let rowColor = 'var(--text)';
        let badge = '';
        let badgeColor = '';
        if (isCreator) { badge = 'DEV'; badgeColor = 'var(--yellow)'; rowColor = 'var(--yellow)'; }
        else if (holder.insider) { badge = 'INSIDER'; badgeColor = 'var(--red)'; rowColor = 'var(--red)'; }
        else if (isKnownProtocol) { badge = 'PROTOCOL'; badgeColor = '#7c3aed'; rowColor = '#7c3aed'; }
        else if (resolvedName) { badge = 'NAMED'; badgeColor = 'var(--green)'; rowColor = 'var(--green)'; }

        const barColor = isCreator ? 'var(--yellow)' : holder.insider ? 'var(--red)' : 'var(--green)';
        const copyKey = `holder-${index}`;

        return (
          <div
            key={holder.address || index}
            className="holder-row"
            style={{ background: index % 2 === 0 ? 'rgba(0,0,0,.2)' : 'transparent' }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}>#{index + 1}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
              <a
                href={`https://solscan.io/account/${holder.address || ''}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {resolvedName ? (
                  <span style={{ color: rowColor, fontWeight: 700 }}>{resolvedName}</span>
                ) : (
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 10 }}>{shortenAddress(holder.address)}</span>
                )}
              </a>
              {badge && (
                <span style={{ fontSize: 8, fontWeight: 800, color: badgeColor, background: `${badgeColor.replace('var(--yellow)', '#e3b341').replace('var(--red)', '#f85149').replace('var(--green)', '#22c55e').replace('#7c3aed', '#7c3aed')}22`, padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>
                  {badge}
                </span>
              )}
            </div>

            <div style={{ paddingRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, background: 'var(--border)', borderRadius: 2, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${barPercent.toFixed(1)}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: isCreator ? 'var(--yellow)' : holder.insider ? 'var(--red)' : percent > 5 ? 'var(--yellow)' : 'var(--text)', minWidth: 38, textAlign: 'right' }}>
                  {percent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>{fU(estimatedValue)}</div>

            <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
              <button
                className="copy-btn"
                onClick={() => onCopy(holder.address || '', copyKey)}
                title="Copy address"
                style={{ color: copiedKey === copyKey ? 'var(--green)' : 'var(--text-muted)' }}
              >
                {copiedKey === copyKey ? '✓' : '⎘'}
              </button>
              <a
                href={`https://gmgn.ai/sol/address/${holder.address || ''}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text-muted)', fontSize: 10, padding: '0 2px' }}
                title="View on GMGN"
              >
                ↗
              </a>
            </div>
          </div>
        );
      })}

      <div style={{ padding: '8px 12px', fontSize: 9, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        Showing {top50.length} holders · LP pools excluded · Names via Bonfida SNS
      </div>
    </>
  );
}