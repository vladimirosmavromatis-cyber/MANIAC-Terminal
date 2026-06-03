import { fP, fU, fN, fNum, fAgeMs, fAddr, bp } from '../../utils.js';

export default function TradesTab({ trades, tradesLoading, pair, cleanHolders, holderCount, snipCount, bundleCount, top10HoldPercent, insiderPercent, devPercent, copiedKey, onCopy }) {
  const buyPressure1h = bp(pair?.txns?.h1?.buys, pair?.txns?.h1?.sells);

  return (
    <>
      {/* Live indicator */}
      <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
        <span className="live-dot" />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>LIVE · updates every 10s</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{trades.length} recent trades</span>
      </div>

      {/* Buy pressure bar */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: buyPressure1h * 1.2, height: 6, background: 'var(--green)', borderRadius: '2px 0 0 2px', minWidth: 2, maxWidth: 120, transition: 'width .3s' }} />
          <div style={{ width: (100 - buyPressure1h) * 1.2, height: 6, background: 'var(--red)', borderRadius: '0 2px 2px 0', minWidth: 2, maxWidth: 120 }} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--green)' }}>{buyPressure1h}% buy</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>1h pressure</span>
      </div>

      {!trades.length && tradesLoading && (
        <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          Loading trades…
        </div>
      )}
      {!trades.length && !tradesLoading ? (
        <>
          <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            No trades yet — will refresh automatically.
          </div>
          {/* Summary stats grid when no trades */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 16 }}>
            {[
              [fU(pair?.volume?.m5), 'Vol 5m', 'var(--text)'],
              [fU(pair?.volume?.h1), 'Vol 1h', 'var(--text)'],
              [fU(pair?.volume?.h24), 'Vol 24h', 'var(--text)'],
              [fNum((+pair?.txns?.m5?.buys || 0) + (+pair?.txns?.m5?.sells || 0)), 'Txns 5m', 'var(--text)'],
              [fNum((+pair?.txns?.h1?.buys || 0) + (+pair?.txns?.h1?.sells || 0)), 'Txns 1h', 'var(--text)'],
              [fNum((+pair?.txns?.h24?.buys || 0) + (+pair?.txns?.h24?.sells || 0)), 'Txns 24h', 'var(--text)'],
              [top10HoldPercent.toFixed(1) + '%', 'Top 10 Holders (excl LP)', top10HoldPercent > 60 ? 'var(--red)' : top10HoldPercent > 40 ? 'var(--yellow)' : 'var(--green)'],
              [holderCount ? fNum(holderCount) : '—', 'Total Holders', 'var(--text)'],
              [snipCount + ' found', 'Snipers', snipCount ? 'var(--yellow)' : 'var(--green)'],
              [bundleCount + ' found', 'Bundles', bundleCount ? 'var(--yellow)' : 'var(--green)'],
              [devPercent.toFixed(2) + '%', 'Dev Holds', devPercent > 5 ? 'var(--yellow)' : 'var(--green)'],
              [insiderPercent.toFixed(1) + '%', 'Insiders', insiderPercent > 20 ? 'var(--red)' : insiderPercent > 10 ? 'var(--yellow)' : 'var(--green)'],
            ].map(([value, label, color]) => (
              <div key={label} style={{ background: 'rgba(22,27,34,.53)', border: '1px solid rgba(33,38,45,.27)', borderRadius: 5, padding: '8px 10px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2, color }}>{value}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
              </div>
            ))}
          </div>
        </>
      ) : trades.length > 0 ? (
        <>
          {/* Trades table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 55px 1fr 90px 90px 80px 36px',
            padding: '6px 12px',
            fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '.5px', fontWeight: 700,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            <div>TYPE</div><div>AGE</div><div>WALLET</div>
            <div style={{ textAlign: 'right' }}>VALUE</div>
            <div style={{ textAlign: 'right' }}>PRICE</div>
            <div style={{ textAlign: 'right' }}>AMOUNT</div>
            <div />
          </div>
          {trades.slice(0, 100).map((trade, index) => {
            const isBuy = trade.type === 'buy';
            const copyKey = `trade-${index}`;
            return (
              <div key={index} style={{
                display: 'grid',
                gridTemplateColumns: '60px 55px 1fr 90px 90px 80px 36px',
                padding: '5px 12px',
                borderBottom: '1px solid rgba(33,38,45,.08)',
                fontSize: 11,
                alignItems: 'center',
                borderLeft: `2px solid ${isBuy ? '#22c55e44' : '#f8514944'}`,
              }}>
                <div style={{ color: isBuy ? 'var(--green)' : 'var(--red)', fontWeight: 800, fontSize: 11 }}>
                  {isBuy ? 'BUY' : 'SELL'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{fAgeMs(trade.timestamp)}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a
                    href={`https://solscan.io/account/${trade.wallet}`}
                    target="_blank"
                    rel="noreferrer"
                    title={trade.wallet}
                    style={{ color: 'var(--text-link)', fontFamily: 'monospace', fontSize: 11, textDecoration: 'none', padding: '2px 6px'