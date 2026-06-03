import { fP, fU, fPct, fNum, fAge, bp, walletName } from '../utils.js';

function StatRow({ label, value, valueColor }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}

function ChangeCell({ label, pct, buys, sells }) {
  const color = pct >= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ background: 'rgba(22,27,34,.53)', borderRadius: 4, padding: '4px 6px', border: '1px solid rgba(33,38,45,.27)' }}>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color }}>{fPct(pct)}</div>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>
        <span style={{ color: 'var(--green)' }}>{buys}B</span> / <span style={{ color: 'var(--red)' }}>{sells}S</span>
      </div>
    </div>
  );
}

export default function LeftPanel({
  pair, rug, riskLabel, riskColor, mintAuthority, freezeAuthority,
  lpLockedPercent, cleanHolders, holderCount, snipCount, bundleCount,
  top10HoldPercent, insiderPercent, creator, snsNames, snsLoading,
  copiedKey, onCopy,
}) {
  const priceUsd = +(pair?.priceUsd || 0);
  const priceSOL = +(pair?.priceNative || 0);
  const lpLocked = +(rug?.markets?.[0]?.lp?.lpLockedPct || 0);

  const maxHolderPercent = Math.max(...cleanHolders.slice(0, 10).map(h => +h.pct || 0), 1);

  return (
    <div style={{ overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', scrollbarWidth: 'thin' }}>

      {/* Price */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.6px' }}>Price</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-bright)', lineHeight: 1.2 }}>{fP(priceUsd)}</div>
        {priceSOL > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{priceSOL.toFixed(8)} SOL</div>}
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span className="tag" style={{ background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>{riskLabel}</span>
          {mintAuthority && <span className="tag" style={{ background: '#f8514922', color: 'var(--red)', border: '1px solid #f8514944' }}>MINT✗</span>}
          {freezeAuthority && <span className="tag" style={{ background: '#f8514922', color: 'var(--red)', border: '1px solid #f8514944' }}>FREEZE✗</span>}
        </div>
      </div>

      {/* Key stats */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <StatRow label="Liquidity" value={fU(pair?.liquidity?.usd)} valueColor={+(pair?.liquidity?.usd || 0) > 50000 ? 'var(--green)' : +(pair?.liquidity?.usd || 0) > 10000 ? 'var(--yellow)' : 'var(--red)'} />
        <StatRow label="Market Cap" value={fU(pair?.fdv)} />
        <StatRow label="Pair Age" value={fAge(pair?.pairCreatedAt)} />
        <StatRow label="DEX" value={(pair?.dexId || '').toUpperCase()} />
        {lpLockedPercent != null && (
          <StatRow label="LP Locked" value={`${lpLockedPercent}%`} valueColor={lpLocked > 90 ? 'var(--green)' : lpLocked > 50 ? 'var(--yellow)' : 'var(--red)'} />
        )}
      </div>

      {/* Price change grid */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.6px' }}>Price Change</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[['30m', 'm5'], ['1h', 'h1'], ['4h', 'h6'], ['24h', 'h24']].map(([label, key]) => (
            <ChangeCell
              key={key}
              label={label}
              pct={+(pair?.priceChange?.[key] || 0)}
              buys={+(pair?.txns?.[key]?.buys || 0)}
              sells={+(pair?.txns?.[key]?.sells || 0)}
            />
          ))}
        </div>
      </div>

      {/* 24h volume */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.6px' }}>24h Volume</div>
        {(() => {
          const buyPercent = bp(pair?.txns?.h24?.buys, pair?.txns?.h24?.sells);
          const totalVol = +(pair?.volume?.h24 || 0);
          const buyVol = totalVol * buyPercent / 100;
          const sellVol = totalVol * (1 - buyPercent / 100);
          return (
            <>
              <StatRow label="Total" value={fU(totalVol)} />
              <StatRow label="Buy Vol" value={fU(buyVol)} valueColor="var(--green)" />
              <StatRow label="Sell Vol" value={fU(sellVol)} valueColor="var(--red)" />
            </>
          );
        })()}
      </div>

      {/* 24h transactions */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.6px' }}>24h Transactions</div>
        {(() => {
          const buys = +(pair?.txns?.h24?.buys || 0);
          const sells = +(pair?.txns?.h24?.sells || 0);
          return (
            <>
              <StatRow label="Total" value={fNum(buys + sells)} />
              <StatRow label="Buys" value={fNum(buys)} valueColor="var(--green)" />
              <StatRow label="Sells" value={fNum(sells)} valueColor="var(--red)" />
              <StatRow label="Net" value={(buys >= sells ? '+' : '') + (buys - sells)} valueColor={buys >= sells ? 'var(--green)' : 'var(--red)'} />
            </>
          );
        })()}
      </div>

      {/* Token info */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.6px' }}>Token Info</div>
        <StatRow label="Top 10 Holders" value={`${top10HoldPercent.toFixed(1)}%`} valueColor={top10HoldPercent > 60 ? 'var(--red)' : top10HoldPercent > 40 ? 'var(--yellow)' : 'var(--green)'} />
        <StatRow label="Holders" value={rug ? fNum(holderCount) : '—'} />
        <StatRow label="Insiders" value={`${insiderPercent.toFixed(1)}%`} valueColor={insiderPercent > 20 ? 'var(--red)' : insiderPercent > 10 ? 'var(--yellow)' : 'var(--green)'} />
        <StatRow label="Snipers" value={rug ? `${snipCount} found` : '—'} valueColor={snipCount ? 'var(--yellow)' : 'var(--green)'} />
        <StatRow label="Bundles" value={rug ? `${bundleCount} found` : '—'} valueColor={bundleCount ? 'var(--yellow)' : 'var(--green)'} />
        <StatRow label="Markets" value={String(pair ? 1 : 0)} />
      </div>

      {/* Security */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.13)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.6px' }}>Security</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: riskColor, marginBottom: 6 }}>{riskLabel}</div>
        <StatRow label="Mint Auth" value={mintAuthority ? 'Yes ✗' : 'No ✓'} valueColor={mintAuthority ? 'var(--red)' : 'var(--green)'} />
        <StatRow label="Freeze Auth" value={freezeAuthority ? 'Yes ✗' : 'No ✓'} valueColor={freezeAuthority ? 'var(--red)' : 'var(--green)'} />
      </div>

      {/* Top holders mini list */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.6px' }}>Top Holders</div>
        {cleanHolders.slice(0, 10).map((holder, index) => {
          const percent = +holder.pct || 0;
          const isCreatorHolder = holder.address === creator;
          const color = holder.insider ? 'var(--red)' : isCreatorHolder ? 'var(--yellow)' : percent > 10 ? 'var(--yellow)' : 'var(--green)';
          const name = walletName(holder.address, snsNames);
          const copyKey = `lp-holder-${index}`;
          return (
            <div
              key={holder.address || index}
              onClick={() => onCopy(holder.address || '', copyKey)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0', borderBottom: '1px solid rgba(33,38,45,.07)', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 16 }}>#{index + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: name ? 700 : 400, color: name ? 'var(--text-link)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name || (holder.address ? holder.address.slice(0, 4) + '…' + holder.address.slice(-4) : '?')}
                </div>
                <div style={{ height: 3, borderRadius: 1, minWidth: 2, background: color, width: `${Math.min(100, (percent / maxHolderPercent) * 100)}%`, marginTop: 2 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{percent.toFixed(1)}%</span>
              {holder.insider && <span style={{ fontSize: 8, color: 'var(--red)' }}>IN</span>}
            </div>
          );
        })}
        {snsLoading && (
          <div style={{ padding: '6px 0', fontSize: 9, color: 'var(--text-muted)' }}>
            <span className="spin">⟳</span> Loading .sol names…
          </div>
        )}
      </div>
    </div>
  );
}