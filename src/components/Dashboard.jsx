import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function Dashboard() {
    const { state, firms, addAccountWithCost, updateAccountStatus, updateAccountBalance, updateAccountProfitTarget, deleteAccount, getFirmLimit } = useDashboard();

    return (
        <div className="dashboard-tab">
            <section className="daily-goals">
                <h2>Today's Tasks</h2>
                <div className="task-list">
                    {Object.values(firms).map(firm => (
                        <TaskItem
                            key={firm.id}
                            icon={firm.color === 'orange' ? 'money' : 'diamond'}
                            title={`Buy 1 ${firm.name} Eval (~$${firm.evalCost || 0})`}
                            subtitle={firm.activationCost > 0 ? 'Has activation cost' : 'No activation needed'}
                            priority={firm.color === 'orange' ? 'high' : 'medium'}
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
                    {Object.values(firms).map(firm => {
                        const accounts = state.accounts[firm.id] || [];
                        const passed = accounts.filter(a => a.status === 'passed').length;

                        return (
                            <AccountCard
                                key={firm.id}
                                firm={firm}
                                accounts={accounts}
                                passed={passed}
                                limit={getFirmLimit(firm.id)}
                                defaultEvalCost={firm.evalCost || 0}
                                defaultActivationCost={firm.activationCost || 0}
                                onAdd={(evalCost, profitTarget) => addAccountWithCost(firm.id, evalCost, profitTarget)}
                                onStatusChange={(id, status, cost) => updateAccountStatus(firm.id, id, status, cost)}
                                onBalanceChange={(id, balance) => updateAccountBalance(firm.id, id, balance)}
                                onProfitTargetChange={(id, target) => updateAccountProfitTarget(firm.id, id, target)}
                                onDelete={(id) => deleteAccount(firm.id, id)}
                            />
                        );
                    })}
                </div>
            </section>

            <section className="daily-strategy">
                <h2>Daily Strategy</h2>
                <div className="strategy-card">
                    {Object.values(firms).map(firm => (
                        <StrategyItem
                            key={firm.id}
                            icon={firm.color === 'orange' ? 'money' : 'diamond'}
                            title={`Buy ${firm.name} Eval`}
                            description={`Cost: ~$${firm.evalCost || 0}${firm.activationCost > 0 ? ` | Activation: $${firm.activationCost}` : ''}`}
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

function AccountCard({ firm, accounts, passed, limit, defaultEvalCost, defaultActivationCost, onAdd, onStatusChange, onBalanceChange, onProfitTargetChange, onDelete }) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [evalCost, setEvalCost] = useState(defaultEvalCost);
    const [profitTarget, setProfitTarget] = useState(firm.defaultProfitTarget);
    const [statusChange, setStatusChange] = useState(null); // { id, newStatus }
    const [passCost, setPassCost] = useState(defaultActivationCost);
    const [editingBalance, setEditingBalance] = useState(null); // account id being edited
    const [balanceInput, setBalanceInput] = useState('');
    const [editingTarget, setEditingTarget] = useState(null);
    const [targetInput, setTargetInput] = useState('');

    const halfway = accounts.filter(a => a.status === 'halfway').length;
    const funded = accounts.filter(a => a.status === 'funded').length;

    const handleAdd = () => {
        onAdd(evalCost || 0, profitTarget || firm.defaultProfitTarget);
        setShowAddForm(false);
        setEvalCost(defaultEvalCost);
        setProfitTarget(firm.defaultProfitTarget);
    };

    const startEditTarget = (acc) => {
        setEditingTarget(acc.id);
        setTargetInput(acc.profitTarget || firm.defaultProfitTarget);
    };

    const saveTarget = (id) => {
        onProfitTargetChange(id, targetInput);
        setEditingTarget(null);
        setTargetInput('');
    };

    const handleStatusChange = (id, newStatus) => {
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

    const startEditBalance = (acc) => {
        setEditingBalance(acc.id);
        setBalanceInput(acc.balance || 0);
    };

    const saveBalance = (id) => {
        onBalanceChange(id, balanceInput);
        setEditingBalance(null);
        setBalanceInput('');
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
                    accounts.map(acc => {
                        const progress = acc.profitTarget > 0 ? Math.min((acc.balance / acc.profitTarget) * 100, 100) : 0;
                        const isActive = acc.status === 'in-progress' || acc.status === 'halfway';

                        return (
                            <div key={acc.id} className={`account-item ${acc.status}`}>
                                <div className="account-info">
                                    <span className="account-name">{acc.name}</span>
                                    {acc.evalCost > 0 && <small className="account-cost">${acc.evalCost}</small>}
                                    {isActive && (
                                        <div className="account-progress">
                                            {editingBalance === acc.id ? (
                                                <div className="balance-edit">
                                                    <input
                                                        type="number"
                                                        value={balanceInput}
                                                        onChange={(e) => setBalanceInput(e.target.value)}
                                                        placeholder="Balance"
                                                        step="0.01"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveBalance(acc.id)}>Save</button>
                                                    <button className="cancel-btn" onClick={() => setEditingBalance(null)}>×</button>
                                                </div>
                                            ) : editingTarget === acc.id ? (
                                                <div className="balance-edit">
                                                    <span>Target: $</span>
                                                    <input
                                                        type="number"
                                                        value={targetInput}
                                                        onChange={(e) => setTargetInput(e.target.value)}
                                                        placeholder="Target"
                                                        step="100"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveTarget(acc.id)}>Save</button>
                                                    <button className="cancel-btn" onClick={() => setEditingTarget(null)}>×</button>
                                                </div>
                                            ) : (
                                                <div className="progress-display">
                                                    <div className="progress-bar" onClick={() => startEditBalance(acc)}>
                                                        <div
                                                            className="progress-fill"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="progress-labels">
                                                        <span className="progress-text" onClick={() => startEditBalance(acc)}>
                                                            ${acc.balance || 0}
                                                        </span>
                                                        <span className="progress-target" onClick={() => startEditTarget(acc)}>
                                                            / ${acc.profitTarget || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                        {firm.activationCost > 0 && (
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
                        );
                    })
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
                    <div className="add-form-grid">
                        <div className="form-field">
                            <label>Eval Cost ($)</label>
                            <input
                                type="number"
                                value={evalCost}
                                onChange={(e) => setEvalCost(parseFloat(e.target.value) || 0)}
                                placeholder={defaultEvalCost.toString()}
                                step="0.01"
                            />
                        </div>
                        <div className="form-field">
                            <label>Profit Target ($)</label>
                            <input
                                type="number"
                                value={profitTarget}
                                onChange={(e) => setProfitTarget(parseFloat(e.target.value) || 0)}
                                placeholder={firm.defaultProfitTarget.toString()}
                                step="100"
                            />
                        </div>
                    </div>
                    <div className="cost-input-row" style={{ marginTop: '12px' }}>
                        <button onClick={handleAdd}>Add Account</button>
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
