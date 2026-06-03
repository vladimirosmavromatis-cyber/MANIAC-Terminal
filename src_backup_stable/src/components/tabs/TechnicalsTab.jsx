import { fP, fPct, calcTargets } from '../../utils.js';

export default function TechnicalsTab({ pair }) {
  const priceUsd = +(pair?.priceUsd || 0);
  const targets = calcTargets(priceUsd);
  const change24h = +(pair?.priceChange?.h24 || 0);

  const stats = [
    [fP(targets.sl),      'Stop Loss',  'var(--red)',    '-15%'],
    [fP(targets.buyZone), 'Buy Zone',   'var(--yellow)', '-10%'],
    [fP(targets.cur),     'Current',    '#ffffff',       'NOW'],
    [fP(targets.t1),      'Target 1',   'var(--green)',  '+50%'],
    [fP(targets.t2),      'Target 2',   'var(--cyan)',   '+150%'],
    [fPct(change24h),     '24h Change', change24h >= 0 ? 'var(--green)' : 'var(--red)', ''],
  ];

  return (
    <>
      <div style={{ padding: '10px 12px', fontSize: 9, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
        Technical Analysis · Price Targets
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 10 }}>
        {stats.map(([value, label, color, sub]) => (
          <div key={label} style={{ background: 'rgba(22,27,34,.53)', border: '1px solid rgba(33,38,45,.27)', borderRadius: 5, padding: '8px 10px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2, color }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
            {sub && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ padding: '6px 12px', fontSize: 9, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        Targets are fixed percentages from current price. Chart above shows these as price lines.
      </div>
    </>
  );
}