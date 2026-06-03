import { useState } from 'react';
import { fP, fPct, fU, fNum, fAge, bp, collectLPAddresses, isLPHolder } from '../utils.js';
import JupiterSwap from './JupiterSwap.jsx';
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
  isWatched, onToggleWatchlist, alerts, onAddAlert,
}) {
  const [showSwap, setShowSwap] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDir, setAlertDir] = useState('above');
  const [indicators, setIndicators] = useState({ bb: false, vwap: false, sma20: false, sma50: false, sma200: false, rsi: false, macd: false });
  const toggleInd = (key) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));

  // Average entry/exit from recent trades
  const buyTrades  = (trades || []).filter(t => t.type === 'buy'  && t.priceUsd > 0 && t.volumeUsd > 0);
  const sellTrades = (trades || []).filter(t => t.type === 'sell' && t.priceUsd > 0 && t.volumeUsd > 0);
  const avgEntry = buyTrades.length  ? buyTrades.reduce((s, t)  => s + t.priceUsd * t.volumeUsd, 0) / buyTrades.reduce((s, t)  => s + t.volumeUsd, 0) : 0;
  const avgExit  = sellTrades.length ? sellTrades.reduce((s, t) => s + t.priceUsd * t.volumeUsd, 0) / sellTrades.reduce((s, t) => s + t.volumeUsd, 0) : 0;

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

  // Build insider set from RugCheck insiderNetworks
  const insiderAddresses = new Set();
  let rugInsiderPct = 0;
  (rug?.insiderNetworks || []).forEach(net => {
    rugInsiderPct += +(net?.holdingPercent || net?.percentage || net?.pct || 0);
    (net?.wallets || net?.accounts || net?.addresses || []).forEach(w => {
      const a = typeof w === 'string' ? w : (w?.address || w?.owner || '');
      if (a) insiderAddresses.add(a);
    });
  });
  (rug?.topHolders || []).forEach(h => {
    if (h.insider === true) {
      if (h.owner)   insiderAddresses.add(h.owner);
      if (h.address) insiderAddresses.add(h.address);
    }
  });

  // Clean holders: remove LP vaults and pool programs
  const rawHolders = holders.length ? holders : (rug?.topHolders || []).map(h => ({
    address: h.owner || h.address,
    tokenAccount: h.address,
    pct: +(h.pct || 0),
    amount: +(h.amount || 0),
    insider: h.insider || insiderAddresses.has(h.owner || '') || insiderAddresses.has(h.address || ''),
    label: '',
  }));
  const taggedHolders = rawHolders.map(h => ({
    ...h,
    insider: h.insider || insiderAddresses.has(h.address) || insiderAddresses.has(h.tokenAccount),
  }));
  const cleanHolders = taggedHolders.filter(h => {
    if (isLPHolder(h, lpAddressSet)) return false;
    const tokenAccount = h.tokenAccount || '';
    const owner = h.address || '';
    if (tokenAccount.length > 20 && marketsJson.includes(tokenAccount)) return false;
    if (owner.length > 20 && marketsJson.includes(owner)) return false;
    return true;
  });

  const top10HoldPercent = cleanHolders.slice(0, 10).reduce((sum, h) => sum + (+h.pct || 0), 0);
  const computedInsiderPct = cleanHolders.filter(h => h.insider).reduce((sum, h) => sum + (+h.pct || 0), 0);
  const insiderPercent = rugInsiderPct > 0 ? rugInsiderPct : computedInsiderPct;
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
      {showSwap && <JupiterSwap mint={mint} symbol={pair.baseToken?.symbol} onClose={() => setShowSwap(false)} />}
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
                <button onClick={() => setShowSwap(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#22c55e', borderRadius: 5, fontSize: 11, fontWeight: 800, color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 0 10px rgba(34,197,94,.4)' }}>
                  🟢 BUY / SELL
                </button>
                <button
                  onClick={onToggleWatchlist}
                  title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                  style={{ fontSize: 16, padding: '2px 6px', borderRadius: 5, border: `1px solid ${isWatched ? 'rgba(227,179,65,.5)' : 'var(--border)'}`, background: isWatched ? 'rgba(227,179,65,.1)' : 'none', color: isWatched ? '#e3b341' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {isWatched ? '⭐' : '☆'}
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setAlertPrice(fP(+(pair.priceUsd||0)).replace('$','')); setShowAlertForm(v => !v); }}
                    title="Set price alert"
                    style={{ fontSize: 13, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >🔔</button>
                  {showAlertForm && (
                    <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 999, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,.6)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Set Price Alert</div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {['above','below'].map(d => (
                          <button key={d} onClick={() => setAlertDir(d)}
                            style={{ flex: 1, fontSize: 10, padding: '4px', borderRadius: 4, border: `1px solid ${alertDir===d?'rgba(34,197,94,.4)':'var(--border)'}`, color: alertDir===d?'var(--green)':'var(--text-muted)', background: alertDir===d?'rgba(34,197,94,.07)':'none', cursor: 'pointer', fontWeight: 700 }}>
                            {d === 'above' ? '▲ Above' : '▼ Below'}
                          </button>
                        ))}
                      </div>
                      <input
                        className="search-input"
                        placeholder="Target price (e.g. 0.00012)"
                        value={alertPrice}
                        onChange={e => setAlertPrice(e.target.value)}
                        style={{ fontSize: 10, padding: '5px 8px', marginBottom: 8, width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => {
                          const p = parseFloat(alertPrice);
                          if (!p || p <= 0) return;
                          onAddAlert({ price: p, direction: alertDir });
                          setShowAlertForm(false);
                          setAlertPrice('');
                        }} className="scan-btn" style={{ flex: 1, fontSize: 10, padding: '5px' }}>Set Alert</button>
                        <button onClick={() => setShowAlertForm(false)} style={{ fontSize: 10, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-muted)' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
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
          ...(avgEntry > 0 ? [['Avg Entry', fP(avgEntry), '#f9ca24']] : []),
          ...(avgExit  > 0 ? [['Avg Exit',  fP(avgExit),  '#ff7979']] : []),
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
            {[
              ['ema',   'EMA',  '#e3b341', showEma,          onToggleEma],
              ['bb',    'BB',   '#fd79a8', indicators.bb,    () => toggleInd('bb')],
              ['vwap',  'VWAP','#00cec9', indicators.vwap,  () => toggleInd('vwap')],
              ['sma20', 'S20', '#ff6b6b', indicators.sma20, () => toggleInd('sma20')],
              ['sma50', 'S50', '#ff9f43', indicators.sma50, () => toggleInd('sma50')],
              ['sma200','S200','#a29bfe', indicators.sma200,() => toggleInd('sma200')],
            ].map(([k, label, color, active, fn]) => (
              <button key={k} onClick={fn} style={{ fontSize: 10, fontWeight: 700, color: active ? color : 'var(--text-muted)', padding: '2px 6px', borderRadius: 3, border: active ? `1px solid ${color}55` : '1px solid transparent', background: active ? `${color}15` : 'none' }}>{label}</button>
            ))}
            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />
            {[['rsi','RSI','#9b59b6'],['macd','MACD','#0984e3']].map(([k, label, color]) => (
              <button key={k} onClick={() => toggleInd(k)} style={{ fontSize: 10, fontWeight: 700, color: indicators[k] ? color : 'var(--text-muted)', padding: '2px 6px', borderRadius: 3, border: indicators[k] ? `1px solid ${color}55` : '1px solid transparent', background: indicators[k] ? `${color}15` : 'none' }}>{label}</button>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {chartLoading ? <><span className="spin">⟳</span> Loading…</> : <><div className="live-dot" /><span style={{ color: 'var(--red)' }}>SL</span><span style={{ color: 'var(--yellow)' }}>BUY</span><span style={{ color: 'var(--green)' }}>T1</span><span style={{ color: 'var(--cyan)' }}>T2</span>{avgEntry > 0 && <span style={{ color: '#f9ca24' }}>IN</span>}{avgExit > 0 && <span style={{ color: '#ff7979' }}>OUT</span>}</>}
            </div>
          </div>

          {/* Chart */}
          <div style={{ display: 'flex', minHeight: 320, overflow: 'hidden', flex: '0 0 auto' }}>
            <LWChart
              ohlcv={ohlcv}
              showEma={showEma}
              priceUsd={+(pair.priceUsd || 0)}
              loading={chartLoading}
              indicators={indicators}
              avgEntry={avgEntry}
              avgExit={avgExit}
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