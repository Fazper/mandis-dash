import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ResponsiveContainer,
} from 'recharts';
import ResultRow from './ResultRow';
import { computeAll } from '../../utils/calculations';

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };
const TICK = { fill: '#a0a0a0', fontSize: 11 };

const DEFAULT_INPUTS = {
  challengeCost: 215, profitTarget: 9000, eodDrawdown: 4500,
  payoutCap: 5000, withdrawalPct: 50, platformSplit: 10,
  numAccounts: 5, rPerTrade: 1500, tradesPerDay: 2, dailyLossStop: 2,
};

function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <div className="calc-slider-group">
      <div className="calc-slider-header">
        <span className="calc-slider-label">{label}</span>
        <span className="calc-slider-value">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="calc-slider" />
      <div className="calc-slider-range">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function WhatIfTab() {
  const [winRate, setWinRate] = useState(0.57);
  const [rr, setRr] = useState(1.5);
  const [rSize, setRSize] = useState(1500);

  const edge = { winRate, rr };
  const inputs = { ...DEFAULT_INPUTS, rPerTrade: rSize };
  const results = useMemo(() => computeAll(inputs, edge), [winRate, rr, rSize]);

  const scenarios = useMemo(() => {
    return [500, 1000, 1500].map(r => {
      const res = computeAll({ ...DEFAULT_INPUTS, rPerTrade: r }, edge);
      return { name: `$${r}R`, ROI: Math.round(res.roi), 'Net Profit': Math.round(res.netProfit), 'Days to Payout': parseFloat(res.daysToTarget.toFixed(1)) };
    });
  }, [winRate, rr]);

  return (
    <>
      <div className="calc-panel">
        <div className="calc-section-header">
          <span className="calc-section-icon">🎛️</span>
          <h3>What-If Parameters</h3>
        </div>
        <p className="calc-subtitle">Drag sliders to see all outputs update live</p>
        <div className="calc-slider-grid">
          <Slider label="Win Rate" value={winRate} min={0.40} max={0.70} step={0.01} format={(v) => `${(v * 100).toFixed(0)}%`} onChange={setWinRate} />
          <Slider label="Reward:Risk" value={rr} min={0.5} max={3.0} step={0.1} format={(v) => `${v.toFixed(1)}`} onChange={setRr} />
          <Slider label="R Size" value={rSize} min={250} max={2000} step={50} format={(v) => `$${v.toLocaleString()}`} onChange={setRSize} />
        </div>
      </div>

      <div className="calc-stat-grid">
        <div className="calc-stat-card"><div className="calc-stat-value green">+{results.expectancyR.toFixed(3)}R</div><div className="calc-stat-label">Expectancy</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value green">${results.netPerPayout.toFixed(0)}</div><div className="calc-stat-label">Net/Payout</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value orange">{results.roi.toFixed(0)}%</div><div className="calc-stat-label">ROI</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value blue">~{results.daysToTarget.toFixed(1)}</div><div className="calc-stat-label">Days to Payout</div></div>
      </div>

      <div className="calc-chart-grid">
        <div className="calc-card">
          <h4 className="calc-card-title">ROI by R Size</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scenarios}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="ROI" fill="var(--accent-orange)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="calc-panel">
        <div className="calc-section-header">
          <span className="calc-section-icon">📊</span>
          <h3>Detailed Results</h3>
        </div>
        <div className="calc-grid">
          <div>
            <ResultRow label="Expectancy/trade" value={`$${results.expectancyDollar.toFixed(2)}`} highlight />
            <ResultRow label="Expected $/day" value={`$${results.dailyExpected.toFixed(2)}`} />
            <ResultRow label="Profit Factor" value={results.profitFactor.toFixed(2)} />
            <ResultRow label="Full Kelly" value={`${results.fullKelly.toFixed(1)}%`} />
            <ResultRow label="Pass Rate" value={`~${results.passRate.toFixed(1)}%`} />
          </div>
          <div>
            <ResultRow label="Cost per Payout" value={`$${results.costPerPayout.toFixed(2)}`} warn />
            <ResultRow label="Net Profit/Cycle" value={`$${results.netProfit.toFixed(0)}`} highlight />
            <ResultRow label="Max Safe R" value={`$${results.maxSafeR.toFixed(0)}`} warn={rSize > results.maxSafeR} />
            <ResultRow label="Funded Survival" value={`~${results.fundedSurvival.toFixed(1)}%`} />
          </div>
        </div>
      </div>
    </>
  );
}
