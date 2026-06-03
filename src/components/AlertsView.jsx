import { useState, useEffect, useCallback, useRef } from 'react';
import { fP, fAge } from '../utils.js';

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem('maniac_alerts') || '[]'); } catch { return []; }
}
function saveAlerts(list) {
  try { localStorage.setItem('maniac_alerts', JSON.stringify(list)); } catch (_) {}
}

export function useAlerts() {
  const [alerts, setAlerts] = useState(loadAlerts);

  const addAlert = (alert) => {
    setAlerts(prev => {
      const updated = [{ ...alert, id: Date.now(), triggered: false, createdAt: Date.now() }, ...prev].slice(0, 50);
      saveAlerts(updated);
      return updated;
    });
  };

  const removeAlert = (id) => {
    setAlerts(prev => {
      const updated = prev.filter(a => a.id !== id);
      saveAlerts(updated);
      return updated;
    });
  };

  const triggerAlert = (id) => {
    setAlerts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, triggered: true, triggeredAt: Date.now() } : a);
      saveAlerts(updated);
      return updated;
    });
  };

  return { alerts, addAlert, removeAlert, triggerAlert };
}

// Check alerts against current prices and fire notifications
export function useAlertChecker(alerts, triggerAlert, currentMint, currentPrice) {
  const checkedRef = useRef(new Set());

  useEffect(() => {
    if (!alerts.length || !currentPrice || !currentMint) return;
    alerts.forEach(alert => {
      if (alert.triggered) return;
      if (alert.mint !== currentMint) return;
      if (checkedRef.current.has(alert.id)) return;
      const hit = alert.direction === 'above' ? currentPrice >= alert.price : currentPrice <= alert.price;
      if (hit) {
        checkedRef.current.add(alert.id);
        triggerAlert(alert.id);
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`🚨 MANIAC Alert: ${alert.symbol}`, {
            body: `Price ${alert.direction === 'above' ? 'reached' : 'dropped to'} ${fP(currentPrice)} (target: ${fP(alert.price)})`,
            icon: alert.logoUrl || undefined,
          });
        }
      }
    });
  }, [alerts, currentPrice, currentMint, triggerAlert]);
}

export default function AlertsView({ alerts, onRemove, onScan, currentMint, currentPrice }) {
  const [notifPerm, setNotifPerm] = useState(Notification.permission);

  const requestNotif = async () => {
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const active = alerts.filter(a => !a.triggered);
  const triggered = alerts.filter(a => a.triggered);

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          🔔 Price Alerts
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 10, marginLeft: 6 }}>
            {active.length} active · {triggered.length} triggered
          </span>
        </div>
        {notifPerm !== 'granted' && (
          <button onClick={requestNotif}
            style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(227,179,65,.4)', color: 'var(--yellow)', background: 'rgba(227,179,65,.07)', cursor: 'pointer' }}>
            Enable Notifications
          </button>
        )}
        {notifPerm === 'granted' && (
          <span style={{ fontSize: 9, color: 'var(--green)' }}>✓ Notifications on</span>
        )}
      </div>

      {notifPerm === 'denied' && (
        <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 6, background: 'rgba(248,81,73,.07)', border: '1px solid rgba(248,81,73,.2)', fontSize: 10, color: 'var(--red)' }}>
          ⚠ Notifications are blocked. Enable them in your browser settings to receive alerts.
        </div>
      )}

      {!alerts.length && (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>No Alerts Set</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scan any token and use the alert button in the header to set price targets</div>
        </div>
      )}

      {/* Active alerts */}
      {active.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Active</div>
          {active.map(alert => {
            const isCurrentToken = alert.mint === currentMint;
            const dist = isCurrentToken && currentPrice
              ? ((alert.price - currentPrice) / currentPrice * 100)
              : null;
            return (
              <div key={alert.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, marginBottom: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {alert.logoUrl
                  ? <img src={alert.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => e.currentTarget.style.display='none'} />
                  : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(alert.symbol||'?')[0]}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 12 }}>{alert.symbol}</span>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: alert.direction === 'above' ? 'rgba(34,197,94,.1)' : 'rgba(248,81,73,.1)', color: alert.direction === 'above' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                      {alert.direction === 'above' ? '▲ ABOVE' : '▼ BELOW'} {fP(alert.price)}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    Set {fAge(alert.createdAt)} ago
                    {dist !== null && <span style={{ marginLeft: 6, color: Math.abs(dist) < 5 ? 'var(--yellow)' : 'var(--text-muted)' }}>· {dist > 0 ? '+' : ''}{dist.toFixed(1)}% away</span>}
                  </div>
                </div>
                <button onClick={() => onScan(alert.mint)}
                  style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  Scan
                </button>
                <button onClick={() => onRemove(alert.id)}
                  style={{ fontSize: 10, color: 'var(--red)', padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(248,81,73,.2)', background: 'rgba(248,81,73,.07)' }}>
                  ✕
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Triggered alerts */}
      {triggered.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6, marginTop: 12 }}>Triggered</div>
          {triggered.map(alert => (
            <div key={alert.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, marginBottom: 4, background: 'var(--bg-secondary)', border: '1px solid rgba(34,197,94,.2)', opacity: 0.7 }}>
              <div style={{ fontSize: 18 }}>✅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>{alert.symbol} — {alert.direction === 'above' ? '▲' : '▼'} {fP(alert.price)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Triggered {fAge(alert.triggeredAt)} ago</div>
              </div>
              <button onClick={() => onRemove(alert.id)}
                style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 3 }}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}