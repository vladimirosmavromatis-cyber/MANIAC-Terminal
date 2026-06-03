import { fNum } from '../../utils.js';

export default function SecurityTab({ rug, riskLabel, riskColor, top10HoldPercent, holderCount, snipCount, bundleCount, insiderPercent, mintAuthority, freezeAuthority }) {
  if (!rug) {
    return <div className="empty-state">RugCheck data unavailable.</div>;
  }

  const risks = rug.risks || [];

  return (
    <>
      {/* Summary cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 10 }}>
        {[
          [riskLabel, 'Risk Level', riskColor],
          [mintAuthority ? 'Yes ✗' : 'No ✓', 'Mint Authority', mintAuthority ? 'var(--red)' : 'var(--green)'],
          [freezeAuthority ? 'Yes ✗' : 'No ✓', 'Freeze Authority', freezeAuthority ? 'var(--red)' : 'var(--green)'],
          [top10HoldPercent.toFixed(1) + '%', 'Top 10 (excl LP)', top10HoldPercent > 60 ? 'var(--red)' : top10HoldPercent > 40 ? 'var(--yellow)' : 'var(--green)'],
          [fNum(holderCount) || '—', 'Total Holders', 'var(--text)'],
          [snipCount + ' found', 'Snipers', snipCount ? 'var(--yellow)' : 'var(--green)'],
          [bundleCount + ' found', 'Bundles', bundleCount ? 'var(--yellow)' : 'var(--green)'],
          [insiderPercent.toFixed(1) + '%', 'Insiders', insiderPercent > 20 ? 'var(--red)' : insiderPercent > 10 ? 'var(--yellow)' : 'var(--green)'],
        ].map(([value, label, color]) => (
          <div key={label} style={{ background: 'rgba(22,27,34,.53)', border: '1px solid rgba(33,38,45,.27)', borderRadius: 5, padding: '8px 10px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2, color }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Risk factors */}
      {risks.length > 0 && (
        <>
          <div style={{ padding: '10px 12px', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
            Risk Factors
          </div>
          {risks.map((risk, index) => {
            const color = risk.level === 'danger' ? 'var(--red)' : risk.level === 'warn' ? 'var(--yellow)' : 'var(--text-muted)';
            const badgeLabel = risk.level === 'danger' ? 'DANGER' : risk.level === 'warn' ? 'WARN' : 'INFO';
            return (
              <div key={index} style={{ display: 'flex', gap: 8, padding: '6px 12px', borderBottom: '1px solid rgba(33,38,45,.07)', alignItems: 'flex-start' }}>
                <span className="risk-badge" style={{ background: `${color.replace('var(--red)', '#f85149').replace('var(--yellow)', '#e3b341').replace('var(--text-muted)', '#484f58')}22`, color, border: `1px solid ${color.replace('var(--red)', '#f85149').replace('var(--yellow)', '#e3b341').replace('var(--text-muted)', '#484f58')}44` }}>
                  {badgeLabel}
                </span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 1, fontSize: 10 }}>{risk.name || ''}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 9, lineHeight: 1.4 }}>{risk.description || ''}</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}