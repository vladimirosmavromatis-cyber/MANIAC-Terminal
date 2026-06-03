import { fAddr } from '../utils.js';
import Logo from './Logo.jsx';
import maniacLogo from '../assets/maniac-logo.png';
import maniacTerminal from '../assets/maniac-terminal.png';

const MODES = [
  { key: 'feed',      label: '📡 Radar' },
  { key: 'scanner',   label: '🔍 Scanner' },
  { key: 'trending',  label: '🔥 Trending' },
  { key: 'smart',     label: '🐋 Smart Money' },
  { key: 'signals',   label: '🎯 Signals' },
  { key: 'analytics', label: '📊 Analytics' },
  { key: 'watchlist', label: '⭐ Watchlist' },
  { key: 'portfolio', label: '👛 Portfolio' },
  { key: 'alerts',    label: '🔔 Alerts' },
  { key: 'tracker',   label: '🕵️ Tracker' },
];

export default function Nav({
  mode, scanMint, recentScans, walletAddress, walletConnected,
  alertCount, watchlistCount,
  onSetMode, onSelectRecent, onConnectWallet, onDisconnectWallet, onScan,
}) {
  return (
    <div className="nav-root" style={{
      background: 'var(--bg-secondary)',
      borderBottom: '2px solid var(--border)',
      padding: '4px 8px',
      minHeight: 82,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      position: 'sticky',
      top: 28,
      zIndex: 200,
    }}>
      {/* Left: mode tabs + recent scans */}
      <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 4, overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
        {MODES.map(m => (
          <button
            key={m.key}
            className={`nav-tab ${mode === m.key ? 'active' : ''}`}
            onClick={() => onSetMode(m.key)}
            style={{ flexShrink: 0, position: 'relative' }}
          >
            {m.label}
            {m.key === 'alerts' && alertCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 8, fontWeight: 900, background: 'var(--red)', color: '#fff', borderRadius: 8, padding: '0 4px', minWidth: 14, textAlign: 'center', lineHeight: '14px' }}>{alertCount}</span>
            )}
            {m.key === 'watchlist' && watchlistCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 8, fontWeight: 900, background: '#e3b341', color: '#000', borderRadius: 8, padding: '0 4px', minWidth: 14, textAlign: 'center', lineHeight: '14px' }}>{watchlistCount}</span>
            )}
          </button>
        ))}
        {mode === 'scan' && (
          <>
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />
            <button
              className="nav-tab"
              onClick={() => onSetMode('feed')}
              style={{ flexShrink: 0, color: 'var(--text-muted)' }}
            >
              ← Back
            </button>
          </>
        )}
        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 0, scrollbarWidth: 'none' }}>
          {recentScans.map(scan => (
            <button
              key={scan.mint}
              className={`nav-tab ${scanMint === scan.mint && mode === 'scan' ? 'active' : ''}`}
              onClick={() => onSelectRecent(scan.mint)}
              title={scan.mint}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {scan.logoUrl ? (
                <img
                  src={scan.logoUrl}
                  alt=""
                  style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <span style={{ fontSize: 10 }}>●</span>
              )}
              <span>{scan.symbol || scan.mint.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Logo */}
      <div className="nav-logo"
        onClick={() => onSetMode('feed')}
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 20px' }}
      >
        <img
          src={maniacTerminal}
          alt="MANIAC TERMINAL"
          style={{
            height: 120,
            objectFit: 'contain',
            mixBlendMode: 'screen',
            filter: 'drop-shadow(0 0 10px rgba(0,255,180,.5))',
          }}
        />
      </div>

      {/* Right: Scan bar + Wallet */}
      <div className="nav-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingRight: 12 }}>
        <input
          className="search-input"
          type="text"
          placeholder="Paste mint address…"
          style={{ width: 220, fontSize: 10, padding: '4px 8px' }}
          onKeyDown={e => { if (e.key === 'Enter') onScan(e.target.value); }}
        />
        <button
          className="scan-btn"
          style={{ padding: '4px 12px', fontSize: 10, flexShrink: 0 }}
          onClick={e => {
            const input = e.currentTarget.previousSibling;
            onScan(input.value);
          }}
        >
          ⚡ Scan
        </button>
        {walletConnected && walletAddress ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'monospace' }}>
              {fAddr(walletAddress)}
            </span>
            <button className="wallet-btn" style={{ flexShrink: 0 }} onClick={onConnectWallet}>
              ◉ Connected
            </button>
            <button
              onClick={onDisconnectWallet}
              style={{ fontSize: 10, fontWeight: 700, padding: '5px 8px', borderRadius: 5, border: '1px solid rgba(248,81,73,.4)', color: 'var(--red)', background: 'rgba(248,81,73,.07)', cursor: 'pointer', flexShrink: 0 }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button className="wallet-btn" style={{ flexShrink: 0 }} onClick={onConnectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}