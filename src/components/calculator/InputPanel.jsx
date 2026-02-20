function InputField({ label, value, onChange, prefix, suffix, step = 1, min = 0 }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label">{label}</label>
      <div className="calc-input-row">
        {prefix && <span className="calc-input-prefix">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          className="calc-input"
        />
        {suffix && <span className="calc-input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

export default function InputPanel({ edge, inputs, onEdgeChange, onInputChange }) {
  return (
    <div className="calc-panel">
      <div className="calc-section-header">
        <span className="calc-section-icon">🎯</span>
        <h3>Edge Metrics</h3>
      </div>
      <InputField label="Win Rate" value={edge.winRate} onChange={(v) => onEdgeChange('winRate', v)} step={0.01} />
      <InputField label="R:R (Avg Win / Avg Loss)" value={edge.rr} onChange={(v) => onEdgeChange('rr', v)} step={0.1} />

      <div className="calc-section-header">
        <span className="calc-section-icon">🏦</span>
        <h3>Firm Parameters</h3>
      </div>
      <InputField label="Challenge Cost" value={inputs.challengeCost} onChange={(v) => onInputChange('challengeCost', v)} prefix="$" />
      <InputField label="Profit Target" value={inputs.profitTarget} onChange={(v) => onInputChange('profitTarget', v)} prefix="$" />
      <InputField label="EOD Drawdown" value={inputs.eodDrawdown} onChange={(v) => onInputChange('eodDrawdown', v)} prefix="$" />
      <InputField label="Payout Cap" value={inputs.payoutCap} onChange={(v) => onInputChange('payoutCap', v)} prefix="$" />
      <InputField label="Withdrawal %" value={inputs.withdrawalPct} onChange={(v) => onInputChange('withdrawalPct', v)} suffix="%" />
      <InputField label="Platform Split" value={inputs.platformSplit} onChange={(v) => onInputChange('platformSplit', v)} suffix="%" />
      <InputField label="Number of Accounts" value={inputs.numAccounts} onChange={(v) => onInputChange('numAccounts', v)} />

      <div className="calc-section-header">
        <span className="calc-section-icon">⚙️</span>
        <h3>Execution</h3>
      </div>
      <InputField label="R Per Trade ($)" value={inputs.rPerTrade} onChange={(v) => onInputChange('rPerTrade', v)} prefix="$" />
      <InputField label="Trades Per Day" value={inputs.tradesPerDay} onChange={(v) => onInputChange('tradesPerDay', v)} />
      <InputField label="Daily Loss Stop (trades)" value={inputs.dailyLossStop} onChange={(v) => onInputChange('dailyLossStop', v)} />
    </div>
  );
}
