import { useState, useEffect, useCallback } from 'react';
import { fetchTerminalData } from '../api.js';
import { parsePair, enrichPair, fP, fU, fPct, fAge, bp, ageH } from '../utils.js';

function chSpan(v) {
  const n = +(v || 0);
  if (!n) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ color: n >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{n >= 0 ? '+' : ''}{n.toFixed(2)}%</span>;
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

const TH = ({ children, right }) => (
  <th style={{ padding:'5px 10px', textAlign: right ? 'right' : 'left', color:'var(--text-muted)', fontSize:8, letterSpacing:'.5px', textTransform:'uppercase', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', fontWeight:700, background:'#0a0d12' }}>
    {children}
  </th>
);
const TD = ({ children, right, style }) => (
  <td style={{ padding:'5px 10px', borderBottom:'1px solid rgba(33,38,45,.07)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign: right ? 'right' : 'left', ...style }}>
    {children}
  </td>
);

function TableWrap({ children }) {
  return (
    <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
        {children}
      </table>
    </div>
  );
}

// ── SCANNER ──
function ScannerTab({ pairs, onScan }) {
  const [maxAge, setMaxAge] = useState('24');
  const [minLiq, setMinLiq] = useState('5000');
  const [minVol, setMinVol] = useState('0');
  const [hideRug, setHideRug] = useState(true);
  const [sigsOnly, setSigsOnly] = useState(false);

  const newPools = pairs.filter(p => p.pairCreatedAt && ageH(p.pairCreatedAt) <= 48)
    .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt);
  const base = newPools.length ? newPools : pairs;

  const rows = base.filter(p => {
    if (+maxAge > 0 && p.pairCreatedAt && ageH(p.pairCreatedAt) > +maxAge) return false;
    if (+minLiq > 0 && p.liq < +minLiq) return false;
    if (+minVol > 0 && p.vol24 < +minVol) return false;
    if (hideRug && p.risk === 'rug') return false;
    if (sigsOnly && p.sig !== 'buy') return false;
    return true;
  });

  const selStyle = { background:'var(--bg-tertiary)', border:'1px solid var(--border)', color:'var(--text)', padding:'3px 7px', borderRadius:4, fontSize:10, outline:'none' };
  const fbtn = (active) => ({ padding:'3px 9px', borderRadius:4, border:`1px solid ${active?'#9945ff44':'var(--border)'}`, fontSize:9, fontWeight:800, background: active?'#9945ff22':'var(--bg-tertiary)', color: active?'#9945ff':'var(--text-muted)', cursor:'pointer' });

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ padding:'5px 10px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
        <label style={{ color:'var(--text-muted)', fontSize:10 }}>Age:</label>
        <select style={selStyle} value={maxAge} onChange={e => setMaxAge(e.target.value)}>
          {[['0','All'],['24','< 24h'],['6','< 6h'],['1','< 1h']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label style={{ color:'var(--text-muted)', fontSize:10 }}>Min Liq:</label>
        <select style={selStyle} value={minLiq} onChange={e => setMinLiq(e.target.value)}>
          {[['0','Any'],['5000','$5k+'],['20000','$20k+'],['100000','$100k+']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label style={{ color:'var(--text-muted)', fontSize:10 }}>Min Vol:</label>
        <select style={selStyle} value={minVol} onChange={e => setMinVol(e.target.value)}>
          {[['0','Any'],['10000','$10k+'],['50000','$50k+'],['200000','$200k+']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button style={fbtn(hideRug)} onClick={() => setHideRug(v => !v)}>Hide Rugs</button>
        <button style={fbtn(sigsOnly)} onClick={() => setSigsOnly(v => !v)}>Signals Only</button>
        <span style={{ marginLeft:'auto', color:'var(--text-muted)', fontSize:9 }}>{rows.length} tokens</span>
      </div>
      <TableWrap>
        <thead><tr>
          <TH>Token</TH><TH right>Price</TH>
          <TH right>5M</TH><TH right>1H</TH><TH right>24H</TH>
          <TH right>Vol 24H</TH><TH right>Liquidity</TH>
          <TH right>MCap</TH><TH right>Age</TH>
          <TH>Risk</TH><TH>Signal</TH>
        </tr></thead>
        <tbody>
          {rows.length ? rows.map(p => (
            <tr key={p.pairAddr} onClick={() => onScan(p.addr)} style={{ cursor:'pointer' }} className="scanner-row">
              <TD><strong style={{ color:'var(--text-bright)' }}>{p.sym}</strong><br /><span style={{ color:'var(--text-muted)', fontSize:9 }}>{p.name.slice(0,16)}</span></TD>
              <TD right>{fP(p.price)}</TD>
              <TD right>{chSpan(p.ch5m)}</TD><TD right>{chSpan(p.ch1h)}</TD><TD right>{chSpan(p.ch24)}</TD>
              <TD right>{fU(p.vol24)}</TD><TD right>{fU(p.liq)}</TD><TD right>{fU(p.mcap)}</TD>
              <TD right style={{ color:'var(--text-muted)' }}>{p.pairCreatedAt ? fAge(p.pairCreatedAt) : '—'}</TD>
              <TD><RiskBadge risk={p.risk} /></TD>
              <TD><SigBadge sig={p.sig} /></TD>
            </tr>
          )) : (
            <tr><td colSpan={11} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>No tokens match filters</td></tr>
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ── TRENDING ──
function TrendingTab({ pairs, onScan }) {
  const [sort, setSort] = useState('vol');
  const selStyle = { background:'var(--bg-tertiary)', border:'1px solid var(--border)', color:'var(--text)', padding:'3px 7px', borderRadius:4, fontSize:10, outline:'none' };

  const rows = [...pairs].sort((a, b) => {
    if (sort === 'ch') return b.ch24 - a.ch24;
    if (sort === 'txns') return ((b.txns?.h24?.buys||0)+(b.txns?.h24?.sells||0)) - ((a.txns?.h24?.buys||0)+(a.txns?.h24?.sells||0));
    if (sort === 'buyratio') {
      const rA = (a.txns?.h24?.buys||0) / Math.max((a.txns?.h24?.buys||0)+(a.txns?.h24?.sells||1),1);
      const rB = (b.txns?.h24?.buys||0) / Math.max((b.txns?.h24?.buys||0)+(b.txns?.h24?.sells||1),1);
      return rB - rA;
    }
    return b.vol24 - a.vol24;
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ padding:'5px 10px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <label style={{ color:'var(--text-muted)', fontSize:10 }}>Sort:</label>
        <select style={selStyle} value={sort} onChange={e => setSort(e.target.value)}>
          {[['vol','Volume'],['ch','Price Change'],['txns','Transactions'],['buyratio','Buy Ratio']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span style={{ marginLeft:'auto', color:'var(--text-muted)', fontSize:9 }}>{rows.length} pairs</span>
      </div>
      <TableWrap>
        <thead><tr>
          <TH>#</TH><TH>Token</TH><TH right>Price</TH>
          <TH right>5M</TH><TH right>1H</TH><TH right>6H</TH><TH right>24H</TH>
          <TH right>Vol 24H</TH><TH right>Liquidity</TH>
          <TH right>Buys/Sells</TH><TH>Signal</TH>
        </tr></thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.pairAddr} onClick={() => onScan(p.addr)} style={{ cursor:'pointer' }}>
              <TD style={{ color:'var(--text-muted)' }}>{i+1}</TD>
              <TD><strong style={{ color:'var(--text-bright)' }}>{p.sym}</strong><br /><span style={{ color:'var(--text-muted)', fontSize:9 }}>{p.name.slice(0,14)}</span></TD>
              <TD right>{fP(p.price)}</TD>
              <TD right>{chSpan(p.ch5m)}</TD><TD right>{chSpan(p.ch1h)}</TD>
              <TD right>{chSpan(p.ch6h)}</TD><TD right>{chSpan(p.ch24)}</TD>
              <TD right>{fU(p.vol24)}</TD><TD right>{fU(p.liq)}</TD>
              <TD right><span style={{ color:'var(--green)' }}>{p.txns?.h24?.buys||0}</span> / <span style={{ color:'var(--red)' }}>{p.txns?.h24?.sells||0}</span></TD>
              <TD><SigBadge sig={p.sig} /></TD>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ── SMART MONEY ──
function SmartMoneyTab({ pairs, onScan }) {
  const [minLiq, setMinLiq] = useState('5000');
  const [filter, setFilter] = useState('all');
  const selStyle = { background:'var(--bg-tertiary)', border:'1px solid var(--border)', color:'var(--text)', padding:'3px 7px', borderRadius:4, fontSize:10, outline:'none' };

  let rows = [...pairs]
    .filter(p => p.vol24 >= 5000 && p.liq >= +minLiq)
    .sort((a, b) => (b.vol24/Math.max(b.liq,1)) - (a.vol24/Math.max(a.liq,1)));
  if (filter === 'buy') rows = rows.filter(p => p.sig === 'buy');
  if (filter === 'watch') rows = rows.filter(p => p.sig === 'watch');
  rows = rows.slice(0, 100);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ padding:'5px 10px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
        <label style={{ color:'var(--text-muted)', fontSize:10 }}>Min Liq:</label>
        <select style={selStyle} value={minLiq} onChange={e => setMinLiq(e.target.value)}>
          {[['5000','$5k+'],['20000','$20k+'],['50000','$50k+'],['100000','$100k+']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label style={{ color:'var(--text-muted)', fontSize:10 }}>Filter:</label>
        <select style={selStyle} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="buy">Buy Signals</option>
          <option value="watch">Watchlist</option>
        </select>
        <span style={{ marginLeft:'auto', color:'var(--text-muted)', fontSize:9 }}>{rows.length} tokens · ranked by Vol/Liq</span>
      </div>
      <TableWrap>
        <thead><tr>
          <TH>#</TH><TH>Token</TH><TH right>Price</TH>
          <TH right>5M</TH><TH right>1H</TH><TH right>24H</TH>
          <TH right>Volume</TH><TH right>Liquidity</TH>
          <TH right>V/L</TH><TH right>Buy%</TH>
          <TH>Risk</TH><TH>Signal</TH>
        </tr></thead>
        <tbody>
          {rows.length ? rows.map((p, i) => {
            const bpH = bp(p.txns?.h24?.buys, p.txns?.h24?.sells);
            const vlr = p.liq > 0 ? (p.vol24/p.liq).toFixed(1) : '—';
            return (
              <tr key={p.pairAddr} onClick={() => onScan(p.addr)} style={{ cursor:'pointer' }}>
                <TD style={{ color:'var(--text-muted)' }}>{i+1}</TD>
                <TD><strong style={{ color:'var(--text-bright)' }}>{p.sym}</strong><br /><span style={{ color:'var(--text-muted)', fontSize:9 }}>{(p.name||'').slice(0,14)}</span></TD>
                <TD right>{fP(p.price)}</TD>
                <TD right>{chSpan(p.ch5m)}</TD><TD right>{chSpan(p.ch1h)}</TD><TD right>{chSpan(p.ch24)}</TD>
                <TD right>{fU(p.vol24)}</TD><TD right>{fU(p.liq)}</TD>
                <TD right style={{ fontWeight:700, color: +vlr > 5 ? 'var(--green)' : 'var(--yellow)' }}>{vlr}x</TD>
                <TD right style={{ color: bpH > 55 ? 'var(--green)' : bpH < 45 ? 'var(--red)' : 'var(--text)' }}>{bpH}%</TD>
                <TD><RiskBadge risk={p.risk} /></TD>
                <TD><SigBadge sig={p.sig} /></TD>
              </tr>
            );
          }) : (
            <tr><td colSpan={12} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>No data — click Refresh to load</td></tr>
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ── SIGNALS ──
function SignalsTab({ pairs, onScan }) {
  const [show, setShow] = useState({ buy:true, watch:true, sell:false, avoid:false });
  const cats = [
    { key:'buy',   label:'🟢 BUY',   color:'var(--green)' },
    { key:'watch', label:'🔵 WATCH', color:'var(--text-link)' },
    { key:'sell',  label:'🔴 SELL',  color:'var(--red)' },
    { key:'avoid', label:'⚫ AVOID', color:'var(--text-muted)' },
  ];

  const rows = pairs
    .filter(p => show[p.sig])
    .sort((a, b) => {
      const o = { buy:0, watch:1, sell:2, avoid:3 };
      return (o[a.sig]??4) - (o[b.sig]??4) || b.vol24 - a.vol24;
    });

  const fbtn = (key, color, active) => ({
    padding:'3px 9px', borderRadius:4,
    border: `1px solid ${active ? color+'44' : 'var(--border)'}`,
    fontSize:9, fontWeight:800,
    background: active ? color+'11' : 'var(--bg-tertiary)',
    color: active ? color : 'var(--text-muted)',
    cursor:'pointer',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ padding:'5px 10px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6, flexShrink:0, flexWrap:'wrap' }}>
        <span style={{ color:'var(--text-muted)', fontSize:10, fontWeight:700 }}>Show:</span>
        {cats.map(c => (
          <button key={c.key} style={fbtn(c.key, c.color, show[c.key])} onClick={() => setShow(v => ({ ...v, [c.key]: !v[c.key] }))}>{c.label}</button>
        ))}
        <span style={{ marginLeft:'auto', color:'var(--text-muted)', fontSize:9 }}>{rows.length} signals</span>
      </div>
      <TableWrap>
        <thead><tr>
          <TH>Token</TH><TH right>Price</TH>
          <TH right>5M</TH><TH right>1H</TH><TH right>24H</TH>
          <TH right>Volume</TH><TH right>Liquidity</TH>
          <TH right>Stop Loss</TH><TH right>Target 1</TH><TH right>Target 2</TH>
          <TH>Signal</TH><TH>Reason</TH>
        </tr></thead>
        <tbody>
          {rows.length ? rows.map(p => {
            const sl = p.price * 0.85, t1 = p.price * 1.5, t2 = p.price * 2.5;
            const sigColor = p.sig === 'buy' ? 'var(--green)' : p.sig === 'watch' ? 'var(--text-link)' : p.sig === 'sell' ? 'var(--red)' : 'var(--text-muted)';
            return (
              <tr key={p.pairAddr} onClick={() => onScan(p.addr)} style={{ cursor:'pointer' }}>
                <TD style={{ borderLeft:`2px solid ${sigColor}` }}><strong style={{ color:'var(--text-bright)' }}>{p.sym}</strong><br /><span style={{ color:'var(--text-muted)', fontSize:9 }}>{(p.name||'').slice(0,14)}</span></TD>
                <TD right>{fP(p.price)}</TD>
                <TD right>{chSpan(p.ch5m)}</TD><TD right>{chSpan(p.ch1h)}</TD><TD right>{chSpan(p.ch24)}</TD>
                <TD right>{fU(p.vol24)}</TD><TD right>{fU(p.liq)}</TD>
                <TD right style={{ color:'var(--red)', fontSize:9 }}>{fP(sl)}</TD>
                <TD right style={{ color:'var(--green)', fontSize:9 }}>{fP(t1)}</TD>
                <TD right style={{ color:'var(--cyan)', fontSize:9 }}>{fP(t2)}</TD>
                <TD><SigBadge sig={p.sig} /></TD>
                <TD style={{ color:'var(--text-muted)', fontSize:9, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>{p.reason||''}</TD>
              </tr>
            );
          }) : (
            <tr><td colSpan={12} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>No signals match — adjust filters</td></tr>
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ── MAIN TERMINAL VIEW ──
export default function TerminalView({ mode, onScan }) {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchTerminalData();
      const parsed = raw.map(p => enrichPair(parsePair(p)));
      setPairs(parsed);
      setLastLoaded(Date.now());
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (pairs.length === 0 && !loading) load();
  }, []);

  if (loading && !pairs.length) {
    return <div className="empty-state"><span className="spin" style={{ fontSize:24, marginBottom:10, display:'block' }}>⟳</span>Loading data…</div>;
  }

  const tabContent = () => {
    if (mode === 'scanner')  return <ScannerTab    pairs={pairs} onScan={onScan} />;
    if (mode === 'trending') return <TrendingTab   pairs={pairs} onScan={onScan} />;
    if (mode === 'smart')    return <SmartMoneyTab pairs={pairs} onScan={onScan} />;
    if (mode === 'signals')  return <SignalsTab    pairs={pairs} onScan={onScan} />;
    return null;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 96px)', minHeight:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div className="live-dot" />
        <span style={{ fontSize:9, color:'var(--text-muted)' }}>
          {lastLoaded ? `Updated ${new Date(lastLoaded).toLocaleTimeString()}` : 'Loading…'}
        </span>
        <button
          onClick={load}
          disabled={loading}
          style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'var(--cyan)', padding:'3px 10px', border:'1px solid var(--border)', borderRadius:4, background:'var(--bg-tertiary)', cursor:'pointer', opacity: loading ? .5 : 1 }}
        >
          {loading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>
      {tabContent()}
    </div>
  );
}