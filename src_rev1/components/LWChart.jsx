import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { calcTargets } from '../utils.js';

function getPriceFormat(lastClose) {
  if (lastClose < 0.000001) return { precision: 10, minMove: 0.0000000001 };
  if (lastClose < 0.0001)   return { precision: 8,  minMove: 0.00000001 };
  if (lastClose < 0.01)     return { precision: 6,  minMove: 0.000001 };
  if (lastClose < 1)        return { precision: 4,  minMove: 0.0001 };
  return { precision: 2, minMove: 0.01 };
}

function calcEma(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  return closes.map(close => { ema = close * k + ema * (1 - k); return ema; });
}

export default function LWChart({ ohlcv, showEma, priceUsd, loading }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({ candle: null, volume: null, ema20: null, ema50: null });
  const resizeObserverRef = useRef(null);
  const priceLineRefs = useRef([]);

  // Create chart once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: { background: { color: '#060610' }, textColor: '#636e7b' },
      grid: { vertLines: { color: '#21262d44' }, horzLines: { color: '#21262d44' } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#484f58', style: 0 },
        horzLine: { color: '#484f58', style: 0 },
      },
      rightPriceScale: { borderColor: '#21262d', scaleMargins: { top: 0.1, bottom: 0.3 } },
      timeScale: { borderColor: '#21262d', timeVisible: true, secondsVisible: false },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    chart.timeScale().applyOptions({ rightOffset: 5 });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#f85149',
      borderUpColor: '#22c55e', borderDownColor: '#f85149',
      wickUpColor: '#22c55e', wickDownColor: '#f85149',
      priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#21262d',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current.candle = candleSeries;
    seriesRef.current.volume = volumeSeries;

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;

    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  // Update data in-place whenever ohlcv/showEma/priceUsd changes — no chart destroy
  useEffect(() => {
    const chart = chartRef.current;
    const { candle: candleSeries, volume: volumeSeries } = seriesRef.current;
    if (!chart || !candleSeries || !volumeSeries || !ohlcv?.length) return;

    const lastClose = ohlcv[ohlcv.length - 1]?.c || 0;
    const { precision: pricePrecision, minMove } = getPriceFormat(lastClose);

    // Update price format
    candleSeries.applyOptions({ priceFormat: { type: 'price', precision: pricePrecision, minMove } });

    // Set candle + volume data
    candleSeries.setData(ohlcv.map(c => ({
      time: Math.floor(c.t / 1000),
      open: c.o, high: c.h, low: c.l, close: c.c,
    })));
    volumeSeries.setData(ohlcv.map(c => ({
      time: Math.floor(c.t / 1000),
      value: c.v,
      color: c.c >= c.o ? '#22c55e33' : '#f8514933',
    })));

    // Remove old EMA series
    if (seriesRef.current.ema20) { try { chart.removeSeries(seriesRef.current.ema20); } catch (_) {} seriesRef.current.ema20 = null; }
    if (seriesRef.current.ema50) { try { chart.removeSeries(seriesRef.current.ema50); } catch (_) {} seriesRef.current.ema50 = null; }

    if (showEma && ohlcv.length >= 20) {
      const closes = ohlcv.map(c => c.c);
      const ema20 = calcEma(closes, 20);
      const ema50 = calcEma(closes, 50);
      const shared = { lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: { type: 'price', precision: pricePrecision, minMove } };
      const e20 = chart.addLineSeries({ ...shared, color: '#e3b341' });
      const e50 = chart.addLineSeries({ ...shared, color: '#58a6ff' });
      e20.setData(ohlcv.map((c, i) => ({ time: Math.floor(c.t / 1000), value: ema20[i] })));
      e50.setData(ohlcv.map((c, i) => ({ time: Math.floor(c.t / 1000), value: ema50[i] })));
      seriesRef.current.ema20 = e20;
      seriesRef.current.ema50 = e50;
    }

    // Remove old price lines
    priceLineRefs.current.forEach(pl => { try { candleSeries.removePriceLine(pl); } catch (_) {} });
    priceLineRefs.current = [];

    if (priceUsd > 0) {
      const targets = calcTargets(priceUsd);
      const addLine = (price, color, title, dashed) => {
        if (!price || price <= 0) return;
        try {
          const pl = candleSeries.createPriceLine({
            price, color, lineWidth: 1,
            lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
            axisLabelVisible: true, title,
          });
          priceLineRefs.current.push(pl);
        } catch (_) {}
      };
      addLine(targets.sl,      '#f85149', '🛑 SL',  true);
      addLine(targets.buyZone, '#e3b341', '📥 BUY', true);
      addLine(targets.t1,      '#22c55e', '🎯 T1',  true);
      addLine(targets.t2,      '#00e5ff', '🚀 T2',  true);
      addLine(targets.cur,     '#ffffff', '● NOW',  false);
    }

    c