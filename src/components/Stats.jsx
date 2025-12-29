import { useDashboard } from '../context/DashboardContext';

export default function Stats() {
    const { state, FIRMS, calculateMoneyStats, getTotalPassed } = useDashboard();

    const stats = calculateMoneyStats();
    const totalPassed = getTotalPassed();
    const potentialPayouts = totalPassed * state.costs.payoutEstimate;

    // Calculate pass rate from expenses
    const totalEvals = Object.values(stats.byFirm).reduce((sum, f) => sum + f.evalCount, 0);
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

            <section className="history">
                <h2>Daily Log</h2>
                <div className="log-container">
                    {state.dailyLog && state.dailyLog.length > 0 ? (
                        state.dailyLog.slice().reverse().map((entry, i) => (
                            <div key={i} className="log-entry">
                                <div className="log-date">{entry.date}</div>
                                <div className="log-details">
                                    {entry.boughtApex ? '✓ Bought Apex' : '✗ No Apex'} |
                                    {entry.boughtLucid ? ' ✓ Bought Lucid' : ' ✗ No Lucid'} |
                                    {entry.tradedOpen ? ' ✓ Traded Open' : ' ✗ Missed Open'} |
                                    Passed: {entry.accountsPassed}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-log">No daily logs recorded yet. Use "Save Today's Progress" to track your daily activity.</p>
                    )}
                </div>
                <button className="save-btn" onClick={() => alert('Coming soon: Daily log saving')}>
                    Save Today's Progress
                </button>
            </section>

            <section className="account-breakdown">
                <h2>Account Breakdown</h2>
                <div className="breakdown-grid">
                    {Object.values(FIRMS).map(firm => {
                        const accounts = state.accounts[firm.id] || [];
                        return (
                            <div key={firm.id} className={`breakdown-card ${firm.id}`}>
                                <h4>{firm.name} Accounts</h4>
                                <div className="breakdown-stats">
                                    <div className="breakdown-item">
                                        <span className="label">Passed</span>
                                        <span className="value">{accounts.filter(a => a.status === 'passed').length}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span className="label">In Progress</span>
                                        <span className="value">{accounts.filter(a => a.status === 'in-progress').length}</span>
                                    </div>
                                    <div className="breakdown-item">
                                        <span className="label">Failed</span>
                                        <span className="value">{accounts.filter(a => a.status === 'failed').length}</span>
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
