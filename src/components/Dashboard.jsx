import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';

export default function Dashboard() {
    const { state, firms, addAccountWithCost, updateAccountStatus, updateAccountBalance, updateAccountProfitTarget, deleteAccount, getFirmLimit, goals, addGoal, deleteGoal, toggleGoalCompletion, getTodaysGoals } = useDashboard();
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [goalForm, setGoalForm] = useState({
        title: '',
        description: '',
        goalType: 'daily',
        targetCount: 1,
        actionType: 'custom',
        firmId: '',
        endDate: ''
    });

    const hasFirms = Object.keys(firms).length > 0;
    const todaysGoals = getTodaysGoals();

    const handleAddGoal = async () => {
        if (!goalForm.title.trim()) return;

        await addGoal({
            ...goalForm,
            firmId: goalForm.firmId || null,
            endDate: goalForm.endDate || null
        });

        setGoalForm({
            title: '',
            description: '',
            goalType: 'daily',
            targetCount: 1,
            actionType: 'custom',
            firmId: '',
            endDate: ''
        });
        setShowGoalForm(false);
    };

    // Show empty state if no firms configured
    if (!hasFirms) {
        return (
            <div className="dashboard-tab">
                <div className="empty-state">
                    <div className="empty-icon">🏦</div>
                    <h2>No Account Types Configured</h2>
                    <p>You need to set up your account types (firms) before you can start tracking accounts.</p>
                    <NavLink to="/money" className="setup-btn">
                        Go to Money Tab to Add Account Types
                    </NavLink>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-tab">
            <section className="daily-goals">
                <div className="section-header">
                    <h2>Today's Goals</h2>
                    <button className="add-goal-btn" onClick={() => setShowGoalForm(!showGoalForm)}>
                        {showGoalForm ? '−' : '+'} Add Goal
                    </button>
                </div>

                {showGoalForm && (
                    <div className="goal-form">
                        <div className="goal-form-row">
                            <div className="form-field">
                                <label>Goal Title</label>
                                <input
                                    type="text"
                                    value={goalForm.title}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g., Pass 1 account"
                                />
                            </div>
                            <div className="form-field">
                                <label>Type</label>
                                <select
                                    value={goalForm.goalType}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, goalType: e.target.value }))}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="one-time">One-time</option>
                                </select>
                            </div>
                        </div>
                        <div className="goal-form-row">
                            <div className="form-field">
                                <label>Auto-complete when</label>
                                <select
                                    value={goalForm.actionType}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, actionType: e.target.value }))}
                                >
                                    <option value="custom">Manual completion only</option>
                                    <option value="fund_account">Account gets funded</option>
                                    <option value="buy_eval">Buy an eval</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Specific Firm (optional)</label>
                                <select
                                    value={goalForm.firmId}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, firmId: e.target.value }))}
                                >
                                    <option value="">Any firm</option>
                                    {Object.values(firms).map(firm => (
                                        <option key={firm.id} value={firm.id}>{firm.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="goal-form-row">
                            <div className="form-field">
                                <label>End Date (optional)</label>
                                <input
                                    type="date"
                                    value={goalForm.endDate}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                            <div className="form-field">
                                <label>Description (optional)</label>
                                <input
                                    type="text"
                                    value={goalForm.description}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Additional details..."
                                />
                            </div>
                        </div>
                        <div className="goal-form-actions">
                            <button className="cancel-btn" onClick={() => setShowGoalForm(false)}>Cancel</button>
                            <button className="save-goal-btn" onClick={handleAddGoal}>Create Goal</button>
                        </div>
                    </div>
                )}

                <div className="task-list">
                    {todaysGoals.length === 0 ? (
                        <div className="no-goals">
                            <p>No goals for today. Create your first goal above!</p>
                        </div>
                    ) : (
                        todaysGoals.map(goal => (
                            <GoalItem
                                key={goal.id}
                                goal={goal}
                                firms={firms}
                                onToggle={(completed) => toggleGoalCompletion(goal.id, completed)}
                                onDelete={() => deleteGoal(goal.id)}
                            />
                        ))
                    )}
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
                                onAdd={(evalCost, profitTarget, createdDate) => addAccountWithCost(firm.id, evalCost, profitTarget, createdDate)}
                                onStatusChange={(id, status, cost) => updateAccountStatus(firm.id, id, status, cost)}
                                onBalanceChange={(id, balance) => updateAccountBalance(firm.id, id, balance)}
                                onProfitTargetChange={(id, target) => updateAccountProfitTarget(firm.id, id, target)}
                                onDelete={(id) => deleteAccount(firm.id, id)}
                            />
                        );
                    })}
                </div>
            </section>

        </div>
    );
}

function GoalItem({ goal, firms, onToggle, onDelete }) {
    const getIcon = () => {
        switch (goal.actionType) {
            case 'fund_account': return '🎯';
            case 'buy_eval': return '💰';
            default: return '✓';
        }
    };

    const getSubtitle = () => {
        const parts = [];
        if (goal.goalType !== 'daily') parts.push(goal.goalType);
        if (goal.actionType !== 'custom') {
            const actionLabels = {
                'fund_account': 'Auto: when funded',
                'buy_eval': 'Auto: when eval bought'
            };
            parts.push(actionLabels[goal.actionType]);
        }
        if (goal.firmId && firms[goal.firmId]) {
            parts.push(firms[goal.firmId].name);
        }
        if (goal.endDate) {
            parts.push(`until ${goal.endDate}`);
        }
        return parts.length > 0 ? parts.join(' • ') : goal.description || 'Daily goal';
    };

    return (
        <div className={`task-item ${goal.isCompleted ? 'completed' : ''} ${goal.autoCompleted ? 'auto-completed' : ''}`}>
            <span className="task-icon">{getIcon()}</span>
            <div className="task-content">
                <h4>{goal.title}</h4>
                <p>{getSubtitle()}</p>
                {goal.autoCompleted && <span className="auto-badge">Auto-completed</span>}
            </div>
            <div className="goal-actions">
                <input
                    type="checkbox"
                    checked={goal.isCompleted}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                <button className="delete-goal-btn" onClick={onDelete} title="Delete goal">×</button>
            </div>
        </div>
    );
}

function AccountCard({ firm, accounts, passed, limit, defaultEvalCost, defaultActivationCost, onAdd, onStatusChange, onBalanceChange, onProfitTargetChange, onDelete }) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [evalCost, setEvalCost] = useState(defaultEvalCost);
    const [profitTarget, setProfitTarget] = useState(firm.defaultProfitTarget);
    const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusChange, setStatusChange] = useState(null); // { id, newStatus }
    const [passCost, setPassCost] = useState(defaultActivationCost);
    const [editingBalance, setEditingBalance] = useState(null); // account id being edited
    const [balanceInput, setBalanceInput] = useState('');
    const [editingTarget, setEditingTarget] = useState(null);
    const [targetInput, setTargetInput] = useState('');

    const halfway = accounts.filter(a => a.status === 'halfway').length;
    const funded = accounts.filter(a => a.status === 'funded').length;

    const handleAdd = () => {
        onAdd(evalCost || 0, profitTarget || firm.defaultProfitTarget, createdDate);
        setShowAddForm(false);
        setEvalCost(defaultEvalCost);
        setProfitTarget(firm.defaultProfitTarget);
        setCreatedDate(new Date().toISOString().split('T')[0]);
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
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                            <label>Date (backdate if needed)</label>
                            <input
                                type="date"
                                value={createdDate}
                                onChange={(e) => setCreatedDate(e.target.value)}
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

