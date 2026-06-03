import { useState, useEffect, useCallback } from 'react';
import { fP, fU, fNum, fPct } from '../utils.js';

async function fetchWalletTokens(walletAddress) {
  try {
    const r = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${walletAddress}`,
      { signal: AbortSignal.timeout(10000) }
    );
    // Use Helius DAS getAssetsByOwner for actual token balances
    const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;
    if (!heliusKey) return [];
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed', commitment: 'confirmed' }
        ]
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    const accounts = json?.result?.value || [];
    const tokens = accounts
      .map(acc => {
        const info = acc.account?.data?.parsed?.info;
        if (!info) return null;
        const amount = +(info.tokenAmount?.uiAmount || 0);
        if (amount === 0) return null;
        return {
          mint: info.mint,
          amount,
          decimals: info.tokenAmount?.decimals || 0,
          symbol: '',
          name: '',
          logoUrl: '',
          price: 0,
          value: 0,
          change24h: 0,
        };
      })
      .filter(Boolean);
    return tokens;
  } catch (e) {
    console.warn('Portfolio fetch error:', e.message);
    return [];
  }
}

async function enrichWithPrices(tokens) {
  if (!tokens.length) return tokens;
  const mints = tokens.map(t => t.mint);
  const chunks = [];
  for (let i = 0; i < mints.length; i += 30) chunks.push(mints.slice(i, i + 30));

  const priceMap = {};
  for (const chunk of chunks) {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const json = await r.json();
      const best = {};
      (json.pairs || []).filter(p => p.chainId === 'solana').forEach(p => {
        const m = p.baseToken?.address;
        if (!m) return;
        if (!best[m] || +(p.volume?.h24||0) > +(best[m].volume?.h24||0)) best[m] = p;
      });
      Object.entries(best).forEach(([mint, pair]) => {
        priceMap[mint] = {
          price: +(pair.priceUsd || 0),
          symbol: pair.baseToken?.symbol || '',
          name: pair.baseToken?.name || '',
          logoUrl: pair.info?.imageUrl || '',
          change24h: +(pair.priceChange?.h24 || 0),
          liq: +(pair.liquidity?.usd || 0),
          vol24: +(pair.volume?.h24 || 0),
        };
      });
    } catch (_) {}
  }

  return tokens.map(t => {
    const info = priceMap[t.mint] || {};
    const price = info.price || 0;
    return {
      ...t,
      price,
      symbol: info.symbol || t.symbol || t.mint.slice(0,4),
      name: info.name || '',
      logoUrl: info.logoUrl || '',
      change24h: info.change24h || 0,
      liq: info.liq || 0,
      vol24: info.vol24 || 0,
      value: price * t.amount,
    };
  });
}

export default function PortfolioView({ walletAddress, walletConnected, onScan, onConnectWallet }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [sortBy, setSortBy] = useState('value');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError('');
    try {
      const raw = await fetchWalletTokens(walletAddress);
      if (!raw.length) { setTokens([]); setLoading(false); return; }
      const enriched = await enrichWithPrices(raw);
      setTokens(enriched.filter(t => t.value > 0.01 || t.amount > 0));
      setLastRefresh(Date.now());
    } catch (e) {
      setError('Could not load portfolio. Check wallet connection.');
    }
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (walletConnected && walletAddress) load();
  }, [walletConnected, walletAddress, load]);

  useEffect(() => {
    if (!walletConnected || !walletAddress) return;
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [walletConnected, walletAddress, load]);

  if (!walletConnected) {
    return (
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👛</div>
        <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>Connect your wallet to see your portfolio</div>
        <button className="scan-btn" onClick={onConnectWallet} style={{ fontSize: 12, padding: '8px 20px' }}>Connect Phantom</button>
      </div>
    );
  }

  const sorted = [...tokens].sort((a, b) => {
    if (sortBy === 'value') return b.value - a.value;
    if (sortBy === 'change') return b.change24h - a.change24h;
    if (sortBy === 'amount') return b.amount - a.amount;
    return 0;
  });

  const totalValue = tokens.reduce((s, t) => s + t.value, 0);
  const totalChange = tokens.reduce((s, t) => s + (t.value * t.change24h / 100), 0);

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          👛 Portfolio
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 10, marginLeft: 6 }}>
            {walletAddress?.slice(0, 4)}…{walletAddress?.slice(-4)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Updated just now</span>}
          <button onClick={load} style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 4 }}>
            {loading ? <span className="spin">⟳</span> : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Portfolio summary */}
      {totalValue > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            ['Total Value', fU(totalValue), 'var(--text-bright)'],
            ['24h Change', (totalChange >= 0 ? '+' : '') + fU(Math.abs(totalChange)), totalChange >= 0 ? 'var(--green)' : 'var(--red)'],
            ['Tokens', fNum(tokens.length), 'var(--text)'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color, marginBottom: 2 }}>{val}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && !tokens.length && (
        <div className="empty-state">
          <span className="spin" style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>⟳</span>
          Loading your tokens…
        </div>
      )}

      {error && <div className="empty-state" style={{ color: 'var(--red)' }}>⚠ {error}</div>}

      {!loading && !error && tokens.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 24, marginBottom: 8 }}>🤷</div>
          No tokens found in this wallet.
        </div>
      )}

      {tokens.length > 0 && (
        <>
          {/* Sort controls */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[['value','By Value'],['change','By 24h'],['amount','By Amount']].map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: `1px solid ${sortBy===key?'rgba(34,197,94,.4)':'var(--border)'}`, color: sortBy===key?'var(--green)':'var(--text-muted)', background: sortBy===key?'rgba(34,197,94,.07)':'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 80px 80px 80px', padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <div />
            <div>Token</div>
            <div style={{ textAlign: 'right' }}>Balance</div>
            <div style={{ textAlign: 'right' }}>Price</div>
            <div style={{ textAlign: 'right' }}>Value</div>
            <div style={{ textAlign: 'right' }}>24h</div>
          </div>

          {sorted.map(token => {
            const ch = +(token.change24h || 0);
            const pct = totalValue > 0 ? (token.value / totalValue) * 100 : 0;
            return (
              <div key={token.mint}
                onClick={() => onScan(token.mint)}
                style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 80px 80px 80px', padding: '7px 8px', borderRadius: 6, marginBottom: 2, cursor: 'pointer', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(34,197,94,.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
              >
                <div>
                  {token.logoUrl
                    ? <img src={token.logoUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} onError={e => e.currentTarget.style.display='none'} />
                    : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{(token.symbol||'?')[0]}</div>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 11 }}>{token.symbol || token.mint.slice(0,6)+'…'}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{pct.toFixed(1)}% of portfolio</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
                  {token.amount >= 1000000 ? (token.amount/1000000).toFixed(2)+'M' : token.amount >= 1000 ? (token.amount/1000).toFixed(1)+'K' : token.amount.toFixed(2)}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 10 }}>{token.price ? fP(token.price) : '—'}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 11 }}>{token.value > 0 ? fU(token.value) : '—'}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 11, color: ch >= 0 ? 'var(--green)' : 'var(--red)' }}>{fPct(ch)}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}