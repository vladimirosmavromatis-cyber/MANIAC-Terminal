import { fP, fPct, fU, fNum, fAge, bp, collectLPAddresses, isLPHolder } from '../utils.js';
import LeftPanel from './LeftPanel.jsx';
import RightPanel from './RightPanel.jsx';
import LWChart from './LWChart.jsx';
import TradesTab from './tabs/TradesTab.jsx';
import SecurityTab from './tabs/SecurityTab.jsx';
import HoldersTab from './tabs/HoldersTab.jsx';
import MarketsTab from './tabs/MarketsTab.jsx';
import TechnicalsTab from './tabs/TechnicalsTab.jsx';
import DCATab from './tabs/DCATab.jsx';

function TokenLogo({ pair, size = 44 }) {
  const url = pair?.info?.imageUrl || pair?.baseToken?.imageUrl || '';
  if (!url) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size / 2.5, flexShrink: 0, color: 'var(--text-muted)' }}>
        {(pair?.baseToken?.symbol || '?')[0]}
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => (e.currentTarget.style.display = 'none')} />;
}

// Derive risk level from rug risks array
function getRiskLevel(rug) {
  if (!rug) return 'unknown';
  const dangers = (rug.risks || []).filter(r => r.level === 'danger').length;
  const warnings = (rug.risks || []).filter(r => r.level === 'warn').length;
  if (dangers > 0) return 'danger';
  if (warnings > 0) return 'warning';
  return 'safe';
}

const RISK_COLOR = { safe: '#22c55e', warning: '#e3b341', danger: '#f85149', unknown: '#484f58' };
const RISK_LABEL = { safe: '✓ SAFE', warning: '⚠ WARN', danger: '✗ DANGER', unknown: '?' };

// Parse sniper/bundle counts from rug data (can be number, array, or string)
function parseCount(value) {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') { const match = value.match(/\d+/); return match ? +match[0] : 1; }
  return 0;
}

export default function ScannerView({
  scanBusy, scanErr, dex, rug, mint,
  tab, onSetTab,
  trades, tradesLoading,
  ohlcv, chartLoading, chartTf, showEma,
  onSetChartTf, onToggleEma,
  holders, holderCount,
  snsNames, snsLoading,
  dcaAmt, dcaFreq, dcaPeriods,
  onSetDcaAmt, onSetDcaFreq, onSetDcaPeriods,
  copiedKey, onCopy,
}) {
  if (scanBusy) {
    return (
      <div className="empty-state">
        <div className="spin" style={{ fontSize: 24, marginBottom: 10 }}>⟳</div>
        <div>Scanning…</div>
      </div>
    );
  }
  if (scanErr) {
    return <div className="empty-state" style={{ color: 'var(--red)' }}>⚠ {scanErr}</div>;
  }
  if (!dex?.pair) return null;

  const pair = dex.pair;
  const change24h = +(pair.priceChange?.h24 || 0);
  const riskLevel = getRiskLevel(rug);
  const riskColor = RISK_COLOR[riskLevel];
  const riskLabel = RISK_LABEL[riskLevel];
  const mintAuthority = rug?.token?.mintAuthority;
  const freezeAuthority = rug?.token?.freezeAuthority;
  const lpLocked = +(rug?.markets?.[0]?.lp?.lpLockedPct || 0);
  const lpLockedDisplay = rug?.markets?.length ? lpLocked.toFixed(1) : null;
  const creator = rug?.creator;

  // Build LP address set for filtering
  const lpAddressSet = collectLPAddresses(rug, mint);
  ;(dex?.allPairAddresses || []).forEach(addr => { if (addr) lpAddressSet.add(addr); });
  const marketsJson = JSON.stringify(rug?.markets || []);

  // Clean holders: remove LP vaults and pool programs
  const rawHolders = holders.length ? holders : (rug?.topHolders || []).map(h => ({
    address: h.owner || h.address,
    tokenAccount: h.address,
    pct: +(h.pct || 0),
    amount: +(h.amount || 0),
    insider: h.insider || false,
    label: '',
  }));
  const cleanHolders = rawHolders.filter(h => {
    if (isLPHolder(h, lpAddressSet)) return false;
    const tokenAccount = h.tokenAccount || '';
    const owner = h.address || '';
    if (tokenAccount.length > 20 && marketsJson.includes(tokenAccount)) return false;
    if (owner.length > 20 && marketsJson.includes(owner)) return false;
    return true;
  });

  const top10HoldPercent = cleanHolders.slice(0, 10).reduce((sum, h) => sum + (+h.pct || 0), 0);
  const insiderPercent = cleanHolders.filter(h => h.insider).reduce((sum, h) => sum + (+h.pct || 0), 0);
  const devHolder = creator ? cleanHolders.find(h => h.address === creator) : null;
  const devPercent = devHolder ? (+devHolder.pct || 0) : 0;

  const sniperCount = rug?.snipers != null
    ? parseCount(rug.snipers)
    : parseCount((rug?.risks || []).find(r => /snip/i.test(r.name || ''))?.value || 0);
  const bundleCount = rug?.bundles != null
    ? parseCount(rug.bundles)
    : parseCount((rug?.risks || []).find(r => /bundle/i.test(r.name || ''))?.value || 0);

  const socials = pair.info?.socials || [];
  const websites = pair.info?.websites || [];
  const twitter = socials.find(s => s.type === 'twitter');
  const telegram = socials.find(s => s.type === 'telegram');
  const website = websites[0];

  const TABS = [
    ['trades', 'TRADES'],
    ['security', 'SECURITY'],
    ['holders', 'HOLDERS'],
    ['markets', 'MARKETS'],
    ['technicals', 'TECHNICALS'],
    ['dca', 'DCA'],
  ];

  return (
    <>
      {/* Token header */}
      <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <TokenLogo pair={pair} size={44} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-bright)' }}>{pair.baseToken?.symbol || ''}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/{pair.quoteToken?.symbol || 'SOL'}</span>
                <span className="tag" style={{ background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>{riskLabel}</span>
                {mintAuthority && <span className="tag" style={{ background: '#f8514922', color: 'var(--red)', border: '1px solid #f8514944' }}>MINT✗</span>}
                {freezeAuthority && <span className="tag" style={{ background: '#f8514922', color: 'var(--red)', border: '1px solid #f8514944' }}>FREEZE✗</span>}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <span>{pair.baseToken?.name || ''}</span>
                <span>·</span>
                <span>{fAge(pair.pairCreatedAt)} old</span>
                <span>·</span>
                <span>{(pair.dexId || '').toUpperCase()}</span>
                {lpLockedDisplay && (
                  <>
                    <span>·</span>
                    <span style={{ color: lpLocked > 90 ? 'var(--green)' : lpLocked > 50 ? 'var(--yellow)' : 'var(--red)' }}>
                      LP {lpLockedDisplay}% locked
                    </span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {twitter && (
                  <a href={twitter.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'var(--border)', borderRadius: 4, fontSize: 10, color: 'var(--text-link)', border: '1px solid var(--border)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--text-link)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.843L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    Twitter
                  </a>
                )}
                {telegram && (
                  <a href={telegram.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'var(--border)', borderRadius: 4, fontSize: 10, color: 'var(--text-link)', border: '1px solid var(--border)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--text-link)"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.4 4.297 13.48c-.657-.204-.668-.657.136-.975l10.87-4.19c.548-.198 1.027.135.259.933z" /></svg>
                    Telegram
                  </a>
                )}
                {website && (
                  <a href={website.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'var(--border)', borderRadius: 4, fontSize: 10, color: 'var(--text-link)', border: '1px solid var(--border)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-link)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    Website
                  </a>
                )}
                <a href={`https://dexscreener.com/solana/${mint}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'var(--border)', borderRadius: 4, fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  DS ↗
                </a>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--text-bright)' }}>{fP(pair.priceUsd)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: change24h >= 0 ? 'var(--green)' : 'var(--red)' }}>{fPct(change24h)} (24h)</div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          ['MCap', fU(pair.fdv), null],
          ['Liquidity', fU(pair.liquidity?.usd), +(pair.liquidity?.usd || 0) > 50000 ? 'var(--green)' : +(pair.liquidity?.usd || 0) > 10000 ? 'var(--yellow)' : 'var(--red)'],
          ['Vol 24h', fU(pair.volume?.h24), null],
          ['Txns 24h', fNum((+pair.txns?.h24?.buys || 0) + (+pair.txns?.h24?.sells || 0)), null],
          ['5m', fPct(pair.priceChange?.m5), +(pair.priceChange?.m5 || 0) >= 0 ? 'var(--green)' : 'var(--red)'],
          ['1h', fPct(pair.priceChange?.h1), +(pair.priceChange?.h1 || 0) >= 0 ? 'var(--green)' : 'var(--red)'],
          ['6h', fPct(pair.priceChange?.h6), +(pair.priceChange?.h6 || 0) >= 0 ? 'var(--green)' : 'var(--red)'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding: '6px 12px', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Three-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 210px', minHeight: 600 }}>
        <LeftPanel
          pair={pair}
          rug={rug}
          riskLabel={riskLabel}
          riskColor={riskColor}
          mintAuthority={mintAuthority}
          freezeAuthority={freezeAuthority}
          lpLockedPercent={lpLockedDisplay}
          cleanHolders={cleanHolders}
          holderCount={holderCount}
          snipCount={sniperCount}
          bundleCount={bundleCount}
          top10HoldPercent={top10HoldPercent}
          insiderPercent={insiderPercent}
          creator={creator}
          snsNames={snsNames}
          snsLoading={snsLoading}
          copiedKey={copiedKey}
          onCopy={onCopy}
        />

        {/* Center: chart + tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chart toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {['1m', '5m', '15m', '1h', '4h', 'D'].map(tf => (
              <button
                key={tf}
                onClick={() => onSetChartTf(tf)}
                style={{ fontSize: 10, fontWeight: 600, color: chartTf === tf ? 'var(--text)' : 'var(--text-muted)', padding: '2px 6px', borderRadius: 3, border: chartTf === tf ? '1px solid var(--border)' : '1px solid transparent', background: chartTf === tf ? 'var(--bg-tertiary)' : 'none' }}
              >
                {tf}
              </button>
            ))}
            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />
            <button
              onClick={onToggleEma}
              style={{ fontSize: 10, fontWeight: 600, color: showEma ? 'var(--text)' : 'var(--text-muted)', padding: '2px 6px', borderRadius: 3, border: showEma ? '1px solid var(--border)' : '1px solid transparent', background: showEma ? 'var(--bg-tertiary)' : 'none' }}
            >
              EMA
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {chartLoading
                ? <><span className="spin">⟳</span> Loading…</>
                : <><div className="live-dot" /><span style={{ color: 'var(--red)' }}>— SL</span><span style={{ color: 'var(--yellow)' }}>-- BUY</span><span style={{ color: 'var(--green)' }}>-- T1</span><span style={{ color: 'var(--cyan)' }}>-- T2</span></>
              }
            </div>
          </div>

          {/* Chart */}
          <div style={{ display: 'flex', height: 420, overflow: 'hidden' }}>
            {/* Zoom controls */}
            <div style={{ width: 32, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', gap: 2, flexShrink: 0 }}>
              {[['✛', 'Crosshair'], ['+', 'Zoom In'], ['-', 'Zoom Out'], ['⊡', 'Fit All']].map(([icon, title]) => (
                <button key={title} title={title} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, color: 'var(--text-muted)', fontSize: title === 'Crosshair' ? 12 : 14 }}>
                  {icon}
                </button>
              ))}
            </div>
            <LWChart
              ohlcv={ohlcv}
              showEma={showEma}
              priceUsd={+(pair.priceUsd || 0)}
              loading={chartLoading}
            />
          </div>

          {/* Tabs bar */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(([key, label]) => (
              <button
                key={key}
                className={`tab-btn ${tab === key ? 'active' : ''}`}
                onClick={() => onSetTab(key)}
              >
                {label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px' }}>
              <div className="live-dot" />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>LIVE · 10s</span>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ overflowY: 'auto', background: 'var(--bg)', scrollbarWidth: 'thin', minHeight: 300, flex: 1 }}>
            {tab === 'trades' && (
              <TradesTab
                trades={trades}
                tradesLoading={tradesLoading}
                pair={pair}
                cleanHolders={cleanHolders}
                holderCount={holderCount}
                snipCount={sniperCount}
                bundleCount={bundleCount}
                top10HoldPercent={top10HoldPercent}
                insiderPercent={insiderPercent}
                devPercent={devPercent}
                copiedKey={copiedKey}
                onCopy={onCopy}
              />
            )}
            {tab === 'security' && (
              <SecurityTab
                rug={rug}
                riskLabel={riskLabel}
                riskColor={riskColor}
                top10HoldPercent={top10HoldPercent}
                holderCount={holderCount}
                snipCount={sniperCount}
                bundleCount={bundleCount}
                insiderPercent={insiderPercent}
                mintAuthority={mintAuthority}
                freezeAuthority={freezeAuthority}
              />
            )}
            {tab === 'holders' && (
              <HoldersTab
                cleanHolders={cleanHolders}
                holderCount={holderCount}
                lpAddressSet={lpAddressSet}
                snsNames={snsNames}
                snsLoading={snsLoading}
                pair={pair}
                creator={creator}
                copiedKey={copiedKey}
                onCopy={onCopy}
              />
            )}
            {tab === 'markets' && (
              <MarketsTab allPairs={dex?.all || []} mint={mint} />
            )}
            {tab === 'technicals' && (
              <TechnicalsTab pair={pair} />
            )}
            {tab === 'dca' && (
              <DCATab
                pair={pair}
                mint={mint}
                dcaAmt={dcaAmt}
                dcaFreq={dcaFreq}
                dcaPeriods={dcaPeriods}
                onChangeAmt={onSetDcaAmt}
                onChangeFreq={onSetDcaFreq}
                onChangePeriods={onSetDcaPeriods}
              />
            )}
          </div>
        </div>

        <RightPanel
          mint={mint}
          pair={pair}
          riskLabel={riskLabel}
          riskColor={riskColor}
          mintAuthority={mintAuthority}
          freezeAuthority={freezeAuthority}
          top10HoldPercent={top10HoldPercent}
          holderCount={holderCount}
          snipCount={sniperCount}
          bundleCount={bundleCount}
          insiderPercent={insiderPercent}
          devPercent={devPercent}
          cleanHolders={cleanHolders}
          snsNames={snsNames}
          creator={creator}
          copiedKey={copiedKey}
          onCopy={onCopy}
          priceUsd={+(pair.priceUsd || 0)}
        />
      </div>
    </>
  );
}