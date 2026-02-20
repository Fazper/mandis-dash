import { useMemo } from 'react';
import ResultRow from './ResultRow';
import { stressTest } from '../../utils/calculations';

export default function StressTestTab({ edge, inputs }) {
  const s = useMemo(
    () => stressTest(edge, inputs.eodDrawdown, inputs.rPerTrade, inputs.dailyLossStop),
    [edge, inputs.eodDrawdown, inputs.rPerTrade, inputs.dailyLossStop],
  );

  return (
    <div className="calc-stress-container">
      <div className="calc-panel">
        <div className="calc-section-header">
          <span className="calc-section-icon">🔥</span>
          <h3>Losing Streak Analysis</h3>
        </div>
        <p className="calc-subtitle">
          Based on {(edge.winRate * 100).toFixed(0)}% WR → P(loss) = {((1 - edge.winRate) * 100).toFixed(0)}% per trade
        </p>

        <div className="calc-block">
          <div className="calc-block-title accent">Expected Max Consecutive Losses</div>
          <ResultRow label="Over 100 trades" value={`~${s.maxStreak100} losses`} warn />
          <ResultRow label="Over 500 trades" value={`~${s.maxStreak500} losses`} warn />
        </div>

        <div className="calc-block">
          <div className="calc-block-title accent">P(streak ≥ k) over N trades</div>
          <ResultRow label="3+ losses in 100 trades" value={`${s.p3in100.toFixed(1)}%`} warn={s.p3in100 > 50} />
          <ResultRow label="3+ losses in 500 trades" value={`${s.p3in500.toFixed(1)}%`} warn={s.p3in500 > 50} />
          <ResultRow label="4+ losses in 100 trades" value={`${s.p4in100.toFixed(1)}%`} warn={s.p4in100 > 50} />
          <ResultRow label="4+ losses in 500 trades" value={`${s.p4in500.toFixed(1)}%`} warn={s.p4in500 > 50} />
          <ResultRow label="5+ losses in 100 trades" value={`${s.p5in100.toFixed(1)}%`} warn={s.p5in100 > 50} />
          <ResultRow label="5+ losses in 500 trades" value={`${s.p5in500.toFixed(1)}%`} warn={s.p5in500 > 50} />
        </div>

        <div className="calc-section-header">
          <span className="calc-section-icon">💀</span>
          <h3>Ruin Analysis</h3>
        </div>
        <p className="calc-subtitle">
          EOD Drawdown: ${inputs.eodDrawdown.toLocaleString()} · R per trade: ${inputs.rPerTrade.toLocaleString()}
        </p>

        <div className="calc-block">
          <div className="calc-block-title accent">With {inputs.dailyLossStop}-Loss Daily Stop</div>
          <ResultRow label="Max daily loss" value={`$${s.maxDailyLoss.toFixed(0)}`} />
          <ResultRow label="Max-loss days to ruin" value={`${s.daysToRuin} consecutive`} warn />
          <ResultRow label="P(LL day)" value={`${s.pLL.toFixed(1)}%`} />
          <ResultRow label="P(2 consecutive LL days)" value={`${s.pTwoLLdays.toFixed(2)}%`} warn />
        </div>

        <div className="calc-block">
          <div className="calc-block-title danger">R Size → Consecutive Losses for Ruin</div>
          <ResultRow label={`$${s.ruinR3.toFixed(0)}/trade → ruin at`} value="3 consecutive losses" warn />
          <ResultRow label={`$${s.ruinR4.toFixed(0)}/trade → ruin at`} value="4 consecutive losses" />
          <ResultRow label={`$${s.ruinR5.toFixed(0)}/trade → ruin at`} value="5 consecutive losses" highlight />
        </div>

        <div className="calc-block">
          <div className="calc-block-title accent">Daily Outcome Distribution</div>
          <ResultRow
            label="WW (both win)"
            value={`${s.pWW.toFixed(1)}% → +$${(inputs.rPerTrade * edge.rr * 2).toLocaleString()}`}
            highlight
          />
          <ResultRow
            label="WL or LW (split)"
            value={`${s.pMixed.toFixed(1)}% → +$${(inputs.rPerTrade * (edge.rr - 1)).toLocaleString()}`}
          />
          <ResultRow
            label="LL (both lose)"
            value={`${s.pLL.toFixed(1)}% → −$${(inputs.rPerTrade * 2).toLocaleString()}`}
            warn
          />
        </div>
      </div>
    </div>
  );
}
