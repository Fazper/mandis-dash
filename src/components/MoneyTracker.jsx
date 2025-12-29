import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { FinancialTracker, formatExpenseType, formatPayoutSource } from '../utils/financials';

export default function MoneyTracker() {
    const {
        state,
        firms,
        accountTypes,
        addExpense,
        deleteExpense,
        addPayout,
        deletePayout,
        calculateMoneyStats
    } = useDashboard();

    // Expense form state
    const [expenseType, setExpenseType] = useState(Object.keys(accountTypes)[0] || 'other');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNote, setExpenseNote] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    // Payout form state
    const [payoutAccountType, setPayoutAccountType] = useState(Object.keys(accountTypes)[0] || '');
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutNote, setPayoutNote] = useState('');
    const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);

    // Tab state
    const [activeTab, setActiveTab] = useState('expenses');

    const stats = calculateMoneyStats();

    // Use FinancialTracker for calculations
    const tracker = new FinancialTracker({
        expenses: state.expenses || [],
        payouts: state.payouts || [],
        accountTypes,
        firms
    });

    const totalPayouts = tracker.getTotalPayouts();
    const netProfit = tracker.getNetProfit();
    const roi = tracker.getROI();

    const handleAddExpense = () => {
        if (!expenseAmount) return;
        addExpense(expenseType, expenseAmount, expenseNote, expenseDate);
        setExpenseAmount('');
        setExpenseNote('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
    };

    const handleAddPayout = () => {
        if (!payoutAmount) return;
        addPayout(payoutAccountType, payoutAmount, payoutNote, payoutDate);
        setPayoutAmount('');
        setPayoutNote('');
        setPayoutDate(new Date().toISOString().split('T')[0]);
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

    // Build payout source options
    const payoutOptions = [];
    Object.values(accountTypes).forEach(type => {
        const firm = firms[type.firmId];
        const firmName = firm ? `${firm.name} - ` : '';
        payoutOptions.push({ value: type.id, label: `${firmName}${type.name}` });
    });

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
                    <MoneyCard title="Total Payouts" value={`$${totalPayouts.toLocaleString()}`} type="green" />
                    <MoneyCard
                        title="Net Profit"
                        value={`${netProfit >= 0 ? '+' : ''}$${netProfit.toLocaleString()}`}
                        type={netProfit >= 0 ? 'green' : 'red'}
                    />
                    <MoneyCard title="ROI" value={`${roi}%`} type="roi" />
                </div>

                {/* Tabs */}
                <div className="money-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('expenses')}
                    >
                        Expenses
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payouts')}
                    >
                        Payouts
                    </button>
                </div>

                {activeTab === 'expenses' ? (
                    <>
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
                                {state.expenses.slice(0, 15).map(exp => (
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
                    </>
                ) : (
                    <>
                        <div className="add-expense add-payout">
                            <h4>Add Payout</h4>
                            <div className="expense-form payout-form">
                                <select value={payoutAccountType} onChange={(e) => setPayoutAccountType(e.target.value)}>
                                    {payoutOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    step="0.01"
                                />
                                <input
                                    type="date"
                                    value={payoutDate}
                                    onChange={(e) => setPayoutDate(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Note (optional)"
                                    value={payoutNote}
                                    onChange={(e) => setPayoutNote(e.target.value)}
                                />
                                <button onClick={handleAddPayout}>Add</button>
                            </div>
                        </div>

                        <div className="expense-history payout-history">
                            <h4>Recent Payouts</h4>
                            <div className="expense-list payout-list">
                                {(state.payouts || []).slice(0, 15).map(p => (
                                    <div key={p.id} className="expense-item payout-item">
                                        <div className="expense-info">
                                            <span className="expense-type">{formatPayoutSource(p, accountTypes, firms)}</span>
                                            <span className="expense-date">{p.date}</span>
                                            {p.note && <span className="expense-note">{p.note}</span>}
                                        </div>
                                        <div className="expense-amount payout-amount">
                                            <span>+${p.amount.toLocaleString()}</span>
                                            <button className="delete-btn" onClick={() => deletePayout(p.id)}>×</button>
                                        </div>
                                    </div>
                                ))}
                                {(!state.payouts || state.payouts.length === 0) && (
                                    <p className="no-expenses">No payouts recorded yet</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
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
