import { useState, useEffect, useCallback, useRef } from 'react';
import { fP, fU, fAddr, fAgeMs } from '../utils.js';

async function fetchWalletTrades(walletAddress) {
  try {
    // Use GeckoTerminal / DexScreener to find recent trades by this wallet
    // We search for the wallet's recent activity via Solscan-compatible approach
    const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;
    if (!heliusKey) return [];

    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getSignaturesForAddress',
        params: [walletAddress, { limit: 20, commitment: 'confirmed' }]
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    return json?.result || [];
  } catch (e) {
    return [];
  }
}

async function fetchWalletTokenChanges(walletAddress) {
  try {
    const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;
    if (!heliusKey) return { trades: [], tokens: [] };

    // Get parsed transaction history using Helius enhanced API
    const res = await fetch(
      `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${heliusKey}&limit=20&type=SWAP`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return { trades: [], tokens: [] };
    const txs = await res.json();

    const trades = (txs || []).map(tx => {
      const swap = tx.events?.swap || {};
      const nativeIn = tx.events?.swap?.nativeInput;
      const nativeOut = tx.events?.swap?.nativeOutput;
      const tokenIn = swap.tokenInputs?.[0];
      const tokenOut = swap.tokenOutputs?.[0];

      return {
        txHash: tx.signature,
        timestamp: (tx.timestamp || 0) * 1000,
        type: tokenOut ? 'buy' : 'sell',
        tokenMint: tokenOut?.mint || tokenIn?.mint || '',
        tokenSymbol: tokenOut?.symbol || tokenIn?.symbol || '?',
        amountUsd: +(tx.events?.swap?.nativeInput?.amount || 0) / 1e9 * 150, // rough SOL price
        source: tx.source || 'UNKNOWN',
      };
    }).filter(t => t.tokenMint);

    // Get current token holdings
    const holdRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [walletAddress, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
      }),
      signal: AbortSignal.timeout(15000),
    });
    const holdJson = await holdRes.json();
    const tokens = (holdJson?.result?.value || [])
      .map(acc => {
        const info = acc.account?.data?.parsed?.info;
        if (!info) return null;
        const amount = +(info.tokenAmount?.uiAmount || 0);
        if (amount === 0) return null;
        return { mint: info.mint, amount };
      })
      .filter(Boolean);

    return { trades, tokens };
  } catch (e) {
    console.warn('Wallet tracker error:', e.message);
    return { trades: [], tokens: [] };
  }
}

function loadTrackedWallets() {
  try { return JSON.parse(localStorage.getItem('maniac_tracked_wallets') || '[]'); } catch { return []; }
}
function saveTrackedWallets(list) {
  try { localStorage.setItem('maniac_tracked_wallets', JSON.stringify(list)); } catch (_) {}
}

export default function WalletTrackerView({ onScan }) {
  const [trackedWallets, setTrackedWallets] = useState(loadTrackedWallets);
  const [input, setInput] = useState('');
  const [label, setLabel] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refreshRef = useRef(null);

  const addWallet = () => {
    const addr = input.trim();
    if (addr.length < 32 || addr.length > 44) { setError('Invalid Solana address'); return; }
    if (trackedWallets.some(w => w.address === addr)) { setError('Already tracking this wallet'); return; }
    const updated = [{ address: addr, label: label.trim() || fAddr(addr), addedAt: Date.now(), tradeCount: 0 }, ...trackedWallets].slice(0, 20);
    setTrackedWallets(updated);
    saveTrackedWallets(updated);
    setInput('');
    setLabel('');
    setError('');
    selectWallet(addr);
  };

  const removeWallet = (addr) => {
    const updated = trackedWallets.filter(w => w.address !== addr);
    setTrackedWallets(updated);
    saveTrackedWallets(updated);
    if (selectedWallet === addr) setSelectedWallet(null);
  };

  const selectWallet = useCallback(async (addr) => {
    setSelectedWallet(addr);
    setLoading(true);
    setError('');
    setTrades([]);
    setTokens([]);
    clearInterval(refreshRef.current);
    try {
      const { trades: t, tokens: tok } = await fetchWalletTokenChanges(addr);
      setTrades(t);
      setTokens(tok);
    } catch (_) {
      setError('Could not load wallet data.');
    }
    setLoading(false);
    refreshRef.current = setInterval(async () => {
      try {
        const { trades: t, tokens: tok } = await fetchWalletTokenChanges(addr);
        setTrades(t);
        setTokens(tok);
      } catch (_) {}
    }, 15000);
  }, []);

  useEffect(() => () => clearInterval(refreshRef.current), []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 160px)', overflow: 'hidden' }}>

      {/* Left: wallet list */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🕵️ Wallet Tracker</div>
          <input
            className="search-input"
            placeholder="Paste wallet address…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWallet()}
            style={{ fontSize: 10, padding: '5px 8px', marginBottom: 4 }}
          />
          <input
            className="search-input"
            placeholder="Label (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWallet()}
            style={{ fontSize: 10, padding: '5px 8px', marginBottom: 4 }}
          />
          {error && <div style={{ fontSize: 9, color: 'var(--red)', marginBottom: 4 }}>{error}</div>}
          <button onClick={addWallet} className="scan-btn" style={{ width: '100%', fontSize: 10, padding: '5px' }}>+ Track Wallet</button>
        </div>

        {!trackedWallets.length && (
          <div style={{ padding: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
            Add wallet addresses to track their trades in real time
          </div>
        )}

        {trackedWallets.map(wallet => (
          <div key={wallet.address}
            onClick={() => selectWallet(wallet.address)}
            style={{ padding: '8px 10px', borderBottom: '1px solid rgba(33,38,45,.3)', cursor: 'pointer', background: selectedWallet === wallet.address ? 'rgba(34,197,94,.07)' : 'transparent', borderLeft: selectedWallet === wallet.address ? '2px solid var(--green)' : '2px solid transparent' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: selectedWallet === wallet.address ? 'var(--green)' : 'var(--text)' }}>{wallet.label}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 1 }}>{wallet.address.slice(0,6)}…{wallet.address.slice(-4)}</div>
              </div>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <a href={`https://solscan.io/account/${wallet.address}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 9, color: 'var(--text-link)' }}>↗</a>
                <button onClick={e => { e.stopPropagation(); removeWallet(wallet.address); }} style={{ fontSize: 9, color: 'var(--red)' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: trades + holdings */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedWallet && (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>Select a wallet to track</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Add wallet addresses on the left to monitor their activity</div>
          </div>
        )}

        {selectedWallet && loading && (
          <div className="empty-state">
            <span className="spin" style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>⟳</span>
            Loading wallet activity…
          </div>
        )}

        {selectedWallet && !loading && (
          <div style={{ padding: 12 }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 9, color: 'var(--text-muted)' }}>
              <div className="live-dot" />
              LIVE · updates every 15s
              <a href={`https://solscan.io/account/${selectedWallet}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--text-link)', fontSize: 10 }}>View on Solscan ↗</a>
            </div>

            {/* Token holdings */}
            {tokens.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Current Holdings ({tokens.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tokens.slice(0, 20).map(tok => (
                    <div key={tok.mint}
                      onClick={() => onScan(tok.mint)}
                      style={{ padding: '4px 8px', borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: 9, cursor: 'pointer', color: 'var(--text-muted)' }}
                      title={tok.mint}
                    >
                      {tok.mint.slice(0,4)}…{tok.mint.slice(-3)}
                      <span style={{ color: 'var(--text)', marginLeft: 4 }}>{tok.amount >= 1e6 ? (tok.amount/1e6).toFixed(1)+'M' : tok.amount >= 1000 ? (tok.amount/1000).toFixed(0)+'K' : tok.amount.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent swaps */}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Recent Swaps</div>
            {trades.length === 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                No recent swap activity found for this wallet.
                <div style={{ marginTop: 8 }}>
                  <a href={`https://solscan.io/account/${selectedWallet}#defiActivities`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', fontSize: 9 }}>View full history on Solscan ↗</a>
                </div>
              </div>
            )}
            {trades.map((trade, i) => (
              <div key={trade.txHash || i}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 3, borderRadius: 5, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderLeft: `2px solid ${trade.type === 'buy' ? 'var(--green)' : 'var(--red)'}` }}
              >
                <div style={{ fontWeight: 800, fontSize: 10, color: trade.type === 'buy' ? 'var(--green)' : 'var(--red)', width: 32 }}>{trade.type.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700 }}
                    onClick={() => trade.tokenMint && onScan(trade.tokenMint)}
                    style={{ fontSize: 10, fontWeight: 700, cursor: trade.tokenMint ? 'pointer' : 'default', color: trade.tokenMint ? 'var(--text-link)' : 'var(--text)' }}>
                    {trade.tokenSymbol || trade.tokenMint?.slice(0,8) || '?'}
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{trade.source} · {fAgeMs(trade.timestamp)}</div>
                </div>
                {trade.amountUsd > 0 && <div style={{ fontSize: 10, fontWeight: 700 }}>${trade.amountUsd.toFixed(0)}</div>}
                <a href={`https://solscan.io/tx/${trade.txHash}`} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: 'var(--text-link)' }}>TX ↗</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}