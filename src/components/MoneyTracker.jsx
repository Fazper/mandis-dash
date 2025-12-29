import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function MoneyTracker() {
    const {
        state,
        firms,
        addFirm,
        updateFirm,
        deleteFirm,
        updateSetting,
        addExpense,
        deleteExpense,
        resetData,
        calculateMoneyStats,
        getTotalPassed
    } = useDashboard();

    const [expenseType, setExpenseType] = useState(Object.keys(firms)[0] || 'other');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNote, setExpenseNote] = useState('');
    const [showAddFirm, setShowAddFirm] = useState(false);
    const [editingFirm, setEditingFirm] = useState(null);

    const stats = calculateMoneyStats();
    const totalPassed = getTotalPassed();
    const potentialPayout = totalPassed * (state.settings?.payoutEstimate || 2000);
    const roi = stats.totalSpent > 0 ? ((potentialPayout / stats.totalSpent) * 100).toFixed(0) : 0;

    const handleAddExpense = () => {
        if (!expenseAmount) return;
        addExpense(expenseType, expenseAmount, expenseNote);
        setExpenseAmount('');
        setExpenseNote('');
    };

    // Build expense type options dynamically
    const expenseOptions = [];
    Object.values(firms).forEach(firm => {
        expenseOptions.push({ value: firm.id, label: `${firm.name} Eval` });
        if (firm.activationCost > 0) {
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
                        <div className="setting-item">
                            <label>Est. Payout per Account ($)</label>
                            <input
                                type="number"
                                value={state.settings?.payoutEstimate || 2000}
                                onChange={(e) => updateSetting('payoutEstimate', parseFloat(e.target.value) || 0)}
                                step="100"
                            />
                        </div>
                        <div className="setting-item">
                            <label>Payout Start Date</label>
                            <input
                                type="month"
                                value={state.payoutStartDate}
                                onChange={(e) => updateSetting('payoutStartDate', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="settings-actions">
                        <button className="reset-btn" onClick={resetData}>Reset All Data</button>
                    </div>
                </div>
            </section>

            <section className="firms-config">
                <h2>Account Types</h2>
                <div className="firms-grid">
                    {Object.values(firms).map(firm => (
                        <FirmCard
                            key={firm.id}
                            firm={firm}
                            onEdit={() => setEditingFirm(firm)}
                            onDelete={() => deleteFirm(firm.id)}
                        />
                    ))}
                    <button className="add-firm-btn" onClick={() => setShowAddFirm(true)}>
                        + Add Account Type
                    </button>
                </div>

                {showAddFirm && (
                    <FirmForm
                        onSave={async (data) => {
                            await addFirm(data);
                            setShowAddFirm(false);
                        }}
                        onCancel={() => setShowAddFirm(false)}
                    />
                )}

                {editingFirm && (
                    <FirmForm
                        firm={editingFirm}
                        onSave={async (data) => {
                            await updateFirm(editingFirm.id, data);
                            setEditingFirm(null);
                        }}
                        onCancel={() => setEditingFirm(null)}
                    />
                )}
            </section>

            <section className="money-tracker">
                <h2>Money Tracker</h2>
                <div className="money-grid">
                    <MoneyCard title="Total Spent" value={`$${stats.totalSpent.toLocaleString()}`} type="spent" />
                    {Object.values(firms).map(firm => (
                        <MoneyCard
                            key={firm.id}
                            title={`${firm.name} Evals`}
                            value={`$${(stats.byFirm[firm.id]?.evalSpent || 0).toLocaleString()}`}
                            subtitle={`${stats.byFirm[firm.id]?.evalCount || 0} evals`}
                            type={firm.color || 'blue'}
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
                            <div key={exp.id} className={`expense-item`}>
                                <div className="expense-info">
                                    <span className="expense-type">{formatExpenseType(exp.type, firms)}</span>
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

function FirmCard({ firm, onEdit, onDelete }) {
    return (
        <div className={`firm-card ${firm.color || 'blue'}`}>
            <div className="firm-header">
                <h4>{firm.name}</h4>
                <div className="firm-actions">
                    <button className="edit-btn" onClick={onEdit}>Edit</button>
                    <button className="delete-btn" onClick={onDelete}>×</button>
                </div>
            </div>
            <div className="firm-details">
                <div className="firm-stat">
                    <span className="label">Eval Cost</span>
                    <span className="value">${firm.evalCost}</span>
                </div>
                <div className="firm-stat">
                    <span className="label">Activation</span>
                    <span className="value">${firm.activationCost}</span>
                </div>
                <div className="firm-stat">
                    <span className="label">Max Funded</span>
                    <span className="value">{firm.maxFunded}</span>
                </div>
                <div className="firm-stat">
                    <span className="label">Profit Target</span>
                    <span className="value">${firm.defaultProfitTarget}</span>
                </div>
                {firm.hasConsistencyRule && (
                    <div className="firm-badge">50% Consistency Rule</div>
                )}
            </div>
        </div>
    );
}

function FirmForm({ firm, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        name: firm?.name || '',
        accountName: firm?.accountName || '',
        maxFunded: firm?.maxFunded || 10,
        evalCost: firm?.evalCost || 0,
        activationCost: firm?.activationCost || 0,
        color: firm?.color || 'blue',
        hasConsistencyRule: firm?.hasConsistencyRule || false,
        defaultProfitTarget: firm?.defaultProfitTarget || 3000
    });

    const colors = ['orange', 'purple', 'blue', 'green', 'red', 'teal'];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) return;
        onSave({
            ...formData,
            accountName: formData.accountName || formData.name,
            maxFunded: parseInt(formData.maxFunded) || 10,
            evalCost: parseFloat(formData.evalCost) || 0,
            activationCost: parseFloat(formData.activationCost) || 0,
            defaultProfitTarget: parseFloat(formData.defaultProfitTarget) || 3000
        });
    };

    return (
        <div className="firm-form-overlay">
            <form className="firm-form" onSubmit={handleSubmit}>
                <h3>{firm ? 'Edit Account Type' : 'Add Account Type'}</h3>

                <div className="form-row">
                    <div className="form-field">
                        <label>Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Lucid 50K"
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label>Account Name Format</label>
                        <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            placeholder="e.g., Lucid Flex 50K"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Eval Cost ($)</label>
                        <input
                            type="number"
                            value={formData.evalCost}
                            onChange={(e) => setFormData({ ...formData, evalCost: e.target.value })}
                            step="0.01"
                        />
                    </div>
                    <div className="form-field">
                        <label>Activation Cost ($)</label>
                        <input
                            type="number"
                            value={formData.activationCost}
                            onChange={(e) => setFormData({ ...formData, activationCost: e.target.value })}
                            step="0.01"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Max Funded Accounts</label>
                        <input
                            type="number"
                            value={formData.maxFunded}
                            onChange={(e) => setFormData({ ...formData, maxFunded: e.target.value })}
                            min="1"
                        />
                    </div>
                    <div className="form-field">
                        <label>Default Profit Target ($)</label>
                        <input
                            type="number"
                            value={formData.defaultProfitTarget}
                            onChange={(e) => setFormData({ ...formData, defaultProfitTarget: e.target.value })}
                            step="100"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Color</label>
                        <div className="color-picker">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`color-option ${c} ${formData.color === c ? 'selected' : ''}`}
                                    onClick={() => setFormData({ ...formData, color: c })}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="form-field checkbox-field">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.hasConsistencyRule}
                                onChange={(e) => setFormData({ ...formData, hasConsistencyRule: e.target.checked })}
                            />
                            Has 50% Consistency Rule
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="save-btn">{firm ? 'Save Changes' : 'Add Account Type'}</button>
                </div>
            </form>
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

function formatExpenseType(type, firms) {
    // Check if it's a firm eval
    if (firms[type]) {
        return `${firms[type].name} Eval`;
    }
    // Check if it's a firm activation
    const activationMatch = type.match(/^(.+)-activation$/);
    if (activationMatch && firms[activationMatch[1]]) {
        return `${firms[activationMatch[1]].name} Activation`;
    }
    return type === 'other' ? 'Other' : type;
}
