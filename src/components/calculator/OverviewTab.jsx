import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const radarData = [
  { metric: 'Speed', Aggressive: 95, Balanced: 65, Conservative: 30 },
  { metric: 'Survival', Aggressive: 45, Balanced: 70, Conservative: 95 },
  { metric: 'ROI', Aggressive: 90, Balanced: 85, Conservative: 75 },
  { metric: 'Safety', Aggressive: 30, Balanced: 65, Conservative: 95 },
  { metric: 'Cost Eff.', Aggressive: 60, Balanced: 80, Conservative: 70 },
];

const payoutPie = [
  { name: 'Net to You', value: 4500 },
  { name: 'Platform Split', value: 500 },
  { name: 'Cost per Payout', value: 425 },
];

const PIE_COLORS = ['var(--accent-green)', 'var(--accent-red)', 'var(--accent-orange)'];

export default function OverviewTab({ data }) {
  const balanced = data.find(d => d.short === 'Balanced');

  return (
    <>
      <div className="calc-stat-grid">
        <div className="calc-stat-card">
          <div className="calc-stat-value orange">{balanced ? Math.round(balanced.roi) : 959}%</div>
          <div className="calc-stat-label">ROI per Payout</div>
          <div className="calc-stat-sub">Balanced approach</div>
        </div>
        <div className="calc-stat-card">
          <div className="calc-stat-value green">${balanced ? Math.round(balanced.netProfit).toLocaleString() : '4,075'}</div>
          <div className="calc-stat-label">Net per Cycle</div>
          <div className="calc-stat-sub">Single account</div>
        </div>
        <div className="calc-stat-card">
          <div className="calc-stat-value blue">${balanced ? Math.round(balanced.portfolioNet).toLocaleString() : '20,375'}</div>
          <div className="calc-stat-label">Portfolio Net</div>
          <div className="calc-stat-sub">5 accounts</div>
        </div>
        <div className="calc-stat-card">
          <div className="calc-stat-value red">${balanced ? Math.round(balanced.costPerPayout) : 425}</div>
          <div className="calc-stat-label">Cost per Payout</div>
          <div className="calc-stat-sub">Challenge + rebuys</div>
        </div>
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">Strategy Comparison Radar</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Aggressive" dataKey="Aggressive" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            <Radar name="Balanced" dataKey="Balanced" stroke="#0088ff" fill="#0088ff" fillOpacity={0.15} strokeWidth={2} />
            <Radar name="Conservative" dataKey="Conservative" stroke="#00ff88" fill="#00ff88" fillOpacity={0.15} strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="calc-card">
        <h4 className="calc-card-title">Per-Payout Dollar Breakdown ($5,000 cap)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={payoutPie}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => `${name || ''}: $${value || 0}`}
            >
              {payoutPie.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v) => `$${v}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
