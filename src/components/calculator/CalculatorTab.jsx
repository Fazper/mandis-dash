import { useMemo } from 'react';
import InputPanel from './InputPanel';
import ResultRow from './ResultRow';
import { computeAll } from '../../utils/calculations';

export default function CalculatorTab({ edge, inputs, onEdgeChange, onInputChange }) {
  const r = useMemo(() => computeAll(inputs, edge), [inputs, edge]);

  return (
    <div className="calc-grid">
      <InputPanel
        edge={edge}
        inputs={inputs}
        onEdgeChange={onEdgeChange}
        onInputChange={onInputChange}
      />

      <div className="calc-panel">
        <div className="calc-section-header">
          <span className="calc-section-icon">📊</span>
          <h3>Core Metrics</h3>
        </div>
        <ResultRow label="Expectancy" value={`+${r.expectancyR.toFixed(4)}R`} highlight />
        <ResultRow label="Expected $/trade" value={`$${r.expectancyDollar.toFixed(2)}`} highlight />
        <ResultRow label="Expected $/day" value={`$${r.dailyExpected.toFixed(2)}`} />
        <ResultRow label="Profit Factor" value={r.profitFactor.toFixed(2)} />
        <ResultRow label="Full Kelly" value={`${r.fullKelly.toFixed(1)}%`} />
        <ResultRow label="Half Kelly" value={`${r.halfKelly.toFixed(1)}%`} />
        <ResultRow label="Max Safe R" value={`$${r.maxSafeR.toFixed(0)}`} warn={inputs.rPerTrade > r.maxSafeR} />

        <div className="calc-section-header">
          <span className="calc-section-icon">🎲</span>
          <h3>Probability</h3>
        </div>
        <ResultRow label="Est. Pass Rate" value={`~${r.passRate.toFixed(1)}%`} />
        <ResultRow label="Avg Attempts to Fund" value={`${r.challengeAttempts.toFixed(2)}×`} />
        <ResultRow label="Cost per Funded" value={`$${r.costPerFunded.toFixed(2)}`} />
        <ResultRow label="Funded Survival" value={`~${r.fundedSurvival.toFixed(1)}%`} />
        <ResultRow label="Cost per Payout" value={`$${r.costPerPayout.toFixed(2)}`} warn />

        <div className="calc-section-header">
          <span className="calc-section-icon">💰</span>
          <h3>Payout Cycle</h3>
        </div>
        <ResultRow label="Profit Needed" value={`$${r.profitNeeded.toFixed(0)}`} />
        <ResultRow label="Trades to Payout" value={`~${r.tradesToPayout.toFixed(1)}`} />
        <ResultRow label="Days to Payout" value={`~${r.daysToTarget.toFixed(1)}`} />
        <ResultRow label="Gross Payout" value={`$${r.grossPerPayout.toFixed(0)}`} />
        <ResultRow label="Platform Fee" value={`−$${r.platformFee.toFixed(0)}`} />
        <ResultRow label="Net per Payout" value={`$${r.netPerPayout.toFixed(0)}`} />

        <div className="calc-section-header">
          <span className="calc-section-icon">🚀</span>
          <h3>Portfolio ({inputs.numAccounts} Accounts)</h3>
        </div>
        <ResultRow label="Total Net Revenue" value={`$${r.totalNetRevenue.toFixed(0)}`} />
        <ResultRow label="Total Cycle Cost" value={`$${r.totalCost.toFixed(0)}`} />
        <ResultRow label="Net Profit/Cycle" value={`$${r.netProfit.toFixed(0)}`} highlight />
        <ResultRow label="ROI" value={`${r.roi.toFixed(0)}%`} highlight />

        <div className="calc-section-header">
          <span className="calc-section-icon">🛡️</span>
          <h3>Starting Buffer</h3>
        </div>
        <ResultRow label="Clean Run" value={`$${r.cleanBuffer.toFixed(0)}`} />
        <ResultRow label="Moderate Bad Streak" value={`$${r.moderateBuffer.toFixed(0)}`} />
        <ResultRow label="Worst Case" value={`$${r.worstBuffer.toFixed(0)}`} warn />
      </div>
    </div>
  );
}
