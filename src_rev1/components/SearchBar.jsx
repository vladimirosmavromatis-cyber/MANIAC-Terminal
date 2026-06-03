export default function SearchBar({ value, onChange, onScan }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 110,
      zIndex: 100,
    }}>
      <input
        className="search-input"
        type="text"
        placeholder="Enter Solana mint address…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onScan(value)}
      />
      <button className="scan-btn" onClick={() => onScan(value)}>
        ⚡ Scan
      </button>
    </div>
  );
}