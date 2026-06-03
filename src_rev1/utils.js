import { LP_PROGRAMS, KNOWN_LABELS, POOL_KEYWORDS } from './config.js';

// ── Price: $0.0000001234 etc ──
export function fP(n) {
  if (n == null || isNaN(n)) return '—';
  const v = +n;
  if (!v) return '$0';
  if (v < 1e-7) return '$' + v.toExponential(2);
  if (v < 0.00001) return '$' + v.toFixed(9);
  if (v < 0.001) return '$' + v.toFixed(7);
  if (v < 0.1) return '$' + v.toFixed(5);
  if (v < 10) return '$' + v.toFixed(4);
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── USD with K/M/B suffix ──
export function fU(n) {
  if (!n || isNaN(+n) || +n === 0) return '—';
  const v = +n;
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

// ── Number with K/M/B suffix (no $) ──
export function fN(n) {
  if (!n || isNaN(+n) || +n === 0) return '—';
  const v = +n;
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

// ── Percentage ──
export function fPct(n) {
  if (n == null || isNaN(n)) return '—';
  const v = +n;
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

// ── Short address: AbCd…XyZw ──
export function fAddr(s) {
  if (!s) return '—';
  const str = String(s);
  if (str.length < 8) return str;
  return str.slice(0, 4) + '…' + str.slice(-4);
}

// ── Age from unix ms timestamp ──
export function fAge(ts) {
  if (!ts) return '?';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return Math.floor(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

// ── Age from unix ms (same as fAge, kept for trade timestamps) ──
export function fAgeMs(ms) {
  if (!ms) return '?';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return Math.floor(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  return Math.floor(s / 3600) + 'h';
}

// ── Localized number ──
export function fNum(n) {
  return n == null ? '—' : Number(n).toLocaleString();
}

// ── Buy pressure % (0-100) ──
export function bp(buys, sells) {
  const tb = +(buys || 0), ts = +(sells || 0);
  if (!tb && !ts) return 50;
  return Math.round((tb / (tb + ts)) * 100);
}

// ── Collect LP addresses from rug.markets ──
export function collectLPAddresses(rug, mint) {
  const lps = new Set();
  const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  function scan(obj, depth) {
    if (!obj || depth > 5) return;
    if (typeof obj === 'string') { if (B58.test(obj)) lps.add(obj); }
    else if (Array.isArray(obj)) obj.forEach(v => scan(v, depth + 1));
    else if (typeof obj === 'object') Object.values(obj).forEach(v => scan(v, depth + 1));
  }
  (rug?.markets || []).forEach(m => scan(m, 0));

  // Remove the token mint and common non-pool tokens
  if (mint) lps.delete(mint);
  lps.delete('So11111111111111111111111111111111111111112');
  lps.delete('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  lps.delete('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
  return lps;
}

// ── Check if a holder is an LP pool (simplified: owner-aware) ──
export function isLPHolder(h, lpSet) {
  if (!h.address) return true;
  if (lpSet.has(h.address)) return true;
  if (LP_PROGRAMS.has(h.address)) return true;
  if (h.owner) {
    if (lpSet.has(h.owner)) return true;
    if (LP_PROGRAMS.has(h.owner)) return true;
  }
  if (h.tokenAccount) {
    if (lpSet.has(h.tokenAccount)) return true;
    if (LP_PROGRAMS.has(h.tokenAccount)) return true;
  }
  if (h.isLP === true || h.type === 'lp' || h.type === 'pool') return true;

  const checkLabel = (addr) => {
    if (!addr) return false;
    const known = (KNOWN_LABELS[addr] || '').toLowerCase();
    return known && POOL_KEYWORDS.some(k => known.includes(k));
  };
  return checkLabel(h.address) || checkLabel(h.owner || '');
}

// ── Wallet display name (SNS or known label) ──
export function walletName(addr, snsNames) {
  if (!addr) return null;
  if (KNOWN_LABELS[addr]) return KNOWN_LABELS[addr];
  if (snsNames?.[addr]) return snsNames[addr];
  return null;
}

// ── Age from hours ──
export function ageH(ts) {
  return ts ? (Date.now() - ts) / 3600000 : 9999;
}

// ── Parse a DexScreener pair object into a flat shape ──
export function parsePair(pr) {
  return {
    name: pr.baseToken?.name || '?',
    sym: pr.baseToken?.symbol || '?',
    addr: pr.baseToken?.address || '',
    pairAddr: pr.pairAddress || '',
    dex: pr.dexId || '',
    price: parseFloat(pr.priceUsd) || 0,
    ch5m: pr.priceChange?.m5 || 0,
    ch1h: pr.priceChange?.h1 || 0,
    ch6h: pr.priceChange?.h6 || 0,
    ch24: pr.priceChange?.h24 || 0,
    vol24: pr.volume?.h24 || 0,
    liq: pr.liquidity?.usd || 0,
    mcap: pr.marketCap || pr.fdv || 0,
    txns: pr.txns,
    pairCreatedAt: pr.pairCreatedAt || null,
    url: pr.url || '',
    imageUrl: pr.info?.imageUrl || pr.baseToken?.imageUrl || '',
  };
}

// ── Risk score ──
export function calcRisk(p) {
  const { liq = 0, vol24 = 0, ch24 = 0, pairCreatedAt, txns } = p;
  const buys = txns?.h24?.buys || 0, sells = txns?.h24?.sells || 0;
  const ratio = buys + sells > 0 ? buys / (buys + sells) : 0.5;
  let score = 0;
  if (liq < 5000) score += 3; else if (liq < 20000) score += 2; else if (liq < 100000) score += 1;
  const ah = ageH(pairCreatedAt);
  if (ah < 1) score += 3; else if (ah < 6) score += 2; else if (ah < 24) score += 1;
  if (vol24 > 0 && liq > 0 && vol24 / liq > 20) score += 2;
  if (ch24 > 200) score += 2; else if (ch24 > 100) score += 1; else if (ch24 < -50) score += 2; else if (ch24 < -20) score += 1;
  if (ratio < 0.3) score += 2;
  if (score >= 7) return 'rug'; if (score >= 5) return 'high'; if (score >= 3) return 'med'; return 'low';
}

// ── Signal ──
export function calcSignal(p) {
  const { risk, ch5m = 0, ch1h = 0, ch24 = 0, liq = 0, vol24 = 0, txns } = p;
  if (risk === 'rug') return { sig: 'avoid', reason: 'Rug risk — suspicious pattern' };
  if (liq < 5000) return { sig: 'avoid', reason: 'Liquidity too low (<$5k)' };
  const buys = txns?.h24?.buys || 0, sells = txns?.h24?.sells || 0;
  const br = buys + sells > 0 ? buys / (buys + sells) : 0.5;
  const momentum = ch5m > 3 && ch1h > 8;
  const volStr = vol24 > 0 && liq > 0 && vol24 / liq > 2;
  const buyPr = br > 0.65;
  const overExt = ch1h > 80 || ch24 > 300;
  const dump = ch1h < -20 || ch24 < -40;
  const recovering = ch24 < -20 && ch1h > 10 && br > 0.6;
  if (dump && !recovering) return { sig: 'sell', reason: `Dump: 1H ${ch1h.toFixed(1)}%` };
  if (overExt) return { sig: 'watch', reason: `Overextended — wait for pullback (1H +${ch1h.toFixed(0)}%)` };
  if (recovering) return { sig: 'watch', reason: 'Recovering from dump — wait for confirmation' };
  if (momentum && volStr && buyPr && risk !== 'high') return { sig: 'buy', reason: `Momentum + buy pressure (${(br * 100).toFixed(0)}% buys)` };
  if (momentum && risk !== 'high') return { sig: 'buy', reason: `Uptrend: 5M +${ch5m.toFixed(1)}% / 1H +${ch1h.toFixed(1)}%` };
  if (volStr && buyPr) return { sig: 'watch', reason: 'Volume surge + buy pressure — watch for entry' };
  return { sig: 'watch', reason: 'No clear momentum — accumulation' };
}

// ── Enrich a parsed pair with risk + signal ──
export function enrichPair(p) {
  p.risk = calcRisk(p);
  const s = calcSignal(p);
  p.sig = s.sig;
  p.reason = s.reason;
  return p;
}

// ── Price target calculator (simple fixed % levels) ──
export function calcTargets(priceUsd) {
  const cur = +(priceUsd || 0);
  if (!cur) return { cur: 0, sl: 0, buyZone: 0, t1: 0, t2: 0, t1p: 50, t2p: 150 };
  return {
    cur,
    sl: cur * 0.85,
    buyZone: cur * 0.90,
    t1: cur * 1.50,
    t2: cur * 2.50,
    t1p: 50,
    t2p: 150,
  };
}