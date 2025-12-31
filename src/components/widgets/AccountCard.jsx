import { useState } from 'react';
import Modal from '../Modal';

export default function AccountCard({
    accountType,
    firm,
    accounts,
    firmFunded,
    firmLimit,
    defaultEvalCost,
    defaultActivationCost,
    onAdd,
    onStatusChange,
    onBalanceChange,
    onProfitTargetChange,
    onDelete
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [evalCost, setEvalCost] = useState(defaultEvalCost);
    const [profitTarget, setProfitTarget] = useState(accountType.defaultProfitTarget);
    const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusChange, setStatusChange] = useState(null);
    const [activationCost, setActivationCost] = useState(defaultActivationCost);
    const [editingBalance, setEditingBalance] = useState(null);
    const [balanceInput, setBalanceInput] = useState('');
    const [editingTarget, setEditingTarget] = useState(null);
    const [targetInput, setTargetInput] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const halfway = accounts.filter(a => a.status === 'halfway').length;
    const passed = accounts.filter(a => a.status === 'passed').length;
    const funded = accounts.filter(a => a.status === 'funded').length;

    const handleAdd = () => {
        onAdd(evalCost || 0, profitTarget || accountType.defaultProfitTarget, createdDate);
        setShowAddForm(false);
        setEvalCost(defaultEvalCost);
        setProfitTarget(accountType.defaultProfitTarget);
        setCreatedDate(new Date().toISOString().split('T')[0]);
    };

    const startEditTarget = (acc) => {
        setEditingTarget(acc.id);
        setTargetInput(acc.profitTarget || accountType.defaultProfitTarget);
    };

    const saveTarget = (id) => {
        onProfitTargetChange(id, targetInput);
        setEditingTarget(null);
        setTargetInput('');
    };

    const handleStatusChange = (id, newStatus) => {
        if (newStatus === 'funded') {
            // Only funded accounts have an activation cost
            setStatusChange({ id, newStatus });
            setActivationCost(defaultActivationCost);
        } else {
            onStatusChange(id, newStatus, 0);
        }
    };

    const confirmStatusChange = () => {
        if (statusChange) {
            onStatusChange(statusChange.id, statusChange.newStatus, activationCost || 0);
            setStatusChange(null);
            setActivationCost(defaultActivationCost);
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

    const cardTitle = firm ? `${firm.name} ${accountType.name}` : accountType.name;
    const atFirmLimit = firmFunded >= firmLimit;

    return (
        <div className={`account-card ${accountType.color || 'blue'}`}>
            <h3>{cardTitle}</h3>
            <div className="account-count">
                <span className="passed">{passed + funded}</span>
                <span className="limit">/{firmLimit}</span>
                <span className="count-label"> Funded ({firm?.name})</span>
            </div>
            <div className="account-stats">
                {funded > 0 && <span className="funded-count">{funded} funded</span>}
                {passed > 0 && <span className="passed-count">{passed} passed</span>}
                {accountType.hasConsistencyRule && halfway > 0 && (
                    <span className="halfway-count">{halfway} at 50%</span>
                )}
            </div>
            <div className="account-details">
                {accounts.length === 0 ? (
                    <p className="no-accounts">No accounts yet. Click below to add one.</p>
                ) : (
                    accounts.map(acc => {
                        const balance = acc.balance || 0;
                        const isNegative = balance < 0;
                        const progress = acc.profitTarget > 0
                            ? Math.min(Math.max((balance / acc.profitTarget) * 100, 0), 100)
                            : 0;
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
                                                    <div className={`progress-bar ${isNegative ? 'negative' : ''}`} onClick={() => startEditBalance(acc)}>
                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width: isNegative
                                                                    ? `${Math.min(Math.abs(balance / acc.profitTarget) * 100, 100)}%`
                                                                    : `${progress}%`
                                                            }}
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
                                        {accountType.hasConsistencyRule && (
                                            <option value="halfway">50% Done</option>
                                        )}
                                        <option value="passed">Passed</option>
                                        <option value="funded">Funded</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                    <button
                                        className="delete-account-btn"
                                        onClick={() => setDeleteConfirm(acc)}
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

            {statusChange && (
                <div className="cost-input-form">
                    <label>Activation Cost ($)</label>
                    <div className="cost-input-row">
                        <input
                            type="number"
                            value={activationCost}
                            onChange={(e) => setActivationCost(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                        />
                        <button onClick={confirmStatusChange}>Confirm</button>
                        <button className="cancel-btn" onClick={() => setStatusChange(null)}>Cancel</button>
                    </div>
                </div>
            )}

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
                                placeholder={accountType.defaultProfitTarget.toString()}
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
                <button onClick={() => setShowAddForm(true)} disabled={atFirmLimit}>+ Add Account</button>
            )}

            {deleteConfirm && (
                <Modal onClose={() => setDeleteConfirm(null)}>
                    <div className="delete-confirm-modal">
                        <h3>Delete Account?</h3>
                        <p className="warning-text">
                            Are you sure you want to delete this account?
                        </p>
                        <div className="accounts-to-delete">
                            <div className="acc-row">
                                <span className="acc-name">{deleteConfirm.name}</span>
                                <span className={`acc-status ${deleteConfirm.status}`}>{deleteConfirm.status}</span>
                                {deleteConfirm.evalCost > 0 && <span className="acc-cost">${deleteConfirm.evalCost}</span>}
                            </div>
                        </div>
                        <p className="warning-note">This action cannot be undone.</p>
                        <div className="form-actions">
                            <button type="button" className="cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={() => {
                                    onDelete(deleteConfirm.id);
                                    setDeleteConfirm(null);
                                }}
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
