import { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { ProjectionEngine } from '../utils/projections';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area, Line, ComposedChart
} from 'recharts';

const COLORS = {
    green: '#4ade80',
    blue: '#60a5fa',
    purple: '#a78bfa',
    orange: '#fb923c',
    red: '#f87171',
    teal: '#2dd4bf',
    muted: '#6b7280'
};

const STATUS_COLORS = {
    funded: '#4ade80',
    passed: '#60a5fa',
    'in-progress': '#a78bfa',
    halfway: '#fb923c',
    failed: '#f87171'
};

export default function Stats() {
    const { state, firms, accountTypes, accounts, expenses, calculateMoneyStats, getTotalPassed, calculatePotentialPayout } = useDashboard();

    // Guard against undefined data during initial load
    if (!firms || !accountTypes || !accounts) {
        return (
            <div className="stats-tab">
                <div className="loading-state">Loading statistics...</div>
            </div>
        );
    }

    const stats = calculateMoneyStats();
    const totalPassed = getTotalPassed();
    const potentialPayouts = calculatePotentialPayout();

    // Calculate pass rate from actual accounts
    const allAccounts = Object.values(accounts).flat();
    const totalAccountsCount = allAccounts.length;
    const passedAndFundedCount = allAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;
    const passRateCalc = totalAccountsCount > 0 ? ((passedAndFundedCount / totalAccountsCount) * 100).toFixed(0) : 50;

    // Prepare chart data
    const chartData = useMemo(() => {
        // Monthly expenses data - include ALL expenses
        const monthlyExpenses = {};
        const expensesList = expenses || [];

        expensesList.forEach(exp => {
            if (exp.date && exp.amount) {
                const month = exp.date.substring(0, 7); // YYYY-MM
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + exp.amount;
            }
        });

        const expensesByMonth = Object.entries(monthlyExpenses)
            .map(([month, amount]) => ({
                month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                rawMonth: month,
                amount
            }))
            .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));

        // Account status distribution (all accounts)
        const allAccounts = Object.values(accounts).flat();
        const statusCounts = {
            funded: allAccounts.filter(a => a.status === 'funded').length,
            passed: allAccounts.filter(a => a.status === 'passed').length,
            'in-progress': allAccounts.filter(a => a.status === 'in-progress').length,
            halfway: allAccounts.filter(a => a.status === 'halfway').length,
            failed: allAccounts.filter(a => a.status === 'failed').length
        };
        const statusData = Object.entries(statusCounts)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                name: status === 'in-progress' ? 'In Progress' : status === 'halfway' ? '50% Done' : status.charAt(0).toUpperCase() + status.slice(1),
                value: count,
                color: STATUS_COLORS[status]
            }));

        // Expenses by firm - group all expenses, unmatched go to "Other"
        const expensesByFirm = {};
        expensesList.forEach(exp => {
            if (!exp.amount) return;

            // Check if expense type directly matches an account type
            let matchedType = accountTypes[exp.type];

            // If not, check for activation expense pattern
            if (!matchedType) {
                const activationMatch = exp.type?.match(/^(.+)-activation$/);
                if (activationMatch) {
                    matchedType = accountTypes[activationMatch[1]];
                }
            }

            let firmName = 'Other';
            if (matchedType) {
                const firm = firms[matchedType.firmId];
                if (firm) {
                    firmName = firm.name;
                }
            }

            expensesByFirm[firmName] = (expensesByFirm[firmName] || 0) + exp.amount;
        });
        const firmExpenseData = Object.entries(expensesByFirm)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        // Yearly projection using shared ProjectionEngine
        const engine = new ProjectionEngine({
            firms,
            accountTypes,
            accounts,
            passRate: parseInt(passRateCalc) || 50,
            payoutStartDate: state.payoutStartDate
        });
        const yearlyProjection = engine.generateYearlyProjection();

        return { expensesByMonth, statusData, firmExpenseData, yearlyProjection };
    }, [expenses, accounts, accountTypes, firms, state.payoutStartDate, passRateCalc]);

    const hasExpenses = chartData.expensesByMonth.length > 0;
    const hasAccounts = chartData.statusData.length > 0;
    const hasFirmExpenses = chartData.firmExpenseData.length > 0;

    return (
        <div className="stats-tab">
            <section className="stats">
                <h2>Overview</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h4>Total Passed</h4>
                        <span className="stat-number">{totalPassed}</span>
                    </div>
                    <div className="stat-card">
                        <h4>Total Spent</h4>
                        <span className="stat-number red">${stats.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <h4>Potential Payout</h4>
                        <span className="stat-number green">${potentialPayouts.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <h4>Pass Rate</h4>
                        <span className="stat-number">{passRateCalc}%</span>
                    </div>
                </div>
            </section>

            <div className="charts-grid">
                {/* Monthly Expenses Chart */}
                <section className="chart-section">
                    <h2>Monthly Expenses</h2>
                    <div className="chart-container">
                        {hasExpenses ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={chartData.expensesByMonth}>
                                    <defs>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                                        formatter={(value) => [`$${value.toLocaleString()}`, 'Spent']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke={COLORS.purple}
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorExpense)"
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No expense data yet</div>
                        )}
                    </div>
                </section>

                {/* Account Status Pie Chart */}
                <section className="chart-section">
                    <h2>Account Status</h2>
                    <div className="chart-container">
                        {hasAccounts ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartData.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        animationBegin={0}
                                        animationDuration={800}
                                    >
                                        {chartData.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                                    />
                                    <Legend
                                        formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No accounts yet</div>
                        )}
                    </div>
                </section>

                {/* Expenses by Firm */}
                <section className="chart-section">
                    <h2>Expenses by Firm</h2>
                    <div className="chart-container">
                        {hasFirmExpenses ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData.firmExpenseData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${v}`} />
                                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                                    <Tooltip
                                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                                        formatter={(value) => [`$${value.toLocaleString()}`, 'Spent']}
                                    />
                                    <Bar dataKey="amount" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No expense data yet</div>
                        )}
                    </div>
                </section>

                {/* Yearly Projection */}
                <section className="chart-section wide">
                    <h2>12-Month Projection (Cumulative)</h2>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={chartData.yearlyProjection}>
                                <defs>
                                    <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={COLORS.red} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                                    formatter={(value, name) => [
                                        `$${value.toLocaleString()}`,
                                        name === 'payouts' ? 'Cumulative Payouts' : name === 'expenses' ? 'Cumulative Expenses' : 'Net Position'
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="payouts"
                                    stroke={COLORS.green}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorPayouts)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expenses"
                                    stroke={COLORS.red}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorExpenses)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="net"
                                    stroke={COLORS.blue}
                                    strokeWidth={3}
                                    dot={{ fill: COLORS.blue, strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                />
                                <Legend
                                    formatter={(value) => (
                                        <span style={{ color: '#e5e7eb' }}>
                                            {value === 'payouts' ? 'Cumulative Payouts' : value === 'expenses' ? 'Cumulative Expenses' : 'Net Profit/Loss'}
                                        </span>
                                    )}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <section className="account-breakdown">
                <h2>Account Breakdown by Firm</h2>
                <div className="breakdown-grid">
                    {Object.values(firms).map(firm => {
                        const firmTypes = Object.values(accountTypes).filter(t => t.firmId === firm.id);
                        const firmAccounts = firmTypes.flatMap(type => accounts[type.id] || []);

                        return (
                            <div key={firm.id} className={`breakdown-card ${firm.color}`}>
                                <h4>{firm.name}</h4>
                                <div className="breakdown-stats">
                                    <div className="breakdown-item">
                                        <span className="label">Funded</span>
                                        <span className="value">{firmAccounts.filter(a => a.status === 'funded').length}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span className="label">Passed</span>
                                        <span className="value">{firmAccounts.filter(a => a.status === 'passed').length}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span className="label">In Progress</span>
                                        <span className="value">{firmAccounts.filter(a => a.status === 'in-progress' || a.status === 'halfway').length}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span className="label">Failed</span>
                                        <span className="value">{firmAccounts.filter(a => a.status === 'failed').length}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
