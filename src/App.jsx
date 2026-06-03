import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchFeed, fetchDexScreener, fetchRugCheck, fetchSolanaTracker,
  fetchOHLCV, fetchTrades, fetchHolders, fetchSNSNames,
} from './api.js';
import Nav from './components/Nav.jsx';
import SearchBar from './components/SearchBar.jsx';
import Ticker from './components/Ticker.jsx';
import FeedView from './components/FeedView.jsx';
import ScannerView from './components/ScannerView.jsx';
import TerminalView from './components/TerminalView.jsx';
import AnalyticsView from './components/AnalyticsView.jsx';
import WatchlistView, { useWatchlist } from './components/WatchlistView.jsx';
import PortfolioView from './components/PortfolioView.jsx';
import AlertsView, { useAlerts, useAlertChecker } from './components/AlertsView.jsx';
import WalletTrackerView from './components/WalletTrackerView.jsx';

function loadRecentScans() {
  try { return JSON.parse(localStorage.getItem('cyb_recent') || '[]'); } catch { return []; }
}
function saveRecentScans(list) {
  try { localStorage.setItem('cyb_recent', JSON.stringify(list)); } catch (_) {}
}

const TERMINAL_MODES = new Set(['scanner', 'trending', 'smart', 'signals']);

export default function App() {
  const [mode, setMode] = useState('feed');

  // Feed
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedTokens, setFeedTokens] = useState([]);
  const [feedError, setFeedError] = useState('');

  // Scan
  const [scanInput, setScanInput] = useState('');
  const [scanMint, setScanMint] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState('');
  const [dex, setDex] = useState(null);
  const [rug, setRug] = useState(null);
  const [tab, setTab] = useState('trades');

  // Trades
  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const tradesTimerRef = useRef(null);

  // Chart
  const [ohlcv, setOhlcv] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartTf, setChartTf] = useState('15m');
  const [showEma, setShowEma] = useState(true);

  // Holders (from Helius)
  const [holders, setHolders] = useState([]);
  const [holderCount, setHolderCount] = useState(0);

  // SNS names
  const [snsNames, setSnsNames] = useState({});
  const [snsLoading, setSnsLoading] = useState(false);

  // Wallet
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);

  // DCA calculator
  const [dcaAmt, setDcaAmt] = useState(50);
  const [dcaFreq, setDcaFreq] = useState('weekly');
  const [dcaPeriods, setDcaPeriods] = useState(12);

  // Copy-to-clipboard state
  const [copiedKey, setCopiedKey] = useState('');

  // Recent scans (persisted in localStorage)
  const [recentScans, setRecentScans] = useState(loadRecentScans);

  // Watchlist
  const { watchlist, isWatched, toggleWatchlist, removeFromWatchlist, updatePrice } = useWatchlist();

  // Alerts
  const { alerts, addAlert, removeAlert, triggerAlert } = useAlerts();
  const currentPrice = dex?.pair?.priceUsd ? +(dex.pair.priceUsd) : 0;
  useAlertChecker(alerts, triggerAlert, scanMint, currentPrice);

  // ── Feed ──────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError('');
    setFeedTokens([]);
    try {
      const tokens = await fetchFeed();
      setFeedTokens(tokens);
      if (!tokens.length) setFeedError('Could not load — check internet.');
    } catch {
      setFeedError('Could not load — check internet.');
    }
    setFeedLoading(false);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // ── Chart & Trades refresh helpers ───────────────
  const loadOHLCV = useCallback(async (pairAddress, tf) => {
    if (!pairAddress) return;
    setChartLoading(true);
    const data = await fetchOHLCV(pairAddress, tf);
    setOhlcv(data);
    setChartLoading(false);
  }, []);

  const loadTrades = useCallback(async (pairAddress) => {
    if (!pairAddress) return;
    setTradesLoading(true);
    const data = await fetchTrades(pairAddress);
    setTrades(data);
    setTradesLoading(false);
  }, []);

  // ── Scan ──────────────────────────────────────────
  const doScan = useCallback(async (mintAddress) => {
    const cleanMint = (mintAddress || '').trim();
    if (cleanMint.length < 32 || cleanMint.length > 44) {
      setScanError('Enter a valid Solana mint address.');
      return;
    }

    clearInterval(tradesTimerRef.current);
    setScanBusy(true);
    setScanError('');
    setScanMint(cleanMint);
    setMode('scan');
    setTab('trades');
    setDex(null);
    setRug(null);
    setTrades([]);
    setOhlcv([]);
    setHolders([]);
    setHolderCount(0);
    setSnsNames({});

    setRecentScans(prev => {
      const updated = [{ mint: cleanMint, symbol: '…', logoUrl: '', timestamp: Date.now() }, ...prev.filter(r => r.mint !== cleanMint)].slice(0, 10);
      saveRecentScans(updated);
      return updated;
    });

    let dexData = null;
    try {
      dexData = await fetchDexScreener(cleanMint);
      setDex(dexData);
    } catch (error) {
      setScanError(error.message || 'DexScreener request failed.');
      setScanBusy(false);
      return;
    }

    const symbol = dexData.pair.baseToken?.symbol || '';
    const logoUrl = dexData.pair.info?.imageUrl || '';
    setRecentScans(prev => {
      const updated = prev.map(r => r.mint === cleanMint ? { ...r, symbol, logoUrl } : r);
      saveRecentScans(updated);
      return updated;
    });

    setScanBusy(false);

    fetchRugCheck(cleanMint).then(rugData => { if (rugData) setRug(rugData); });
    fetchSolanaTracker(cleanMint).then(count => { if (count > 0) setHolderCount(count); });
    loadOHLCV(dexData.pair.pairAddress, chartTf);
    loadTrades(dexData.pair.pairAddress);

    fetchHolders(cleanMint, []).then(async ({ holders: fetchedHolders, count }) => {
      if (fetchedHolders.length) {
        setHolders(fetchedHolders);
        if (count > 0) setHolderCount(count);
        const addresses = fetchedHolders.slice(0, 50).map(h => h.address).filter(Boolean);
        if (addresses.length) {
          setSnsLoading(true);
          const names = await fetchSNSNames(addresses);
          setSnsNames(names);
          setSnsLoading(false);
        }
      }
    });

    tradesTimerRef.current = setInterval(() => {
      loadTrades(dexData.pair.pairAddress);
      loadOHLCV(dexData.pair.pairAddress, chartTf);
    }, 10000);
  }, [chartTf, loadOHLCV, loadTrades]);

  const handleSetChartTf = useCallback((tf) => {
    setChartTf(tf);
    setOhlcv([]);
    if (dex?.pair?.pairAddress) loadOHLCV(dex.pair.pairAddress, tf);
  }, [dex, loadOHLCV]);

  useEffect(() => () => clearInterval(tradesTimerRef.current), []);

  // ── Mode switching ────────────────────────────────
  const handleSetMode = useCallback((m) => {
    clearInterval(tradesTimerRef.current);
    setMode(m);
    if (m === 'feed' && !feedTokens.length && !feedLoading) loadFeed();
  }, [feedTokens, feedLoading, loadFeed]);

  const handleCopy = useCallback((text, key) => {
    try { navigator.clipboard.writeText(text); } catch (_) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1400);
  }, []);

  const handleConnectWallet = useCallback(async () => {
    const phantom = window.phantom?.solana || window.solana;
    if (!phantom?.isPhantom) {
      alert('Phantom wallet not found. Please install it from phantom.app');
      return;
    }
    try {
      const response = await phantom.connect();
      setWalletAddress(response.publicKey.toString());
      setWalletConnected(true);
    } catch (error) {
      console.warn('Wallet connect failed:', error);
    }
  }, []);

  const handleDisconnectWallet = useCallback(async () => {
    try {
      const phantom = window.phantom?.solana || window.solana;
      await phantom?.disconnect();
    } catch (_) {}
    setWalletAddress(null);
    setWalletConnected(false);
  }, []);

  return (
    <div>
      <Ticker tokens={feedTokens} onSelectToken={doScan} />
      <Nav
        mode={mode}
        scanMint={scanMint}
        recentScans={recentScans}
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        alertCount={alerts.filter(a => !a.triggered).length}
        watchlistCount={watchlist.length}
        onSetMode={handleSetMode}
        onSelectRecent={doScan}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onScan={doScan}
      />

      {mode === 'feed' && (
        <FeedView
          loading={feedLoading}
          tokens={feedTokens}
          error={feedError}
          onSelectToken={doScan}
        />
      )}

      {TERMINAL_MODES.has(mode) && (
        <TerminalView mode={mode} onScan={doScan} />
      )}

      {mode === 'analytics' && (
        <AnalyticsView onScan={doScan} />
      )}

      {mode === 'watchlist' && (
        <WatchlistView
          watchlist={watchlist}
          onScan={doScan}
          onRemove={removeFromWatchlist}
        />
      )}

      {mode === 'portfolio' && (
        <PortfolioView
          walletAddress={walletAddress}
          walletConnected={walletConnected}
          onScan={doScan}
          onConnectWallet={handleConnectWallet}
        />
      )}

      {mode === 'alerts' && (
        <AlertsView
          alerts={alerts}
          onRemove={removeAlert}
          onScan={doScan}
          currentMint={scanMint}
          currentPrice={currentPrice}
        />
      )}

      {mode === 'tracker' && (
        <WalletTrackerView onScan={doScan} />
      )}

      {mode === 'scan' && (
        <ScannerView
          scanBusy={scanBusy}
          scanErr={scanError}
          dex={dex}
          rug={rug}
          mint={scanMint}
          tab={tab}
          onSetTab={setTab}
          trades={trades}
          tradesLoading={tradesLoading}
          ohlcv={ohlcv}
          chartLoading={chartLoading}
          chartTf={chartTf}
          showEma={showEma}
          onSetChartTf={handleSetChartTf}
          onToggleEma={() => setShowEma(v => !v)}
          holders={holders}
          holderCount={holderCount}
          snsNames={snsNames}
          snsLoading={snsLoading}
          dcaAmt={dcaAmt}
          dcaFreq={dcaFreq}
          dcaPeriods={dcaPeriods}
          onSetDcaAmt={setDcaAmt}
          onSetDcaFreq={setDcaFreq}
          onSetDcaPeriods={setDcaPeriods}
          copiedKey={copiedKey}
          onCopy={handleCopy}
          isWatched={dex?.pair ? isWatched(scanMint) : false}
          onToggleWatchlist={() => {
            if (dex?.pair) {
              toggleWatchlist({
                mint: scanMint,
                symbol: dex.pair.baseToken?.symbol || '?',
                logoUrl: dex.pair.info?.imageUrl || '',
                price: +(dex.pair.priceUsd || 0),
                change24h: +(dex.pair.priceChange?.h24 || 0),
                liq: +(dex.pair.liquidity?.usd || 0),
                vol24: +(dex.pair.volume?.h24 || 0),
              });
            }
          }}
          alerts={alerts}
          onAddAlert={(alert) => addAlert({
            ...alert,
            mint: scanMint,
            symbol: dex?.pair?.baseToken?.symbol || '?',
            logoUrl: dex?.pair?.info?.imageUrl || '',
          })}
        />
      )}
    </div>
  );
}