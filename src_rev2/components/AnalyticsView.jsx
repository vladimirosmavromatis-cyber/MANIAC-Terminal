import { useState, useCallback } from 'react';
import { fetchAnalyticsSearch } from '../api.js';
import { parsePair, enrichPair, fP, fU, fPct, fAge, bp } from '../utils.js';

function SigBadge({ sig }) {
  const cfg = {
    buy:   { bg: '#22c55e22', color: '#22c55e', label: 'BUY' },
    sell:  { bg: '#f8514922', color: '#f85149', label: 'SELL' },
    watch: { bg: '#58a6ff22', color: '#58a6ff', label: 'WATCH' },
    avoid: { bg: '#48505822', color: '#484f58', label: 'AVOID' },
  };
  const c = cfg[sig] || cfg.avoid;
  return <span style={{ display:'inline-block', padding:'1px 5px', borderRadius:3, fontSize:8, fontWeight:800, background:c.bg, color:c.color }}>{c.label}</span>;
}
function RiskBadge({ risk }) {
  const cfg = {
    low:  { bg: '#22c55e22', color: '#22c55e', border: '#22c55e44', label: 'LOW' },
    med:  { bg: '#e3b34122', color: '#e3b341', border: '#e3b34144', label: 'MED' },
    high: { bg: '#f8514922', color: '#f85149', border: '#f8514944', label: 'HIGH' },
    rug:  { bg: '#f8514933', color: '#f85149', border: '#f85149',   label: '🚨RUG' },
  };
  const c = cfg[risk] || cfg.high;
  return <span style={{ display:'inline-block', padding:'1px 5px', borderRadius:3, fontSize:8, fontWeight:800, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>{c.label}</span>;
}

export default function AnalyticsView({ onScan }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const raw = await fetchAnalyticsSearch(q);
      setResults(raw.map(p => enrichPair(parsePair(p))));
    } catch (_) { setResults([]); }
    setLoading(false);
  }, [query]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 96px)' }}>
      {/* Search bar */}
      <div style={{ padding:10, borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:6 }}>
          <input
            className="search-input"
            placeholder="Search token name, symbol, or contract address…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          <button className="scan-btn" onClick={doSearch} disabled={loading}>
            {loading ? '⟳' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ flex:1, overflowY:'auto', padding:10 }}>
        {loading && (
          <div className="empty-state"><span className="spin" style={{ fontSize:22, display:'block', marginBottom:8 }}>⟳</span>Searching…</div>
        )}
        {!loading && !searched && (
          <div className="empty-state" style={{ marginTop:60 }}>
            <div style={{ fontSize:28, marginBottom:10 }}>🔍</div>
            <div style={{ fontSize:13, color:'var(--text)', marginBottom:6 }}>Token Analytics Search</div>
            <div style={{ color:'var(--text-muted)', fontSize:11 }}>Search by name, symbol, or paste a contract address</div>
          </div>
        )}
        {!loading && searched && results.length === 0 && (
          <div className="empty-state">No results for <strong>{query}</strong></div>
        )}
        {!loading && results.map(p => {
          const sl = p.price * 0.85, t1 = p.price * 1.5, t2 = p.price * 2.5;
          const bpH = bp(p.txns?.h24?.buys, p.txns?.h24?.sells);
          const ch24 = +(p.ch24 || 0);
          return (
            <div key={p.pairAddr}
              onClick={() => onScan(p.addr)}
              style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:7, padding:10, marginBottom:8, cursor:'pointer', transition:'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(34,197,94,.27)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
            >
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e => e.currentTarget.style.display='none'} />
                  : <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{(p.sym||'?')[0]}</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <strong style={{ fontSize:13 }}>{p.sym}</strong>
                    <SigBadge sig={p.sig} /><RiskBadge risk={p.risk} />
                  </div>
                  <div style={{ fontSize:9, color:'var(--text-muted)' }}>{p.name} · {(p.dex||'').toUpperCase()} · {p.pairCreatedAt ? fAge(p.pairCreatedAt) : '?'} old</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{fP(p.price)}</div>
                  <div style={{ fontSize:10, color: ch24 >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>{fPct(ch24)} 24H</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:10 }}>
                {[
                  ['Volume 24H', fU(p.vol24), null],
                  ['Liquidity',  fU(p.liq),   null],
                  ['MCap',       fU(p.mcap),  null],
                  ['Buy%',       bpH + '%',   bpH > 55 ? 'var(--green)' : bpH < 45 ? 'var(--red)' : 'var(--yellow)'],
                  ['Stop Loss',  fP(sl),      'var(--red)'],
                  ['Target 1',   fP(t1),      'var(--green)'],
                  ['Target 2',   fP(t2),      'var(--cyan)'],
                  ['5M / 1H',    `${fPct(p.ch5m)} / ${fPct(p.ch1h)}`, null],
                ].map(([label, val, color]) => (
                  <div key={label}>
                    <div style={{ fontSize:8, textTransform:'uppercase', color:'var(--text-muted)', letterSpacing:'.4px' }}>{label}</div>
                    <div style={{ fontWeight:700, color: color || 'var(--text)' }}>{val}</div>
                  </div>
                ))}
              </div>
              {p.reason && <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:5 }}>💡 {p.reason}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}