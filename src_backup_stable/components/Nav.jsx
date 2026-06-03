import { fAddr } from '../utils.js';
import Logo from './Logo.jsx';

const MODES = [
  { key: 'feed',      label: '📡 Radar' },
  { key: 'scanner',   label: '🔍 Scanner' },
  { key: 'trending',  label: '🔥 Trending' },
  { key: 'smart',     label: '🐋 Smart Money' },
  { key: 'signals',   label: '🎯 Signals' },
  { key: 'analytics', label: '📊 Analytics' },
];

export default function Nav({
  mode, scanMint, recentScans, walletAddress, walletConnected,
  onSetMode, onSelectRecent, onConnectWallet,
}) {
  return (
    <div style={{
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 4, overflow: 'hidden', flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button
            key={m.key}
            className={`nav-tab ${mode === m.key ? 'active' : ''}`}
            onClick={() => onSetMode(m.key)}
            style={{ flexShrink: 0 }}
          >
            {m.label}
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

      {/* Center: Logo — unchanged */}
      <div
        onClick={() => onSetMode('feed')}
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 20px' }}
      >
        <Logo size={56} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--green)', letterSpacing: '-.4px', textShadow: '0 0 12px rgba(34,197,94,.27)' }}>
            Check Your Bag
          </div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '1.5px' }}>SOL SCANNER</div>
        </div>
      </div>

      {/* Right: Wallet — unchanged */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingRight: 12 }}>
        {walletConnected && walletAddress && (
          <span style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'monospace' }}>
            {fAddr(walletAddress)}
          </span>
        )}
        <button className="wallet-btn" onClick={onConnectWallet}>
          {walletConnected ? '◉ Solana' : 'Connect Wallet'}
        </button>
      </div>
    </div>
  );
}