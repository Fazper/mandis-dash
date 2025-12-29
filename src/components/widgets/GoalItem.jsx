export default function GoalItem({ goal, accountTypes, firms, onToggle, onDelete }) {
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
        if (goal.accountTypeId && accountTypes[goal.accountTypeId]) {
            const type = accountTypes[goal.accountTypeId];
            const firm = firms[type.firmId];
            const firmPrefix = firm ? `${firm.name} - ` : '';
            parts.push(`${firmPrefix}${type.name}`);
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
