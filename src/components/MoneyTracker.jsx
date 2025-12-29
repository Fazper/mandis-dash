import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';

export default function MoneyTracker() {
    const {
        state,
        firms,
        accountTypes,
        addExpense,
        deleteExpense,
        calculateMoneyStats,
        calculatePotentialPayout
    } = useDashboard();

    const [expenseType, setExpenseType] = useState(Object.keys(accountTypes)[0] || 'other');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNote, setExpenseNote] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    const stats = calculateMoneyStats();
    const potentialPayout = calculatePotentialPayout();
    const roi = stats.totalSpent > 0 ? ((potentialPayout / stats.totalSpent) * 100).toFixed(0) : 0;

    const handleAddExpense = () => {
        if (!expenseAmount) return;
        addExpense(expenseType, expenseAmount, expenseNote, expenseDate);
        setExpenseAmount('');
        setExpenseNote('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
    };

    // Build expense type options dynamically from account types
    const expenseOptions = [];
    Object.values(accountTypes).forEach(type => {
        const firm = firms[type.firmId];
        const firmName = firm ? `${firm.name} - ` : '';
        expenseOptions.push({ value: type.id, label: `${firmName}${type.name} Eval` });
        if (type.activationCost > 0) {
            expenseOptions.push({ value: `${type.id}-activation`, label: `${firmName}${type.name} Activation` });
        }
    });
    expenseOptions.push({ value: 'other', label: 'Other' });

    const hasAccountTypes = Object.keys(accountTypes).length > 0;

    if (!hasAccountTypes) {
        return (
            <div className="money-tab">
                <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h2>No Account Types Configured</h2>
                    <p>Set up your prop firms and account types first to start tracking expenses.</p>
                    <NavLink to="/settings" className="setup-btn">
                        Go to Settings
                    </NavLink>
                </div>
            </div>
        );
    }

    return (
        <div className="money-tab">
            <section className="money-tracker">
                <h2>Money Tracker</h2>
                <div className="money-grid">
                    <MoneyCard title="Total Spent" value={`$${stats.totalSpent.toLocaleString()}`} type="spent" />
                    {Object.values(accountTypes).map(type => (
                        <MoneyCard
                            key={type.id}
                            title={`${type.name} Evals`}
                            value={`$${(stats.byAccountType[type.id]?.evalSpent || 0).toLocaleString()}`}
                            subtitle={`${stats.byAccountType[type.id]?.evalCount || 0} evals`}
                            type={type.color || 'blue'}
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
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
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
                        {state.expenses.slice(0, 10).map(exp => (
                            <div key={exp.id} className="expense-item">
                                <div className="expense-info">
                                    <span className="expense-type">{formatExpenseType(exp.type, accountTypes, firms)}</span>
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

function formatExpenseType(type, accountTypes, firms) {
    if (accountTypes[type]) {
        const firm = firms[accountTypes[type].firmId];
        const firmPrefix = firm ? `${firm.name} - ` : '';
        return `${firmPrefix}${accountTypes[type].name} Eval`;
    }
    const activationMatch = type.match(/^(.+)-activation$/);
    if (activationMatch && accountTypes[activationMatch[1]]) {
        const firm = firms[accountTypes[activationMatch[1]].firmId];
        const firmPrefix = firm ? `${firm.name} - ` : '';
        return `${firmPrefix}${accountTypes[activationMatch[1]].name} Activation`;
    }
    return type === 'other' ? 'Other' : type;
}
