import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { calcTargets } from '../utils.js';

// Determines precision and minMove based on last close price
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
  const resizeObserverRef = useRef(null);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Rebuild chart when data, EMA setting, or price targets change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Disconnect previous resize observer and remove previous chart
    resizeObserverRef.current?.disconnect();
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    if (!ohlcv?.length) return;

    const lastClose = ohlcv[ohlcv.length - 1]?.c || 0;
    const { precision: pricePrecision, minMove } = getPriceFormat(lastClose);

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
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false } },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    chart.timeScale().applyOptions({ rightOffset: 5 });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#f85149',
      borderUpColor: '#22c55e', borderDownColor: '#f85149',
      wickUpColor: '#22c55e', wickDownColor: '#f85149',
      priceFormat: { type: 'price', precision: pricePrecision, minMove },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#21262d',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    candleSeries.setData(ohlcv.map(candle => ({
      time: Math.floor(candle.t / 1000),
      open: candle.o, high: candle.h, low: candle.l, close: candle.c,
    })));
    volumeSeries.setData(ohlcv.map(candle => ({
      time: Math.floor(candle.t / 1000),
      value: candle.v,
      color: candle.c >= candle.o ? '#22c55e33' : '#f8514933',
    })));

    if (showEma && ohlcv.length >= 20) {
      const closes = ohlcv.map(c => c.c);
      const ema20 = calcEma(closes, 20);
      const ema50 = calcEma(closes, 50);
      const sharedLineOptions = {
        lineWidth: 1, priceLineVisible: false,
        lastValueVisible: false, crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: pricePrecision, minMove },
      };
      const ema20Series = chart.addLineSeries({ ...sharedLineOptions, color: '#e3b341' });
      const ema50Series = chart.addLineSeries({ ...sharedLineOptions, color: '#58a6ff' });
      ema20Series.setData(ohlcv.map((c, i) => ({ time: Math.floor(c.t / 1000), value: ema20[i] })));
      ema50Series.setData(ohlcv.map((c, i) => ({ time: Math.floor(c.t / 1000), value: ema50[i] })));
    }

    if (priceUsd > 0) {
      const targets = calcTargets(priceUsd);
      const addPriceLine = (price, color, title, dashed) => {
        if (!price || price <= 0) return;
        try {
          candleSeries.createPriceLine({
            price, color, lineWidth: 1,
            lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
            axisLabelVisible: true, title,
          });
        } catch (_) {}
      };
      addPriceLine(targets.sl, '#f85149', '🛑 SL', true);
      addPriceLine(targets.buyZone, '#e3b341', '📥 BUY', true);
      addPriceLine(targets.t1, '#22c55e', '🎯 T1', true);
      addPriceLine(targets.t2, '#00e5ff', '🚀 T2', true);
      addPriceLine(targets.cur, '#ffffff', '● NOW', false);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;
  }, [ohlcv, showEma, priceUsd]);

  const showOverlay = loading || !ohlcv?.length;

  return (
    <div style={{ flex: 1, height: '420px', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {showOverlay && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', background: '#060610', fontSize: 11,
        }}>
          {loading
            ? <><span className="spin" style={{ marginRight: 6 }}>⟳</span>Loading chart…</>
            : 'No chart data'}
        </div>
      )}
    </div>
  );
}