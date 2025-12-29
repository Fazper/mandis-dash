import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function Dashboard() {
    const { state, FIRMS, addAccountWithCost, updateAccountStatus, deleteAccount, getFirmLimit } = useDashboard();

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
                                defaultEvalCost={state.costs[firm.evalCostKey] || 0}
                                defaultActivationCost={firm.activationCostKey ? state.costs[firm.activationCostKey] || 0 : 0}
                                onAdd={(evalCost) => addAccountWithCost(firm.id, evalCost)}
                                onStatusChange={(id, status, cost) => updateAccountStatus(firm.id, id, status, cost)}
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

function AccountCard({ firm, accounts, passed, limit, defaultEvalCost, defaultActivationCost, onAdd, onStatusChange, onDelete }) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [evalCost, setEvalCost] = useState(defaultEvalCost);
    const [statusChange, setStatusChange] = useState(null); // { id, newStatus }
    const [passCost, setPassCost] = useState(defaultActivationCost);

    const halfway = accounts.filter(a => a.status === 'halfway').length;
    const funded = accounts.filter(a => a.status === 'funded').length;

    const handleAdd = () => {
        onAdd(evalCost || 0);
        setShowAddForm(false);
        setEvalCost(defaultEvalCost);
    };

    const handleStatusChange = (id, newStatus) => {
        // If changing to passed or funded, show cost input
        if (newStatus === 'passed' || newStatus === 'funded') {
            setStatusChange({ id, newStatus });
            setPassCost(defaultActivationCost);
        } else {
            onStatusChange(id, newStatus, 0);
        }
    };

    const confirmStatusChange = () => {
        if (statusChange) {
            onStatusChange(statusChange.id, statusChange.newStatus, passCost || 0);
            setStatusChange(null);
            setPassCost(defaultActivationCost);
        }
    };

    return (
        <div className={`account-card ${firm.id}`}>
            <h3>{firm.accountName} Accounts</h3>
            <div className="account-count">
                <span className="passed">{passed}</span>
                <span className="limit">/{limit}</span> Passed
                {funded > 0 && <span className="funded-count"> ({funded} funded)</span>}
                {firm.hasConsistencyRule && halfway > 0 && (
                    <span className="halfway-count"> ({halfway} at 50%)</span>
                )}
            </div>
            <div className="account-details">
                {accounts.length === 0 ? (
                    <p className="no-accounts">No accounts yet. Click below to add one.</p>
                ) : (
                    accounts.map(acc => (
                        <div key={acc.id} className={`account-item ${acc.status}`}>
                            <span>{acc.name}</span>
                            {acc.evalCost > 0 && <small className="account-cost">${acc.evalCost}</small>}
                            <div className="account-actions">
                                <select
                                    value={acc.status}
                                    onChange={(e) => handleStatusChange(acc.id, e.target.value)}
                                >
                                    <option value="in-progress">In Progress</option>
                                    {firm.hasConsistencyRule && (
                                        <option value="halfway">50% Done</option>
                                    )}
                                    <option value="passed">Passed</option>
                                    {firm.activationCostKey && (
                                        <option value="funded">Funded</option>
                                    )}
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

            {/* Status change cost modal */}
            {statusChange && (
                <div className="cost-input-form">
                    <label>{statusChange.newStatus === 'funded' ? 'Activation' : 'Pass'} Cost ($)</label>
                    <div className="cost-input-row">
                        <input
                            type="number"
                            value={passCost}
                            onChange={(e) => setPassCost(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                        />
                        <button onClick={confirmStatusChange}>Confirm</button>
                        <button className="cancel-btn" onClick={() => setStatusChange(null)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Add account form */}
            {showAddForm ? (
                <div className="cost-input-form">
                    <label>Eval Cost ($)</label>
                    <div className="cost-input-row">
                        <input
                            type="number"
                            value={evalCost}
                            onChange={(e) => setEvalCost(parseFloat(e.target.value) || 0)}
                            placeholder={defaultEvalCost.toString()}
                            step="0.01"
                        />
                        <button onClick={handleAdd}>Add</button>
                        <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setShowAddForm(true)} disabled={passed >= limit}>+ Add Account</button>
            )}
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
