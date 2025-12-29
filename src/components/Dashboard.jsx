import { useDashboard } from '../context/DashboardContext';

export default function Dashboard() {
    const { state, FIRMS, addAccount, updateAccountStatus, deleteAccount, getFirmLimit } = useDashboard();

    return (
        <div className="dashboard-tab">
            <section className="daily-goals">
                <h2>Today's Tasks</h2>
                <div className="task-list">
                    {Object.values(FIRMS).map(firm => (
                        <TaskItem
                            key={firm.id}
                            icon={firm.id === 'apex' ? 'money' : 'diamond'}
                            title={`Buy 1 ${firm.name} Eval (~$${state.costs[firm.evalCostKey] || 0})`}
                            subtitle={firm.activationCostKey ? 'Use the discount!' : 'Higher value account'}
                            priority={firm.id === 'apex' ? 'high' : 'medium'}
                        />
                    ))}
                    <TaskItem
                        icon="chart"
                        title="Trade at Market Open"
                        subtitle="Execute your edge with full position"
                        priority="high"
                    />
                    <TaskItem
                        icon="target"
                        title="Pass at least 1 account"
                        subtitle="Daily minimum goal"
                        priority="high"
                    />
                </div>
            </section>

            <section className="accounts">
                <h2>My Accounts</h2>
                <div className="accounts-grid">
                    {Object.values(FIRMS).map(firm => {
                        const accounts = state.accounts[firm.id] || [];
                        const passed = accounts.filter(a => a.status === 'passed').length;

                        return (
                            <AccountCard
                                key={firm.id}
                                firm={firm}
                                accounts={accounts}
                                passed={passed}
                                limit={getFirmLimit(firm.id)}
                                onAdd={() => addAccount(firm.id)}
                                onStatusChange={(id, status) => updateAccountStatus(firm.id, id, status)}
                                onDelete={(id) => deleteAccount(firm.id, id)}
                            />
                        );
                    })}
                </div>
            </section>

            <section className="daily-strategy">
                <h2>Daily Strategy</h2>
                <div className="strategy-card">
                    {Object.values(FIRMS).map(firm => (
                        <StrategyItem
                            key={firm.id}
                            icon={firm.id === 'apex' ? 'money' : 'diamond'}
                            title={`Buy ${firm.name} Eval`}
                            description={`Cost: ~$${state.costs[firm.evalCostKey] || 0}${firm.activationCostKey ? ' | Use the discount!' : ''}`}
                        />
                    ))}
                    <StrategyItem
                        icon="chart"
                        title="Full Part at Open"
                        description="Execute your edge with full position"
                    />
                    <StrategyItem
                        icon="target"
                        title="Pass At Least 1 Account"
                        description="Daily minimum goal"
                    />
                </div>
            </section>
        </div>
    );
}

function TaskItem({ icon, title, subtitle, priority }) {
    const icons = {
        money: '💰',
        diamond: '💎',
        chart: '📈',
        target: '🎯'
    };

    return (
        <div className={`task-item ${priority}`}>
            <span className="task-icon">{icons[icon]}</span>
            <div className="task-content">
                <h4>{title}</h4>
                <p>{subtitle}</p>
            </div>
            <input type="checkbox" />
        </div>
    );
}

function AccountCard({ firm, accounts, passed, limit, onAdd, onStatusChange, onDelete }) {
    return (
        <div className={`account-card ${firm.id}`}>
            <h3>{firm.accountName} Accounts</h3>
            <div className="account-count">
                <span className="passed">{passed}</span>
                <span className="limit">/{limit}</span> Passed
            </div>
            <div className="account-details">
                {accounts.length === 0 ? (
                    <p className="no-accounts">No accounts yet. Click below to add one.</p>
                ) : (
                    accounts.map(acc => (
                        <div key={acc.id} className={`account-item ${acc.status}`}>
                            <span>{acc.name}</span>
                            <div className="account-actions">
                                <select
                                    value={acc.status}
                                    onChange={(e) => onStatusChange(acc.id, e.target.value)}
                                >
                                    <option value="in-progress">In Progress</option>
                                    <option value="passed">Passed</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <button
                                    className="delete-account-btn"
                                    onClick={() => onDelete(acc.id)}
                                    title="Delete account"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <button onClick={onAdd} disabled={passed >= limit}>+ Add Account</button>
        </div>
    );
}

function StrategyItem({ icon, title, description }) {
    const icons = {
        money: '💰',
        diamond: '💎',
        chart: '📈',
        target: '🎯'
    };

    return (
        <div className="strategy-item">
            <span className="icon">{icons[icon]}</span>
            <div className="strategy-content">
                <h4>{title}</h4>
                <p>{description}</p>
            </div>
        </div>
    );
}
