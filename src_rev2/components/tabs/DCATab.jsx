import { fU, fN, calcTargets } from '../../utils.js';

export default function DCATab({ pair, mint, dcaAmt, dcaFreq, dcaPeriods, onChangeAmt, onChangeFreq, onChangePeriods }) {
  const priceUsd = +(pair?.priceUsd || 0);
  const targets = calcTargets(priceUsd);
  const totalInvested = dcaAmt * dcaPeriods;
  const tokensAccumulated = priceUsd > 0 ? totalInvested / priceUsd : 0;

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>DCA Calculator</div>

      <div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Amount per buy ($)</div>
        <input
          className="dca-input"
          type="number"
          value={dcaAmt}
          min="1"
          onChange={e => onChangeAmt(+e.target.value)}
        />
      </div>

      <div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Frequency</div>
        <select className="dca-input" value={dcaFreq} onChange={e => onChangeFreq(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Periods</div>
        <input
          className="dca-input"
          type="number"
          value={dcaPeriods}
          min="1"
          max="52"
          onChange={e => onChangePeriods(+e.target.value)}
        />
      </div>

      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
        {[
          ['Total Invested', fU(totalInvested), 'var(--text)'],
          ['Tokens Accumulated', fN(tokensAccumulated), 'var(--text)'],
          [`At T1 (+${targets.t1p}%)`, fU(tokensAccumulated * targets.t1), 'var(--green)'],
          [`At T2 (+${targets.t2p}%)`, fU(tokensAccumulated * targets.t2), 'var(--cyan)'],
        ].map(([label, value, color]) => (
          <div key={label} className="stat-row" style={{ padding: '3px 0' }}>
            <span className="stat-label">{label}</span>
            <span className="stat-value" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <a
        href={`https://jup.ag/swap/SOL-${mint}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block', textAlign: 'center',
          background: 'var(--green)', color: 'var(--bg)',
          fontWeight: 700, padding: 8, borderRadius: 6,
        }}
      >
        Swap on Jupiter ↗
      </a>
    </div>
  );
}