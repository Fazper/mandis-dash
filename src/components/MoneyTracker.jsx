import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function MoneyTracker() {
    const {
        state,
        FIRMS,
        updateCost,
        updatePayoutStartDate,
        addExpense,
        deleteExpense,
        resetData,
        calculateMoneyStats,
        getTotalPassed
    } = useDashboard();

    const [expenseType, setExpenseType] = useState('apex');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNote, setExpenseNote] = useState('');

    const stats = calculateMoneyStats();
    const totalPassed = getTotalPassed();
    const potentialPayout = totalPassed * state.costs.payoutEstimate;
    const roi = stats.totalSpent > 0 ? ((potentialPayout / stats.totalSpent) * 100).toFixed(0) : 0;

    const handleAddExpense = () => {
        if (!expenseAmount) return;
        addExpense(expenseType, expenseAmount, expenseNote);
        setExpenseAmount('');
        setExpenseNote('');
    };

    // Build expense type options dynamically
    const expenseOptions = [];
    Object.values(FIRMS).forEach(firm => {
        expenseOptions.push({ value: firm.id, label: `${firm.name} Eval` });
        if (firm.activationCostKey) {
            expenseOptions.push({ value: `${firm.id}-activation`, label: `${firm.name} Activation` });
        }
    });
    expenseOptions.push({ value: 'other', label: 'Other' });

    return (
        <div className="money-tab">
            <section className="settings">
                <h2>Settings</h2>
                <div className="settings-card">
                    <div className="settings-grid">
                        {Object.values(FIRMS).map(firm => (
                            <div key={firm.id} className="setting-item">
                                <label>{firm.name} Eval Cost ($)</label>
                                <input
                                    type="number"
                                    value={state.costs[firm.evalCostKey] || 0}
                                    onChange={(e) => updateCost(firm.evalCostKey, e.target.value)}
                                    step="0.01"
                                />
                            </div>
                        ))}
                        {Object.values(FIRMS).filter(f => f.activationCostKey).map(firm => (
                            <div key={`${firm.id}-activation`} className="setting-item">
                                <label>{firm.name} Activation ($)</label>
                                <input
                                    type="number"
                                    value={state.costs[firm.activationCostKey] || 0}
                                    onChange={(e) => updateCost(firm.activationCostKey, e.target.value)}
                                    step="0.01"
                                />
                            </div>
                        ))}
                        <div className="setting-item">
                            <label>Est. Payout per Account ($)</label>
                            <input
                                type="number"
                                value={state.costs.payoutEstimate}
                                onChange={(e) => updateCost('payoutEstimate', e.target.value)}
                                step="100"
                            />
                        </div>
                        <div className="setting-item">
                            <label>Payout Start Date</label>
                            <input
                                type="month"
                                value={state.payoutStartDate}
                                onChange={(e) => updatePayoutStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="settings-actions">
                        <button className="reset-btn" onClick={resetData}>Reset All Data</button>
                    </div>
                </div>
            </section>

            <section className="money-tracker">
                <h2>Money Tracker</h2>
                <div className="money-grid">
                    <MoneyCard title="Total Spent" value={`$${stats.totalSpent.toLocaleString()}`} type="spent" />
                    {Object.values(FIRMS).map(firm => (
                        <MoneyCard
                            key={firm.id}
                            title={`${firm.name} Evals`}
                            value={`$${(stats.byFirm[firm.id]?.evalSpent || 0).toLocaleString()}`}
                            subtitle={`${stats.byFirm[firm.id]?.evalCount || 0} evals`}
                            type={firm.id}
                        />
                    ))}
                    <MoneyCard title="Potential ROI" value={`${roi}%`} type="roi" />
                </div>

                <div className="add-expense">
                    <h4>Add Expense</h4>
                    <div className="expense-form">
                        <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)}>
                            {expenseOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Amount"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            step="0.01"
                        />
                        <input
                            type="text"
                            placeholder="Note (optional)"
                            value={expenseNote}
                            onChange={(e) => setExpenseNote(e.target.value)}
                        />
                        <button onClick={handleAddExpense}>Add</button>
                    </div>
                </div>

                <div className="expense-history">
                    <h4>Recent Expenses</h4>
                    <div className="expense-list">
                        {state.expenses.slice().reverse().slice(0, 10).map(exp => (
                            <div key={exp.id} className={`expense-item ${exp.type}`}>
                                <div className="expense-info">
                                    <span className="expense-type">{formatExpenseType(exp.type, FIRMS)}</span>
                                    <span className="expense-date">{exp.date}</span>
                                    {exp.note && <span className="expense-note">{exp.note}</span>}
                                </div>
                                <div className="expense-amount">
                                    <span>-${exp.amount.toFixed(2)}</span>
                                    <button className="delete-btn" onClick={() => deleteExpense(exp.id)}>×</button>
                                </div>
                            </div>
                        ))}
                        {state.expenses.length === 0 && (
                            <p className="no-expenses">No expenses recorded yet</p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

function MoneyCard({ title, value, subtitle, type }) {
    return (
        <div className={`money-card ${type}`}>
            <h4>{title}</h4>
            <span className="money-number">{value}</span>
            {subtitle && <small>{subtitle}</small>}
        </div>
    );
}

function formatExpenseType(type, FIRMS) {
    // Check if it's a firm eval
    if (FIRMS[type]) {
        return `${FIRMS[type].name} Eval`;
    }
    // Check if it's a firm activation
    const activationMatch = type.match(/^(.+)-activation$/);
    if (activationMatch && FIRMS[activationMatch[1]]) {
        return `${FIRMS[activationMatch[1]].name} Activation`;
    }
    return type === 'other' ? 'Other' : type;
}
