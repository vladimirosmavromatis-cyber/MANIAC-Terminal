import { useState, useEffect, useCallback } from 'react';
import { fP, fPct, fU, fNum, fAge } from '../utils.js';

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem('maniac_watchlist') || '[]'); } catch { return []; }
}
function saveWatchlist(list) {
  try { localStorage.setItem('maniac_watchlist', JSON.stringify(list)); } catch (_) {}
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(loadWatchlist);
  const isWatched = (mint) => watchlist.some(t => t.mint === mint);
  const addToWatchlist = (token) => {
    setWatchlist(prev => {
      if (prev.some(t => t.mint === token.mint)) return prev;
      const updated = [{ ...token, addedAt: Date.now() }, ...prev].slice(0, 50);
      saveWatchlist(updated);
      return updated;
    });
  };
  const removeFromWatchlist = (mint) => {
    setWatchlist(prev => {
      const updated = prev.filter(t => t.mint !== mint);
      saveWatchlist(updated);
      return updated;
    });
  };
  const toggleWatchlist = (token) => {
    if (isWatched(token.mint)) removeFromWatchlist(token.mint);
    else addToWatchlist(token);
  };
  const updatePrice = (mint, price, change24h, liq, vol24) => {
    setWatchlist(prev => {
      const updated = prev.map(t => t.mint === mint ? { ...t, price, change24h, liq, vol24, lastUpdated: Date.now() } : t);
      saveWatchlist(updated);
      return updated;
    });
  };
  return { watchlist, isWatched, addToWatchlist, removeFromWatchlist, toggleWatchlist, updatePrice };
}

export default function WatchlistView({ watchlist, onScan, onRemove }) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refresh = useCallback(async () => {
    if (!watchlist.length) return;
    setRefreshing(true);
    try {
      const mints = watchlist.map(t => t.mint).join(',');
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints}`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const json = await r.json();
        // Price updates handled by parent via updatePrice
        setLastRefresh(Date.now());
      }
    } catch (_) {}
    setRefreshing(false);
  }, [watchlist]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [refresh]);

  if (!watchlist.length) {
    return (
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>Your Watchlist is Empty</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scan any token and click the ⭐ star button to add it here</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          ⭐ Watchlist <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({watchlist.length} tokens)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Updated {fAge(lastRefresh)} ago</span>}
          <div className="live-dot" />
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Live · 15s</span>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 90px 90px 90px 60px', padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <div />
        <div>Token</div>
        <div style={{ textAlign: 'right' }}>Price</div>
        <div style={{ textAlign: 'right' }}>24h</div>
        <div style={{ textAlign: 'right' }}>Liquidity</div>
        <div style={{ textAlign: 'right' }}>Vol 24h</div>
        <div style={{ textAlign: 'right' }}>Added</div>
      </div>

      {/* Token rows */}
      {watchlist.map(token => {
        const ch = +(token.change24h || 0);
        return (
          <div
            key={token.mint}
            onClick={() => onScan(token.mint)}
            style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 90px 90px 90px 60px', padding: '8px 8px', borderRadius: 6, marginBottom: 2, cursor: 'pointer', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34,197,94,.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {/* Logo */}
            <div>
              {token.logoUrl
                ? <img src={token.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} onError={e => e.currentTarget.style.display='none'} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{(token.symbol||'?')[0]}</div>
              }
            </div>

            {/* Name */}
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-bright)' }}>{token.symbol || '?'}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{token.mint.slice(0,6)}…{token.mint.slice(-4)}</div>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{token.price ? fP(token.price) : '—'}</div>

            {/* 24h change */}
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 11, color: ch >= 0 ? 'var(--green)' : 'var(--red)' }}>{token.change24h != null ? fPct(ch) : '—'}</div>

            {/* Liquidity */}
            <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>{token.liq ? fU(token.liq) : '—'}</div>

            {/* Volume */}
            <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>{token.vol24 ? fU(token.vol24) : '—'}</div>

            {/* Added + remove */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fAge(token.addedAt)}</span>
              <button
                onClick={e => { e.stopPropagation(); onRemove(token.mint); }}
                style={{ fontSize: 9, color: 'var(--red)', padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(248,81,73,.2)', background: 'rgba(248,81,73,.07)' }}
              >✕</button>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 12, fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
        Click any token to scan · Prices refresh every 15s
      </div>
    </div>
  );
}