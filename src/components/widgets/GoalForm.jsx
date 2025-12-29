import { useState } from 'react';

export default function GoalForm({ accountTypes, firms, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        goalType: 'daily',
        targetCount: 1,
        actionType: 'custom',
        accountTypeId: '',
        endDate: ''
    });

    const handleSubmit = async () => {
        if (!form.title.trim()) return;
        await onSubmit({
            ...form,
            accountTypeId: form.accountTypeId || null,
            endDate: form.endDate || null
        });
    };

    return (
        <div className="goal-form">
            <div className="goal-form-row">
                <div className="form-field">
                    <label>Goal Title</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Pass 1 account"
                    />
                </div>
                <div className="form-field">
                    <label>Type</label>
                    <select
                        value={form.goalType}
                        onChange={(e) => setForm(prev => ({ ...prev, goalType: e.target.value }))}
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
                        value={form.actionType}
                        onChange={(e) => setForm(prev => ({ ...prev, actionType: e.target.value }))}
                    >
                        <option value="custom">Manual completion only</option>
                        <option value="fund_account">Account gets funded</option>
                        <option value="buy_eval">Buy an eval</option>
                    </select>
                </div>
                <div className="form-field">
                    <label>Specific Account Type (optional)</label>
                    <select
                        value={form.accountTypeId}
                        onChange={(e) => setForm(prev => ({ ...prev, accountTypeId: e.target.value }))}
                    >
                        <option value="">Any account type</option>
                        {Object.values(accountTypes).map(type => {
                            const firm = firms[type.firmId];
                            const firmPrefix = firm ? `${firm.name} - ` : '';
                            return (
                                <option key={type.id} value={type.id}>{firmPrefix}{type.name}</option>
                            );
                        })}
                    </select>
                </div>
            </div>
            <div className="goal-form-row">
                <div className="form-field">
                    <label>End Date (optional)</label>
                    <input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                </div>
                <div className="form-field">
                    <label>Description (optional)</label>
                    <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Additional details..."
                    />
                </div>
            </div>
            <div className="goal-form-actions">
                <button className="cancel-btn" onClick={onCancel}>Cancel</button>
                <button className="save-goal-btn" onClick={handleSubmit}>Create Goal</button>
            </div>
        </div>
    );
}
