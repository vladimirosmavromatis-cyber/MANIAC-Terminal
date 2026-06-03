import { LP_PROGRAMS } from './config.js';

const HELIUS_RPC = () =>
  `https://mainnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`;

// ── Generic RPC helper ──
async function rpc(method, params) {
  const res = await fetch(HELIUS_RPC(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// ─────────────────────────────────────────────
// FEED — Trending tokens from DexScreener
// ─────────────────────────────────────────────
export async function fetchFeed() {
  const all = [];

  const safeFetch = async (url) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (r.ok) return await r.json();
    } catch (_) {}
    return null;
  };

  // 1. Latest token profiles
  const profiles = await safeFetch('https://api.dexscreener.com/token-profiles/latest/v1');
  if (profiles) {
    const mints = (profiles || []).filter(t => t.chainId === 'solana').slice(0, 30).map(t => t.tokenAddress);
    if (mints.length) {
      const r = await safeFetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(',')}`);
      (r?.pairs || []).filter(p => p.chainId === 'solana').forEach(p => all.push(p));
    }
  }

  // 2. Top boosted tokens
  const boosts = await safeFetch('https://api.dexscreener.com/token-boosts/top/v1');
  if (boosts) {
    const mints = (boosts || []).filter(t => t.chainId === 'solana').slice(0, 20).map(t => t.tokenAddress);
    if (mints.length) {
      const r = await safeFetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(',')}`);
      (r?.pairs || []).filter(p => p.chainId === 'solana').forEach(p => all.push(p));
    }
  }

  // 3. General SOL search for volume
  const search = await safeFetch('https://api.dexscreener.com/latest/dex/search?q=sol');
  (search?.pairs || []).filter(p => p.chainId === 'solana' && +(p.volume?.h24 || 0) > 5000).forEach(p => all.push(p));

  // Deduplicate by mint, pick highest-volume pair per mint
  const best = {};
  all.forEach(p => {
    const m = p.baseToken?.address;
    if (!m) return;
    if (!best[m] || +(p.volume?.h24 || 0) > +(best[m].volume?.h24 || 0)) best[m] = p;
  });

  // Score & sort
  const scored = Object.values(best)
    .filter(p => +(p.liquidity?.usd || 0) >= 3000)
    .map(p => {
      const v5m = +(p.volume?.m5 || 0);
      const v1h = +(p.volume?.h1 || 0);
      const expected5m = v1h / 12;
      const spike = expected5m > 0 ? v5m / expected5m : 1;
      const buyP = (() => {
        const b = +(p.txns?.m5?.buys || 0), s = +(p.txns?.m5?.sells || 0);
        return b + s > 0 ? Math.round((b / (b + s)) * 100) : 50;
      })();
      let score = +(p.volume?.h24 || 0) / 1000 + spike * 50000;
      if (buyP > 65) score += 30000;
      return { pair: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);

  return scored.map(s => s.pair);
}

// ─────────────────────────────────────────────
// DEX SCREENER — token pairs
// ─────────────────────────────────────────────
export async function fetchDexScreener(mint) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`DexScreener HTTP ${r.status}`);
  const json = await r.json();
  const pairs = (json.pairs || [])
    .filter(p => p.chainId === 'solana')
    .sort((a, b) => (+(b.volume?.h24) || 0) - (+(a.volume?.h24) || 0));
  if (!pairs.length) throw new Error('No Solana pairs found.');
  const allPairAddresses = [...new Set(pairs.map(p => p.pairAddress).filter(Boolean))];
  return { pair: pairs[0], all: pairs, allPairAddresses };
}

// ─────────────────────────────────────────────
// RUG CHECK
// ─────────────────────────────────────────────
export async function fetchRugCheck(mint) {
  try {
    const r = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, {
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

// ─────────────────────────────────────────────
// SOLANA TRACKER — holder count
// ─────────────────────────────────────────────
export async function fetchSolanaTracker(mint) {
  try {
    const r = await fetch(`https://data.solanatracker.io/tokens/${mint}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const j = await r.json();
      return +(j?.holder || j?.holders || j?.holderCount || 0);
    }
  } catch (_) {}
  return 0;
}

// ─────────────────────────────────────────────
// OHLCV — GeckoTerminal candlestick data
// ─────────────────────────────────────────────
export async function fetchOHLCV(pairAddress, tf) {
  if (!pairAddress) return [];
  let ep;
  if (tf === '1m')  ep = 'ohlcv/minute?aggregate=1&limit=150';
  else if (tf === '5m')  ep = 'ohlcv/minute?aggregate=5&limit=150';
  else if (tf === '15m') ep = 'ohlcv/minute?aggregate=15&limit=150';
  else if (tf === '1h')  ep = 'ohlcv/hour?aggregate=1&limit=168';
  else if (tf === '4h')  ep = 'ohlcv/hour?aggregate=4&limit=120';
  else                   ep = 'ohlcv/day?aggregate=1&limit=90';

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pairAddress}/${ep}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j.data?.attributes?.ohlcv_list || [])
      .map(c => ({ t: c[0] * 1000, o: +c[1], h: +c[2], l: +c[3], c: +c[4], v: +c[5] }))
      .sort((a, b) => a.t - b.t);
  } catch (_) {
    return [];
  }
}

// ─────────────────────────────────────────────
// TRADES — GeckoTerminal recent trades
// Fixed: timestamps stored as unix milliseconds
// ─────────────────────────────────────────────
export async function fetchTrades(pairAddress) {
  if (!pairAddress) return [];
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pairAddress}/trades?trade_volume_in_usd_greater_than=0`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.data || []).map(t => {
      const attrs = t.attributes || t;
      const kind = (attrs.kind || attrs.type || attrs.side || '').toLowerCase();
      // Always store timestamp as unix milliseconds
      let ts = 0;
      if (attrs.block_timestamp) ts = new Date(attrs.block_timestamp).getTime();
      else if (attrs.timestamp) ts = +(attrs.timestamp) * 1000;
      return {
        type: kind === 'sell' ? 'sell' : 'buy',
        timestamp: ts,
        wallet: attrs.tx_from_address || attrs.maker || attrs.wallet || '',
        volumeUsd: +(attrs.volume_in_usd || attrs.volumeUsd || 0),
        priceUsd: +(attrs.price_from_in_usd || attrs.price_to_in_usd || attrs.priceUsd || 0),
        amount: +(attrs.from_token_amount || attrs.amount || 0),
        txHash: attrs.tx_hash || '',
      };
    });
  } catch (_) {
    return [];
  }
}

// ─────────────────────────────────────────────
// HOLDERS — Helius getTokenAccounts (DAS)
// Returns ALL holders with correct owner wallets
// No CORS proxy needed, paginated up to 10k
// ─────────────────────────────────────────────
export async function fetchHolders(mint, rugMarkets = []) {
  const marketsJson = JSON.stringify(rugMarkets);

  // Step 1: Get token supply (raw + decimals)
  let supplyRaw = 0n;
  let decimals = 0;
  try {
    const supplyResult = await rpc('getTokenSupply', [mint]);
    supplyRaw = BigInt(supplyResult?.value?.amount || '0');
    decimals = supplyResult?.value?.decimals || 0;
  } catch (e) {
    console.warn('[Helius] getTokenSupply failed:', e.message);
    return { holders: [], count: 0 };
  }

  const divisor = Math.pow(10, decimals);

  // Step 2: getTokenAccounts (Helius DAS, params as object)
  const allAccounts = [];
  let totalFromHelius = 0;

  for (let page = 1; page <= 10; page++) {
    try {
      const result = await rpc('getTokenAccounts', {
        page,
        limit: 1000,
        displayOptions: { showZeroBalance: false },
        mint,
      });
      const accounts = result?.token_accounts || [];
      if (page === 1) totalFromHelius = result?.total || 0;
      allAccounts.push(...accounts);
      if (accounts.length < 1000) break;
    } catch (e) {
      console.warn('[Helius] getTokenAccounts page', page, 'failed:', e.message);
      break;
    }
  }

  if (!allAccounts.length) return { holders: [], count: 0 };

  // Step 3: Filter LP programs and compute percentages
  const holders = allAccounts
    .map(acc => {
      const raw = BigInt(
        typeof acc.amount === 'string' ? acc.amount : String(Math.floor(acc.amount || 0)),
      );
      const pct =
        supplyRaw > 0n
          ? Number((raw * 100000n) / supplyRaw) / 1000 // 3-decimal precision
          : 0;
      const uiAmount = Number(raw) / divisor;
      return {
        address: acc.owner || '',
        tokenAccount: acc.address || '',
        amount: uiAmount,
        pct,
        insider: false,
        label: '',
      };
    })
    .filter(h => {
      if (!h.address || h.pct === 0) return false;
      if (LP_PROGRAMS.has(h.address)) return false;
      // If owner or vault appears anywhere in markets JSON → it's a pool
      if (h.address.length > 20 && marketsJson.includes(h.address)) return false;
      if (h.tokenAccount.length > 20 && marketsJson.includes(h.tokenAccount)) return false;
      return true;
    })
    .sort((a, b) => b.pct - a.pct);

  return { holders, count: totalFromHelius };
}

// ─────────────────────────────────────────────
// TERMINAL DATA — Scanner / Trending / Smart / Signals
// ─────────────────────────────────────────────
export async function fetchTerminalData() {
  const safe = async (url) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (r.ok) return await r.json();
    } catch (_) {}
    return null;
  };
  const queries = [
    'https://api.dexscreener.com/latest/dex/search?q=solana',
    'https://api.dexscreener.com/latest/dex/search?q=sol+meme',
    'https://api.dexscreener.com/latest/dex/search?q=pump+fun+solana',
  ];
  const results = await Promise.all(queries.map(safe));
  const seen = new Set();
  const pairs = [];
  results.forEach(r => {
    (r?.pairs || [])
      .filter(p => p.chainId === 'solana' && parseFloat(p.priceUsd) > 0 && p.pairAddress)
      .forEach(p => {
        if (!seen.has(p.pairAddress)) { seen.add(p.pairAddress); pairs.push(p); }
      });
  });
  return pairs;
}

// ─────────────────────────────────────────────
// ANALYTICS SEARCH
// ─────────────────────────────────────────────
export async function fetchAnalyticsSearch(q) {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.pairs || []).filter(p => p.chainId === 'solana' && parseFloat(p.priceUsd) > 0).slice(0, 20);
  } catch (_) { return []; }
}

// ─────────────────────────────────────────────
// SNS NAMES — Bonfida .sol reverse lookup
// ─────────────────────────────────────────────
export async function fetchSNSNames(addresses) {
  const results = {};
  const SNS_NAME = /^[a-zA-Z0-9_-]+$/;

  const chunks = [];
  for (let i = 0; i < addresses.length; i += 8) chunks.push(addresses.slice(i, i + 8));

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async addr => {
        try {
          const r = await fetch(
            `https://sns-sdk-proxy.bonfida.workers.dev/reverse-lookup/${addr}`,
            { signal: AbortSignal.timeout(3000) },
          );
          if (r.ok) {
            const j = await r.json();
            if (j.result && typeof j.result === 'string' && j.result.length < 64 && SNS_NAME.test(j.result)) {
              results[addr] = j.result + '.sol';
            }
          }
        } catch (_) {}
      }),
    );
  }
  return results;
}