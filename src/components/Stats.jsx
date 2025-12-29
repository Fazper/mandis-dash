import { useDashboard } from '../context/DashboardContext';

export default function Stats() {
    const { firms, accountTypes, accounts, expenses, calculateMoneyStats, getTotalPassed, calculatePotentialPayout } = useDashboard();

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

    // Calculate pass rate from expenses (count eval purchases)
    const evalExpenses = (expenses || []).filter(e => accountTypes[e.type]);
    const totalEvals = evalExpenses.length;
    const passRateCalc = totalEvals > 0 ? ((totalPassed / totalEvals) * 100).toFixed(0) : 0;

    return (
        <div className="stats-tab">
            <section className="stats">
                <h2>Statistics</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h4>Total Passed Accounts</h4>
                        <span className="stat-number">{totalPassed}</span>
                    </div>
                    <div className="stat-card">
                        <h4>Total Spent</h4>
                        <span className="stat-number">${stats.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <h4>Potential Payouts</h4>
                        <span className="stat-number green">${potentialPayouts.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <h4>Pass Rate</h4>
                        <span className="stat-number">{passRateCalc}%</span>
                    </div>
                </div>
            </section>

            <section className="account-breakdown">
                <h2>Account Breakdown by Firm</h2>
                <div className="breakdown-grid">
                    {Object.values(firms).map(firm => {
                        // Get all account types for this firm
                        const firmTypes = Object.values(accountTypes).filter(t => t.firmId === firm.id);
                        // Get all accounts for this firm's account types
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
