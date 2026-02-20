import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { generateEquityCurve } from '../../utils/calculations';

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };
const TICK = { fill: '#a0a0a0', fontSize: 11 };

export function RoiCostTab({ data }) {
  const roiData = data.map(d => ({ name: d.short, 'ROI %': Math.round(d.roi) }));
  const costData = data.map(d => ({
    name: d.short,
    'Challenge Cost': d.challengeCost,
    'Rebuy Cost': Math.round(d.costPerPayout - d.challengeCost),
    'Net Payout': Math.round(d.netPayout),
  }));

  return (
    <>
      <div className="calc-card">
        <h4 className="calc-card-title">ROI % by Strategy</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={roiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="ROI %" fill="var(--accent-orange)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="calc-card">
        <h4 className="calc-card-title">Cost Structure by Strategy</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `$${v}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Challenge Cost" stackId="cost" fill="var(--accent-blue)" />
            <Bar dataKey="Rebuy Cost" stackId="cost" fill="var(--accent-red)" />
            <Bar dataKey="Net Payout" fill="var(--accent-green)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="calc-mini-cards">
        {data.map((d, i) => (
          <div key={i} className="calc-mini-card">
            <div className="calc-mini-title">{d.short}</div>
            <div className="calc-mini-row"><span>Cost/Payout</span><span className="red">${Math.round(d.costPerPayout)}</span></div>
            <div className="calc-mini-row"><span>Net Profit</span><span className="green">${Math.round(d.netProfit).toLocaleString()}</span></div>
            <div className="calc-mini-row"><span>ROI</span><span className="orange">{Math.round(d.roi)}%</span></div>
          </div>
        ))}
      </div>
    </>
  );
}

export function SpeedSafetyTab({ data }) {
  const speedSafety = data.map(d => ({
    name: d.short,
    'Days to Target': d.daysToTarget,
    'Days to Payout': d.daysToPayout,
    'Survival %': Math.round(d.survivalFund * 100),
  }));

  return (
    <>
      <div className="calc-card">
        <h4 className="calc-card-title">Days to Complete (Challenge + Funded)</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={speedSafety}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Days to Target" fill="var(--accent-orange)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Days to Payout" fill="var(--accent-blue)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="calc-card">
        <h4 className="calc-card-title">Funded Survival Rate</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={speedSafety} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" domain={[0, 100]} tick={TICK} />
            <YAxis dataKey="name" type="category" tick={TICK} width={100} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
            <Bar dataKey="Survival %" fill="var(--accent-green)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="calc-callout orange">
        <p className="calc-callout-title">Sweet Spot: Balanced ($1,000R funded)</p>
        <p className="calc-callout-text">Only 4 extra days vs aggressive, but survival jumps from 75% to 85%. Cost per payout drops ~12%.</p>
      </div>
    </>
  );
}

export function RuinCurvesTab() {
  const ruinData = [
    { R: '$500', 'Challenge Ruin %': 5, 'Funded Ruin %': 5 },
    { R: '$750', 'Challenge Ruin %': 10, 'Funded Ruin %': 8 },
    { R: '$1,000', 'Challenge Ruin %': 18, 'Funded Ruin %': 15 },
    { R: '$1,250', 'Challenge Ruin %': 25, 'Funded Ruin %': 20 },
    { R: '$1,500', 'Challenge Ruin %': 33, 'Funded Ruin %': 25 },
  ];

  const ruinTable = [
    { r: '$500', losses: 9, llDays: '4-5', ruin: '~5%', level: 'Low', cls: 'green' },
    { r: '$750', losses: 6, llDays: '3', ruin: '~10%', level: 'Low', cls: 'green' },
    { r: '$1,000', losses: 4, llDays: '2', ruin: '~18%', level: 'Medium', cls: 'orange' },
    { r: '$1,250', losses: 3, llDays: '1.5', ruin: '~25%', level: 'High', cls: 'red' },
    { r: '$1,500', losses: 3, llDays: '1.5', ruin: '~33%', level: 'Aggressive', cls: 'red' },
  ];

  return (
    <>
      <div className="calc-card">
        <h4 className="calc-card-title">Ruin Probability by R Size</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={ruinData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="R" tick={TICK} />
            <YAxis tick={TICK} domain={[0, 40]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Challenge Ruin %" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="Funded Ruin %" stroke="var(--accent-orange)" fill="var(--accent-orange)" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">Losses to Ruin by R Level</h4>
        <table className="calc-table">
          <thead>
            <tr>
              <th>R per Trade</th>
              <th>Losses to Ruin</th>
              <th>LL Days to Blow</th>
              <th>Ruin Prob</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {ruinTable.map((row, i) => (
              <tr key={i}>
                <td>{row.r}</td>
                <td>{row.losses}</td>
                <td>{row.llDays}</td>
                <td>{row.ruin}</td>
                <td className={row.cls}>{row.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="calc-callout red">
        <p className="calc-callout-title">Key Insight</p>
        <p className="calc-callout-text">At $1,500R you only need 3 consecutive losses (1.5 bad days) to blow. That's a 33% probability over a 10-day challenge. Acceptable for blow-and-repeat at $215/attempt, but NOT for funded accounts heading to Elite.</p>
      </div>
    </>
  );
}

export function EquitySimTab() {
  const eq1500 = generateEquityCurve(1500, 0.57, 1.5, 0, 30);
  const eq1000 = generateEquityCurve(1000, 0.57, 1.5, 0, 30);
  const eq500 = generateEquityCurve(500, 0.57, 1.5, 0, 30);
  const equityData = eq1500.map((p, i) => ({
    trade: p.trade,
    '$1,500R': p.balance,
    '$1,000R': eq1000[i]?.balance ?? 0,
    '$500R': eq500[i]?.balance ?? 0,
    target: 9000,
  }));

  return (
    <>
      <div className="calc-card">
        <h4 className="calc-card-title">Sample Equity Curve — 30 Trades</h4>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="trade" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="target" stroke="var(--border-light)" strokeDasharray="5 5" strokeWidth={1} dot={false} name="$9K Target" />
            <Line type="monotone" dataKey="$1,500R" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="$1,000R" stroke="#0088ff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="$500R" stroke="#00ff88" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="calc-footnote">* Deterministic seed based on R size. Actual results vary.</p>
      </div>
      <div className="calc-mini-cards">
        {[
          { r: '$1,500R', cls: 'orange', win: '+$2,250', loss: '-$1,500', target: '~10 days' },
          { r: '$1,000R', cls: 'blue', win: '+$1,500', loss: '-$1,000', target: '~15 days' },
          { r: '$500R', cls: 'green', win: '+$750', loss: '-$500', target: '~29 days' },
        ].map((item, i) => (
          <div key={i} className="calc-mini-card center">
            <div className={`calc-mini-value ${item.cls}`}>{item.r}</div>
            <div className="calc-mini-row"><span className="green">Win: {item.win}</span></div>
            <div className="calc-mini-row"><span className="red">Loss: {item.loss}</span></div>
            <div className="calc-mini-row"><span>Target: {item.target}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}

export function PortfolioTab() {
  const monthlyData = [];
  let cumProfit = 0;
  for (let m = 1; m <= 12; m++) {
    const cyclesPerMonth = m <= 2 ? 1.5 : 2;
    const monthNet = cyclesPerMonth * 4075 * 5;
    cumProfit += monthNet;
    monthlyData.push({ month: `M${m}`, 'Monthly Net': Math.round(monthNet), Cumulative: Math.round(cumProfit) });
  }

  return (
    <>
      <div className="calc-card">
        <h4 className="calc-card-title">12-Month Portfolio Projection (5 Accounts, Balanced)</h4>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={TICK} />
            <YAxis yAxisId="left" tick={TICK} />
            <YAxis yAxisId="right" orientation="right" tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="Monthly Net" fill="var(--accent-green)" radius={[6, 6, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Cumulative" stroke="var(--accent-orange)" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="calc-stat-grid">
        <div className="calc-stat-card"><div className="calc-stat-value green">$40K+</div><div className="calc-stat-label">Monthly Net (est.)</div><div className="calc-stat-sub">5 accts × 2 cycles</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value orange">$488K+</div><div className="calc-stat-label">Annual Net (est.)</div><div className="calc-stat-sub">Compounding excluded</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value red">$4,250</div><div className="calc-stat-label">Monthly Cost</div><div className="calc-stat-sub">Challenges + rebuys</div></div>
        <div className="calc-stat-card"><div className="calc-stat-value blue">$4,000</div><div className="calc-stat-label">Startup Buffer</div><div className="calc-stat-sub">Covers worst case</div></div>
      </div>
      <div className="calc-callout green">
        <p className="calc-callout-title">The Math: $4,000 in → $488K+ out (Year 1)</p>
        <p className="calc-callout-text">Even with 30% haircut for variance, bad months, and platform issues, you're looking at $340K+ net. The edge compounds through volume, not account size.</p>
      </div>
    </>
  );
}
