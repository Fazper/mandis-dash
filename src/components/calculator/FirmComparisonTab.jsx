import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import ResultRow from './ResultRow';
import { computeAll } from '../../utils/calculations';
import firms from '../../data/firms.json';

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };
const TICK = { fill: '#a0a0a0', fontSize: 11 };

export default function FirmComparisonTab({ edge, rPerTrade }) {
  const firmResults = useMemo(() => {
    return firms.map(firm => {
      const results = computeAll({
        challengeCost: firm.challengeCost,
        profitTarget: firm.profitTarget,
        eodDrawdown: firm.eodDrawdown,
        payoutCap: firm.payoutCap,
        withdrawalPct: firm.withdrawalPct,
        platformSplit: firm.platformSplit,
        rPerTrade,
        tradesPerDay: 2,
        dailyLossStop: 2,
        numAccounts: 5,
      }, edge);
      return { firm, results };
    });
  }, [edge, rPerTrade]);

  const comparisonData = firmResults.map(({ firm, results }) => ({
    name: firm.shortName,
    ROI: Math.round(results.roi),
    'Net Profit': Math.round(results.netProfit),
  }));

  return (
    <>
      <div className="calc-panel" style={{ marginBottom: 16 }}>
        <p className="calc-subtitle">
          Comparing with edge: {(edge.winRate * 100).toFixed(0)}% WR · {edge.rr} R:R · ${rPerTrade.toLocaleString()} R size
        </p>
      </div>

      <div className="calc-firm-grid">
        {firmResults.map(({ firm, results }) => (
          <div key={firm.id} className="calc-panel">
            <div className="calc-section-header">
              <span className="calc-section-icon">🏦</span>
              <h3>{firm.name}</h3>
            </div>
            <div className="calc-firm-stats">
              <div className="calc-stat-card compact">
                <div className="calc-stat-value orange">{Math.round(results.roi)}%</div>
                <div className="calc-stat-label">ROI</div>
              </div>
              <div className="calc-stat-card compact">
                <div className="calc-stat-value green">${Math.round(results.netProfit).toLocaleString()}</div>
                <div className="calc-stat-label">Net/Cycle</div>
              </div>
            </div>
            <ResultRow label="Challenge Cost" value={`$${firm.challengeCost}`} />
            <ResultRow label="Profit Target" value={`$${firm.profitTarget.toLocaleString()}`} />
            <ResultRow label="EOD Drawdown" value={`$${firm.eodDrawdown.toLocaleString()}`} />
            <ResultRow label="Payout Cap" value={`$${firm.payoutCap.toLocaleString()}`} />
            <ResultRow label="Split" value={`${100 - firm.platformSplit}/${firm.platformSplit}`} />
            <ResultRow label="Days to Payout" value={`~${results.daysToTarget.toFixed(1)}`} />
            <ResultRow label="Pass Rate" value={`~${results.passRate.toFixed(1)}%`} />
            <ResultRow label="Cost per Payout" value={`$${results.costPerPayout.toFixed(2)}`} warn />
            <ResultRow label="Max Safe R" value={`$${results.maxSafeR.toFixed(0)}`} warn={rPerTrade > results.maxSafeR} />
            <ResultRow label="Portfolio Net (5 accts)" value={`$${results.netProfit.toFixed(0)}`} highlight />
          </div>
        ))}
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">ROI Comparison</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="ROI" fill="var(--accent-orange)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Net Profit" fill="var(--accent-green)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
