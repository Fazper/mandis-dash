import { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { runMonteCarlo } from '../../utils/calculations';

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };
const TICK = { fill: '#a0a0a0', fontSize: 11 };
const CURVE_COLORS = ['#f59e0b', '#0088ff', '#00ff88', '#ff3b3b', '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function MonteCarloTab() {
  const [winRate, setWinRate] = useState(0.57);
  const [rr, setRr] = useState(1.5);
  const [rSize, setRSize] = useState(1000);
  const [numTrades, setNumTrades] = useState(60);
  const [numSims, setNumSims] = useState(1000);
  const [target, setTarget] = useState(9000);
  const [ruinLevel, setRuinLevel] = useState(-4500);
  const [runId, setRunId] = useState(0);

  const mc = useMemo(
    () => runMonteCarlo(winRate, rr, rSize, numTrades, numSims, target, ruinLevel),
    [winRate, rr, rSize, numTrades, numSims, target, ruinLevel, runId],
  );

  const handleRerun = useCallback(() => setRunId(prev => prev + 1), []);

  const displayCurves = 20;
  const spaghettiData = useMemo(() => {
    const curves = mc.curves.slice(0, displayCurves);
    const result = [];
    for (let t = 0; t <= numTrades; t++) {
      const point = { trade: t };
      curves.forEach((curve, i) => { point[`sim${i}`] = curve[t]?.balance ?? 0; });
      point.target = target;
      point.ruin = ruinLevel;
      result.push(point);
    }
    return result;
  }, [mc, numTrades, target, ruinLevel]);

  const histogramData = useMemo(() => {
    const balances = mc.finalBalances;
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const bucketCount = 30;
    const bucketSize = (max - min) / bucketCount || 1;
    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const lo = min + i * bucketSize;
      const hi = lo + bucketSize;
      const count = balances.filter(b => b >= lo && (i === bucketCount - 1 ? b <= hi : b < hi)).length;
      buckets.push({ range: `$${Math.round(lo / 1000)}K`, mid: Math.round((lo + hi) / 2), count });
    }
    return buckets;
  }, [mc]);

  return (
    <>
      <div className="calc-panel">
        <div className="calc-section-header">
          <span className="calc-section-icon">🎲</span>
          <h3>Monte Carlo Settings</h3>
        </div>
        <div className="calc-mc-inputs">
          {[
            { label: 'Win Rate', value: winRate, set: setWinRate, step: 0.01, min: 0.1, max: 0.9 },
            { label: 'R:R', value: rr, set: setRr, step: 0.1, min: 0.1, max: 5 },
            { label: 'R Size ($)', value: rSize, set: setRSize, step: 100, min: 100, max: 5000 },
            { label: 'Trades', value: numTrades, set: setNumTrades, step: 10, min: 10, max: 500 },
            { label: 'Simulations', value: numSims, set: setNumSims, step: 100, min: 100, max: 5000 },
            { label: 'Target ($)', value: target, set: setTarget, step: 1000, min: 1000, max: 50000 },
            { label: 'Ruin Level ($)', value: ruinLevel, set: setRuinLevel, step: 500, min: -20000, max: 0 },
          ].map(({ label, value, set, step, min, max }) => (
            <div key={label} className="calc-mc-field">
              <label>{label}</label>
              <input type="number" value={value} onChange={e => set(parseFloat(e.target.value) || 0)} step={step} min={min} max={max} />
            </div>
          ))}
          <div className="calc-mc-field">
            <label>&nbsp;</label>
            <button onClick={handleRerun} className="calc-mc-btn">Re-run</button>
          </div>
        </div>
      </div>

      <div className="calc-stat-grid">
        <div className="calc-stat-card"><div className="calc-stat-value green">{mc.probTarget.toFixed(1)}%</div><div className="calc-stat-label">P(Hit Target)</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value red">{mc.probRuin.toFixed(1)}%</div><div className="calc-stat-label">P(Hit Ruin)</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value orange">${mc.percentiles.p50.toLocaleString()}</div><div className="calc-stat-label">Median Final P&L</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value blue">${mc.percentiles.p90.toLocaleString()}</div><div className="calc-stat-label">90th Percentile</div></div>
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">Equity Curves ({displayCurves} of {numSims} shown)</h4>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={spaghettiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="trade" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Line type="monotone" dataKey="target" stroke="var(--accent-green)" strokeDasharray="8 4" strokeWidth={2} dot={false} name="Target" />
            <Line type="monotone" dataKey="ruin" stroke="var(--accent-red)" strokeDasharray="8 4" strokeWidth={2} dot={false} name="Ruin" />
            {Array.from({ length: displayCurves }).map((_, i) => (
              <Line key={i} type="monotone" dataKey={`sim${i}`} stroke={CURVE_COLORS[i % CURVE_COLORS.length]} strokeWidth={1} strokeOpacity={0.5} dot={false} legendType="none" />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">Final P&L Distribution</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="range" tick={TICK} interval={2} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} name="Frequency" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">Percentile Breakdown</h4>
        <div className="calc-percentile-grid">
          {[
            { label: '10th', value: mc.percentiles.p10, cls: 'red' },
            { label: '25th', value: mc.percentiles.p25, cls: 'orange' },
            { label: '50th', value: mc.percentiles.p50, cls: 'orange' },
            { label: '75th', value: mc.percentiles.p75, cls: 'blue' },
            { label: '90th', value: mc.percentiles.p90, cls: 'green' },
          ].map((p) => (
            <div key={p.label} className="calc-percentile-item">
              <div className="calc-percentile-label">{p.label} %ile</div>
              <div className={`calc-percentile-value ${p.cls}`}>${p.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
