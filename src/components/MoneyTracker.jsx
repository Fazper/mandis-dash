import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function MoneyTracker() {
    const {
        state,
        firms,
        accountTypes,
        addFirm,
        updateFirm,
        deleteFirm,
        addAccountType,
        updateAccountType,
        deleteAccountType,
        getAccountTypesForFirm,
        updateSetting,
        addExpense,
        deleteExpense,
        resetData,
        calculateMoneyStats,
        getTotalPassed
    } = useDashboard();

    const [expenseType, setExpenseType] = useState(Object.keys(accountTypes)[0] || 'other');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNote, setExpenseNote] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    const [showAddFirm, setShowAddFirm] = useState(false);
    const [editingFirm, setEditingFirm] = useState(null);
    const [deleteFirmConfirm, setDeleteFirmConfirm] = useState(null);

    const [showAddAccountType, setShowAddAccountType] = useState(null); // firmId to add type to
    const [editingAccountType, setEditingAccountType] = useState(null);
    const [deleteTypeConfirm, setDeleteTypeConfirm] = useState(null);

    const stats = calculateMoneyStats();
    const totalPassed = getTotalPassed();
    const potentialPayout = totalPassed * (state.settings?.payoutEstimate || 2000);
    const roi = stats.totalSpent > 0 ? ((potentialPayout / stats.totalSpent) * 100).toFixed(0) : 0;

    const handleAddExpense = () => {
        if (!expenseAmount) return;
        addExpense(expenseType, expenseAmount, expenseNote, expenseDate);
        setExpenseAmount('');
        setExpenseNote('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
    };

    const handleDeleteFirm = async (firmId) => {
        const result = await deleteFirm(firmId);
        if (result?.needsConfirmation) {
            setDeleteFirmConfirm({ firmId, accountTypes: result.accountTypes, accounts: result.accounts });
        }
    };

    const confirmDeleteFirm = async () => {
        if (deleteFirmConfirm) {
            await deleteFirm(deleteFirmConfirm.firmId, true);
            setDeleteFirmConfirm(null);
        }
    };

    const handleDeleteAccountType = async (typeId) => {
        const result = await deleteAccountType(typeId);
        if (result?.needsConfirmation) {
            setDeleteTypeConfirm({ typeId, accounts: result.accounts });
        }
    };

    const confirmDeleteAccountType = async () => {
        if (deleteTypeConfirm) {
            await deleteAccountType(deleteTypeConfirm.typeId, true);
            setDeleteTypeConfirm(null);
        }
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

    const hasFirms = Object.keys(firms).length > 0;

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
                <div className="section-header">
                    <h2>Prop Firms & Account Types</h2>
                    <button className="add-goal-btn" onClick={() => setShowAddFirm(true)}>
                        + Add Firm
                    </button>
                </div>

                {!hasFirms ? (
                    <div className="empty-firms">
                        <p>No prop firms configured. Add a firm like Apex, Topstep, etc. to get started.</p>
                    </div>
                ) : (
                    <div className="firms-hierarchy">
                        {Object.values(firms).map(firm => (
                            <div key={firm.id} className={`firm-section ${firm.color}`}>
                                <div className="firm-header-row">
                                    <div className="firm-info">
                                        <h3>{firm.name}</h3>
                                        {firm.website && <a href={firm.website} target="_blank" rel="noopener noreferrer" className="firm-link">Website</a>}
                                    </div>
                                    <div className="firm-actions">
                                        <button className="add-type-btn" onClick={() => setShowAddAccountType(firm.id)}>
                                            + Add Account Type
                                        </button>
                                        <button className="edit-btn" onClick={() => setEditingFirm(firm)}>Edit</button>
                                        <button className="delete-btn" onClick={() => handleDeleteFirm(firm.id)}>×</button>
                                    </div>
                                </div>

                                <div className="account-types-grid">
                                    {getAccountTypesForFirm(firm.id).map(type => (
                                        <AccountTypeCard
                                            key={type.id}
                                            type={type}
                                            onEdit={() => setEditingAccountType(type)}
                                            onDelete={() => handleDeleteAccountType(type.id)}
                                        />
                                    ))}
                                    {getAccountTypesForFirm(firm.id).length === 0 && (
                                        <p className="no-types">No account types. Click "+ Add Account Type" above.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modals */}
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

                {showAddAccountType && (
                    <AccountTypeForm
                        firmId={showAddAccountType}
                        firmColor={firms[showAddAccountType]?.color}
                        onSave={async (data) => {
                            await addAccountType({ ...data, firmId: showAddAccountType });
                            setShowAddAccountType(null);
                        }}
                        onCancel={() => setShowAddAccountType(null)}
                    />
                )}

                {editingAccountType && (
                    <AccountTypeForm
                        type={editingAccountType}
                        firmId={editingAccountType.firmId}
                        firms={firms}
                        onSave={async (data) => {
                            await updateAccountType(editingAccountType.id, data);
                            setEditingAccountType(null);
                        }}
                        onCancel={() => setEditingAccountType(null)}
                    />
                )}

                {deleteFirmConfirm && (
                    <DeleteFirmModal
                        firmName={firms[deleteFirmConfirm.firmId]?.name}
                        accountTypes={deleteFirmConfirm.accountTypes}
                        accounts={deleteFirmConfirm.accounts}
                        onConfirm={confirmDeleteFirm}
                        onCancel={() => setDeleteFirmConfirm(null)}
                    />
                )}

                {deleteTypeConfirm && (
                    <DeleteTypeModal
                        typeName={accountTypes[deleteTypeConfirm.typeId]?.name}
                        accounts={deleteTypeConfirm.accounts}
                        onConfirm={confirmDeleteAccountType}
                        onCancel={() => setDeleteTypeConfirm(null)}
                    />
                )}
            </section>

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

function AccountTypeCard({ type, onEdit, onDelete }) {
    return (
        <div className={`account-type-card ${type.color || 'blue'}`}>
            <div className="type-header">
                <h4>{type.name}</h4>
                <div className="type-actions">
                    <button className="edit-btn" onClick={onEdit}>Edit</button>
                    <button className="delete-btn" onClick={onDelete}>×</button>
                </div>
            </div>
            <div className="type-details">
                <div className="type-stat">
                    <span className="label">Eval Cost</span>
                    <span className="value">${type.evalCost}</span>
                </div>
                <div className="type-stat">
                    <span className="label">Activation</span>
                    <span className="value">${type.activationCost}</span>
                </div>
                <div className="type-stat">
                    <span className="label">Max Funded</span>
                    <span className="value">{type.maxFunded}</span>
                </div>
                <div className="type-stat">
                    <span className="label">Profit Target</span>
                    <span className="value">${type.defaultProfitTarget}</span>
                </div>
                {type.hasConsistencyRule && (
                    <div className="type-badge">50% Consistency Rule</div>
                )}
            </div>
        </div>
    );
}

function FirmForm({ firm, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        name: firm?.name || '',
        color: firm?.color || 'blue',
        website: firm?.website || '',
        notes: firm?.notes || ''
    });

    const colors = ['orange', 'purple', 'blue', 'green', 'red', 'teal'];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) return;
        onSave(formData);
    };

    return (
        <div className="firm-form-overlay">
            <form className="firm-form" onSubmit={handleSubmit}>
                <h3>{firm ? 'Edit Firm' : 'Add Prop Firm'}</h3>

                <div className="form-row">
                    <div className="form-field">
                        <label>Firm Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Apex, Topstep"
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label>Website (optional)</label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder="https://..."
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
                    <div className="form-field">
                        <label>Notes (optional)</label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any notes..."
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="save-btn">{firm ? 'Save Changes' : 'Add Firm'}</button>
                </div>
            </form>
        </div>
    );
}

function AccountTypeForm({ type, firmId, firmColor, firms, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        name: type?.name || '',
        accountName: type?.accountName || '',
        firmId: type?.firmId || firmId,
        maxFunded: type?.maxFunded || 10,
        evalCost: type?.evalCost || 0,
        activationCost: type?.activationCost || 0,
        color: type?.color || firmColor || 'blue',
        hasConsistencyRule: type?.hasConsistencyRule || false,
        defaultProfitTarget: type?.defaultProfitTarget || 3000
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
                <h3>{type ? 'Edit Account Type' : 'Add Account Type'}</h3>

                {type && firms && (
                    <div className="form-row">
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                            <label>Parent Firm</label>
                            <select
                                value={formData.firmId}
                                onChange={(e) => setFormData({ ...formData, firmId: e.target.value })}
                            >
                                {Object.values(firms).map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="form-row">
                    <div className="form-field">
                        <label>Account Type Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., 50K, 100K Flex"
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label>Account Name Format</label>
                        <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            placeholder="e.g., Apex Flex 50K"
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
                    <button type="submit" className="save-btn">{type ? 'Save Changes' : 'Add Account Type'}</button>
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

function DeleteFirmModal({ firmName, accountTypes, accounts, onConfirm, onCancel }) {
    return (
        <div className="firm-form-overlay">
            <div className="delete-confirm-modal">
                <h3>Delete {firmName}?</h3>
                <p className="warning-text">
                    This will permanently delete:
                </p>
                <ul className="delete-summary">
                    <li>{accountTypes.length} account type{accountTypes.length !== 1 ? 's' : ''}</li>
                    <li>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</li>
                </ul>
                {accounts.length > 0 && (
                    <div className="accounts-to-delete">
                        {accounts.slice(0, 5).map(acc => (
                            <div key={acc.id} className="acc-row">
                                <span className="acc-name">{acc.name}</span>
                                <span className={`acc-status ${acc.status}`}>{acc.status}</span>
                            </div>
                        ))}
                        {accounts.length > 5 && <p className="more-accounts">...and {accounts.length - 5} more</p>}
                    </div>
                )}
                <p className="warning-note">This action cannot be undone.</p>
                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="delete-confirm-btn" onClick={onConfirm}>
                        Delete Everything
                    </button>
                </div>
            </div>
        </div>
    );
}

function DeleteTypeModal({ typeName, accounts, onConfirm, onCancel }) {
    return (
        <div className="firm-form-overlay">
            <div className="delete-confirm-modal">
                <h3>Delete {typeName}?</h3>
                <p className="warning-text">
                    This will permanently delete {accounts.length} account{accounts.length !== 1 ? 's' : ''}:
                </p>
                <ul className="accounts-to-delete">
                    {accounts.map(acc => (
                        <li key={acc.id}>
                            <span className="acc-name">{acc.name}</span>
                            <span className={`acc-status ${acc.status}`}>{acc.status}</span>
                            {acc.evalCost > 0 && <span className="acc-cost">${acc.evalCost}</span>}
                        </li>
                    ))}
                </ul>
                <p className="warning-note">This action cannot be undone.</p>
                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="delete-confirm-btn" onClick={onConfirm}>
                        Delete {typeName} & {accounts.length} Account{accounts.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatExpenseType(type, accountTypes, firms) {
    // Check if it's an account type eval
    if (accountTypes[type]) {
        const firm = firms[accountTypes[type].firmId];
        const firmPrefix = firm ? `${firm.name} - ` : '';
        return `${firmPrefix}${accountTypes[type].name} Eval`;
    }
    // Check if it's an account type activation
    const activationMatch = type.match(/^(.+)-activation$/);
    if (activationMatch && accountTypes[activationMatch[1]]) {
        const firm = firms[accountTypes[activationMatch[1]].firmId];
        const firmPrefix = firm ? `${firm.name} - ` : '';
        return `${firmPrefix}${accountTypes[activationMatch[1]].name} Activation`;
    }
    return type === 'other' ? 'Other' : type;
}
