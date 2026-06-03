import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { calcTargets } from '../utils.js';

function getPriceFormat(p) {
  if (p < 0.000001) return { precision: 10, minMove: 0.0000000001 };
  if (p < 0.0001)   return { precision: 8,  minMove: 0.00000001 };
  if (p < 0.01)     return { precision: 6,  minMove: 0.000001 };
  if (p < 1)        return { precision: 4,  minMove: 0.0001 };
  return { precision: 2, minMove: 0.01 };
}

function ema(arr, period) {
  const k = 2 / (period + 1);
  let e = arr[0];
  return arr.map(v => { e = v * k + e * (1 - k); return e; });
}

function sma(arr, period) {
  return arr.map((_, i) => {
    if (i < period - 1) return null;
    return arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function bollingerBands(closes, period = 20, mult = 2) {
  const mid = sma(closes, period);
  return closes.map((_, i) => {
    if (i < period - 1) return { upper: null, mid: null, lower: null };
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i];
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { upper: mean + mult * std, mid: mean, lower: mean - mult * std };
  });
}

function vwap(ohlcv) {
  let cumPV = 0, cumV = 0;
  return ohlcv.map(c => {
    const tp = (c.h + c.l + c.c) / 3;
    cumPV += tp * c.v; cumV += c.v;
    return cumV > 0 ? cumPV / cumV : tp;
  });
}

function rsi(closes, period = 14) {
  const changes = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
  const gains = ema(changes.map(c => Math.max(c, 0)), period);
  const losses = ema(changes.map(c => Math.max(-c, 0)), period);
  return closes.map((_, i) => {
    if (i < period) return null;
    const rs = losses[i] === 0 ? 100 : gains[i] / losses[i];
    return 100 - 100 / (1 + rs);
  });
}

function macd(closes) {
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const line = closes.map((_, i) => e12[i] - e26[i]);
  const sig  = ema(line, 9);
  return { line, signal: sig, hist: line.map((v, i) => v - sig[i]) };
}

const DARK = {
  layout: { background: { color: '#060610' }, textColor: '#636e7b' },
  grid: { vertLines: { color: '#21262d44' }, horzLines: { color: '#21262d44' } },
};

function removeS(chart, ref, key) {
  if (ref.current[key]) {
    try { chart.removeSeries(ref.current[key]); } catch (_) {}
    ref.current[key] = null;
  }
}

export default function LWChart({ ohlcv, showEma, priceUsd, loading, indicators = {}, avgEntry = 0, avgExit = 0 }) {
  const mainRef = useRef(null);
  const rsiRef  = useRef(null);
  const macdRef = useRef(null);
  const charts  = useRef({ main: null, rsi: null, macd: null });
  const ser     = useRef({});
  const pls     = useRef([]);
  const ros     = useRef([]);

  // ── Create main chart once ──
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const chart = createChart(el, {
      ...DARK,
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#484f58' }, horzLine: { color: '#484f58' } },
      rightPriceScale: { borderColor: '#21262d', scaleMargins: { top: 0.1, bottom: 0.3 } },
      timeScale: { borderColor: '#21262d', timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
      width: el.clientWidth, height: el.clientHeight,
    });
    chart.timeScale().applyOptions({ rightOffset: 5 });
    ser.current.candle = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#f85149',
      borderUpColor: '#22c55e', borderDownColor: '#f85149',
      wickUpColor: '#22c55e', wickDownColor: '#f85149',
      priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 },
    });
    ser.current.volume = chart.addHistogramSeries({ color: '#21262d', priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    charts.current.main = chart;
    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el); ros.current.push(ro);
    return () => { ro.disconnect(); chart.remove(); charts.current.main = null; };
  }, []);

  // ── Update main chart data & indicators ──
  useEffect(() => {
    const chart = charts.current.main;
    const candle = ser.current.candle;
    const vol = ser.current.volume;
    if (!chart || !candle || !vol || !ohlcv?.length) return;

    const closes = ohlcv.map(c => c.c);
    const times  = ohlcv.map(c => Math.floor(c.t / 1000));
    const last   = closes[closes.length - 1] || 0;
    const fmt    = { type: 'price', ...getPriceFormat(last) };

    candle.applyOptions({ priceFormat: fmt });
    candle.setData(ohlcv.map(c => ({ time: Math.floor(c.t / 1000), open: c.o, high: c.h, low: c.l, close: c.c })));
    vol.setData(ohlcv.map(c => ({ time: Math.floor(c.t / 1000), value: c.v, color: c.c >= c.o ? '#22c55e33' : '#f8514933' })));

    const addLine = (key, color, lw, dash, opts = {}) => {
      if (ser.current[key]) return;
      ser.current[key] = chart.addLineSeries({
        color, lineWidth: lw,
        lineStyle: dash ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        priceFormat: fmt, ...opts,
      });
    };
    const rem = (key) => removeS(chart, ser, key);
    const setData = (key, data) => ser.current[key]?.setData(data.filter(d => d.value != null));

    // EMA 20 & 50
    if (showEma && closes.length >= 20) {
      addLine('ema20', '#e3b341', 1, false);
      addLine('ema50', '#58a6ff', 1, false);
      const e20 = ema(closes, 20), e50 = ema(closes, 50);
      setData('ema20', times.map((t, i) => ({ time: t, value: e20[i] })));
      setData('ema50', times.map((t, i) => ({ time: t, value: e50[i] })));
    } else { rem('ema20'); rem('ema50'); }

    // SMA 20
    if (indicators.sma20 && closes.length >= 20) {
      addLine('sma20', '#ff6b6b', 1, true);
      setData('sma20', times.map((t, i) => ({ time: t, value: sma(closes, 20)[i] })));
    } else rem('sma20');

    // SMA 50
    if (indicators.sma50 && closes.length >= 50) {
      addLine('sma50', '#ff9f43', 1, true);
      setData('sma50', times.map((t, i) => ({ time: t, value: sma(closes, 50)[i] })));
    } else rem('sma50');

    // SMA 200
    if (indicators.sma200 && closes.length >= 200) {
      addLine('sma200', '#a29bfe', 1, true);
      setData('sma200', times.map((t, i) => ({ time: t, value: sma(closes, 200)[i] })));
    } else rem('sma200');

    // Bollinger Bands
    if (indicators.bb && closes.length >= 20) {
      const bb = bollingerBands(closes);
      addLine('bb_upper', '#fd79a888', 1, false);
      addLine('bb_mid',   '#fd79a8',   1, true);
      addLine('bb_lower', '#fd79a888', 1, false);
      setData('bb_upper', times.map((t, i) => ({ time: t, value: bb[i].upper })));
      setData('bb_mid',   times.map((t, i) => ({ time: t, value: bb[i].mid })));
      setData('bb_lower', times.map((t, i) => ({ time: t, value: bb[i].lower })));
    } else { rem('bb_upper'); rem('bb_mid'); rem('bb_lower'); }

    // VWAP
    if (indicators.vwap) {
      addLine('vwap', '#00cec9', 2, false, { lastValueVisible: true });
      const v = vwap(ohlcv);
      setData('vwap', times.map((t, i) => ({ time: t, value: v[i] })));
    } else rem('vwap');

    // Price lines: targets + avg entry/exit
    pls.current.forEach(pl => { try { candle.removePriceLine(pl); } catch (_) {} });
    pls.current = [];
    const pl = (price, color, title, dashed) => {
      if (!price || price <= 0) return;
      try { pls.current.push(candle.createPriceLine({ price, color, lineWidth: 1, lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid, axisLabelVisible: true, title })); } catch (_) {}
    };
    if (priceUsd > 0) {
      const t = calcTargets(priceUsd);
      pl(t.sl,      '#f85149', '🛑 SL',  true);
      pl(t.buyZone, '#e3b341', '📥 BUY', true);
      pl(t.t1,      '#22c55e', '🎯 T1',  true);
      pl(t.t2,      '#00e5ff', '🚀 T2',  true);
      pl(t.cur,     '#ffffff', '● NOW',  false);
    }
    if (avgEntry > 0) pl(avgEntry, '#f9ca24', '📊 AVG IN',  true);
    if (avgExit  > 0) pl(avgExit,  '#ff7979', '📊 AVG OUT', true);

    chart.timeScale().fitContent();
  }, [ohlcv, showEma, priceUsd, indicators, avgEntry, avgExit]);

  // ── RSI sub-chart ──
  useEffect(() => {
    const el = rsiRef.current;
    if (!el) return;
    if (!indicators.rsi || !ohlcv?.length) {
      if (charts.current.rsi) { charts.current.rsi.remove(); charts.current.rsi = null; ser.current.rsi_line = ser.current.rsi_ob = ser.current.rsi_os = null; }
      return;
    }
    const closes = ohlcv.map(c => c.c);
    const rsiData = rsi(closes);

    if (!charts.current.rsi) {
      const chart = createChart(el, {
        ...DARK,
        rightPriceScale: { borderColor: '#21262d', scaleMargins: { top: 0.05, bottom: 0.05 }, mode: 0 },
        timeScale: { visible: false },
        handleScroll: false, handleScale: false,
        width: el.clientWidth, height: el.clientHeight,
      });
      ser.current.rsi_line = chart.addLineSeries({ color: '#9b59b6', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, priceFormat: { type: 'price', precision: 1, minMove: 0.1 } });
      ser.current.rsi_ob   = chart.addLineSeries({ color: '#f8514966', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      ser.current.rsi_os   = chart.addLineSeries({ color: '#22c55e66', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      charts.current.rsi = chart;
      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
      ro.observe(el); ros.current.push(ro);
    }
    const times = ohlcv.map(c => Math.floor(c.t / 1000));
    ser.current.rsi_line?.setData(times.map((t, i) => ({ time: t, value: rsiData[i] })).filter(d => d.value != null));
    ser.current.rsi_ob?.setData(times.map(t => ({ time: t, value: 70 })));
    ser.current.rsi_os?.setData(times.map(t => ({ time: t, value: 30 })));
  }, [ohlcv, indicators.rsi]);

  // ── MACD sub-chart ──
  useEffect(() => {
    const el = macdRef.current;
    if (!el) return;
    if (!indicators.macd || !ohlcv?.length) {
      if (charts.current.macd) { charts.current.macd.remove(); charts.current.macd = null; ser.current.macd_line = ser.current.macd_sig = ser.current.macd_hist = null; }
      return;
    }
    const closes = ohlcv.map(c => c.c);
    const { line, signal, hist } = macd(closes);

    if (!charts.current.macd) {
      const chart = createChart(el, {
        ...DARK,
        rightPriceScale: { borderColor: '#21262d', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '#21262d', timeVisible: true, secondsVisible: false },
        handleScroll: false, handleScale: false,
        width: el.clientWidth, height: el.clientHeight,
      });
      ser.current.macd_line = chart.addLineSeries({ color: '#0984e3', lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      ser.current.macd_sig  = chart.addLineSeries({ color: '#d63031', lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      ser.current.macd_hist = chart.addHistogramSeries({ priceScaleId: 'right', priceLineVisible: false });
      charts.current.macd = chart;
      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
      ro.observe(el); ros.current.push(ro);
    }
    const times = ohlcv.map(c => Math.floor(c.t / 1000));
    ser.current.macd_line?.setData(times.map((t, i) => ({ time: t, value: line[i] })));
    ser.current.macd_sig?.setData(times.map((t, i) => ({ time: t, value: signal[i] })));
    ser.current.macd_hist?.setData(times.map((t, i) => ({ time: t, value: hist[i], color: hist[i] >= 0 ? '#22c55e88' : '#f8514988' })));
  }, [ohlcv, indicators.macd]);

  // ── Cleanup on unmount ──
  useEffect(() => () => {
    ros.current.forEach(r => r.disconnect());
    Object.values(charts.current).forEach(c => { try { c?.remove(); } catch (_) {} });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      {/* Main chart */}
      <div style={{ position: 'relative', flex: 1, minHeight: 260 }}>
        <div ref={mainRef} style={{ width: '100%', height: '100%' }} />
        {loading && !ohlcv?.length && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: '#060610', fontSize: 11 }}>
            <span className="spin" style={{ marginRight: 6 }}>⟳</span>Loading chart…
          </div>
        )}
      </div>
      {/* RSI panel */}
      {indicators.rsi && (
        <div style={{ height: 80, borderTop: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: 6, fontSize: 9, color: '#9b59b6', fontWeight: 800, zIndex: 1, pointerEvents: 'none' }}>RSI 14</div>
          <div ref={rsiRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {/* MACD panel */}
      {indicators.macd && (
        <div style={{ height: 90, borderTop: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: 6, fontSize: 9, color: '#0984e3', fontWeight: 800, zIndex: 1, pointerEvents: 'none' }}>
            MACD <span style={{ color: '#d63031' }}>Signal</span> <span style={{ color: '#484f58' }}>Hist</span>
          </div>
          <div ref={macdRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}